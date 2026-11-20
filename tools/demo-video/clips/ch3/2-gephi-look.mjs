// Chapter 3, clip 2: from the ring, ForceAtlas2 pulls the groups apart around their hubs.
import { applyLayout, base, pickLayout } from "./base.js";

export default {
    id: "gephi-look",
    chapter: 3,
    caption: "Used to Gephi? ForceAtlas2 is here too.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        await applyLayout(h, /^Circle Places/);
        await h.park({ x: 1010, y: 860 });
    },
    leadMs: 500,
    holdMs: 1000,
    async run(h) {
        await pickLayout(h, /^ForceAtlas2 /);
        h.mark("applied");
        await h.move({ x: 1460, y: 900, width: 120, height: 60 });
        await h.app.settled(); // the force layout comes to rest on camera, then the hold
    },
};
