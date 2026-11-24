import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { createRoom } from "@/features/rooms/services/room.service";

function authorizationResponse(result) {
  if (result.authorized) return null;

  const message = result.status === 401
    ? "You must log in first."
    : "You do not have permission to access this resource.";

  return NextResponse.json({ message }, { status: result.status });
}

function errorResponse(error) {
  if (error.status === 400) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error.code === "P2002") {
    return NextResponse.json(
      { message: "A room with this name already exists." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { message: "Unable to create the room." },
    { status: 500 }
  );
}

export async function POST(request) {
  const authorization = await authorizeRoles(request, ["GERANT"]);
  const denied = authorizationResponse(authorization);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const room = await createRoom(body);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
