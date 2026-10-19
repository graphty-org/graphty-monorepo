/**
 * GML in the style harness: the committed GML corpus read the way each writer draws it (yEd, Cytoscape, Gephi, OGDF;
 * igraph and unknown writers with no defaults), and the round trip through the GML writer, which writes yEd GML
 * graphics and carries the `graphty.styles` block as the graph key `graphty_styles`.
 */

import { decodeGmlString, quoteGmlString } from "../../../src/common/escape.js";
import { registerStyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * A written file with one node's graphics `fill` changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a fill
 */
export function editGmlNodeFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    const match = /\n {4}graphics \[[^\]]*?\n {6}fill "(#[0-9A-Fa-f]+)"/.exec(text);
    if (match === null) {
        return null;
    }
    const at = match.index + match[0].length - match[1].length - 1;
    // the color changes and its alpha (#RRGGBBAA) stays: one value edited
    const next = (match[1].startsWith("#123456") ? "#654321" : "#123456") + match[1].slice(7);
    return encode(text.slice(0, at) + next + text.slice(at + match[1].length));
}

/**
 * A written file with its `graphty.styles` block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceGmlBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(
            /^( {2}graphty_styles )"([^"]*)"$/m,
            (_m, head: string, body: string) => head + quoteGmlString(change(decodeGmlString(body))),
        ),
    );
}

registerStyleFormat({
    name: "gml",
    mutantsPerFile: 1,
    writer: { format: "gml", editNative: editGmlNodeFill, replaceBlock: replaceGmlBlock },
});
