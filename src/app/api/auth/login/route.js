
import { NextResponse } from "next/server";

import { loginService } from "@/features/auth/services/login.service";

export async function POST(request) {
  try {
    // 1. Read the request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // 2. Call the login service
    const result = await loginService({ email, password });

    // 3. Prepare the response
    const response = NextResponse.json(
      {
        message: "Login successful.",
        user: result.user,
      },
      { status: 200 }
    );

    // 4. Store the access token in an HttpOnly cookie
    response.cookies.set("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    // 5. Store the refresh token in an HttpOnly cookie
    response.cookies.set("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;

  } catch (error) {
    // 6. Handle expected authentication errors
    if (error.message === "Email and password are required.") {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    if (error.message === "Invalid email or password.") {
      return NextResponse.json(
        { message: error.message },
        { status: 401 }
      );
    }

    if (error.message === "Please verify your email before logging in.") {
      return NextResponse.json(
        { message: error.message },
        { status: 403 }
      );
    }

    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
