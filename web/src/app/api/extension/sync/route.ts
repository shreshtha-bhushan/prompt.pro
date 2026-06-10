 import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { clerkToUuid } from '@/lib/utils'; // Keeping import just in case, but unused here

function createSupabaseClient(clerkToken: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabaseToken = await getToken({ template: 'supabase' });
    const supabase = createSupabaseClient(supabaseToken);
    
    const uuid = userId; // Database now natively accepts the string userId

    // Fetch data from 'optimization_logs' for history
    const { data: logs, error: logsError } = await supabase
      .from('optimization_logs')
      .select('*')
      .eq('user_id', uuid)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch data from 'snippets' for library and context
    const { data: snippets, error: snippetsError } = await supabase
      .from('snippets')
      .select('*')
      .eq('user_id', uuid)
      .order('created_at', { ascending: false });

    if (logsError || snippetsError) {
      console.error('[Sync GET DB Error]', logsError || snippetsError);
    }

    const history = (logs || []).map(log => ({
      id: log.id,
      text: log.upgraded_prompt,
      score: log.score_after,
      originalText: log.original_prompt,
      scoreBefore: log.score_before,
      site: log.site,
      strategy: log.strategy,
      createdAt: log.created_at
    }));

    const library = (snippets || []).filter(s => s.type === 'snippet').map(s => ({
      id: s.id,
      title: s.title,
      text: s.content,
      createdAt: s.created_at
    }));

    const contextBlocks = (snippets || []).filter(s => s.type === 'context').map(s => ({
      id: s.id,
      title: s.title,
      content: s.content,
      active: false,
      createdAt: s.created_at
    }));

    return NextResponse.json({
      success: true,
      history,
      library,
      contextBlocks
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[Sync GET Error]', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabaseToken = await getToken({ template: 'supabase' });
    const supabase = createSupabaseClient(supabaseToken);
    
    const uuid = userId; // Database now natively accepts the string userId

    const data = await request.json();
    const action = data.action;

    if (action === 'bulkMerge') {
      const { history = [], library = [], contextBlocks = [] } = data;

      // 1. Merge History
      if (history.length > 0) {
        // Fetch existing records to prevent duplicates AND to update stale ones
        const { data: existingLogs } = await supabase
          .from('optimization_logs')
          .select('id, upgraded_prompt, site, original_prompt')
          .eq('user_id', uuid);
        
        const existingMap = new Map((existingLogs || []).map(l => [l.upgraded_prompt, l]));
        
        const newLogs: any[] = [];
        const updatePromises: any[] = [];

        for (const h of history) {
          const existing = existingMap.get(h.text);
          if (!existing) {
            // New item — insert it
            newLogs.push({
              user_id: uuid,
              original_prompt: h.originalText || h.text,
              upgraded_prompt: h.text,
              score_before: h.scoreBefore || 0,
              score_after: h.score || 0,
              site: h.site || "unknown",
              strategy: h.strategy || "enhance"
            });
          } else {
            // Existing item — update if it has stale/generic values
            const updates: Record<string, any> = {};
            
            if (h.site && h.site !== 'extension' && (existing.site === 'extension' || !existing.site)) {
              updates.site = h.site;
            }
            if (h.originalText && h.originalText !== 'Synced from Extension' && 
                (existing.original_prompt === 'Synced from Extension' || !existing.original_prompt)) {
              updates.original_prompt = h.originalText;
            }
            
            if (Object.keys(updates).length > 0) {
              updatePromises.push(
                supabase.from('optimization_logs')
                  .update(updates)
                  .eq('id', existing.id)
              );
            }
          }
        }

        if (newLogs.length > 0) {
          await supabase.from('optimization_logs').insert(newLogs);
        }
        
        // Run updates for stale records in parallel
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }

      // 2. Merge Library & Context Blocks
      const newSnippets = [];
      
      const { data: existingSnippets } = await supabase
        .from('snippets')
        .select('title, content, type')
        .eq('user_id', uuid);
        
      const snippetSet = new Set((existingSnippets || []).map(s => `${s.type}:${s.title}:${s.content}`));

      for (const l of library) {
        if (!snippetSet.has(`snippet:${l.title}:${l.text}`)) {
          newSnippets.push({ user_id: uuid, title: l.title, content: l.text, type: 'snippet' });
        }
      }

      for (const c of contextBlocks) {
        if (!snippetSet.has(`context:${c.title}:${c.content}`)) {
          newSnippets.push({ user_id: uuid, title: c.title, content: c.content, type: 'context' });
        }
      }

      if (newSnippets.length > 0) {
        await supabase.from('snippets').insert(newSnippets);
      }

      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (action === 'clearHistory') {
      await supabase.from('optimization_logs').delete().eq('user_id', uuid);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    // ── Individual item actions ───────────────────────────────────

    if (action === 'saveLibrary') {
      const { title, text } = data;
      const { error } = await supabase.from('snippets').insert({
        user_id: uuid,
        title: title || 'Untitled',
        content: text || '',
        type: 'snippet'
      });
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (action === 'deleteLibrary') {
      const { id } = data;
      if (id) {
        await supabase.from('snippets').delete().eq('id', id).eq('user_id', uuid);
      }
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (action === 'addContext') {
      const { title, content } = data;
      const { error } = await supabase.from('snippets').insert({
        user_id: uuid,
        title: title || 'Context',
        content: content || '',
        type: 'context'
      });
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (action === 'deleteContext') {
      const { id } = data;
      if (id) {
        await supabase.from('snippets').delete().eq('id', id).eq('user_id', uuid);
      }
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (action === 'toggleContext') {
      // Context active state is local-only (not persisted in DB), so just acknowledge
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error('[Sync POST Error]', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500, headers: corsHeaders });
  }
}
