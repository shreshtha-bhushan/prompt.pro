import { Auth0Client } from '@auth0/nextjs-auth0/server';
import prisma from './prisma';

// Map v3 environment variables to v4 constructor options to keep it backward-compatible
const rawIssuer = process.env.AUTH0_ISSUER_BASE_URL || '';
const domain = rawIssuer.replace('https://', '').replace('/', '');

export const auth0 = new Auth0Client({
  domain: domain || undefined,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  appBaseUrl: process.env.AUTH0_BASE_URL || process.env.APP_BASE_URL,
  
  async beforeSessionSaved(session) {
    if (session && session.user) {
      const { email, name } = session.user;
      if (email) {
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
