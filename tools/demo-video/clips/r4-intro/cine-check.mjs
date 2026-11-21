// Round 4: the worked example of cine.js, and its check take. The bank in 3D on a nebula, its edges
// neon; the camera pushes in on the Riga collector, a reticle locks onto it, then the camera pulls out
// while the graph glides onto a circle (shot at 3x length for slow motion: cut it with `speed: 3`).
import { backdrop, bankIntro, CINE_CLIP, fly, layout, noCursor, shade, slowMotion } from "./cine.js";

const COLLECTOR = "ACC-1493";

export default {
    id: "cine-check",
    ...CINE_CLIP,
    caption: "Cinematic helpers check",
    tag: "Synthetic data",
    async setup(h) {
        await bankIntro(h, { flat: false });
        await backdrop(h, { shader: "nebula", params: { drift: 0.4 } });
        await shade(h, { shader: "neon-line", params: { glow: 0.8 } });
        await slowMotion(h, { layoutSeconds: 6, transition: "glide" });
        await fly(h, [{ node: COLLECTOR, distance: 160, azimuth: 0.4, elevation: 0.35, ms: 0 }]);
        await h.app.frames(30); // never h.app.settled() once a looping shader is on: the drawing never stops changing
        await noCursor(h);
    },
    async run(h) {
        await fly(h, [
            { node: COLLECTOR, distance: 60, azimuth: 0.7, elevation: 0.3, ms: 2500, easing: "easeIn", mark: "push" },
            { node: COLLECTOR, distance: 14, azimuth: 1, elevation: 0.25, ms: 1500, easing: "easeOut", mark: "close" },
        ]);
        await shade(h, { shader: "lock-on-reticle", nodes: [COLLECTOR], params: { spin: 1.2 } });
        h.mark("locked");
        await fly(h, [{ node: COLLECTOR, distance: 11, azimuth: 1.15, elevation: 0.25, ms: 1500, easing: "linear" }]);
        await layout(h, "circular", { dim: 3 });
        h.mark("circle");
        await fly(h, [
            {
                node: COLLECTOR,
                distance: 220,
                azimuth: 1.6,
                elevation: 0.6,
                ms: 6000,
                easing: "easeInOut",
                mark: "pull",
            },
        ]);
    },
    holdMs: 1500,
};
