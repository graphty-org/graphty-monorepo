// Chapter 8, clip 3: nodes sized by Degree (1 to 8) and the two biggest team-ups labeled; as play
// grows the graph, Infinity War and then Endgame arrive bigger than everything before them. A
// film's degree is its cast, which every one of its edges carries on the film's own date, so
// results are kept as they are ("Keep"): "Rerun automatically" gives the same sizes but reruns
// Degree on every step and stalls the drawing (10.7 fps, 22 s for 2008-2020).
import { analyze, labelLayer, marvel2D, refit, sizeByDegree, speed, timelineSettings, toStart } from "./setup.js";

export default {
    id: "biggest-team-up",
    chapter: 8,
    caption: "Bigger means more cast: watch the biggest team-up take over.",
    dataset: "Marvel films",
    async setup(h) {
        await marvel2D(h);
        await timelineSettings(h, { results: "Keep" });
        await analyze(h, "Degree");
        await sizeByDegree(h, 8);
        await labelLayer(h, "name == 'Avengers: Endgame' || name == 'Avengers: Infinity War'", "Biggest team-ups", 2.5);
        // the legend would list the label settings (location, box, letter size) as if they were data
        await h.page.getByRole("button", { name: "Legend", exact: true }).click();
        await h.page.getByRole("region", { name: "Legend" }).waitFor({ state: "hidden" });
        await speed(h, 4);
        await refit(h);
        await toStart(h); // open on 2008, not on the whole graph
        await h.park({ x: 560, y: 860 }); // near Play
    },
    async run(h) {
        const dock = h.page.getByRole("region", { name: "Timeline" });
        await h.click(dock.getByRole("button", { name: "Play" }));
        // the hand rests on the button (Play becomes Pause); at 4x a year passes in about a quarter
        // second, so pressing as 2015 shows stops on or just after Endgame (2019)
        await h.waitFor(dock.getByRole("button", { name: /^Time window .* - (2015|2016|2017|2018|2019|202\d)$/ }));
        await h.click(dock.getByRole("button", { name: "Pause" }));
        await h.move({ x: 1420, y: 820, width: 140, height: 60 }); // off the graph for the hold
        h.mark("Endgame");
    },
    holdMs: 1800,
};
