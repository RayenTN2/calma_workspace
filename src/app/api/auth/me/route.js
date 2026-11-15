
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/features/auth/utils/auth";

import { findUserById } from "@/features/auth/repositories/auth.repository";

export async function GET(request) {
  try {
    // 1. Verify access token
    const authenticatedUser = await getAuthenticatedUser(request);

    // 2. Reject unauthenticated requests
    if (!authenticatedUser) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 3. Retrieve user information from PostgreSQL
    const user = await findUserById(authenticatedUser.userId);

    // 4. Check whether the user still exists
    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    // 5. Return safe user information
    return NextResponse.json(
      {
        message: "User authenticated successfully.",
        user,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Authentication error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
