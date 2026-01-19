import { type NextRequest, NextResponse } from 'next/server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  
  // Use a very aggressive timeout for the auth check. 
  // If it takes longer than 3 seconds, we skip the server-side auth check 
  // and let the client-side handle it. This prevents Cloudflare 524 timeouts.
  const authTimeout = 3000; 
  
  let user = null;
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), authTimeout)
      )
    ]);
    if (!error) user = data?.user;
  } catch (error) {
    // If auth times out or fails, we log it but don't block the request.
    // This is the key to preventing 524 errors.
    console.warn('Middleware auth bypassed due to timeout or error');
  }

  // Optimization: Only redirect if we are on a protected route
  // and we are CERTAIN the user is not logged in.
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');
  
  // If you want to protect all routes except login:
  /*
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  */

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

// Add this to your root middleware.ts (usually at /middleware.ts)
// If you don't have one, create it and import updateSession
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
