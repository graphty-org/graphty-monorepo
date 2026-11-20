// Chapter 3, clip 1: the Layout list, then Circle: the nodes glide into a ring.
import { base } from "./base.js";

export default {
    id: "list-of-layouts",
    chapter: 3,
    // the number is set in setup from the catalog the start page's fact bar counts
    caption: "Many ways to arrange a network, all in one list.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        // read only, through the element's public session: the same count the start page shows
        const n = await h.page.evaluate(
            () => globalThis.document.querySelector("graphty-element").session.catalog.layouts().length,
        );
        this.caption = `${n} ways to arrange a network, all in one list.`;
        await h.park({ x: 1010, y: 860 });
    },
    leadMs: 500,
    holdMs: 1800,
    async run(h) {
        const { page } = h;
        await h.click("Layout");
        await h.scroll(page.getByRole("listbox", { name: "Layouts" }), 260, { ms: 600 });
        await h.click(page.getByRole("option", { name: /^Circle Places/ }));
        await h.click(page.getByRole("button", { name: "Apply" }));
        h.mark("applied");
        await h.move({ x: 1460, y: 900, width: 120, height: 60 }); // off the graph while it glides
    },
};
