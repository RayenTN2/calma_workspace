
import { NextResponse } from "next/server";

import {
  logoutService,
} from "@/features/auth/services/logout.service";

export async function POST(request) {
  try {
    // 1. Read refresh token from cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // 2. Revoke refresh token in PostgreSQL
    await logoutService(refreshToken);

    // 3. Create response
    const response = NextResponse.json(
      { message: "Logout successful." },
      { status: 200 }
    );

    // 4. Clear access token cookie
    response.cookies.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // 5. Clear refresh token cookie
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });

    return response;

  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
