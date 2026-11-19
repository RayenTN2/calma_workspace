import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import {
  deactivateRoom,
  editRoom,
} from "@/features/rooms/services/room.service";

function authorizationResponse(result) {
  if (result.authorized) return null;

  const message = result.status === 401
    ? "You must log in first."
    : "You do not have permission to access this resource.";

  return NextResponse.json({ message }, { status: result.status });
}

function errorResponse(error, action) {
  if (error.status === 400) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error.code === "P2025") {
    return NextResponse.json({ message: "Room not found." }, { status: 404 });
  }

  if (error.code === "P2002") {
    return NextResponse.json(
      { message: "A room with this name already exists." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { message: `Unable to ${action} the room.` },
    { status: 500 }
  );
}

export async function PATCH(request, { params }) {
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
    const { id } = await params;
    const room = await editRoom(id, body);
    return NextResponse.json({ room });
  } catch (error) {
    return errorResponse(error, "update");
  }
}

export async function DELETE(request, { params }) {
  const authorization = await authorizeRoles(request, ["GERANT"]);
  const denied = authorizationResponse(authorization);
  if (denied) return denied;

  try {
    const { id } = await params;
    const room = await deactivateRoom(id);
    return NextResponse.json({ room });
  } catch (error) {
    return errorResponse(error, "deactivate");
  }
}
