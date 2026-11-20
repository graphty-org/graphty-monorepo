// "And more", beat 4: the bank close in on the ring's corner, every account named from its label
// column (set in setup); the hand binds edge width to the transfer amount and widens the range, so
// the big transfers stand out.
import { BANK_CLIP, bankLouvain, RING_ADDRESS, tap, zoomToward } from "../r2-1-fraud-ring/bank.js";
import { hideLegend, inspector, labelsFrom, MORE, REST } from "./more.js";

export default {
    id: "labels",
    ...BANK_CLIP,
    chapter: MORE,
    caption: "Edge width from a column",
    async setup(h) {
        const { page } = h;
        await bankLouvain(h);
        await hideLegend(page);
        await zoomToward(h, RING_ADDRESS, 4);
        // names that would overlap are left out, so the rest read
        await page.getByRole("button", { name: "Graph settings" }).click();
        await page.getByRole("switch", { name: "Hide overlapping labels" }).check();
        await page.keyboard.press("Escape");
        await labelsFrom(h, "Everything", "label", 15);
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
        await h.app.settled();
        await h.park({ x: 1600, y: 600 });
    },
    async run(h) {
        const { page } = h;
        await tap(h, inspector(page).getByRole("button", { name: "Edge width by attribute" }));
        await tap(h, page.getByRole("option", { name: /^amount\b/ }));
        // the binding starts at a narrow range: widen it in its popover
        await tap(h, inspector(page).getByRole("button", { name: /^Edge width: amount/ }));
        await tap(h, page.getByRole("spinbutton", { name: "Width to" }));
        await h.press("Control+a");
        await h.type("60");
        await h.press("Enter");
        await h.press("Escape");
        await h.waitFor(inspector(page).getByRole("button", { name: /^Edge width: amount, .* to 60$/ }));
        await h.move(REST);
        h.mark("widths");
    },
    holdMs: 2000,
};
