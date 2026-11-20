// Intro, shot 1: graphty.app's start page with Les Miserables flat and plain; the hand clicks the
// Communities chip and the groups color in at once, so the video opens on a result, not a still page.
import { chip, flatStart, hero } from "./shared.js";

export default {
    id: "intro-groups",
    chapter: 0,
    caption: "Characters in Les Miserables, linked when they meet. Which groups form?",
    async setup(h) {
        const { page } = h;
        await flatStart(h);
        // Communities is on when the page loads: off, so the click is what colors the groups
        await chip(page, "Communities").click();
        await chip(page, "Communities").and(page.locator("[aria-pressed=false]")).waitFor();
        await h.app.settled(hero(page));
        await h.park({ x: 1700, y: 170 }); // beside the chips, off the graph: a path over it would light up the nodes it crosses
    },
    async run(h) {
        await h.click(chip(h.page, "Communities"));
        await h.move({ x: 1760, y: 210, width: 60, height: 40 }); // off the graph, by the chips
        await h.app.settled(hero(h.page));
    },
    leadMs: 300,
    holdMs: 1500,
};
