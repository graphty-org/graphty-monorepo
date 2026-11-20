// Round 2, clip 4.2: Path between... (P) from Sydney to Keflavik; the route lights up across the map.
import { FLIGHTS, flightsMap } from "./flights.js";

export default {
    id: "fewest-stops",
    chapter: 4,
    caption: "Fewest flights: Sydney to Iceland",
    dataset: FLIGHTS,
    async setup(h) {
        await flightsMap(h);
        await h.park({ x: 1180, y: 860 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        // Analyze's Path between..., by its key, with the badge beside the Analyze button
        await h.shortcut("P", { near: "Analyze", label: "Path" });
        const form = page.getByRole("form", { name: "Shortest path" });
        await h.waitFor(form);
        // the form opens with From focused, and picking From moves focus on to To
        await h.type("Sydn"); // the first letters, as a person types into a picker
        await h.click(form.getByRole("option", { name: /^Sydney Kingsford Smith/ }));
        await h.type("Kefl");
        await h.click(form.getByRole("option", { name: /^Keflavik International/ }));
        await h.click(form.getByRole("button", { name: "Find path" }));
        await h.waitFor(page.getByRole("treeitem", { name: /^Shortest path, / }));
        await h.move({ x: 1540, y: 900, width: 100, height: 60 });
        h.mark("route drawn");
    },
    holdMs: 3000,
};
