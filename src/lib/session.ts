import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
}

export function isAdmin(session: any) {
  return session?.user?.role === "ADMIN";
}
