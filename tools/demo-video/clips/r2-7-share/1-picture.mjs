// Round 2, clip 7.1: the case's top camera, Export image..., a look at the preview, Copy: "Copied the
// image". The background stays "Canvas color": on Transparent the pale case all but vanishes from
// the preview's checkerboard, so the viewer would not see what is copied.
import { bankCase, CASE_CLIP } from "./case.js";

export default {
    id: "picture",
    ...CASE_CLIP,
    caption: "Copy a picture for your slides",
    async setup(h) {
        const { page } = h;
        // clipboard writes need the permission a person grants once in a real browser
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await bankCase(h);
        await page.getByRole("button", { name: "Views", exact: true }).click();
        await page.getByRole("button", { name: "More for Top" }).waitFor();
        await h.park({ x: 420, y: 300 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "More for Top" }));
        await h.click(page.getByRole("menuitem", { name: "Export image..." }));
        const dialog = page.getByRole("dialog", { name: "Export image" });
        // the preview draws before the picture is copied; the hand stops on the camera it is taken
        // from, off the preview, so the push-in (after "dialog") frames the whole dialog
        await h.waitFor(dialog.getByRole("img", { name: /^Preview of / }));
        h.mark("dialog");
        await h.hover(dialog.getByRole("combobox", { name: "Camera" }), 1000);
        await h.hover(dialog.getByRole("button", { name: "Copy", exact: true }), 700);
        await h.click(dialog.getByRole("button", { name: "Copy", exact: true }));
        await h.waitFor(page.getByRole("status").filter({ hasText: "Copied the image" }).first());
        h.mark("copied");
    },
    holdMs: 2000,
};
