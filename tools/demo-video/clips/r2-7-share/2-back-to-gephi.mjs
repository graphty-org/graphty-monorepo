// Round 2, clip 7.2: Main menu > Export..., the Format list (Cytoscape, GraphML, GEXF, ...), Gephi
// CSV: the preview's header row lists the Louvain and Betweenness results as columns; Export.
// (GEXF's preview opens on the XML head, its results a dozen lines down, out of the short box.)
import { bankCase, CASE_CLIP } from "./case.js";

export default {
    id: "back-to-gephi",
    ...CASE_CLIP,
    caption: "Export to Gephi, Cytoscape or CSV",
    async setup(h) {
        await bankCase(h, { betweenness: true });
        await h.park({ x: 170, y: 190 }); // near the Main menu, so the first move is short
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Main menu" }));
        await h.click(page.getByRole("menuitem", { name: "Export..." }));
        const dialog = page.getByRole("dialog", { name: "Export" });
        h.mark("dialog");
        // the hand drifts into the dialog (a move off the controls ends the menu's run of input, so
        // the push-in after "dialog" frames the dialog, not the menu)
        await h.move({ x: 900, y: 420, width: 200, height: 60 });
        await h.click(dialog.getByRole("combobox", { name: "Format" }));
        // the list stays open a moment: the formats other tools read are the point of the shot
        await h.hover(page.getByRole("option", { name: "Cytoscape.js JSON", exact: true }), 700);
        await h.click(page.getByRole("option", { name: "Gephi CSV", exact: true }));
        await h.waitFor(dialog.getByText(/results\.louvain/).first());
        // the eye reads the columns (Louvain, Betweenness) while the hand waits on Export
        const download = page.waitForEvent("download");
        await h.hover(dialog.getByRole("button", { name: "Export", exact: true }), 700);
        await h.click(dialog.getByRole("button", { name: "Export", exact: true }));
        await download;
        h.mark("exported");
    },
    holdMs: 2500,
};
