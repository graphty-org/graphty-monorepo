// Round 2, clip 3.2: Layout > Map (flat: the graph is already in 2D), with Arc move: the accounts fly once to their nine cities
// and the transfers that cross the world show where the money goes: into Riga.
import { mapOnCamera, openMapForm, pick } from "../ch6/map.js";
import { MONEY_CLIP, moneyCase } from "./money.js";

export default {
    id: "money-map",
    ...MONEY_CLIP,
    caption: "The money lands in Riga",
    async setup(h) {
        const { page } = h;
        await moneyCase(h);
        // the transition is a graph setting, written when picked: set it here so the shot is short.
        // The Map form's other choices (base map, Same place) are not kept unless applied, and
        // applying then undoing leaves a notice up, so the clip films the defaults: the satellite
        // map, accounts spread around their city.
        const panel = await openMapForm(page);
        await pick(page, "Transition", "Arc move");
        await page.keyboard.press("Escape");
        while (await panel.isVisible()) {
            await page.keyboard.press("Escape");
            await h.app.frames(2);
        }
        await h.park({ x: 1120, y: 880 });
    },
    leadMs: 500,
    async run(h) {
        const panel = await mapOnCamera(h);
        await h.click(panel.getByRole("button", { name: "Apply" }));
        await panel.waitFor({ state: "hidden" });
        await h.move({ x: 1540, y: 900, width: 100, height: 60 }); // off the map while they fly
        h.mark("flying");
        await h.app.settled();
        h.mark("landed");
    },
    holdMs: 3000,
};
