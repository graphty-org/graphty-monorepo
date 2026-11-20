// Round 2, clip 6.4: over the transfers graph, Data > Add source > File... opens watchlist.csv from the
// drawn Open dialog. The Join screen pairs its account column with the node ids (10 matched); Join;
// a click on a mule account shows its risk and reason in the inspector.
import { nodeBox } from "../r2-1-fraud-ring/bank.js";
import { BANK_FILES, FILES_CLIP, REST } from "./files.js";

const MULE = "ACC-1494";
let mule;

export default {
    id: "combine-data",
    ...FILES_CLIP,
    tag: "Synthetic data",
    caption: "Join a watch list by account",
    async setup(h) {
        const { page } = h;
        await h.app.openFile(h.file("round2/transfers.csv"));
        await h.app.ready2D();
        mule = await nodeBox(h, MULE);
        await page.getByRole("button", { name: "Data", exact: true }).click();
        await page.getByRole("button", { name: "Add source" }).first().waitFor();
        await h.park({ x: 700, y: 700 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Add source" }).first());
        await h.openFile(page.getByRole("menuitem", { name: /^File/ }), h.file("round2/watchlist.csv"), BANK_FILES);
        const matched = page.getByText("10 matched", { exact: true });
        await h.waitFor(matched);
        // point at the chip's lower right corner, so the cursor covers none of its words
        const mb = await matched.boundingBox();
        await h.hover({ x: mb.x + mb.width - 8, y: mb.y + mb.height - 6, width: 6, height: 4 }, 700);
        await h.click(page.getByRole("button", { name: "Join", exact: true }));
        await h.waitFor(page.getByRole("region", { name: "Graph drawing" }));
        h.mark("joined");
        await h.click(mule);
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.waitFor(insp.getByRole("group", { name: "risk" }));
        await h.move(REST);
        h.mark("risk shown");
    },
    holdMs: 2200,
};
