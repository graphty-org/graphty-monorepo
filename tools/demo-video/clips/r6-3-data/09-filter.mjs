// Chapter 8, Data management: the Les Miserables network; a new filter on edges by shared_chapters
// is open in setup; the hand types 5 (the card counts 51 of 254 edges), clicks Done, and only the
// strong ties stay. An edge filter, not a node one: a node filter on Degree counts its matches but
// leaves every node drawn (reported as an app defect).
//
// The network is drawn as a Circle in setup: the filter keeps all 77 nodes and the layout runs again
// after Done, and a circle puts every node back where it was (a force layout scatters the nodes the
// filter leaves unconnected), so before and after compare.
import { applyLayout } from "../r2-5b-and-more/more.js";
import { dataPlace, flat, REST } from "./data.js";

export default {
    id: "data-filter",
    chapter: 8,
    caption: "Keep only the edges that match",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await flat(h);
        await applyLayout(h, /^Circle\b/);
        await h.app.ready2D();
        // the edges dark and wide enough to read
        await h.app.layerEdges("Everything", { color: "4B5563", width: 32 });
        await h.app.settled();
        await dataPlace(h);
        await page.getByRole("button", { name: "Add filter" }).first().click();
        const editor = page.getByRole("dialog", { name: /^Filters \// });
        await editor
            .locator("label")
            .filter({ hasText: /^Edges$/ })
            .first()
            .click();
        await editor.getByRole("button", { name: "Value", exact: true }).click();
        await page
            .getByRole("listbox", { name: "Attributes" })
            .getByRole("option", { name: /^shared_chapters/ })
            .click();
        await editor.getByRole("textbox", { name: /from, number$/ }).waitFor();
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const editor = page.getByRole("dialog", { name: /^Filters \// });
        await h.click(editor.getByRole("textbox", { name: /from, number$/ }));
        await h.type("5");
        await h.press("Enter");
        await h.waitFor(editor.getByText("51 of 254").first());
        h.mark("matches");
        await h.pause(600);
        await h.click(editor.getByRole("button", { name: "Done" }));
        await h.waitFor(page.getByRole("button", { name: /^Filter: .*51 of 254 edges/ }));
        h.mark("filtered");
        await h.move(REST);
        await h.app.settled();
    },
    holdMs: 2000,
};
