// Round 2, clip 3.1: in the Data panel the hand tells graphty which columns hold each account's
// latitude and longitude, the pin icon on each row (the next clip opens Layout > Map on them).
// The file's latitude and longitude columns are found by name when it opens, so setup removes the
// two roles first (each row's minus button), as if the columns had been named in any other way.
import { tap } from "../r2-1-fraud-ring/bank.js";
import { MONEY_CLIP, moneyCase } from "./money.js";

/**
 * One location role from the Data panel's + menu: the role, then its column.
 * @param h - the hand
 * @param role - the menu entry ("Latitude")
 */
async function addRole(h, role) {
    const { page } = h;
    // four controls a role: the brisker tap keeps both roles near ten seconds
    await tap(h, page.getByRole("button", { name: "Add to node attributes" }));
    const item = page.getByRole("menuitem", { name: role, exact: true });
    await h.hover(item, 300);
    // straight across into the submenu first: a diagonal path crosses the next role's row and opens
    // its submenu under the hand (the first take set Coordinates to "id" that way)
    const column = page.getByRole("menuitem", { name: role.toLowerCase(), exact: true });
    await column.waitFor();
    const from = await item.boundingBox();
    const to = await column.boundingBox();
    await h.move({ x: to.x + 8, y: from.y + 4, width: 40, height: Math.max(4, from.height - 8) });
    await tap(h, column);
    await h.waitFor(page.getByRole("combobox", { name: `Node ${role.toLowerCase()} column` }));
}

export default {
    id: "assign-location",
    ...MONEY_CLIP,
    caption: "Set each account's location",
    async setup(h) {
        const { page } = h;
        await moneyCase(h);
        await page.getByRole("button", { name: "Data", exact: true }).click();
        for (const role of ["latitude", "longitude"]) {
            await page.getByRole("button", { name: `Remove node ${role}` }).click();
            await page.getByRole("combobox", { name: `Node ${role} column` }).waitFor({ state: "detached" });
        }
        await h.park({ x: 420, y: 560 });
    },
    leadMs: 500,
    async run(h) {
        await addRole(h, "Latitude");
        await addRole(h, "Longitude");
        await h.move({ x: 420, y: 560, width: 80, height: 60 }); // off the rows, so both read
        h.mark("location set");
    },
    holdMs: 2500,
};
