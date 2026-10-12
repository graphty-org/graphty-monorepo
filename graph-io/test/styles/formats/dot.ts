/**
 * DOT in the style harness: the committed DOT corpus read with Graphviz's rules and Graphviz's defaults, and the
 * round trip through the DOT writer, which writes Graphviz attributes and carries the `graphty.styles` block as the
 * quoted graph attribute `"graphty.styles"`.
 */

import { registerStyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * A written file with one node's `fillcolor` changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a fill
 */
export function editDotNodeFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    // the color's six digits only: an alpha after them stays, so only the fill changes
    const match = /\bfillcolor="(#[0-9A-Fa-f]{6})/.exec(text);
    if (match === null) {
        return null;
    }
    const at = match.index + match[0].length - match[1].length;
    const next = match[1].toLowerCase() === "#123456" ? "#654321" : "#123456";
    return encode(text.slice(0, at) + next + text.slice(at + match[1].length));
}

/**
 * A written file with its `graphty.styles` block replaced. The new block is written the way the writer writes one:
 * quotes and backslashes inside its strings as `\u` escapes, so the DOT text stays readable whatever the block holds.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceDotBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(/"graphty\.styles"="((?:[^"\\]|\\.)*)"/, (_m, body: string) => {
            let block = change(body.replaceAll('\\"', '"')).replace(/\\(["\\])/g, (_e, c: string) =>
                c === '"' ? "\\u0022" : "\\u005c",
            );
            if (block.endsWith("\\")) {
                block += " ";
            }
            return `"graphty.styles"="${block.replaceAll('"', '\\"')}"`;
        }),
    );
}

registerStyleFormat({
    name: "dot",
    mutantsPerFile: 1,
    writer: { format: "dot", editNative: editDotNodeFill, replaceBlock: replaceDotBlock },
});
