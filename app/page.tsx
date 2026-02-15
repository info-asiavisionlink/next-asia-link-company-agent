"use client";

import { useMemo, useState } from "react";

type Row = { id: string; url: string };

type ApiOk = { message: string; status?: number; body?: unknown };
type ApiNg = { message: string; details?: string[]; status?: number; body?: unknown };

type ResultState =
  | { ok: true; message: string; data?: ApiOk }
  | { ok: false; message: string; details?: string[]; data?: ApiNg }
  | null;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeUrl(input: string) {
  const v = (input ?? "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

function isValidUrl(u: string) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((v) => String(v));
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function parseApi(value: unknown): { ok?: ApiOk; ng?: ApiNg } {
  const obj = asObject(value);

  const message = getString(obj["message"]);
  const details = getStringArray(obj["details"]);
  const status = getNumber(obj["status"]);
  const body = obj["body"];

  const base: { message: string; status?: number; body?: unknown } = {
    message: message ?? "response",
    status,
    body,
  };

  if (details && details.length) {
    return { ng: { ...base, details } };
  }
  return { ok: base };
}

export default function Page() {
  const [rows, setRows] = useState<Row[]>([{ id: uid(), url: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  const urls = useMemo(() => rows.map((r) => normalizeUrl(r.url)).filter(Boolean), [rows]);
  const uniqueUrls = useMemo(() => Array.from(new Set(urls)), [urls]);

  const addRow = () => setRows((p) => [...p, { id: uid(), url: "" }]);

  const removeRow = (id: string) =>
    setRows((p) => (p.length === 1 ? p : p.filter((r) => r.id !== id)));

  const setUrl = (id: string, url: string) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, url } : r)));

  const pasteMany = (text: string) => {
    const parts = text
      .split(/\r?\n|,|\t| +/g)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 1) return;

    setRows((prev) => {
      const next = [...prev];
      const [first, ...rest] = parts;

      next[next.length - 1] = { ...next[next.length - 1], url: first };
      for (const u of rest) next.push({ id: uid(), url: u });
      return next;
    });
  };

  const validate = () => {
    const errors: string[] = [];
    if (uniqueUrls.length === 0) errors.push("URLが0件。最低1件入れろ。");

    uniqueUrls.forEach((u, idx) => {
      if (!isValidUrl(u)) errors.push(`(${idx + 1}) URL形式が壊れてる: ${u}`);
    });

    if (urls.length !== uniqueUrls.length) {
      errors.push("重複URLが混ざってる。送信は自動でユニーク化する。");
    }
    return errors;
  };

  const onSubmit = async () => {
    setResult(null);

    const errors = validate();
    const fatal = errors.filter((e) => e.includes("壊れてる") || e.includes("0件"));
    if (fatal.length) {
      setResult({ ok: false, message: "入力が雑。直せ。", details: errors });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "Next Asia Link",
          urls: uniqueUrls,
          created_at: new Date().toISOString(),
        }),
      });

      const raw: unknown = await res.json().catch(() => ({}));
      const parsed = parseApi(raw);

      if (!res.ok) {
        setResult({
          ok: false,
          message: parsed.ng?.message ?? "送信失敗",
          details: parsed.ng?.details ?? [],
          data: parsed.ng,
        });
        return;
      }

      setResult({
        ok: true,
        message: "n8nに投げた。次はワークフロー側で会社情報抽出だ。",
        data: parsed.ok ?? { message: "forwarded" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, message: "通信が死んだ", details: [msg] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 md:py-14">
      <style jsx global>{`
        :root {
          --bg0: #060012;
          --bg1: #0b0030;
          --bg2: #12003a;
          --text: #eaf7ff;
          --muted: #9ad7e6;
          --danger: #ff2ed1;
          --ok: #2dffb2;
          --panel: rgba(10, 0, 30, 0.58);
          --panel2: rgba(20, 0, 60, 0.35);
          --line: rgba(0, 229, 255, 0.18);
        }

        html,
        body {
          height: 100%;
          background: radial-gradient(1200px 800px at 20% 10%, rgba(177, 0, 255, 0.18), transparent 60%),
            radial-gradient(1000px 700px at 80% 20%, rgba(0, 229, 255, 0.16), transparent 55%),
            linear-gradient(135deg, var(--bg0), var(--bg1) 55%, var(--bg2));
          color: var(--text);
        }

        .cyber-grid::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(to right, rgba(0, 229, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(
            circle at 50% 20%,
            rgba(0, 0, 0, 1),
            rgba(0, 0, 0, 0.2) 55%,
            rgba(0, 0, 0, 0) 75%
          );
          opacity: 0.65;
        }

        .neon-border {
          position: relative;
          border: 1px solid rgba(0, 229, 255, 0.25);
          background: linear-gradient(180deg, var(--panel), var(--panel2));
          box-shadow: 0 0 0 1px rgba(177, 0, 255, 0.12) inset, 0 0 24px rgba(0, 229, 255, 0.12),
            0 0 36px rgba(177, 0, 255, 0.1);
          border-radius: 18px;
        }

        .neon-border::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 18px;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(0, 229, 255, 0),
            rgba(0, 229, 255, 0.25),
            rgba(177, 0, 255, 0.2),
            rgba(0, 229, 255, 0)
          );
          filter: blur(10px);
          opacity: 0.55;
        }

        .badge {
          border: 1px solid rgba(0, 229, 255, 0.22);
          background: rgba(0, 0, 0, 0.25);
        }

        .input-cyber {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(0, 229, 255, 0.22);
          outline: none;
        }
        .input-cyber:focus {
          border-color: rgba(0, 229, 255, 0.55);
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.12), 0 0 22px rgba(0, 229, 255, 0.12);
        }

        .neon-btn {
          border: 1px solid rgba(0, 229, 255, 0.35);
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(177, 0, 255, 0.12));
          box-shadow: 0 0 18px rgba(0, 229, 255, 0.15), 0 0 22px rgba(177, 0, 255, 0.12);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .neon-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div className="cyber-grid" />

      <div className="mx-auto max-w-3xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Next Asia Link</h1>
          <p className="mt-2 text-sm md:text-base text-[var(--muted)]">会社情報登録AIエージェント（入力UI）</p>
          <div className="mt-5 h-px w-full bg-[var(--line)]" />
        </header>

        <section className="neon-border p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="badge px-2 py-1 rounded-lg text-xs text-[var(--muted)] font-mono">URL INPUT</span>
                <span className="badge px-2 py-1 rounded-lg text-xs text-[var(--muted)] font-mono">ADD / ADD / ADD</span>
              </div>

              <h2 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight">会社URL 登録パネル</h2>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                URLを入れて「追加」で枠を増やせ。複数URLをまとめ貼りすると自動で分解して増える。
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-2">
              <button onClick={addRow} className="neon-btn px-4 py-2 rounded-xl text-sm font-semibold" type="button">
                ＋ 追加
              </button>
              <div className="text-xs text-[var(--muted)] font-mono">rows: {rows.length}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="flex gap-2 items-center">
                <div className="w-10 text-xs font-mono text-[var(--muted)]">#{String(idx + 1).padStart(2, "0")}</div>

                <input
                  className="input-cyber w-full px-4 py-3 rounded-xl text-sm font-mono"
                  placeholder="https://example.com または example.com"
                  value={row.url}
                  onChange={(e) => setUrl(row.id, e.target.value)}
                  onPaste={(e) => {
                    const t = e.clipboardData.getData("text");
                    if (/\r?\n|,|\t| +/.test(t)) {
                      e.preventDefault();
                      pasteMany(t);
                    }
                  }}
                  spellCheck={false}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                />

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="px-3 py-2 rounded-xl border border-[rgba(255,46,209,0.35)] text-[var(--danger)] hover:bg-[rgba(255,46,209,0.08)] transition disabled:opacity-40"
                  disabled={rows.length === 1}
                  title={rows.length === 1 ? "最低1行は必要" : "削除"}
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-xs text-[var(--muted)] font-mono">送信対象URL: {uniqueUrls.length} 件（重複は自動で除外）</div>

            <button
              onClick={onSubmit}
              className="neon-btn px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              disabled={submitting}
              type="button"
            >
              {submitting ? "送信中..." : "n8nへ送信"}
            </button>
          </div>

          {result && (
            <div className="mt-5 rounded-2xl border border-[rgba(0,229,255,0.18)] bg-[rgba(0,0,0,0.25)] p-4">
              <div className="font-semibold">
                {result.ok ? <span className="text-[var(--ok)]">OK</span> : <span className="text-[var(--danger)]">NG</span>}{" "}
                {result.message}
              </div>

              {!result.ok && result.details?.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
                  {result.details.map((d, i) => (
                    <li key={i} className="break-words">
                      {d}
                    </li>
                  ))}
                </ul>
              ) : null}

              {result.data ? (
                <pre className="mt-3 text-xs text-[var(--muted)] overflow-auto whitespace-pre-wrap">
{JSON.stringify(result.data, null, 2)}
                </pre>
              ) : null}
            </div>
          )}
        </section>

        <footer className="mt-8 text-xs text-[var(--muted)] font-mono">
          次：/api/submit → n8n Webhook に転送。Webhook URL は Vercel の Environment Variables に隠す。
        </footer>
      </div>
    </main>
  );
}