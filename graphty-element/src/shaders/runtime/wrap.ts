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
 * program, and nothing a body declares can shadow the element's own. A name WGSL will not take is
 * prefixed everywhere, fields and locals too, so the same body also draws under WebGPU; one that
 * is also a GLSL built-in function keeps its name where it is called, and as a field.
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

import { GLSL_FUNCTIONS, GLSL_RESERVED, tokenize } from "../../catalog/shaderGlsl";
import {
    drawingOf,
    isClockBinding,
    type ShaderClock,
    type ShaderDescriptor,
    type ShaderDrawing,
    type ShaderParamDescriptor,
    type ShaderProblem,
} from "../../catalog/shaders";
import { GLSL_HELPERS, GLSL_STRUCTS, WEBGPU_BUILT_INS } from "./glsl";

export { uniformValueOf } from "./nodeLayout";

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
const SAMPLE_UNIFORMS = ["graphty_sampleColor", "graphty_sampleSize", "graphty_sampleReach"] as const;

/** The prefix of a body's own names. */
const BODY_PREFIX = "graphty_u_";

/** The prefix of the library's names. */
const LIBRARY_PREFIX = "graphty_";

/**
 * The names a body's own declaration of would lose the shader under WebGPU: the keywords (section
 * 16.1), reserved words (section 16.2) and built-in functions (section 17) of the WGSL specification,
 * checked against the W3C text of 2026-10-26, plus names of the toolchain that translates the body. Under
 * WebGPU a GLSL program is translated to WGSL with its names kept, so a local called `pass` or `select`
 * is legal GLSL the device refuses, losing the whole frame (#5852), and a local called `abs` is refused
 * as soon as the function also calls `abs` (#5872). WGSL's predeclared types (`f32`, `ptr`) and
 * enumerants (`read`) are not here: the translator renames a local of those names itself.
 *
 * The body's uses of these names are renamed `graphty_u_<name>`, except the GLSL keywords, which a body
 * cannot declare, and the calls and fields of a GLSL built-in function ({@link GLSL_FUNCTIONS}). `modf`
 * is not here because it is a library helper, which is renamed like every other (see `glsl.ts`). The
 * same goes for the built-ins of `WEBGPU_BUILT_INS`, whose names stay here for a reader's own locals.
 */
export const WGSL_NAMES: ReadonlySet<string> = new Set(
    // Keywords.
    (
        "alias break case const const_assert continue continuing default diagnostic discard else enable false fn " +
        "for if let loop override requires return struct switch true var while " +
        // Reserved words.
        "NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become " +
        "binding_array cast catch class co_await co_return co_yield coherent column_major common compile " +
        "compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete demote " +
        "demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough filter final " +
        "finally friend from fxgroup get goto groupshared highp impl implements import inline instanceof interface " +
        "layout lowp macro macro_rules match mediump meta mod module move mut mutable namespace new nil noexcept " +
        "noinline nointerpolation non_coherent noncoherent noperspective null nullptr of operator package " +
        "packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public " +
        "readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof " +
        "smooth snorm static static_assert static_cast std subroutine super target template this thread_local " +
        "throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying " +
        "virtual volatile wgsl where with writeonly yield " +
        // A keyword of the compiler that reads GLSL for WebGPU, which GLSL ES 3.00 leaves free.
        "sampler " +
        // Built-in functions.
        "bitcast abs acos acosh all any arrayLength asin asinh atan atan2 atanh atomicAdd atomicAnd " +
        "atomicCompareExchangeWeak atomicExchange atomicLoad atomicMax atomicMin atomicOr atomicStore atomicSub " +
        "atomicXor bufferArrayView bufferLength bufferView ceil clamp cos cosh countLeadingZeros countOneBits countTrailingZeros cross degrees determinant " +
        "distance dot dot4I8Packed dot4U8Packed dpdx dpdxCoarse dpdxFine dpdy dpdyCoarse dpdyFine exp exp2 " +
        "extractBits faceForward firstLeadingBit firstTrailingBit floor fma fract frexp fwidth fwidthCoarse " +
        "fwidthFine insertBits inverseSqrt ldexp length log log2 max min mix normalize pack2x16float " +
        "pack2x16snorm pack2x16unorm pack4x8snorm pack4x8unorm pack4xI8 pack4xI8Clamp pack4xU8 pack4xU8Clamp pow " +
        "quantizeToF16 radians reflect refract reverseBits round saturate select sign sin sinh smoothstep sqrt " +
        "step storageBarrier subgroupAdd subgroupAll subgroupAnd subgroupAny subgroupBallot subgroupBroadcast " +
        "subgroupBroadcastFirst subgroupElect subgroupExclusiveAdd subgroupExclusiveMul subgroupInclusiveAdd " +
        "subgroupInclusiveMul subgroupMax subgroupMin subgroupMul subgroupOr subgroupShuffle subgroupShuffleDown " +
        "subgroupShuffleUp subgroupShuffleXor subgroupXor quadBroadcast quadSwapDiagonal quadSwapX quadSwapY tan " +
        "tanh textureBarrier textureDimensions textureGather textureGatherCompare textureLoad textureNumLayers " +
        "textureNumLevels textureNumSamples textureSample textureSampleBaseClampToEdge textureSampleBias " +
        "textureSampleCompare textureSampleCompareLevel textureSampleGrad textureSampleLevel textureStore transpose " +
        "trunc unpack2x16float unpack2x16snorm unpack2x16unorm unpack4x8snorm unpack4x8unorm unpack4xI8 unpack4xU8 " +
        "workgroupBarrier workgroupUniformLoad"
    ).split(" "),
);

/**
 * The keywords of the Vulkan GLSL that WebGPU's compiler reads, which GLSL ES 3.00 leaves free or
 * only reserves: every name of the kind that compiler refused as a local. They are renamed
 * like {@link WGSL_NAMES}, fields too, but left alone where called: Babylon.js rewrites calls such as
 * `texture2D(`, and a body's own function of one of these names is renamed by being declared.
 */
export const VULKAN_GLSL_NAMES: ReadonlySet<string> = new Set([
    ...["texture", "itexture", "utexture", "image", "iimage", "uimage"].flatMap((kind) =>
        ["1D", "2D", "3D", "Cube", "1DArray", "2DArray", "CubeArray", "2DRect", "Buffer", "2DMS", "2DMSArray"].map(
            (shape) => kind + shape,
        ),
    ),
    ...["", "i", "u"].flatMap((kind) => [`${kind}subpassInput`, `${kind}subpassInputMS`]),
    ...["2", "3", "4", "2x2", "2x3", "2x4", "3x2", "3x3", "3x4", "4x2", "4x3", "4x4"].map((shape) => `dmat${shape}`),
    ...(
        "atomic_uint sample devicecoherent queuefamilycoherent workgroupcoherent subgroupcoherent nonprivate " +
        "pervertexNV perprimitiveNV perviewNV"
    ).split(" "),
]);

/** One token, as the checker's tokenizer reads it. */
type Token = ReturnType<typeof tokenize>["tokens"][number];

/** How each bracket changes the brace and the parenthesis depth. */
const NESTING: ReadonlyMap<string, readonly [number, number]> = new Map([
    ["{", [1, 0]],
    ["}", [-1, 0]],
    ["(", [0, 1]],
    [")", [0, -1]],
]);

/** The brackets that open and close a nested span. */
const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

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
        const { text } = tokens[i];
        const nesting = NESTING.get(text);
        if (nesting !== undefined) {
            depth += nesting[0];
            parens += nesting[1];
        } else if (depth === 0 && parens === 0) {
            if (text === "=") {
                initializing = true;
            } else if (text === "," || text === ";") {
                initializing = false;
            } else {
                const name = topLevelNameAt(tokens, i, initializing);
                if (name !== undefined) {
                    names.add(name);
                }
            }
        }
    }

    return names;
}

/**
 * The name the token at `i`, at top level and outside any brackets, declares, if it declares one:
 * the name after `struct`, a declarator after its type, or the second name of `float a, b;`. A
 * struct's name is reached again as the next token, where it adds nothing new.
 * @param tokens - The tokens.
 * @param i - The index.
 * @param initializing - Whether `i` is inside a top-level initializer.
 * @returns The declared name, or undefined.
 */
function topLevelNameAt(tokens: readonly Token[], i: number, initializing: boolean): string | undefined {
    const token = tokens[i];
    if (token.text === "struct" && tokens[i + 1]?.kind === "id") {
        return tokens[i + 1].text;
    }

    if (initializing || token.kind !== "id") {
        return undefined;
    }

    if (tokens[i - 1]?.kind === "id" && DECLARATOR_FOLLOWERS.has(tokens[i + 1]?.text ?? "")) {
        // "type name (", "type name =", "type name ;" ... -- a declarator follows its type.
        return token.text;
    }

    if (tokens[i - 1]?.text === "," && tokens[i + 1] !== undefined) {
        // The second name of "float a, b;".
        return token.text;
    }

    return undefined;
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
 * and line breaks -- so line numbers stay. A field after `.` and a struct member keep their names,
 * unless the name is in `fields`, and a name in `calls` keeps it where it is called, as does each
 * token in `kept`.
 * @param text - The text.
 * @param rename - The new name of each identifier to rename.
 * @param fields - Names renamed as fields and struct members too.
 * @param calls - Names left alone directly before a `(`.
 * @param kept - Indexes of tokens left alone.
 * @returns The renamed text.
 */
export function renameIdentifiers(
    text: string,
    rename: ReadonlyMap<string, string>,
    fields: ReadonlySet<string> = new Set(),
    calls: ReadonlySet<string> = new Set(),
    kept: ReadonlySet<number> = new Set(),
): string {
    const { tokens } = tokenize(text, { line: 1, column: 1 });
    const lineStarts = lineStartsOf(text);
    const edits: { at: number; length: number; to: string }[] = [];
    const inStruct = structBodyFlags(tokens);
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const to = token.kind === "id" ? rename.get(token.text) : undefined;
        const field = tokens[i - 1]?.text === "." || isMemberName(tokens, i, inStruct[i]);
        const call = calls.has(token.text) && tokens[i + 1]?.text === "(";
        if (to === undefined || call || kept.has(i) || (field && !fields.has(token.text))) {
            continue;
        }

        edits.push({ at: lineStarts[token.line - 1] + token.column - 1, length: token.text.length, to });
    }

    let out = text;
    edits.reverse();
    for (const edit of edits) {
        out = out.slice(0, edit.at) + edit.to + out.slice(edit.at + edit.length);
    }

    return out;
}

/**
 * Whether each token is inside a struct body, `struct X { ... }`: the opening brace counts as
 * inside, the closing one as outside.
 * @param tokens - The tokens.
 * @returns One flag per token.
 */
function structBodyFlags(tokens: readonly Token[]): boolean[] {
    const flags: boolean[] = [];
    let structDepth = -1;
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
        const { text } = tokens[i];
        if (text === "{") {
            depth++;
            if (tokens[i - 2]?.text === "struct") {
                structDepth = depth;
            }
        } else if (text === "}") {
            if (depth === structDepth) {
                structDepth = -1;
            }

            depth--;
        }

        flags.push(structDepth !== -1 && depth >= structDepth);
    }

    return flags;
}

/**
 * Where each line of a text starts, as an offset: 0, then one past every line feed.
 * @param text - The text.
 * @returns The offsets, line 1 first.
 */
function lineStartsOf(text: string): number[] {
    const lineStarts = [0];
    for (let index = 0; index < text.length; index++) {
        if (text.codePointAt(index) === 10) {
            lineStarts.push(index + 1);
        }
    }

    return lineStarts;
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
        const builtIns = WEBGPU_BUILT_INS.map((name) => `#define ${LIBRARY_PREFIX}${name} ${name}`).join("\n");
        library = `${renameIdentifiers(GLSL_STRUCTS, rename)}\n${renameIdentifiers(GLSL_HELPERS, rename)}
#ifndef WEBGPU
${builtIns}
#endif`;
    }

    return library;
}

/**
 * The names of a body to rename because WGSL will not take them ({@link WGSL_NAMES}).
 * @param tokens - The body's tokens.
 * @returns The new names, those renamed as fields too, and those left alone where called.
 */
function wgslRenames(tokens: readonly Token[]): {
    rename: Map<string, string>;
    fields: Set<string>;
    calls: Set<string>;
} {
    const rename = new Map<string, string>();
    const fields = new Set<string>();
    const calls = new Set<string>();
    for (const { kind, text } of tokens) {
        if (kind === "id" && VULKAN_GLSL_NAMES.has(text)) {
            rename.set(text, BODY_PREFIX + text);
            fields.add(text);
            calls.add(text);
        }

        if (kind !== "id" || !WGSL_NAMES.has(text)) {
            continue;
        }

        if (GLSL_FUNCTIONS.has(text)) {
            rename.set(text, BODY_PREFIX + text);
            calls.add(text);
        } else if (!GLSL_RESERVED.has(text)) {
            rename.set(text, BODY_PREFIX + text);
            fields.add(text);
        }
    }

    // A struct of a built-in's name, at any depth, is constructed by a call that must follow it.
    tokens.forEach(({ text }, i) => {
        if (text === "struct") {
            calls.delete(tokens[i + 1]?.text ?? "");
        }
    });

    return { rename, fields, calls };
}

/**
 * The index of the first `stop` after `from` outside any bracket, or of the bracket that closes the
 * one `from` is in. A ternary's `:` is not a stop.
 * @param tokens - The tokens.
 * @param from - The index to start at.
 * @param stop - The token to look for.
 * @returns The index, or the last one when the text ends first.
 */
function endOf(tokens: readonly Token[], from: number, stop: string): number {
    let depth = 0;
    let ternaries = 0;
    for (let i = from; i < tokens.length; i++) {
        const { text } = tokens[i];
        depth += OPENERS.has(text) ? 1 : 0;
        depth -= CLOSERS.has(text) ? 1 : 0;
        ternaries += text === "?" ? 1 : 0;
        if (depth < 0 || (depth === 0 && text === stop && ternaries === 0)) {
            return i;
        }

        ternaries -= text === ":" && ternaries > 0 ? 1 : 0;
    }

    return tokens.length - 1;
}

/**
 * Whether the `[` at `open` may give an array's size. Only what is certainly an index says no, so
 * a doubtful bracket keeps the built-in, which at worst is refused as it was before the helper.
 * @param tokens - The tokens.
 * @param open - The index of the bracket.
 * @returns False for an index.
 */
function maySizeAnArray(tokens: readonly Token[], open: number): boolean {
    const before = tokens[open - 2];
    const after = tokens[endOf(tokens, open + 1, "]") + 1];
    return (
        tokens[open - 1]?.kind !== "id" ||
        before?.text === "," ||
        (before?.kind === "id" && !["return", "else"].includes(before.text)) ||
        after?.kind === "id" ||
        after?.text === "("
    );
}

/**
 * The last token of the span of a function body that must be a constant expression, if one starts
 * at `i`: a `const` declaration, a `case` label or an array's size.
 * @param tokens - The tokens.
 * @param i - The index.
 * @returns The index, or -1 when none starts here.
 */
function constantSpanEnd(tokens: readonly Token[], i: number): number {
    const { text } = tokens[i];
    if (text === "const") {
        return endOf(tokens, i, ";");
    }

    if (text === "case") {
        return endOf(tokens, i, ":");
    }

    return text === "[" && maySizeAnArray(tokens, i) ? endOf(tokens, i + 1, "]") : -1;
}

/**
 * The calls of `isnan` and `isinf` that stay the built-in: all but those in a function body's
 * ordinary code. Everywhere else GLSL takes only a constant expression, which a helper cannot be
 * and which the WebGPU compiler folds, so such a call never reaches the translator. Its answer does
 * not depend on recognizing the arguments. `acosh` and its kin are not folded, so a helper loses
 * nothing there.
 * @param tokens - The body's tokens.
 * @returns The indexes of the called names.
 */
function constantCalls(tokens: readonly Token[]): Set<number> {
    const kept = new Set<number>();
    let depth = 0;
    let inFunction = false;
    let spanEnd = -1;
    tokens.forEach(({ text }, i) => {
        if (text === "{") {
            inFunction ||= depth === 0 && tokens[i - 1]?.text === ")";
            depth++;
        } else if (text === "}") {
            depth--;
            inFunction &&= depth > 0;
        }

        spanEnd = Math.max(spanEnd, inFunction ? constantSpanEnd(tokens, i) : -1);
        if ((text === "isnan" || text === "isinf") && tokens[i + 1]?.text === "(" && (!inFunction || i <= spanEnd)) {
            kept.add(i);
        }
    });
    return kept;
}

/**
 * A body with its own names prefixed `graphty_u_` and its references to the library renamed to
 * the library's prefixed names. A name WGSL will not take ({@link WGSL_NAMES}) is prefixed
 * wherever the body uses it, local, parameter and field alike, so the program also translates
 * to WGSL; a GLSL built-in function of such a name stays callable, so only its locals and
 * parameters are.
 * @param body - The body.
 * @param params - The shader's parameters, which are globals of the body.
 * @returns The renamed body.
 */
export function prefixBody(body: string, params: readonly ShaderParamDescriptor[]): string {
    const { tokens } = tokenize(body, { line: 1, column: 1 });
    const { rename, fields, calls } = wgslRenames(tokens);
    for (const name of namesOfLibrary()) {
        rename.set(name, LIBRARY_PREFIX + name);
        calls.delete(name);
    }

    for (const name of topLevelNames(tokens)) {
        rename.set(name, BODY_PREFIX + name);
        calls.delete(name);
    }

    for (const param of params) {
        rename.set(param.name, BODY_PREFIX + param.name);
        calls.delete(param.name);
    }

    return renameIdentifiers(body, rename, fields, calls, constantCalls(tokens));
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

/** The input field each clock is, where an input struct has it. */
const CLOCK_FIELDS: Readonly<Partial<Record<ShaderClock, string>>> = {
    "since.selected": "sinceSelected",
    "since.hovered": "sinceHovered",
    "since.pinned": "sincePinned",
    "since.matched": "sinceEntered",
    "since.unmatched": "sinceExited",
    "since.changed": "sinceChanged",
};

/** The input fields a node's input carries. */
export const NODE_CLOCK_FIELDS: ReadonlySet<string> = new Set(Object.values(CLOCK_FIELDS));

/** The input fields an edge's input carries. */
export const EDGE_CLOCK_FIELDS: ReadonlySet<string> = new Set(["sinceEntered", "sinceExited", "sinceChanged"]);

/**
 * The clock fields a drawing's input carries.
 * @param kind - The drawing.
 * @returns The fields.
 */
function clockFieldsOf(kind: ShaderDrawing): ReadonlySet<string> {
    if (kind.startsWith("node")) {
        return NODE_CLOCK_FIELDS;
    }

    return kind.startsWith("edge") ? EDGE_CLOCK_FIELDS : new Set<string>();
}

/**
 * A GLSL `vec3` of a `#rrggbb` color.
 * @param hex - The color.
 * @returns The literal.
 */
function colorLiteral(hex: string): string {
    const [r, g, b] = [1, 3, 5].map((at) => floatLiteral(Number.parseInt(hex.slice(at, at + 2), 16) / 255));
    return `vec3(${r}, ${g}, ${b})`;
}

/**
 * The statements that set each parameter whose default is bound to a clock from that clock, mapped
 * linearly from the binding's domain onto its range and clamped, unless a use set a value of its
 * own. A clock the input does not carry reads as at rest: -1 for a moment that ends something
 * (`since.unmatched`, `since.deselected`), long ago for the others.
 * @param params - The parameters.
 * @param fields - The clock fields the program's `graphty_in` carries, filled before these run.
 * @returns The GLSL statements.
 */
export function clockAssignments(params: readonly ShaderParamDescriptor[], fields: ReadonlySet<string>): string {
    return params
        .flatMap((param) => {
            const binding = param.default;
            if (!isClockBinding(binding)) {
                return [];
            }

            const field = CLOCK_FIELDS[binding.by];
            const unmade = /^since\.un|^since\.de/.test(binding.by) ? "-1.0" : "10000.0";
            const clock = field !== undefined && fields.has(field) ? `graphty_in.${field}` : unmade;
            const [d0, d1] = binding.domain;
            const k = `clamp((${clock} - ${floatLiteral(d0)}) / ${floatLiteral(Math.max(d1 - d0, 1e-6))}, 0.0, 1.0)`;
            const raw = `graphty_p_${param.name}`;
            const global = BODY_PREFIX + param.name;
            if (param.type === "color") {
                const [from, to] = (binding.range ?? ["#000000", "#ffffff"]).map(String);
                return [
                    `    if (${raw}.x < -1e29) { ${global} = mix(${colorLiteral(from)}, ${colorLiteral(to)}, ${k}); }`,
                ];
            }

            const [from, to] = (binding.range ?? [0, 1]).map(Number);
            return [`    if (${raw} < -1e29) { ${global} = mix(${floatLiteral(from)}, ${floatLiteral(to)}, ${k}); }`];
        })
        .join("\n");
}

/** What the sample program draws for a pixel whose result is not a number: the color beneath. */
const SAMPLE_FALLBACK: Readonly<Record<ShaderDrawing, string>> = {
    "node-paint": "graphty_in.color",
    "node-replace": "graphty_in.color",
    "node-square": "vec4(0.0)",
    "edge-paint": "graphty_in.color",
    "edge-along": "vec4(0.0)",
    background: "vec4(0.0, 0.0, 0.0, 1.0)",
    group: "vec4(0.0)",
};

/** A gray the sample's stand-in node and dots are drawn in, lit a little from the front. */
const SAMPLE_GRAY = "vec4(vec3(0.62) * (0.6 + 0.4 * graphty_z), 1.0)";

/** The sample's five group members, in the tile's 0..1 space. */
const GROUP_MEMBERS = ["0.33, 0.42", "0.5, 0.33", "0.67, 0.44", "0.41, 0.6", "0.6, 0.62"] as const;

/**
 * The statements of the sample `main` that fill the input for a drawing, framed the way its
 * thumbnail shows it (the test frame draws the same square):
 *
 * - a node look: one node filling 80% of the tile;
 * - a card: the card, filling the tile;
 * - a node effect: a small gray node, the frame reaching to the effect's reach (at least 1.5 radii);
 * - an edge: one curved edge between two gray dots;
 * - a group: the outline around five gray dots;
 * - a background: the whole tile.
 * @param kind - The drawing.
 * @returns The GLSL.
 */
function sampleInput(kind: ShaderDrawing): string {
    const time = "graphty_scene_time.x";
    switch (kind) {
        case "node-paint":
        case "node-replace":
        case "node-square": {
            let frame = "1.0";
            if (kind === "node-paint") {
                frame = "(1.0 / 0.8)";
            } else if (kind === "node-square") {
                frame = "max(graphty_sampleReach, 1.5)";
            }

            return `
    graphty_NodeInput graphty_in;
    float graphty_frame = ${frame};
    vec2 graphty_uv = (vUV * 2.0 - 1.0) * graphty_frame;
    float graphty_r2 = dot(graphty_uv, graphty_uv);
    ${kind === "node-paint" ? "if (graphty_r2 > 1.0) { gl_FragColor = vec4(0.0); return; }" : ""}
    float graphty_z = sqrt(max(1.0 - graphty_r2, 0.0));
    graphty_in.uv = graphty_uv;
    graphty_in.local = vec3(graphty_uv, -graphty_z);
    graphty_in.normal = vec3(graphty_uv, -graphty_z);
    graphty_in.viewDir = vec3(0.0, 0.0, 1.0);
    graphty_in.color = graphty_sampleColor;
    graphty_in.size = 1.0;
    graphty_in.pixelSize = graphty_sampleSize.x * 0.5 / graphty_frame;
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
        }
        case "edge-paint":
        case "edge-along":
            // A circular arc from (0.16, 0.42) to (0.84, 0.42) about (0.5, 0.1), bowed upward.
            return `
    graphty_EdgeInput graphty_in;
    vec2 graphty_d = vUV - vec2(0.5, 0.1);
    float graphty_radius = length(vec2(0.34, 0.32));
    float graphty_a0 = atan(0.32, -0.34);
    float graphty_a1 = atan(0.32, 0.34);
    float graphty_t = (graphty_a0 - atan(graphty_d.y, graphty_d.x)) / (graphty_a0 - graphty_a1);
    float graphty_half = 0.045 * max(graphty_sampleReach, 1.0);
    float graphty_side = (length(graphty_d) - graphty_radius) / graphty_half;
    bool graphty_onEdge = graphty_t >= 0.0 && graphty_t <= 1.0 && abs(graphty_side) <= 1.0;
    float graphty_z = 1.0;
    graphty_in.t = clamp(graphty_t, 0.0, 1.0);
    graphty_in.side = clamp(graphty_side, -1.0, 1.0);
    graphty_in.lengthPx = graphty_radius * (graphty_a0 - graphty_a1) * graphty_sampleSize.x;
    graphty_in.widthPx = 2.0 * graphty_half * graphty_sampleSize.x;
    graphty_in.sourceColor = graphty_sampleColor;
    graphty_in.targetColor = vec4(graphty_sampleColor.bgr, graphty_sampleColor.a);
    graphty_in.color = mix(graphty_in.sourceColor, graphty_in.targetColor, graphty_in.t);
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
        default: {
            const members = GROUP_MEMBERS.map((at, i) => `vec2 graphty_c${String(i)} = vec2(${at});`).join("\n    ");
            const kernels = GROUP_MEMBERS.map(
                (_, i) =>
                    `vec2 graphty_d${String(i)} = vUV - graphty_c${String(i)}; float graphty_k${String(i)} = exp(-dot(graphty_d${String(i)}, graphty_d${String(i)}) * 60.0);`,
            ).join("\n    ");
            const sum = GROUP_MEMBERS.map((_, i) => `graphty_k${String(i)}`).join(" + ");
            const gradient = GROUP_MEMBERS.map((_, i) => `graphty_d${String(i)} * graphty_k${String(i)}`).join(" + ");
            return `
    graphty_GroupInput graphty_in;
    ${members}
    ${kernels}
    float graphty_z = 1.0;
    graphty_in.uv = vUV;
    graphty_in.field = ${sum};
    graphty_in.fieldGradient = -120.0 * (${gradient});
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
}

/**
 * The statements after the shader ran that frame its result: the gray node over the middle of a
 * look around or behind it (under a look over it), the dots at an edge's ends, the group's
 * members over its outline.
 * @param kind - The drawing.
 * @param place - The shader's own place.
 * @returns The GLSL.
 */
function sampleFinish(kind: ShaderDrawing, place?: string): string {
    switch (kind) {
        case "node-square":
            // Over the node: the look over its gray disc, nothing outside it. Around or behind:
            // the gray node over the look's middle.
            return place === "over"
                ? `    graphty_out = graphty_r2 < 1.0 ? vec4(mix(${SAMPLE_GRAY}.rgb, graphty_out.rgb, clamp(graphty_out.a, 0.0, 1.0)), 1.0) : vec4(0.0);`
                : `    if (graphty_r2 < 1.0) { graphty_out = ${SAMPLE_GRAY}; }`;
        case "edge-paint":
        case "edge-along":
            return `    if (!graphty_onEdge) { graphty_out = vec4(0.0); }
    if (min(length(vUV - vec2(0.16, 0.42)), length(vUV - vec2(0.84, 0.42))) < 0.06) { graphty_out = ${SAMPLE_GRAY}; }`;
        case "group": {
            const near = GROUP_MEMBERS.slice(1).reduce(
                (a: string, _, i) => `min(${a}, length(graphty_d${String(i + 1)}))`,
                "length(graphty_d0)",
            );
            return `    if (${near} < 0.035) { graphty_out = ${SAMPLE_GRAY}; }`;
        }
        default:
            return "";
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
    // GLSL leaves a derivative in a branch undefined and draws; WGSL refuses the program. A body
    // always runs behind the wrapper's own branches, so without this its first `fwidth` is refused.
    return `#define DISABLE_UNIFORMITY_ANALYSIS
precision highp float;
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
    const assignments = params.map((param) => `    ${paramAssignment(param)}`).join("\n");
    return `    graphty_quality = graphty_scene_time.y;
    graphty_lightDir = graphty_scene_lightDir.xyz;
    graphty_lightColor = graphty_scene_lightColor.xyz;
    graphty_ambient = graphty_scene_ambient.xyz;
    graphty_canvasColor = graphty_scene_canvas.xyz;
${assignments}`;
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
export function sampleProgram(
    descriptor: Pick<ShaderDescriptor, "target" | "place" | "params">,
    body: string,
): WrappedProgram {
    const { params } = descriptor;
    const kind = drawingOf(descriptor);
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
${clockAssignments(params, clockFieldsOf(kind))}
    vec4 graphty_out = ${BODY_PREFIX}shade(graphty_in);
    if (graphty_bad(graphty_out)) {
        graphty_out = ${SAMPLE_FALLBACK[kind]};
    }
${sampleFinish(kind, descriptor.place)}

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
