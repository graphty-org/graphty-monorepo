// Chapter 2's shared setup (a .js file, so record.mjs does not take it for a clip).
//
// The chapter is filmed with the cosmograph experiment off. With it on, Les Miserables in 2D draws no
// edges, and selecting a node then draws the edges but drops about half the nodes (issue #3247's
// experiment; reported with this chapter). Every clip here is about how characters link, so it needs
// the edges. The page is reopened through its public ?features= address with every other experiment
// still on; the autosaved project comes back as it was.

/**
 * Reopen the app without the cosmograph experiment, then Mode 2D, laid out and fitted.
 * @param h - the hand
 */
export async function stage(h) {
    const { page } = h;
    await page.getByText("Autosave: saved").waitFor();
    const u = new URL(page.url());
    const ids = (u.searchParams.get("features") ?? "").split(",").filter((id) => id && id !== "cosmograph");
    // the page's load event can wait on a request that never settles; the app is ready when its project is
    await page.goto(`${u.origin}${u.pathname}?features=${ids.join(",")}`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Project: Les Miserables" }).waitFor();
    await h.app.opened();
    await h.app.closeToast();
    await h.app.mode("2D");
    await h.app.settled(); // 2D lays the graph out again
    await h.app.camera("Fit");
    await h.app.settled();
    // one wheel notch out, so the lowest node clears the canvas toolbar
    await page.mouse.move(990, 520);
    await page.mouse.wheel(0, 100);
    await h.app.settled();
}

/**
 * Names on the canvas: a Label (the node's name, size 110) on each given style layer, set through the
 * Style panel (setup only), then the Everything layer back in the inspector.
 * @param h - the hand
 * @param layers - style layer names, e.g. ["Hovered", "Selected"]
 */
export async function labelNames(h, layers) {
    const { page } = h;
    for (const layer of layers) {
        await page.getByRole("treeitem", { name: new RegExp(`^${layer},`) }).click();
        await page.getByRole("button", { name: "Add to node text" }).click();
        await page.getByRole("menuitem", { name: "Label" }).click();
        await page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: "name", exact: true }).click();
        await page.getByRole("button", { name: "Node text settings" }).click();
        const text = page.getByRole("dialog", { name: "Node text" });
        await text.getByRole("button", { name: "Add node label size" }).click();
        await text.getByRole("spinbutton", { name: "Node label size" }).fill("110");
        await text.getByRole("spinbutton", { name: "Node label size" }).press("Enter");
        await page.getByRole("button", { name: "Close Node text" }).click();
        await text.waitFor({ state: "hidden" });
    }
    await page.getByRole("treeitem", { name: /^Everything,/ }).click();
}

/**
 * Where a node is drawn, as a page box the hand can aim at, read from graphty-element's public
 * nodeScreenPosition (setup only; the clip itself only moves and clicks).
 * @param h - the hand
 * @param id - the node's id (the character's name in Les Miserables)
 * @returns a box around the node's center
 */
export async function nodeBox(h, id) {
    const p = await h.page.evaluate((nodeId) => {
        const el = globalThis.document.querySelector("graphty-element");
        const at = el.nodeScreenPosition(nodeId);
        const r = el.getBoundingClientRect();
        return at?.visible ? { x: at.x + r.left, y: at.y + r.top, radius: at.radius } : null;
    }, id);
    if (!p) throw new Error(`${id} is not on screen`);
    const s = Math.max(4, p.radius * 0.8);
    return { x: p.x - s, y: p.y - s, width: 2 * s, height: 2 * s };
}

/**
 * Run one analysis through Analyze (setup only, no pacing): filter, pick, Run, wait for its legend.
 * @param h - the hand
 * @param words - what to type in Filter analyses
 * @param name - the analysis, as its row names it
 */
export async function analyze(h, words, name) {
    const { page } = h;
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter analyses" }).fill(words);
    await page.getByRole("option", { name, exact: true }).click();
    await page.getByRole("button", { name: `Run ${name}` }).click();
    await page.getByText(`Color: ${name}`).first().waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "Analyze" }).waitFor({ state: "hidden" });
}
