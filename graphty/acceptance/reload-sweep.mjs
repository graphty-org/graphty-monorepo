/**
 * The reload sweep: a route that finds the app's controls by itself and reloads after each one, so
 * a new panel, line or popover is swept the first time it renders, with no list for anyone to keep
 * (issue #9973: every earlier reload check tested a list someone wrote, and the surfaces left off the
 * list lost what the reader had open).
 *
 * It opens a sample and adds a layer named "test" (a renamed layer, as nearly every layer a reader
 * makes is). Then, for each enabled control on the screen by role, and each control that click
 * brought up (two clicks deep), it clicks the control and reloads as Safari does
 * (reload-check.mjs). It reports every control whose reload changed the screen, then
 * fails once with all of them. A control whose name says it leaves the project, deletes, signs out
 * or downloads is never clicked.
 */
import { reloadKeepsScreen } from "./reload-check.mjs";

/** The roles of what a reader clicks to open, pick or switch something. */
const ROLES = ["button", "tab", "treeitem", "menuitem", "option", "switch"];

/** What the sweep never clicks: it would leave the project, destroy work or start a download. */
const SKIP =
    /\b(new|open|close|delete|remove|discard|sign out|log out|download|export|save|print|undo|redo|reset|clear)\b/i;

/**
 * The enabled, visible controls on the screen, by role and accessible name, each once.
 * @param page the page
 * @returns `[role, name]` pairs
 */
async function controls(page) {
    return page.evaluate(
        ({ roles, skip }) => {
            const avoid = new RegExp(skip, "i");
            const selector = roles.map((role) => `[role="${role}"]`).join(", ") + ", button:not([role])";
            const found = new Map();
            for (const element of document.querySelectorAll(selector)) {
                const role = element.getAttribute("role") ?? "button";
                const name = (element.getAttribute("aria-label") ?? element.textContent ?? "")
                    .trim()
                    .replaceAll(/\s+/g, " ");
                const shown =
                    element.getClientRects().length > 0 && !element.closest('[hidden], [aria-hidden="true"], [inert]');
                const enabled = !element.matches(":disabled, [aria-disabled=true]");
                if (name !== "" && name.length < 80 && shown && enabled && !avoid.test(name))
                    found.set(`${role}\u0000${name}`, [role, name]);
            }
            return [...found.values()];
        },
        { roles: ROLES, skip: SKIP.source },
    );
}

/**
 * Clicks a control by role and name, if it is still there.
 * @param page the page
 * @param control `[role, name]`: its role and accessible name
 * @returns true when it was clicked
 */
async function press(page, control) {
    const [role, name] = control;
    const target = page.getByRole(role, { name, exact: true }).first();
    if ((await target.count()) === 0 || !(await target.isVisible())) return false;
    await target.click();
    return true;
}

/**
 * Clicks one control, reloads, and records a difference; then sweeps what the click brought up,
 * one level further, and goes back with Escape.
 * @param page the page
 * @param control `[role, name]`
 * @param depth clicks left
 * @param seen the controls already swept
 * @param differences where a difference is recorded
 */
async function sweep(page, control, depth, seen, differences) {
    const key = control.join(" ");
    if (seen.has(key)) return;
    seen.add(key);
    const before = new Set((await controls(page)).map((each) => each.join(" ")));
    if (!(await press(page, control))) return;
    const brought = (await controls(page)).filter((each) => !before.has(each.join(" ")));
    try {
        await reloadKeepsScreen(page);
    } catch (error) {
        differences.push(`${key}: ${error.message}`);
    }
    if (depth > 1) for (const each of brought) await sweep(page, each, depth - 1, seen, differences);
    await page.keyboard.press("Escape");
}

/** The sweep, as a route run.mjs walks like any other. */
export const reloadSweep = {
    id: "reload-sweep",
    feature: "Every control a reader can click leaves a screen that a reload gives back unchanged",
    from: "issue #9973",
    async walk(u) {
        await u.click("Samples");
        await u.click(u.button(/^Open the Les Miserables sample: /));
        await u.page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
        await u.click("Add a layer or a folder");
        await u.page.getByRole("menuitem", { name: "Layer", exact: true }).click();
        // "Add layer" opens the new layer's name field ready to type, as a reader names it.
        const name = u.page.getByRole("textbox", { name: "Layer name" });
        await name.fill("test");
        await name.press("Enter");
        await u.page.getByRole("treeitem", { name: /^test\b/, selected: true }).waitFor();
        const seen = new Set();
        const differences = [];
        for (const control of await controls(u.page)) await sweep(u.page, control, 2, seen, differences);
        console.log(
            `reload-sweep: reloaded after ${String(seen.size)} controls, ${String(differences.length)} changed the screen`,
        );
        if (differences.length > 0)
            throw new Error(
                `${differences.length} control(s) left a screen the reload changed:\n${differences.join("\n")}`,
            );
    },
    checks: {},
};
