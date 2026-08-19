import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/sign-up(.*)',
  '/about(.*)',
  '/demo(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/api/webhooks(.*)',
  '/icon.svg',
  '/icon',
  '/apple-icon',
  '/opengraph-image',
  '/twitter-image',
  '/sitemap.xml',
  '/robots.txt',
])

// API routes get 401 JSON instead of a redirect
const isApiRoute = createRouteMatcher(['/api/(.*)'])

// In Next.js 16, proxy.ts replaces middleware.ts
export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    if (isApiRoute(req)) {
      // For API routes, individual handlers check auth and return JSON 401s
      return
    }
    // For UI routes, protect() triggers a server-side redirect to /login — no flicker
    await auth.protect()
  }
})

export default proxy

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
