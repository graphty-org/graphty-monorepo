/**
 * Cytoscape 2.x styles (`vizmap.props`, a session's `session_vizmap.props`) as the `<vizmap>` tree a 3.x
 * `session_vizmap.xml` parses to, so one style reader serves both. A port of Cytoscape 3's own conversion:
 * cytoscape-impl io-impl `VisualStyleSerializer.createVisualStyles`, `CalculatorConverter` and
 * `CalculatorConverterFactory` (https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/util/vizmap),
 * with the 2.x identifiers read through DVisualLexicon's identifier mappings (lexicon.ts `legacyVisualProperty`).
 */

import { readText } from "../../common/input.js";
import { ImportReportBuilder } from "../../common/report.js";
import { legacyVisualProperty } from "../../styles/cytoscape/lexicon.js";
import { ImportError } from "../../types.js";
import { FORMAT } from "./constants.js";
import type { XmlNode } from "./session.js";

/**
 * The key/value pairs of a Java properties document (java.util.Properties.load): `#` and `!` comment lines, `=`,
 * `:` or whitespace between key and value, backslash continuation lines, and the `\t \n \r \f \uXXXX` escapes; a
 * later key replaces an earlier one, keeping the earlier one's place.
 * @param text - the document, already decoded (2.x writes ISO-8859-1)
 * @returns the pairs in the order the file first gives each key
 */
export function parseJavaProperties(text: string): Map<string, string> {
    const out = new Map<string, string>();
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/^[ \t\f]+/, "");
        if (line === "" || line.startsWith("#") || line.startsWith("!")) {
            continue;
        }
        // an odd run of trailing backslashes continues the line on the next, its leading whitespace dropped
        while (/(?<!\\)(?:\\\\)*\\$/.test(line) && i + 1 < lines.length) {
            i++;
            line = line.slice(0, -1) + lines[i].replace(/^[ \t\f]+/, "");
        }
        const [key, value] = splitPair(line);
        out.set(unescape(key), unescape(value));
    }
    return out;
}

/**
 * One logical line's raw key and raw value.
 * @param line - the line, leading whitespace dropped
 * @returns the key and the value, both still escaped
 */
function splitPair(line: string): [string, string] {
    let k = 0;
    while (k < line.length && !"=: \t\f".includes(line[k])) {
        k += line[k] === "\\" ? 2 : 1;
    }
    const key = line.slice(0, k);
    let v = k;
    while (v < line.length && " \t\f".includes(line[v])) {
        v++;
    }
    if (v < line.length && (line[v] === "=" || line[v] === ":")) {
        v++;
        while (v < line.length && " \t\f".includes(line[v])) {
            v++;
        }
    }
    return [key, line.slice(v)];
}

const ESCAPES: Readonly<Record<string, string>> = { t: "\t", n: "\n", r: "\r", f: "\f" };

/**
 * A properties key or value with its escapes read.
 * @param s - the raw text
 * @returns the text
 */
function unescape(s: string): string {
    return s.replaceAll(/\\(u[\da-fA-F]{4}|.?)/g, (_, e: string) => {
        if (e.length === 5) {
            return String.fromCodePoint(Number.parseInt(e.slice(1), 16));
        }
        return ESCAPES[e] ?? e;
    });
}

/** The section of a style a 2.x key writes to. */
type Section = "network" | "node" | "edge";

/** An element while it is built. */
interface NodeBuild {
    readonly name: string;
    readonly attrs: Map<string, string>;
    readonly children: XmlNode[];
}

/** One style's sections while it is built: dependencies and visual properties by name. */
interface StyleBuild {
    readonly name: string;
    readonly sections: Record<Section, { deps: Map<string, boolean>; vps: Map<string, NodeBuild> }>;
}

/** The 3.x names of the 2.x dependencies (VisualStyleSerializer looks them up regardless of case). */
const DEPENDENCIES: ReadonlyMap<string, string> = new Map([
    ["nodesizelocked", "nodeSizeLocked"],
    ["arrowcolormatchesedge", "arrowColorMatchesEdge"],
    ["nodecustomgraphicssizesync", "nodeCustomGraphicsSizeSync"],
    ["nodelabelcolorfromnodecolor", "nodeLabelColorFromNodeColor"],
]);

/**
 * The 2.x styles of a properties document as a `<vizmap>` tree of `<visualStyle>` elements, one per style the
 * keys name, in the order the file first names each.
 * @param props - the document's pairs
 * @returns the `<vizmap>` element
 */
export function vizmapFromProps(props: ReadonlyMap<string, string>): XmlNode {
    const styles = new Map<string, StyleBuild>();
    for (const [key, value] of props) {
        const styleName = parseStyleName(key);
        if (styleName === null || !isConvertible(key)) {
            continue;
        }
        let style = styles.get(styleName);
        if (style === undefined) {
            const section = (): StyleBuild["sections"]["node"] => ({ deps: new Map(), vps: new Map() });
            style = { name: styleName, sections: { network: section(), node: section(), edge: section() } };
            styles.set(styleName, style);
        }
        for (const k of updateLegacyPropsKey(key)) {
            convert(style, k, k === key ? null : key, value, props);
        }
    }
    return {
        name: "vizmap",
        attrs: new Map([["documentVersion", "2"]]),
        children: Array.from(styles.values(), styleNode),
    };
}

/**
 * A built style as its `<visualStyle>` element.
 * @param style - the style
 * @returns the element
 */
function styleNode(style: StyleBuild): XmlNode {
    return {
        name: "visualStyle",
        attrs: new Map([["name", style.name]]),
        children: (["network", "node", "edge"] as const).map((s) => ({
            name: s,
            attrs: new Map(),
            children: [
                ...Array.from(style.sections[s].deps, ([name, v]) => el("dependency", { name, value: String(v) })),
                ...style.sections[s].vps.values(),
            ],
        })),
    };
}

/**
 * An element with attributes and children.
 * @param name - its name
 * @param attrs - its attributes; undefined ones are left out
 * @param children - its children
 * @returns the element
 */
function el(name: string, attrs: Record<string, string | undefined>, children: XmlNode[] = []): NodeBuild {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(attrs)) {
        if (v !== undefined) {
            map.set(k, v);
        }
    }
    return { name, attrs: map, children };
}

/**
 * The style a 2.x key belongs to (CalculatorConverter.parseStyleName).
 * @param key - the key
 * @returns the style's name, or null for a key of no style
 */
function parseStyleName(key: string): string | null {
    const tokens = key.split(".");
    if (tokens.length !== 3 || !/^(?:node|edge|global)[a-zA-Z]+Calculator$/.test(tokens[0])) {
        return null;
    }
    return /^(?:nodeSizeLocked|arrowColorMatchesEdge|nodeLabelColorFromNodeColor|defaultNodeShowNestedNetwork|nodeCustomGraphicsSizeSync|(?:node|edge)LabelColor|(?:node|edge)[a-zA-Z]+Calculator|default(?:Node|Edge|Background|SloppySelection)[a-zA-Z0-9]+)$/.test(
        tokens[2],
    )
        ? tokens[1]
        : null;
}

const DEFAULT_KEY =
    /^(?:globalAppearanceCalculator\.[^.]+\.default[a-zA-Z]+Color|nodeAppearanceCalculator\.[^.]+\.default(?:Node|NODE)\w+|edgeAppearanceCalculator\.[^.]+\.default(?:Edge|EDGE)[a-zA-Z_]+)$/;
const MAPPING_KEY =
    /^(node|edge)AppearanceCalculator\.[^.]+\.\1(?:CustomGraphics(?:Position)?\d+|LabelColor|[a-z_]+Calculator)$/i;
const DEPENDENCY_KEY =
    /^(?:nodeAppearanceCalculator\.[^.]+\.(?:nodeSizeLocked|nodeLabelColorFromNodeColor|nodeCustomGraphicsSizeSync)|edgeAppearanceCalculator\.[^.]+\.arrowColorMatchesEdge)$/;

/**
 * Whether a key is a default, a mapping or a dependency.
 * @param key - the key
 * @returns true when Cytoscape converts it
 */
function isConvertible(key: string): boolean {
    return DEFAULT_KEY.test(key) || MAPPING_KEY.test(key) || DEPENDENCY_KEY.test(key);
}

/**
 * The 3.x keys of a 2.x key (CalculatorConverterFactory.updateLegacyPropsKey): a line type is a line style and a
 * width, an arrow a color and a shape, an edge color both edge paints.
 * @param key - the key
 * @returns the keys it stands for
 */
function updateLegacyPropsKey(key: string): string[] {
    const [calc, style, vp] = key.split(".");
    const prefix = `${calc}.${style}.`;
    if (/^(?:default)?(?:node|edge)LineType(?:Calculator)?$/i.test(vp)) {
        return [prefix + vp.replace("LineType", "LineStyle"), prefix + vp.replace("LineType", "LineWidth")];
    }
    if (/^(?:default)?Edge(?:Source|Target)Arrow(?:Calculator)?$/i.test(vp)) {
        return [prefix + vp.replace("Arrow", "ArrowColor"), prefix + vp.replace("Arrow", "ArrowShape")];
    }
    if (/^(?:default)?EdgeColor(?:Calculator)?$/i.test(vp)) {
        return [
            prefix + vp.replaceAll(/EdgeColor/gi, "EDGE_UNSELECTED_PAINT"),
            prefix + vp.replaceAll(/EdgeColor/gi, "EDGE_STROKE_UNSELECTED_PAINT"),
        ];
    }
    return [key];
}

/**
 * One converted key into its style (CalculatorConverter.convert).
 * @param style - the style
 * @param key - the 3.x key
 * @param legacyKey - the 2.x key it came from, or null when it is its own
 * @param value - the key's value
 * @param props - every pair, for a mapping's own keys
 */
function convert(
    style: StyleBuild,
    key: string,
    legacyKey: string | null,
    value: string,
    props: ReadonlyMap<string, string>,
): void {
    const part = key.split(".")[2];
    const id = part.replaceAll(/default|calculator|uniform/gi, "").toLowerCase();
    const section = targetOf(part);
    const fix = (v: string | undefined): string | undefined => updateLegacyValue(part, legacyKey !== null, v);
    if (DEPENDENCY_KEY.test(key)) {
        style.sections[section].deps.set(DEPENDENCIES.get(id) ?? id, value.trim().toLowerCase() === "true");
        return;
    }
    const name = legacyVisualProperty(section, id) ?? id.toUpperCase();
    const { vps } = style.sections[section];
    let vp = vps.get(name);
    if (vp === undefined) {
        vp = el("visualProperty", { name });
        vps.set(name, vp);
    }
    if (DEFAULT_KEY.test(key)) {
        const d = fix(value);
        if (d !== undefined) {
            vp.attrs.set("default", d);
        }
    } else if (MAPPING_KEY.test(key)) {
        const legacyPart = legacyKey === null ? null : legacyKey.split(".")[2];
        const mapping = mappingOf(props, legacyPart ?? part, value, fix);
        if (mapping !== null) {
            vp.children.length = 0;
            vp.children.push(mapping);
        }
    }
}

/**
 * The section a 2.x key part writes to (CalculatorConverter.parseTargetDataType).
 * @param part - the key's last part
 * @returns the section
 */
function targetOf(part: string): Section {
    const lower = part.toLowerCase();
    if (lower.includes("node")) {
        return "node";
    }
    return lower.includes("edge") ? "edge" : "network";
}

/**
 * A value of a key that was split from an older one, in its new spelling (CalculatorConverter.updateLegacyValue):
 * `LINE_2` is the style SOLID or the width 2, `WHITE_DELTA` the color 255,255,255 or the shape DELTA.
 * @param part - the new key's last part
 * @param legacy - whether the key was split from an older one
 * @param value - the value
 * @returns the value to use, or undefined for none
 */
function updateLegacyValue(part: string, legacy: boolean, value: string | undefined): string | undefined {
    if (value === undefined || !legacy) {
        return value;
    }
    const rule = LEGACY_VALUES.find(([pattern]) => pattern.test(part));
    return rule === undefined ? value : rule[1](value, value.split("_"));
}

// How each split key reads an old value: the value and its `_`-separated parts.
const LEGACY_VALUES: readonly (readonly [RegExp, (value: string, vv: string[]) => string | undefined])[] = [
    [
        /^(?:default)?(?:node|edge)LineStyle(?:Calculator)?$/i,
        (_, vv) => (vv.length === 2 ? LINE_STYLES.get(vv[0]) : undefined),
    ],
    [/^(?:default)?(?:node|edge)LineWidth(?:Calculator)?$/i, (_, vv) => (vv.length === 2 ? vv[1] : undefined)],
    [
        /^(?:default)?Edge(?:Source|Target)ArrowColor(?:Calculator)?$/i,
        (v, vv) => (v.toUpperCase() !== "NONE" && vv.length === 2 ? ARROW_COLORS.get(vv[0]) : undefined),
    ],
    [
        /^(?:default)?Edge(?:Source|Target)ArrowShape(?:Calculator)?$/i,
        (v, vv) => {
            if (v.toUpperCase() === "NONE") {
                return "NONE";
            }
            return vv.length === 2 ? vv[1] : undefined;
        },
    ],
];

const LINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["", "SOLID"],
    ["LINE", "SOLID"],
    ["DASHED", "EQUAL_DASH"],
]);
const ARROW_COLORS: ReadonlyMap<string, string> = new Map([
    ["WHITE", "255,255,255"],
    ["BLACK", "0,0,0"],
]);

/** 2.x `controllerType` codes as 3.x attribute types; anything else is a string. */
const CONTROLLER_TYPES: ReadonlyMap<string, string> = new Map([
    ["1", "boolean"],
    ["2", "float"],
    ["3", "integer"],
]);

/** Cytoscape 2.3's names of calculators later renamed. */
const OLD_CALCULATORS: readonly (readonly [RegExp, string])[] = [
    [/^nodeFillColorCalculator/, "nodeColorCalculator"],
    [/^edge(?:Source|Target)ArrowCalculator$/, "edgeArrowCalculator"],
];

/**
 * A 2.x calculator's mapping as a 3.x mapping element (CalculatorConverter.getMappingFunction).
 * @param props - every pair
 * @param calcKey - the calculator kind (`nodeFillColorCalculator`)
 * @param calcName - the calculator's name, the mapping key's value
 * @param fix - converts one value of the mapping to its new spelling
 * @returns the mapping element, or null when the calculator is not in the file
 */
function mappingOf(
    props: ReadonlyMap<string, string>,
    calcKey: string,
    calcName: string,
    fix: (v: string | undefined) => string | undefined,
): XmlNode | null {
    let base = `${calcKey}.${calcName}.mapping.`;
    let type = props.get(`${base}type`);
    if (type === undefined) {
        // Cytoscape 2.3's calculator names
        const old = OLD_CALCULATORS.find(([pattern]) => pattern.test(calcKey))?.[1];
        if (old === undefined) {
            return null;
        }
        base = `${old}.${calcName}.mapping.`;
        type = props.get(`${base}type`);
        if (type === undefined) {
            return null;
        }
    }
    let column = props.get(`${base}controller`);
    if (column === undefined) {
        return null;
    }
    // "ID" is the name column
    if (column.toLowerCase() === "id") {
        column = "name";
    }
    switch (type.toLowerCase()) {
        case "discretemapping":
            return discreteOf(props, base, column, fix);
        case "continuousmapping":
            return continuousOf(props, base, column, fix);
        case "passthroughmapping":
            return el("passthroughMapping", { attributeName: column, attributeType: "string" });
        default:
            return null;
    }
}

/**
 * A 2.x discrete mapping. `has_nested_network` is a yes/no string in 2.x and a boolean in 3.x.
 * @param props - every pair
 * @param base - the mapping's key prefix
 * @param column - the mapped column
 * @param fix - converts one value to its new spelling
 * @returns the `<discreteMapping>` element
 */
function discreteOf(
    props: ReadonlyMap<string, string>,
    base: string,
    column: string,
    fix: (v: string | undefined) => string | undefined,
): XmlNode {
    const nested = column === "has_nested_network";
    const type = nested ? "boolean" : (CONTROLLER_TYPES.get(props.get(`${base}controllerType`) ?? "") ?? "string");
    const prefix = `${base}map.`;
    const entries: XmlNode[] = [];
    for (const [k, v] of props) {
        if (!k.startsWith(prefix)) {
            continue;
        }
        let key = k.slice(prefix.length);
        if (nested) {
            key = /^(?:yes|true)$/i.test(key) ? "true" : "false";
        }
        entries.push(el("discreteMappingEntry", { attributeValue: key, value: fix(v) }));
    }
    return el("discreteMapping", { attributeName: column, attributeType: type }, entries);
}

/**
 * A 2.x continuous mapping. An empty lesser or greater value (2.x writes one beside the outermost points) is left
 * out.
 * @param props - every pair
 * @param base - the mapping's key prefix
 * @param column - the mapped column
 * @param fix - converts one value to its new spelling
 * @returns the `<continuousMapping>` element
 */
function continuousOf(
    props: ReadonlyMap<string, string>,
    base: string,
    column: string,
    fix: (v: string | undefined) => string | undefined,
): XmlNode {
    const n = Number.parseInt(props.get(`${base}boundaryvalues`) ?? "", 10);
    const points: XmlNode[] = [];
    const get = (i: number, side: string): string | undefined => {
        const v = fix(props.get(`${base}bv${i}.${side}`));
        return v === "" ? undefined : v;
    };
    for (let i = 0; i < (Number.isFinite(n) ? n : 0); i++) {
        const at = props.get(`${base}bv${i}.domainvalue`);
        if (at === undefined || !Number.isFinite(Number(at))) {
            continue;
        }
        points.push(
            el("continuousMappingPoint", {
                attrValue: at,
                lesserValue: get(i, "lesser"),
                equalValue: get(i, "equal"),
                greaterValue: get(i, "greater"),
            }),
        );
    }
    return el("continuousMapping", { attributeName: column, attributeType: "float" }, points);
}

/**
 * A 2.x `vizmap.props` as the vizmap tree it converts to. Java writes properties in ISO-8859-1.
 * @param file - the document
 * @param signal - the cancel signal
 * @returns the `<vizmap>` element, or why it cannot be read
 */
export async function vizmapFromPropsInput(
    file: Uint8Array | string,
    signal: AbortSignal | null,
): Promise<XmlNode | string> {
    try {
        const text = await readText(file, new ImportReportBuilder(FORMAT, 0), {
            signal,
            encoding: typeof file === "string" ? null : "iso-8859-1",
            allowEmpty: true,
        });
        return vizmapFromProps(parseJavaProperties(text));
    } catch (err) {
        if (err instanceof ImportError) {
            return err.message;
        }
        throw err;
    }
}
