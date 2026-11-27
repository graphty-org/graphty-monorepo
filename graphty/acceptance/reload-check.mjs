/**
 * The reload the dry run ends every route with, and the reload sweep runs after every control
 * (reload-sweep.mjs): Node side, driving a Playwright page.
 */
import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";
import { fingerprintChanges, screenFingerprint } from "./screen-fingerprint.mjs";

/**
 * How many page frames in a row a reloaded screen must stay the same, still differing from the
 * screen before, to count as the screen the reload gives back: counted work, never a clock.
 */
const SETTLED = 120;

/**
 * Wait until autosave has kept the open graph's work, or at once with no graph open.
 * @param page the page
 */
export async function keptByAutosave(page) {
    await page.waitForFunction(() => {
        const element = document.querySelector("graphty-element:not([data-start-page])");
        if (element === null) return true;
        const status = element.autosaver?.status;
        return status?.state === "saved" && status.entry !== null;
    });
}

/**
 * The screen once it has stopped changing for SETTLED frames in a row: what a click opened (a panel
 * loaded on first use) is in it.
 * @param page the page
 * @returns its fingerprint
 */
async function settled(page) {
    let last = "";
    let still = 0;
    for (;;) {
        const now = await page.evaluate(screenFingerprint);
        still = JSON.stringify(now) === last ? still + 1 : 0;
        last = JSON.stringify(now);
        if (still >= SETTLED) return now;
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    }
}

/**
 * The reload every route ends with: the screen the route left (screen-fingerprint.mjs), autosave
 * waited for, this tab's session storage and window.name emptied as Safari empties them when it ends
 * a background tab, the page loaded again, and the same screen waited for: nothing the reader saw or
 * picked may go missing or change (issue #9973). Compared after every frame until it matches, or until it
 * has stayed the same, and different, for SETTLED frames.
 * @param page the page
 * @param allowed fingerprint entries a route's open `reloadLoses` issues excuse
 */
export async function reloadKeepsScreen(page, allowed = []) {
    const before = await settled(page);
    await keptByAutosave(page);
    const hadGraph = await page.evaluate(
        () => document.querySelector("graphty-element:not([data-start-page])") !== null,
    );
    await page.evaluate(() => {
        sessionStorage.clear();
        window.name = "";
    });
    await page.reload();
    // The work is back once the graph that was open is open again and autosave has kept it.
    if (hadGraph)
        await page.waitForFunction(() => {
            const status = document.querySelector("graphty-element:not([data-start-page])")?.autosaver?.status;
            return status?.state === "saved" && status.entry !== null;
        });
    const guard = AbortSignal.timeout(WAIT_GUARD_MS);
    let last = "";
    let still = 0;
    for (;;) {
        const now = await page.evaluate(screenFingerprint);
        const changes = fingerprintChanges(before, now, allowed);
        if (changes.missing.length === 0 && changes.appeared.length === 0) return;
        // A screen that has stopped changing for SETTLED frames is the screen the reload gives back.
        still = JSON.stringify(now) === last ? still + 1 : 0;
        last = JSON.stringify(now);
        if (still >= SETTLED || guard.aborted)
            throw new Error(
                `the reload changed the screen: gone ${JSON.stringify(changes.missing)}, new ${JSON.stringify(changes.appeared)}`,
            );
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    }
}
