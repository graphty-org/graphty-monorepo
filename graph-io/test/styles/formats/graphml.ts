/**
 * GraphML in the style harness: the committed GraphML corpus read the way each writer draws it (yEd, yFiles 3,
 * Gephi, Cytoscape; no styles for any other writer), and the round trip through the GraphML writer, which writes yEd
 * graphics and carries the `graphty.styles` block as a graph `<data>` under its own key.
 */

import { registerStyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const unescape = (text: string): string =>
    text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A written file with one node's yEd fill changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a fill color (graph data such as yEd's resources is skipped)
 */
export function editGraphmlNodeFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    const nodes = text.indexOf("<node ");
    const at = nodes < 0 ? -1 : text.indexOf('<y:Fill color="', nodes);
    if (at < 0) {
        return null;
    }
    const start = at + '<y:Fill color="'.length;
    const end = text.indexOf('"', start);
    // the color changes and its alpha (#RRGGBBAA) stays: one value edited
    const old = text.slice(start, end);
    const next = (old.startsWith("#123456") ? "#654321" : "#123456") + old.slice(7);
    return encode(text.slice(0, start) + next + text.slice(end));
}

/**
 * A written file with its `graphty.styles` block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceGraphmlBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    const text = decode(written);
    const key = /<key id="([^"]+)" for="graph" attr\.name="graphty\.styles"/.exec(text);
    if (key === null) {
        return written;
    }
    const data = new RegExp(`(<data key="${key[1]}">)([^<]*)(</data>)`);
    return encode(
        text.replace(
            data,
            (_m, open: string, body: string, close: string) => open + escape(change(unescape(body))) + close,
        ),
    );
}

registerStyleFormat({
    name: "graphml",
    mutantsPerFile: 1,
    writer: {
        format: "graphml",
        // GraphML node ids are XML name tokens; a file whose ids are not (Gephi writes "Ottoman Empire") is written
        // with mangled ids and the originals beside them, which the import restores
        options: { sanitizeIds: "mangle" },
        editNative: editGraphmlNodeFill,
        replaceBlock: replaceGraphmlBlock,
    },
});
