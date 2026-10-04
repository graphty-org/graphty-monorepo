/**
 * The layout of a Cytoscape session archive (`research-session-and-style.md` sections 2.1 to 2.3;
 * Cytoscape's `Cy3SessionReaderImpl`, `Cy2SessionReaderImpl` and `SessionUtil`): which entries
 * are the version marker, the networks, views, tables, styles and the rest, read from the central
 * directory alone. Entries are inflated one at a time, only when asked for, within the import's
 * byte budget.
 */

import { readBytes, textChunks } from "../../common/input.js";
import { type ResolvedImportOptions } from "../../common/options.js";
import { ImportReportBuilder } from "../../common/report.js";
import { tokenizeXml, xmlDeclaredEncoding, XmlSyntaxError } from "../../common/xml.js";
import { readZipDirectory, readZipEntry, type ZipEntry, ZipError } from "../../common/zip.js";
import { ImportError, type ImportInput } from "../../types.js";
import { CYS_ISSUE, FORMAT, MAX_RATIO } from "./constants.js";

/** An entry of the session, by its path under the session's root folder. */
export interface SessionEntry {
    /** The path under the root folder, as the archive spells it (URL-encoded parts). */
    readonly path: string;
    /** The full entry name, for messages. */
    readonly name: string;
    /** The zip entry. */
    readonly zip: ZipEntry;
}

/** A 3.x network file: one root network (a collection). */
export interface NetworkEntry extends SessionEntry {
    /** The root network's saved SUID. */
    readonly suid: string;
    /** The file name's network name, decoded. */
    readonly title: string;
}

/** A 3.x view file. */
interface ViewEntry extends SessionEntry {
    /** The SUID of the network the view shows. */
    readonly network: string;
    /** The view's SUID. */
    readonly view: string;
}

/** A 3.x table file. */
export interface TableEntry extends SessionEntry {
    /** The path under `tables/` (what `cytables.xml` names). */
    readonly tablePath: string;
    /** The SUID of the network the table belongs to. */
    readonly network: string;
    /** The namespace: LOCAL_ATTRS, SHARED_ATTRS, HIDDEN or an app's. */
    readonly namespace: string;
    /** The element class: CyNode, CyEdge or CyNetwork. */
    readonly element: "node" | "edge" | "network" | null;
}

/** What a session archive holds, by kind. */
interface SessionLayout {
    /** "3" for a 3.x session, "2" for a 2.x one. */
    readonly era: "2" | "3";
    /** The version marker as written (`3.0.0`), or the 2.x cysession.xml documentVersion. */
    readonly version: string;
    /** The root folder, with its trailing slash ("" when the entries have none). */
    readonly root: string;
    readonly networks: readonly NetworkEntry[];
    readonly views: readonly ViewEntry[];
    readonly tables: readonly TableEntry[];
    /** `tables/cytables.xml`, if present. */
    readonly cytables: SessionEntry | null;
    /** `apps/org.cytoscape.swing-application/network_list.xml`, if present. */
    readonly networkList: SessionEntry | null;
    /** 2.x: `cysession.xml`. */
    readonly cysession: SessionEntry | null;
    /** 2.x: the network files by their path. */
    readonly files: ReadonlyMap<string, SessionEntry>;
    /** The style entries (`session_vizmap.xml`, `session_vizmap.props`). */
    readonly styles: readonly SessionEntry[];
    /** Every entry the importer does not read. */
    readonly skipped: readonly string[];
}

/** An opened session: its bytes, its layout and an entry reader within the byte budget. */
export interface Session {
    readonly layout: SessionLayout;
    /**
     * Inflate one entry. Each entry counts against the byte budget and the progress once, however
     * often it is read.
     * @param entry - the entry
     * @returns its bytes
     */
    read(entry: SessionEntry): Promise<Uint8Array>;
    /** Report the progress complete: the import has read everything it needs. */
    done(): void;
}

/**
 * Java's `URLDecoder.decode` (UTF-8): `+` is a space, `%XX` a byte; a malformed escape leaves the
 * text as it is.
 * @param text - the encoded text
 * @returns the decoded text
 */
export function urlDecode(text: string): string {
    const plus = text.replace(/\+/g, " ");
    try {
        return decodeURIComponent(plus);
    } catch {
        return plus;
    }
}

/**
 * Read the input as a zip and lay out its session entries. Fatal: text input or not a zip
 * (E_CYS_NOT_ZIP), an empty input, a damaged archive (E_CYS_CORRUPT), a split archive
 * (E_CYS_UNSUPPORTED), no session marker (E_CYS_NOT_SESSION), a version graph-io cannot read
 * (E_CYS_VERSION).
 * @param input - the input
 * @param report - the report
 * @param common - cancellation and progress
 * @param maxBytes - the import's uncompressed byte budget
 * @returns the session
 */
export async function openSession(
    input: ImportInput,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
    maxBytes: number,
): Promise<Session> {
    const bytes = await readBytes(input, common);
    if (bytes === null) {
        report.fail(
            CYS_ISSUE.NOT_ZIP,
            "a Cytoscape session is a zip archive; text input cannot hold one (pass the bytes)",
        );
    }
    if (bytes.byteLength === 0) {
        report.fail(CYS_ISSUE.EMPTY_INPUT, "the input is empty");
    }
    let zipEntries: ZipEntry[];
    try {
        zipEntries = readZipDirectory(bytes);
    } catch (err) {
        return zipFailure(err, report);
    }
    const layout = layoutOf(zipEntries, report);
    let budget = maxBytes;
    let inflated = 0;
    // the progress total: the entries the importer may read, not images and app files
    const total = [
        ...layout.networks,
        ...layout.views,
        ...layout.tables,
        ...layout.files.values(),
        ...[layout.cytables, layout.networkList, layout.cysession].filter((e) => e !== null),
    ].reduce((sum, e) => sum + e.zip.size, 0);
    const charged = new Set<string>();
    return {
        layout,
        read: async (entry: SessionEntry): Promise<Uint8Array> => {
            const first = !charged.has(entry.name);
            const before = inflated;
            try {
                const data = await readZipEntry(bytes, entry.zip, {
                    signal: common.signal,
                    maxBytes: first ? budget : entry.zip.size,
                    maxRatio: MAX_RATIO,
                    onBytes: first ? (n): void => common.onProgress?.(Math.min(before + n, total), total) : undefined,
                });
                if (first) {
                    charged.add(entry.name);
                    budget -= data.byteLength;
                    inflated += data.byteLength;
                }
                return data;
            } catch (err) {
                return zipFailure(err, report);
            }
        },
        done: (): void => {
            common.onProgress?.(total, total);
        },
    };
}

/**
 * Fail the import with the fatal issue of a zip error (any other error is rethrown).
 * @param err - the error
 * @param report - the report
 */
function zipFailure(err: unknown, report: ImportReportBuilder): never {
    if (!(err instanceof ZipError)) {
        throw err;
    }
    const code = {
        "not-zip": CYS_ISSUE.NOT_ZIP,
        corrupt: CYS_ISSUE.CORRUPT,
        unsupported: CYS_ISSUE.UNSUPPORTED,
        "too-large": CYS_ISSUE.TOO_LARGE,
    }[err.kind];
    if (err.kind === "too-large") {
        // the size limits are not a parse error: graph-io records E_TOO_LARGE as unsupported
        report.error("unsupported", code, err.message);
        throw report.abort(err.message, { code });
    }
    report.fail(code, err.message);
}

/**
 * The session marker of the archive: the shallowest entry whose name ends in `.version` (a
 * session re-zipped inside another folder keeps its layout one level down), else null.
 * @param names - the entry names
 * @param suffix - the marker's file name pattern
 * @returns the names of the shallowest such entries, in directory order
 */
function shallowest(names: readonly string[], suffix: RegExp): string[] {
    const depth = (name: string): number => name.split("/").length;
    const found = names.filter((n) => suffix.test(n));
    const least = Math.min(...found.map(depth));
    return found.filter((n) => depth(n) === least);
}

/** A 3.x network entry name: `<SUID>[-<name>].xgmml`. */
const NETWORK_FILE = /^networks\/(\d+)(?:-([^/]*))?\.xgmml$/;
/** A 3.x view entry name: `<networkSUID>-<viewSUID>[-<title>].xgmml`. */
const VIEW_FILE = /^views\/(\d+)-(\d+)(?:-[^/]*)?\.xgmml$/;
/** A 3.x table: `tables/<networkSUID>[-<name>]/<namespace>-<class>-<title>.cytable`. */
const TABLE_FILE = /^tables\/((\d+)(?:-[^/]*)?\/([^/-]+)-([^/-]+)-[^/]*\.cytable)$/;

/** Entries of other tools that carry nothing: macOS resource forks and folder metadata. */
const NOISE = /(^|\/)(__MACOSX\/|\.DS_Store$)/;

/**
 * Lay out the entries: drop directory entries and macOS noise, keep the first of a repeated name
 * (W_CYS_DUPLICATE_ENTRY), find the session marker and its root folder, classify what is under
 * it, and list what is not read.
 * @param zipEntries - the central directory
 * @param report - the report
 * @returns the layout
 */
function layoutOf(zipEntries: readonly ZipEntry[], report: ImportReportBuilder): SessionLayout {
    const byName = new Map<string, ZipEntry>();
    const repeated: string[] = [];
    for (const entry of zipEntries) {
        // a Windows tool may write backslashes, which APPNOTE 4.4.17 forbids: read them as "/"
        const name = entry.name.replace(/\\/g, "/");
        if (name.endsWith("/") || NOISE.test(name)) {
            continue;
        }
        if (byName.has(name)) {
            repeated.push(name);
            continue;
        }
        byName.set(name, entry);
    }
    if (repeated.length > 0) {
        report.warning(
            "unsupported",
            CYS_ISSUE.DUPLICATE_ENTRY,
            `${repeated.length} entry name(s) appear more than once; the first of each is read: ${listed(repeated)}`,
        );
    }
    const names = [...byName.keys()];
    const markers = shallowest(names, /(^|\/)[^/]+\.version$/);
    const marker = markers.at(0);
    const cysession = shallowest(names, /(^|\/)cysession\.xml$/).at(0);
    if (markers.length > 1) {
        report.warning(
            "validation-error",
            CYS_ISSUE.ENTRY_SKIPPED,
            `the session has ${markers.length} version markers (${listed(markers)}); ${markers[0]} is used and the others are not read`,
        );
    }
    if (marker === undefined && cysession === undefined) {
        report.fail(
            CYS_ISSUE.NOT_SESSION,
            "the zip holds neither a session version marker (<x.y.z>.version) nor cysession.xml: it is not a Cytoscape session",
        );
    }
    const anchor = marker ?? (cysession as string);
    const root = anchor.slice(0, anchor.lastIndexOf("/") + 1);
    let era: "2" | "3" = "2";
    let version = "2.0.0";
    if (marker !== undefined) {
        version = marker.slice(root.length, -".version".length);
        if (!/^\d+(\.\d+)*$/.test(version)) {
            report.fail(
                CYS_ISSUE.VERSION,
                `the session version marker ${marker} does not parse as a version (<major>.<minor>.<patch>.version)`,
            );
        }
        const major = Number(version.split(".")[0]);
        if (major > 3) {
            report.fail(
                CYS_ISSUE.VERSION,
                `the session version ${version} is newer than the Cytoscape 3 sessions graph-io reads`,
            );
        }
        era = major === 3 ? "3" : "2";
    }
    const layout = {
        era,
        version,
        root,
        networks: [] as NetworkEntry[],
        views: [] as ViewEntry[],
        tables: [] as TableEntry[],
        cytables: null as SessionEntry | null,
        networkList: null as SessionEntry | null,
        cysession: null as SessionEntry | null,
        files: new Map<string, SessionEntry>(),
        styles: [] as SessionEntry[],
        skipped: [] as string[],
    };
    for (const [name, zip] of byName) {
        if (!name.startsWith(root) || name === marker) {
            if (name !== marker && !markers.includes(name)) {
                layout.skipped.push(name);
            }
            continue;
        }
        const path = name.slice(root.length);
        const entry: SessionEntry = { path, name, zip };
        if (era === "3") {
            classify3(entry, layout);
        } else {
            classify2(entry, layout);
        }
    }
    return layout;
}

/**
 * Classify one entry of a 3.x session.
 * @param entry - the entry
 * @param layout - the layout being built
 */
function classify3(entry: SessionEntry, layout: Mutable): void {
    const { path } = entry;
    const network = NETWORK_FILE.exec(path);
    const view = VIEW_FILE.exec(path);
    const table = TABLE_FILE.exec(path);
    if (network !== null) {
        layout.networks.push({ ...entry, suid: network[1], title: urlDecode(network[2] ?? "") });
    } else if (view !== null) {
        layout.views.push({ ...entry, network: view[1], view: view[2] });
    } else if (path === "tables/cytables.xml") {
        layout.cytables = entry;
    } else if (table !== null) {
        const element = {
            "org.cytoscape.model.CyNode": "node",
            "org.cytoscape.model.CyEdge": "edge",
            "org.cytoscape.model.CyNetwork": "network",
        }[urlDecode(table[4])] as TableEntry["element"] | undefined;
        if (element === undefined) {
            // a table of an element class graph-io has no model for
            layout.skipped.push(entry.name);
            return;
        }
        layout.tables.push({
            ...entry,
            tablePath: table[1],
            network: table[2],
            namespace: urlDecode(table[3]),
            element,
        });
    } else if (path === "apps/org.cytoscape.swing-application/network_list.xml") {
        layout.networkList = entry;
    } else if (/(^|\/)session_vizmap\.(xml|props)$/.test(path)) {
        layout.styles.push(entry);
    } else {
        layout.skipped.push(entry.name);
    }
}

/**
 * Classify one entry of a 2.x session.
 * @param entry - the entry
 * @param layout - the layout being built
 */
function classify2(entry: SessionEntry, layout: Mutable): void {
    const { path } = entry;
    if (path === "cysession.xml") {
        layout.cysession = entry;
    } else if (/^[^/]+\.xgmml$/.test(path)) {
        layout.files.set(path, entry);
    } else if (/^session_vizmap\.(props|xml)$/.test(path)) {
        layout.styles.push(entry);
    } else {
        layout.skipped.push(entry.name);
    }
}

/** The layout while it is built. */
type Mutable = {
    -readonly [K in keyof SessionLayout]: SessionLayout[K] extends readonly (infer T)[] ? T[] : SessionLayout[K];
} & { files: Map<string, SessionEntry> };

/**
 * A list of names for a message: the first ten, then a count.
 * @param names - the names
 * @returns the text
 */
export function listed(names: readonly string[]): string {
    const head = names.slice(0, 10).join(", ");
    return names.length > 10 ? `${head} and ${names.length - 10} more` : head;
}

/** One element of a small XML document, as a tree. */
export interface XmlNode {
    /** The local name. */
    readonly name: string;
    /** The attributes by name as written (prefix included). */
    readonly attrs: ReadonlyMap<string, string>;
    /** The child elements. */
    readonly children: XmlNode[];
}

/**
 * Read a small XML entry (`cytables.xml`, `network_list.xml`, `cysession.xml`) as a tree. A
 * document that is not well-formed is E_CYS_CORRUPT naming the entry.
 * @param bytes - the entry's bytes
 * @param entry - the entry name
 * @param report - the report
 * @param common - cancellation
 * @returns the root element
 */
export async function readXmlTree(
    bytes: Uint8Array,
    entry: string,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<XmlNode> {
    const tree = await parseXmlTree(bytes, entry, report, common);
    return typeof tree === "string" ? report.fail(CYS_ISSUE.CORRUPT, `${entry}: ${tree}`) : tree;
}

/**
 * Read a small XML entry as a tree; its decoding warnings (W_ENCODING_FALLBACK,
 * W_UNKNOWN_ENCODING) go into the report with the entry name.
 * @param bytes - the entry's bytes
 * @param entry - the entry name
 * @param report - the report
 * @param common - cancellation
 * @returns the root element, or why the entry cannot be read
 */
export async function parseXmlTree(
    bytes: Uint8Array,
    entry: string,
    report: ImportReportBuilder,
    common: ResolvedImportOptions,
): Promise<XmlNode | string> {
    const scratch = new ImportReportBuilder(FORMAT, 0);
    const stack: XmlNode[] = [{ name: "", attrs: new Map(), children: [] }];
    try {
        await tokenizeXml(
            textChunks(bytes, scratch, { signal: common.signal, declaredEncoding: xmlDeclaredEncoding }),
            {
                start(name, attrs): void {
                    const node: XmlNode = { name: name.slice(name.lastIndexOf(":") + 1), attrs, children: [] };
                    stack[stack.length - 1].children.push(node);
                    stack.push(node);
                },
                end(): void {
                    stack.pop();
                },
                text(): void {
                    // the session documents keep everything in attributes
                },
            },
        );
    } catch (err) {
        if (err instanceof XmlSyntaxError || err instanceof ImportError) {
            return err.message;
        }
        throw err;
    }
    for (const issue of scratch.issues) {
        report.warning(issue.category, issue.code, `${entry}: ${issue.message}`, {
            line: issue.line,
            element: issue.element,
        });
    }
    const [root] = stack[0].children;
    return root ?? "the document is empty";
}

/**
 * Every element of a tree with a local name, depth first.
 * @param node - the tree
 * @param name - the local name
 * @returns the elements
 */
export function elementsNamed(node: XmlNode, name: string): XmlNode[] {
    const out: XmlNode[] = [];
    const stack = [node];
    while (stack.length > 0) {
        const n = stack.pop() as XmlNode;
        if (n.name === name) {
            out.push(n);
        }
        for (let i = n.children.length - 1; i >= 0; i--) {
            stack.push(n.children[i]);
        }
    }
    return out;
}
