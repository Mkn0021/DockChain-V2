import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("Environment variable: NEXT_PUBLIC_API_URL is not set.");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const isAuthenticated = !!accessToken || !!refreshToken;

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/api/")) {
    const backendPath = pathname.replace("/api", "");
    const backendUrl = `${API_BASE_URL}${backendPath}${request.nextUrl.search}`;

    try {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");

      const accessToken = request.cookies.get("accessToken")?.value;
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      const backendResponse = await fetch(backendUrl, {
        method: request.method,
        headers,
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? await request.text()
            : undefined,
      });

      const responseData = await backendResponse.json();

      if (pathname === "/api/auth/login" || pathname === "/api/auth/google") {
        if (responseData.success && responseData.data) {
          const { accessToken, refreshToken, ...userData } = responseData.data;

          const response = NextResponse.json({
            success: true,
            data: userData,
            message: responseData.message,
          });

          if (accessToken) {
            response.cookies.set("accessToken", accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 15 * 60,
              path: "/",
            });
          }

          if (refreshToken) {
            response.cookies.set("refreshToken", refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60,
              path: "/",
            });
          }

          return response;
        }
      }

      if (pathname === "/api/auth/refresh") {
        const refreshToken = request.cookies.get("refreshToken")?.value;

        if (!refreshToken) {
          return NextResponse.json(
            { success: false, error: "No refresh token found" },
            { status: 401 }
          );
        }

        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.success && refreshData.data) {
          const { accessToken, refreshToken: newRefreshToken } =
            refreshData.data;

          const response = NextResponse.json({
            success: true,
            message: "Token refreshed successfully",
          });

          if (accessToken) {
            response.cookies.set("accessToken", accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 15 * 60,
              path: "/",
            });
          }

          if (newRefreshToken) {
            response.cookies.set("refreshToken", newRefreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60,
              path: "/",
            });
          }

          return response;
        }

        return NextResponse.json(refreshData, {
          status: refreshResponse.status,
        });
      }

      if (pathname === "/api/auth/logout") {
        const response = NextResponse.json(responseData, {
          status: backendResponse.status,
        });

        response.cookies.delete("accessToken");
        response.cookies.delete("refreshToken");

        return response;
      }

      return NextResponse.json(responseData, {
        status: backendResponse.status,
      });
    } catch (error) {
      console.error("Middleware error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to process request" },
        { status: 500 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/login", "/dashboard/:path*"],
};
