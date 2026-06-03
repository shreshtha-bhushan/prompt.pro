import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyExtensionToken } from '@/lib/jwt';

/* ─── CORS Headers ────────────────────────────────────────── */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/* ─── Auth Helper ─────────────────────────────────────────── */
function getAuthUser(request: Request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed auth token');
  }
  const payload = verifyExtensionToken(auth.slice(7));
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return payload as {
    sub: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
}

/* ─── OPTIONS (CORS preflight) ────────────────────────────── */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/* ─── GET — Fetch all user data for the extension ─────────── */
export async function GET(request: Request) {
  try {
    const user = getAuthUser(request);

    const [history, library, contextBlocks] = await Promise.all([
      prisma.historyItem.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.libraryItem.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contextBlock.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        user: { id: user.sub, email: user.email, name: user.name, picture: user.picture },
        history,
        library,
        contextBlocks,
      },
      { headers: CORS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('token') || message.includes('auth') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: CORS });
  }
}

/* ─── POST — Write operations from the extension ──────────── */
export async function POST(request: Request) {
  try {
    const user = getAuthUser(request);
    const body = await request.json();
    const { action, ...data } = body;

    let result: unknown;

    switch (action) {
      /* ── History ────────────────────────── */
      case 'addHistory':
        if (!data.text?.trim()) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400, headers: CORS });
        }
        result = await prisma.historyItem.create({
          data: {
            userId: user.sub,
            text: data.text.trim(),
            score: data.score ?? null,
          },
        });
        break;

      case 'clearHistory':
        await prisma.historyItem.deleteMany({ where: { userId: user.sub } });
        result = { cleared: true };
        break;

      /* ── Library ────────────────────────── */
      case 'saveLibrary':
        if (!data.title?.trim() || !data.text?.trim()) {
          return NextResponse.json(
            { error: 'Title and text are required' },
            { status: 400, headers: CORS }
          );
        }
        result = await prisma.libraryItem.create({
          data: {
            userId: user.sub,
            title: data.title.trim(),
            text: data.text.trim(),
          },
        });
        break;

      case 'deleteLibrary':
        if (!data.id) {
          return NextResponse.json({ error: 'ID is required' }, { status: 400, headers: CORS });
        }
        await prisma.libraryItem.deleteMany({
          where: { id: data.id, userId: user.sub },
        });
        result = { deleted: true };
        break;

      /* ── Context Blocks ─────────────────── */
      case 'addContext':
        if (!data.title?.trim() || !data.content?.trim()) {
          return NextResponse.json(
            { error: 'Title and content are required' },
            { status: 400, headers: CORS }
          );
        }
        result = await prisma.contextBlock.create({
          data: {
            userId: user.sub,
            title: data.title.trim(),
            content: data.content.trim(),
            active: false,
          },
        });
        break;

      case 'deleteContext':
        if (!data.id) {
          return NextResponse.json({ error: 'ID is required' }, { status: 400, headers: CORS });
        }
        await prisma.contextBlock.deleteMany({
          where: { id: data.id, userId: user.sub },
        });
        result = { deleted: true };
        break;

      case 'toggleContext':
        if (!data.id) {
          return NextResponse.json({ error: 'ID is required' }, { status: 400, headers: CORS });
        }
        await prisma.contextBlock.updateMany({
          where: { id: data.id, userId: user.sub },
          data: { active: !!data.active },
        });
        result = { toggled: true };
        break;

      /* ── Bulk Merge (push local → cloud) ── */
      case 'bulkMerge': {
        const created: { history: number; library: number; context: number } = {
          history: 0,
          library: 0,
          context: 0,
        };

        // Merge history items
        if (Array.isArray(data.history)) {
          for (const item of data.history) {
            if (item.text?.trim()) {
              await prisma.historyItem.create({
                data: {
                  userId: user.sub,
                  text: item.text.trim(),
                  score: item.score ?? null,
                },
              });
              created.history++;
            }
          }
        }

        // Merge library items
        if (Array.isArray(data.library)) {
          for (const item of data.library) {
            if (item.title?.trim() && item.text?.trim()) {
              await prisma.libraryItem.create({
                data: {
                  userId: user.sub,
                  title: item.title.trim(),
                  text: item.text.trim(),
                },
              });
              created.library++;
            }
          }
        }

        // Merge context blocks
        if (Array.isArray(data.contextBlocks)) {
          for (const block of data.contextBlocks) {
            if (block.title?.trim() && block.content?.trim()) {
              await prisma.contextBlock.create({
                data: {
                  userId: user.sub,
                  title: block.title.trim(),
                  content: block.content.trim(),
                  active: !!block.active,
                },
              });
              created.context++;
            }
          }
        }

        result = { merged: true, created };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400, headers: CORS }
        );
    }

    return NextResponse.json({ success: true, result }, { headers: CORS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('token') || message.includes('auth') ? 401 : 500;
    return NextResponse.json({ error: message }, { status, headers: CORS });
  }
}
