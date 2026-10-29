// A Cloudflare Worker that starts graphty-monorepo's full run on a schedule. GitHub's own cron creates
// this repository's scheduled runs hours late or not at all, so release.yml has no schedule of its
// own: this Worker dispatches it (with `scheduled: true` and `mode: full`) at 00:00, 06:00, 12:00 and 18:00 UTC,
// authenticated as a GitHub App, so there is no token to expire. When it cannot start a train it opens
// (or comments on) one issue. Once a day it also checks that the repository holds exactly one write deploy
// key, the release key, and files a priority:critical issue otherwise. See README.md for setup.
//
// Secrets (wrangler secret put): APP_ID, INSTALLATION_ID, PRIVATE_KEY (PKCS#8 PEM).

const API = "https://api.github.com";
const REPO = "graphty-org/graphty-monorepo";
export const ISSUE_TITLE = "Release scheduler could not start a release train";
// The one write deploy key the repository may hold: "release deploy key 2026-10-25", the key in
// environment release's RELEASE_DEPLOY_KEY that release.yml and promote.yml push with.
export const RELEASE_DEPLOY_KEY_ID = 167635448;
export const DEPLOY_KEY_ISSUE_TITLE = "graphty-monorepo's write deploy keys are not exactly the release key";
const ISSUE_LABELS = ["bug", "priority:critical", "effort:medium"];
// The daily deploy key check's cron, in wrangler.toml beside the release slots.
export const KEY_CHECK_CRON = "17 3 * * *";
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

const client =
    (doFetch) =>
    (path, token, init = {}) =>
        doFetch(`${API}${path}`, {
            ...init,
            headers: { ...HEADERS, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

/**
 * Exchanges the App's JWT for an installation token.
 * @param env the Worker's secrets: APP_ID, INSTALLATION_ID, PRIVATE_KEY
 * @param [doFetch] the fetch to call GitHub with
 * @returns the installation token
 */
export async function installationToken(env, doFetch = fetch) {
    const jwt = await buildJwt(env.APP_ID, env.PRIVATE_KEY);
    const res = await client(doFetch)(`/app/installations/${env.INSTALLATION_ID}/access_tokens`, jwt, {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(`token exchange returned HTTP ${res.status}: ${await res.text()}`);
    }
    return (await res.json()).token;
}

/**
 * Whether a commit is on master's history (the ancestry check; needs the App's Contents: read).
 * GitHub's compare of master...sha says `behind` or `identical` exactly when sha is an ancestor of master.
 * @param sha the commit to check
 * @param token an installation token
 * @param [doFetch] the fetch to call GitHub with
 * @returns true when sha is master or one of its ancestors; false for any other commit or an unknown one
 */
export async function isOnMaster(sha, token, doFetch = fetch) {
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
        return false;
    }
    const res = await client(doFetch)(`/repos/${REPO}/compare/master...${sha}`, token);
    if (res.status === 404) {
        return false;
    }
    if (!res.ok) {
        throw new Error(`compare master...${sha} returned HTTP ${res.status}: ${await res.text()}`);
    }
    const { status } = await res.json();
    return status === "behind" || status === "identical";
}

// Comments on the open issue with this title, or opens one (with `labels`) when none is open.
async function fileIssue(gh, token, { title, body, labels }) {
    const q = encodeURIComponent(`repo:${REPO} is:issue is:open in:title "${title}"`);
    const search = await gh(`/search/issues?q=${q}`, token);
    const open = search.ok ? (await search.json()).items.find((i) => i.title === title) : undefined;
    const res = open
        ? await gh(`/repos/${REPO}/issues/${open.number}/comments`, token, {
              method: "POST",
              body: JSON.stringify({ body }),
          })
        : await gh(`/repos/${REPO}/issues`, token, {
              method: "POST",
              body: JSON.stringify(labels ? { title, body, labels } : { title, body }),
          });
    if (!res.ok) {
        console.error(`could not file issue "${title}": HTTP ${res.status} ${await res.text()}`);
    }
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
    const gh = client(doFetch);

    // No installation token means no way to file an issue: fail loudly in the Worker's logs.
    let token;
    try {
        token = await installationToken(env, doFetch);
    } catch (error) {
        console.error(`RELEASE SCHEDULER FAILED for slot ${slot.toISOString()}, no train started: ${error.message}`);
        throw error;
    }

    let status;
    let detail;
    try {
        const res = await gh(`/repos/${REPO}/actions/workflows/release.yml/dispatches`, token, {
            method: "POST",
            body: JSON.stringify({ ref: "master", inputs: { scheduled: "true", mode: "full" } }),
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
    await fileIssue(gh, token, { title: ISSUE_TITLE, body });
    return { dispatched: false, status };
}

// What the daily key check reports: every write key's id, title and creation time, never key material.
const describeKeys = (keys) =>
    keys.length === 0 ? ["(none)"] : keys.map((k) => `- id ${k.id}, "${k.title}", created ${k.created_at}`);

/**
 * The daily deploy key check: master's ruleset lets every write deploy key bypass it, so the repository
 * must hold exactly one, the release key. Files a priority:critical issue when it does not, or when the
 * keys cannot be read (needs the App's Administration: read).
 * @param env the Worker's secrets: APP_ID, INSTALLATION_ID, PRIVATE_KEY
 * @param [options] what tests inject
 * @param [options.fetch] the fetch to call GitHub with (default: the global fetch)
 * @returns `{ ok, writeKeyIds }`; `writeKeyIds` is null when the keys could not be read
 */
export async function checkDeployKeys(env, { fetch: doFetch = fetch } = {}) {
    const gh = client(doFetch);
    const token = await installationToken(env, doFetch);
    const res = await gh(`/repos/${REPO}/keys?per_page=100`, token);
    let lines;
    let writeKeyIds = null;
    if (res.ok) {
        const writeKeys = (await res.json()).filter((k) => !k.read_only);
        writeKeyIds = writeKeys.map((k) => k.id);
        if (writeKeyIds.length === 1 && writeKeyIds[0] === RELEASE_DEPLOY_KEY_ID) {
            return { ok: true, writeKeyIds };
        }
        lines = [
            `graphty-monorepo must hold exactly one write deploy key, the release key (id ${RELEASE_DEPLOY_KEY_ID}).`,
            "Master's ruleset lets every write deploy key bypass it, so any other one can push to master and tags.",
            "",
            "Write deploy keys found:",
            ...describeKeys(writeKeys),
            "",
            "Remove every write key except the release key (Settings > Deploy keys), or restore the release key.",
        ];
    } else {
        lines = [
            `The release scheduler could not read the deploy keys: HTTP ${res.status}.`,
            "The graphty-release-scheduler App needs Administration: read on graphty-monorepo.",
            "",
            "```",
            (await res.text()).slice(0, 2000),
            "```",
        ];
    }
    console.error(`DEPLOY KEY CHECK FAILED: ${lines[0]}`);
    await fileIssue(gh, token, { title: DEPLOY_KEY_ISSUE_TITLE, body: lines.join("\n"), labels: ISSUE_LABELS });
    return { ok: false, writeKeyIds };
}

export default {
    scheduled(event, env, ctx) {
        ctx.waitUntil(
            event.cron === KEY_CHECK_CRON ? checkDeployKeys(env) : run(env, { slot: new Date(event.scheduledTime) }),
        );
    },
};
