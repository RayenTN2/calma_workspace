import { NextResponse } from "next/server";
import { authorizeRoles } from "@/features/auth/utils/authorization";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(request) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  if (!auth.authorized) {
    const message = auth.status === 401
      ? "You must log in first."
      : "You do not have permission to access this resource.";
    return NextResponse.json({ message }, { status: auth.status });
  }

  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { rooms: true } } },
    });
    return NextResponse.json({ equipment });
  } catch {
    return NextResponse.json({ message: "Unable to load equipment." }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await authorizeRoles(request, ["GERANT"]);
  if (!auth.authorized) {
    const message = auth.status === 401
      ? "You must log in first."
      : "You do not have permission to access this resource.";
    return NextResponse.json({ message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body?.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
    return NextResponse.json({ message: "Equipment name is required and must be at most 100 characters." }, { status: 400 });
  }

  try {
    const equipment = await prisma.equipment.create({ data: { name: body.name.trim() } });
    return NextResponse.json({ equipment }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "An equipment item with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ message: "Unable to create equipment." }, { status: 500 });
  }
}
