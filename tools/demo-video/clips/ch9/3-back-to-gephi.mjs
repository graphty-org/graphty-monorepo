// Chapter 9, clip 3: Export..., the Format list (every format the app writes), Gephi CSV: the preview
// shows the analysis results (results.betweenness.*, results.louvain.*) as columns.
import { styled } from "./styled.js";

export default {
    id: "back-to-gephi",
    chapter: 9,
    caption: "Export to Gephi, Cytoscape, GraphML, CSV and more.",
    dataset: "Les Miserables",
    async setup(h) {
        await styled(h);
        await h.park({ x: 170, y: 190 }); // near the Main menu, so the first move is short
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Main menu" }));
        await h.click(page.getByRole("menuitem", { name: "Export..." }));
        const dialog = page.getByRole("dialog", { name: "Export" });
        await h.click(dialog.getByRole("combobox", { name: "Format" }));
        await h.click(page.getByRole("option", { name: "Gephi CSV", exact: true }));
        await h.waitFor(dialog.getByText("results.louvain.group", { exact: false }).first());
        // the hand leaves the preview so the columns read clearly
        await h.move({ x: 1180, y: 700, width: 100, height: 60 });
        h.mark("gephi csv preview");
    },
    leadMs: 500,
    holdMs: 1600,
};
