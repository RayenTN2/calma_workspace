
import { NextResponse } from "next/server";

import {
  verifyUserEmail,
} from "@/features/auth/services/verification.service";

export async function POST(request) {
  try {
    const body = await request.json();

    const result = await verifyUserEmail(body);

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return NextResponse.json(
      {
        message:
          error.status && error.status < 500
            ? error.message
            : "Unable to verify email. Please try again.",
      },
      {
        status: error.status || 500,
      }
    );
  }
}
