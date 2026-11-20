// Intro, shot 2: Key players: the central characters grow, Valjean the largest.
import { chip, flatStart, hero } from "./shared.js";

export default {
    id: "intro-key-players",
    chapter: 0,
    caption: "Who matters most? The biggest node: Valjean holds the story together.",
    async setup(h) {
        await flatStart(h);
        await h.park({ x: 1700, y: 170 }); // beside the chips, off the graph: a path over it would light up the nodes it crosses
    },
    async run(h) {
        await h.click(chip(h.page, "Key players"));
        await h.waitFor(h.page.getByText(/is the biggest\.$/));
        h.mark("sized");
        await h.move({ x: 1760, y: 210, width: 60, height: 40 }, { slow: 1.3 }); // off the graph
        await h.app.settled(hero(h.page));
    },
    leadMs: 500,
    holdMs: 1800,
};
