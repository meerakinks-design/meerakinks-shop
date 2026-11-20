import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_LOGIN_PATH, LOGIN_API_PATH, LOGOUT_API_PATH, SESSION_COOKIE_NAME } from '@/lib/constants/auth';

// Tri rapide à la frontière (runtime Edge : pas de base de données ici). Un cookie présent
// ne prouve rien : la vérification réelle de la session se fait dans server/auth/guards.ts,
// dans chaque page et chaque route. Le middleware évite seulement des allers-retours inutiles
// et pose l'en-tête noindex sur tout le back-office.
const OPEN_PATHS = new Set([ADMIN_LOGIN_PATH, LOGIN_API_PATH, LOGOUT_API_PATH]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSessionCookie && !OPEN_PATHS.has(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Connexion requise.', retryable: false } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/admin/:path*', '/api/v1/admin/:path*'] };
