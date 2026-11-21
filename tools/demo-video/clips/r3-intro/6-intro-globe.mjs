// Round 3, intro shot 6, cut full-bleed: the airline network on the satellite globe, airports in
// bright yellow, turning (Auto-rotate, key 9). The globe and its tiles are in before recording starts.
import { FLIGHTS, still } from "../ch6/map.js";
import { airportsGlobe, INTRO_CLIP, TURNING } from "./intro.js";

export default {
    id: "intro-globe",
    ...INTRO_CLIP,
    caption: "On a globe",
    dataset: FLIGHTS,
    async setup(h) {
        const { page } = h;
        await airportsGlobe(h);
        await h.app.camera("Fit");
        await still(page); // the satellite tiles are in
        await h.park({ x: -10, y: -10 });
    },
    ...TURNING,
};
