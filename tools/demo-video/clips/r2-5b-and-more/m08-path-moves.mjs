// "And more", beat 8: the Comets shader on the ACHE to APOE path's edges only (its own layer).
import { zoomToward } from "../r2-1-fraud-ring/bank.js";
import { alzLouvain, ALZ_CLIP, labelLayer, runPath } from "../r2-2-alzheimer/alz.js";
import { hideLegend, inspector, MORE, REST } from "./more.js";

export default {
    id: "path-moves",
    ...ALZ_CLIP,
    chapter: MORE,
    caption: "Animate a path for a talk",
    async setup(h) {
        const { page } = h;
        await alzLouvain(h);
        await hideLegend(page);
        await h.app.layerEdges("Everything", { color: "E4E4E4" }); // the rest pale, so the path stands out
        await runPath(h, "ACHE", "APOE");
        await h.app.layerEdges("Shortest path", { width: 90 });
        await labelLayer(h, "Shortest path");
        // close in on the path, so its three proteins and the comets on it read
        await zoomToward(h, "APP", 6);
        await inspector(page).getByRole("tab", { name: "Style", exact: true }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
        await h.app.settled();
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByRole("button", { name: "Add to edge shaders" }));
        const shaders = page.getByRole("dialog", { name: "Shaders" });
        await h.click(shaders.getByRole("button", { name: "Comets", exact: true }));
        // picking a tile may close the picker itself; close it by hand only if it stays
        if (await shaders.isVisible()) await h.click(shaders.getByRole("button", { name: "Close Shaders" }));
        await h.move(REST);
        h.mark("comets");
    },
    holdMs: 2500,
};
