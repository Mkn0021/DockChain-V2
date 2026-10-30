import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

const isAuthenticated = (request: NextRequest) =>
  AUTH_COOKIE_NAMES.some((name) => request.cookies.has(name));

const isProtectedRoute = (pathname: string) =>
  pathname === "/onboarding" ||
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/") ||
  /^\/[^/]+\/dashboard(?:\/.*)?$/.test(pathname);

const rewriteSlugDashboard = (
  request: NextRequest,
  pathname: string,
  search: string
) => {
  const dashboardPath = pathname.replace(/^\/[^/]+/, "");
  return NextResponse.rewrite(
    new URL(`${dashboardPath}${search}`, request.url)
  );
};

const redirectToLogin = (
  request: NextRequest,
  pathname: string,
  search: string
) => {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (authenticated && /^\/[^/]+\/dashboard(?:\/.*)?$/.test(pathname)) {
    return rewriteSlugDashboard(request, pathname, search);
  }

  if (isProtectedRoute(pathname) && !authenticated) {
    return redirectToLogin(request, pathname, search);
  }

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/onboarding",
    "/dashboard/:path*",
    "/:slug/dashboard/:path*",
  ],
};
