// Round 2, clip 3.3: on the map, "brokers" typed in Analyze's filter finds Betweenness; run, the
// accounts that pass the money on (the five mules and the collector in Riga) grow.
import { analyzeOnCamera } from "../r2-1-fraud-ring/bank.js";
import { MONEY_CLIP, moneyCase, onMap } from "./money.js";

export default {
    id: "ask-plain-words",
    ...MONEY_CLIP,
    caption: "Who passes the money on?",
    async setup(h) {
        await moneyCase(h);
        await onMap(h);
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await analyzeOnCamera(h, "brokers", "Betweenness");
        await h.waitFor(page.getByText("Color: Betweenness").first());
        await h.press("Escape");
        await h.move({ x: 1540, y: 900, width: 100, height: 60 }); // off the map so the result reads
        await h.app.settled();
        h.mark("ranked");
    },
    holdMs: 2500,
};
