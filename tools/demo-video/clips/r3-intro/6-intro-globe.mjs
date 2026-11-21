// Round 3, intro shot 6, cut full-bleed: the airline network on the satellite globe, airports in
// bright yellow, turning (Auto-rotate, key 9). The globe and its tiles are in before recording starts.
import { FLIGHTS, onMap, still } from "../ch6/map.js";
import { canvasColor, everythingSize, INTRO_CLIP, TURNING } from "./intro.js";
import { inspector } from "../r2-5b-and-more/more.js";

export default {
    id: "intro-globe",
    ...INTRO_CLIP,
    caption: "On a globe",
    dataset: FLIGHTS,
    async setup(h) {
        const { page } = h;
        await onMap(h);
        await canvasColor(page);
        await everythingSize(page, "2.5");
        const color = inspector(page).getByRole("textbox", { name: /^Node color, set here/ });
        await color.fill("FFD23F");
        await color.press("Enter");
        await color.blur();
        await h.app.camera("Fit");
        await still(page); // the satellite tiles are in
        await h.park({ x: -10, y: -10 });
    },
    ...TURNING,
};
