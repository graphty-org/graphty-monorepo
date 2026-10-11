/**
 * GEXF in the style harness: the committed GEXF corpus read with Gephi's defaults, and the round trip through the
 * GEXF writer, whose `graphty.styles` block sits in `<meta>`.
 */

import { registerStyleFormat } from "../harness.js";

const BLOCK = /(<graphty:styles\b[^>]*>)([^<]*)(<\/graphty:styles>)/;

const unescape = (text: string): string =>
    text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
const escape = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * A written file with one node's `viz:color` changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a color
 */
export function editGexfNodeColor(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    const nodes = text.indexOf("<nodes");
    const at = text.indexOf("<viz:color ", nodes);
    if (nodes < 0 || at < 0 || at > text.indexOf("</nodes>")) {
        return null;
    }
    const end = text.indexOf("/>", at);
    const old = text.slice(at, end);
    const next = old.includes('r="18" g="52" b="86"')
        ? '<viz:color r="86" g="52" b="18"'
        : '<viz:color r="18" g="52" b="86"';
    return encode(text.slice(0, at) + next + text.slice(end));
}

/**
 * A written file with its block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceGexfBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(
            BLOCK,
            (_m, open: string, body: string, close: string) => open + escape(change(unescape(body))) + close,
        ),
    );
}

registerStyleFormat({
    name: "gexf",
    mutantsPerFile: 1,
    writer: { format: "gexf", editNative: editGexfNodeColor, replaceBlock: replaceGexfBlock },
});
