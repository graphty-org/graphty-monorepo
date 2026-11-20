// Chapter 7, clip 1: the start page's LFR benchmark generator makes a 50,000-node network.
// The app takes minutes to bring this graph in with the cosmograph experiment on (an app defect),
// so the take marks the Generate click and "cut-in" the moment the graph is in, and
// jumpcut.js drops the wait between them. The network then draws on screen, and the Table shows
// the count (the Everything row shows a "Painted over" mark instead of a count at this size).
import { bigIn, drawn, lfrTile, NODES } from "./big.js";

export default {
    id: "fifty-thousand",
    chapter: 7,
    caption: "No big network at hand? Make one with 50,000 nodes.",
    holdMs: 1500,
    async setup(h) {
        h.page.setDefaultTimeout(0);
        await lfrTile(h.page);
        await h.park({ x: 1180, y: 300 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^Generate a graph: LFR benchmark/ }));
        const dialog = page.getByRole("dialog", { name: "LFR benchmark" });
        const nodes = dialog.getByRole("textbox", { name: "Nodes" });
        await h.click(nodes);
        await h.press("Control+a");
        await h.type(NODES);
        await h.pause(300);
        // the page's main thread is busy until the graph is in, so this click returns only then
        await h.click(dialog.getByRole("button", { name: "Generate" }));
        h.mark("cut-out-after-input");
        await bigIn(page);
        await drawn(page); // the Everything row is in seconds before anything is drawn
        h.mark("cut-in");
        // a beat to watch the network pull together (its layout keeps moving for minutes)
        await h.pause(1000);
        await h.click(page.getByRole("button", { name: "Table", exact: true }));
        // rest beside the count, not on it
        const count = await page.getByText(/^50,000 nodes$/).boundingBox();
        await h.move({ x: count.x + count.width + 20, y: count.y + count.height + 6 });
        h.mark("count shown");
    },
};
