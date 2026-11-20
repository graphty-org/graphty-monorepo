#!/usr/bin/env node
/**
 * Makes alzheimer-network.gexf the way the video says it was made: the Alzheimer's network opened in
 * the built graphty app, laid out in 2D (the project's own seed, so the same drawing every run), and
 * written by the app's Export > Data > GEXF with its positions, so the "Drag in a Gephi file" clip
 * opens it at those positions with no layout running on screen.
 *
 *   node tools/demo-video/data/round2/export-from-app.mjs
 */
import { join } from "node:path";

import * as app from "../../lib/app.mjs";
import { appUrl, launch, serve } from "../../lib/env.mjs";
import { gated } from "../../lib/gate.mjs";

gated();
const here = import.meta.dirname;
const srv = await serve();
const b = await launch();
const { page } = b;
try {
    // the file-styles experiment adds stray layers to a plain JSON file (README.md, "Known app defects")
    await page.goto(appUrl(srv.origin, "", ["file-styles"]), { waitUntil: "commit" });
    await app.start(page);
    await app.openFile(page, join(here, "alzheimer-network.json"));
    await app.mode(page, "2D");
    await app.settled(page);
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: "Export..." }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await dialog.getByRole("row", { name: "Data" }).click();
    await dialog.getByRole("combobox", { name: "Format" }).click();
    await page.getByRole("option", { name: /^GEXF/ }).click();
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const out = join(here, "alzheimer-network.gexf");
    await (await download).saveAs(out);
    console.log(out);
} finally {
    await b.close();
    srv.close();
}
process.exit(0);
