// Round 3, intro shot 5 and the Go big chapter's last clip: Force lays out 20,000 nodes on the
// graphics card, from a random scatter into colored clumps, while the status bar reads "WebGPU:
// enabled". The graph is the start page's LFR benchmark with large, well separated communities
// (round 1's 50,000 nodes with the defaults made about 1,200 tiny communities: a hairball), colored
// by Louvain so each clump gets its own color. Built on round 1's ch7 big.js (git 289685c649).
// The cosmograph and file-styles experiments are off, as for the other big-graph clips.
import { analyze } from "../r2-1-fraud-ring/bank.js";
import { hideLegend } from "../r2-5b-and-more/more.js";
import { canvasColor, everythingSize } from "./intro.js";

/** The LFR benchmark's form, as the dialog labels its fields. */
const LFR = { Nodes: "20000", "Smallest community": "400", "Largest community": "1500", Mixing: "0.03" };

/**
 * Toolbar Layout, a layout by name, then Apply (setup only: straight clicks).
 * @param page - the Playwright page
 * @param name - the layout's name ("Random")
 */
async function layout(page, name) {
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page
        .getByRole("option", { name: new RegExp(String.raw`^${name}\b`) })
        .first()
        .click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
}

/**
 * The status bar's WebGPU chip, once the app has found the graphics card.
 * @param page - the Playwright page
 * @returns its locator
 */
const webGpuChip = (page) => page.getByRole("contentinfo", { name: "Status" }).getByText("WebGPU: enabled");

export default {
    id: "gpu-resolve",
    chapter: 8,
    featuresOff: ["file-styles", "cosmograph"],
    caption: "20,000 nodes, laid out on your GPU",
    async setup(h) {
        const { page } = h;
        page.setDefaultTimeout(0); // big-graph steps take their own time; every wait is on a condition
        const tile = page.getByRole("button", { name: /^Generate a graph: LFR benchmark/ });
        await tile.scrollIntoViewIfNeeded();
        await tile.click();
        const dialog = page.getByRole("dialog", { name: "LFR benchmark" });
        for (const [name, v] of Object.entries(LFR)) await dialog.getByRole("textbox", { name, exact: true }).fill(v);
        await dialog.getByRole("button", { name: "Generate" }).click({ noWaitAfter: true });
        await page.getByRole("treeitem", { name: /^Everything, .*\b20,000 nodes\b/ }).waitFor({ state: "attached" });
        await h.app.settled();
        await analyze(h, "louv", "Louvain"); // categorical colors (the planted column is a numeric ramp)
        await hideLegend(page);
        await canvasColor(page);
        await everythingSize(page, "0.5");
        await layout(page, "Random");
        await h.app.settled();
        await h.app.camera("Fit");
        await h.app.settled();
        await webGpuChip(page).waitFor();
        await h.park({ x: 1300, y: 900 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Layout", exact: true }));
        // the list opens scrolled to the current layout (Random, near its end): scroll up to Force
        await h.scroll(page.getByRole("listbox", { name: "Layouts" }), -3000);
        await h.click(page.getByRole("option", { name: /^Force\b/ }).first());
        await h.click(page.getByRole("button", { name: "Apply", exact: true }));
        h.mark("layout started");
        // down along the bottom edge to the chip, never across the drawing (hover picking over
        // 20,000 nodes stalls the page)
        await h.move(webGpuChip(page));
        await h.app.settled();
        h.mark("settled");
    },
    holdMs: 2500,
};
