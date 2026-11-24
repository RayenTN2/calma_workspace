import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { prisma } from "@/infrastructure/database/prisma";

function authorizationResponse(auth) {
  if (auth.authorized) return null;
  const message = auth.status === 401
    ? "You must log in first."
    : "You do not have permission to access this resource.";
  return NextResponse.json({ message }, { status: auth.status });
}

function validateName(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
    return null;
  }
  return body.name.trim();
}

export async function PATCH(request, { params }) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = authorizationResponse(auth);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const name = validateName(body);
  if (!name) {
    return NextResponse.json({ message: "Equipment name is required and must be at most 100 characters." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const equipment = await prisma.equipment.update({ where: { id }, data: { name } });
    return NextResponse.json({ equipment });
  } catch (error) {
    if (error.code === "P2025") return NextResponse.json({ message: "Equipment not found." }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ message: "An equipment item with this name already exists." }, { status: 409 });
    return NextResponse.json({ message: "Unable to update equipment." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  const denied = authorizationResponse(auth);
  if (denied) return denied;

  try {
    const { id } = await params;
    await prisma.equipment.delete({ where: { id } });
    return NextResponse.json({ message: "Equipment removed." });
  } catch (error) {
    if (error.code === "P2025") return NextResponse.json({ message: "Equipment not found." }, { status: 404 });
    if (error.code === "P2003" || error.code === "P2014") {
      return NextResponse.json({ message: "This equipment is assigned to one or more rooms and cannot be removed." }, { status: 409 });
    }
    return NextResponse.json({ message: "Unable to remove equipment." }, { status: 500 });
  }
}
