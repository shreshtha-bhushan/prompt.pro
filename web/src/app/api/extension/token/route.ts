import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import prisma from '@/lib/prisma';
import { signExtensionToken } from '@/lib/jwt';

/**
 * GET /api/extension/token
 *
 * Returns a signed JWT for the Chrome extension.
 * Requires a valid Auth0 session (cookie-based).
 * Returns 401 if not authenticated.
 */
export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { email, name, picture } = session.user;

    // Upsert user in Supabase
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: (name as string) || null },
      });
    }

    // Generate a signed token for the extension
    const token = signExtensionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: (picture as string) || null,
    });

    return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, picture } });
  } catch (error: unknown) {
    console.error('[Extension Token Error]:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
