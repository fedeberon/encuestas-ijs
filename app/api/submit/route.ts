import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";

export const runtime = "nodejs";

const requiredFields = ["institution", "name", "surname"] as const;

type SubmitPayload = {
  institution?: unknown;
  name?: unknown;
  surname?: unknown;
  selected?: unknown;
  contact?: unknown;
  visit?: unknown;
};

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json({ error: "La integración con Google Sheets no está configurada." }, { status: 500 });
  }

  let payload: SubmitPayload;
  try {
    payload = (await request.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "La solicitud no tiene un JSON válido." }, { status: 400 });
  }

  for (const field of requiredFields) {
    if (typeof payload[field] !== "string" || !payload[field].trim()) {
      return NextResponse.json({ error: "Institución, nombre y apellido son obligatorios." }, { status: 400 });
    }
  }

  if (!payload.selected || typeof payload.selected !== "object" || Array.isArray(payload.selected)) {
    return NextResponse.json({ error: "La selección de respuestas es inválida." }, { status: 400 });
  }

  try {
    const scriptResponse = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "follow",
    });

    const responseText = await scriptResponse.text();
    let scriptResult: { ok?: boolean; error?: string } | null = null;
    try {
      scriptResult = JSON.parse(responseText) as { ok?: boolean; error?: string };
    } catch {
      // A non-JSON response is not a successful Apps Script submission.
    }

    if (!scriptResponse.ok || !scriptResult || scriptResult.ok === false) {
      const scriptError = scriptResult?.error;
      console.error("Google Apps Script rejected submission", scriptError || responseText.slice(0, 500));
      return NextResponse.json(
        { error: scriptError ? `Google Sheets: ${scriptError}` : "Google Sheets devolvió una respuesta inválida." },
        { status: 502 },
      );
    }

    if (scriptResult.ok !== true) {
      return NextResponse.json({ error: "Google Sheets rechazó la encuesta. Podés volver a intentar." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Google Apps Script submission failed", error);
    return NextResponse.json({ error: "No se pudo conectar con Google Sheets. Podés volver a intentar." }, { status: 502 });
  }
}
