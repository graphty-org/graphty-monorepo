// Round 2, clip 3.6: Play, in Grow mode at 2x: June and July fill in with ordinary transfers; on
// 14 August the five mules' wide blue transfers (the Money trail layer) reach the collector in Riga.
// Key moment: a 5 s hold on the end state.
// Betweenness is not rerun as the window moves: the first take did, and filmed at 5.9 fps.
import { MONEY_CLIP, moneyCase, onMap, timeline, timelineSettings, toStart } from "./money.js";

export default {
    id: "press-play",
    ...MONEY_CLIP,
    caption: "Mid-August: payments flow to Riga",
    async setup(h) {
        const { page } = h;
        await moneyCase(h);
        await onMap(h);
        // no Betweenness: the tour cuts the brokers clips, and its legend reads "out of date" while playing
        await timeline(h);
        await timelineSettings(h, { mode: "Grow" }); // each day adds to what came before
        const dock = page.getByRole("region", { name: "Timeline" });
        await dock.getByRole("button", { name: "Speed 1x" }).click();
        await dock.getByRole("button", { name: "Speed 2x" }).waitFor();
        await toStart(h);
        await h.park({ x: 560, y: 860 }); // near Play
    },
    leadMs: 500,
    async run(h) {
        const dock = h.page.getByRole("region", { name: "Timeline" });
        await h.click(dock.getByRole("button", { name: "Play" }));
        await h.move({ x: 1540, y: 400, width: 100, height: 60 }); // off the map while it plays
        await h.waitFor(dock.getByRole("button", { name: "Play" })); // play stops by itself at the end
        await h.app.settled();
        h.mark("end");
    },
    holdMs: 5000,
};
