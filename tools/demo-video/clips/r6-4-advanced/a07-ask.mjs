// Chapter 10, use AI: ask in plain words. The real assistant (OpenAI; the key entered in setup, off
// camera, into the masked field): "Color nodes by community" runs Louvain and colors the graph.
import { aiProvider, answered, composer, REST } from "./adv.js";

export default {
    id: "advanced-ask",
    chapter: 10,
    caption: "Ask in plain words",
    dataset: "Les Miserables",
    async setup(h) {
        await h.app.ready2D();
        await aiProvider(h, "OpenAI", "OPENAI_API_KEY");
        await composer(h.page).waitFor();
        await h.app.settled();
        await h.park({ x: 900, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await h.click(composer(page));
        await h.type("Color nodes by community");
        await h.press("Enter");
        h.mark("sent");
        await h.waitFor(answered(page));
        h.mark("answered");
        await h.move(REST);
        await h.app.settled();
        h.mark("colored");
    },
    holdMs: 3000,
};
