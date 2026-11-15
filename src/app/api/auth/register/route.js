
import { NextResponse } from "next/server";

import {
  registerUser,
} from "@/features/auth/services/register.service";

export async function POST(request) {
  try {
    const body = await request.json();

    const result = await registerUser(body);

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        message:
          error.status && error.status < 500
            ? error.message
            : "Unable to complete registration. Please try again.",
      },
      {
        status: error.status || 500,
      }
    );
  }
}
