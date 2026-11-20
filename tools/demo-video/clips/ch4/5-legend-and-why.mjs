// Chapter 4, clip 5: the Legend button (key L) shows the key; Valjean clicked, the inspector's
// Why this look lists the layer behind each property.
//
// Why this look is the smallest text in the panel, about 8 px after the edit's framing, so the
// hand then pinches the page in on it, as a reader would on a trackpad: a real pinch gesture
// (CDP Input.synthesizePinchGesture), which zooms the browser's view, not the graph.
import { base, hideLegend, nodeBox, tap } from "./base.js";

let valjean;

export default {
    id: "legend-and-why",
    chapter: 4,
    caption: "A legend for every color, and why each node looks that way.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        await hideLegend(h);
        await h.app.settled();
        valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1180, y: 900 }); // near the toolbar
    },
    async run(h) {
        const { page } = h;
        const legend = page.getByRole("button", { name: "Legend", exact: true });
        await h.hover(legend, 400);
        await h.shortcut("L", { near: legend, label: "Legend" });
        await h.waitFor(page.getByRole("region", { name: "Legend" }));
        await h.pause(400);
        await tap(h, valjean);
        await tap(h, page.getByRole("tab", { name: "Style", exact: true }));
        const why = page.getByRole("group", { name: "Why this look" });
        await h.waitFor(why);
        // rest just left of its lines, so the eye finds the small panel and the cursor covers no word
        const lines = await why.getByRole("list").boundingBox();
        await h.move({ x: lines.x - 34, y: lines.y + lines.height / 2 - 8, width: 16, height: 16 });
        await h.pause(300);
        const box = await why.boundingBox();
        const at = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
        h.events.push({ t: Date.now(), type: "pinch", ...at, scale: 2.4, box: { ...box, label: "Why this look" } });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.synthesizePinchGesture", {
            ...at,
            scaleFactor: 2.4,
            relativeSpeed: 500,
            gestureSourceType: "mouse",
        });
        h.mark("why shown");
    },
    holdMs: 2600,
};
