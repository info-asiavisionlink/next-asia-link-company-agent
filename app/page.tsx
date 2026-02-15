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

  if (details && details.length) return { ng: { ...base, details } };
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
    if (uniqueUrls.length === 0) errors.push("No URL provided. Add at least 1 target.");

    uniqueUrls.forEach((u, idx) => {
      if (!isValidUrl(u)) errors.push(`#${idx + 1} Invalid URL format: ${u}`);
    });

    if (urls.length !== uniqueUrls.length) {
      errors.push("Duplicates detected. Payload will be de-duplicated automatically.");
    }
    return errors;
  };

  const onSubmit = async () => {
    setResult(null);

    const errors = validate();
    const fatal = errors.filter((e) => e.includes("Invalid URL") || e.includes("No URL"));
    if (fatal.length) {
      setResult({ ok: false, message: "Input rejected.", details: errors });
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
          message: parsed.ng?.message ?? "Send failed.",
          details: parsed.ng?.details ?? [],
          data: parsed.ng,
        });
        return;
      }

      setResult({
        ok: true,
        message: "Payload sent.",
        data: parsed.ok ?? { message: "forwarded" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, message: "Network error.", details: [msg] });
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = () => {
    setRows([{ id: uid(), url: "" }]);
    setResult(null);
  };

  return (
    <main className="min-h-screen">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Share+Tech+Mono&display=swap");

        :root {
          --bg0: #05000f;
          --bg1: #09002a;
          --bg2: #120045;

          --c: #00e5ff;
          --m: #b100ff;
          --g: #2dffb2;
          --r: #ff2ed1;

          --text: rgba(234, 247, 255, 0.92);
          --muted: rgba(154, 215, 230, 0.8);

          --panel: rgba(10, 0, 30, 0.62);
          --panel2: rgba(0, 0, 0, 0.22);
          --line: rgba(0, 229, 255, 0.18);

          --br: 18px;
        }

        html,
        body {
          height: 100%;
          background: radial-gradient(1100px 700px at 15% 10%, rgba(177, 0, 255, 0.22), transparent 60%),
            radial-gradient(900px 600px at 85% 20%, rgba(0, 229, 255, 0.18), transparent 55%),
            linear-gradient(135deg, var(--bg0), var(--bg1) 55%, var(--bg2));
          color: var(--text);
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        .font-title {
          font-family: "Orbitron", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          letter-spacing: 0.02em;
        }
        .font-mono {
          font-family: "Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
            "Courier New", monospace;
        }

        /* HUD overlays */
        .scanlines::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.035),
            rgba(255, 255, 255, 0.035) 1px,
            rgba(0, 0, 0, 0) 4px,
            rgba(0, 0, 0, 0) 8px
          );
          mix-blend-mode: overlay;
          opacity: 0.35;
        }

        .noise::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          opacity: 0.08;
        }

        .grid::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(to right, rgba(0, 229, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: radial-gradient(circle at 50% 25%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0) 78%);
          opacity: 0.55;
        }

        .glow {
          box-shadow: 0 0 22px rgba(0, 229, 255, 0.14), 0 0 32px rgba(177, 0, 255, 0.12);
        }

        .panel {
          position: relative;
          border-radius: var(--br);
          background: linear-gradient(180deg, rgba(10, 0, 30, 0.65), rgba(0, 0, 0, 0.22));
          border: 1px solid rgba(0, 229, 255, 0.22);
        }
        .panel::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: var(--br);
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(0, 229, 255, 0),
            rgba(0, 229, 255, 0.22),
            rgba(177, 0, 255, 0.18),
            rgba(0, 229, 255, 0)
          );
          filter: blur(10px);
          opacity: 0.55;
        }

        .corner {
          position: absolute;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0, 229, 255, 0.55);
          filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.25));
        }
        .corner.tl {
          top: 10px;
          left: 10px;
          border-right: 0;
          border-bottom: 0;
          border-radius: 8px 0 0 0;
        }
        .corner.tr {
          top: 10px;
          right: 10px;
          border-left: 0;
          border-bottom: 0;
          border-radius: 0 8px 0 0;
        }
        .corner.bl {
          bottom: 10px;
          left: 10px;
          border-right: 0;
          border-top: 0;
          border-radius: 0 0 0 8px;
        }
        .corner.br {
          bottom: 10px;
          right: 10px;
          border-left: 0;
          border-top: 0;
          border-radius: 0 0 8px 0;
        }

        .pill {
          border: 1px solid rgba(0, 229, 255, 0.22);
          background: rgba(0, 0, 0, 0.25);
          border-radius: 999px;
        }

        .input {
          width: 100%;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(0, 229, 255, 0.22);
          outline: none;
          color: var(--text);
        }
        .input:focus {
          border-color: rgba(0, 229, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.14), 0 0 26px rgba(0, 229, 255, 0.12);
        }

        .btn {
          border-radius: 14px;
          border: 1px solid rgba(0, 229, 255, 0.35);
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(177, 0, 255, 0.12));
          box-shadow: 0 0 18px rgba(0, 229, 255, 0.16), 0 0 22px rgba(177, 0, 255, 0.12);
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 24px rgba(0, 229, 255, 0.24), 0 0 30px rgba(177, 0, 255, 0.18);
          filter: saturate(1.1);
        }

        .btn-danger {
          border: 1px solid rgba(255, 46, 209, 0.35);
          color: rgba(255, 46, 209, 0.95);
          background: rgba(255, 46, 209, 0.08);
        }
        .btn-danger:hover {
          background: rgba(255, 46, 209, 0.12);
        }

        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--g);
          box-shadow: 0 0 12px rgba(45, 255, 178, 0.35);
        }
      `}</style>

      <div className="scanlines noise grid" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        {/* TOP HUD BAR */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="statusDot" />
            <div>
              <div className="font-title text-2xl md:text-4xl font-extrabold">Next Asia Link</div>
              <div className="font-mono text-xs md:text-sm text-[var(--muted)]">
                COMPANY REGISTRATION CONSOLE · BUILD: ALPHA
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
            <span className="pill px-3 py-2">MODE: SCAN</span>
            <span className="pill px-3 py-2">LINKS: {uniqueUrls.length}</span>
            <span className="pill px-3 py-2">ROWS: {rows.length}</span>
          </div>
        </div>

        {/* MAIN PANEL */}
        <section className="panel glow p-5 md:p-7 relative">
          <div className="corner tl" />
          <div className="corner tr" />
          <div className="corner bl" />
          <div className="corner br" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="font-title text-xl md:text-2xl font-bold">TARGET LINKS</div>
              <div className="font-mono text-sm text-[var(--muted)] mt-2">
                Paste multiple URLs (newline / comma / space supported). Duplicates will be removed.
              </div>
            </div>

            <div className="flex gap-2 md:justify-end">
              <button type="button" className="btn px-4 py-3 font-title text-sm" onClick={addRow}>
                + ADD
              </button>
              <button type="button" className="btn btn-danger px-4 py-3 font-title text-sm" onClick={clearAll}>
                CLEAR
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="flex gap-2 items-center">
                <div className="font-mono text-xs text-[var(--muted)] w-14">#{String(idx + 1).padStart(2, "0")}</div>

                <input
                  className="input font-mono px-4 py-4 text-sm"
                  placeholder="https://example.com or example.com"
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
                  className="btn btn-danger px-3 py-3 font-title text-xs disabled:opacity-40"
                  disabled={rows.length === 1}
                  title={rows.length === 1 ? "At least 1 row required" : "Remove"}
                >
                  DEL
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="font-mono text-xs text-[var(--muted)]">
              READY PAYLOAD: {uniqueUrls.length} LINK(S) · AUTO DEDUPE
            </div>

            <button
              onClick={onSubmit}
              className="btn px-6 py-4 font-title text-sm disabled:opacity-50"
              disabled={submitting}
              type="button"
            >
              {submitting ? "SENDING..." : "SEND"}
            </button>
          </div>

          {/* RESULT CONSOLE */}
          {result && (
            <div className="mt-6 rounded-2xl border border-[rgba(0,229,255,0.18)] bg-[rgba(0,0,0,0.28)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-title text-sm font-bold">
                  {result.ok ? (
                    <span className="text-[var(--g)]">TRANSMISSION OK</span>
                  ) : (
                    <span className="text-[var(--r)]">TRANSMISSION FAILED</span>
                  )}
                </div>
                <div className="font-mono text-xs text-[var(--muted)]">/api/submit</div>
              </div>

              <div className="font-mono text-sm mt-2">{result.message}</div>

              {!result.ok && result.details?.length ? (
                <ul className="mt-3 list-disc pl-5 font-mono text-xs text-[var(--muted)]">
                  {result.details.map((d, i) => (
                    <li key={i} className="break-words">
                      {d}
                    </li>
                  ))}
                </ul>
              ) : null}

              {result.data ? (
                <pre className="mt-3 font-mono text-xs text-[var(--muted)] overflow-auto whitespace-pre-wrap">
{JSON.stringify(result.data, null, 2)}
                </pre>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}