// Round 6, chapters 2 (Styles) and 3 (Create and load styles): the shared setup steps. A .js file, so
// record.mjs does not take it for a clip. One graph for the whole chapter: the Les Miserables sample
// (names, and shared_chapters on every edge), PageRank and Louvain run, each clip starting where the
// one before it ended. Setup only: Playwright clicks straight through the app's own UI, unpaced.
import { closeToasts, nodeBox, runAnalysis } from "../r2-1-fraud-ring/bank.js";
import { fitWide, labelPixels } from "../r2-2-alzheimer/alz.js";

export { fitWide } from "../r2-2-alzheimer/alz.js";

/** Every chapter 2 and 3 clip on Les Miserables. */
export const STYLES_CLIP = { chapter: 2, dataset: "Les Miserables" };

/** Where the hand rests after a beat: the inspector's empty lower part, off the graph. */
export const REST = { x: 1700, y: 800, width: 180, height: 180 };

/**
 * A brisk click, as bank.js's `tap` but quicker on the way (these takes have several steps and must
 * stay under 10 s): move, a short dwell, press, release.
 * @param h - the hand
 * @param target - what to click
 */
export async function tap(h, target) {
    const { box } = await h.move(target, { slow: 0.55 });
    const { page, random: r } = h;
    await page.waitForTimeout(r.range(100, 150));
    const { x, y } = h.at;
    h.events.push({ t: Date.now(), type: "click", button: "left", x, y, box });
    await page.mouse.down();
    await page.waitForTimeout(r.range(60, 100));
    await page.mouse.up();
    await page.waitForTimeout(r.range(80, 130));
}

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * A layer picked in Style layers and the inspector on its Style tab, Node or Edge (setup only).
 * @param h - the hand
 * @param layer - the layer's name ("Everything", "Group 1")
 * @param kind - "Node" or "Edge"
 */
export async function onLayer(h, layer, kind = "Node") {
    const { page } = h;
    await page.getByRole("treeitem", { name: new RegExp(`^${layer}, `) }).click();
    await inspector(page).getByRole("tab", { name: "Style" }).click();
    await page
        .getByRole("tablist", { name: "Style for" })
        .getByRole("tab", { name: new RegExp(`^${kind}`) })
        .click();
}

/**
 * Pick one value in an open value picker (setup only): type in its search, click the option.
 * @param page - the Playwright page
 * @param words - what to type
 * @param option - the option's exact name
 */
async function pickValue(page, words, option) {
    await page.getByRole("combobox", { name: /^Search \d+ / }).fill(words);
    await page.getByRole("option", { name: option, exact: true }).click();
    const open = page.getByRole("combobox", { name: /^Search \d+ / });
    if (await open.isVisible()) await page.keyboard.press("Escape");
    await open.waitFor({ state: "hidden" });
}

/**
 * The recorded path through a value picker: the field's button, a few letters typed in its search,
 * the option (brisk taps: the path has several steps). The picker closes on the pick (or with Esc).
 * @param h - the hand
 * @param button - the field's button
 * @param words - what to type
 * @param option - the option's exact name
 */
export async function choose(h, button, words, option) {
    const { page } = h;
    await tap(h, button);
    await page.getByRole("combobox", { name: /^Search \d+ / }).waitFor();
    const pick = page.getByRole("option", { name: option, exact: true });
    // type only when the option is not already in sight in the list (a short list needs no search)
    const inView = await pick
        .evaluate((o) => {
            const r = o.getBoundingClientRect();
            let p = o.parentElement;
            while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
            const v = p ? p.getBoundingClientRect() : { top: 0, bottom: globalThis.innerHeight };
            return r.height > 0 && r.top >= v.top && r.bottom <= v.bottom;
        })
        .catch(() => false);
    if (!inView) await h.type(words);
    await tap(h, pick);
    const open = page.getByRole("combobox", { name: /^Search \d+ / });
    if (await open.isVisible()) await h.press("Escape");
    await open.waitFor({ state: "hidden" });
}

/**
 * Where chapter 2 starts: the sample flat and framed, PageRank and Louvain run and their own layers
 * hidden (the chapter styles Everything by their results itself), the notices closed.
 * @param h - the hand
 */
export async function lesMis(h) {
    const { page } = h;
    await h.app.ready2D();
    await runAnalysis(h, "pagerank", "PageRank");
    await runAnalysis(h, "louv", "Louvain");
    await h.app.settled();
    for (const layer of ["Louvain", "PageRank"]) {
        await page.getByRole("button", { name: `Hide ${layer}`, exact: true }).click();
        await page.getByRole("button", { name: `Show ${layer}`, exact: true }).waitFor();
    }
    await closeToasts(h);
    await onLayer(h, "Everything");
    // a little larger than the default, so a node's shape reads
    const size = inspector(page).getByRole("spinbutton", { name: "Node size" });
    await size.fill("1.5");
    await size.press("Enter");
    await size.blur();
    await h.app.settled();
}

/**
 * Where the labels clip ends, made readable at Fit: every node named, in the sans font and in screen
 * pixels.
 * @param h - the hand
 */
export async function withLabels(h) {
    const { page } = h;
    await lesMis(h);
    await inspector(page).getByRole("button", { name: "Add to node text" }).click();
    await page.getByRole("menuitem", { name: "Label", exact: true }).click();
    await page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: "name", exact: true }).click();
    await labelPixels(page, 13, { sans: true });
    await h.app.settled();
}

/**
 * Where the color clip ends: Everything's node color follows the Louvain community.
 * @param h - the hand
 */
export async function withColor(h) {
    const { page } = h;
    await withLabels(h);
    await inspector(page).getByRole("button", { name: "Node color by attribute" }).click();
    await page
        .getByRole("dialog", { name: "Node color by attribute" })
        .getByRole("option", { name: /^Louvain, / })
        .click();
    await inspector(page)
        .getByRole("button", { name: /^Node color: Louvain/ })
        .waitFor();
    await h.app.settled();
}

/**
 * The Louvain folder shown and opened, so its community layers are listed (setup only). Its layers
 * color each community the same as Everything's Louvain palette.
 * @param h - the hand
 */
export async function louvainOpen(h) {
    const { page } = h;
    await page.getByRole("button", { name: "Show Louvain", exact: true }).click();
    await page.getByRole("treeitem", { name: /^Louvain, / }).click();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("treeitem", { name: /^Group 1, / }).waitFor();
}

/**
 * Where the 2D shapes clip starts: colored by community, the Louvain folder open, the largest
 * community (Group 1) given a Shape of its own at its default (it still looks the same), the
 * inspector on Group 1.
 * @param h - the hand
 */
export async function groupShape(h) {
    const { page } = h;
    await withColor(h);
    await louvainOpen(h);
    await onLayer(h, "Group 1");
    await inspector(page).getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Shape", exact: true }).click();
    await inspector(page)
        .getByRole("button", { name: /^Node shape, / })
        .waitFor();
    await h.app.settled();
}

/**
 * Where the stars and hexagons start: the largest community (Group 1) hexagons, the Louvain folder open,
 * the inspector back on Everything.
 * @param h - the hand
 */
export async function withHexagons(h) {
    const { page } = h;
    await groupShape(h);
    await inspector(page)
        .getByRole("button", { name: /^Node shape, / })
        .click();
    await pickValue(page, "hex", "Hexagon");
    await onLayer(h, "Everything");
    await h.app.settled();
}

/**
 * Where the 2D shapes clip ends: every node a star, the largest community (Group 1) hexagons.
 * @param h - the hand
 */
export async function withShapes(h) {
    const { page } = h;
    await withHexagons(h);
    await inspector(page)
        .getByRole("button", { name: /^Node shape, / })
        .click();
    await pickValue(page, "star", "Star");
    await h.app.settled();
}

/**
 * Where the 3D shapes clip starts: Everything spheres (Group 1 still hexagons), the inspector on
 * Everything; still in 2D.
 * @param h - the hand
 */
export async function withSpheres(h) {
    const { page } = h;
    await withShapes(h);
    await inspector(page)
        .getByRole("button", { name: /^Node shape, / })
        .click();
    await pickValue(page, "sphere", "Sphere");
    await h.app.settled();
}

/**
 * Where the 3D shapes clip ends: spheres, and the largest community torus knots.
 * @param h - the hand
 */
export async function withShapes3D(h) {
    const { page } = h;
    await withSpheres(h);
    await onLayer(h, "Group 1");
    await inspector(page)
        .getByRole("button", { name: /^Node shape, / })
        .click();
    await pickValue(page, "knot", "Torus knot");
    await onLayer(h, "Everything");
    await h.app.settled();
}

/**
 * The edge clips' start (setup only): spheres and torus knots as the 3D shapes clip left them, the
 * edges darker and wider so a pattern reads, the inspector on Everything's Edge tab (still flat:
 * `spin` lifts it).
 * @param h - the hand
 */
export async function edgesReady(h) {
    await withShapes3D(h);
    await h.app.layerEdges("Everything", { color: "6B7280", width: 12 });
    await onLayer(h, "Everything", "Edge");
}

/**
 * Everything's edge pattern picked (setup only).
 * @param h - the hand
 * @param words - what to type in the picker's search
 * @param option - the pattern ("Dashed")
 */
export async function edgePattern(h, words, option) {
    await inspector(h.page)
        .getByRole("button", { name: /^Edge pattern, / })
        .click();
    await pickValue(h.page, words, option);
    await h.app.settled();
}

/**
 * The edges' target end set to an arrowhead in the Edge ends popover (setup only).
 * @param h - the hand
 * @param arrow - the end's option name
 */
export async function arrowEnds(h, arrow) {
    const { page } = h;
    await inspector(page).getByRole("button", { name: "Edge ends settings" }).click();
    const ends = page.getByRole("dialog", { name: "Edge ends" });
    await ends.getByRole("button", { name: "Add edge target", exact: true }).click();
    await ends.getByRole("button", { name: /^Edge target end, / }).click();
    await page.getByRole("option", { name: arrow, exact: true }).click();
    while (await ends.isVisible()) await page.keyboard.press("Escape");
}

/** The arrowhead the edge clip picks. */
export const ARROW = "Triangle";

/**
 * Where the edge lines clip ends: zigzag edges with arrowheads.
 * @param h - the hand
 */
export async function withEdgeLines(h) {
    await edgesReady(h);
    await edgePattern(h, "zig", "Zigzag");
    await arrowEnds(h, ARROW);
    await h.app.settled();
}

/**
 * Where the edge labels clip ends: every edge shows its shared_chapters.
 * @param h - the hand
 */
export async function withEdgeLabels(h) {
    const { page } = h;
    await withEdgeLines(h);
    await inspector(page).getByRole("button", { name: "Add to edge text" }).click();
    await page.getByRole("menuitem", { name: "Label", exact: true }).click();
    await page
        .getByRole("dialog", { name: "Label" })
        .getByRole("option", { name: /^shared_chapters/ })
        .click();
    await h.app.settled();
}

/**
 * Close in on one corner of the drawing (setup only): Fit, then wheel notches in toward a point near
 * a node (the wheel keeps the point under the mouse where it is).
 * @param h - the hand
 * @param id - the node ("Valjean")
 * @param ticks - notches in
 * @param [off] - the point's offset from the node, in screen pixels
 */
export async function closeIn(h, id, ticks, off) {
    off ??= { x: 0, y: 0 };
    await fitWide(h);
    const b = await nodeBox(h, id);
    await h.page.mouse.move(b.x + b.width / 2 + off.x, b.y + b.height / 2 + off.y);
    for (let i = 0; i < ticks; i++) {
        await h.page.mouse.wheel(0, -100);
        await h.app.frames(5);
    }
    await h.app.settled();
}

/**
 * The legend card closed (setup only): it covers the canvas's top-left corner. The L key toggles it,
 * so only when it is showing.
 * @param h - the hand
 */
export async function noLegend(h) {
    const { page } = h;
    const card = page.getByText(/^(Color|Shape|Size): /).first();
    if (!(await card.isVisible())) return;
    await page.mouse.click(700, 20); // the empty title bar: single-key shortcuts need the focus off fields
    await page.keyboard.press("l");
    await card.waitFor({ state: "hidden" });
}

/**
 * The chapter's 3D stage (end of setup): lifted into 3D, framed, `ticks` wheel notches in toward the
 * middle, then Camera > Auto-rotate on, so the drawing turns slowly through the whole take (every
 * frame changes, which the frame gate counts). From here nothing may wait on `h.app.settled()`: a
 * turning drawing never settles.
 * @param h - the hand
 * @param ticks - wheel notches in after Fit
 */
export async function spin(h, ticks = 0) {
    const { page } = h;
    await h.app.mode("3D");
    await h.app.settled();
    await h.app.camera("Fit");
    await h.app.settled();
    await page.mouse.move(990, 540);
    for (let i = 0; i < ticks; i++) {
        await page.mouse.wheel(0, -100);
        await h.app.frames(5);
    }
    await h.app.settled();
    await page.getByRole("button", { name: "Camera", exact: true }).click();
    await page
        .getByRole("menuitemcheckbox", { name: /^Auto-rotate/ })
        .or(page.getByRole("menuitem", { name: /^Auto-rotate/ }))
        .first()
        .click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await h.app.frames(30);
}
