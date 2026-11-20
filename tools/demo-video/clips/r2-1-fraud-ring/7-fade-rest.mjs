// Round 2, clip 1.7: the Louvain folder's eye turns the community colors off, then Everything's nodes
// go pale gray: the red ring is what stands out. Key moment: held 5 s.
//
// Fading Everything's opacity instead (the color picker's Opacity slider) fades the ring too: the
// Fraud ring layer sets only a color, so it takes Everything's opacity. A pale color leaves it red.
import { BANK_CLIP, bankNeighborhood, bankRing, bankRule, closeToasts, RING_ADDRESS, zoomToward } from "./bank.js";

export const FADE_COLOR = "lightgray";

export default {
    id: "fade-rest",
    ...BANK_CLIP,
    caption: "Fade everything but the ring",
    async setup(h) {
        const { page } = h;
        await bankRule(h);
        await zoomToward(h, RING_ADDRESS, 3); // the framing clip 1.6 ended on
        await bankNeighborhood(h);
        await bankRing(h);
        // the inspector on Everything's node style
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await insp.getByRole("tab", { name: "Style" }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
        await closeToasts(h);
        await h.app.settled();
        await h.park({ x: 420, y: 520 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.click("Hide Louvain");
        await h.pause(900); // the community colors go
        const color = insp.getByRole("textbox", { name: /^Node color, set here/ });
        await h.click(color);
        await page.keyboard.press("Control+A"); // type over the old color
        await h.type(FADE_COLOR);
        await h.press("Enter");
        await h.move({ x: 1760, y: 720, width: 80, height: 60 });
        h.mark("ring alone");
    },
    holdMs: 5000,
};
