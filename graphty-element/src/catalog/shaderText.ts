/**
 * @file The shader text format: GLSL with a JSON header in its first comment, read and written
 * (design/rendering/shader-styles.md section 4).
 *
 * ```glsl
 * /* graphty-shader 1
 * { "id": "user/pulse-ring", "name": "Pulse ring", "place": "around", "params": [...] }
 * \/
 * vec4 shade(NodeInput n) { ... }
 * ```
 *
 * The target is read from the entry function's input (`shade(NodeInput n)` draws on nodes); no
 * header key names it. An optional second entry, `vec4 shadeFar(<Input> x)`, is the low-detail
 * body.
 *
 * One text form, used for paste, copy, style documents and docs, so a shader survives a clipboard,
 * a chat or a forum post. The header is checked against a strict schema, the body against the
 * static rules of `./shaderGlsl`, in that order, each step stopping at its first problems. Every
 * problem is a code with values (section 4.4); the application writes the words.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../errors";
import { sentenceCase } from "../simple/definition";
import {
    type BodyOrigin,
    checkShaderBody,
    entryTargetOf,
    firstNonAscii,
    GLSL_RESERVED,
    placeOf,
    readsShaderTime,
    SHADER_HELPERS,
    SHADER_STRUCT_NAMES,
} from "./shaderGlsl";
import {
    defaultPlaces,
    drawingOf,
    isClockBinding,
    isShaderId,
    isShaderParamName,
    minSizeApplies,
    motionOf,
    PLACES_BY_TARGET,
    SHADER_CLOCKS,
    SHADER_MIN_SIZE_RANGE,
    SHADER_PARAM_TYPES,
    SHADER_REACH_RANGE,
    type ShaderClock,
    type ShaderMotion,
    type ShaderParamDescriptor,
    type ShaderParamDraft,
    shaderParamShape,
    type ShaderPlace,
    type ShaderProblem,
    type ShaderRegistration,
    type ShaderTarget,
    type ShaderText,
    type ShaderTextDraft,
    type ShaderTextParts,
    type ShaderTextResult,
    SQUARE_PLACES,
} from "./shaders";

/** What the header comment starts with. */
export const SHADER_TEXT_MAGIC = "graphty-shader 1";

/** The most parameters one shader declares. */
const SHADER_PARAM_LIMIT = 16;

/** The most parameters one shader lets `encode` bind per element. */
const SHADER_VARIES_LIMIT = 4;

/** The most characters a name or a label keeps. */
const NAME_LIMIT = 40;

/** The most characters a header holds. */
const HEADER_LIMIT = 16_384;

/** The largest magnitude a float32 holds. */
const FLOAT32_MAX = 3.4e38;

/** The parameter types a shader may declare. */
const PARAM_TYPES: ReadonlySet<string> = new Set(SHADER_PARAM_TYPES);

/** The parameter types `encode` may bind per element. */
const VARYING_TYPES: ReadonlySet<string> = new Set(["number", "integer", "color"]);

/** The keys a header may carry; `id` is required. */
const HEADER_KEYS: ReadonlySet<string> = new Set([
    "id",
    "name",
    "place",
    "places",
    "minSize",
    "categories",
    "preview",
    "cost",
    "thumbnail",
    "motion",
    "params",
    "reach",
    "reachParam",
    "blend",
    "form",
    "bloom",
    "requires",
    "reads",
    "webgpu",
]);

/** The keys a parameter may carry. */
const PARAM_KEYS: ReadonlySet<string> = new Set([
    "name",
    "type",
    "default",
    "min",
    "max",
    "step",
    "values",
    "plainName",
    "description",
    "varies",
    "primary",
    "choices",
]);

/** Every input a shader may read. */
const INPUTS: ReadonlySet<string> = new Set([
    "color",
    "opacity",
    "size",
    "shape",
    "width",
    "selected",
    "hovered",
    "pinned",
    "times",
    "members",
    "light",
]);

/** A color, `#rrggbb`. */
const HEX_COLOR = /^#[\da-fA-F]{6}$/;

/** Every place a shader may name. */
const PLACES: ReadonlySet<string> = new Set(Object.values(PLACES_BY_TARGET).flat());

/**
 * Whether a character may stay in a name: not a control character, not a bidirectional override.
 * @param char - One character.
 * @returns True when it may.
 */
function isSafeCharacter(char: string): boolean {
    const code = char.codePointAt(0) ?? 0;
    const control = code < 0x20 || (code >= 0x7f && code <= 0x9f);
    const bidi =
        code === 0x200e || code === 0x200f || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);

    return !control && !bidi;
}

/**
 * A name or a label as the catalog keeps it: unsafe characters removed, at most 40 characters.
 * @param text - The text.
 * @returns The kept text.
 */
function cleanName(text: string): string {
    return Array.from(text, (char) => (isSafeCharacter(char) ? char : ""))
        .join("")
        .slice(0, NAME_LIMIT);
}

/**
 * Whether a value is a plain object.
 * @param value - Anything.
 * @returns True for an object that is not an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a value is a number a float32 holds.
 * @param value - Anything.
 * @returns True when it is.
 */
function isFloat32(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= FLOAT32_MAX;
}

/**
 * Whether a parameter name collides with a name the element gives the body.
 * @param name - The name.
 * @returns True when it is taken.
 */
function isReservedParam(name: string): boolean {
    return GLSL_RESERVED.has(name) || SHADER_HELPERS.includes(name) || SHADER_STRUCT_NAMES.includes(name);
}

// ---------------------------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------------------------

/**
 * A problem with one field of one parameter.
 * @param param - The parameter's name, or `#<index>` when it has none.
 * @param field - The field.
 * @returns The problem.
 */
function paramProblem(param: string, field: string): ShaderProblem {
    return { code: "shader.param-invalid", params: { param, field } };
}

/**
 * Check a number-like parameter's default and range.
 * @param raw - The parameter.
 * @param integer - Whether it takes whole numbers only.
 * @returns The field at fault, or null.
 */
function numberFault(raw: Record<string, unknown>, integer: boolean): string | null {
    const whole = (value: unknown): boolean => !integer || Number.isInteger(value);
    for (const field of ["default", "min", "max", "step"]) {
        const value = raw[field];
        if (value !== undefined && (!isFloat32(value) || (field !== "step" && !whole(value)))) {
            return field;
        }
    }

    const { min, max, step } = raw as { min?: number; max?: number; step?: number };
    const value = raw.default as number;
    if (step !== undefined && step <= 0) {
        return "step";
    }

    if (min !== undefined && max !== undefined && min > max) {
        return "max";
    }

    return (min !== undefined && value < min) || (max !== undefined && value > max) ? "default" : null;
}

/**
 * Check an enum parameter's choices and default.
 * @param raw - The parameter.
 * @returns The field at fault, or null.
 */
function enumFault(raw: Record<string, unknown>): string | null {
    const { values } = raw;
    const choices = Array.isArray(values) ? (values as unknown[]) : [];
    const valid =
        choices.length > 0 &&
        choices.length <= 32 &&
        choices.every(
            (choice) => isRecord(choice) && typeof choice.value === "string" && typeof choice.label === "string",
        );
    if (!valid) {
        return "values";
    }

    return choices.some((choice) => (choice as { value: string }).value === raw.default) ? null : "default";
}

/**
 * The field of a parameter's value that is wrong for its type.
 * @param raw - The parameter.
 * @param type - Its type.
 * @returns The field at fault, or null.
 */
function valueFault(raw: Record<string, unknown>, type: string): string | null {
    if (raw.default === undefined) {
        return "default";
    }

    if (isClockBinding(raw.default)) {
        return isClockDefault(raw.default, type) ? numberFault({ ...raw, default: undefined }, false) : "default";
    }

    switch (type) {
        case "number":
            return numberFault(raw, false);
        case "integer":
            return numberFault(raw, true);
        case "boolean":
            return typeof raw.default === "boolean" ? null : "default";
        case "color":
            return typeof raw.default === "string" && HEX_COLOR.test(raw.default) ? null : "default";
        default:
            return enumFault(raw);
    }
}

/**
 * Whether a default bound to a clock is well formed: a known clock, a domain of two increasing
 * seconds, and an optional range of two numbers (a number) or two colors (a color, which needs one).
 * @param value - The default.
 * @param type - The parameter's type.
 * @returns True when it is.
 */
function isClockDefault(value: object, type: string): boolean {
    const { by, domain, range, ...rest } = value as Record<string, unknown>;
    const pair = (entry: unknown, each: (item: unknown) => boolean): entry is unknown[] =>
        Array.isArray(entry) && entry.length === 2 && entry.every(each);
    const numbers = pair(domain, isFloat32) && (domain[0] as number) < (domain[1] as number);
    const ranged =
        type === "color"
            ? pair(range, (item) => typeof item === "string" && HEX_COLOR.test(item))
            : type === "number" && (range === undefined || pair(range, isFloat32));

    return Object.keys(rest).length === 0 && SHADER_CLOCKS.includes(by as never) && numbers && ranged;
}

/**
 * Check one parameter and build its descriptor.
 * @param raw - The parameter as written.
 * @param index - Its place in the list.
 * @returns The descriptor, or the problem.
 */
function readParam(raw: unknown, index: number): ShaderParamDescriptor | ShaderProblem {
    const label = isRecord(raw) && typeof raw.name === "string" && raw.name !== "" ? raw.name : `#${String(index)}`;
    if (!isRecord(raw)) {
        return paramProblem(label, "name");
    }

    const unknown = Object.keys(raw).find((key) => !PARAM_KEYS.has(key));
    if (unknown !== undefined) {
        return paramProblem(label, unknown);
    }

    const { name, type } = raw;
    if (!isShaderParamName(name)) {
        return paramProblem(label, "name");
    }

    if (isReservedParam(name)) {
        return { code: "shader.reserved", params: { name, param: name } };
    }

    if (typeof type !== "string" || !PARAM_TYPES.has(type)) {
        return paramProblem(label, "type");
    }

    const fault = valueFault(raw, type) ?? flagFault(raw, type) ?? choicesFault(raw.choices, type);
    if (fault !== null) {
        return paramProblem(label, fault);
    }

    return paramDescriptor(raw, name, type);
}

/**
 * The field of a parameter's names and flags that is wrong.
 * @param raw - The parameter.
 * @param type - Its type.
 * @returns The field at fault, or null.
 */
function flagFault(raw: Record<string, unknown>, type: string): string | null {
    for (const field of ["plainName", "description"]) {
        if (raw[field] !== undefined && typeof raw[field] !== "string") {
            return field;
        }
    }

    if (raw.primary !== undefined && typeof raw.primary !== "boolean") {
        return "primary";
    }

    const { varies } = raw;
    return varies !== undefined && (typeof varies !== "boolean" || (varies && !VARYING_TYPES.has(type)))
        ? "varies"
        : null;
}

/**
 * Whether an integer parameter's named values are well formed: each a whole number, a name and a
 * picture (SVG path data, optionally an outline).
 * @param choices - The `choices` field as written.
 * @param type - The parameter's type.
 * @returns "choices" when they are not, or null.
 */
function choicesFault(choices: unknown, type: string): string | null {
    if (choices === undefined) {
        return null;
    }

    const good = (choice: unknown): boolean =>
        isRecord(choice) &&
        Number.isInteger(choice.value) &&
        typeof choice.plainName === "string" &&
        isRecord(choice.glyph) &&
        typeof choice.glyph.path === "string" &&
        (choice.glyph.outline === undefined || typeof choice.glyph.outline === "boolean");
    return type === "integer" && Array.isArray(choices) && choices.every(good) ? null : "choices";
}

/**
 * Build a parameter's descriptor, its fields in one order.
 * @param raw - The checked parameter.
 * @param name - Its name.
 * @param type - Its type.
 * @returns The descriptor.
 */
function paramDescriptor(raw: Record<string, unknown>, name: string, type: string): ShaderParamDescriptor {
    const plainName = typeof raw.plainName === "string" ? cleanName(raw.plainName) : shaderParamPlainName(name);
    const values = raw.values as { value: string; label: string }[] | undefined;
    const value = type === "color" && typeof raw.default === "string" ? raw.default.toLowerCase() : raw.default;

    return {
        name,
        plainName,
        type: type as ShaderParamDescriptor["type"],
        default: value,
        ...(raw.min === undefined ? {} : { min: raw.min as number }),
        ...(raw.max === undefined ? {} : { max: raw.max as number }),
        ...(raw.step === undefined ? {} : { step: raw.step as number }),
        ...(values === undefined
            ? {}
            : { values: values.map((choice) => ({ value: choice.value, label: cleanName(choice.label) })) }),
        ...(typeof raw.description === "string" ? { description: raw.description } : {}),
        ...(raw.varies === true ? { varies: true } : {}),
        ...(raw.primary === true ? { primary: true } : {}),
        ...(raw.choices === undefined ? {} : { choices: raw.choices as ShaderParamDescriptor["choices"] }),
    };
}

/**
 * Check a parameter list.
 * @param raw - The list as written.
 * @returns The descriptors, or the problems.
 */
function readParams(raw: unknown): ShaderParamDescriptor[] | ShaderProblem[] {
    if (raw === undefined) {
        return [];
    }

    if (!Array.isArray(raw)) {
        return [{ code: "shader.header-key", params: { key: "params" } }];
    }

    if (raw.length > SHADER_PARAM_LIMIT) {
        return [{ code: "shader.too-many-params", params: { count: raw.length, limit: SHADER_PARAM_LIMIT } }];
    }

    const params: ShaderParamDescriptor[] = [];
    const problems: ShaderProblem[] = [];
    for (const [index, entry] of (raw as unknown[]).entries()) {
        const read = readParam(entry, index);
        if ("code" in read) {
            problems.push(read);
        } else if (params.some((param) => param.name === read.name)) {
            problems.push(paramProblem(read.name, "name"));
        } else {
            params.push(read);
        }
    }

    const varying = params.filter((param) => param.varies === true);
    if (varying.length > SHADER_VARIES_LIMIT) {
        problems.push(paramProblem(varying[SHADER_VARIES_LIMIT].name, "varies"));
    }

    return problems.length > 0 ? problems : params;
}

// ---------------------------------------------------------------------------------------------
// The descriptor half of a header
// ---------------------------------------------------------------------------------------------

/**
 * Check a motion.
 * @param raw - The motion as written.
 * @param params - The parameters, which a loop's speed names.
 * @returns The motion, or null when it is malformed.
 */
function readMotion(raw: unknown, params: readonly ShaderParamDescriptor[]): ShaderMotion | null {
    if (raw === undefined || raw === "still" || raw === "loop") {
        return motionOf(raw);
    }

    if (!isRecord(raw) || Object.keys(raw).some((key) => key !== "loop")) {
        return null;
    }

    const { loop } = raw;
    if (loop !== undefined) {
        const speed = isRecord(loop) ? loop.speedParam : null;
        const valid =
            isRecord(loop) &&
            Object.keys(loop).every((key) => key === "speedParam") &&
            (speed === undefined || params.some((param) => param.name === speed && param.type === "number"));
        if (!valid) {
            return null;
        }
    }

    return raw;
}

/** What one optional header key may hold. */
const OPTIONAL_KEYS: Readonly<Record<string, (value: unknown) => boolean>> = {
    reach: (value) => typeof value === "number" && value >= SHADER_REACH_RANGE.min && value <= SHADER_REACH_RANGE.max,
    blend: (value) => value === "over" || value === "add",
    form: (value) => value === "field" || value === "sphere",
    bloom: (value) => typeof value === "boolean",
    requires: (value) => Array.isArray(value) && value.every((entry) => entry === "webgl2"),
    reads: (value) => Array.isArray(value) && value.every((entry) => INPUTS.has(entry as string)),
    webgpu: (value) => value === "translate" || value === "none",
    place: (value) => typeof value === "string" && PLACES.has(value),
    places: (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        new Set(value).size === value.length &&
        value.every((entry) => typeof entry === "string" && PLACES.has(entry)),
    minSize: (value) =>
        typeof value === "number" && value >= SHADER_MIN_SIZE_RANGE.min && value <= SHADER_MIN_SIZE_RANGE.max,
    categories: (value) =>
        Array.isArray(value) &&
        value.length <= 8 &&
        value.every((entry) => typeof entry === "string" && entry !== "" && cleanName(entry) === entry),
    preview: isPreview,
    cost: (value) => value === "light" || value === "medium" || value === "heavy",
    thumbnail: (value) => typeof value === "string" && value.length <= 4096,
    target: (value) => value === "node" || value === "edge" || value === "group" || value === "background",
};

/**
 * Whether a value is a preview: optional parameter values and an optional time in seconds.
 * @param value - Anything.
 * @returns True when it is one.
 */
function isPreview(value: unknown): boolean {
    if (!isRecord(value) || Object.keys(value).some((key) => key !== "params" && key !== "time")) {
        return false;
    }

    const { params, time } = value;
    const values =
        params === undefined ||
        (isRecord(params) &&
            Object.values(params).every((entry) => ["number", "string", "boolean"].includes(typeof entry)));
    return values && (time === undefined || (typeof time === "number" && time >= 0 && time <= 3600));
}

/** A descriptor's catalog facts, before the element fills in what is left out. */
export type ShaderRegistrationDescriptor = ShaderRegistration["descriptor"];

/**
 * Check the catalog facts of a shader, written as a header or handed to `registerShader`.
 * @param raw - The facts: `id`, a name, and the optional keys.
 * @param nameKey - Where the name is written: `name` in a header, `plainName` in a registration.
 * @param namespaced - Whether the id must carry a namespace.
 * @returns The descriptor, or the problems.
 */
export function readShaderDescriptor(
    raw: Record<string, unknown>,
    nameKey: "name" | "plainName",
    namespaced: boolean,
): ShaderRegistrationDescriptor | ShaderProblem[] {
    if (raw.id === undefined) {
        return [{ code: "shader.header-key", params: { key: "id" } }];
    }

    if (!isShaderId(raw.id, namespaced)) {
        return [
            { code: "shader.id-invalid", params: { id: typeof raw.id === "string" ? raw.id : JSON.stringify(raw.id) } },
        ];
    }

    const params = readParams(raw.params);
    if (params.length > 0 && "code" in params[0]) {
        return params as ShaderProblem[];
    }

    return finishDescriptor(raw, nameKey, params as ShaderParamDescriptor[]);
}

/**
 * Check the rest of a descriptor once its id and parameters are sound.
 * @param raw - The facts.
 * @param nameKey - Where the name is written.
 * @param params - The checked parameters.
 * @returns The descriptor, or the problems.
 */
function finishDescriptor(
    raw: Record<string, unknown>,
    nameKey: "name" | "plainName",
    params: ShaderParamDescriptor[],
): ShaderRegistrationDescriptor | ShaderProblem[] {
    const id = raw.id as string;
    const name = raw[nameKey];
    if (name !== undefined && typeof name !== "string") {
        return [{ code: "shader.header-key", params: { key: nameKey } }];
    }

    const motion = readMotion(raw.motion, params);
    if (motion === null) {
        return [{ code: "shader.header-key", params: { key: "motion" } }];
    }

    const extras: Record<string, unknown> = {};
    for (const [key, valid] of Object.entries(OPTIONAL_KEYS)) {
        if (raw[key] === undefined) {
            continue;
        }

        if (!valid(raw[key])) {
            return [{ code: "shader.header-key", params: { key } }];
        }

        extras[key] = raw[key];
    }

    const { reachParam } = raw;
    if (reachParam !== undefined) {
        const named = params.find((param) => param.name === reachParam);
        if (named === undefined || (named.type !== "number" && named.type !== "integer")) {
            return [{ code: "shader.header-key", params: { key: "reachParam" } }];
        }

        extras.reachParam = reachParam;
    }

    return {
        id,
        plainName:
            typeof name === "string" && cleanName(name) !== ""
                ? cleanName(name)
                : sentenceCase(id.split("/").at(-1) ?? id),
        params,
        ...(raw.motion === undefined ? {} : { motion }),
        ...extras,
    };
}

// ---------------------------------------------------------------------------------------------
// Reading text
// ---------------------------------------------------------------------------------------------

/** A text's header and the body after it. */
interface Split {
    /** The header's JSON. */
    readonly json: string;
    /** Where the JSON starts in the text. */
    readonly jsonOffset: number;
    /** The body. */
    readonly body: string;
    /** Where the body starts in the text. */
    readonly bodyOffset: number;
}

/**
 * Split a text into its header and its body. The header ends at the first `*` `/` after the
 * opening line, even inside a JSON string, which is then a header problem.
 * @param text - The text.
 * @returns The two halves, or null when the text has no header.
 */
function splitHeader(text: string): Split | null {
    const start = text.search(/\S/);
    if (start === -1 || !text.startsWith(`/* ${SHADER_TEXT_MAGIC}`, start)) {
        return null;
    }

    const jsonOffset = start + SHADER_TEXT_MAGIC.length + 3;
    const end = text.indexOf("*/", jsonOffset);
    if (end === -1) {
        return { json: text.slice(jsonOffset), jsonOffset, body: "", bodyOffset: text.length };
    }

    let bodyOffset = end + 2;
    if (text.startsWith("\r\n", bodyOffset)) {
        bodyOffset += 2;
    } else if (text[bodyOffset] === "\n") {
        bodyOffset += 1;
    }

    return { json: text.slice(jsonOffset, end), jsonOffset, body: text.slice(bodyOffset), bodyOffset };
}

/**
 * Parse a header's JSON, placing a syntax error in the text.
 * @param text - The whole text.
 * @param split - The header.
 * @returns The parsed value, or the problem.
 */
function parseHeaderJson(text: string, split: Split): { value: unknown } | ShaderProblem {
    if (split.json.length > HEADER_LIMIT) {
        return { code: "shader.too-large", params: { bytes: split.json.length, limit: HEADER_LIMIT } };
    }

    try {
        return { value: JSON.parse(split.json) as unknown };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const position = /position (\d+)/.exec(message);
        const offset = split.jsonOffset + (position === null ? split.json.length : Number(position[1]));
        const at = placeOf(text, offset);

        return {
            code: "shader.header-json",
            params: { line: at.line, column: at.column, message, reason: "unexpected-token" },
        };
    }
}

/**
 * The problem of a header that is not a JSON object.
 * @param text - The whole text.
 * @param split - The header.
 * @returns The problem.
 */
function notAnObject(text: string, split: Split): ShaderProblem {
    const at = placeOf(text, split.jsonOffset);
    return { code: "shader.header-json", params: { line: at.line, column: at.column, message: "not an object" } };
}

/**
 * Read a header's JSON as an object: the one reader `parseShaderText` and `splitShaderText` share.
 * @param text - The whole text.
 * @param split - The header.
 * @returns The object, or the problem.
 */
function readHeaderObject(text: string, split: Split): { readonly value: Record<string, unknown> } | ShaderProblem {
    const parsed = parseHeaderJson(text, split);
    if ("code" in parsed) {
        return parsed;
    }

    return isRecord(parsed.value) ? { value: parsed.value } : notAnObject(text, split);
}

/**
 * Check a header's keys and values.
 * @param header - The header.
 * @param namespaced - Whether its id must carry a namespace.
 * @returns The descriptor, or the problems.
 */
function checkHeader(
    header: Record<string, unknown>,
    namespaced: boolean,
): ShaderRegistrationDescriptor | ShaderProblem[] {
    const unknown = Object.keys(header).filter((key) => !HEADER_KEYS.has(key));
    return unknown.length > 0
        ? unknown.map((key) => ({ code: "shader.header-key", params: { key } }))
        : readShaderDescriptor(header, "name", namespaced);
}

/** What a parsed registration's descriptor always carries. */
type SettledDescriptor = ShaderRegistrationDescriptor & { readonly target: ShaderTarget };

/** Where a shader is being added, which settles what its text leaves out. @since 3.36.0 */
export interface ShaderTextOptions {
    /** What it must draw on: text whose entry function draws on another is refused. */
    readonly target?: ShaderTarget;
    /** The place it takes when its text names none, if its target allows it. */
    readonly place?: ShaderPlace;
    /**
     * Whether the header's id must carry a namespace (`user/tint`). Default true. False reads a
     * bare id (`pearl`), as a project's own shaders and a style document's carry them: there an
     * id is a key into the file's shader list, nothing more.
     * @since 3.50.0
     */
    readonly namespaced?: boolean;
}

/**
 * The target and place of a shader, and the problems that rule them out.
 *
 * The target is read from the entry function's input; a declared one (registration only) and the
 * options' must agree. The place, in order: a declared `place`; the options' place when the target
 * and `places` allow it; the first of `places`; `"group"` for a group outline, else `"paint"`. The
 * background has no place.
 * @param descriptor - The checked facts.
 * @param body - The body, when it is known.
 * @param options - Where the shader is being added, if anywhere.
 * @returns The settled descriptor, or the problems.
 */
export function settleShaderPlace(
    descriptor: ShaderRegistrationDescriptor,
    body: string | undefined,
    options?: ShaderTextOptions,
): SettledDescriptor | ShaderProblem[] {
    const found = body === undefined ? undefined : entryTargetOf(body);
    const declared = descriptor.target;
    if (found !== undefined && declared !== undefined && found !== declared) {
        return [{ code: "shader.target-mismatch", params: { expected: declared, found } }];
    }

    const wanted = options?.target;
    if (found !== undefined && wanted !== undefined && found !== wanted) {
        return [{ code: "shader.target-mismatch", params: { expected: wanted, found } }];
    }

    const target = found ?? declared ?? wanted ?? "node";
    const allowed = PLACES_BY_TARGET[target];
    const { place: named, places } = descriptor;
    if (allowed.length === 0) {
        return named === undefined && places === undefined
            ? { ...descriptor, target }
            : [{ code: "shader.header-key", params: { key: named === undefined ? "places" : "place" } }];
    }

    const offered = options?.place;
    const takes = offered !== undefined && allowed.includes(offered) && (places?.includes(offered) ?? true);
    const place = named ?? (takes ? offered : undefined) ?? places?.[0] ?? allowed[0];
    const problem = placeFault(descriptor.id, place, places, allowed) ?? minSizeFault(descriptor, place, places);

    return problem === null ? { ...descriptor, target, place } : [problem];
}

/**
 * The problem with a shader's place and places: one its target does not draw, a list that mixes a
 * fixed place with others, or a place outside its list.
 * @param id - The shader.
 * @param place - Its settled place.
 * @param places - Its declared places.
 * @param allowed - The places of its target.
 * @returns The problem, or null.
 */
function placeFault(
    id: string,
    place: ShaderPlace,
    places: readonly ShaderPlace[] | undefined,
    allowed: readonly ShaderPlace[],
): ShaderProblem | null {
    const outside = [place, ...(places ?? [])].find((entry) => !allowed.includes(entry));
    if (outside !== undefined) {
        return { code: "shader.place-unsupported", params: { shader: id, place: outside, allowed } };
    }

    // `paint`, `along` and `group` are drawings of their own: a shader written for one stays there.
    const mixed = places !== undefined && places.length > 1 && places.some((entry) => !SQUARE_PLACES.includes(entry));
    if (mixed) {
        return { code: "shader.header-key", params: { key: "places" } };
    }

    const listed = places ?? defaultPlaces(place);
    return listed.includes(place)
        ? null
        : { code: "shader.place-unsupported", params: { shader: id, place, allowed: listed } };
}

/**
 * The problem with a minimum size no allowed place can apply.
 * @param descriptor - The facts.
 * @param place - The settled place.
 * @param places - The declared places.
 * @returns `shader.min-size-place` `{ shader, places }`, or null.
 */
function minSizeFault(
    descriptor: ShaderRegistrationDescriptor,
    place: ShaderPlace,
    places: readonly ShaderPlace[] | undefined,
): ShaderProblem | null {
    const listed = places ?? defaultPlaces(place);
    return descriptor.minSize === undefined || minSizeApplies(listed)
        ? null
        : { code: "shader.min-size-place", params: { shader: descriptor.id, places: listed } };
}

// ---------------------------------------------------------------------------------------------
// The low-detail entry
// ---------------------------------------------------------------------------------------------

/** One top-level declaration of a body: its text, and its name when it is a function. */
interface Declaration {
    readonly text: string;
    readonly start: number;
    readonly function?: string;
}

/**
 * Split a body into its top-level declarations, each with the comments before it. A declaration
 * ends at a `;` or a `}` at depth 0.
 * @param body - The GLSL body.
 * @returns The declarations, in order, covering the whole body.
 */
function declarationsOf(body: string): Declaration[] {
    const found: Declaration[] = [];
    let depth = 0;
    let start = 0;
    let at = 0;
    while (at < body.length) {
        if (body.startsWith("//", at)) {
            const end = body.indexOf("\n", at);
            at = end === -1 ? body.length : end;
            continue;
        }

        if (body.startsWith("/*", at)) {
            const end = body.indexOf("*/", at + 2);
            at = end === -1 ? body.length : end + 2;
            continue;
        }

        const char = body[at];
        at++;
        if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;
        }

        if (depth === 0 && (char === ";" || char === "}")) {
            const text = body.slice(start, at);
            const name = char === "}" ? /\b(\w+)\s*\([^)]*\)\s*\{/.exec(text)?.[1] : undefined;
            found.push({ text, start, ...(name === undefined ? {} : { function: name }) });
            start = at;
        }
    }

    if (start < body.length) {
        found.push({ text: body.slice(start), start });
    }

    return found;
}

/**
 * The same text with one declaration's characters turned to spaces, its line breaks kept, so
 * every line after it keeps its number.
 * @param body - The body.
 * @param declaration - The declaration to blank.
 * @returns The body.
 */
function blank(body: string, declaration: Declaration): string {
    const end = declaration.start + declaration.text.length;
    return body.slice(0, declaration.start) + declaration.text.replaceAll(/[^\n]/g, " ") + body.slice(end);
}

/**
 * Split a text's body into the near body and the far one, when it holds a `shadeFar` entry: the
 * near body without `shadeFar`, and the far body without `shade` and with `shadeFar` named
 * `shade`. Both keep every shared helper and every line number.
 * @param body - The body.
 * @returns The two bodies; `far` is undefined when there is no `shadeFar`.
 */
function splitFar(body: string): { readonly near: string; readonly far?: string } {
    const declarations = declarationsOf(body);
    const far = declarations.find((declaration) => declaration.function === "shadeFar");
    if (far === undefined) {
        return { near: body };
    }

    const near = blank(body, far);
    const shade = declarations.find((declaration) => declaration.function === "shade");
    const farBody = (shade === undefined ? body : blank(body, shade)).replace(/\bshadeFar(\s*\()/, "shade$1");
    return { near: `${near.trimEnd()}\n`, far: farBody };
}

/**
 * A declaration with its comments removed and its white space collapsed, to compare two.
 * @param text - The declaration.
 * @returns Its normalized text.
 */
function normalized(text: string): string {
    return text
        .replaceAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "")
        .replaceAll(/\s+/g, " ")
        .trim();
}

/**
 * A normalized function declaration's signature: everything before its body.
 * @param text - The normalized declaration.
 * @returns The signature, or the whole text when it has no body.
 */
function signatureOf(text: string): string {
    const open = text.indexOf("{");
    return open === -1 ? text : text.slice(0, open).trim();
}

/**
 * One body holding both entries: the near body, then every declaration of the far body that the
 * near one does not already hold, with its `shade` named `shadeFar`.
 * @param id - The shader, for a refusal.
 * @param near - The near body.
 * @param far - The far body.
 * @returns The joined body.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the two define one function differently.
 */
function joinFar(id: string, near: string, far: string): string {
    const nearDeclarations = declarationsOf(near).map((declaration) => normalized(declaration.text));
    const held = new Set(nearDeclarations);
    const signatures = new Set(nearDeclarations.map(signatureOf));
    const added: string[] = [];
    for (const declaration of declarationsOf(far)) {
        const text = normalized(declaration.text);
        if (text === "" || text === ";" || held.has(text)) {
            continue;
        }

        if (declaration.function !== undefined && declaration.function !== "shade") {
            if (signatures.has(signatureOf(text))) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `Shader text cannot hold "${id}": its low-detail body defines ${declaration.function} differently.`,
                    source: "style",
                    details: { id, field: "lowDetail", function: declaration.function },
                });
            }
        }

        const kept = declaration.text.replace(/^\s+/, "");
        added.push(declaration.function === "shade" ? kept.replace(/\bshade(\s*\()/, "shadeFar$1") : kept);
    }

    return `${near.trimEnd()}\n\n${added.join("\n")}\n`;
}

/**
 * Check the body (and the far body) and complete the registration: its target and place settled,
 * its motion inferred when the header gives none.
 * @param descriptor - The checked descriptor.
 * @param body - The body.
 * @param origin - Where the body starts in the text.
 * @param options - Where the shader is being added, if anywhere.
 * @returns The result.
 */
function finishText(
    descriptor: ShaderRegistrationDescriptor,
    body: string,
    origin: BodyOrigin,
    options: ShaderTextOptions | undefined,
): ShaderTextResult {
    const { near, far } = splitFar(body);
    const settled = settleShaderPlace(descriptor, near, options);
    if (Array.isArray(settled)) {
        return { ok: false, problems: settled };
    }

    const drawing = drawingOf(settled);
    for (const part of far === undefined ? [near] : [near, far]) {
        const checked = checkShaderBody(part, drawing, origin);
        if (checked.problems.length > 0) {
            return { ok: false, problems: checked.problems };
        }
    }

    const motion = settled.motion ?? (readsShaderTime(near) ? "loop" : undefined);
    return {
        ok: true,
        registration: {
            descriptor: { ...settled, ...(motion === undefined ? {} : { motion: motionOf(motion) }) },
            glsl: near,
            ...(far === undefined ? {} : { lowDetail: far }),
        },
    };
}

/**
 * Read and check shader text: its header against a strict schema, then its body against the
 * static rules. Nothing is registered or drawn.
 *
 * The target is read from the entry function's input; text whose entry draws on another target than
 * `options.target` is refused with `shader.target-mismatch` (`{ expected, found }`). The place is
 * the header's `place`; else `options.place` when the target allows it; else the first of the
 * header's `places`; else `"group"` for a group outline and `"paint"` for a node or edge. A place
 * the shader cannot draw at is refused with `shader.place-unsupported` (`{ shader, place, allowed }`),
 * and a `minSize` no allowed place can apply with `shader.min-size-place` (`{ shader, places }`).
 * @param text - The text: GLSL with a `graphty-shader 1` header, or a body alone.
 * @param options - Where the shader is being added: what it must draw on, and the place it takes
 *   when its text names none.
 * @returns The registration the text describes, or every problem the first failing step found.
 * @since 3.36.0
 */
export function parseShaderText(text: ShaderText, options?: ShaderTextOptions): ShaderTextResult {
    if (typeof text !== "string") {
        return { ok: false, problems: [{ code: "shader.header-missing", params: {} }] };
    }

    const ascii = firstNonAscii(text);
    if (ascii !== -1) {
        const at = placeOf(text, ascii);
        return { ok: false, problems: [{ code: "shader.not-ascii", params: { line: at.line, column: at.column } }] };
    }

    const split = splitHeader(text);
    if (split === null) {
        return finishText(
            { id: "user/shader", plainName: "Shader", params: [] },
            text,
            { line: 1, column: 1 },
            options,
        );
    }

    const header = readHeaderObject(text, split);
    if ("code" in header) {
        return { ok: false, problems: [header] };
    }

    const descriptor = checkHeader(header.value, options?.namespaced ?? true);
    if (Array.isArray(descriptor)) {
        return { ok: false, problems: descriptor };
    }

    return finishText(descriptor, split.body, placeOf(text, split.bodyOffset), options);
}

/**
 * Split a text into its header as written and its body, for an editor to fill a form from. Unlike
 * {@link parseShaderText} this keeps a header with wrong values (they are reported in `problems`,
 * beside the draft), takes a bare id and any characters, and does not read the body.
 * @param text - The text: GLSL with a `graphty-shader 1` header, or a body alone.
 * @returns The header's keys and the body. A text with no header gets a placeholder draft and is
 *   all body. A header that is not a JSON object, or whose `params` is not a list of objects, has
 *   no draft. A value that is not a string has no draft and a `shader.header-missing` problem.
 * @since 3.49.0
 */
export function splitShaderText(text: ShaderText): ShaderTextParts {
    if (typeof text !== "string") {
        return { headed: false, problems: [{ code: "shader.header-missing", params: {} }], body: "", bodyLine: 1 };
    }

    const split = splitHeader(text);
    if (split === null) {
        return { headed: false, draft: { id: "user/shader", params: [] }, problems: [], body: text, bodyLine: 1 };
    }

    const parts = { headed: true, body: split.body, bodyLine: placeOf(text, split.bodyOffset).line };
    const header = readHeaderObject(text, split);
    if ("code" in header) {
        return { ...parts, problems: [header] };
    }

    const { params } = header.value;
    if (params !== undefined && !(Array.isArray(params) && params.every(isRecord))) {
        return { ...parts, problems: [notAnObject(text, split)] };
    }

    const checked = checkHeader(header.value, false);
    return { ...parts, draft: header.value, problems: Array.isArray(checked) ? checked : [] };
}

// ---------------------------------------------------------------------------------------------
// Editing a header as written
// ---------------------------------------------------------------------------------------------

/**
 * The display name a parameter takes from its name when it declares none.
 * @param name - The parameter's name.
 * @returns The display name.
 * @since 3.49.0
 */
export function shaderParamPlainName(name: string): string {
    return sentenceCase(name);
}

/** The parameter fields that hold only for some types. */
const TYPED_PARAM_FIELDS: ReadonlySet<string> = new Set(["min", "max", "step", "values", "varies", "choices"]);

/**
 * A parameter's default when its type changes: the number it holds if the new type can take it,
 * else the type's own, inside the range the row keeps.
 * @param param - The parameter, its range already cut to the new type.
 * @param type - The new type.
 * @param labels - The new choices of an enum.
 * @returns The default.
 */
function defaultOfType(
    param: ShaderParamDraft,
    type: ShaderParamDescriptor["type"],
    labels: readonly string[],
): unknown {
    if (type !== "number" && type !== "integer") {
        return type === "enum" ? labels[0] : shaderParamShape(type).default;
    }

    const { default: held, min, max } = param;
    const usable = typeof held === "number" && (type === "number" || Number.isInteger(held));
    const value = usable ? held : (shaderParamShape(type).default as number);
    const floored = typeof min === "number" ? Math.max(value, min) : value;
    return typeof max === "number" ? Math.min(floored, max) : floored;
}

/**
 * A parameter under another type: a valid default, and the fields the new type has no use for
 * cleared. Every other key stays as written.
 * @param param - The parameter.
 * @param type - The new type.
 * @param labels - An enum's choices: each is both the label and the stored value, and the first is
 *   the default. The words are the caller's.
 * @returns The parameter.
 * @since 3.49.0
 */
export function changeShaderParamType(
    param: ShaderParamDraft,
    type: ShaderParamDescriptor["type"],
    labels: readonly string[] = [],
): ShaderParamDraft {
    if (param.type === type) {
        return param;
    }

    const { fields } = shaderParamShape(type);
    const applies = (key: string, value: unknown): boolean => {
        if (key === "choices") {
            return type === "integer";
        }

        const fractional = type === "integer" && (key === "min" || key === "max") && !Number.isInteger(value);
        return (fields as readonly string[]).includes(key) && !fractional;
    };
    const kept = Object.fromEntries(
        Object.entries(param).filter(([key, value]) => !TYPED_PARAM_FIELDS.has(key) || applies(key, value)),
    );

    return {
        ...kept,
        type,
        default: defaultOfType(kept, type, labels),
        ...(type === "enum" ? { values: labels.map((label) => ({ value: label, label })) } : {}),
    };
}

/**
 * Change the type of one parameter row of a header, as {@link changeShaderParamType} does, and drop
 * what else in the header names that row when the new type cannot serve it: `reachParam` needs a
 * number or an integer, a loop's `speedParam` a number.
 * @param draft - The header.
 * @param index - The row's place in `params`.
 * @param type - The new type.
 * @param labels - An enum's choices, as {@link changeShaderParamType} takes them.
 * @returns The header; the same object when there is no such row.
 * @since 3.49.0
 */
export function retypeShaderParam(
    draft: ShaderTextDraft,
    index: number,
    type: ShaderParamDescriptor["type"],
    labels: readonly string[] = [],
): ShaderTextDraft {
    const params = draft.params ?? [];
    const row = params[index];
    if (row === undefined) {
        return draft;
    }

    const next: Record<string, unknown> = {
        ...draft,
        params: params.map((each, at) => (at === index ? changeShaderParamType(each, type, labels) : each)),
    };
    if (draft.reachParam === row.name && type !== "number" && type !== "integer") {
        next.reachParam = undefined;
    }

    const { motion } = draft;
    if (isRecord(motion) && isRecord(motion.loop) && motion.loop.speedParam === row.name && type !== "number") {
        next.motion = { ...motion, loop: { ...motion.loop, speedParam: undefined } };
    }

    return next;
}

/** The seconds a new clock binding maps, as the starters write it. */
const CLOCK_START_DOMAIN: readonly [number, number] = [0, 0.3];

/**
 * A parameter's default bound to a clock, as an editor shows it. @since 3.49.0
 */
export interface ShaderParamClock {
    /** The clock. */
    readonly by: ShaderClock;
    /** The seconds mapped; the starters' `[0, 0.3]` when the header has no pair. */
    readonly domain: readonly [number, number];
    /** A color's two ends, as written. */
    readonly range?: readonly [unknown, unknown];
}

/**
 * The clock a parameter row's default is bound to, read leniently so a half-typed binding can be
 * edited: any `by` that is one of `SHADER_CLOCKS`. Whether a type may be bound at all is
 * `shaderParamShape(type).clock`.
 * @param param - The row as written.
 * @returns The binding, or undefined for a plain default.
 * @since 3.49.0
 */
export function shaderParamClock(param: ShaderParamDraft): ShaderParamClock | undefined {
    const value = param.default;
    if (!isRecord(value) || !SHADER_CLOCKS.includes(value.by as never)) {
        return undefined;
    }

    const { by, domain, range } = value;
    return {
        by: by as ShaderClock,
        domain: Array.isArray(domain) ? (domain as [number, number]) : CLOCK_START_DOMAIN,
        ...(Array.isArray(range) ? { range: range as [unknown, unknown] } : {}),
    };
}

/**
 * Bind a parameter row's default to a clock, or take the binding off. A new binding maps the
 * starters' seconds, and a color's range starts at its current color at both ends; a binding
 * already there keeps its seconds and range. Taking it off puts back the type's default, or a
 * color's first range color.
 * @param param - The row; its type should take a clock (`shaderParamShape(type).clock`).
 * @param by - The clock, or undefined for none.
 * @returns The row.
 * @since 3.49.0
 */
export function bindShaderParamClock(param: ShaderParamDraft, by: ShaderClock | undefined): ShaderParamDraft {
    const bound = shaderParamClock(param);
    const isColor = param.type === "color";
    if (by === undefined) {
        const first = bound?.range?.[0];
        const plain = shaderParamShape(param.type as ShaderParamDescriptor["type"]).default;
        return { ...param, default: isColor && first !== undefined ? first : plain };
    }

    const color = typeof param.default === "string" ? param.default : shaderParamShape("color").default;
    const range = isColor ? { range: bound?.range ?? [color, color] } : {};
    return { ...param, default: { by, domain: [...(bound?.domain ?? CLOCK_START_DOMAIN)], ...range } };
}

/**
 * The header keys that name a parameter, moved to another name or dropped, unless another row still
 * answers to the old name.
 * @param draft - The header.
 * @param from - The old name.
 * @param to - The new name; undefined drops the references.
 * @returns The header.
 */
function carryParamReferences(draft: ShaderTextDraft, from: string, to: string | undefined): ShaderTextDraft {
    if (draft.params?.some((row) => row.name === from) === true) {
        return draft;
    }

    const next: Record<string, unknown> = { ...draft };
    if (draft.reachParam === from) {
        next.reachParam = to;
    }

    const { motion, preview } = draft;
    if (isRecord(motion) && isRecord(motion.loop) && motion.loop.speedParam === from) {
        next.motion = { ...motion, loop: { ...motion.loop, speedParam: to } };
    }

    if (isRecord(preview) && isRecord(preview.params)) {
        const values = Object.entries(preview.params).filter(([key]) => key !== from || to !== undefined);
        next.preview = {
            ...preview,
            params: Object.fromEntries(values.map(([key, value]) => [key === from ? to : key, value])),
        };
    }

    return next;
}

/**
 * Rename a parameter of a header, and what else in the header names it (a loop's speed, the reach
 * parameter, the preview's values). The body is not touched. Of two rows with one name, the last,
 * which is the one a duplicate's problem marks, unless `index` names the row. A rename onto a name
 * another row already has moves no reference, so the duplicate is reported and renaming back loses
 * nothing.
 * @param draft - The header.
 * @param from - The row's name.
 * @param to - Its new name.
 * @param index - The row's place in `params`, for a row whose name is not its own (a duplicate, or
 *   empty); absent, the last row named `from`.
 * @returns The header; the same object when there is no such row.
 * @since 3.49.0
 */
export function renameShaderParam(draft: ShaderTextDraft, from: string, to: string, index?: number): ShaderTextDraft {
    const params = draft.params ?? [];
    const at = index ?? params.map((row) => row.name).lastIndexOf(from);
    if (params[at] === undefined || from === to) {
        return draft;
    }

    const renamed = { ...draft, params: params.map((row, each) => (each === at ? { ...row, name: to } : row)) };
    return params.some((row) => row.name === to) ? renamed : carryParamReferences(renamed, from, to);
}

/**
 * Remove a parameter of a header, and what else in the header names it. The body is not touched.
 * Of two rows with one name, the last, unless `index` names the row.
 * @param draft - The header.
 * @param name - The row's name.
 * @param index - The row's place in `params`; absent, the last row named `name`.
 * @returns The header; the same object when there is no such row.
 * @since 3.49.0
 */
export function removeShaderParam(draft: ShaderTextDraft, name: string, index?: number): ShaderTextDraft {
    const params = draft.params ?? [];
    const at = index ?? params.map((row) => row.name).lastIndexOf(name);
    if (params[at] === undefined) {
        return draft;
    }

    return carryParamReferences({ ...draft, params: params.filter((_, index) => index !== at) }, name, undefined);
}

// ---------------------------------------------------------------------------------------------
// Writing text
// ---------------------------------------------------------------------------------------------

/** The character that starts a JSON escape. */
const BACKSLASH = String.fromCodePoint(0x5c);

/**
 * A header and a body as shader text. `*` `/` inside a JSON string is written `*\/`, which reads
 * back equal and does not end the comment, and a character above 0x7E is written as a `\uXXXX`
 * escape, which reads back equal and keeps the header ASCII.
 * @param header - The header's keys.
 * @param body - The body.
 * @returns The text.
 */
function composeText(header: Readonly<Record<string, unknown>>, body: string): ShaderText {
    const json = JSON.stringify(header, null, 4)
        .replaceAll("*/", String.raw`*\/`)
        .replaceAll(
            /[\u007f-\uffff]/g,
            (char) => `${BACKSLASH}u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`,
        );
    return `/* ${SHADER_TEXT_MAGIC}\n${json}\n*/\n${body}`;
}

/**
 * Write a header as written and a body as shader text, the inverse of {@link splitShaderText}. The
 * draft's keys keep their order and nothing is checked, so a half-typed row survives the trip for
 * `check` to report.
 * @param draft - The header's keys.
 * @param body - The body.
 * @returns The text.
 * @since 3.49.0
 */
export function formatShaderDraft(draft: ShaderTextDraft, body: string): ShaderText {
    return composeText(draft, body);
}

/**
 * A parameter as a header writes it: the plain name only when it is not the one derived.
 * @param param - The parameter.
 * @returns The header entry.
 */
function paramEntry(param: ShaderParamDescriptor): Record<string, unknown> {
    const entry: Record<string, unknown> = { name: param.name, type: param.type, default: param.default };
    for (const key of ["min", "max", "step", "values", "description", "varies", "primary", "choices"] as const) {
        if (param[key] !== undefined) {
            entry[key] = param[key];
        }
    }

    if (param.plainName !== shaderParamPlainName(param.name)) {
        entry.plainName = param.plainName;
    }

    return entry;
}

/**
 * A motion as a header writes it: the shorthand where there is one.
 * @param motion - The motion, or its shorthand.
 * @returns What the header carries, or undefined when the motion is left to be inferred.
 */
function motionEntry(motion: ShaderRegistrationDescriptor["motion"]): unknown {
    if (motion === undefined) {
        return undefined;
    }

    const value = motionOf(motion);
    const keys = Object.keys(value);
    if (keys.length === 0) {
        return "still";
    }

    return keys.length === 1 && value.loop !== undefined && Object.keys(value.loop).length === 0 ? "loop" : value;
}

/**
 * Whether two lists hold the same entries in the same order.
 * @param a - One list.
 * @param b - The other.
 * @returns True when they do.
 */
function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
    return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/**
 * Write a shader as text, the inverse of {@link parseShaderText}: reading what this writes gives
 * back an equal registration.
 * @param registration - The shader.
 * @returns The text: the header, then the body.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a registration with a `wgsl` body, which the
 *   text cannot carry.
 * @since 3.36.0
 */
export function formatShaderText(registration: ShaderRegistration): ShaderText {
    if (registration.wgsl !== undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "Shader text carries GLSL only, so a shader with a wgsl body cannot be written as text.",
            source: "style",
            details: { id: registration.descriptor.id, field: "wgsl" },
        });
    }

    const { descriptor, glsl, lowDetail } = registration;
    if (typeof glsl !== "string" || (lowDetail !== undefined && typeof lowDetail !== "string")) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "Shader text is written from loaded bodies: load glsl and lowDetail before formatting.",
            source: "style",
            details: { id: descriptor.id, field: typeof glsl === "string" ? "lowDetail" : "glsl" },
        });
    }

    // The place is always written, so the text never leans on where it is pasted; the places only
    // when they are not the place's default.
    const header: Record<string, unknown> = { id: descriptor.id, name: descriptor.plainName };
    const { place, places, minSize } = descriptor;
    if (place !== undefined) {
        header.place = place;
    }

    if (places !== undefined && (place === undefined || !sameList(places, defaultPlaces(place)))) {
        header.places = places;
    }

    for (const key of ["minSize", "categories", "preview", "cost", "thumbnail"] as const) {
        if (descriptor[key] !== undefined) {
            header[key] = descriptor[key];
        }
    }

    const motion = motionEntry(descriptor.motion);
    if (motion !== undefined) {
        header.motion = motion;
    }

    for (const key of ["reach", "reachParam", "blend", "form", "bloom", "requires", "reads", "webgpu"] as const) {
        if (descriptor[key] !== undefined) {
            header[key] = descriptor[key];
        }
    }

    // The parameter a declared minimum size adds is the element's, not the text's.
    header.params = descriptor.params
        .filter((param) => minSize === undefined || param.name !== "minSize")
        .map(paramEntry);
    const body = lowDetail === undefined ? glsl : joinFar(descriptor.id, glsl, lowDetail);

    return composeText(header, body);
}
