/**
 * The loading screen drawn by index.html, in a real page: its log, fold, Reload state and removal.
 * The real file is served under a fake address, with an entry script that plays each scenario.
 */
import { readFileSync } from "node:fs";

import { type Browser, type BrowserContext, chromium, type Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ORIGIN = "https://boot.test/";

let browser: Browser;
let context: BrowserContext;
let page: Page;

/**
 * Serves the app's page to a browser page.
 * @param target - the browser page.
 * @param entry - the entry script's source, a status to answer with, or null to never answer.
 * @param html - the page.
 */
async function serve(target: Page, entry: string | number | null, html = HTML): Promise<void> {
    target.setDefaultTimeout(0);
    await target.route(`${ORIGIN}**`, async (route) => {
        const url = route.request().url();
        if (url === ORIGIN) {
            await route.fulfill({ contentType: "text/html", body: html });
        } else if (!url.includes("/src/main.tsx")) {
            await route.fulfill({ status: 204 });
        } else if (typeof entry === "number") {
            await route.fulfill({ status: entry, body: "gone" });
        } else if (entry !== null) {
            await route.fulfill({ contentType: "text/javascript", body: entry });
        }
    });
}

/**
 * Loads the page without waiting for the entry script.
 * @param target - the browser page.
 */
async function open(target: Page): Promise<void> {
    await target.goto(ORIGIN, { waitUntil: "commit" });
}

const triangle = (): ReturnType<Page["locator"]> => page.getByRole("button", { name: "Loading details" });
const log = (): ReturnType<Page["locator"]> => page.locator("#boot-log");
const reload = (): ReturnType<Page["locator"]> => page.getByRole("button", { name: "Reload" });

/**
 * Waits for the log to say something.
 * @param text - the words.
 */
async function logSays(text: string): Promise<void> {
    await page.waitForFunction(
        (words) => (document.getElementById("boot-log") as HTMLTextAreaElement | null)?.value.includes(words),
        text,
    );
}

beforeAll(async () => {
    browser = await chromium.launch();
});
afterAll(async () => {
    await browser.close();
});
beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
});
afterEach(async () => {
    await context.close();
});

describe("the loading screen's log", () => {
    it("unfolds below the bar and folds again, moving nothing", async () => {
        await serve(page, null);
        await open(page);
        await triangle().waitFor();
        const logoBefore = await page.locator("#boot > svg").boundingBox();
        const barBefore = await page.locator("#boot .bar").boundingBox();
        assert.isTrue(await log().isHidden());

        await triangle().click();

        await log().waitFor();
        await logSays("screen drawn");
        await logSays("Next:");
        assert.strictEqual(await triangle().getAttribute("aria-expanded"), "true");
        assert.deepEqual(await page.locator("#boot > svg").boundingBox(), logoBefore);
        assert.deepEqual(await page.locator("#boot .bar").boundingBox(), barBefore);

        await triangle().click();

        await log().waitFor({ state: "hidden" });
        assert.strictEqual(await triangle().getAttribute("aria-expanded"), "false");
    });

    it("opens with Enter and closes with Space", async () => {
        await serve(page, null);
        await open(page);
        await triangle().waitFor();

        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        await log().waitFor();

        await page.keyboard.press("Space");
        await log().waitFor({ state: "hidden" });
    });

    it("stays open across a reload of the tab, and a new tab starts folded", async () => {
        await serve(page, null);
        await open(page);
        await triangle().click();
        await log().waitFor();

        await page.reload({ waitUntil: "commit" });

        await log().waitFor();
        await logSays("screen drawn");

        const other = await context.newPage();
        await serve(other, null);
        await open(other);
        await other.getByRole("button", { name: "Loading details" }).waitFor();
        assert.isTrue(await other.locator("#boot-log").isHidden());
    });

    it("shows a file that failed to load, without its query string", async () => {
        await serve(page, 404, HTML.replace('src="/src/main.tsx"', 'src="/src/main.tsx?key=abc"'));
        await open(page);

        await reload().waitFor();
        await triangle().click();

        await logSays("ERROR could not load https://boot.test/src/main.tsx");
        const text = await log().inputValue();
        assert.notInclude(text, "abc");
        assert.notInclude(text, "entry script ran");
        assert.notInclude(text, "Next:");
    });

    it("keeps writing while the reader's selection stays put", async () => {
        await serve(page, null);
        await open(page);
        await triangle().click();
        await logSays("screen drawn");
        const box = await log().boundingBox();
        assert.isNotNull(box);
        await page.mouse.move(box.x + 12, box.y + 14);
        await page.mouse.down();
        await page.mouse.move(box.x + 120, box.y + 14);
        await page.mouse.up();
        const selected = (): Promise<string> =>
            log().evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd));
        const before = await selected();
        assert.isNotEmpty(before);
        await page.mouse.click(5, 5);

        await page.evaluate(() => {
            void Promise.reject(new Error("written late"));
        });

        await logSays("written late");
        assert.strictEqual(await selected(), before);
    });

    it("wraps a long failing address instead of cutting it off", async () => {
        const end = `${"a".repeat(300)}.js`;
        await serve(page, 404, HTML.replace('src="/src/main.tsx"', `src="/src/main.tsx/${end}"`));
        await open(page);

        await triangle().click();
        await logSays(`ERROR could not load https://boot.test/src/main.tsx/${end}`);

        const fits = await log().evaluate((el) => el.scrollWidth <= el.clientWidth);
        assert.isTrue(fits);
    });

    it("charges the wait for the entry's imports to the entry's line", async () => {
        await serve(page, 'import "/dep.js";');
        await page.route(`${ORIGIN}dep.js`, async (route) => {
            await page.waitForFunction(() =>
                (document.getElementById("boot-log") as HTMLTextAreaElement | null)?.value.includes("screen drawn"),
            );
            await route.fulfill({ contentType: "text/javascript", body: "" });
        });
        await open(page);

        await logSays("requests:");

        const lines = (await log().inputValue()).split("\n");
        const at = lines.findIndex((l) => l.includes("entry script loaded"));
        const parse = (l: string): number[] => (/^\s*(\d+)\s+\+\s*(\d+)/.exec(l) ?? []).slice(1).map(Number);
        const [when, took] = parse(lines[at]);
        const [previous] = parse(lines[at - 1]);
        assert.approximately(took, when - previous, 1);
        const depEnd = await page.evaluate(
            () =>
                (performance.getEntriesByName("https://boot.test/dep.js")[0] as PerformanceResourceTiming).responseEnd,
        );
        assert.isAtLeast(when, Math.round(depEnd) - 1);
    });

    it("keeps credentials and query strings out", async () => {
        const secret = [
            "Authorization: Bearer SECRET",
            "authorization=Basic SECRET",
            "access_token=SECRET",
            "id_token: SECRET",
            '{"token":"SECRET"}',
            "Bearer SECRET",
            "GET /api/graph?sig=SECRET",
            "dev.ato.ms/a?code=SECRET",
            "/data?key=SECRET",
            "https://h/p?x=1)SECRET",
            "https://user:SECRET@h/p",
            "https://h/p#SECRET",
        ];
        const script = secret.map((s) => `Promise.reject(new Error(${JSON.stringify(s)}));`).join("");
        await serve(page, `${script}Promise.reject(new Error("END"));`);
        await open(page);

        await logSays("END");

        const text = await log().inputValue();
        assert.notInclude(text, "SECRET");
        assert.include(text, "GET /api/graph");
    });

    it("keeps the newest lines when there are too many, and marks the gap", async () => {
        const say = (line: string): string =>
            `document.dispatchEvent(new CustomEvent("graphty-boot", { detail: { line: ${line} } }));`;
        await serve(page, `for (let i = 0; i < 600; i++) { ${say('"flood " + i')} } ${say('"the last line"')}`);
        await open(page);

        await logSays("the last line");

        const text = await log().inputValue();
        assert.include(text, "screen drawn");
        assert.include(text, "lines removed here");
        assert.isAtMost(text.split("\n").length, 520);
    });

    it("shows an exception thrown as the app starts, with Reload", async () => {
        await serve(page, 'throw new Error("probe");');
        await open(page);

        await reload().waitFor();
        await triangle().click();

        await logSays("probe");
    });
});

describe("when the loading screen goes", () => {
    const COMMIT = 'document.getElementById("root").append(document.createElement("div"));';
    const HOLD = 'document.dispatchEvent(new CustomEvent("graphty-boot", { detail: { hold: true } }));';

    it("goes at the first commit when nothing holds it", async () => {
        await serve(page, COMMIT);
        await open(page);

        await page.waitForFunction(() => document.getElementById("boot") === null);
    });

    it("goes at a reopened project's first frame while held", async () => {
        await serve(page, `${HOLD}${COMMIT}document.dispatchEvent(new Event("graph-first-frame"));`);
        await open(page);

        await page.waitForFunction(() => document.getElementById("boot") === null);
    });

    it("is not turned to Reload by a browser notice that names the page", async () => {
        const LOOP = `
            const box = document.body.appendChild(document.createElement("div"));
            let wide = 10;
            new ResizeObserver(() => { wide += 10; box.style.width = wide + "px"; }).observe(box);
        `;
        await serve(page, HOLD + COMMIT + LOOP);
        await open(page);

        await logSays("ResizeObserver");

        assert.isFalse(await reload().isVisible());
    });

    it("stays while held, turns to Reload on a rejection, and goes when told", async () => {
        await serve(page, `${HOLD}${COMMIT}Promise.reject(new Error("chunk gone"));`);
        await open(page);

        await reload().waitFor();
        await triangle().click();
        await logSays("chunk gone");

        await page.evaluate(() => {
            document.dispatchEvent(new CustomEvent("graphty-boot", { detail: { done: true } }));
        });
        await page.waitForFunction(() => document.getElementById("boot") === null);
    });
});
