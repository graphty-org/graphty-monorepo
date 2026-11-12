/**
 * What the Style panel's model and picture controls (the node-models experiment) call each problem
 * graphty-element reports on a model or a picture (node-models design 13.6): a chip's one or two
 * words, and the tooltip's one line of detail. No sentences: the chip sits next to the control that
 * caused it. A notice's sentences are `modelWords` in words.ts.
 */

import type { CodedFact, GraphtyErrorCode, GraphtyWarningCode, ModelPart } from "@graphty/graphty-element/session";

import { formatCount } from "../settings/numberFormat";

/** Every code graphty-element reports about a model. */
type ModelCode = Extract<GraphtyErrorCode | GraphtyWarningCode, `E_MODEL_${string}` | `W_MODEL_${string}`>;

/** A chip: its words, and its tooltip. */
export interface ModelChipWords {
    readonly word: string;
    readonly tip: string;
}

/** The codes a model waiting for parts is waiting on: each is a row of the Parts pop-over. */
export const PART_CODES: ReadonlySet<string> = new Set([
    "E_MODEL_MISSING_FILE",
    "E_MODEL_PART_AMBIGUOUS",
    "E_MODEL_AMBIGUOUS",
]);

/**
 * A param as text.
 * @param value - the param.
 * @returns the text.
 */
function said(value: CodedFact["params"][string] | undefined): string {
    if (Array.isArray(value)) {
        return value.map(String).join(", ");
    }
    return value === undefined || value === null ? "" : String(value);
}

/**
 * A number of things as a reader reads it: "4,200,000".
 * @param value - the param.
 * @returns the text.
 */
function amount(value: CodedFact["params"][string] | undefined): string {
    return typeof value === "number" ? formatCount(value) : said(value);
}

/**
 * Two words joined when both are there: "example.com 404".
 * @param parts - the words.
 * @returns them, with a space between.
 */
function both(...parts: string[]): string {
    return parts.filter((p) => p !== "").join(" ");
}

/**
 * Where a URL points.
 * @param p - the params.
 * @returns its host, else the URL as given.
 */
function hostOf(p: CodedFact["params"]): string {
    if (p.host !== undefined) {
        return said(p.host);
    }
    if (p.hosts !== undefined) {
        return said(p.hosts);
    }
    try {
        return new URL(said(p.url)).host;
    } catch {
        return said(p.url);
    }
}

/**
 * A model's own problem that is not a part, a format, a fetch or a size: "Not loaded" and why.
 * @param tip - why, in a few words.
 * @returns the chip's words.
 */
function notLoaded(tip: string): () => ModelChipWords {
    return () => ({ word: "Not loaded", tip });
}

/** What each limit of `E_MODEL_TOO_LARGE` counts (`params.what`), in a reader's words. */
const LIMIT_WORDS: Readonly<Record<string, string>> = {
    bytes: "bytes",
    unzipped: "bytes unzipped",
    triangles: "triangles",
    textureBytes: "picture bytes",
    textureSize: "px picture",
    decodedBytes: "bytes decoded",
    sessionBytes: "bytes in this session",
    documentBytes: "bytes in the project file",
    count: "models",
};

/** Each code's chip. Typed over the element's codes, so a new one fails to compile here. */
const CHIPS: Readonly<Record<ModelCode, (p: CodedFact["params"]) => ModelChipWords>> = {
    E_MODEL_MISSING_FILE: (p) => ({ word: "1 missing", tip: said(p.name) }),
    E_MODEL_PART_AMBIGUOUS: (p) => ({ word: "1 missing", tip: said(p.name) }),
    E_MODEL_AMBIGUOUS: (p) => ({
        word: `${String((Array.isArray(p.candidates) ? p.candidates.length : 0) + (typeof p.more === "number" ? p.more : 0))} models`,
        tip: said(p.candidates),
    }),
    E_MODEL_FORMAT_UNSUPPORTED: (p) =>
        p.assetKind === "image"
            ? { word: "Picture", tip: "this file is a picture" }
            : { word: `${said(p.format).toUpperCase()} not read`, tip: "Export as GLB" },
    E_MODEL_WEB_PAGE: (p) => ({ word: "Web page", tip: hostOf(p) }),
    E_MODEL_FETCH: (p) => ({
        word: "Not reached",
        tip: both(hostOf(p), typeof p.status === "number" ? String(p.status) : "no answer"),
    }),
    E_MODEL_URL_BLOCKED: (p) => ({ word: "Blocked", tip: hostOf(p) }),
    E_MODEL_TOO_LARGE: (p) => ({
        word: "Too large",
        tip: both(amount(p.found), LIMIT_WORDS[said(p.what)] ?? said(p.what), "over", amount(p.limit)),
    }),
    E_MODEL_STRUCTURE: notLoaded("file damaged"),
    E_MODEL_FORMAT_UNKNOWN: (p) => ({ word: "Not loaded", tip: both(said(p.fileName), "not a 3D model") }),
    E_MODEL_EXTERNAL_URL: notLoaded("parts on another site; export as GLB"),
    E_MODEL_DECODER_UNAVAILABLE: notLoaded("compression not read"),
    E_MODEL_PARSE: (p) => ({ word: "Not loaded", tip: both(said(p.format).toUpperCase(), "file damaged") }),
    E_MODEL_ZIP: notLoaded(".zip not opened"),
    // The id is the element's (a digest for an unnamed file), never words for a reader.
    E_MODEL_NAME_TAKEN: () => ({ word: "Not loaded", tip: "name taken" }),
    E_MODEL_UNKNOWN_ASSET: notLoaded("model not in this project"),
    E_MODEL_DIGEST_MISMATCH: notLoaded("model in this file damaged"),
    E_MODEL_PART_REQUIRED: (p) => ({ word: "Needed", tip: said(p.name) }),
    W_MODEL_UP_GUESSED: () => ({ word: "Guessed", tip: "up axis guessed from the file" }),
    W_MODEL_HAS_ANIMATIONS: () => ({ word: "Animated", tip: "animations do not play" }),
    W_MODEL_COLOR_IGNORED: () => ({ word: "Color unused", tip: "node color not drawn on the model" }),
    W_MODEL_HEAVY: (p) => ({ word: "Heavy", tip: both(amount(p.nodes), "nodes") }),
    W_MODEL_BUDGET: (p) => ({ word: "Heavy", tip: both(amount(p.triangles), "triangles") }),
    W_MODEL_TRANSPARENT: () => ({ word: "See-through", tip: "may overlap wrongly" }),
    W_MODEL_TEXTURES_REDUCED: () => ({ word: "Pictures reduced", tip: "drawn smaller" }),
    W_MODEL_NOT_EMBEDDED: () => ({ word: "Not saved", tip: "named by address only" }),
    W_MODEL_CHANGED: (p) => ({ word: "Changed", tip: said(p.url) }),
    W_MODEL_PART_SUBSTITUTED: (p) => ({ word: "Substituted", tip: `used ${said(p.used)} for ${said(p.name)}` }),
    W_MODEL_PART_SKIPPED: (p) => ({ word: "Without 1", tip: said(p.name) }),
    W_MODEL_PART_UNUSED: (p) => ({ word: "Not needed", tip: said(p.fileName) }),
    W_MODEL_NOT_KEPT_BY_URL: (p) => ({ word: "Saved files", tip: both(said(p.url), "parts from several places") }),
};

/**
 * A model problem as a chip (design 13.6): its words and its tooltip.
 * @param fact - the element's coded problem.
 * @returns the chip's words and tooltip.
 */
export function modelChip(fact: CodedFact): ModelChipWords {
    const chip = (CHIPS as Readonly<Record<string, ((p: CodedFact["params"]) => ModelChipWords) | undefined>>)[
        fact.code
    ];
    return chip === undefined ? { word: "Not loaded", tip: fact.code } : chip(fact.params);
}

/**
 * Several facts of one kind as one chip: "2 missing" with every name, "Without 2".
 * @param facts - the facts, all one kind (parts, or skipped parts).
 * @returns the chip, or undefined for none.
 */
export function countChip(facts: readonly CodedFact[]): ModelChipWords | undefined {
    const [first] = facts;
    if (first === undefined) {
        return undefined;
    }
    const tip = facts.map((f) => modelChip(f).tip).join(", ");
    const n = String(facts.length);
    if (first.code === "W_MODEL_PART_SKIPPED") {
        return { word: `Without ${n}`, tip };
    }
    // Several models in a zip: a choice, not a missing part.
    return facts.length === 1 && first.code === "E_MODEL_AMBIGUOUS" ? modelChip(first) : { word: `${n} missing`, tip };
}

/**
 * A model problem in one line, chip and detail, for an announcement: "Not reached: example.com 404".
 * @param fact - the element's coded problem.
 * @returns the line.
 */
export function chipLine(fact: CodedFact): string {
    const { word, tip } = modelChip(fact);
    return `${word}: ${tip}`;
}

/**
 * What a part is, by the element's `role`: one word.
 * @param role - `params.role`, an open union.
 * @returns the word.
 */
export function roleWord(role: CodedFact["params"][string] | undefined): string {
    switch (role) {
        case "model":
            return "Model";
        case "other":
            return "Not used";
        case "geometry":
            return "Mesh";
        case "materials":
            return "Materials";
        case "texture":
            return "Texture";
        default:
            return "Part";
    }
}

/**
 * A model part's state chip (node-models design 14.6), or none for a part found as named, found
 * under its own file name in another folder, or a file nothing names (its role says "Not used").
 * @param part - the part, from the element's `record.parts`.
 * @returns the chip's words, or undefined.
 */
export function partChip(part: ModelPart): ModelChipWords | undefined {
    const file = part.name.split("/").pop() ?? part.name;
    switch (part.state) {
        case "missing":
            return { word: "Missing", tip: `${file} is not among the files` };
        case "ambiguous":
            return { word: "Which file?", tip: `more than one file could be ${file}` };
        case "substituted":
            // The file the model names, found elsewhere in the set: matched, nothing to flag.
            return (part.file ?? "").split("/").pop() === file
                ? undefined
                : { word: "Substituted", tip: `used ${part.file ?? ""} for ${part.name}` };
        case "skipped":
            return { word: "Skipped", tip: `drawn without ${file}` };
        default:
            return undefined;
    }
}

/**
 * A long path cut in its middle, so its start and its file name both show: "Tex...colormap.png".
 * @param name - the path.
 * @param max - the most characters shown.
 * @returns the name, cut when longer than max.
 */
export function middleCut(name: string, max = 24): string {
    if (name.length <= max) {
        return name;
    }
    const tail = Math.ceil((max - 3) * 0.6);
    return `${name.slice(0, max - 3 - tail)}...${name.slice(-tail)}`;
}
