// Chapter 12, Maps: 27 European countries and their land borders, each node only a country name
// (data/r6-data/europe-borders.json; no coordinates). Each node is labeled with its country name and
// the Data panel shows the name column taken as Country; Layout > Map > Apply and every country lands
// in its place on the map.
import { labelsFrom } from "../r2-5b-and-more/more.js";
import { closeLayout, mapOnCamera, openMapForm, still } from "../ch6/map.js";
import { BORDERS, dataPlace, flat, REST } from "./data.js";

export default {
    id: "data-place-names",
    chapter: 12,
    caption: "Place names put nodes on the map",
    async setup(h) {
        const { page } = h;
        await h.app.openFile(h.file(BORDERS));
        await flat(h);
        await h.app.layerEdges("Everything", { color: "C2185B", width: 20 });
        await labelsFrom(h, "Everything", "country", 16); // the names are all the data has
        // larger nodes on the flat map (the form keeps the value for the Apply on camera)
        const form = await openMapForm(page);
        const size = form.getByRole("spinbutton", { name: "Flat map node size" });
        await size.fill("5");
        await size.press("Tab");
        await closeLayout(page);
        await dataPlace(h);
        await page.getByRole("combobox", { name: "Node country column" }).waitFor();
        await h.app.settled();
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const panel = await mapOnCamera(h);
        await h.click(panel.getByRole("button", { name: "Apply" }));
        h.mark("applied");
        await h.move(REST);
        await panel.waitFor({ state: "hidden" });
        await still(h.page);
        h.mark("on map");
    },
    holdMs: 2200,
};
