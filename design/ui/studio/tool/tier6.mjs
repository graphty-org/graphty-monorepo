// What a tier 6 study session adds to real.mjs: the assistant experiment on with nothing in the page
// address, Gemini with the real key added on the way out of the browser, a request cap shared by
// every session, and a check that the key never reached a session's folder.
import { appendFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseEnv } from "node:util";

export const TIER6_CAP = 5000;
// the criteria's round plan: at most 4 participants live at once, each under about 40 calls
export const TIER6_LIVE = 4;
export const TIER6_SESSION_CALLS = 40;
export const GEMINI_ROUTE = "https://generativelanguage.googleapis.com/**";

// The browser's own report of a cross-origin call it refused (a remote service that answers a refused
// key with no CORS header): no reader sees it, only the app's words for the failure, so the tool keeps
// it in the session's log and out of what a participant reads.
export const browserNoise = (line) =>
    /^console error: .*blocked by CORS policy/.test(line) ||
    line === "console error: Failed to load resource: net::ERR_FAILED" ||
    /^failed request: https?:\/\/\S+ \(net::ERR_FAILED\)$/.test(line);
export const usesAssistant = (tier) => tier === "6";

// The gate's cap for a session of this tier. A session never takes a warm browser and a plain GPU
// command may take 8 slots, so nothing else holds the round to the criteria's 4. BROWSER_SLOTS wins.
export const sessionSlots = (tier, env) =>
    usesAssistant(tier) ? { BROWSER_SLOTS: env.BROWSER_SLOTS || String(TIER6_LIVE) } : {};

// What the session's server answers at this path instead of a file in the build, or null. It names
// no site, so the app stays "unknown" and the header shows no site chip.
export const siteFile = (tier, pathname) =>
    usesAssistant(tier) && pathname === "/site.json" ? JSON.stringify({ features: ["assistant"] }) : null;

// The one value taken from the .env file, or null. parseEnv, not process.loadEnvFile: the load would
// put every token in process.env, which the browser and every spawned process inherit.
export function geminiKey(envFile) {
    try {
        return parseEnv(readFileSync(envFile, "utf8")).GOOGLE_API_KEY || null;
    } catch {
        return null;
    }
}

export const countFileOf = (main, tier) =>
    process.env.REAL_GEMINI_COUNT || join(main, `tmp/design-studio/tier${tier}/gemini-requests.count`);

export const capLine = (file, cap = TIER6_CAP) =>
    `the tier's cap of ${cap} Gemini requests is reached (${file}): further calls are refused`;

const requestCount = (file) => {
    try {
        return statSync(file).size;
    } catch {
        return 0;
    }
};

// Why the calls left cannot carry a round of this many sessions, or null. A session the cap stops is
// void, so the gate says so before the first one starts.
export function callsShort(file, sessions, cap = TIER6_CAP) {
    const left = cap - requestCount(file);
    const need = sessions * TIER6_SESSION_CALLS;
    return left < need
        ? `${left} of the tier's ${cap} Gemini requests are left and ${sessions} sessions may use ${need} (${file}): a session the cap stops is void`
        : null;
}

// Counts one request: one appended byte, the file's size the count, so sessions side by side share
// it with no read-modify-write. A refused request adds nothing.
// ponytail: two appends racing at the very end can each read the other's byte, so the cap may refuse
// a request or two early; it can never allow one over the cap.
export function takeRequest(file, cap = TIER6_CAP) {
    mkdirSync(dirname(file), { recursive: true });
    if (requestCount(file) >= cap) return { ok: false, count: requestCount(file) };
    appendFileSync(file, "x");
    const count = requestCount(file);
    return { ok: count <= cap, count };
}

// The handler for GEMINI_ROUTE. route.continue keeps the answer streaming; a route.fetch buffer would
// not. @google/genai's web build sends the key in x-goog-api-key, so that header is replaced.
// ponytail: Playwright carries a changed header across redirects, so a redirect from Google to
// another host would take the key with it; the API answers without redirects. A live voice session's
// WebSocket is not routed or counted: its one token comes from auth_tokens, which is.
export function geminiRouter({ key, file, cap = TIER6_CAP, onRefused, log }) {
    return async (route) => {
        const request = route.request();
        // a CORS preflight is the browser's, not a call
        if (request.method() === "OPTIONS") return route.continue();
        const { ok, count } = takeRequest(file, cap);
        if (!ok) {
            onRefused();
            return route.fulfill({
                status: 429,
                contentType: "application/json",
                headers: { "access-control-allow-origin": "*" },
                body: JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } }),
            });
        }
        log(`gemini request ${count}: ${request.method()} ${new URL(request.url()).pathname}`);
        return route.continue({ headers: { ...request.headers(), "x-goog-api-key": key } });
    };
}

// The files under dir, relative to it, whose bytes hold the key.
// ponytail: a literal match only; an encoded copy of the key (base64, URL-escaped) is not seen.
export function scanForKey(dir, key) {
    const needle = Buffer.from(key);
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => join(e.parentPath, e.name))
        .filter((f) => readFileSync(f).includes(needle))
        .map((f) => relative(dir, f));
}
