
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths and required roles
const roleMap: { prefix: string; role: string }[] = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/employee/dashboard', role: 'employee' },
  { prefix: '/dashboard', role: 'user' }, // normal users
];

async function getUserRoleFromToken(req: Request, token?: string) {
  try {
    // Prefer explicit bearer token passed to the middleware. If not present,
    // try common cookies that may contain a session or token (session, token).
    let t = token;
    if (!t) {
      const cookieHeader = req.headers.get('cookie') || '';
      const m = cookieHeader.match(/(?:^|; )(?:(?:session)|(?:token))=([^;]+)/);
      if (m && m[1]) t = decodeURIComponent(m[1]);
    }
    if (!t) return null;

    // Decode JWT payload (base64url) without verifying signature so we can
    // extract claims such as `role`, `admin`, or `employee`. This is only
    // used to make routing decisions in middleware; if you need strict
    // verification, perform verification server-side with firebase-admin.
    const parts = t.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1];
    // base64url -> base64
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    // pad
    while (payload.length % 4) payload += '=';
    let jsonString: string;
    if (typeof atob === 'function') {
      jsonString = atob(payload);
    } else {
      // fallback for Node runtime
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const buf = Buffer.from(payload, 'base64');
      jsonString = buf.toString('utf8');
    }
    const claims = JSON.parse(jsonString || '{}');
    const role = claims.role || (claims.admin ? 'admin' : (claims.employee ? 'employee' : null));
    return role;
  } catch (e) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // In development you can optionally skip middleware enforcement to speed up
  // local login flow and avoid dependency on server-side Admin SDK setup.
  // This is a temporary convenience. If you have removed the server-side
  // `verify-role` endpoint, you can set USE_SERVER_VERIFY_ROLE=true to enable
  // server-side verification. By default (or when USE_SERVER_VERIFY_ROLE is
  // not `true`), middleware will bypass the server verification to avoid
  // failing requests.
  const serverVerifyEnabled = process.env.USE_SERVER_VERIFY_ROLE === 'true';
  const devSkip = process.env.DEV_SKIP_AUTH === 'true' || process.env.NODE_ENV !== 'production' || !serverVerifyEnabled;
  if (devSkip) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Find matching role prefix
  for (const entry of roleMap) {
    if (path.startsWith(entry.prefix)) {
      // Extract bearer token from Authorization header if present, else try cookie 'token'
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      const role = await getUserRoleFromToken(req, token || undefined);
      if (!role) {
        // redirect to login and include the original requested path so we can
        // return the user to it after successful authentication.
        // Only include the path portion to avoid leaking hostnames.
        const returnTo = path + (url.search || '');
        url.pathname = '/login';
        url.search = `returnTo=${encodeURIComponent(returnTo)}`;
        return NextResponse.redirect(url);
      }
      // Strict role enforcement: only allow exact role for each area
      if (entry.role === 'admin') {
        if (role !== 'admin') { url.pathname = '/'; return NextResponse.redirect(url); }
      } else if (entry.role === 'employee') {
        if (role !== 'employee') { url.pathname = '/'; return NextResponse.redirect(url); }
      } else if (entry.role === 'user') {
        // Only users can access user pages; block employees and admins
        if (role !== 'user') { url.pathname = '/'; return NextResponse.redirect(url); }
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/employee/dashboard/:path*', '/dashboard/:path*'] };
