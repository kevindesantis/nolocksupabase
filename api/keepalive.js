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

  const allOk = results.every((x) => x.ok);

  return res.status(allOk ? 200 : 207).json({
    ok: allOk,
    startedAt,
    finishedAt: new Date().toISOString(),
    requestsPerProject: REQUESTS_PER_PROJECT,
    projects: results,
  });
}
