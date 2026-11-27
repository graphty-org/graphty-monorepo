// Chapter 3, Create and load styles, beat 4: save your styles to a file. Les Miserables with every
// chapter 2 style on it, in 3D, framed whole and turning slowly (setup); the hand opens Save as...,
// picks the Style only preset and a section file, and saves. The take ends on the app's "Saved"
// report (Done would leave a notice over the canvas). That report wrongly lists Everything (whose
// node color follows a Louvain result) as left out, "Picks nodes by id" (an app defect, reported).
import { noLegend, spin, STYLES_CLIP, tap, withEdgeLabels } from "./styles.js";

export default {
    id: "styles-save",
    ...STYLES_CLIP,
    chapter: 3,
    caption: "Save your styles to a file",
    async setup(h) {
        await withEdgeLabels(h);
        await noLegend(h);
        await spin(h, 1);
        await h.park({ x: 600, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await tap(h, page.getByRole("button", { name: "Main menu" }));
        await tap(h, page.getByRole("menuitem", { name: "Save as..." }));
        const dialog = page.getByRole("dialog", { name: /^Save .* as$/ });
        h.mark("dialog");
        await tap(h, dialog.getByRole("combobox", { name: "Preset" }));
        await tap(h, page.getByRole("option", { name: "Style only", exact: true }));
        await tap(h, dialog.getByText("Section file", { exact: true }));
        await h.waitFor(dialog.getByText(/\.graphty-style\.json$/));
        await tap(h, dialog.getByRole("button", { name: "Save copy" }));
        await h.waitFor(page.getByRole("dialog", { name: /^Saved / }));
        h.mark("saved");
    },
    holdMs: 1500,
};
