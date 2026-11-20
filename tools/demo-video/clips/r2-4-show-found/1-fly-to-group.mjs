// Round 2, clip 4.1: the Alzheimer's network, settled in 3D in setup (no settle on camera). The
// community that holds APP is picked in the Louvain layer's Values list; Frame selection (F) flies the
// camera to it, Auto-rotate (9) turns it, its proteins labeled by gene symbol.
import { ALZ, labelLayer } from "../r2-2-alzheimer/alz.js";
import { analyze, clearSelection, closeToasts } from "../r2-1-fraud-ring/bank.js";

const insp = (page) => page.getByRole("complementary", { name: "Inspector" });

/** The Values list entry of APP's community, read in setup ("Group 5"). */
let group = "";

export default {
    id: "fly-to-group",
    chapter: 4,
    featuresOff: ["file-styles"],
    caption: "In 3D, fly to one community",
    async setup(h) {
        const { page } = h;
        await h.app.openFile(h.file(ALZ));
        const table = page.getByRole("button", { name: "Table", exact: true, pressed: true });
        if (await table.isVisible()) await table.click();
        await h.app.settled();
        await analyze(h, "louv", "Louvain");
        // APP's community: APP picked from the find box, its Louvain value read off the inspector
        await page.getByRole("combobox", { name: "Find" }).fill("APP");
        await page
            .getByRole("option", { name: /^APP\b/ })
            .first()
            .click();
        await h.app.frames(10);
        const text = await insp(page).innerText();
        const m = /Louvain\W*(?:Group\s*)?(\d+)/i.exec(text);
        if (!m) throw new Error(`no Louvain value for APP in the inspector:\n${text.slice(0, 1500)}`);
        group = `Group ${m[1]}`;
        // that community as a layer of its own, its proteins named
        await page
            .getByRole("treeitem", { name: /^Louvain/ })
            .first()
            .click();
        await insp(page).getByRole("tab", { name: "Values" }).click();
        await insp(page).getByText(group, { exact: true }).click();
        const made = page.getByRole("treeitem", { name: /^\d+ nodes, / });
        await page.mouse.click(1560, 975, { button: "right" });
        await page.getByRole("menuitem", { name: "New layer from selection" }).click();
        await made.waitFor();
        const layer = (await made.getAttribute("aria-label"))?.split(",")[0] ?? (await made.innerText()).split("\n")[0];
        await labelLayer(h, layer, { px: "18" }); // 45 names: smaller, so the wide shot is not a block of text
        await clearSelection(h);
        await closeToasts(h);
        await page.keyboard.press("l"); // the legend card off: Frame selection would frame under it
        await page.getByText("Color: Louvain").waitFor({ state: "hidden" });
        await h.app.camera("Fit");
        await h.app.settled();
        // the Louvain layer's Values list, where the hand picks the community
        await page
            .getByRole("treeitem", { name: /^Louvain/ })
            .first()
            .click();
        await insp(page).getByRole("tab", { name: "Values" }).click();
        await insp(page).getByText(group, { exact: true }).waitFor();
        await h.park({ x: 1250, y: 300 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(insp(page).getByText(group, { exact: true }));
        await h.waitFor(page.getByRole("heading", { name: /nodes?, \d+ edges? selected$/ }));
        const camera = page.getByRole("button", { name: "Camera", exact: true });
        await h.shortcut("F", { near: camera, label: "Frame selection" });
        await h.app.settled();
        await h.shortcut("9", { near: camera, label: "Auto-rotate" });
        await h.move({ x: 1460, y: 860, width: 100, height: 60 });
        h.mark("turning");
    },
    holdMs: 3000,
};
