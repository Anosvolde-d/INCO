import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export default async function proxy(request: NextRequest) {
  // Simple check for admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('inco_admin_jwt');
    
    if (!authCookie || !authCookie.value) {
      // Redirect to home if no token
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // Verify JWT token with edge compatible jose library
      const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || "fallback_secret");
      await jwtVerify(authCookie.value, secret);
      // Valid token, allow request
    } catch (err) {
      // Invalid token
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
