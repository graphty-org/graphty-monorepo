/**
 * What a route's checks read: what the user would see, through graphty-element's public API in the
 * page (the `session` of the page's `<graphty-element>`). Each reader takes the page first; a check
 * gets them bound to its page as `g.<reader>(...)`, beside `g.page` for the accessibility tree.
 *
 * These are part of the outcome checks: tools/dry-run-check-guard.mjs refuses a branch that removes
 * or changes one, as it does a check. Adding one is free.
 */

// Runs in the page: every node's or edge's drawn value of one style channel, by id. A color is
// "#RRGGBB"; a size, width, shape or label is the value itself.
function lookInPage([kind, channel]) {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) throw new Error("no graph is open");
    const out = {};
    for (const rec of kind === "node" ? s.data.nodes() : s.data.edges()) {
        const v = s.styles.explain({ [kind]: rec.id }).merged[channel];
        out[rec.id] = v && typeof v === "object" && "hex" in v ? v.hex.toUpperCase() : (v ?? null);
    }
    return out;
}

// Runs in the page: every node's or edge's record, its id and its columns.
function recordsInPage(kind) {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) throw new Error("no graph is open");
    return (kind === "node" ? s.data.nodes() : s.data.edges()).map((r) => ({ ...r }));
}

/**
 * The open graph's size.
 * @param page the Playwright page
 * @returns {Promise<{nodes: number, edges: number}>} the open graph's size
 */
export const counts = (page) =>
    page.evaluate(() => {
        const s = document.querySelector("graphty-element")?.session;
        if (!s) throw new Error("no graph is open");
        return { nodes: s.data.nodes().length, edges: s.data.edges().length };
    });

/**
 * Each node's drawn value of one style channel.
 * @param page the Playwright page
 * @param channel the style channel ("node.size")
 * @returns node id to its drawn value of a style channel ("node.color", "node.size", "node.label")
 */
export const nodeLook = (page, channel) => page.evaluate(lookInPage, ["node", channel]);

/**
 * Each edge's drawn value of one style channel.
 * @param page the Playwright page
 * @param channel the style channel ("node.size")
 * @returns edge id to its drawn value of a style channel ("edge.color", "edge.width")
 */
export const edgeLook = (page, channel) => page.evaluate(lookInPage, ["edge", channel]);

/**
 * Every node's record.
 * @param page the Playwright page
 * @returns every node's record: its `id` and its columns (`name`, `role`, ...)
 */
export const nodes = (page) => page.evaluate(recordsInPage, "node");

/**
 * Every edge's record.
 * @param page the Playwright page
 * @returns every edge's record: its `id`, its ends and its columns
 */
export const edges = (page) => page.evaluate(recordsInPage, "edge");

/**
 * The style layers' names.
 * @param page the Playwright page
 * @returns the style layers' names, bottom to top
 */
export const layers = (page) =>
    page.evaluate(() =>
        document
            .querySelector("graphty-element")
            .session.styles.list()
            .map((l) => l.name),
    );

/**
 * What the pointer and the clicks have done: the node under the pointer and what is selected.
 * @param page the Playwright page
 * @returns the hovered node (or null) and the selected nodes' and edges' ids
 */
export const selection = (page) =>
    page.evaluate(() => {
        const s = document.querySelector("graphty-element")?.session;
        if (!s) throw new Error("no graph is open");
        const ids = (list) => list.map(String);
        const hovered = s.selection.hovered;
        return {
            hovered: hovered === null ? null : String(hovered),
            nodes: ids(s.selection.nodes),
            edges: ids(s.selection.edges),
        };
    });

/**
 * What a route recorded in the page while it walked (globalThis.acceptanceRecord), for checks on what
 * happened during the walk rather than at its end (a layout's animation, each hover in turn).
 * @param page the Playwright page
 * @returns whatever the route recorded, or undefined
 */
export const recorded = (page) => page.evaluate(() => globalThis.acceptanceRecord);
