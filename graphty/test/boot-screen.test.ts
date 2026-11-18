/**
 * The loading screen drawn by index.html, in a real page: its log, fold, Reload state and removal.
 * The real file is served under a fake address, with an entry script that plays each scenario.
 */
import { readFileSync } from "node:fs";

import { type Browser, type BrowserContext, chromium, type Page, webkit } from "playwright";
import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ORIGIN = "https://boot.test/";
// CI installs Chromium only; BOOT_SCREEN_BROWSER=webkit runs the same tests in Safari's engine.
const WEBKIT = process.env.BOOT_SCREEN_BROWSER === "webkit";

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
const step = (name: string): ReturnType<Page["locator"]> => page.locator("#boot-log .step", { hasText: name });
const copy = (): ReturnType<Page["locator"]> => page.locator("#boot-log .log-copy");
const say = (detail: Record<string, unknown>): Promise<void> =>
    page.evaluate((d) => {
        document.dispatchEvent(new CustomEvent("graphty-boot", { detail: d }));
    }, detail);
const logText = async (): Promise<string> => (await log().textContent()) ?? "";
const reload = (): ReturnType<Page["locator"]> => page.getByRole("button", { name: "Reload" });

const color = (target: ReturnType<Page["locator"]>): Promise<string> =>
    target.evaluate((el) => getComputedStyle(el).color);
/**
 * How much of its track a bar's fill covers, as the reader sees it.
 * @param meter - the bar.
 * @returns between 0 and 1.
 */
const filled = (meter: ReturnType<Page["locator"]>): Promise<number> =>
    meter.evaluate((el) => {
        const fill = el.querySelector(".fill");
        return fill ? fill.getBoundingClientRect().width / el.getBoundingClientRect().width : -1;
    });
/**
 * Waits until a bar's fill covers a share of its track, once its width has stopped sliding there.
 * @param meter - the bar.
 * @param share - between 0 and 1.
 */
async function fillsTo(meter: ReturnType<Page["locator"]>, share: number): Promise<void> {
    const el = await meter.elementHandle();
    await page.waitForFunction(
        ([bar, want]) => {
            const fill = bar?.querySelector(".fill");
            return Boolean(
                bar &&
                fill &&
                Math.abs(fill.getBoundingClientRect().width / bar.getBoundingClientRect().width - want) < 0.02,
            );
        },
        [el, share] as const,
    );
}

const selection = (): Promise<string> => page.evaluate(() => getSelection()?.toString() ?? "");

/**
 * Drags the mouse across the middle of something, selecting its text.
 * @param target - what to drag across.
 */
async function dragAcross(target: ReturnType<Page["locator"]>): Promise<void> {
    const box = await target.boundingBox();
    assert.isNotNull(box);
    await page.mouse.move(box.x + 1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
    await page.mouse.up();
}

/**
 * Waits for the log to say something.
 * @param text - the words.
 */
async function logSays(text: string): Promise<void> {
    await page.waitForFunction((words) => document.getElementById("boot-log")?.textContent.includes(words), text);
}

beforeAll(async () => {
    browser = await (WEBKIT ? webkit : chromium).launch();
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
        await logSays("project opened");
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
        assert.notInclude(await logText(), "abc");
        assert.isTrue(await step("entry script ran").isHidden());
        assert.isTrue(await step("project opened").isHidden());
    });

    it("keeps writing while the reader's selection stays put", async () => {
        await serve(page, null);
        await open(page);
        await triangle().click();
        await logSays("screen drawn");
        await dragAcross(step("screen drawn").locator(".name"));
        const before = await selection();
        assert.isNotEmpty(before);

        await page.evaluate(() => {
            void Promise.reject(new Error("written late"));
        });
        await logSays("written late");

        assert.strictEqual(await selection(), before);
    });

    it("wraps a long failing address instead of cutting it off", async () => {
        const end = `${"a".repeat(300)}.js`;
        await serve(page, 404, HTML.replace('src="/src/main.tsx"', `src="/src/main.tsx/${end}"`));
        await open(page);

        await triangle().click();
        await logSays(`ERROR could not load https://boot.test/src/main.tsx/${end}`);

        const fits = await page.locator("#boot-log ul").evaluate((el) => el.scrollWidth <= el.clientWidth);
        assert.isTrue(fits);
    });

    it("charges the wait for the entry's imports to the entry's step", async () => {
        const consoleLines: string[] = [];
        page.on("console", (message) => consoleLines.push(message.text()));
        await serve(page, 'import "/dep.js";');
        await page.route(`${ORIGIN}dep.js`, async (route) => {
            await page.waitForFunction(() => document.getElementById("boot-log")?.textContent.includes("screen drawn"));
            await route.fulfill({ contentType: "text/javascript", body: "" });
        });
        await open(page);

        await logSays("requests:");

        const steps = consoleLines.filter((l) => /\+\s*\d+\s+\S/.test(l));
        const at = steps.findIndex((l) => l.includes("entry script loaded"));
        const parse = (l: string): number[] => (/\]\s+(\d+)\s+\+\s*(\d+)/.exec(l) ?? []).slice(1).map(Number);
        const [when, took] = parse(steps[at]);
        const [previous] = parse(steps[at - 1]);
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

        const text = await logText();
        assert.notInclude(text, "SECRET");
        assert.include(text, "GET /api/graph");
    });

    it("keeps the newest lines when there are too many, and marks the gap", async () => {
        const line = (words: string): string =>
            `document.dispatchEvent(new CustomEvent("graphty-boot", { detail: { line: ${words} } }));`;
        await serve(page, `for (let i = 0; i < 600; i++) { ${line('"flood " + i')} } ${line('"the last line"')}`);
        await open(page);

        await logSays("the last line");

        assert.include(await logText(), "screen drawn");
        assert.include(await logText(), "lines removed here");
        assert.isAtMost(await page.locator("#boot-log li").count(), 500);
    });

    it("shows an exception thrown as the app starts, with Reload", async () => {
        await serve(page, 'throw new Error("probe");');
        await open(page);

        await reload().waitFor();
        await triangle().click();

        await logSays("probe");
        assert.isTrue(await step("entry script ran").locator(".meter").isVisible());
        assert.strictEqual(await step("entry script ran").getAttribute("class"), "step is-failed");
        assert.strictEqual(await step("entry script loaded").getAttribute("class"), "step is-done");
        assert.strictEqual(await color(step("entry script ran")), "rgb(201, 42, 42)");
        assert.strictEqual(await color(step("entry script loaded")), "rgb(43, 122, 54)");
    });

    it("puts the app's console warnings and errors under their step, yellow and red", async () => {
        if (!WEBKIT) {
            await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        }
        await serve(
            page,
            'console.warn("%s could not be read", "/site.json"); console.error("render went wrong"); ' +
                'document.dispatchEvent(new CustomEvent("graphty-boot", { detail: { hold: true } }));',
        );
        await open(page);
        await triangle().click();
        await logSays("render went wrong");

        const warning = page.locator("#boot-log .warn");
        const error = page.locator("#boot-log .error");
        assert.strictEqual(await warning.textContent(), "WARN /site.json could not be read");
        assert.include(
            await warning.evaluate((el) => el.previousElementSibling?.textContent ?? ""),
            "entry script ran",
        );
        assert.strictEqual(await error.evaluate((el) => el.previousElementSibling?.className), "warn");
        assert.strictEqual(await color(warning), "rgb(138, 90, 0)");
        assert.strictEqual(await color(error), "rgb(201, 42, 42)");
        assert.strictEqual(await color(page.locator("#boot-log .detail").first()), "rgb(95, 102, 122)");
        assert.isFalse(await reload().isVisible());

        await page.emulateMedia({ colorScheme: "dark" });
        assert.strictEqual(await color(warning), "rgb(255, 212, 59)");
        assert.strictEqual(await color(error), "rgb(255, 135, 135)");

        await copy().click();
        await page.getByRole("button", { name: "Copied" }).waitFor();
        if (!WEBKIT) {
            const lines = (await page.evaluate(() => navigator.clipboard.readText())).split("\n");
            const at = lines.findIndex((l) => /^\[\w+\]\s+entry script ran/.test(l));
            assert.strictEqual(lines[at + 1], "    WARN /site.json could not be read");
            assert.strictEqual(lines[at + 2], "    ERROR render went wrong");
        }
    });
});

describe("a step that loads known files", () => {
    const FILES = { "entry script loaded": { "/assets/big.js": 300, "/assets/small.js": 100 } };
    const HTML_WITH_FILES = HTML.replace(
        "</head>",
        `<script type="application/json" id="graphty-boot-files">${JSON.stringify(FILES)}</script>` +
            '<link rel="modulepreload" href="/assets/big.js" /><link rel="modulepreload" href="/assets/small.js" />' +
            "</head>",
    );

    /**
     * A file the test lets through when it says so.
     * @returns the gate: open lets the file arrive.
     */
    function gate(): { open: () => void; shut: Promise<void> } {
        let open = (): void => undefined;
        const shut = new Promise<void>((resolve) => {
            open = resolve;
        });
        return { open, shut };
    }

    it("fills its bar by the share of its files that has arrived, by size", async () => {
        if (!WEBKIT) {
            await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        }
        const gates: Record<string, ReturnType<typeof gate>> = {
            "/assets/big.js": gate(),
            "/assets/small.js": gate(),
        };
        page.setDefaultTimeout(0);
        await page.route(`${ORIGIN}**`, async (route) => {
            const path = new URL(route.request().url()).pathname;
            if (path === "/") {
                await route.fulfill({ contentType: "text/html", body: HTML_WITH_FILES });
            } else if (path in gates) {
                await gates[path].shut;
                await route.fulfill({ contentType: "text/javascript", body: "export {};" });
            }
            // The entry script never answers.
        });
        await open(page);
        await triangle().click();
        const entry = step("entry script loaded");
        const time = entry.locator(".time");
        await logSays("0%");
        assert.strictEqual(await filled(entry.locator(".meter")), 0);

        gates["/assets/small.js"].open();

        await page.waitForFunction(() => document.getElementById("boot-log")?.textContent.includes("25%"));
        await fillsTo(entry.locator(".meter"), 0.25);
        assert.match((await time.textContent()) ?? "", /^25%\s/);
        // The bar under the logo counts the finished steps and a quarter of this one: 2.25 of 10.
        await fillsTo(page.locator("#boot .bar"), 0.225);
        await copy().click();
        await page.getByRole("button", { name: "Copied" }).waitFor();
        if (!WEBKIT) {
            const copied = await page.evaluate(() => navigator.clipboard.readText());
            assert.match(copied, /^\[running\]\s+entry script loaded {2}\S+ m?s {2}25% \(1 of 2 files\)$/m);
        }

        gates["/assets/big.js"].open();

        await page.waitForFunction(() => document.getElementById("boot-log")?.textContent.includes("100%"));
        await fillsTo(entry.locator(".meter"), 1);

        await say({ line: "entry script loaded" });

        await page.locator("#boot-log .is-done", { hasText: "entry script loaded" }).waitFor();
        assert.notInclude((await time.textContent()) ?? "", "%");
        await fillsTo(entry.locator(".meter"), 1);
    });
});

describe("on a short phone screen", () => {
    it("opens scrolled to the error", async () => {
        await page.setViewportSize({ width: 375, height: 500 });
        await serve(page, 'throw new Error("probe");');
        await open(page);
        await reload().waitFor();

        await triangle().click();
        await logSays("probe");

        const seen = await page.evaluate(() => {
            const list = document.querySelector("#boot-log ul")?.getBoundingClientRect();
            const error = document.querySelector("#boot-log .error")?.getBoundingClientRect();
            return Boolean(list && error && error.top >= list.top && error.bottom <= list.bottom);
        });
        assert.isTrue(seen);
    });
});

describe("the steps in the list", () => {
    beforeEach(async () => {
        if (!WEBKIT) {
            await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        }
        await serve(page, null);
        await open(page);
        await triangle().click();
        await logSays("screen drawn");
    });

    const clipboard = (): Promise<string> => page.evaluate(() => navigator.clipboard.readText());

    it("shows done, running and not started rows differently", async () => {
        const done = step("screen drawn");
        assert.strictEqual(await done.getAttribute("class"), "step is-done");
        assert.isTrue(await done.locator(".meter").isVisible());
        assert.match((await done.locator(".time").textContent()) ?? "", /^\d/);

        const running = step("entry script loaded");
        assert.strictEqual(await running.getAttribute("class"), "step is-running");
        assert.isTrue(await running.locator(".meter").isVisible());
        // Nothing measures it here, so an empty track rather than an invented amount.
        assert.strictEqual(await filled(running.locator(".meter")), 0);
        assert.notInclude((await running.locator(".time").textContent()) ?? "", "%");
        assert.strictEqual(await filled(done.locator(".meter")), 1);

        const waiting = step("React first commit");
        assert.isTrue(await waiting.locator(".name").isVisible());
        assert.isTrue(await waiting.locator(".meter").isHidden());
        assert.isTrue(await waiting.locator(".time").isHidden());
    });

    it("colors finished rows green, the running row as text and not started rows grey", async () => {
        assert.strictEqual(await color(step("screen drawn")), "rgb(43, 122, 54)");
        assert.strictEqual(await color(step("entry script loaded")), "rgb(42, 48, 69)");
        assert.strictEqual(await color(step("React first commit")), "rgb(95, 102, 122)");

        await page.emulateMedia({ colorScheme: "dark" });

        assert.strictEqual(await color(step("screen drawn")), "rgb(105, 219, 124)");
        assert.strictEqual(await color(step("entry script loaded")), "rgb(213, 218, 230)");
        assert.strictEqual(await color(step("React first commit")), "rgb(138, 146, 166)");
    });

    it("counts a running step up, then stops its timer when it finishes", async () => {
        const time = step("entry script loaded").locator(".time");
        const first = await time.textContent();
        await page.waitForFunction(
            (was) => document.querySelector("#boot-log .is-running .time")?.textContent !== was,
            first,
        );

        await say({ line: "entry script loaded" });
        await page.locator("#boot-log .is-done", { hasText: "entry script loaded" }).waitFor();
        const stopped = await time.textContent();

        const next = await step("entry script ran").locator(".time").textContent();
        await page.waitForFunction(
            (was) => document.querySelector("#boot-log .is-running .time")?.textContent !== was,
            next,
        );
        assert.strictEqual(await time.textContent(), stopped);
    });

    it("puts an error directly after its step, in red", async () => {
        await page.evaluate(() => {
            void Promise.reject(new Error("went wrong"));
        });
        await logSays("went wrong");

        const placed = await page.evaluate(() => {
            const error = document.querySelector("#boot-log .error");
            return {
                before: error?.previousElementSibling?.textContent ?? "",
                color: error ? getComputedStyle(error).color : "",
            };
        });
        assert.include(placed.before, "entry script loaded");
        assert.strictEqual(placed.color, "rgb(201, 42, 42)");
    });

    it("charges an error to the step that started last, when steps overlap", async () => {
        await say({ hold: true });
        await say({ start: "frame code loaded" });

        await page.evaluate(() => {
            void Promise.reject(new Error("frame gone"));
        });
        await logSays("frame gone");
        await reload().waitFor();

        const before = await page.evaluate(
            () => document.querySelector("#boot-log .error")?.previousElementSibling?.textContent ?? "",
        );
        assert.include(before, "frame code loaded");
        assert.strictEqual(await step("frame code loaded").getAttribute("class"), "step is-failed");
        await say({ line: "entry script loaded" });
        assert.strictEqual(await step("entry script loaded").getAttribute("class"), "step is-done");
        assert.strictEqual(await step("frame code loaded").getAttribute("class"), "step is-failed");
    });

    // WebKit lets a page write the clipboard but never read it back.
    it.skipIf(WEBKIT)("copies every line with a click anywhere on the list", async () => {
        await page.evaluate(() => {
            void Promise.reject(new Error("went wrong"));
        });
        await logSays("went wrong");
        await say({ line: "entry script loaded" });

        await step("React first commit").locator(".name").click();
        await page.getByRole("button", { name: "Copied" }).waitFor();

        const lines = (await clipboard()).split("\n");
        const at = lines.findIndex((l) => l.includes("[done]") && l.includes("entry script loaded"));
        assert.match(lines[at + 1], /^\s+ERROR unhandled rejection: went wrong/);
        assert.isTrue(lines.some((l) => /^\[running\]\s+entry script ran/.test(l)));
        assert.isTrue(lines.some((l) => /^\[not started\]\s+project opened/.test(l)));
        assert.isTrue(lines.some((l) => /^HTML received: \w+, discarded tab/.test(l)));
        assert.include(lines, "page: /");
        assert.isTrue(lines.some((l) => l.startsWith("browser: Mozilla")));
        assert.isTrue(lines.some((l) => /^time: \d{4}-/.test(l)));
    });

    // WebKit lets a page write the clipboard but never read it back.
    it.skipIf(WEBKIT)("copies from the keyboard", async () => {
        await page.evaluate(() => {
            void navigator.clipboard.writeText("before");
        });
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        assert.isTrue(await copy().evaluate((el) => el === document.activeElement));

        await page.keyboard.press("Enter");

        await page.getByRole("button", { name: "Copied" }).waitFor();
        assert.include(await clipboard(), "graphty loading log");
    });

    // WebKit lets a page write the clipboard but never read it back.
    it.skipIf(WEBKIT)("does not copy when a drag selects text", async () => {
        await page.evaluate(() => navigator.clipboard.writeText("before"));

        await dragAcross(step("screen drawn").locator(".name"));

        assert.isNotEmpty(await selection());
        assert.strictEqual(await clipboard(), "before");
        assert.strictEqual(await copy().textContent(), "Copy");
    });

    // WebKit lets a page write the clipboard but never read it back.
    it.skipIf(WEBKIT)("keeps credentials out of the copied text", async () => {
        await page.evaluate(() => {
            void Promise.reject(new Error("GET /a?sig=SECRET token=SECRET"));
        });
        await logSays("GET /a");

        await copy().click();
        await page.getByRole("button", { name: "Copied" }).waitFor();

        assert.notInclude(await clipboard(), "SECRET");
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
