// Chapter 9, advanced styling: moving edges. Dash motion typed in on the Everything layer's edges:
// dashes flow along every edge. (Dash motion moves only a Solid line's stripes; on the Dashed
// pattern it does nothing, reported as an app defect, so the line stays Solid.)
import { everything, inspector, REST, setNumber } from "./adv.js";

export default {
    id: "advanced-moving-edges",
    chapter: 9,
    caption: "Dashes flow along the edges",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await h.app.ready2D();
        await everything(h, "Edge");
        await setNumber(h, "Edge width", 16);
        const color = inspector(page).getByRole("textbox", { name: /^Edge color, set here/ });
        await color.fill("6366F1");
        await color.press("Enter");
        await h.app.settled();
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const motion = inspector(page).getByRole("spinbutton", { name: "Edge dash motion" });
        await h.click(motion);
        await h.press("Control+a");
        await h.type("3");
        await h.press("Enter");
        await h.move(REST);
        await h.app.frames(20);
        h.mark("flowing");
    },
    holdMs: 3000,
};
