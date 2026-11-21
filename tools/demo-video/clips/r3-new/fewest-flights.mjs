// Round 3: Path between... (P) from Sydney to Keflavik, then the Shortest path layer's edge width
// from 24 to 240: the route is found and drawn bold in one take. No labels: a layer's labels name
// every stop, and four screen-pixel labels filmed at 12 fps; the caption names the route.
import { FLIGHTS, flightsMap, inspector } from "../r2-4-show-found/flights.js";

export default {
    id: "fewest-flights",
    chapter: 9,
    caption: "Fewest flights: Sydney to Iceland",
    dataset: FLIGHTS,
    async setup(h) {
        await flightsMap(h);
        await h.park({ x: 1500, y: 700 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await h.shortcut("P", { near: "Analyze", label: "Path" });
        const form = page.getByRole("form", { name: "Shortest path" });
        await h.waitFor(form);
        // the form opens with From focused, and picking From moves focus on to To
        await h.type("Sydn");
        await h.click(form.getByRole("option", { name: /^Sydney Kingsford Smith/ }));
        await h.type("Kefl");
        await h.click(form.getByRole("option", { name: /^Keflavik International/ }));
        await h.click(form.getByRole("button", { name: "Find path" }));
        await h.waitFor(page.getByRole("treeitem", { name: /^Shortest path, / }));
        h.mark("route drawn");
        await h.pause(800);
        const insp = inspector(page);
        await h.click(insp.getByRole("tab", { name: "Style" }));
        await h.click(page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }));
        const width = insp.getByRole("spinbutton", { name: "Edge width" });
        await h.click(width);
        await h.press("Control+A");
        await h.type("240");
        await h.press("Enter");
        await h.move({ x: 1540, y: 900, width: 100, height: 60 }); // off the panel for the hold
        h.mark("bold");
    },
    holdMs: 3500,
};
