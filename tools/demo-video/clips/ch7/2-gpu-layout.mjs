// Chapter 7, clip 2: Force lays the 50,000-node scatter out on the graphics card (from 2,000 nodes
// graphty-element runs it on the accelerator when one is attached) while the status bar reads
// "WebGPU: enabled". The nodes are colored by their planted group, so the shape it pulls into shows them.
import { bigGraph, colorByCommunity, layout, webGpuChip } from "./big.js";

export default {
    id: "gpu-layout",
    chapter: 7,
    caption: "Your graphics card pulls it into shape in seconds.",
    async setup(h) {
        await bigGraph(h);
        await colorByCommunity(h.page);
        await layout(h.page, "Random");
        await h.app.settled();
        await h.app.camera("Fit");
        await h.app.settled();
        await webGpuChip(h.page).waitFor();
        await h.park({ x: 1300, y: 900 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Layout", exact: true }));
        // the list opens scrolled to the current layout (Random, near its end): scroll up to Force
        await h.scroll(page.getByRole("listbox", { name: "Layouts" }), -3000);
        await h.click(page.getByRole("option", { name: /^Force\b/ }).first());
        await h.click(page.getByRole("button", { name: "Apply", exact: true }));
        h.mark("layout started");
        // the hand leaves Apply at once, down along the bottom to the WebGPU chip (never across the
        // drawing: hover picking over 50,000 nodes stalls the page), and the take watches the shape form
        await h.move(webGpuChip(page));
        await h.pause(4000);
        h.mark("shape formed");
    },
};
