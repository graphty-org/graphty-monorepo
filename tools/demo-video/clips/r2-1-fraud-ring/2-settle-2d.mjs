// Round 2, clip 1.2: Mode > 2D (key badge 5): the bank flattens and the force layout pulls the
// accounts into tight circles. The one layout settle the whole video shows on screen; held to rest.
import { BANK, BANK_CLIP } from "./bank.js";

export default {
    id: "settle-2d",
    ...BANK_CLIP,
    caption: "Accounts cluster by who pays whom",
    async setup(h) {
        const { page } = h;
        await h.app.openFile(h.file(BANK));
        // the data table opens with a new file and takes the lower half of the canvas: closed
        await page.getByRole("button", { name: "Table", exact: true, pressed: true }).click();
        await page.getByRole("button", { name: "Table", exact: true, pressed: false }).waitFor();
        await h.app.settled();
        await h.park({ x: 1180, y: 860 });
    },
    leadMs: 600,
    async run(h) {
        const { page } = h;
        const modeBtn = page.getByRole("button", { name: /^Mode, / });
        await h.badge("5", { near: modeBtn, label: "2D" });
        await h.click(modeBtn);
        await h.click(page.getByRole("menuitemradio", { name: "2D", exact: true }));
        await h.move({ x: 1560, y: 900, width: 80, height: 60 }); // off the drawing while it settles
        h.mark("layout running");
        await h.app.settled();
        h.mark("layout at rest");
    },
    holdMs: 1500,
};
