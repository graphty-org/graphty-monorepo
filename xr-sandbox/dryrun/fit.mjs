// The text fit check, shared by run.mjs, journey.mjs and every checks/*.mjs: the page measures every
// line of text it draws in 3D while the run drives it (src/framework/text-audit.ts) and fails on text
// wider or taller than its box, clipped, cut short, or under the legibility floor. While it watches,
// each new state of every text surface is saved twice: the texture itself (tex-*.png) and the
// emulated headset's view at that moment (view-*.png).
//
//   const fit = await watchFit(page, join(args.out, "fit", `${profile}--${preset}`));
//   ... the run ...
//   check("textFits", ...(await fit.stop()));

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const safe = (s) => s.replace(/[^\w.-]+/g, "_").slice(0, 80);

/**
 * Start the page's fit audit and save captures as they come.
 * @param page - a Playwright page with the sandbox loaded and the session entered
 * @param dir - where to save the captures
 * @returns stop(): the check's pass flag and detail
 */
export async function watchFit(page, dir) {
    mkdirSync(dir, { recursive: true });
    await page.evaluate(() => globalThis.__sandbox.fitStart());
    let busy = false;
    let views = 0;
    const drain = async () => {
        if (busy) {
            return;
        }
        busy = true;
        try {
            const caps = await page.evaluate(() => globalThis.__sandbox.fitCaptures());
            for (const c of caps) {
                const stem = `${safe(c.surface)}-${c.n}`;
                writeFileSync(join(dir, `tex-${stem}.png`), Buffer.from(c.png.split(",")[1], "base64"));
                writeFileSync(join(dir, `tex-${stem}.txt`), c.texts.join("\n"));
            }
            if (caps.length && views < 60) {
                views++;
                await page.screenshot({ path: join(dir, `view-${safe(caps[0].surface)}-${caps[0].n}.png`) });
            }
        } catch {
            // the page is navigating or closed; the final drain reports what there is
        } finally {
            busy = false;
        }
    };
    const timer = setInterval(drain, 400);
    return {
        async stop() {
            clearInterval(timer);
            while (busy) {
                await new Promise((r) => setTimeout(r, 20));
            }
            await drain();
            const report = await page.evaluate(() => globalThis.__sandbox.fitReport());
            writeFileSync(join(dir, "fit.json"), JSON.stringify(report, null, 2));
            return [report.issues.length === 0, { rule: report.rule, lines: report.lines, issues: report.issues }];
        },
    };
}

/**
 * Run the fit check on every page a script opens: each browser context gets a watcher once its page
 * is in VR, stopped when the context closes. Call it right after launching the browser.
 * @param browser - the Playwright browser
 * @param dir - where to save the captures (one folder per page: <profile>--<preset>--<n>)
 * @returns summary(): the pass flag, the rule, and every problem found (deduplicated), for the report
 */
export function instrumentFit(browser, dir) {
    const runs = [];
    let n = 0;
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...a) => {
        const context = await newContext(...a);
        let watcher = null;
        let poll = null;
        let asking = false;
        context.on("page", (page) => {
            poll = setInterval(async () => {
                if (watcher || asking || page.isClosed()) {
                    return;
                }
                asking = true;
                try {
                    if (await page.evaluate(() => globalThis.__sandbox?.inXR?.() === true)) {
                        const q = new URL(page.url()).searchParams;
                        const label = `${q.get("emulate")}--${q.get("on") ?? q.get("preset")}--${++n}`;
                        watcher = { label, w: null };
                        watcher.w = await watchFit(page, join(dir, safe(label)));
                    }
                } catch {
                    // not loaded yet
                } finally {
                    asking = false;
                }
            }, 300);
        });
        const close = context.close.bind(context);
        context.close = async (...b) => {
            clearInterval(poll);
            if (watcher?.w) {
                try {
                    const [pass, detail] = await watcher.w.stop();
                    runs.push({ label: watcher.label, pass, ...detail });
                } catch (e) {
                    runs.push({ label: watcher.label, pass: false, issues: [], error: String(e).slice(0, 200) });
                }
            }
            return close(...b);
        };
        return context;
    };
    return {
        summary() {
            const seen = new Map();
            for (const r of runs) {
                for (const i of r.issues) {
                    const k = `${i.surface}|${i.control}|${i.text}|${i.problem}`;
                    if (!seen.has(k)) {
                        seen.set(k, { ...i, run: r.label });
                    }
                }
            }
            const issues = [...seen.values()];
            const pass = runs.length > 0 && runs.every((r) => !r.error) && issues.length === 0;
            const surfaces = new Set(issues.map((i) => i.surface));
            console.log(
                `${pass ? "PASS" : "FAIL"} text fit: ${runs.length} pages, ${runs.reduce((a, r) => a + (r.lines ?? 0), 0)} lines` +
                    (issues.length
                        ? `, ${issues.length} problems on ${surfaces.size} surfaces (${[...surfaces].join(", ")})`
                        : ""),
            );
            return { pass, rule: runs[0]?.rule, pages: runs.map((r) => r.label), issues };
        },
    };
}
