// Checks https://graphty.app links (one per line on stdin) against canary.graphty.app, which
// master deploys first. A path canary does not serve but the newest nightly does is "pending
// promotion" (canary is behind, or the page was moved since nightly), never a failure; a path
// neither serves is dead.
//
// Usage: lychee --dump ... | node tools/check-graphty-links.mjs
// LINKS_CANARY_URL and LINKS_NIGHTLY_URL override the two sites (a test's local server).
// Run by tools/check-links.sh (its network form and --external).
import { pathToFileURL } from "node:url";

// lychee.toml's accept list: a bot wall or rate limit is "unknown", not dead
const isUp = (status) => (status >= 100 && status < 300) || status === 403 || status === 429;

async function serves(base, url) {
    const u = new URL(url);
    try {
        const res = await fetch(new URL(u.pathname + u.search, base), { redirect: "follow" });
        await res.body?.cancel();
        return isUp(res.status);
    } catch {
        return false;
    }
}

/**
 * Sorts graphty.app links by which site serves their path.
 * @param urls https://graphty.app links
 * @param sites the two base URLs
 * @param sites.canary canary.graphty.app or a stand-in
 * @param sites.nightly nightly.graphty.app or a stand-in
 * @returns `ok` (on canary), `pending` (on nightly only) and `dead` (on neither)
 */
export async function checkGraphtyLinks(urls, { canary, nightly }) {
    const result = { ok: [], pending: [], dead: [] };
    const unique = [...new Set(urls)];
    // ponytail: fixed batches of 16 (lychee.toml's max_concurrency), a pool if it ever matters
    for (let i = 0; i < unique.length; i += 16) {
        await Promise.all(
            unique.slice(i, i + 16).map(async (url) => {
                if (await serves(canary, url)) result.ok.push(url);
                else if (await serves(nightly, url)) result.pending.push(url);
                else result.dead.push(url);
            }),
        );
    }
    return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const canary = process.env.LINKS_CANARY_URL || "https://canary.graphty.app";
    const nightly = process.env.LINKS_NIGHTLY_URL || "https://nightly.graphty.app";
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const urls = input.split("\n").filter((l) => l.startsWith("https://graphty.app"));
    const { ok, pending, dead } = await checkGraphtyLinks(urls, { canary, nightly });
    for (const url of pending) console.log(`pending promotion: ${url} (on ${nightly}, not yet on ${canary})`);
    for (const url of dead) console.log(`dead: ${url} (on neither ${canary} nor ${nightly})`);
    console.log(`graphty.app links: ${ok.length} ok, ${pending.length} pending promotion, ${dead.length} dead`);
    process.exit(dead.length ? 1 : 0);
}
