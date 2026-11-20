// Round 2, "And more" (between chapters 5 and 6): what the montage beats share. A .js file, so
// record.mjs does not take it for a clip. Each beat is one feature, cut short in the edit; its data
// is the bank or the Alzheimer's network the viewer already knows. Setup only, through the app's UI.

/** The montage sits between chapter 5 and chapter 6. */
export const MORE = 5.5;

/** Where the hand rests after a beat: the canvas's empty lower right, off the graph. */
export const REST = { x: 1460, y: 900, width: 100, height: 60 };

/**
 * The Layout popover.
 * @param page - the Playwright page
 * @returns its locator
 */
export const layoutPanel = (page) => page.getByRole("dialog", { name: "Layout" });

/**
 * Esc until the Layout popover is gone (a form steps back to the list first).
 * @param page - the Playwright page
 */
export async function closeLayout(page) {
    const panel = layoutPanel(page);
    while (await panel.isVisible()) await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
}

/**
 * Toolbar Layout, a layout's form (setup pace).
 * @param page - the Playwright page
 * @param row - the row's accessible name, from its start
 */
export async function openLayoutForm(page, row) {
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    const option = layoutPanel(page).getByRole("option", { name: row }).first();
    await option.scrollIntoViewIfNeeded();
    await option.click();
}

/**
 * How nodes travel to the next layout (a graph setting each form writes at once), set through a
 * layout's form, which is then left without applying anything.
 * @param page - the Playwright page
 * @param row - a layout row whose form has Transition
 * @param name - the transition ("Arc move")
 * @param seconds - how long it takes
 */
export async function setTransition(page, row, name, seconds) {
    await openLayoutForm(page, row);
    const panel = layoutPanel(page);
    await panel.getByRole("combobox", { name: "Transition" }).click();
    await page.getByRole("option", { name, exact: true }).click();
    const field = panel
        .getByRole("textbox", { name: "Seconds" })
        .or(panel.getByRole("spinbutton", { name: "Seconds" }));
    await field.fill(String(seconds));
    await field.press("Tab");
    await closeLayout(page);
}

/**
 * Apply a layout and let it come to rest, then frame it (setup pace).
 * @param h - the hand
 * @param row - the row's accessible name, from its start
 */
export async function applyLayout(h, row) {
    const { page } = h;
    await openLayoutForm(page, row);
    await layoutPanel(page).getByRole("button", { name: "Apply" }).click();
    await layoutPanel(page).waitFor({ state: "hidden" });
    await h.app.settled();
    await fitWide(h);
}

/**
 * Fit, then one wheel notch out so the lowest nodes clear the canvas toolbar (setup only).
 * @param h - the hand
 */
export async function fitWide(h) {
    const { page } = h;
    await h.app.camera("Fit");
    await h.app.settled();
    const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 100);
    await h.app.settled();
}

/**
 * The recorded path to a layout: Layout, the row (scrolled into the list's view first), Apply.
 * @param h - the hand
 * @param row - the row's accessible name, from its start
 * @param [apply] - false to stop on the layout's form
 */
export async function pickLayout(h, row, apply = true) {
    const { page } = h;
    await h.click("Layout");
    const list = page.getByRole("listbox", { name: "Layouts" });
    const option = page.getByRole("option", { name: row }).first();
    await list.waitFor();
    const lb = await list.boundingBox();
    const ob = await option.boundingBox();
    const top = Math.max(lb.y, 0);
    const bottom = Math.min(lb.y + lb.height, page.viewportSize().height);
    if (ob.y < top || ob.y + ob.height > bottom)
        await h.scroll(list, Math.round(ob.y + ob.height / 2 - (top + bottom) / 2), { ms: 600 });
    await h.click(option);
    if (apply) await h.click(page.getByRole("button", { name: "Apply" }));
}

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * The canvas legend hidden (setup only), so it covers no corner of the drawing.
 * @param page - the Playwright page
 */
export async function hideLegend(page) {
    const on = page.getByRole("button", { name: "Legend", exact: true, pressed: true });
    if (await on.isVisible()) await on.click();
    await page.getByRole("button", { name: "Legend", exact: true, pressed: false }).waitFor();
}

/**
 * Every node of a layer named from a column, in screen pixels so the names read at any zoom (setup
 * only).
 * @param h - the hand
 * @param layer - the layer's name in Style layers
 * @param column - the Label list's option ("label")
 * @param px - the text size in screen pixels
 */
export async function labelsFrom(h, layer, column, px) {
    const { page } = h;
    await page.getByRole("treeitem", { name: new RegExp(`^${layer}, `) }).click();
    await inspector(page).getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await inspector(page).getByRole("button", { name: "Add to node text" }).click();
    await page.getByRole("menuitem", { name: "Label", exact: true }).click();
    await page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: column, exact: true }).click();
    await page.getByRole("button", { name: "Node label settings" }).click();
    const settings = page.getByRole("dialog", { name: "Label settings" });
    await settings.getByRole("combobox", { name: "Size in" }).click();
    await page.getByRole("option", { name: "Screen pixels" }).click();
    const size = settings.getByRole("spinbutton", { name: /^Size, / });
    await size.fill(String(px));
    await size.press("Enter");
    const close = page.getByRole("button", { name: "Close Label settings" });
    if (await close.isVisible()) await close.click();
    await settings.waitFor({ state: "hidden" });
}
