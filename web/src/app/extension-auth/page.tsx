import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import prisma from '@/lib/prisma';
import { signExtensionToken } from '@/lib/jwt';

/**
 * Extension Auth Bridge
 *
 * The Chrome extension opens this page.
 * - If the user has no Auth0 session → redirect to `/auth/login` (which comes back here via returnTo).
 * - If the user IS logged in → generate a signed JWT, redirect to `/extension-linked?token=<jwt>`.
 *
 * The extension's service worker watches for the `/extension-linked` URL,
 * extracts the token, and stores it in chrome.storage.local.
 */
export default async function ExtensionAuthPage() {
  const session = await auth0.getSession();

  if (!session?.user?.email) {
    // Not authenticated — send through Auth0 login, then come back here
    redirect('/auth/login?returnTo=/extension-auth');
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

  // Redirect to the success page — the extension service worker detects this URL
  redirect(`/extension-linked?token=${token}`);
}
