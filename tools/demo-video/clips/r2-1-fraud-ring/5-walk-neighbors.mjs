// Round 2, clip 1.5: click one account the rule lit up; its neighbors in the inspector; the shared
// address among them; the address's neighbors: twelve accounts, all at one flat.
import { BANK_CLIP, bankRule, loudSelected, nodeBox, RING_ACCOUNT, RING_ADDRESS, zoomToward } from "./bank.js";

const at = {};

export default {
    id: "walk-neighbors",
    ...BANK_CLIP,
    caption: "12 accounts share one address",
    async setup(h) {
        await bankRule(h);
        await loudSelected(h); // the neighbors the walk selects stand out
        // closer to the ring, so the account the hand clicks is big enough to see and hit
        await zoomToward(h, RING_ADDRESS, 6);
        at.account = await nodeBox(h, RING_ACCOUNT);
        await h.park({ x: 1250, y: 880 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.click(at.account);
        await h.waitFor(insp.getByRole("heading", { name: RING_ACCOUNT }));
        await h.pause(500);
        await h.click(insp.getByRole("button", { name: /^Degree / }));
        await h.click(insp.getByRole("button", { name: "Chicago address R" }));
        await h.waitFor(insp.getByRole("heading", { name: "Chicago address R" }));
        await h.pause(400);
        await h.click(insp.getByRole("button", { name: "Degree 12" }));
        await h.waitFor(insp.getByRole("group", { name: "Chicago address R and 12 connections" }));
        await h.move({ x: 1560, y: 880, width: 80, height: 60 });
        h.mark("twelve accounts listed");
    },
    holdMs: 2200,
};
