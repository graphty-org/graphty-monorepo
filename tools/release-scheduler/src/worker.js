// A Cloudflare Worker that starts graphty-monorepo's release train on a schedule. GitHub's own cron
// creates this repository's scheduled runs hours late or not at all, so release.yml has no schedule
// of its own: this Worker dispatches it (with `scheduled: true`) at 00:00, 06:00, 12:00 and 18:00 UTC,
// authenticated as a GitHub App, so there is no token to expire. When it cannot start a train it opens
// (or comments on) one issue. See README.md for setup.
//
// Secrets (wrangler secret put): APP_ID, INSTALLATION_ID, PRIVATE_KEY (PKCS#8 PEM).

const API = "https://api.github.com";
const REPO = "graphty-org/graphty-monorepo";
export const ISSUE_TITLE = "Release scheduler could not start a release train";
export const PKCS1_MESSAGE =
    "PRIVATE_KEY is a PKCS#1 key (BEGIN RSA PRIVATE KEY), which WebCrypto cannot read. Convert it to PKCS#8 with " +
    "`openssl pkcs8 -topk8 -nocrypt -in <downloaded>.pem -out release-scheduler-key.pem` and store that file instead.";

const HEADERS = {
    "User-Agent": "graphty-release-scheduler",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
};

const base64url = (bytes) =>
    btoa(String.fromCodePoint(...new Uint8Array(bytes)))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
const encodeJson = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * Builds a GitHub App JWT (RS256), valid from a minute ago for nine minutes.
 * @param appId the GitHub App's ID
 * @param pem the App's private key, PKCS#8 PEM
 * @param [nowMs] the current time in milliseconds
 * @returns the signed JWT
 */
export async function buildJwt(appId, pem, nowMs = Date.now()) {
    if (pem.includes("BEGIN RSA PRIVATE KEY")) {
        throw new Error(PKCS1_MESSAGE);
    }
    const body = pem.replaceAll(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replaceAll(/\s/g, "");
    const der = Uint8Array.from(atob(body), (c) => c.codePointAt(0));
    const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
        "sign",
    ]);
    const now = Math.floor(nowMs / 1000);
    const input = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({ iat: now - 60, exp: now + 540, iss: String(appId) })}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
    return `${input}.${base64url(signature)}`;
}

/**
 * Dispatches release.yml once, filing or commenting on the failure issue when that does not work.
 * @param env the Worker's secrets: APP_ID, INSTALLATION_ID, PRIVATE_KEY
 * @param [options] what tests inject
 * @param [options.fetch] the fetch to call GitHub with (default: the global fetch)
 * @param [options.slot] the scheduled slot this run is for, named in the failure issue
 * @returns `{ dispatched, status }`: whether the train was started, and the dispatch's HTTP status
 */
export async function run(env, { fetch: doFetch = fetch, slot = new Date() } = {}) {
    const gh = (path, token, init = {}) =>
        doFetch(`${API}${path}`, {
            ...init,
            headers: { ...HEADERS, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

    // No installation token means no way to file an issue: fail loudly in the Worker's logs.
    let token;
    try {
        const jwt = await buildJwt(env.APP_ID, env.PRIVATE_KEY);
        const res = await gh(`/app/installations/${env.INSTALLATION_ID}/access_tokens`, jwt, { method: "POST" });
        if (!res.ok) {
            throw new Error(`token exchange returned HTTP ${res.status}: ${await res.text()}`);
        }
        ({ token } = await res.json());
    } catch (error) {
        console.error(`RELEASE SCHEDULER FAILED for slot ${slot.toISOString()}, no train started: ${error.message}`);
        throw error;
    }

    let status;
    let detail;
    try {
        const res = await gh(`/repos/${REPO}/actions/workflows/release.yml/dispatches`, token, {
            method: "POST",
            body: JSON.stringify({ ref: "master", inputs: { scheduled: "true" } }),
        });
        status = res.status;
        if (status === 204) {
            console.log(`release train dispatched for slot ${slot.toISOString()}`);
            return { dispatched: true, status };
        }
        detail = await res.text();
    } catch (error) {
        detail = `request failed: ${error.message}`;
    }

    console.error(`release.yml dispatch failed for slot ${slot.toISOString()}: HTTP ${status ?? "none"} ${detail}`);
    const body = [
        `The release scheduler (tools/release-scheduler/) could not start the release train for the ${slot.toISOString()} slot.`,
        "",
        `Dispatching release.yml returned HTTP ${status ?? "(no response)"}:`,
        "",
        "```",
        detail.slice(0, 4000),
        "```",
    ].join("\n");
    const q = encodeURIComponent(`repo:${REPO} is:issue is:open in:title "${ISSUE_TITLE}"`);
    const search = await gh(`/search/issues?q=${q}`, token);
    const open = search.ok ? (await search.json()).items.find((i) => i.title === ISSUE_TITLE) : undefined;
    const res = open
        ? await gh(`/repos/${REPO}/issues/${open.number}/comments`, token, {
              method: "POST",
              body: JSON.stringify({ body }),
          })
        : await gh(`/repos/${REPO}/issues`, token, {
              method: "POST",
              body: JSON.stringify({ title: ISSUE_TITLE, body }),
          });
    if (!res.ok) {
        console.error(`could not file the failure issue: HTTP ${res.status} ${await res.text()}`);
    }
    return { dispatched: false, status };
}

export default {
    scheduled(event, env, ctx) {
        ctx.waitUntil(run(env, { slot: new Date(event.scheduledTime) }));
    },
};
