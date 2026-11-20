// Chapter 9, clip 1: a saved camera's Export image..., a look at the preview, Copy: "Copied the image" shows.
import { saveCamera, styled } from "./styled.js";

export default {
    id: "picture",
    chapter: 9,
    caption: "Copy a picture straight into your slides.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        // clipboard writes need the permission a person grants once in a real browser
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await styled(h);
        // the image's Legend follows the canvas's: with it off, the small preview draws the graph alone
        await page.getByRole("button", { name: "Legend", exact: true }).click();
        await page.getByRole("region", { name: "Legend" }).waitFor({ state: "hidden" });
        // the image comes from a saved camera: save this view as "My view"
        await saveCamera(page, "My view");
        await h.park({ x: 250, y: 360 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "More for My view" }));
        await h.click(page.getByRole("menuitem", { name: "Export image..." }));
        const dialog = page.getByRole("dialog", { name: "Export image" });
        // a look at the picture before it is copied
        await h.hover(dialog.getByRole("img", { name: /^Preview of / }), 700);
        await h.click(dialog.getByRole("button", { name: "Copy", exact: true }));
        // the dialog closes and "Copied the image" shows at the foot of the canvas, clear of the hand
        await h.waitFor(page.getByRole("status").filter({ hasText: "Copied the image" }).first());
        h.mark("copied");
    },
    leadMs: 500,
    holdMs: 1500,
};
