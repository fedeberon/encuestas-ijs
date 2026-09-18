import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return NextResponse.json({ error: "La integración no está configurada." }, { status: 500 });

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (typeof body.username !== "string" || typeof body.password !== "string" || !body.username.trim() || !body.password) {
    return NextResponse.json({ error: "Ingresá usuario y contraseña." }, { status: 400 });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username: body.username.trim(), password: body.password }),
      cache: "no-store",
      redirect: "follow",
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; user?: { username: string; name: string; role: string } } | null;
    if (!response.ok || !result?.ok || !result.user) {
      return NextResponse.json({ error: result?.error || "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const nextResponse = NextResponse.json({ ok: true, user: result.user });
    nextResponse.cookies.set(SESSION_COOKIE, createSessionToken(result.user), sessionCookieOptions);
    return nextResponse;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "No se pudo conectar con el servicio de usuarios." }, { status: 502 });
  }
}
