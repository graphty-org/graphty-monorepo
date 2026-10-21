/**
 * @file The wrapper: everything the element writes around a shader body to make a program
 * (design/rendering/shader-styles.md section 4.2) -- the version and precision, the scene
 * uniforms, one uniform per parameter, the input structs, the helpers, a renamed copy of the body,
 * the NaN guard and `main`.
 *
 * **Every top-level name is prefixed.** The body's own functions, structs, globals and
 * parameters become `graphty_u_<name>`, and the library's become `graphty_<name>`, with every
 * reference renamed to match; a field after a `.` and a struct member keep their names. So a
 * helper a reader calls `world` never collides with a name Babylon.js declares in the same
 * program, and nothing a body declares can shadow the element's own.
 *
 * **Driver lines map back to the text.** `#line 1` precedes the body, so a compile error inside
 * it is reported at the body's own line, which the caller offsets to the line of the whole text.
 * The wrapper's own code after the body is numbered from {@link WRAPPER_LINE}, so an error there is
 * told apart.
 *
 * This module writes the sample program the test frame and the thumbnail draw: a camera-facing
 * square showing the shader on a sample node, edge, background or group. The node and edge
 * batches build their own programs from the same pieces.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

import { tokenize } from "../../catalog/shaderGlsl";
import type { ShaderDescriptor, ShaderKind, ShaderParamDescriptor, ShaderProblem } from "../../catalog/shaders";
import { GLSL_HELPERS, GLSL_STRUCTS } from "./glsl";
import { uniformValueOf } from "./nodeLayout";

export { uniformValueOf };

/** The line the wrapper's code after the body is numbered from, so its errors are told apart. */
export const WRAPPER_LINE = 100_000;

/** The scene uniform block every program shares; see `sceneUniforms.ts`. */
export const SCENE_BLOCK = "graphtyScene";

/** The members of {@link SCENE_BLOCK}, in order, each a vec4. */
export const SCENE_MEMBERS = [
    // x: time in seconds, wrapped; y: quality level (0 low, 1 medium, 2 high)
    "graphty_scene_time",
    "graphty_scene_lightDir",
    "graphty_scene_lightColor",
    "graphty_scene_ambient",
    // xyz: the canvas's clear color, 0..1, what a shader drawn over the background sits on
    "graphty_scene_canvas",
] as const;

/** The uniforms of the sample program beside the parameters. */
export const SAMPLE_UNIFORMS = ["graphty_sampleColor", "graphty_sampleSize", "graphty_sampleReach"] as const;

/** The prefix of a body's own names. */
const BODY_PREFIX = "graphty_u_";

/** The prefix of the library's names. */
const LIBRARY_PREFIX = "graphty_";

/** One token, as the checker's tokenizer reads it. */
type Token = ReturnType<typeof tokenize>["tokens"][number];

/** Tokens after which an identifier is being declared, not used. */
const DECLARATOR_FOLLOWERS = new Set(["(", "=", ",", ";", "["]);

/**
 * The names a GLSL text declares at its top level: its functions, structs and globals.
 * @param tokens - The text's tokens.
 * @returns The names.
 */
function topLevelNames(tokens: readonly Token[]): Set<string> {
    const names = new Set<string>();
    let depth = 0;
    let parens = 0;
    // Inside an initializer at top level, until the next "," or ";" outside brackets.
    let initializing = false;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const { text } = token;
        if (text === "{") {
            depth++;
        } else if (text === "}") {
            depth--;
        } else if (text === "(") {
            parens++;
        } else if (text === ")") {
            parens--;
        } else if (depth === 0 && parens === 0) {
            if (text === "struct" && tokens[i + 1]?.kind === "id") {
                names.add(tokens[i + 1].text);
                i++;
            } else if (text === "=") {
                initializing = true;
            } else if (text === "," || text === ";") {
                initializing = false;
            } else if (
                !initializing &&
                token.kind === "id" &&
                tokens[i - 1]?.kind === "id" &&
                DECLARATOR_FOLLOWERS.has(tokens[i + 1]?.text ?? "")
            ) {
                // "type name (", "type name =", "type name ;" ... -- a declarator follows its type.
                names.add(text);
            } else if (
                !initializing &&
                token.kind === "id" &&
                tokens[i - 1]?.text === "," &&
                tokens[i + 1] !== undefined
            ) {
                // The second name of "float a, b;".
                names.add(text);
            }
        }
    }

    return names;
}

/**
 * Whether the token at `i` declares a member inside a struct body: inside `struct X { ... }`,
 * the identifier just before a `;`, `,` or `[`.
 * @param tokens - The tokens.
 * @param i - The index.
 * @param inStruct - Whether `i` is inside a struct body.
 * @returns True when it names a member.
 */
function isMemberName(tokens: readonly Token[], i: number, inStruct: boolean): boolean {
    return inStruct && [";", ",", "["].includes(tokens[i + 1]?.text ?? "");
}

/**
 * Rename identifiers in a GLSL text, in place, keeping every other character -- comments, spaces
 * and line breaks -- so line numbers stay. A field after `.` and a struct member keep their names.
 * @param text - The text.
 * @param rename - The new name of each identifier to rename.
 * @returns The renamed text.
 */
export function renameIdentifiers(text: string, rename: ReadonlyMap<string, string>): string {
    const { tokens } = tokenize(text, { line: 1, column: 1 });
    const lineStarts = [0];
    for (let index = 0; index < text.length; index++) {
        if (text.charCodeAt(index) === 10) {
            lineStarts.push(index + 1);
        }
    }

    const edits: { at: number; length: number; to: string }[] = [];
    let structDepth = -1;
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.text === "{") {
            depth++;
            if (tokens[i - 2]?.text === "struct") {
                structDepth = depth;
            }
        } else if (token.text === "}") {
            if (depth === structDepth) {
                structDepth = -1;
            }

            depth--;
        }

        const to = token.kind === "id" ? rename.get(token.text) : undefined;
        if (to === undefined || tokens[i - 1]?.text === ".") {
            continue;
        }

        if (isMemberName(tokens, i, structDepth !== -1 && depth >= structDepth)) {
            continue;
        }

        edits.push({ at: lineStarts[token.line - 1] + token.column - 1, length: token.text.length, to });
    }

    let out = text;
    for (const edit of edits.reverse()) {
        out = out.slice(0, edit.at) + edit.to + out.slice(edit.at + edit.length);
    }

    return out;
}

/** The library's top-level names, read once. */
let libraryNames: ReadonlySet<string> | null = null;

/**
 * Every name the element's library declares: the structs, the helpers and their internals.
 * @returns The names.
 */
function namesOfLibrary(): ReadonlySet<string> {
    libraryNames ??= new Set([
        ...topLevelNames(tokenize(GLSL_STRUCTS, { line: 1, column: 1 }).tokens),
        ...topLevelNames(tokenize(GLSL_HELPERS, { line: 1, column: 1 }).tokens),
    ]);
    return libraryNames;
}

/** The library with its names prefixed, built once. */
let library: string | null = null;

/**
 * The structs and helpers, renamed `graphty_<name>`.
 * @returns The GLSL.
 */
export function wrappedLibrary(): string {
    if (library === null) {
        const rename = new Map([...namesOfLibrary()].map((name) => [name, LIBRARY_PREFIX + name]));
        library = `${renameIdentifiers(GLSL_STRUCTS, rename)}\n${renameIdentifiers(GLSL_HELPERS, rename)}`;
    }

    return library;
}

/**
 * A body with its own names prefixed `graphty_u_` and its references to the library renamed to
 * the library's prefixed names.
 * @param body - The body.
 * @param params - The shader's parameters, which are globals of the body.
 * @returns The renamed body.
 */
export function prefixBody(body: string, params: readonly ShaderParamDescriptor[]): string {
    const rename = new Map<string, string>();
    for (const name of namesOfLibrary()) {
        rename.set(name, LIBRARY_PREFIX + name);
    }

    for (const name of topLevelNames(tokenize(body, { line: 1, column: 1 }).tokens)) {
        rename.set(name, BODY_PREFIX + name);
    }

    for (const param of params) {
        rename.set(param.name, BODY_PREFIX + param.name);
    }

    return renameIdentifiers(body, rename);
}

/**
 * Take the prefixes back out of a driver's message, so it names what the reader wrote.
 * @param message - The driver's message.
 * @returns The message with `graphty_u_` and `graphty_` removed from names.
 */
export function unprefix(message: string): string {
    return message.replaceAll(BODY_PREFIX, "").replaceAll(/\bgraphty_(?!scene|sample|p_|quality)/g, "");
}

/**
 * The GLSL type a parameter is a global of, and its uniform's type.
 * @param param - The parameter.
 * @returns `"vec3"` for a color, `"float"` for every other kind (an integer or enum index, a bool as 0 or 1).
 */
function uniformTypeOf(param: ShaderParamDescriptor): "vec3" | "float" {
    return param.type === "color" ? "vec3" : "float";
}

/**
 * The global a parameter is in the body: its GLSL type.
 * @param param - The parameter.
 * @returns The type.
 */
function globalTypeOf(param: ShaderParamDescriptor): string {
    switch (param.type) {
        case "color":
            return "vec3";
        case "integer":
        case "enum":
            return "int";
        case "boolean":
            return "bool";
        default:
            return "float";
    }
}

/**
 * A GLSL float literal.
 * @param value - The number.
 * @returns The literal, always with a decimal point.
 */
function floatLiteral(value: number): string {
    const text = String(value);
    return /[.eE]/.test(text) ? text : `${text}.0`;
}

/**
 * The statement that sets a parameter's global from its uniform, clamped to its declared range.
 * @param param - The parameter.
 * @returns The GLSL statement.
 */
function paramAssignment(param: ShaderParamDescriptor): string {
    const global = BODY_PREFIX + param.name;
    const uniform = `graphty_p_${param.name}`;
    switch (param.type) {
        case "color":
            return `${global} = clamp(${uniform}, 0.0, 1.0);`;
        case "boolean":
            return `${global} = ${uniform} > 0.5;`;
        case "enum": {
            const last = Math.max(0, (param.values?.length ?? 1) - 1);
            return `${global} = int(clamp(floor(${uniform} + 0.5), 0.0, ${floatLiteral(last)}));`;
        }
        default: {
            const min = typeof param.min === "number" ? floatLiteral(param.min) : "-1e30";
            const max = typeof param.max === "number" ? floatLiteral(param.max) : "1e30";
            const clamped = `clamp(${uniform}, ${min}, ${max})`;
            return param.type === "integer" ? `${global} = int(floor(${clamped} + 0.5));` : `${global} = ${clamped};`;
        }
    }
}

/** What the sample program draws for a pixel whose result is not a number: the color beneath. */
const SAMPLE_FALLBACK: Readonly<Record<ShaderKind, string>> = {
    "node-surface": "graphty_in.color",
    "node-sprite": "graphty_in.color",
    "node-effect": "vec4(0.0)",
    "edge-surface": "graphty_in.color",
    "edge-effect": "vec4(0.0)",
    background: "vec4(0.0, 0.0, 0.0, 1.0)",
    boundary: "vec4(0.0)",
};

/**
 * The statements of the sample `main` that fill the input for a kind.
 * @param kind - The kind.
 * @returns The GLSL.
 */
function sampleInput(kind: ShaderKind): string {
    const time = "graphty_scene_time.x";
    switch (kind) {
        case "node-surface":
        case "node-sprite":
        case "node-effect":
            return `
    graphty_NodeInput graphty_in;
    vec2 graphty_uv = (vUV * 2.0 - 1.0) * graphty_sampleReach;
    float graphty_r2 = dot(graphty_uv, graphty_uv);
    ${kind === "node-surface" ? "if (graphty_r2 > 1.0) { gl_FragColor = vec4(0.0); return; }" : ""}
    float graphty_z = sqrt(max(1.0 - graphty_r2, 0.0));
    graphty_in.uv = graphty_uv;
    graphty_in.local = vec3(graphty_uv, -graphty_z);
    graphty_in.normal = vec3(graphty_uv, -graphty_z);
    graphty_in.viewDir = vec3(0.0, 0.0, 1.0);
    graphty_in.color = graphty_sampleColor;
    graphty_in.size = 1.0;
    graphty_in.pixelSize = graphty_sampleSize.x * 0.5 / graphty_sampleReach;
    graphty_in.seed = 0.37;
    graphty_in.selected = 0.0;
    graphty_in.hovered = 0.0;
    graphty_in.pinned = 0.0;
    graphty_in.sinceSelected = -1.0;
    graphty_in.sinceHovered = -1.0;
    graphty_in.sincePinned = -1.0;
    graphty_in.sinceEntered = ${time};
    graphty_in.sinceExited = -1.0;
    graphty_in.sinceChanged = -1.0;
    graphty_in.time = ${time};`;
        case "edge-surface":
        case "edge-effect":
            return `
    graphty_EdgeInput graphty_in;
    graphty_in.t = vUV.x;
    graphty_in.side = vUV.y * 2.0 - 1.0;
    graphty_in.lengthPx = graphty_sampleSize.x;
    graphty_in.widthPx = graphty_sampleSize.y;
    graphty_in.sourceColor = graphty_sampleColor;
    graphty_in.targetColor = vec4(graphty_sampleColor.bgr, graphty_sampleColor.a);
    graphty_in.color = mix(graphty_in.sourceColor, graphty_in.targetColor, vUV.x);
    graphty_in.seed = 0.37;
    graphty_in.selected = 0.0;
    graphty_in.hovered = 0.0;
    graphty_in.sourceSelected = 0.0;
    graphty_in.targetSelected = 0.0;
    graphty_in.sinceEntered = ${time};
    graphty_in.sinceExited = -1.0;
    graphty_in.sinceChanged = -1.0;
    graphty_in.time = ${time};`;
        case "background":
            return `
    graphty_BackgroundInput graphty_in;
    graphty_in.uv = vUV;
    graphty_in.viewDir = normalize(vec3(vUV * 2.0 - 1.0, 1.0));
    graphty_in.resolution = graphty_sampleSize.xy;
    graphty_in.time = ${time};
    graphty_in.groupTint = vec4(0.0);`;
        default:
            return `
    graphty_BoundaryInput graphty_in;
    vec2 graphty_c0 = vec2(0.38, 0.45); vec2 graphty_c1 = vec2(0.62, 0.55); vec2 graphty_c2 = vec2(0.5, 0.32);
    vec2 graphty_d0 = vUV - graphty_c0; vec2 graphty_d1 = vUV - graphty_c1; vec2 graphty_d2 = vUV - graphty_c2;
    float graphty_k0 = exp(-dot(graphty_d0, graphty_d0) * 60.0);
    float graphty_k1 = exp(-dot(graphty_d1, graphty_d1) * 60.0);
    float graphty_k2 = exp(-dot(graphty_d2, graphty_d2) * 60.0);
    graphty_in.uv = vUV;
    graphty_in.field = graphty_k0 + graphty_k1 + graphty_k2;
    graphty_in.fieldGradient = -120.0 * (graphty_d0 * graphty_k0 + graphty_d1 * graphty_k1 + graphty_d2 * graphty_k2);
    vec2 graphty_s = (vUV - vec2(0.5)) / 0.35;
    float graphty_sr = dot(graphty_s, graphty_s);
    graphty_in.normal = graphty_sr < 1.0 ? vec3(graphty_s, -sqrt(1.0 - graphty_sr)) : vec3(0.0);
    graphty_in.viewDir = vec3(0.0, 0.0, 1.0);
    graphty_in.color = graphty_sampleColor;
    graphty_in.group = 0.0;
    graphty_in.depth = 0.0;
    graphty_in.time = ${time};`;
    }
}

/** A program the element compiles: its two stages and the uniforms it declares. */
export interface WrappedProgram {
    readonly vertex: string;
    readonly fragment: string;
    /** Every plain uniform, the parameters' among them. */
    readonly uniforms: readonly string[];
    /** The uniform blocks. */
    readonly uniformBuffers: readonly string[];
}

/** The sample program's vertex stage: a square over the target. */
const SAMPLE_VERTEX = `precision highp float;
attribute vec2 position;
varying vec2 vUV;
void main() {
    vUV = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

/**
 * The shared declarations of every fragment program: precision, the scene block, the library.
 * @returns The GLSL.
 */
export function fragmentPrelude(): string {
    return `precision highp float;
precision highp int;
uniform ${SCENE_BLOCK} {
${SCENE_MEMBERS.map((member) => `    vec4 ${member};`).join("\n")}
};
float graphty_quality;
${wrappedLibrary()}
bool graphty_bad(vec4 c) {
    uvec4 bits = floatBitsToUint(c) & uvec4(0x7f800000u);
    return any(equal(bits, uvec4(0x7f800000u)));
}
`;
}

/**
 * The statements every `main` starts with: the quality level, the light, the parameters.
 * @param params - The parameters.
 * @returns The GLSL.
 */
export function mainPrelude(params: readonly ShaderParamDescriptor[]): string {
    return `    graphty_quality = graphty_scene_time.y;
    graphty_lightDir = graphty_scene_lightDir.xyz;
    graphty_lightColor = graphty_scene_lightColor.xyz;
    graphty_ambient = graphty_scene_ambient.xyz;
    graphty_canvasColor = graphty_scene_canvas.xyz;
${params.map((param) => `    ${paramAssignment(param)}`).join("\n")}`;
}

/**
 * The declarations of a shader's parameters: one uniform each, and the global the body reads.
 * @param params - The parameters.
 * @returns The GLSL.
 */
export function paramDeclarations(params: readonly ShaderParamDescriptor[]): string {
    return params
        .map(
            (param) =>
                `uniform ${uniformTypeOf(param)} graphty_p_${param.name};\n${globalTypeOf(param)} ${BODY_PREFIX}${param.name};`,
        )
        .join("\n");
}

/**
 * The globals a shader's parameters are in the body, without their uniforms: for programs that
 * read the values from somewhere else (a data texture, an instanced attribute) into locals named
 * `graphty_p_<name>` before {@link mainPrelude} assigns them.
 * @param params - The parameters.
 * @returns The GLSL.
 */
export function paramGlobals(params: readonly ShaderParamDescriptor[]): string {
    return params.map((param) => `${globalTypeOf(param)} ${BODY_PREFIX}${param.name};`).join("\n");
}

/**
 * The sample program for one shader: what the test frame and the thumbnail draw.
 * @param descriptor - The shader's catalog facts.
 * @param body - Its GLSL body, as written.
 * @returns The program.
 */
export function sampleProgram(descriptor: Pick<ShaderDescriptor, "kind" | "params">, body: string): WrappedProgram {
    const { kind, params } = descriptor;
    const fragment = `${fragmentPrelude()}
uniform vec4 graphty_sampleColor;
uniform vec4 graphty_sampleSize;
uniform float graphty_sampleReach;
varying vec2 vUV;
${paramDeclarations(params)}
#line 1
${prefixBody(body, params)}
#line ${String(WRAPPER_LINE)}
void main() {
${mainPrelude(params)}
${sampleInput(kind)}
    vec4 graphty_out = ${BODY_PREFIX}shade(graphty_in);
    if (graphty_bad(graphty_out)) {
        graphty_out = ${SAMPLE_FALLBACK[kind]};
    }

    gl_FragColor = graphty_out;
}
`;

    return {
        vertex: SAMPLE_VERTEX,
        fragment,
        uniforms: [...SAMPLE_UNIFORMS, ...params.map((param) => `graphty_p_${param.name}`)],
        uniformBuffers: [SCENE_BLOCK],
    };
}

/**
 * The problem a driver's compile error is, with its line mapped back to the shader text.
 * @param errors - The driver's errors, as Babylon passes them.
 * @param bodyLine - The line of the text the body starts on.
 * @returns The problem.
 */
export function compileProblem(errors: string, bodyLine: number): ShaderProblem {
    const match = /ERROR:\s*\d+:(\d+):\s*(.*)/.exec(errors);
    const driverLine = match === null ? 0 : Number(match[1]);
    const message = unprefix((match?.[2] ?? errors.split("\n")[0] ?? "").trim()).slice(0, 400);
    // A line of the wrapper's own code after the body has no place in the text.
    const line = driverLine > 0 && driverLine < WRAPPER_LINE ? bodyLine + driverLine - 1 : 0;
    let reason: string | undefined;
    if (/undeclared identifier|no matching overloaded function|undefined/i.test(message)) {
        reason = "undeclared-name";
    } else if (/cannot convert|wrong operand types|type mismatch|dimension mismatch/i.test(message)) {
        reason = "type-mismatch";
    } else if (/syntax error|unexpected/i.test(message)) {
        reason = "unexpected-token";
    }

    return {
        code: "shader.compile",
        params: { line, column: line === 0 ? 0 : 1, message, ...(reason === undefined ? {} : { reason }) },
    };
}
