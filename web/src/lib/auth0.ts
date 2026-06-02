import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Map v3 environment variables to v4 constructor options to keep it backward-compatible
const rawIssuer = process.env.AUTH0_ISSUER_BASE_URL || 'https://dummy-auth0-tenant.auth0.com';
const domain = rawIssuer.replace('https://', '').replace('/', '');

const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL;
const appBaseUrl = isVercel
  ? 'https://prompt-pro-liart.vercel.app'
  : (process.env.AUTH0_BASE_URL || 'http://localhost:3000');

export const auth0 = new Auth0Client({
  domain: domain || 'dummy-auth0-tenant.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || 'dummy-auth0-client-id',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'dummy-auth0-client-secret',
  secret: process.env.AUTH0_SECRET || 'dummy-auth0-session-encryption-secret-32-chars',
  appBaseUrl: appBaseUrl,
  
  async beforeSessionSaved(session) {
    if (session && session.user) {
      const { email, name } = session.user;
      if (email) {
        // Dynamically import prisma to prevent loading pg driver in Edge Middleware runtime
        const { default: prisma } = await import('./prisma');
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: { 
            name: name || null,
          },
          create: { 
            email, 
            name: name || null,
          },
        });
        // Save the user database id on the session user object
        session.user.dbId = dbUser.id;
      }
    }
    return session;
  }
});
