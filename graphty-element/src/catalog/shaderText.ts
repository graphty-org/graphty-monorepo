/**
 * @file The shader text format: GLSL with a JSON header in its first comment, read and written
 * (design/rendering/shader-styles.md section 4).
 *
 * ```glsl
 * /* graphty-shader 1
 * { "id": "user/pulse-ring", "name": "Pulse ring", "role": "effect", "params": [...] }
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
    drawingOf,
    isShaderId,
    isShaderParamName,
    motionOf,
    type ShaderMotion,
    type ShaderParamDescriptor,
    type ShaderPlace,
    type ShaderProblem,
    type ShaderRegistration,
    type ShaderRole,
    type ShaderTarget,
    type ShaderText,
    type ShaderTextResult,
} from "./shaders";

/** What the header comment starts with. */
export const SHADER_TEXT_MAGIC = "graphty-shader 1";

/** The most parameters one shader declares. */
export const SHADER_PARAM_LIMIT = 16;

/** The most parameters one shader lets `encode` bind per element. */
export const SHADER_VARIES_LIMIT = 4;

/** The most characters a name or a label keeps. */
const NAME_LIMIT = 40;

/** The most characters a header holds. */
const HEADER_LIMIT = 16_384;

/** The largest magnitude a float32 holds. */
const FLOAT32_MAX = 3.4e38;

/** The parameter types a shader may declare. */
const PARAM_TYPES: ReadonlySet<string> = new Set(["number", "integer", "boolean", "enum", "color"]);

/** The parameter types `encode` may bind per element. */
const VARYING_TYPES: ReadonlySet<string> = new Set(["number", "integer", "color"]);

/** The keys a header may carry; `id` is required. */
const HEADER_KEYS: ReadonlySet<string> = new Set([
    "id",
    "name",
    "role",
    "geometry",
    "minPixels",
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
]);

/** A color, `#rrggbb`. */
const HEX_COLOR = /^#[\da-fA-F]{6}$/;

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
 * Check one parameter and build its descriptor.
 * @param raw - The parameter as written.
 * @param index - Its place in the list.
 * @returns The descriptor, or the problem.
 */
function readParam(raw: unknown, index: number): ShaderParamDescriptor | ShaderProblem {
    const label = isRecord(raw) && typeof raw.name === "string" ? raw.name : `#${String(index)}`;
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
    const plainName = typeof raw.plainName === "string" ? cleanName(raw.plainName) : sentenceCase(name);
    const values = raw.values as { value: string; label: string }[] | undefined;
    const value = type === "color" ? (raw.default as string).toLowerCase() : raw.default;

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

    if (!isRecord(raw) || Object.keys(raw).some((key) => !["loop", "enter", "exit", "change"].includes(key))) {
        return null;
    }

    const seconds = (value: unknown): boolean =>
        value === undefined || (typeof value === "number" && value >= 0 && value <= 10);
    if (!seconds(raw.enter) || !seconds(raw.exit) || !seconds(raw.change)) {
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
    reach: (value) => typeof value === "number" && value >= 1 && value <= 6,
    blend: (value) => value === "over" || value === "add",
    form: (value) => value === "field" || value === "sphere",
    bloom: (value) => typeof value === "boolean",
    requires: (value) => Array.isArray(value) && value.every((entry) => entry === "webgl2"),
    reads: (value) => Array.isArray(value) && value.every((entry) => INPUTS.has(entry as string)),
    webgpu: (value) => value === "translate" || value === "none",
    role: (value) => value === "look" || value === "effect",
    geometry: (value) => value === "shape" || value === "card",
    minPixels: (value) => typeof value === "number" && value >= 0 && value <= 512,
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

/** What a parsed registration's descriptor always carries. */
type SettledDescriptor = ShaderRegistrationDescriptor & { readonly target: ShaderTarget; readonly role: ShaderRole };

/**
 * The target and role of a shader, and the problems that rule it out.
 *
 * The target is read from the entry function's input; a declared one (registration only) must
 * agree. The role, in order: a declared role; an effect when `reach` is given on a node or edge;
 * the place's role; a look.
 * @param descriptor - The checked facts.
 * @param body - The body, when it is known.
 * @param place - Where the shader is being added, if anywhere.
 * @returns The settled descriptor, or the problems.
 */
export function settleShaderPlace(
    descriptor: ShaderRegistrationDescriptor,
    body: string | undefined,
    place?: ShaderPlace,
): SettledDescriptor | ShaderProblem[] {
    const found = body === undefined ? undefined : entryTargetOf(body);
    const declared = descriptor.target;
    if (found !== undefined && declared !== undefined && found !== declared) {
        return [{ code: "shader.target-mismatch", params: { expected: declared, found } }];
    }

    if (found !== undefined && place !== undefined && found !== place.target) {
        return [{ code: "shader.target-mismatch", params: { expected: place.target, found } }];
    }

    const target = found ?? declared ?? place?.target ?? "node";
    const sided = target === "node" || target === "edge";
    const implied = sided && descriptor.reach !== undefined ? "effect" : undefined;
    const named = descriptor.role ?? implied;
    if (named !== undefined && place !== undefined && named !== place.role) {
        return [{ code: "shader.target-mismatch", params: { expected: place.role, found: named } }];
    }

    const role = named ?? place?.role ?? "look";
    const fault = placeFault(descriptor, target, role);
    if (fault !== null) {
        return [{ code: "shader.header-key", params: { key: fault } }];
    }

    return { ...descriptor, target, role };
}

/**
 * The key that does not fit where a shader draws: an effect on a group or the background, a
 * geometry on anything but a node look, a minimum size on anything but an effect.
 * @param descriptor - The facts.
 * @param target - What it draws on.
 * @param role - Its role.
 * @returns The key at fault, or null.
 */
function placeFault(descriptor: ShaderRegistrationDescriptor, target: ShaderTarget, role: ShaderRole): string | null {
    if (role === "effect" && (target === "group" || target === "background")) {
        return "role";
    }

    if (descriptor.geometry !== undefined && (target !== "node" || role !== "look")) {
        return "geometry";
    }

    return descriptor.minPixels !== undefined && role !== "effect" ? "minPixels" : null;
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
 * Check the body (and the far body) and complete the registration: its target and role settled,
 * its motion inferred when the header gives none.
 * @param descriptor - The checked descriptor.
 * @param body - The body.
 * @param origin - Where the body starts in the text.
 * @param place - Where the shader is being added, if anywhere.
 * @returns The result.
 */
function finishText(
    descriptor: ShaderRegistrationDescriptor,
    body: string,
    origin: BodyOrigin,
    place: ShaderPlace | undefined,
): ShaderTextResult {
    const { near, far } = splitFar(body);
    const settled = settleShaderPlace(descriptor, near, place);
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
 * The target is read from the entry function's input. The role is the header's `role`; else an
 * effect when the header gives `reach`; else the role of `options.place`; else a look. Text whose
 * signature names another target than the place's, or whose role is another than the place's, is
 * refused with `shader.target-mismatch` (`{ expected, found }`).
 * @param text - The text: GLSL with a `graphty-shader 1` header, or a body alone.
 * @param options - Where the shader is being added.
 * @param options.place - That place: its target and role.
 * @returns The registration the text describes, or every problem the first failing step found.
 * @since 3.36.0
 */
export function parseShaderText(text: ShaderText, options?: { readonly place?: ShaderPlace }): ShaderTextResult {
    if (typeof text !== "string") {
        return { ok: false, problems: [{ code: "shader.header-missing", params: {} }] };
    }

    const ascii = firstNonAscii(text);
    if (ascii !== -1) {
        const at = placeOf(text, ascii);
        return { ok: false, problems: [{ code: "shader.not-ascii", params: { line: at.line, column: at.column } }] };
    }

    const place = options?.place;
    const split = splitHeader(text);
    if (split === null) {
        return finishText({ id: "user/shader", plainName: "Shader", params: [] }, text, { line: 1, column: 1 }, place);
    }

    const parsed = parseHeaderJson(text, split);
    if ("code" in parsed) {
        return { ok: false, problems: [parsed] };
    }

    if (!isRecord(parsed.value)) {
        const at = placeOf(text, split.jsonOffset);
        return {
            ok: false,
            problems: [
                { code: "shader.header-json", params: { line: at.line, column: at.column, message: "not an object" } },
            ],
        };
    }

    const unknown = Object.keys(parsed.value).filter((key) => !HEADER_KEYS.has(key));
    if (unknown.length > 0) {
        return { ok: false, problems: unknown.map((key) => ({ code: "shader.header-key", params: { key } })) };
    }

    const descriptor = readShaderDescriptor(parsed.value, "name", true);
    if (Array.isArray(descriptor)) {
        return { ok: false, problems: descriptor };
    }

    return finishText(descriptor, split.body, placeOf(text, split.bodyOffset), place);
}

// ---------------------------------------------------------------------------------------------
// Writing text
// ---------------------------------------------------------------------------------------------

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

    if (param.plainName !== sentenceCase(param.name)) {
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

    const header: Record<string, unknown> = { id: descriptor.id, name: descriptor.plainName };
    // The role is written whenever the reach would not imply it, so the text never leans on a place.
    const implied = descriptor.reach !== undefined && (descriptor.target === "node" || descriptor.target === "edge");
    if (descriptor.role !== undefined && (descriptor.role !== "effect" || !implied)) {
        header.role = descriptor.role;
    }

    for (const key of ["geometry", "minPixels", "categories", "preview", "cost", "thumbnail"] as const) {
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

    header.params = descriptor.params.map(paramEntry);
    const body = lowDetail === undefined ? glsl : joinFar(descriptor.id, glsl, lowDetail);

    return `/* ${SHADER_TEXT_MAGIC}\n${JSON.stringify(header, null, 4)}\n*/\n${body}`;
}
