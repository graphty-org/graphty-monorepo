#!/usr/bin/env node
// Checks that the AI provider pages the graphty app links to (where a reader makes a key, where
// they add credit) still land where they did when the link was chosen. The links come from the
// table the app itself reads, graphty/src/workspace/assistant/providerPages.ts, so this check
// cannot drift from the UI.
//
// For each link it follows redirects by hand while they stay on the link's own host, and compares
// where it lands -- the first page on another host, or the last on its own -- by host and path
// (query left out) with the landing recorded below. Pages behind a login land on the provider's
// sign-in page; that is recorded as expected, and the sign-in flow after it is not followed. A 404, 410 or 5xx, a landing somewhere else, or a link with no
// recorded landing fails. Each link also names an official doc page that points readers at it;
// a doc page that no longer contains the link means the provider moved it.
//
// OpenAI's platform answers every request from a datacenter with a Cloudflare challenge (403,
// cf-mitigated: challenge), so its landing cannot be seen from here; its doc page check is the
// signal for those two links.
//
// Usage: node tools/check-provider-links.mjs [--offline]
//   --offline  only checks that every link in the table has a recorded landing (no network)
// Prints a Markdown report of failures and exits 1 on any. Run weekly by
// .github/workflows/links-weekly.yml, never by a pull request: another site's outage is not
// something a contributor did.

import { PROVIDER_PAGES } from "../graphty/src/workspace/assistant/providerPages.ts";

/** The sign-in page Google's login-gated pages redirect to. */
const GOOGLE_SIGN_IN = "accounts.google.com/ServiceLogin";
/** A Cloudflare bot challenge: the landing cannot be seen, only that the host still answers. */
const CHALLENGE = "challenge";

/** Every link's expected landing (host + path, or CHALLENGE) and a doc page that names it. */
export const LANDINGS = {
    "https://aistudio.google.com/apikey": {
        lands: GOOGLE_SIGN_IN,
        doc: "https://ai.google.dev/gemini-api/docs/api-key",
    },
    "https://aistudio.google.com/billing": {
        lands: GOOGLE_SIGN_IN,
        doc: "https://ai.google.dev/gemini-api/docs/billing",
    },
    "https://platform.openai.com/api-keys": {
        lands: CHALLENGE,
        doc: "https://developers.openai.com/api/docs/quickstart",
    },
    "https://platform.openai.com/settings/organization/billing": {
        lands: CHALLENGE,
        doc: "https://developers.openai.com/api/docs/guides/error-codes",
    },
    "https://platform.claude.com/settings/keys": {
        lands: "platform.claude.com/settings/keys",
        doc: "https://platform.claude.com/docs/en/api/overview",
    },
    "https://platform.claude.com/settings/billing": {
        lands: "platform.claude.com/settings/billing",
        doc: "https://platform.claude.com/docs/en/api/rate-limits",
    },
};

const MAX_HOPS = 10;
const HEADERS = { "user-agent": "Mozilla/5.0 (graphty link check)" };

/**
 * Every link the app shows.
 * @returns the URLs, with what each is for.
 */
export function tableLinks() {
    return Object.entries(PROVIDER_PAGES).flatMap(([provider, pages]) =>
        Object.entries(pages ?? {}).map(([kind, url]) => ({ provider, kind, url })),
    );
}

/**
 * Links shown without a recorded landing, and landings for links no longer shown.
 * @returns failure lines.
 */
export function unrecorded() {
    const shown = new Set(tableLinks().map((link) => link.url));
    return [
        ...[...shown].filter((url) => !(url in LANDINGS)).map((url) => `${url}: no landing recorded in this script`),
        ...Object.keys(LANDINGS)
            .filter((url) => !shown.has(url))
            .map((url) => `${url}: recorded here but no longer in providerPages.ts; remove it`),
    ];
}

/**
 * Whether a doc page links a URL: in full, or by its path when the doc is on the same host.
 * @param text - the doc page.
 * @param doc - its URL.
 * @param url - the link.
 * @returns true when it does.
 */
export function docLinks(text, doc, url) {
    const link = new URL(url);
    return text.includes(url) || (new URL(doc).host === link.host && text.includes(`"${link.pathname}"`));
}

/**
 * Where a URL lands: its last status and host + path, following redirects by hand on its own host.
 * @param url - the link.
 * @returns the landing.
 */
async function landing(url) {
    let at = url;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
        const response = await fetch(at, { redirect: "manual", headers: HEADERS });
        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location !== null) {
            const next = new URL(location, at);
            if (next.host !== new URL(url).host) {
                return { status: response.status, lands: `${next.host}${next.pathname}` };
            }
            at = next.href;
            continue;
        }
        if (response.status === 403 && response.headers.get("cf-mitigated") === CHALLENGE) {
            return { status: response.status, lands: CHALLENGE };
        }
        const { host, pathname } = new URL(at);
        return { status: response.status, lands: `${host}${pathname}` };
    }
    return { status: 0, lands: `more than ${MAX_HOPS} redirects` };
}

/**
 * One link's failures.
 * @param url - the link.
 * @returns failure lines.
 */
async function check(url) {
    const { lands, doc } = LANDINGS[url];
    const failures = [];
    try {
        const got = await landing(url);
        if (got.status === 404 || got.status === 410 || got.status >= 500 || got.status === 0) {
            failures.push(`${url}: answered ${got.status} at ${got.lands}`);
        } else if (got.lands !== lands) {
            failures.push(`${url}: now lands on ${got.lands} (status ${got.status}), recorded ${lands}`);
        }
    } catch (error) {
        failures.push(`${url}: request failed (${error.message})`);
    }
    try {
        const page = await fetch(doc, { headers: HEADERS });
        const text = await page.text();
        if (!page.ok || !docLinks(text, page.url, url)) {
            failures.push(`${url}: the provider's doc ${doc} (status ${page.status}) no longer links it`);
        }
    } catch (error) {
        failures.push(`${url}: could not read the provider's doc ${doc} (${error.message})`);
    }
    return failures;
}

/**
 * Runs the check.
 * @param offline - only the table-against-landings check.
 * @returns the exit code.
 */
async function main(offline) {
    const failures = [...unrecorded()];
    if (!offline) {
        for (const { url } of tableLinks()) {
            if (url in LANDINGS) {
                failures.push(...(await check(url)));
            }
        }
    }
    if (failures.length === 0) {
        console.log(`AI provider links: all ${tableLinks().length} land where recorded.`);
        return 0;
    }
    console.log("## AI provider links that moved\n");
    console.log("The graphty app links to these pages (graphty/src/workspace/assistant/providerPages.ts).");
    console.log("Find the provider's current page, update the table and the landing in");
    console.log("tools/check-provider-links.mjs.\n");
    for (const line of failures) {
        console.log(`- ${line}`);
    }
    return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    process.exitCode = await main(process.argv.includes("--offline"));
}
