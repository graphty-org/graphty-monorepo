// Chapter 9, advanced styling: background and lighting. Graph settings > Background + > Image >
// Upload image (a dusk sky, through the drawn Open dialog), then Lighting from Flat to Studio.
import { inspector, ready3D, REST, SKY, everything, setNumber } from "./adv.js";

export default {
    id: "advanced-background-light",
    chapter: 9,
    caption: "A background image and studio lighting",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await ready3D(h);
        await everything(h, "Node");
        await setNumber(h, "Node size", 1.8);
        await h.app.settled();
        await page.getByRole("button", { name: "Graph settings" }).click();
        await inspector(page).getByRole("combobox", { name: "Lighting" }).click();
        await page.getByRole("option", { name: "Flat", exact: true }).click();
        await h.app.settled();
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const insp = inspector(page);
        await h.click(insp.getByRole("button", { name: "Add to background" }));
        await h.click(page.getByRole("menuitem", { name: "Image", exact: true }));
        await h.openFile(insp.getByRole("button", { name: "Upload image" }), SKY, {
            folder: "Pictures",
            files: ["dusk-sky.png", "studio-gray.png", "night-city.jpg", "forest.jpg"],
        });
        await h.waitFor(insp.getByRole("button", { name: "Remove background image" }));
        await h.app.settled();
        h.mark("sky");
        await h.click(insp.getByRole("combobox", { name: "Lighting" }));
        await h.click(page.getByRole("option", { name: "Studio", exact: true }));
        await h.move(REST);
        await h.app.settled();
        h.mark("studio");
    },
    holdMs: 2500,
};
