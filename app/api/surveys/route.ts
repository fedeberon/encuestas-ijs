import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";

export const runtime = "nodejs";

type AppsScriptResponse = {
  ok?: boolean;
  error?: string;
  headers?: string[];
  rows?: string[][];
  stats?: {
    total: number;
    areas: { label: string; count: number }[];
    carreras: { label: string; count: number }[];
    valora: { label: string; count: number }[];
    contact: Record<string, number>;
    visit: Record<string, number>;
  };
};

export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json({ error: "La integración con Google Sheets no está configurada." }, { status: 500 });
  }

  const action = new URL(request.url).searchParams.get("action") || "surveys";
  if (!new Set(["surveys", "stats", "health"]).has(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  try {
    const response = await fetch(`${scriptUrl}?action=${encodeURIComponent(action)}`, {
      cache: "no-store",
      redirect: "follow",
    });
    const body = (await response.json().catch(() => null)) as AppsScriptResponse | null;

    if (!response.ok || !body || body.ok === false) {
      return NextResponse.json(
        { error: body?.error || "Google Sheets devolvió una respuesta inválida." },
        { status: 502 },
      );
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Google Apps Script read failed", error);
    return NextResponse.json({ error: "No se pudo leer Google Sheets." }, { status: 502 });
  }
}
