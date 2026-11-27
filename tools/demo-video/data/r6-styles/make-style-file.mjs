#!/usr/bin/env node
/**
 * Makes les-miserables.graphty-style.json the way the video says it was made: Les Miserables styled
 * through chapter 2's steps in the built graphty app (clips/r6-2-styles/styles.js), then saved with
 * Save as... > Style only > Section file, exactly as the styles-save clip does on camera. The
 * styles-drop clip drops this file on another graph.
 *
 *   node tools/demo-video/data/r6-styles/make-style-file.mjs
 */
import { join } from "node:path";

import { withEdgeLabels } from "../../clips/r6-2-styles/styles.js";
import * as app from "../../lib/app.mjs";
import { appUrl, launch, serve } from "../../lib/env.mjs";
import { gated } from "../../lib/gate.mjs";

gated();
const here = import.meta.dirname;
const srv = await serve();
const b = await launch();
const { page } = b;
const h = { page, app: Object.fromEntries(Object.entries(app).map(([k, f]) => [k, (...a) => f(page, ...a)])) };
try {
    await page.goto(appUrl(srv.origin), { waitUntil: "commit" });
    await app.start(page);
    await app.openSample(page, "Les Miserables");
    await withEdgeLabels(h);
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: "Save as..." }).click();
    const dialog = page.getByRole("dialog", { name: /^Save .* as$/ });
    await dialog.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "Style only", exact: true }).click();
    await dialog.getByText("Section file", { exact: true }).click();
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save copy" }).click();
    const out = join(here, "les-miserables.graphty-style.json");
    await (await download).saveAs(out);
    console.log(out);
} finally {
    await b.close();
    srv.close();
}
process.exit(0);
