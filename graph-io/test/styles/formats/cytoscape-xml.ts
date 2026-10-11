/**
 * XGMML and Cytoscape sessions in the style harness: the committed corpus of each, read with Cytoscape's defaults
 * (the desktop's default style for XGMML, the renderer's fallbacks for sessions), and the round trip through each
 * writer. XGMML keeps the `graphty.styles` block as a graph `<att>`; a session keeps it as an archive entry of its
 * own, and its native style slots are the named style and the view's bypasses.
 */

import { readZipDirectory, writeZip } from "../../../src/common/zip.js";
import { registerStyleFormat } from "../harness.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const unescape = (text: string): string =>
    text
        .replace(/&#(\d+);/g, (_m, d: string) => String.fromCharCode(Number(d)))
        .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
const escape = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const XGMML_BLOCK = /(<att name="graphty\.styles" value=")([^"]*)(")/;

/**
 * A written XGMML file with the first node's fill changed, in both places Cytoscape writes it.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when no node has a fill
 */
export function editXgmmlNodeFill(written: Uint8Array): Uint8Array | null {
    const text = decode(written);
    const start = text.indexOf("<node ");
    const end = text.indexOf("</node>", start);
    if (start < 0 || end < 0) {
        return null;
    }
    const node = text.slice(start, end);
    const fill = /(<graphics\b[^>]*?\bfill=")([^"]*)(")/.exec(node);
    if (fill === null) {
        return null;
    }
    const next = fill[2] === "#123456" ? "#654321" : "#123456";
    const edited = node
        .replace(fill[0], `${fill[1]}${next}${fill[3]}`)
        .replace(/(name="NODE_FILL_COLOR" value=")[^"]*(")/, `$1${next}$2`);
    return encode(text.slice(0, start) + edited + text.slice(end));
}

/**
 * A written XGMML file with its block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceXgmmlBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    return encode(
        decode(written).replace(
            XGMML_BLOCK,
            (_m, open: string, body: string, close: string) => open + escape(change(unescape(body))) + close,
        ),
    );
}

/**
 * Every entry of a zip graphty wrote, by name, in order: the session writer stores its entries uncompressed, so they
 * are read synchronously, as the harness's writer hooks need.
 * @param bytes - the zip
 * @returns the entries
 */
function unzipStored(bytes: Uint8Array): Map<string, Uint8Array> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Map<string, Uint8Array>();
    for (const entry of readZipDirectory(bytes)) {
        if (entry.method !== 0) {
            throw new Error(`${entry.name}: the entry is compressed; the session writer stores its entries`);
        }
        const at =
            entry.localOffset +
            30 +
            view.getUint16(entry.localOffset + 26, true) +
            view.getUint16(entry.localOffset + 28, true);
        out.set(entry.name, bytes.slice(at, at + entry.size));
    }
    return out;
}

/**
 * Entries as a zip.
 * @param entries - the entries by name
 * @returns the zip
 */
function zip(entries: ReadonlyMap<string, Uint8Array>): Uint8Array {
    const parts = [...writeZip([...entries].map(([name, data]) => ({ name, data })))];
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
        out.set(p, at);
        at += p.length;
    }
    return out;
}

/**
 * A written session with one entry changed.
 * @param written - the session graphty wrote
 * @param test - which entry
 * @param change - the entry's new text from its old one, or null to leave the session as it is
 * @returns the changed session, or null when no entry matches or the change gives null
 */
export function changeSessionEntry(
    written: Uint8Array,
    test: (name: string) => boolean,
    change: (text: string) => string | null,
): Uint8Array | null {
    const entries = unzipStored(written);
    const name = [...entries.keys()].find(test);
    const next = name === undefined ? null : change(decode(entries.get(name) as Uint8Array));
    if (name === undefined || next === null) {
        return null;
    }
    entries.set(name, encode(next));
    return zip(entries);
}

/**
 * A view with the first node whose fill is not locked given a locked fill, as locking it in Cytoscape would.
 * @param view - the view file's text
 * @param color - the fill
 * @returns the edited view, or null when every node's fill is locked
 */
export function lockFirstNodeFill(view: string, color = "#123456"): string | null {
    const open = '<att name="lockedVisualProperties">';
    const locked = `<att name="NODE_FILL_COLOR" value="${color}" type="string" cy:type="String"/>`;
    // the first view node whose fill is not locked already, so the edit adds one exception
    for (let start = view.indexOf("<node "); start >= 0; start = view.indexOf("<node ", start + 1)) {
        const end = view.indexOf("</node>", start);
        const node = view.slice(start, end);
        if (node.includes('name="NODE_FILL_COLOR"')) {
            continue;
        }
        const at = node.indexOf(open);
        const edited =
            at >= 0
                ? `${node.slice(0, at + open.length)}${locked}${node.slice(at + open.length)}`
                : node.replace(/<graphics([^>]*?)\/>/, `<graphics$1>${open}${locked}</att></graphics>`);
        return view.slice(0, start) + edited + view.slice(end);
    }
    return null;
}

registerStyleFormat({
    name: "xgmml",
    mutantsPerFile: 1,
    writer: { format: "xgmml", editNative: editXgmmlNodeFill, replaceBlock: replaceXgmmlBlock },
});

registerStyleFormat({
    name: "cys",
    writer: {
        format: "cys",
        editNative: (written) => {
            // a color the session holds nowhere yet (its entries are stored, so their text is in the bytes)
            const color = decode(written).includes("123456") ? "#654321" : "#123456";
            return changeSessionEntry(
                written,
                (n) => n.includes("/views/"),
                (view) => lockFirstNodeFill(view, color),
            );
        },
        replaceBlock: (written, change) =>
            changeSessionEntry(written, (n) => n.endsWith("/graphty.styles"), change) ?? written,
    },
});
