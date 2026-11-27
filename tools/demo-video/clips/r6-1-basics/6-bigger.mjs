// Round 6, basics 6: the rule =degree >= 10 already made a layer of the 22 most connected characters
// (setup: the find box, then Selection actions > New layer from selection, "Rule: graphty.degree >=
// 10"). On camera the hand opens that layer and adds Size 4: those nodes grow, still in their
// community colors.
import { BASICS_DATA, HUB_SIZE, REST, RULE_LAYER, ruleLayer } from "./basics.js";

export default {
    id: "basics-bigger",
    ...BASICS_DATA,
    caption: "One rule: most connected nodes bigger",
    async setup(h) {
        await ruleLayer(h);
        await h.park({ x: 420, y: 420 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.click(page.getByRole("treeitem", { name: RULE_LAYER }));
        await h.waitFor(insp.getByRole("heading", { name: /^Rule: graphty\.degree >= 10, / }));
        h.mark("rule");
        await h.click(insp.getByRole("button", { name: "Add to node shape" }));
        await h.click(page.getByRole("menuitem", { name: "Size", exact: true }));
        const size = insp.getByRole("spinbutton", { name: "Node size" });
        await h.click(size);
        await h.press("Control+A");
        await h.type(String(HUB_SIZE));
        await h.press("Enter");
        h.mark("bigger");
        await h.move(REST);
        await h.app.settled();
        h.mark("settled");
    },
    holdMs: 2000,
};
