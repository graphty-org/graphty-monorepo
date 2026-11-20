// Chapter 6, clip 5: Path between... (P) from Sydney to Keflavik; the route lights up across the map.
import { FLIGHTS, onMap } from "./map.js";

export default {
    id: "fewest-stops",
    chapter: 6,
    caption: "Fewest stops from Sydney to Iceland.",
    dataset: FLIGHTS,
    async setup(h) {
        // a quiet gray map, so the route's color reads
        await onMap(h, { map: "Natural Earth gray", flat: true });
        const { page } = h;
        // the 36,906 routes drawn pale, so the one route found stands out against them (setup only,
        // through the Everything layer's Edge tab)
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style" }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
        const color = page.getByRole("textbox", { name: /^Edge color, set here/ });
        await color.fill("E4E4E4");
        await color.press("Enter");
        // focus off the text field (a P typed there would not reach the app): onto the Edge tab
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
        // one wheel notch in, toward the north: the inhabited world fills the frame, not Antarctica
        const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.36);
        await page.mouse.wheel(0, -100);
        await h.app.settled();
        await h.park({ x: 1180, y: 860 });
    },
    async run(h) {
        const { page } = h;
        // Analyze's Path between..., by its key, with the badge beside the Analyze button
        await h.shortcut("P", { near: "Analyze", label: "Path" });
        const form = page.getByRole("form", { name: "Shortest path" });
        await h.waitFor(form);
        // the form opens with From focused, and picking From moves focus on to To
        await h.type("Kingsford");
        await h.click(form.getByRole("option", { name: /^Sydney Kingsford Smith/ }));
        await h.type("Keflavik");
        await h.click(form.getByRole("option", { name: /^Keflavik International/ }));
        await h.click(form.getByRole("button", { name: "Find path" }));
        await h.waitFor(page.getByRole("treeitem", { name: /^Shortest path, / }));
        await h.move({ x: 1520, y: 900, width: 100, height: 60 });
        h.mark("route drawn");
    },
    holdMs: 2000,
};
