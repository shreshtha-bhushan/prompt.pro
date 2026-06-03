import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import prisma from '@/lib/prisma';
import { signExtensionToken } from '@/lib/jwt';

/**
 * Extension Auth Bridge (API Route — more reliable than a page for redirect chains)
 *
 * GET /api/extension/auth
 *
 * 1. If the user has no Auth0 session → redirect to `/auth/login?returnTo=/api/extension/auth`
 * 2. If the user IS logged in → generate a signed JWT → redirect to `/?extensionToken=<jwt>`
 *    so the user lands on the PromptPro dashboard AND the service worker picks up the token.
 */
export async function GET(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      // Not authenticated — send through Auth0 login, then come back here
      const url = new URL(request.url);
      const loginUrl = new URL('/auth/login', url.origin);
      loginUrl.searchParams.set('returnTo', '/api/extension/auth');
      return NextResponse.redirect(loginUrl.toString());
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

    // Redirect to the main dashboard with the token in the URL.
    // The service worker detects `extensionToken=` and stores the auth session.
    // The user sees the dashboard — NOT a dead-end page.
    const url = new URL(request.url);
    const dashboardUrl = new URL('/', url.origin);
    dashboardUrl.searchParams.set('extensionToken', token);
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error: unknown) {
    console.error('[Extension Auth Error]:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Fallback: redirect to homepage with error
    const url = new URL(request.url);
    return NextResponse.redirect(
      new URL(`/?extensionError=${encodeURIComponent(message)}`, url.origin).toString()
    );
  }
}
