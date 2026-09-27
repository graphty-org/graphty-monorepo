#!/usr/bin/env node
/**
 * chromatic-capture.mjs -- read-only capture of one Chromatic build's comparison images.
 *
 * tools/chromatic-api.sh reaches Chromatic with an app token, and Chromatic refuses per-story
 * fields to that token ("Cannot access those build fields when authenticating with an app code"),
 * so it can say how many stories changed but not which ones, and cannot fetch their images. A
 * logged-in browser session can. This script loads the build page with the session cookie, saves
 * the page and a JSON list of every image it references (with the image's alt text, which names
 * the story), and downloads the images that match the given story filters.
 *
 * It only READS. It never accepts a snapshot, never approves a build and never writes to
 * Chromatic: accepting baselines is the owner's decision.
 *
 * Needs CHROMATIC_SESSION_COOKIE, from the environment or the repository root .env: the value of
 * the x-chromatic-session-id cookie of a browser logged in to chromatic.com. The cookie is
 * HttpOnly, so copy it from DevTools > Application > Cookies > https://www.chromatic.com. It is a
 * personal login credential: keep it in .env (gitignored), never on a command line. This script
 * never prints it.
 *
 * Usage:
 *   node tools/chromatic-capture.mjs <build-number> [--package <pkg>] [--out <dir>] [story-filter ...]
 *     <build-number>   the number in the build URL (...&number=<n>)
 *     --package <pkg>  graphty-element (default), graphty, compact-mantine, algorithms, layout
 *     --out <dir>      where to write (default tmp/chromatic-diffs)
 *     story-filter     case-insensitive substrings of an image's alt text or URL; none = all images
 *
 * Writes <out>/build-<n>-page.html, <out>/build-<n>-images.json and the matching images.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

/* global document -- read only inside page.evaluate, which runs in the browser */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The Chromatic app id of each package's project (the appId in its build URLs).
const APP_IDS = {
    "graphty-element": "686eda676c08de218a75ecbf",
    graphty: "694181ba2975dc303ae28a04",
    "compact-mantine": "695ef39415fba30dd5979694",
    algorithms: "695ef0ef15fba30dd59781a8",
    layout: "695ef10e57f477d4b28f9d7b",
};

function die(msg) {
    console.error(`tools/chromatic-capture.mjs: ${msg}`);
    process.exit(1);
}

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        package: { type: "string", default: "graphty-element" },
        out: { type: "string", default: "tmp/chromatic-diffs" },
    },
});
const [buildArg, ...filters] = positionals;
const build = Number(buildArg);
if (!Number.isInteger(build) || build <= 0) {
    die("usage: chromatic-capture.mjs <build-number> [--package <pkg>] [--out <dir>] [story-filter ...]");
}
const appId = APP_IDS[values.package];
if (!appId) {
    die(`'${values.package}' has no Chromatic project (one of: ${Object.keys(APP_IDS).join(", ")})`);
}
const wanted = filters.map((s) => s.toLowerCase());
const OUT = values.out;

const COOKIE_HELP =
    "copy the x-chromatic-session-id cookie from a browser logged in to chromatic.com " +
    "(DevTools > Application > Cookies) into CHROMATIC_SESSION_COOKIE in " +
    join(ROOT, ".env");

function sessionCookie() {
    let value = process.env.CHROMATIC_SESSION_COOKIE;
    const envFile = join(ROOT, ".env");
    if (!value && existsSync(envFile)) {
        const line = readFileSync(envFile, "utf8")
            .split("\n")
            .find((l) => l.startsWith("CHROMATIC_SESSION_COOKIE="));
        value = line?.slice("CHROMATIC_SESSION_COOKIE=".length);
    }
    value = value?.trim().replace(/^["']|["']$/g, "");
    if (!value) {
        die(`no CHROMATIC_SESSION_COOKIE: ${COOKIE_HELP}`);
    }
    return value;
}

const cookie = sessionCookie();
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
    const ctx = await browser.newContext();
    await ctx.addCookies([
        {
            name: "x-chromatic-session-id",
            value: cookie,
            domain: ".chromatic.com",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
        },
    ]);
    const page = await ctx.newPage();

    // Check the session before scraping: an expired cookie otherwise yields an empty, confusing
    // scrape. Asking for the project itself also proves the login can see it. Anonymous, Chromatic
    // answers this with the error code UNAUTHENTICATED ("Must login").
    const who = await page.request.post("https://index.chromatic.com/graphql", {
        headers: { "Content-Type": "application/json" },
        data: { query: `{ app(id: "${appId}") { id } }` },
    });
    const whoBody = await who.json().catch(() => null);
    if (!whoBody?.data?.app?.id) {
        const err = whoBody?.errors?.[0];
        if (who.status() === 401 || who.status() === 403 || err?.extensions?.code === "UNAUTHENTICATED") {
            die(`the Chromatic session cookie is expired or invalid: ${COOKIE_HELP}`);
        }
        die(`Chromatic refused the ${values.package} project (HTTP ${who.status()}): ${err?.message ?? "no data"}`);
    }

    const url = `https://www.chromatic.com/build?appId=${appId}&number=${build}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (/\/(login|signin|start)\b/.test(new URL(page.url()).pathname)) {
        die(`Chromatic redirected to its login page, so the session cookie has expired: ${COOKIE_HELP}`);
    }
    writeFileSync(join(OUT, `build-${build}-page.html`), await page.content());

    // Every image the page references, with the alt text that names its story. The page's DOM is
    // Chromatic's and can change, so this dumps what is there rather than depending on selectors.
    const shots = await page.evaluate(() =>
        [...document.querySelectorAll("img")]
            .map((i) => ({ src: i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight }))
            .filter((i) => i.src.startsWith("http")),
    );
    writeFileSync(join(OUT, `build-${build}-images.json`), JSON.stringify(shots, null, 2));
    console.error(`${url}: ${shots.length} images, listed in ${join(OUT, `build-${build}-images.json`)}`);

    for (const s of shots) {
        const key = (s.alt || s.src).toLowerCase();
        if (wanted.length > 0 && !wanted.some((w) => key.includes(w))) {
            continue;
        }
        const res = await page.request.get(s.src).catch((e) => {
            console.error(`skip ${s.src.slice(0, 80)}: ${e.message}`);
            return null;
        });
        if (!res?.ok()) {
            continue;
        }
        const name = (s.alt || s.src.split("/").pop()).replace(/[^a-z0-9.-]+/gi, "-").slice(0, 80);
        writeFileSync(join(OUT, name), await res.body());
        console.error(`saved ${join(OUT, name)} (${s.w}x${s.h})`);
    }
} finally {
    await browser.close();
}
