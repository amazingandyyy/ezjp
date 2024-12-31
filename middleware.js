import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  
  // Skip if no session token exists
  if (!req.cookies.get('sb-access-token')?.value) {
    // Redirect to login for premium features
    if (req.nextUrl.pathname.startsWith('/api/premium/')) {
      return NextResponse.redirect(new URL('/join', req.url));
    }
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options }),
      },
    }
  )

  // Check premium status for premium API routes
  if (req.nextUrl.pathname.startsWith('/api/premium/')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL('/join', req.url));
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('premium_until')
        .eq('id', session.user.id)
        .single();

      const now = new Date();
      const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;
      
      if (!premiumUntil || premiumUntil <= now) {
        return NextResponse.redirect(new URL('/settings', req.url));
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      return NextResponse.redirect(new URL('/join', req.url));
    }
  }

  await supabase.auth.getSession();
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes for article operations
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/fetch-news|api/fetch-news-list).*)',
  ],
}; 