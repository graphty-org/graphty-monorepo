/**
 * Pajek in the style harness: the committed Pajek corpus read with Pajek's defaults, and the round trip through the
 * Pajek writer, which writes the shape keyword and drawing parameters and carries the `graphty.styles` block as the
 * comment line `% graphty.styles <json>`.
 */

import { registerStyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * A written file with one vertex's `ic` changed, as another program would edit it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no vertex has a fill
 */
export function editPajekVertexFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    const match = / ic (\S+)/.exec(text);
    if (match === null) {
        return null;
    }
    const at = match.index + 4;
    const next = match[1] === "RGB123456" ? "RGB654321" : "RGB123456";
    return encode(text.slice(0, at) + next + text.slice(at + match[1].length));
}

/**
 * A written file with its `graphty.styles` comment line's block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replacePajekBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(/^% graphty\.styles (.*)$/m, (_m, body: string) => `% graphty.styles ${change(body)}`),
    );
}

registerStyleFormat({
    name: "pajek",
    mutantsPerFile: 1,
    writer: { format: "pajek", editNative: editPajekVertexFill, replaceBlock: replacePajekBlock },
});
