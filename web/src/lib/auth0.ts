import { Auth0Client } from '@auth0/nextjs-auth0/server';

const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL;

// Map environment variables robustly to support both v3 and v4 configurations
const rawIssuer = process.env.AUTH0_ISSUER_BASE_URL || '';
let domain = process.env.AUTH0_DOMAIN || '';

if (rawIssuer && !domain) {
  domain = rawIssuer.replace('https://', '').replace('/', '');
}

const finalDomain = domain || 'dummy-auth0-tenant.auth0.com';
const finalClientId = process.env.AUTH0_CLIENT_ID || 'dummy-auth0-client-id';
const finalClientSecret = process.env.AUTH0_CLIENT_SECRET || 'dummy-auth0-client-secret';
const finalSecret = process.env.AUTH0_SECRET || 'dummy-auth0-session-encryption-secret-32-chars';

const appBaseUrl = isVercel
  ? 'https://prompt-pro-liart.vercel.app'
  : (process.env.AUTH0_BASE_URL || 'http://localhost:3000');

// Server-side diagnostic logs to help locate missing keys
if (isVercel) {
  if (finalDomain.startsWith('dummy') || finalClientId.startsWith('dummy') || finalSecret.startsWith('dummy')) {
    console.error('⚠️ [PromptPro Auth0 Warning]: Running with fallback DUMMY credentials! Please configure Vercel Settings > Environment Variables.');
  } else {
    console.log('✅ [PromptPro Auth0]: Live credentials loaded successfully.');
  }
}

export const auth0 = new Auth0Client({
  domain: finalDomain,
  clientId: finalClientId,
  clientSecret: finalClientSecret,
  secret: finalSecret,
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
