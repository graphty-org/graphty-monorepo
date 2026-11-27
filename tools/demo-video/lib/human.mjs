/**
 * The recorder's hand: real Playwright mouse, keyboard and CDP drag input, paced like a calm person
 * (lib/path.mjs has the math). Every action is logged with its epoch-ms time, position and target
 * box, so a clip's json can say where the cursor went and what was clicked.
 *
 * A target is a Playwright Locator, a button's exact accessible name (string), a box
 * {x, y, width, height} or a point {x, y}. Targets must already be on screen: the hand never
 * scrolls the page by itself (use h.scroll, which a viewer can see).
 */
import { basename } from "node:path";

import { installOverlay } from "./overlay.mjs";
import { aimPoint, minJerk, planMove, rng, TYPE, typingDelays } from "./path.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FRAME = 1000 / 60;
const PARK = { x: 1500, y: 640 };
const SCREEN_MIDDLE = { x: 960, y: 540 };
// two page frames, so a box read after it reflects what was drawn
const twoFrames = () =>
    new Promise((ok) => {
        globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(ok));
    });

/**
 * A hand for one clip.
 * @param page - the Playwright page
 * @param seed - the clip id: the same seed moves the same way on every re-record
 * @returns the hand (README.md, "The hand")
 */
export async function createHuman(page, seed) {
    await installOverlay(page);
    const r = rng(seed);
    const events = [];
    const path = [];
    let pos = { x: 960, y: 620 };
    let cdp = null;
    let dragData = null;
    const log = (e) => events.push({ t: Date.now(), ...e });

    // where a target is on screen, once it has stopped moving (a popover sliding in)
    async function boxOf(target) {
        const t = typeof target === "string" ? page.getByRole("button", { name: target, exact: true }) : target;
        if (typeof t?.boundingBox !== "function") {
            return "width" in t
                ? { label: "box", ...t }
                : { x: t.x - 1, y: t.y - 1, width: 2, height: 2, label: "point" };
        }
        await t.waitFor({ state: "visible" });
        let a = await t.boundingBox();
        for (;;) {
            await page.evaluate(twoFrames);
            const b = await t.boundingBox();
            const still = b && a && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.width - b.width) < 0.5;
            a = b;
            if (still) break;
        }
        const vp = page.viewportSize();
        if (a.y < 0 || a.x < 0 || a.y + a.height > vp.height || a.x + a.width > vp.width)
            throw new Error(`${t} is not fully on screen (${JSON.stringify(a)}): scroll to it with h.scroll first`);
        // inside a scrolled list, a row out of the list's view has a box on screen but is hidden:
        // a click there would land on whatever is under it
        if (await t.evaluate(scrolledOut))
            throw new Error(`${t} is scrolled out of its list's view: scroll to it with h.scroll first`);
        return { ...a, label: String(t).replace(/^Locator@/, "") };
    }

    // the screen inset a little: a path stays inside it (the drawn cursor only follows the mouse on screen)
    const screen = () => {
        const vp = page.viewportSize();
        return { x0: 4, y0: 4, x1: vp.width - 4, y1: vp.height - 4 };
    };
    const plan = (from, aim, box, slow) =>
        planMove(from, aim, Math.min(box.width, box.height), r, { slow, bounds: screen() });

    const aimAt = (box) => (box.label === "point" ? { x: box.x + 1, y: box.y + 1 } : aimPoint(box, r));

    // glide the real mouse (or a dragged file) along a planned move, one step per display frame
    async function glide(planned, file = false) {
        const t0 = performance.now();
        for (;;) {
            const t = performance.now() - t0;
            const p = planned.at(t);
            if (file) await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x: p.x, y: p.y, data: dragData });
            else await page.mouse.move(p.x, p.y);
            pos = { x: p.x, y: p.y };
            path.push({ t: Date.now(), x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
            if (t >= planned.ms) return;
            await sleep(Math.max(0, FRAME - ((performance.now() - t0) % FRAME)));
        }
    }

    const h = {
        page,
        random: r,
        events,
        path,
        get at() {
            return { ...pos };
        },

        /**
         * Put the cursor somewhere at once (for setup, before recording); off screen hides it.
         * @param point - where, in page pixels
         */
        async park(point = null) {
            pos = { ...(point ?? PARK) };
            const vp = page.viewportSize();
            if (pos.x < 0 || pos.y < 0 || pos.x >= vp.width || pos.y >= vp.height) {
                await page.evaluate(() => globalThis.__demoOverlay.hide());
                return;
            }
            await page.mouse.move(pos.x, pos.y);
        },

        /**
         * Move to a target along a curved, eased path.
         * @param target - a Locator, a button's name, a box or a point
         * @param options - how to move
         * @param options.slow - a factor on the move's time
         * @returns the target's box and the point aimed at
         */
        async move(target, { slow = 1 } = {}) {
            const box = await boxOf(target);
            const aim = aimAt(box);
            const p = plan(pos, aim, box, slow);
            log({ type: "move", from: pos, to: aim, ms: p.ms, box });
            await glide(p);
            return { box, aim };
        },

        /**
         * Point at something and rest there (hover effects fire).
         * @param target - a Locator, a button's name, a box or a point
         * @param ms - how long to rest
         * @returns the target's box and the point aimed at
         */
        async hover(target, ms = 900) {
            const m = await h.move(target);
            log({ type: "hover", ms, box: m.box });
            await sleep(ms);
            return m;
        },

        /**
         * Move, a short dwell, a 60-120 ms press.
         * @param target - a Locator, a button's name, a box or a point
         * @param options - how to click
         * @param options.button - "left" or "right"
         * @param options.dwell - ms between arriving and pressing (default 140-260)
         * @returns the target's box
         */
        async click(target, { button = "left", dwell } = {}) {
            const { box } = await h.move(target);
            await sleep(dwell ?? r.range(140, 260));
            log({ type: "click", button, x: pos.x, y: pos.y, box });
            await page.mouse.down({ button });
            await sleep(r.range(60, 120));
            await page.mouse.up({ button });
            await sleep(r.range(120, 220));
            return box;
        },

        /**
         * A right click.
         * @param target - a Locator, a button's name, a box or a point
         * @param options - as for click
         * @returns the target's box
         */
        rightClick: (target, options = {}) => h.click(target, { ...options, button: "right" }),

        /**
         * Type text at about 5.5 characters a second (focus a field first with h.click): a look at the
         * field before the first key, a beat after the last. Only what a person would type, at most
         * 25 characters: anything longer is pasted (h.paste).
         * @param text - what to type
         */
        async type(text) {
            if (text.length > 25) throw new Error(`"${text}" is over 25 characters: a person would paste it (h.paste)`);
            const delays = typingDelays(text, r);
            const think = r.range(...TYPE.think);
            const after = r.range(...TYPE.after);
            log({ type: "type", text, ms: think + delays.reduce((a, b) => a + b, 0) + after });
            await sleep(think);
            for (let i = 0; i < text.length; i++) {
                await sleep(delays[i]);
                await page.keyboard.type(text[i]);
            }
            await sleep(after);
        },

        /**
         * Paste text into the focused field, with a Ctrl+V key badge (long text, a web address).
         * @param text - what is pasted
         * @param options - where the badge shows
         * @param options.near - a target to show the badge above (default: by the cursor)
         */
        async paste(text, { near } = {}) {
            await h.badge("Ctrl+V", { near, label: "Paste" });
            await sleep(r.range(...TYPE.think));
            log({ type: "paste", text, badge: true });
            await page.keyboard.insertText(text);
            await sleep(r.range(...TYPE.after));
        },

        /**
         * Press one key with no badge (Enter, Escape, Backspace...).
         * @param key - the key, as Playwright names it
         */
        async press(key) {
            log({ type: "key", key, badge: false });
            await page.keyboard.press(key, { delay: r.range(60, 110) });
        },

        /**
         * A keyboard shortcut with its on-screen badge, shown for about a second near the cursor or
         * just above `near` (the button the shortcut stands for), so it never hides a toolbar.
         * @param combo - "Shift+T", "Ctrl+I", "5"
         * @param options - where and how long
         * @param options.near - a target to show the badge above
         * @param options.label - what the key does, shown after it ("3D"): a bare key means nothing to a viewer
         * @param options.badgeMs - how long the badge shows
         * @param [options.holdMs] - hold the keys down this long (a camera key repeats while held); default a tap
         * @param [options.show] - the badge's text when it differs from the key's Playwright name ("Right" for "ArrowRight")
         */
        async shortcut(combo, { near, label = "", badgeMs = 1300, holdMs, show } = {}) {
            await h.badge(show ?? combo, { near, label, badgeMs });
            log({ type: "key", key: combo, label, badge: true });
            await sleep(220);
            const keys = combo.split("+").map((k) => (k === "Ctrl" ? "Control" : k));
            for (const k of keys) await page.keyboard.down(k);
            await sleep(holdMs ?? r.range(70, 110));
            for (const k of keys.toReversed()) await page.keyboard.up(k);
            await sleep(400);
        },

        /**
         * Only the key badge, no key pressed: shown while the hand clicks the button the key stands
         * for, so a viewer learns the shortcut from the click they watch.
         * @param combo - "5", "Shift+T"
         * @param options - where and how long
         * @param options.near - a target to show the badge above (default: by the cursor)
         * @param options.label - what the key does ("3D")
         * @param options.badgeMs - how long it shows
         */
        async badge(combo, { near, label = "", badgeMs = 1300 } = {}) {
            let bx;
            let by;
            if (near) {
                const b = await boxOf(near);
                bx = b.x + b.width / 2 - 60;
                by = b.y - 92;
            }
            await page.evaluate(
                ([c, l, ms, x, y]) => globalThis.__demoOverlay.badge(c, ms, x, y, l),
                [combo, label, badgeMs, bx, by],
            );
        },

        /**
         * Press on one target, glide to another while held, release.
         * @param from - where to press
         * @param to - where to release
         * @param options - how to move
         * @param options.slow - a factor on the glide's time (default 1.4: a held drag is slower)
         */
        async drag(from, to, { slow = 1.4 } = {}) {
            const a = await h.move(from);
            await sleep(r.range(150, 250));
            log({ type: "down", x: pos.x, y: pos.y, box: a.box });
            await page.mouse.down();
            await sleep(r.range(90, 150));
            const box = await boxOf(to);
            const aim = aimAt(box);
            const p = plan(pos, aim, box, slow);
            log({ type: "drag", from: pos, to: aim, ms: p.ms, box });
            await glide(p);
            await sleep(r.range(120, 200));
            await page.mouse.up();
            log({ type: "up", x: pos.x, y: pos.y });
        },

        /**
         * Scroll with the wheel over a target, eased over `ms`.
         * @param target - what to scroll over
         * @param dy - how far, px (positive scrolls down)
         * @param options - how long
         * @param options.ms - the scroll's time
         */
        async scroll(target, dy, { ms = 700 } = {}) {
            dy = Math.round(dy); // the eased steps are whole pixels
            const { box } = await h.move(target);
            log({ type: "wheel", dy, ms, box });
            // paced by the clock: each wheel event carries what the eased curve reached since the last
            const t0 = performance.now();
            let done = 0;
            while (done !== dy) {
                const want = Math.round(dy * minJerk((performance.now() - t0) / ms));
                if (want !== done) await page.mouse.wheel(0, want - done);
                done = want;
                await sleep(FRAME);
            }
            await sleep(250);
        },

        /**
         * Drag a file out of a folder window and drop it on a target. The overlay draws the window
         * (title `folder`, the `files` listed) at the left of the screen; the hand goes to the file,
         * presses and drags it over the app. The drag is a real browser drag (CDP
         * Input.dispatchDragEvent with the file's path), so the page sees trusted dragenter, dragover
         * and drop events carrying the file. The window closes after the drop.
         * @param file - the file's path (its name must be one of `files`, or is added)
         * @param target - where to drop it (default the middle of the screen)
         * @param options - the window
         * @param options.folder - the window's title (a folder name)
         * @param options.files - the file names listed, 3-6 of them
         * @param options.at - where the window's top left corner sits (default {x: 48, y: 250})
         */
        async dropFile(file, target = null, { folder = "Downloads", files = [], at = { x: 48, y: 250 } } = {}) {
            const name = basename(file);
            const list = files.includes(name) ? files : [name, ...files];
            const boxes = await page.evaluate((o) => globalThis.__demoOverlay.window(o), {
                folder,
                files: list,
                open: false,
                ...at,
            });
            log({ type: "window", folder, files: list, box: { ...boxes.frame, label: "box" } });
            await sleep(r.range(500, 700)); // the window is seen before the hand reaches it
            const i = list.indexOf(name);
            const row = boxes.rows[i];
            await h.move({ ...row, width: Math.min(row.width, 260) }); // onto the file's icon and name
            await sleep(r.range(250, 400));
            cdp ??= await page.context().newCDPSession(page);
            dragData = { items: [], files: [file], dragOperationsMask: 1 };
            await page.evaluate((k) => {
                globalThis.__demoOverlay.press(true);
                globalThis.__demoOverlay.taken(k);
                return null;
            }, i);
            await page.evaluate((n) => globalThis.__demoOverlay.file(n), name);
            await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", x: pos.x, y: pos.y, data: dragData });
            const box = await boxOf(target ?? SCREEN_MIDDLE);
            const aim = aimAt(box);
            const p = plan(pos, aim, box, 1.5);
            log({ type: "file-drag", file: name, from: pos, to: aim, ms: p.ms, box });
            await glide(p, true);
            await sleep(r.range(350, 500)); // let the drop card be seen
            log({ type: "drop", file: name, x: pos.x, y: pos.y, box });
            await cdp.send("Input.dispatchDragEvent", { type: "drop", x: pos.x, y: pos.y, data: dragData });
            await page.evaluate(() => {
                globalThis.__demoOverlay.file(null);
                globalThis.__demoOverlay.press(false);
                globalThis.__demoOverlay.closeWindow();
                return null;
            });
            await page.mouse.move(pos.x, pos.y);
        },

        /**
         * Open a file the way a viewer can follow: click the app's real control that opens the file
         * chooser (Open a file), then pick the file in an Open dialog the overlay draws (headless
         * Chromium shows none): the folder `folder`, the files `files` with their kinds. The hand
         * moves to the file, its row highlights, the hand clicks Open; the dialog closes and the
         * real file chooser gets the file. The dialog stays up at least `minMs` so its names are read.
         * @param target - the control that opens the chooser (a Locator, a button's name...)
         * @param file - the file's path (its name must be one of `files`, or is added)
         * @param options - the dialog
         * @param options.folder - the folder shown
         * @param options.files - the file names listed, 4-6 of them
         * @param options.minMs - the least time the dialog is up (default 2500)
         */
        async openFile(target, file, { folder = "Downloads", files = [], minMs = 2500 } = {}) {
            const name = basename(file);
            const list = files.includes(name) ? files : [name, ...files];
            const chooser = page.waitForEvent("filechooser");
            await h.click(target);
            const fc = await chooser;
            const boxes = await page.evaluate((o) => globalThis.__demoOverlay.window(o), {
                folder,
                files: list,
                open: true,
            });
            const shown = Date.now();
            log({ type: "window", folder, files: list, box: { ...boxes.frame, label: "box" } });
            await sleep(r.range(600, 900)); // the eye finds the dialog and reads the folder
            const row = boxes.rows[list.indexOf(name)];
            await h.click({ ...row, width: Math.min(row.width, 380) });
            await sleep(Math.max(r.range(350, 550), minMs - (Date.now() - shown) - 900));
            await h.click(boxes.open);
            await page.evaluate(() => globalThis.__demoOverlay.closeWindow());
            await fc.setFiles(file);
            log({ type: "choose-file", file: name });
        },

        /**
         * Click a control that opens the browser's file chooser, and choose the file in it, with no
         * dialog drawn (prefer h.openFile: a file appearing from nowhere is hard to follow).
         * @param target - the control
         * @param file - the file's path
         */
        async chooseFile(target, file) {
            const chooser = page.waitForEvent("filechooser");
            await h.click(target);
            await (await chooser).setFiles(file);
            log({ type: "choose-file", file: basename(file) });
        },

        /**
         * A deliberate pause (a dwell, or a hold on a result).
         * @param ms - how long
         * @returns when it is over
         */
        pause: (ms) => sleep(ms),

        /**
         * Wait for something the app does on its own time (a result drawn); not a pacing pause.
         * @param locator - what appears
         */
        async waitFor(locator) {
            await locator.waitFor({ state: "visible" });
        },

        /**
         * Put a named moment in the clip's log (for the edit: "result shown").
         * @param name - the moment
         * @returns nothing
         */
        mark: (name) => log({ type: "mark", name }),
    };
    return h;
}

// runs in the page: true when a scrolled list hides the element: its middle is outside the list's
// view, and a click there would land on something else
function scrolledOut(el) {
    const r = el.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    const hit = globalThis.document.elementFromPoint(r.left + r.width / 2, mid);
    if (hit && (hit === el || el.contains(hit))) return false;
    for (let c = el; c.parentElement; c = c.parentElement) {
        const p = c.parentElement;
        if (!/auto|scroll/.test(globalThis.getComputedStyle(p).overflowY) || p.scrollHeight <= p.clientHeight) continue;
        const q = p.getBoundingClientRect();
        if (mid < q.top || mid > q.bottom) return true;
    }
    return false;
}
