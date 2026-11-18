/**
 * What yEd draws inside a node beside its outline, as a picture over the node: the lines inside a flowchart predefined
 * process, internal storage, direct data and database and a sequential data's tail (`yed-graphml-specimen-node-shapes-p2`,
 * and yEd Live in `yed-live-graphml-specimen-node-shapes-p3`), and a UML class's stereotype, constraint,
 * attributes and methods. The symbols inside BPMN nodes are `yedBpmnPicture`'s (styles-yed-live-drawing.ts).
 */
import { escapeSvg, svgPicture } from "./styles-yed-live-drawing.js";

/** How far in from the side a predefined process's and an internal storage's lines are drawn. */
const FLOWCHART_INSET = 10;

/** A flowchart GenericNode a picture is drawn over. */
interface FlowchartNode {
    /** The GenericNode's `configuration`. */
    readonly kind: string;
    /** Its size as drawn. */
    readonly width: number;
    readonly height: number;
    /** Its border's color as `#rrggbb`, and its border's width. */
    readonly line: string | null;
    readonly border: number;
}

/**
 * The picture of the lines yEd draws inside a flowchart predefined process, internal storage, direct data or database,
 * or beside a sequential data, in its border's color, or null for a node of another kind. The node's size is its
 * outline's, a sequential data's square.
 * @param node - the node
 * @returns the picture URL, drawn over the node's box, or null
 */
export function yedNodePicture(node: FlowchartNode): string | null {
    const { width: w, height: h } = node;
    const n = (v: number): string => String(Math.round(v * 1000) / 1000);
    const kind = node.kind.toLowerCase().replace(/^com\.yworks\./, "");
    const inset = n(FLOWCHART_INSET);
    let lines: string;
    if (kind === "flowchart.predefinedprocess") {
        lines = `M${inset},0L${inset},${n(h)}M${n(w - FLOWCHART_INSET)},0L${n(w - FLOWCHART_INSET)},${n(h)}`;
    } else if (kind === "flowchart.internalstorage") {
        lines = `M${inset},0L${inset},${n(h)}M0,${inset}L${n(w)},${inset}`;
    } else if (kind === "flowchart.directdata") {
        // the near rim of the drum on its side, bulging in by a quarter of its height
        lines = `M${n(w - h / 8)},0Q${n(w - (3 * h) / 8)},${n(h / 2)} ${n(w - h / 8)},${n(h)}`;
    } else if (kind === "flowchart.database") {
        // the near rim of the cylinder's top, a fifth of its height down
        lines = `M${n(w)},${n(h / 5)}C${n(w * 0.97)},${n((2 * h) / 5)} ${n(w * 0.03)},${n((2 * h) / 5)} 0,${n(h / 5)}`;
    } else if (kind === "flowchart.sequentialdata") {
        // the tape's tail, from the bottom of the circle to its right
        lines = `M${n(w / 2)},${n(h)}L${n(w)},${n(h)}`;
    } else {
        return null;
    }
    const body = `<path fill="none" stroke="${node.line ?? "#000000"}" d="${lines}"/>`;
    return svgPicture(w, h, node.border, body, "", undefined, "yed");
}

/*
 * A UML class's lines as yEd 3.25 lays them out (`yed-graphml-specimen-node-shapes-p3`, `graphml-synthetic-nodes`,
 * `graphml-libcitygml-mapping`): 5 from the top, the stereotype in 12px type with 9 under it, the name, then the
 * constraint in 12px type with 7 over and under it, else 5; then each compartment (the attributes, then the methods)
 * one 12px line a row with 5 over and under its rows, a rule 1 above its top. Type is measured by DejaVu Sans, the face
 * Java draws Dialog and DejaVu Sans in: 0.928 of its size above the baseline, 1.164 of it in all.
 */
const UML_TOP = 5;
const UML_TYPE = 12;
const UML_ASCENT = 0.92822;
const UML_LINE = 1.16406;
const UML_STEREOTYPE_GAP = 9;
const UML_CONSTRAINT_GAP = 7;
const UML_PAD = 5;
const UML_TEXT_LEFT = 5;

/** How far a UML class's stereotype moves its name down: its line and the gap under it. */
export const YED_UML_STEREOTYPE_DROP = UML_TYPE * UML_LINE + UML_STEREOTYPE_GAP;

/** A yEd UMLClassNode's words, as its `y:UML` and its name label hold them. */
export interface YedUmlClass {
    readonly width: number;
    readonly height: number;
    /** Its border's width as drawn (0 for a raised class), and its color, which its rules are drawn in. */
    readonly border: number;
    readonly line: string;
    /** The name label's font family as drawn, and its size. */
    readonly family: string;
    readonly nameSize: number;
    readonly stereotype: string;
    readonly constraint: string;
    readonly attributes: string;
    readonly methods: string;
    readonly omitDetails: boolean;
}

/**
 * The picture of what yEd draws in a UML class beside its name: its stereotype, its constraint, and, unless it omits
 * its details, its attributes and methods under a rule each. With no attributes and no methods yEd draws no rules
 * (`graphml-libcitygml-mapping`); a class with only one of the two is drawn here with both compartments, unproven.
 * @param uml - the class
 * @returns the picture URL, drawn over the node's box, or null where yEd draws nothing more than the name
 */
export function yedUmlClassPicture(uml: YedUmlClass): string | null {
    const n = (v: number): string => String(Math.round(v * 1000) / 1000);
    const font = `font-size="${String(UML_TYPE)}" font-family="${escapeSvg(uml.family)}" fill="#000000"`;
    const line = UML_TYPE * UML_LINE;
    const ascent = UML_TYPE * UML_ASCENT;
    const centered = (y: number, words: string): string =>
        `<text x="${n(uml.width / 2)}" y="${n(y)}" text-anchor="middle" ${font}>${escapeSvg(words)}</text>`;
    const parts: string[] = [];
    let y = UML_TOP;
    if (uml.stereotype !== "") {
        parts.push(centered(y + ascent, `<<${uml.stereotype}>>`));
        y += YED_UML_STEREOTYPE_DROP;
    }
    y += uml.nameSize * UML_LINE;
    if (uml.constraint === "") {
        y += UML_PAD;
    } else {
        parts.push(centered(y + UML_CONSTRAINT_GAP + ascent, `{${uml.constraint}}`));
        y += 2 * UML_CONSTRAINT_GAP + line;
    }
    const compartments = [uml.attributes, uml.methods].map((text) => (text === "" ? [] : text.split(/\r?\n/)));
    if (!uml.omitDetails && compartments.some((rows) => rows.length > 0)) {
        const rules: string[] = [];
        for (const rows of compartments) {
            rules.push(`M1,${n(y - 1)}H${n(uml.width - 1)}`);
            rows.forEach((row, i) => {
                const baseline = y + UML_PAD + i * line + ascent;
                parts.push(`<text x="${String(UML_TEXT_LEFT)}" y="${n(baseline)}" ${font}>${escapeSvg(row)}</text>`);
            });
            y += 2 * UML_PAD + rows.length * line;
        }
        parts.unshift(`<path fill="none" stroke="${uml.line}" d="${rules.join("")}"/>`);
    }
    const body = parts.join("");
    return body === "" ? null : svgPicture(uml.width, uml.height, uml.border, body, "", undefined, "yed");
}
