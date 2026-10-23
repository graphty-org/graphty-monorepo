// The specimen sheet layout for Node generators: reads sheet-layout.json (its "about" says what each number
// means) and places a sheet's cells. sheet_layout.py is the same for Python generators.
//
//   import { layout, cells, ANCHORS } from "./sheet-layout.mjs";
//   for (const c of cells(48)) { c.x, c.y, c.caption.x, c.caption.y, c.source, c.target }
import console from "node:console";
import { readFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL, URL } from "node:url";

export const layout = JSON.parse(readFileSync(new URL("./sheet-layout.json", import.meta.url), "utf8"));

/** The four corner anchors: [{ id, x, y, size }]. */
export const ANCHORS = Object.entries(layout.anchors.nodes).map(([id, [x, y]]) => ({
    id,
    x,
    y,
    size: layout.anchors.size,
}));

/**
 * The cells of a sheet of `count` specimens, row by row across the area.
 * @param count - specimens on the sheet (at most layout.maxSpecimens)
 * @param [columns] - columns (default layout.columns); rows follow from count
 * @returns the cells: index, center x and y, cell w and h, caption { x, y }, and an edge specimen's source and target
 */
export function cells(count, columns = layout.columns) {
    if (count > layout.maxSpecimens) {
        throw new Error(`${count} specimens is more than a sheet holds (${layout.maxSpecimens}); split it into pages`);
    }
    const { x0, y0, x1, y1 } = layout.area;
    const cols = Math.min(columns, Math.max(1, count));
    const rows = Math.max(1, Math.ceil(count / cols));
    const w = (x1 - x0) / cols;
    const h = (y1 - y0) / rows;
    return Array.from({ length: count }, (_, index) => {
        const x = x0 + w * ((index % cols) + 0.5);
        const y = y0 + h * (Math.floor(index / cols) + 0.5) + layout.specimenDy;
        const s = layout.edgeHalfSpan;
        return {
            index,
            x,
            y,
            w,
            h,
            caption: { x, y: y + layout.captionDy },
            source: { x: x - s, y },
            target: { x: x + s, y },
        };
    });
}

/**
 * A caption's text: "<property>=<value>".
 * @param property - the setting's name as the format spells it
 * @param value - its value as the format spells it
 * @returns the caption
 */
export const caption = (property, value) => `${property}=${String(value)}`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    // Self-check: corners, grid inside the area, captions below their specimen.
    const c = cells(60);
    const { x0, y0, x1, y1 } = layout.area;
    if (ANCHORS.length !== 4 || c.length !== 60) throw new Error("bad counts");
    for (const k of c) {
        if (k.x < x0 || k.x > x1 || k.caption.y > y1 || k.y < y0) throw new Error(`cell ${k.index} outside the area`);
    }
    if (cells(3)[2].x <= cells(3)[0].x) throw new Error("cells not left to right");
    console.log("sheet-layout.mjs: ok");
}
