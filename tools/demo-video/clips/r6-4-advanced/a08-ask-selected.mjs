// Chapter 10, use AI: ask about just the selected nodes. Myriel and his neighbors are selected;
// Options > Selection, then "Color these nodes orange" colors only them. ("Label these nodes" drew
// the literal text "data.name" on each node: reported as an app defect.)
import { aiProvider, answered, composer, nodeBox } from "./adv.js";

const NEIGHBORHOOD = [
    "Myriel",
    "Napoleon",
    "MlleBaptistine",
    "MmeMagloire",
    "CountessDeLo",
    "Geborand",
    "Champtercier",
    "Cravatte",
    "Count",
    "OldMan",
    "Valjean",
];

export default {
    id: "advanced-ask-selected",
    chapter: 10,
    caption: "Ask about just the selected nodes",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await h.app.ready2D();
        // the camera stays at Fit while the selection grows (Focus selected flies it to each pick)
        await page.getByRole("button", { name: "Camera", exact: true }).click();
        await page.getByRole("menuitemcheckbox", { name: "Focus selected", checked: true }).click();
        await page.keyboard.press("Escape");
        await h.app.camera("Fit");
        await h.app.settled();
        // Myriel and his 10 neighbors, Shift+clicked one by one so each draws its selection ring
        // (G selects the same 11 but rings only Myriel: reported as an app defect)
        for (const [i, id] of NEIGHBORHOOD.entries()) {
            const b = await nodeBox(h, id);
            if (i > 0) await page.keyboard.down("Shift");
            await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
            if (i > 0) await page.keyboard.up("Shift");
        }
        await page.getByRole("treeitem", { name: /^Selected, .*\b11 nodes/ }).waitFor();
        await h.app.settled();
        await aiProvider(h, "OpenAI", "OPENAI_API_KEY");
        await composer(page).waitFor();
        await h.app.settled();
        await h.park({ x: 900, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const assistant = page.getByRole("region", { name: "Assistant" });
        // Options > Ask about: Selection, so the message is about the selected nodes only
        await h.click(assistant.getByRole("button", { name: "Options", exact: true }));
        await h.click(page.getByRole("menuitemradio", { name: /^Selection/ }));
        await h.waitFor(assistant.getByRole("button", { name: "Options, asking about the selection" }));
        await h.click(composer(page));
        await h.type("Color these nodes orange");
        await h.press("Enter");
        h.mark("sent");
        await h.waitFor(answered(page));
        h.mark("answered");
        await h.move({ x: 560, y: 930, width: 80, height: 50 }); // clear of the selection, at the lower left
        await h.app.settled();
        h.mark("colored");
    },
    holdMs: 3000,
};
