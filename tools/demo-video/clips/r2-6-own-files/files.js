// Round 2, chapter 6 ("Bring your own files"): what the file clips share. A .js file, so record.mjs
// does not take it for a clip. Setup only: Playwright clicks straight through the app's own UI.
import { join } from "node:path";

import { OUT } from "../../lib/env.mjs";

/** Chapter 6 is the "Bring your own files" chapter. */
export const FILES_CLIP = { chapter: 6 };

/** The folder window the Gephi file is dragged out of (only the dragged file has to exist). */
export const EXPORTS = {
    folder: "Exports",
    files: ["alzheimer-network.gexf", "alzheimer-network.graphml", "alzheimer-network.dot", "transfers.csv"],
};

/** The bank's spreadsheets, in the folder the drawn Open dialog shows. */
export const BANK_FILES = {
    folder: "Bank case",
    files: ["transfers.csv", "watchlist.csv", "fraud-network.json", "notes.txt"],
};

/**
 * A real Cytoscape session: Cytoscape's own Basic Data Visualization tutorial (the yeast galactose
 * network, galFiltered, styled by expression). Kept under tmp/demo-video/data, not in the repository:
 * the session is Cytoscape's file, copied there from tmp/style-panel-design/samples/BasicDataVizDemo.cys.
 */
export const CYTOSCAPE_SESSION = join(OUT, "data/round2/yeast-galactose.cys");
export const FROM_CYTOSCAPE = {
    folder: "From Cytoscape",
    files: ["yeast-galactose.cys", "kinase-pathway.cys", "tutorial-2023.cys", "notes.txt"],
};

/** Where the hand rests after a file opens: the canvas's empty lower right, off the graph. */
export const REST = { x: 1460, y: 900, width: 100, height: 60 };

/**
 * Where a dragged file is let go on the start page: the "Drop to open" card the app centers on the
 * screen while a file is over it.
 */
export const DROP = { x: 900, y: 515, width: 90, height: 50 };
