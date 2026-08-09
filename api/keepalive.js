const PROJECTS = [
  ["inventariodpz", "INVENTARIODPZ_URL", "INVENTARIODPZ_KEY"],
  ["gestionaledpz", "GESTIONALEDPZ_URL", "GESTIONALEDPZ_KEY"],
  ["comandapp", "COMANDAPP_URL", "COMANDAPP_KEY"],
  ["duepuntozero", "DUEPUNTOZERO_URL", "DUEPUNTOZERO_KEY"],
  ["damorgante", "DAMORGANTE_URL", "DAMORGANTE_KEY"],
  ["tavernetta", "TAVERNETTA_URL", "TAVERNETTA_KEY"],
];

const REQUESTS_PER_PROJECT = 10;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

async function pingProject(name, url, key) {
  if (!url || !key) {
    return { name, ok: false, error: "Variabili ambiente mancanti" };
  }

  const endpoint =
    `${url.replace(/\/$/, "")}/rest/v1/keepalive?select=id&limit=1`;

  const attempts = [];

  for (let i = 0; i < REQUESTS_PER_PROJECT; i++) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
      });

      const body = await response.text();

      attempts.push({
        attempt: i + 1,
        ok: response.ok,
        status: response.status,
        body: response.ok ? undefined : body.slice(0, 300),
      });
    } catch (error) {
      attempts.push({
        attempt: i + 1,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successfulRequests = attempts.filter((x) => x.ok).length;

  return {
    name,
    ok: successfulRequests === REQUESTS_PER_PROJECT,
    successfulRequests,
    totalRequests: REQUESTS_PER_PROJECT,
    attempts,
  };
}

async function sendAlertEmail(failedProjects) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  const from =
    process.env.ALERT_FROM?.trim() ||
    "Supabase Keeper <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return {
      sent: false,
      skipped: true,
      error: "RESEND_API_KEY o ALERT_EMAIL mancanti",
    };
  }

  const now = new Date();
  const rows = failedProjects
    .map((p) => {
      const firstError = p.attempts?.find((a) => !a.ok);
      const detail = firstError?.status
        ? `HTTP ${firstError.status}`
        : firstError?.error || p.error || "Errore sconosciuto";

      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${p.name}</td>
          <td style="padding:8px;border:1px solid #ddd">${p.successfulRequests ?? 0}/${p.totalRequests ?? REQUESTS_PER_PROJECT}</td>
          <td style="padding:8px;border:1px solid #ddd">${detail}</td>
        </tr>`;
    })
    .join("");

  const subject =
    failedProjects.length === 1
      ? `⚠️ Errore Supabase – ${failedProjects[0].name}`
      : `⚠️ Errori Supabase – ${failedProjects.length} progetti`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px">
      <h2>⚠️ Supabase Keeper ha rilevato un errore</h2>
      <p>Uno o più progetti non hanno completato correttamente tutte le richieste di controllo.</p>
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #ddd">Progetto</th>
            <th style="text-align:left;padding:8px;border:1px solid #ddd">Richieste OK</th>
            <th style="text-align:left;padding:8px;border:1px solid #ddd">Dettaglio</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px">Controllo eseguito: ${now.toISOString()}</p>
      <p>Apri i log del progetto <strong>nolocksupabase</strong> su Vercel per i dettagli.</p>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const body = await response.text();

  return {
    sent: response.ok,
    status: response.status,
    response: body.slice(0, 500),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const startedAt = new Date().toISOString();

  const results = await Promise.all(
    PROJECTS.map(([name, urlEnv, keyEnv]) =>
      pingProject(name, process.env[urlEnv], process.env[keyEnv])
    )
  );

  const failedProjects = results.filter((x) => !x.ok);
  const allOk = failedProjects.length === 0;

  let email = { sent: false, skipped: true };

  if (!allOk) {
    try {
      email = await sendAlertEmail(failedProjects);
    } catch (error) {
      email = {
        sent: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return res.status(allOk ? 200 : 207).json({
    ok: allOk,
    startedAt,
    finishedAt: new Date().toISOString(),
    requestsPerProject: REQUESTS_PER_PROJECT,
    projects: results,
    alertEmail: email,
  });
}
