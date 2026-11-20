// Chapter 9, clip 5: back on the start page, "Welcome back." offers Resume; one click brings it back.
import { mainMenu, styled } from "./styled.js";

export default {
    id: "keeps-your-work",
    chapter: 9,
    caption: "Close the tab, come back, carry on.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await styled(h, { size: false }); // see styled.js: a sized project reopens with nodes missing
        await mainMenu(page, "Save");
        const save = page.getByRole("dialog", { name: /^Save Les Miserables/ });
        await save.getByRole("button", { name: "Save", exact: true }).click();
        await save.waitFor({ state: "hidden" });
        await mainMenu(page, "Back to start");
        await page.getByRole("heading", { name: "Welcome back." }).waitFor();
        await h.park({ x: 1000, y: 820 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^Resume Les Miserables/ }));
        await h.waitFor(page.getByRole("region", { name: "Legend" }).getByRole("group", { name: "Color: Louvain" }));
        // the hand moves only once the drawing is still, so a loading stall cannot make it jump
        await h.app.settled();
        await h.move({ x: 1480, y: 830, width: 120, height: 80 });
        h.mark("project back");
    },
    leadMs: 500,
    holdMs: 1500,
};
