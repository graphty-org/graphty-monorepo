// Round 2, clip 3.5: the Graph overview reads "Time: time"; Set in Data makes the transfers' time the
// graph's time, and T opens the Timeline: June to August, with a spike in mid-August.
import { EMPTY, MONEY_CLIP, moneyCase, onMap } from "./money.js";

export default {
    id: "timeline",
    // A placeholder while the app refuses the edges' ISO time column as the time field (Set in Data
    // shows "time cannot be the time field"; no Timeline button follows). Delete `placeholder` and
    // `seconds` to film it again: setup and run below are kept as they were.
    placeholder:
        'Dates become a timeline (placeholder: Set in Data refuses the transfers\' time column, "time cannot be the time field")',
    seconds: 4,
    ...MONEY_CLIP,
    caption: "Open the transfers on a timeline",
    async setup(h) {
        await moneyCase(h);
        await onMap(h);
        // no Betweenness: the tour cuts the brokers clips that run it
        await h.park({ x: 1300, y: 860 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const canvas = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
        await h.click({ x: canvas.x + EMPTY.x - 30, y: canvas.y + EMPTY.y - 30, width: 60, height: 60 });
        await h.click(page.getByRole("button", { name: "Set in Data" }));
        // Set in Data leaves focus in a field, where T would not reach the app: a click on the
        // empty map first, as a person would
        await h.click({ x: canvas.x + EMPTY.x - 30, y: canvas.y + EMPTY.y - 30, width: 60, height: 60 });
        const button = page.getByRole("button", { name: "Timeline", exact: true });
        await h.shortcut("T", { near: button, label: "Timeline" });
        await h.waitFor(page.getByRole("region", { name: "Timeline" }));
        await h.move({ x: 1540, y: 400, width: 100, height: 60 }); // off the dock so the bars read
        h.mark("timeline open");
    },
    holdMs: 2500,
};
