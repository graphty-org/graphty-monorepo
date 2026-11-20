/**
 * Cytoscape style files on their own: the vizmap XML Cytoscape 3 exports (File > Export > Styles to File, and
 * `default_vizmap.xml`) and the 2.x `vizmap.props`, read over a graph the caller already has, the way a session's
 * style is read over its network.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { resolveImportOptions } from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { extractStyles, type ExtractStylesOptions } from "../../styles/io/generic.js";
import type { ExtractedStyles } from "../../styles/types.js";
import { FORMAT } from "./constants.js";
import { cysImporter } from "./importer.js";
import { parseXmlTree, type XmlNode } from "./session.js";
import type { SessionStyleSource } from "./styles.js";
import { vizmapFromPropsInput } from "./vizmap-props.js";

/**
 * Options of {@link readCytoscapeStyleFile}.
 * @category Styles
 */
export interface CytoscapeStyleFileOptions extends ExtractStylesOptions {
    /**
     * The name of the style to read, of the several a file can hold. When absent, or naming no style in the file, the
     * first style is read; the others are noted (`W_STYLE_OTHER_STYLES`).
     */
    readonly style?: string | null;
}

/**
 * Reads a Cytoscape style file (a vizmap XML document or a 2.x `vizmap.props`) over a graph, giving the same styles
 * a Cytoscape session holding that graph and that style gives: the style's defaults, mappings and dependencies, the
 * values they resolve to on each node and edge, and Cytoscape's fallbacks for what the style leaves unset. Which
 * kind of file it is comes from its text: XML starts with `<`. A file that cannot be read is noted
 * (`W_STYLE_UNREADABLE`), never thrown.
 * @param file - the style file's bytes or text
 * @param snapshot - the graph the style is applied to
 * @param options - which style, the tool defaults, the cancel signal
 * @returns the styles, or null when the file holds none
 * @category Styles
 * @example
 * ```ts
 * const { snapshot } = await importGraph(networkBytes, { format: "xgmml" });
 * const styles = await readCytoscapeStyleFile(vizmapXmlBytes, snapshot, { style: "default" });
 * ```
 */
export async function readCytoscapeStyleFile(
    file: Uint8Array | string,
    snapshot: GraphSnapshot,
    options: CytoscapeStyleFileOptions = {},
): Promise<ExtractedStyles | null> {
    const signal = options.signal ?? null;
    const xml = isXml(file);
    const vizmap = xml ? await vizmapFromXml(file, signal) : await vizmapFromPropsInput(file, signal);
    const source: SessionStyleSource = {
        era: "3",
        vizmap: typeof vizmap === "string" ? null : vizmap,
        problem: typeof vizmap === "string" ? vizmap : null,
        visualStyle: typeof vizmap === "string" ? null : chosenStyle(vizmap, options.style ?? null),
        network: { index: 0, name: null },
        entry: xml ? "vizmap.xml" : "vizmap.props",
    };
    const report = new ImportReportBuilder(FORMAT, 0).keepForStyles(source).finish();
    return extractStyles(cysImporter, snapshot, report, options);
}

/**
 * Whether a style file is XML: its first character other than a byte order mark and whitespace is `<`.
 * @param file - the file
 * @returns true for XML
 */
function isXml(file: Uint8Array | string): boolean {
    if (typeof file === "string") {
        return /^\uFEFF?\s*</.test(file);
    }
    let i = file[0] === 0xef && file[1] === 0xbb && file[2] === 0xbf ? 3 : 0;
    while (i < file.length && (file[i] === 0x20 || file[i] === 0x09 || file[i] === 0x0a || file[i] === 0x0d)) {
        i++;
    }
    return file[i] === 0x3c;
}

/**
 * The style to read: the one named when the file holds it, else the first.
 * @param vizmap - the `<vizmap>` element
 * @param name - the caller's choice, or null
 * @returns the style's name, or null when the file holds none
 */
function chosenStyle(vizmap: XmlNode, name: string | null): string | null {
    const names = vizmap.children.filter((c) => c.name === "visualStyle").map((c) => c.attrs.get("name") ?? null);
    return name !== null && names.includes(name) ? name : (names.at(0) ?? null);
}

/**
 * A vizmap XML document as its tree.
 * @param file - the document
 * @param signal - the cancel signal
 * @returns its root element, or why it cannot be read
 */
async function vizmapFromXml(file: Uint8Array | string, signal: AbortSignal | null): Promise<XmlNode | string> {
    const bytes = typeof file === "string" ? new TextEncoder().encode(file) : file;
    const common = resolveImportOptions(
        { signal: signal ?? undefined },
        { ids: "keep", defaultDirected: true, weightFrom: null },
    );
    const root = await parseXmlTree(bytes, "vizmap.xml", new ImportReportBuilder(FORMAT, 0), common);
    if (typeof root !== "string" && root.name !== "vizmap") {
        return `the root element is <${root.name}>, not <vizmap>`;
    }
    return root;
}
