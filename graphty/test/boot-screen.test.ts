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
        await serve(page, 404, HTML.replace('src="/src/main.tsx"', 'src="/src/main.tsx?token=abc"'));
        await open(page);

        await reload().waitFor();
        await triangle().click();

        await logSays("ERROR could not load https://boot.test/src/main.tsx");
        const text = await log().inputValue();
        assert.notInclude(text, "abc");
        assert.notInclude(text.split("Next:")[0], "entry script ran");
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
