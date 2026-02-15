import { NextResponse } from "next/server";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((v) => String(v));
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function POST(req: Request) {
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { message: "N8N_WEBHOOK_URL が未設定（Vercelの環境変数に入れろ）" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSONが壊れてる" }, { status: 400 });
  }

  const obj = asObject(body);

  const app = asString(obj["app"]) ?? "Next Asia Link";
  const created_at = asString(obj["created_at"]) ?? new Date().toISOString();

  const urls = asStringArray(obj["urls"]) ?? [];
  if (!urls.length) {
    return NextResponse.json({ message: "urls が空" }, { status: 400 });
  }

  try {
    const payload = {
      app,
      urls,
      meta: {
        created_at,
        user_agent: req.headers.get("user-agent") ?? "",
        ip_hint: req.headers.get("x-forwarded-for") ?? "",
      },
    };

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    const parsed = safeJsonParse(text);

    if (!res.ok) {
      return NextResponse.json(
        { message: "n8n がエラー返した", status: res.status, body: parsed },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "forwarded", status: res.status, body: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { message: "Webhook転送で例外", details: [msg] },
      { status: 502 }
    );
  }
}