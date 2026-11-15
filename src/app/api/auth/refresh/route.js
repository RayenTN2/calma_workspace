
import { NextResponse } from "next/server";

import { refreshService } from "@/features/auth/services/refresh.service";

export async function POST(request) {
  try {
    // 1. Read the refresh token from the cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // 2. Validate the refresh token and generate a new access token
    const result = await refreshService(refreshToken);

    // 3. Create the response
    const response = NextResponse.json(
      {
        message: "Access token refreshed successfully.",
      },
      { status: 200 }
    );

    // 4. Replace the old access-token cookie
    response.cookies.set("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;

  } catch (error) {
    if (
      error.message === "Refresh token is required." ||
      error.message === "Invalid refresh token."
    ) {
      const response = NextResponse.json(
        { message: "Session expired. Please log in again." },
        { status: 401 }
      );

      // Clear both cookies when the refresh token is invalid
      response.cookies.set("accessToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      response.cookies.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 0,
      });

      return response;
    }

    console.error("Refresh error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
