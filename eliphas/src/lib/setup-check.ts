// Explains a half-finished setup in plain words instead of a bare "Internal Server Error".
// Shows only setting NAMES, never their values.

const REQUIRED = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", value: () => process.env.NEXT_PUBLIC_SUPABASE_URL, looksRight: (v: string) => /^https?:\/\/\S+$/.test(v), hint: "should start with https:// (Supabase → Connect → Project URL)" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, looksRight: (v: string) => /^(sb_publishable_|eyJ)\S+$/.test(v), hint: "should start with sb_publishable_ (or eyJ for the older anon key)" },
  { name: "SUPABASE_SECRET_KEY", value: () => process.env.SUPABASE_SECRET_KEY, looksRight: (v: string) => /^(sb_secret_|eyJ)\S+$/.test(v), hint: "should start with sb_secret_ (or eyJ for the older service_role key)" },
] as const;

export type SetupProblem = { name: string; problem: string };

export function setupProblems(): SetupProblem[] {
  const out: SetupProblem[] = [];
  for (const r of REQUIRED) {
    const v = r.value()?.trim();
    if (!v) out.push({ name: r.name, problem: "missing" });
    else if (!r.looksRight(v)) out.push({ name: r.name, problem: `value doesn't look right: it ${r.hint}` });
  }
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function setupPage(problems: SetupProblem[], extra?: string) {
  const items = problems.map((p) => `<li><code>${esc(p.name)}</code> — ${esc(p.problem)}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Setup needed · Eliphas Indicus</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f3f4f7;color:#17214a;font:17px/1.6 system-ui,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:34rem;background:#fff;border-radius:24px;padding:28px;box-shadow:0 10px 30px -12px rgb(23 33 74/.2)}
h1{font:600 1.6rem/1.2 Georgia,serif;margin:0 0 8px}code{background:#eceef4;padding:2px 6px;border-radius:6px;font-size:.9em;word-break:break-all}
li{margin:8px 0}ol{padding-left:1.2rem}.muted{color:#5a6386}</style></head><body><main>
<h1>Almost there: setup needed</h1>
<p class="muted">The website is running, but some settings in Vercel are missing or wrong.</p>
${items ? `<ul>${items}</ul>` : ""}${extra ? `<p>${esc(extra)}</p>` : ""}
<p><b>To fix:</b></p><ol><li>Vercel → your project → <b>Settings → Environment Variables</b></li>
<li>Add or correct the names above (exact spelling, capitals and underscores)</li>
<li><b>Deployments</b> → ⋯ on the top one → <b>Redeploy</b></li></ol>
</main></body></html>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
