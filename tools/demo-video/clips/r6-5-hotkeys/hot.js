// Chapter 14, hotkeys and camera: what its clips share. A .js file, so record.mjs does not take it
// for a clip. College football, settled in 3D and colored by Louvain community, all in setup.
import { analyze, closeToasts } from "../r2-1-fraud-ring/bank.js";

export const HOTKEYS = 14;
export const FOOTBALL = "College football";

/** Where the hand rests after a beat: the canvas's empty lower right, off the graph. */
export const REST = { x: 1460, y: 880, width: 100, height: 60 };

/** An empty spot of the canvas, right of the graph: a click there gives the canvas the keys. */
export const EMPTY_CANVAS = { x: 1540, y: 280, width: 60, height: 60 };

/**
 * The toolbar's Camera button, which the camera keys stand for.
 * @param page - the Playwright page
 * @returns its locator
 */
export const cameraButton = (page) => page.getByRole("button", { name: "Camera", exact: true });

/**
 * Setup: the sample (opened by the clip's `dataset`) colored by Louvain community, the legend card
 * off (it covers the graph's corner), framed whole.
 * @param h - the hand
 */
export async function football(h) {
    const { page } = h;
    await h.app.closeTable();
    await h.app.settled();
    await analyze(h, "louv", "Louvain");
    await closeToasts(h);
    await page.keyboard.press("l");
    await page.getByText("Color: Louvain").waitFor({ state: "hidden" });
    await h.app.camera("Fit");
    await h.app.settled();
}

/**
 * Setup: the keyboard taken off any field or list, so a single-key shortcut reaches the app: a
 * click on the empty title bar. (Not the layer panel: a click there focuses a layer row, and
 * single-key shortcuts such as F and G do nothing while a Style layers row has the focus.)
 * @param page - the Playwright page
 */
export async function blur(page) {
    await page.mouse.click(700, 20);
}

/**
 * Setup: `ticks` wheel notches in toward the middle of the drawing, so it fills more of the canvas.
 * @param h - the hand
 * @param ticks - wheel notches in
 */
export async function closer(h, ticks) {
    const { page } = h;
    await page.mouse.move(990, 540);
    for (let i = 0; i < ticks; i++) {
        await page.mouse.wheel(0, -100);
        await h.app.frames(5);
    }
    await h.app.settled();
}

/**
 * Setup, last step: `ticks` notches in, then Camera > Auto-rotate on, so the drawing turns slowly
 * through the whole take (every frame changes: `frame-gate.mjs --metric diff` counts it; the
 * default scene score cannot see a steady turn), and the keyboard off
 * the menu. From here nothing may wait on `h.app.settled()`: a turning drawing never settles.
 * @param h - the hand
 * @param [ticks] - wheel notches in first
 */
export async function spin(h, ticks = 0) {
    const { page } = h;
    await closer(h, ticks);
    await cameraButton(page).click();
    await page
        .getByRole("menuitemcheckbox", { name: /^Auto-rotate/ })
        .or(page.getByRole("menuitem", { name: /^Auto-rotate/ }))
        .first()
        .click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await blur(page);
    await h.app.frames(30);
}

/**
 * Setup: the Selected layer filled near-black, so every selected node reads against the Louvain
 * colors (the layer's own halo draws on only one node of a multi-node selection, an app defect;
 * a red fill, as the basics chapter uses, is lost among this sample's crimson community).
 * @param page - the Playwright page
 */
export async function darkSelected(page) {
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await page.getByRole("treeitem", { name: /^Selected, / }).click();
    await insp.getByRole("heading", { name: /^Selected, / }).waitFor();
    await insp.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await insp.getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Solid", exact: true }).click();
    const fill = insp.getByRole("textbox", { name: /^Node color, / });
    await fill.fill("111111");
    await fill.press("Enter");
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
}
