// Chapter 6, present and share: notes. A click on Valjean, Notes' Add note, a line typed and saved:
// the note is about Valjean, signed, and the inspector counts it on the node.
import { nodeBox, REST, yourName } from "./adv.js";

let valjean;

export default {
    id: "advanced-notes",
    chapter: 6,
    caption: "Pin a note to a node",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await yourName(h, "Ada");
        await page.getByRole("toolbar", { name: "Places" }).getByRole("button", { name: "Notes" }).click();
        await page.getByRole("region", { name: "Notes place" }).waitFor();
        await h.app.ready2D();
        valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await h.click(valjean);
        await h.waitFor(
            page.getByRole("complementary", { name: "Inspector" }).getByRole("heading", { name: /^Valjean/ }),
        );
        await h.click(page.getByRole("button", { name: "Add note" }));
        const note = page.getByRole("textbox", { name: "Note" });
        await h.click(note);
        await h.type("The hero of the story");
        await h.click(page.getByRole("button", { name: "Save note" }));
        await h.waitFor(page.getByText("The hero of the story").first());
        await h.move(REST);
        h.mark("pinned");
    },
    holdMs: 2500,
};
