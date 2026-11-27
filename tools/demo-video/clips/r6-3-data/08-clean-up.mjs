// Chapter 8, Data management: the Les Miserables links as a CSV with "n/a" in three rows of
// shared_chapters (data/r6-data); the Data panel's warning on the file opens its issues, "3 not
// numbers"; Show rows opens the table on just those three rows, the "n/a" values in view; one click
// on Make blank fixes them: the table's With issues count drops to 0, the column reads as numbers
// and the file gets a check.
import { dataPlace, flat, MESSY, REST } from "./data.js";

export default {
    id: "data-clean-up",
    chapter: 8,
    caption: "Spot bad values, fix in one click",
    // with the source-steps experiment on, every fix is refused ("Not fixed": E_UNSUPPORTED "fix an
    // issue is not available under the source-steps experiment yet"; reported as an app defect)
    featuresOff: ["source-steps"],
    async setup(h) {
        await h.app.openFile(h.file(MESSY));
        await flat(h);
        await dataPlace(h);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^1 issue in / }));
        const show = page.getByRole("button", { name: "Show rows: 3 not numbers" });
        await h.waitFor(show);
        await h.pause(500);
        await h.click(show);
        await h.waitFor(page.getByRole("gridcell", { name: "n/a" }).first());
        h.mark("bad");
        await h.pause(1200);
        await h.click(page.getByRole("button", { name: "Make blank: 3 not numbers" }));
        await h.waitFor(page.getByRole("button", { name: /^Resolved \d/ }));
        await h.move(REST);
        await h.app.settled();
        h.mark("fixed");
    },
    holdMs: 2000,
};
