/**
 * Chapter 8's shared starting state, reached through the app's own UI before recording: Marvel
 * films in 2D, fitted, the file-styles experiment's stray layers deleted, and, unless asked not to, the time field set and the timeline open.
 * Not a clip: a .js file, so record.mjs does not load it as a clip.
 */

// an empty spot high on the right of the canvas (Graph drawing coordinates): clear of the graph and
// of the legend, which opens top left once a layer colors something
const EMPTY = { x: 1300, y: 40 };

/**
 * Marvel films in 2D, plainly styled, with its time field set and the timeline open (setup only).
 * @param h - the hand
 * @param o - options
 * @param o.timeline - set the time field and open the timeline (default true)
 */
export async function marvel2D(h, { timeline = true } = {}) {
    const { page } = h;
    await dropFileLayers(h);
    await h.app.mode("2D");
    await h.app.settled(); // 2D lays the graph out again
    await h.app.camera("Fit");
    await h.app.settled();
    await page.getByRole("button", { name: "Graph Marvel films" }).click(); // the Overview offers "Time: released"
    if (!timeline) return;
    await page.getByRole("button", { name: "Set in Data" }).click();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page.getByRole("region", { name: "Timeline" }).getByRole("button", { name: "Play" }).waitFor();
    await page.getByRole("button", { name: "Graph", exact: true }).click(); // back to the style layers
}

/**
 * Delete the layers the file-styles experiment makes from a plain file (Draw order, Drawing,
 * Defaults, Corners: an app defect, reported with chapter 8), through each layer's own menu, so the
 * layer list holds only what the clip adds and the graph draws in the app's plain default look.
 * With the experiment off there is nothing to delete.
 * @param h - the hand
 */
export async function dropFileLayers(h) {
    const { page } = h;
    const stray = page.getByRole("treeitem", { name: /^(Draw order|Drawing|Defaults|Corners), / });
    while ((await stray.count()) > 0) {
        const before = await stray.count();
        await stray.first().click({ button: "right" });
        await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
        await stray.nth(before - 1).waitFor({ state: "detached" });
    }
    const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
}

/**
 * Shift+comma (the "<" key): the time window back to its start, so play opens on the first year.
 * @param h - the hand
 */
export async function toStart(h) {
    const { page } = h;
    await page.mouse.click(175, 700); // empty left panel: focus off any field, and off the canvas (its focus ring would show)
    await page.keyboard.press("<");
    await page
        .getByRole("region", { name: "Timeline" })
        .getByRole("button", { name: "Step back" })
        .and(page.locator(":disabled"))
        .waitFor();
    await h.app.settled();
}

/**
 * A layer of the nodes a find-box rule matches (canvas menu > New layer from selection), renamed;
 * the selection is cleared after. The new layer is left open in the inspector.
 * @param h - the hand
 * @param rule - the rule without its "=" ("kind == 'film'")
 * @param name - the layer's new name
 */
export async function ruleLayer(h, rule, name) {
    const { page } = h;
    const find = page.getByPlaceholder("Find nodes, edges, values");
    await find.click();
    await find.fill(`=${rule}`);
    await page.keyboard.press("Enter");
    await page.getByRole("treeitem", { name: /^Selected, node and edge layer, [1-9]/ }).waitFor();
    await page.getByRole("region", { name: "Graph drawing" }).click({ button: "right", position: EMPTY });
    await page.getByRole("menuitem", { name: "New layer from selection" }).click();
    await page.getByRole("treeitem", { name: /^Rule: / }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const field = page.locator("input:focus");
    await field.fill(name);
    await field.press("Enter");
    await page.getByRole("treeitem", { name: new RegExp(`^${name}, `) }).waitFor();
}

/**
 * The films in their own color and a little bigger than the cast: a "Films" layer (kind == 'film')
 * with a solid fill and a node size.
 * @param h - the hand
 * @param o - options
 * @param o.color - the films' color
 * @param o.size - the films' node size (the cast stays 1)
 */
export async function filmsLayer(h, { color = "#f97316", size = 2 } = {}) {
    const { page } = h;
    await ruleLayer(h, "kind == 'film'", "Films");
    await page.getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Solid", exact: true }).click();
    const fill = page.getByRole("textbox", { name: /^Node color/ });
    await fill.fill(color);
    await fill.press("Enter");
    if (size !== 1) {
        await page.getByRole("button", { name: "Add to node shape" }).click();
        await page.getByRole("menuitem", { name: "Size", exact: true }).click();
        const box = page.getByRole("spinbutton", { name: "Node size" });
        await box.fill(String(size));
        await box.press("Enter");
    }
    await clearFind(h);
}

/**
 * Clear the find box and the selection (a click on empty canvas), so nothing wears the selected ring.
 * @param h - the hand
 */
export async function clearFind(h) {
    const { page } = h;
    const dismiss = page.getByRole("button", { name: "Dismiss" });
    if (await dismiss.isVisible()) await dismiss.click();
    await page.getByRole("button", { name: "Clear search" }).first().click();
    await page.getByRole("region", { name: "Graph drawing" }).click({ position: EMPTY });
    await page.getByRole("treeitem", { name: /^Selected, node and edge layer, 0 nodes/ }).waitFor();
}

/**
 * Timeline settings (the dock's gear): Mode Grow, so each year adds to what came before, and
 * optionally what algorithm results do when the window moves. Closed again after.
 * @param h - the hand
 * @param o - options
 * @param o.results - a "When window moves" choice, such as "Rerun automatically"
 */
export async function timelineSettings(h, { results } = {}) {
    const { page } = h;
    await page.getByRole("button", { name: "Timeline settings" }).click();
    const panel = page.getByRole("dialog", { name: "Timeline settings" });
    await panel.getByText("Grow", { exact: true }).click();
    if (results) {
        await panel.getByRole("combobox", { name: "When window moves" }).click();
        await page.getByRole("option", { name: results, exact: true }).click();
    }
    await panel.getByRole("button", { name: "Close Timeline settings" }).click();
    await panel.waitFor({ state: "hidden" });
}

/**
 * The speed button pressed until it reads `x` (1, 2 or 4).
 * @param h - the hand
 * @param x - the speed
 */
export async function speed(h, x) {
    const dock = h.page.getByRole("region", { name: "Timeline" });
    for (let i = 0; i < 3 && !(await dock.getByRole("button", { name: `Speed ${x}x` }).isVisible()); i++)
        await dock.getByRole("button", { name: /^Speed / }).click();
}

/**
 * Camera > Fit once the dock has taken its room, then one wheel step out over the canvas so the
 * graph's foot clears the floating toolbar, and wait for the drawing to rest.
 * @param h - the hand
 */
export async function refit(h) {
    const { page } = h;
    await h.app.camera("Fit");
    await h.app.settled();
    // two wheel steps out, about a point high on the canvas: the graph shrinks toward it, so its
    // foot clears the floating toolbar and the dock
    await page.mouse.move(988, 260);
    for (let i = 0; i < 2; i++) {
        await page.mouse.wheel(0, 120);
        await h.app.settled();
    }
}

/**
 * Run one analysis through Analyze (no pacing): filter, pick, Run, close.
 * @param h - the hand
 * @param name - the analysis, as its row names it ("Degree")
 */
export async function analyze(h, name) {
    const { page } = h;
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter analyses" }).fill(name);
    await page.getByRole("option", { name, exact: true }).click();
    await page.getByRole("button", { name: `Run ${name}` }).click();
    await page.getByRole("treeitem", { name: new RegExp(String.raw`^${name}\b`) }).waitFor(); // its result layer
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "Analyze" }).waitFor({ state: "hidden" });
}

/**
 * Node size by Degree on the Degree layer that Analyze made (it sits above the file's own layers,
 * so its size wins): Add to node shape > Size, then size by the Degree attribute, from 1 to `to`.
 * @param h - the hand
 * @param to - the largest node size
 */
export async function sizeByDegree(h, to = 3) {
    const { page } = h;
    await page.getByRole("treeitem", { name: /^Degree\b/ }).click();
    await page.getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    await page.getByRole("button", { name: "Node size by attribute" }).click();
    await page.getByRole("option", { name: /^Degree, / }).click();
    await page.getByRole("button", { name: /^Node size: Degree/ }).waitFor();
    if (to === 3) return;
    // the default 1 to 3 hardly shows: widen it in the Size by Degree popover
    await page.getByRole("button", { name: /^Node size: Degree/ }).click();
    const box = page.getByRole("dialog", { name: "Size by Degree" }).getByRole("spinbutton", { name: "Size to" });
    await box.fill(String(to));
    await box.press("Enter");
    await page.getByRole("button", { name: "Close Size by Degree" }).click();
    await page.getByRole("button", { name: new RegExp(`^Node size: Degree, 1 to ${to}`) }).waitFor();
}

/**
 * Names on the canvas for the nodes a rule matches: a layer made from the rule (see ruleLayer),
 * Text > Label > name, centered on a white box, and the label's letter size (a letter's height in graph units; a node is
 * about 1 across -- Label size did not change how big they draw).
 * @param h - the hand
 * @param rule - the rule without its "="
 * @param name - the layer's name
 * @param letter - the letter size
 */
export async function labelLayer(h, rule, name, letter = 2.2) {
    const { page } = h;
    await ruleLayer(h, rule, name);
    await page.getByRole("button", { name: "Add to node text" }).click();
    await page.getByRole("menuitem", { name: "Label", exact: true }).click();
    await page.getByRole("option", { name: "name", exact: true }).click();
    await page.getByRole("searchbox", { name: "Find a setting" }).fill("label");
    await page.getByRole("button", { name: "Add node label letter size" }).click();
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    const size = inspector
        .getByRole("textbox", { name: /letter size/i })
        .or(inspector.getByRole("spinbutton", { name: /letter size/i }))
        .first();
    await size.fill(String(letter));
    await size.press("Enter");
    // nodes draw over labels, so a label above its node hides under a big neighbor: centered on
    // its own node, on a white box, it stays readable (Label drawn on top would be the fix, but
    // adding it breaks the inspector -- reported with this chapter)
    const find = page.getByRole("searchbox", { name: "Find a setting" });
    await find.fill("label");
    await page.getByRole("button", { name: "Add node label location" }).click();
    await page.getByRole("button", { name: /^Node label location, / }).click();
    await page.getByRole("option", { name: "Center", exact: true }).click();
    await page.keyboard.press("Escape");
    await find.fill("label");
    await page.getByRole("button", { name: "Add node label background", exact: true }).click();
    const bg = page.getByRole("textbox", { name: /^Node label background/ });
    await bg.fill("#ffffff");
    await bg.press("Enter");
    await find.fill("");
    await clearFind(h);
}

/**
 * The Selected layer drawn big and red, so a selected node stands out on the canvas.
 * @param h - the hand
 */
export async function styleSelected(h) {
    const { page } = h;
    await page.getByRole("treeitem", { name: /^Selected, / }).click();
    await page.getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    const box = page.getByRole("spinbutton", { name: "Node size" });
    await box.fill("4");
    await box.press("Enter");
    await page.getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Solid", exact: true }).click();
    const fill = page.getByRole("textbox", { name: /^Node color/ });
    await fill.fill("#dc2626");
    await fill.press("Enter");
    await page.getByRole("button", { name: "Graph Marvel films" }).click(); // the inspector back on the Overview
}
