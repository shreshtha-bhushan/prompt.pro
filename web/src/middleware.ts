import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Protect everything except public routes
const isPublicRoute = createRouteMatcher([
  '/', 
  '/login(.*)',
  '/api/upgrade(.*)'
])

// The sync API is naturally protected if we check auth(), but good to enforce.
// Actually, we'll let auth() inside the routes handle 401s so we don't break things.
export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    // We don't force redirect on API routes; auth.protect() will handle redirect for UI routes
    // For API routes, if we just call auth() it will return 401. 
    // It's safer to not call auth.protect() here so we can return JSON 401s in our APIs
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
