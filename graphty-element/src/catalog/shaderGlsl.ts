/**
 * @file The static checks on a shader's GLSL body: a tokenizer, a statement walk, and the rules of
 * GLSL ES 1.00 Appendix A that bound how long a body can run (design/rendering/shader-styles.md
 * section 4.3).
 *
 * THE COST BOUND IS THE GATE. A body that runs too long trips the GPU watchdog and loses every
 * context in the browser, and on an iPad the tab with it. So every loop must have a constant trip
 * count of at most 128, nothing may recurse, and the product of trip counts along every path of
 * the call graph times the operations under them stays inside a budget per drawing. A body that
 * passes here can still fail to compile; that is the driver's to say, later.
 *
 * Positions are 1-based lines and columns in the text the body came from: `lineOffset` and
 * `columnOffset` say where the body starts, so a problem in a pasted shader points at its line in
 * the paste, header included.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderCost, ShaderDrawing, ShaderInput, ShaderProblem, ShaderProblemCode, ShaderTarget } from "./shaders";

/** The most text a body may hold, in bytes. */
export const SHADER_BODY_LIMIT = 16_384;

/** The most iterations one loop may run. */
export const SHADER_LOOP_LIMIT = 128;

/** The most elements an array may hold. */
export const SHADER_ARRAY_LIMIT = 256;

/** How deep brackets and expressions may nest. */
export const SHADER_NESTING_LIMIT = 64;

/**
 * The cost budget per drawing: operations per pixel, loops and calls multiplied out. A background
 * or a group outline covers the whole canvas once; a node or edge covers many small areas, so its
 * budget per pixel is the same.
 */
const COST_BUDGET: Readonly<Record<ShaderDrawing, number>> = {
    "node-paint": 400_000,
    "node-replace": 120_000,
    "node-square": 120_000,
    "edge-paint": 60_000,
    "edge-along": 60_000,
    background: 60_000,
    group: 60_000,
};

/**
 * The most iterations along any one path of loops, through calls: two 128-step loops nested
 * through a helper run 16,384 times per pixel whatever their bodies hold.
 */
export const SHADER_ITERATION_LIMIT = 4_096;

/** The most a compiler may unroll one function into: iterations times the tokens under them. */
const UNROLL_BUDGET = 65_536;

/** The cost class boundaries: at most this is light, at most the second is medium. */
const COST_CLASSES: readonly [number, number] = [2_500, 12_000];

/** What each built-in helper costs, in operations, as the cost bound counts it. */
const HELPER_COST: Readonly<Record<string, number>> = {
    hash11: 8,
    hash12: 10,
    hash13: 10,
    hash21: 10,
    hash22: 12,
    hash33: 14,
    noise: 60,
    fbm: 5 * 60,
    voronoi: 27 * 20,
    palette: 12,
    rainbow: 12,
    hsv2rgb: 14,
    oklabMix: 40,
    blackbody: 20,
    luminance: 4,
    sdCircle: 4,
    sdBox: 10,
    sdRoundBox: 12,
    sdSegment: 14,
    sdTriangle: 20,
    sdHexagon: 20,
    sdStar5: 30,
    iconSdf: 80,
    fillAA: 6,
    strokeAA: 8,
    Q: 2,
};

/** The built-in helpers every body may call (section 4.2). */
export const SHADER_HELPERS: readonly string[] = Object.freeze([
    ...Object.keys(HELPER_COST),
    "lightDir",
    "lightColor",
    "ambient",
    "canvasColor",
]);

/** The input struct of each target's entry function. */
const ENTRY_INPUT: Readonly<Record<ShaderTarget, string>> = {
    node: "NodeInput",
    edge: "EdgeInput",
    group: "GroupInput",
    background: "BackgroundInput",
};

/** The target of each entry input struct. */
const TARGET_OF_INPUT: Readonly<Record<string, ShaderTarget>> = {
    NodeInput: "node",
    EdgeInput: "edge",
    GroupInput: "group",
    BackgroundInput: "background",
};

/**
 * The target of the drawing.
 * @param drawing - The drawing.
 * @returns What it draws on.
 */
function targetOf(drawing: ShaderDrawing): ShaderTarget {
    return drawing === "background" || drawing === "group" ? drawing : (drawing.split("-")[0] as ShaderTarget);
}

/** The parameter name the documentation gives each input. */
const ENTRY_NAME: Readonly<Record<string, string>> = {
    NodeInput: "n",
    EdgeInput: "e",
    BackgroundInput: "b",
    GroupInput: "g",
};

/**
 * The input structs: names a parameter may not take. Their fields may: a field is read after `.`
 * (`n.color`), so a parameter named `color` never collides with it.
 */
export const SHADER_STRUCT_NAMES: readonly string[] = Object.freeze([
    "NodeInput",
    "EdgeInput",
    "BackgroundInput",
    "GroupInput",
]);

/**
 * The GLSL ES 3.00 keywords, reserved words and built-in functions a parameter may not be named,
 * since every parameter becomes a global name in the body.
 */
export const GLSL_RESERVED: ReadonlySet<string> = new Set(
    (
        "attribute const uniform varying layout centroid flat smooth break continue do for while switch case " +
        "default if else in out inout float int void bool true false invariant discard return mat2 mat3 mat4 " +
        "mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4 vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 " +
        "bvec3 bvec4 uint uvec2 uvec3 uvec4 lowp mediump highp precision sampler2D sampler3D samplerCube struct " +
        "asm class union enum typedef template this goto inline noinline volatile public static extern external " +
        "interface long short double half fixed unsigned superp input output hvec2 hvec3 hvec4 dvec2 dvec3 " +
        "dvec4 fvec2 fvec3 fvec4 sizeof cast namespace using buffer shared main " +
        "radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh pow exp log exp2 log2 " +
        "sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod min max clamp mix step " +
        "smoothstep isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat packSnorm2x16 " +
        "unpackSnorm2x16 packUnorm2x16 unpackUnorm2x16 packHalf2x16 unpackHalf2x16 length distance dot cross " +
        "normalize faceforward reflect refract matrixCompMult outerProduct transpose determinant inverse " +
        "lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not dFdx dFdy fwidth texture"
    ).split(" "),
);

/** Declarations the element writes itself, refused anywhere in a body. */
const FORBIDDEN_QUALIFIERS: ReadonlySet<string> = new Set([
    "uniform",
    "attribute",
    "varying",
    "layout",
    "precision",
    "buffer",
    "shared",
    "centroid",
    "invariant",
]);

/** Qualifiers refused on a global declaration, though a function parameter may carry them. */
const GLOBAL_ONLY_QUALIFIERS: ReadonlySet<string> = new Set(["in", "out", "inout"]);

/** The built-in names that sample a texture, and the sampler types. */
const TEXTURE_NAME =
    /^(?:texture(?:2D|3D|Cube|Lod|Proj|Grad|Offset|Size|Gather)*|texelFetch(?:Offset)?|[iu]?sampler[A-Z\d]\w*)$/;

/** Assignment operators: a token that writes the name before it. */
const ASSIGNMENTS: ReadonlySet<string> = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "|=", "^="]);

/** Multi-character punctuation, longest first. */
const PUNCTUATION = [
    "<<=",
    ">>=",
    "++",
    "--",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "|=",
    "^=",
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "^^",
    "<<",
    ">>",
];

/** Single-character punctuation. */
const SINGLE = new Set("+-*/%<>=!&|^~?:;,.()[]{}".split(""));

/** One token of a body. */
interface Token {
    readonly kind: "id" | "num" | "punct" | "hash" | "other";
    readonly text: string;
    readonly line: number;
    readonly column: number;
}

/** What the checker found. */
export interface BodyCheck {
    /** The problems, in the order the steps found them. Empty when the body passes. */
    readonly problems: readonly ShaderProblem[];
    /** The static cost bound of the entry function. */
    readonly cost: number;
    /** The cost class that bound falls in. */
    readonly costClass: ShaderCost;
}

/** Where a body starts in the text it came from. */
export interface BodyOrigin {
    /** The 1-based line of the body's first character. */
    readonly line: number;
    /** The 1-based column of the body's first character. */
    readonly column: number;
}

/** The origin of a text that starts at its own first character. */
const TEXT_START: BodyOrigin = { line: 1, column: 1 };

/**
 * Build a problem with a place.
 * @param code - The code.
 * @param at - Where.
 * @param at.line - The line.
 * @param at.column - The column.
 * @param params - Its other values.
 * @returns The problem.
 */
function problemAt(
    code: ShaderProblemCode,
    at: { readonly line: number; readonly column: number },
    params: Readonly<Record<string, string | number>> = {},
): ShaderProblem {
    return { code, params: { line: at.line, column: at.column, ...params } };
}

/**
 * The 1-based line and column of an offset in a text.
 * @param text - The text.
 * @param offset - The offset.
 * @param origin - Where the text starts.
 * @returns The place.
 */
export function placeOf(text: string, offset: number, origin: BodyOrigin = TEXT_START): BodyOrigin {
    let { line } = origin;
    let { column } = origin;
    for (let index = 0; index < offset && index < text.length; index++) {
        if (text[index] === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }
    }

    return { line, column };
}

/**
 * The first character a shader text may not hold: anything outside printable ASCII, tab, LF and
 * CRLF. A lone carriage return is refused: ANGLE ends a line (and a `//` comment) there and the
 * checker does not, so it would hide code from the checks.
 * @param text - The text.
 * @returns Its offset, or -1 when every character is allowed.
 */
export function firstNonAscii(text: string): number {
    for (let index = 0; index < text.length; index++) {
        // Any code point above 0x7e is refused at its first unit, so reading whole code points
        // finds the same offset as reading code units would.
        const code = text.codePointAt(index) ?? 0;
        const loneReturn = code === 0x0d && text.codePointAt(index + 1) !== 0x0a;
        if (loneReturn || code > 0x7e || (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d)) {
            return index;
        }
    }

    return -1;
}

// ---------------------------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------------------------

/** A tokenizer's cursor over one text. */
class Cursor {
    index = 0;
    line: number;
    column: number;

    /**
     * Start at the beginning of a text.
     * @param text - The text.
     * @param origin - Where it starts.
     */
    constructor(
        readonly text: string,
        origin: BodyOrigin,
    ) {
        this.line = origin.line;
        this.column = origin.column;
    }

    /**
     * Step over some characters, counting lines.
     * @param count - How many.
     */
    advance(count: number): void {
        for (let step = 0; step < count && this.index < this.text.length; step++) {
            if (this.text[this.index] === "\n") {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }

            this.index++;
        }
    }
}

/**
 * Skip whitespace and comments.
 * @param cursor - The cursor.
 * @returns A problem when a block comment never ends.
 */
function skipSpace(cursor: Cursor): ShaderProblem | null {
    const { text } = cursor;
    for (;;) {
        const char = text[cursor.index];
        if (char === " " || char === "\t" || char === "\n" || char === "\r") {
            cursor.advance(1);
        } else if (text.startsWith("//", cursor.index)) {
            const end = text.indexOf("\n", cursor.index);
            cursor.advance((end === -1 ? text.length : end) - cursor.index);
        } else if (text.startsWith("/*", cursor.index)) {
            const end = text.indexOf("*/", cursor.index + 2);
            if (end === -1) {
                return problemAt("shader.compile", cursor, {
                    message: "unterminated comment",
                    reason: "unexpected-token",
                });
            }

            cursor.advance(end + 2 - cursor.index);
        } else {
            return null;
        }
    }
}

/** A number literal, decimal or hex, with an optional suffix. */
const NUMBER = /^(?:0[xX][\da-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[uUfF]?/;

/** An identifier. */
const IDENTIFIER = /^[A-Za-z_]\w*/;

/**
 * Read the token at the cursor.
 * @param cursor - The cursor, moved past the token.
 * @returns The token.
 */
function readToken(cursor: Cursor): Token {
    const rest = cursor.text.slice(cursor.index, cursor.index + 64);
    const at = { line: cursor.line, column: cursor.column };
    const identifier = IDENTIFIER.exec(rest);
    const number = identifier === null ? NUMBER.exec(rest) : null;
    let token: Token;
    if (identifier !== null) {
        token = { kind: "id", text: identifier[0], ...at };
    } else if (number !== null) {
        token = { kind: "num", text: number[0], ...at };
    } else {
        const multi = PUNCTUATION.find((candidate) => rest.startsWith(candidate));
        const char = rest[0];
        if (multi !== undefined) {
            token = { kind: "punct", text: multi, ...at };
        } else if (SINGLE.has(char)) {
            token = { kind: "punct", text: char, ...at };
        } else {
            token = { kind: char === "#" || char === "\\" ? "hash" : "other", text: char, ...at };
        }
    }

    cursor.advance(token.text.length);

    return token;
}

/**
 * Split a body into tokens.
 * @param text - The body.
 * @param origin - Where it starts.
 * @returns The tokens, or the problem that stopped the tokenizer.
 */
export function tokenize(text: string, origin: BodyOrigin): { tokens: Token[]; problem: ShaderProblem | null } {
    const cursor = new Cursor(text, origin);
    const tokens: Token[] = [];
    for (;;) {
        const problem = skipSpace(cursor);
        if (problem !== null) {
            return { tokens, problem };
        }

        if (cursor.index >= text.length) {
            return { tokens, problem: null };
        }

        tokens.push(readToken(cursor));
    }
}

// ---------------------------------------------------------------------------------------------
// Constant expressions
// ---------------------------------------------------------------------------------------------

/**
 * Apply one of the four operators.
 * @param operator - The operator.
 * @param left - Its left side.
 * @param right - Its right side.
 * @returns The result.
 */
function applyOperator(operator: string | undefined, left: number, right: number): number {
    switch (operator) {
        case "*":
            return left * right;
        case "/":
            return left / right;
        case "+":
            return left + right;
        default:
            return left - right;
    }
}

/** How a bracket moves the nesting depth: 1 for an opening one, -1 for a closing one. */
const BRACKET_DEPTH: Readonly<Record<string, number>> = { "(": 1, "[": 1, "{": 1, ")": -1, "]": -1, "}": -1 };

/**
 * The value of a numeric literal or a known global constant.
 * @param token - The token.
 * @param constants - The global constants known so far.
 * @returns The value, or null when it is neither.
 */
function leafValue(token: Token, constants: ReadonlyMap<string, number>): number | null {
    if (token.kind === "num") {
        const value = Number(token.text.replace(/[uUfF]$/, ""));
        return Number.isFinite(value) ? value : null;
    }

    return token.kind === "id" ? (constants.get(token.text) ?? null) : null;
}

/** A recursive-descent reader of one constant expression. */
class ConstantReader {
    private at = 0;

    /**
     * Start a reader at the first token.
     * @param tokens - The expression's tokens.
     * @param constants - The global constants known so far.
     */
    constructor(
        private readonly tokens: readonly Token[],
        private readonly constants: ReadonlyMap<string, number>,
    ) {}

    /**
     * Read the whole expression.
     * @returns The value, or null when it is not constant or tokens are left over.
     */
    read(): number | null {
        const value = this.sum();

        return this.at === this.tokens.length && value !== null && Number.isFinite(value) ? value : null;
    }

    /**
     * The text of the next token.
     * @returns The text, or undefined at the end.
     */
    private peek(): string | undefined {
        return this.tokens[this.at]?.text;
    }

    /**
     * Read a primary: a parenthesized expression, a signed primary, a constructor call or a leaf.
     * @returns The value, or null when it is not constant.
     */
    private primary(): number | null {
        const token = this.tokens[this.at] as Token | undefined;
        if (token === undefined) {
            return null;
        }

        this.at++;
        if (token.text === "(") {
            const value = this.sum();
            return this.peek() === ")" ? (this.at++, value) : null;
        }

        if (token.text === "-" || token.text === "+") {
            return this.signed(token.text);
        }

        if ((token.text === "int" || token.text === "float") && this.peek() === "(") {
            return this.constructorCall(token.text);
        }

        return leafValue(token, this.constants);
    }

    /**
     * Read the primary after a unary sign.
     * @param sign - The sign.
     * @returns The value, or null when it is not constant.
     */
    private signed(sign: string): number | null {
        const value = this.primary();
        if (value === null) {
            return null;
        }

        return sign === "-" ? -value : value;
    }

    /**
     * Read the parenthesized argument of an `int` or `float` constructor.
     * @param type - The constructor.
     * @returns The value, or null when it is not constant.
     */
    private constructorCall(type: string): number | null {
        this.at++;
        const value = this.sum();
        if (this.peek() !== ")" || value === null) {
            return null;
        }

        this.at++;
        return type === "int" ? Math.trunc(value) : value;
    }

    /**
     * Read a run of primaries joined by `*` and `/`.
     * @returns The value, or null when it is not constant.
     */
    private product(): number | null {
        let value = this.primary();
        while (value !== null && (this.peek() === "*" || this.peek() === "/")) {
            const operator = this.peek();
            this.at++;
            const right = this.primary();
            value = right === null ? null : applyOperator(operator, value, right);
        }

        return value;
    }

    /**
     * Read a run of products joined by `+` and `-`.
     * @returns The value, or null when it is not constant.
     */
    private sum(): number | null {
        let value = this.product();
        while (value !== null && (this.peek() === "+" || this.peek() === "-")) {
            const operator = this.peek();
            this.at++;
            const right = this.product();
            value = right === null ? null : applyOperator(operator, value, right);
        }

        return value;
    }
}

/**
 * Evaluate a constant expression: literals, global constants, unary minus, the four operators,
 * parentheses and the `int` and `float` constructors.
 * @param tokens - The expression's tokens.
 * @param constants - The global constants known so far.
 * @returns The value, or null when it is not constant.
 */
export function evaluateConstant(tokens: readonly Token[], constants: ReadonlyMap<string, number>): number | null {
    return new ConstantReader(tokens, constants).read();
}

// ---------------------------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------------------------

/** One function a body defines. */
interface FunctionInfo {
    readonly name: string;
    readonly returnType: readonly Token[];
    readonly params: readonly Token[];
    readonly body: readonly Token[];
    readonly at: Token;
    /** Operations, loops multiplied out, without callees. */
    ownCost: number;
    /** The most iterations along one path of this function's own loops. */
    ownIterations: number;
    /** Each call to another function or a helper, with the loop multiplier around it. */
    readonly calls: { readonly name: string; readonly times: number; readonly at: Token }[];
}

/** What a walk over one body collects. */
class Walk {
    readonly problems: ShaderProblem[] = [];
    readonly constants = new Map<string, number>();
    readonly functions = new Map<string, FunctionInfo>();

    /**
     * Record a problem.
     * @param code - The code.
     * @param at - Where.
     * @param params - Its other values.
     */
    fail(code: ShaderProblemCode, at: Token, params: Readonly<Record<string, string | number>> = {}): void {
        this.problems.push(problemAt(code, at, params));
    }
}

/**
 * The index of the bracket that closes the one at `open`.
 * @param tokens - The tokens.
 * @param open - The opening bracket's index.
 * @returns The closing index, or the token count when it never closes.
 */
function matching(tokens: readonly Token[], open: number): number {
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
    const close = pairs[tokens[open].text];
    let depth = 0;
    for (let index = open; index < tokens.length; index++) {
        const { text } = tokens[index];
        if (text === tokens[open].text) {
            depth++;
        } else if (text === close) {
            depth--;
            if (depth === 0) {
                return index;
            }
        }
    }

    return tokens.length;
}

/**
 * The checks every token gets, wherever it is: preprocessor lines, names the element writes,
 * texture sampling, unbounded loops and the nesting limit.
 * @param tokens - Every token of the body.
 * @param walk - Where problems are recorded.
 */
function checkTokens(tokens: readonly Token[], walk: Walk): void {
    let depth = 0;
    for (const token of tokens) {
        if (token.kind === "hash") {
            walk.fail("shader.preprocessor", token);
        } else if (token.kind === "other") {
            walk.fail("shader.compile", token, { message: token.text, reason: "unexpected-token" });
        } else if (token.kind === "id") {
            checkName(token, walk);
        } else if (token.text === "(" || token.text === "[" || token.text === "{") {
            depth++;
            if (depth === SHADER_NESTING_LIMIT + 1) {
                walk.fail("shader.too-deep", token, { limit: SHADER_NESTING_LIMIT });
            }
        } else if (token.text === ")" || token.text === "]" || token.text === "}") {
            depth--;
        }
    }
}

/**
 * The checks one name gets.
 * @param token - The name.
 * @param walk - Where problems are recorded.
 */
function checkName(token: Token, walk: Walk): void {
    const name = token.text;
    if (
        FORBIDDEN_QUALIFIERS.has(name) ||
        name.startsWith("gl_") ||
        name.startsWith("graphty_") ||
        name.includes("__")
    ) {
        walk.fail("shader.reserved", token, { name });
    } else if (name === "while" || name === "do") {
        walk.fail("shader.loop-unbounded", token);
    } else if (TEXTURE_NAME.test(name)) {
        walk.fail("shader.texture-unsupported", token);
    }
}

/**
 * Split the top level into declarations and functions, recording each.
 * @param tokens - Every token of the body.
 * @param walk - Where they are recorded.
 */
function readTopLevel(tokens: readonly Token[], walk: Walk): void {
    let start = 0;
    let index = 0;
    while (index < tokens.length) {
        const token = tokens[index];
        if (token.text === "(" || token.text === "[") {
            index = matching(tokens, index) + 1;
        } else if (token.text === "{" && tokens[index - 1]?.text === ")") {
            const end = matching(tokens, index);
            readFunction(tokens.slice(start, end + 1), walk);
            index = end + 1;
            start = index;
        } else if (token.text === "{") {
            index = matching(tokens, index) + 1;
        } else if (token.text === ";") {
            readDeclaration(tokens.slice(start, index + 1), walk);
            index++;
            start = index;
        } else {
            index++;
        }
    }
}

/**
 * Record a global declaration: its constants, its arrays, and the qualifiers it may not carry.
 * @param tokens - The declaration, ending with its semicolon.
 * @param walk - Where it is recorded.
 */
function readDeclaration(tokens: readonly Token[], walk: Walk): void {
    for (const token of tokens) {
        if (GLOBAL_ONLY_QUALIFIERS.has(token.text)) {
            walk.fail("shader.reserved", token, { name: token.text });
        }
    }

    const open = tokens.findIndex((token) => token.text === "(");
    if (open > 0 && tokens[open - 1].kind === "id" && tokens[open - 2]?.kind === "id" && tokens[0].text !== "const") {
        // A prototype: the definition is what is walked.
        checkMain(tokens[open - 1], walk);
        return;
    }

    checkArrays(tokens, walk);

    if (tokens[0]?.text === "const") {
        readConstants(tokens.slice(1, -1), walk);
    }
}

/**
 * Record the scalar constants of one `const` declaration (`const int N = 8, M = N * 2;`).
 * @param tokens - The declaration without `const` and the semicolon.
 * @param walk - Where they are recorded.
 */
function readConstants(tokens: readonly Token[], walk: Walk): void {
    let index = 1;
    while (index < tokens.length) {
        const name = tokens[index];
        if (name.kind !== "id" || tokens[index + 1]?.text !== "=") {
            return;
        }

        let end = index + 2;
        let depth = 0;
        while (end < tokens.length && !(depth === 0 && tokens[end].text === ",")) {
            depth += BRACKET_DEPTH[tokens[end].text] ?? 0;
            end++;
        }

        const value = evaluateConstant(tokens.slice(index + 2, end), walk.constants);
        if (value !== null) {
            walk.constants.set(name.text, value);
        }

        index = end + 1;
    }
}

/**
 * Refuse an array longer than the limit: any `[N]` whose N is a constant over it.
 * @param tokens - Tokens that may declare arrays.
 * @param walk - Where problems are recorded.
 */
function checkArrays(tokens: readonly Token[], walk: Walk): void {
    for (let index = 0; index < tokens.length; index++) {
        if (tokens[index].text !== "[") {
            continue;
        }

        const close = matching(tokens, index);
        const size = evaluateConstant(tokens.slice(index + 1, close), walk.constants);
        if (size !== null && size > SHADER_ARRAY_LIMIT) {
            walk.fail("shader.too-deep", tokens[index], { limit: SHADER_ARRAY_LIMIT });
        }
    }
}

/**
 * Refuse a function named `main`, which the element writes.
 * @param name - The function's name.
 * @param walk - Where problems are recorded.
 */
function checkMain(name: Token, walk: Walk): void {
    if (name.text === "main") {
        walk.fail("shader.reserved", name, { name: "main" });
    }
}

/**
 * Record one function definition and walk its body.
 * @param tokens - The definition, from its return type to its closing brace.
 * @param walk - Where it is recorded.
 */
function readFunction(tokens: readonly Token[], walk: Walk): void {
    const open = tokens.findIndex((token) => token.text === "(");
    const close = matching(tokens, open);
    const name = tokens[open - 1] as Token | undefined;
    if (name?.kind !== "id") {
        walk.fail("shader.compile", tokens[0], { message: "function without a name", reason: "unexpected-token" });
        return;
    }

    checkMain(name, walk);
    for (const token of tokens.slice(0, open)) {
        if (GLOBAL_ONLY_QUALIFIERS.has(token.text)) {
            walk.fail("shader.reserved", token, { name: token.text });
        }
    }

    const info: FunctionInfo = {
        name: name.text,
        returnType: tokens.slice(0, open - 1),
        params: tokens.slice(open + 1, close),
        body: tokens.slice(close + 2, -1),
        at: name,
        ownCost: 0,
        ownIterations: 1,
        calls: [],
    };
    if (walk.functions.has(info.name)) {
        // An overload: walked and costed as one more function under the same name.
        const existing = walk.functions.get(info.name);
        walk.functions.set(`${info.name}#${String(walk.functions.size)}`, info);
        existing?.calls.push({ name: `${info.name}#${String(walk.functions.size - 1)}`, times: 1, at: name });
    } else {
        walk.functions.set(info.name, info);
    }

    walkStatements(info.body, 0, info.body.length, 1, info, walk);
}

/**
 * Walk the statements in a range.
 * @param tokens - The function's body.
 * @param start - The first token.
 * @param end - One past the last.
 * @param times - How many times this range runs per call: the loops around it multiplied.
 * @param info - The function.
 * @param walk - Where problems are recorded.
 */
function walkStatements(
    tokens: readonly Token[],
    start: number,
    end: number,
    times: number,
    info: FunctionInfo,
    walk: Walk,
): void {
    let index = start;
    while (index < end) {
        index = walkStatement(tokens, index, end, times, info, walk);
    }
}

/**
 * Walk one statement.
 * @param tokens - The function's body.
 * @param index - Where it starts.
 * @param end - One past the last token it may use.
 * @param times - How many times it runs per call.
 * @param info - The function.
 * @param walk - Where problems are recorded.
 * @returns Where the next statement starts.
 */
function walkStatement(
    tokens: readonly Token[],
    index: number,
    end: number,
    times: number,
    info: FunctionInfo,
    walk: Walk,
): number {
    const token = tokens[index];
    if (token.text === "{") {
        const close = Math.min(matching(tokens, index), end);
        walkStatements(tokens, index + 1, close, times, info, walk);
        return close + 1;
    }

    if (token.text === "for") {
        return walkFor(tokens, index, end, times, info, walk);
    }

    if (token.text === "if" && tokens[index + 1]?.text === "(") {
        const close = matching(tokens, index + 1);
        countOperations(tokens, index, close + 1, times, info);
        let next = walkStatement(tokens, close + 1, end, times, info, walk);
        if (tokens[next]?.text === "else") {
            next = walkStatement(tokens, next + 1, end, times, info, walk);
        }

        return next;
    }

    // A plain statement: everything up to its semicolon, brackets included.
    let last = index;
    while (last < end && tokens[last].text !== ";") {
        last = "([{".includes(tokens[last].text) ? matching(tokens, last) + 1 : last + 1;
    }

    checkArrays(tokens.slice(index, last), walk);
    countOperations(tokens, index, last, times, info);

    return last + 1;
}

/**
 * Count the operations of a range of tokens and the calls in it.
 * @param tokens - The function's body.
 * @param start - The first token.
 * @param end - One past the last.
 * @param times - How many times the range runs per call.
 * @param info - The function, whose cost and calls grow.
 */
function countOperations(
    tokens: readonly Token[],
    start: number,
    end: number,
    times: number,
    info: FunctionInfo,
): void {
    info.ownCost += (end - start) * times;
    for (let index = start; index < end; index++) {
        const token = tokens[index];
        if (token.kind === "id" && tokens[index + 1]?.text === "(" && tokens[index - 1]?.text !== ".") {
            info.calls.push({ name: token.text, times, at: token });
        }
    }
}

/** A loop header in the Appendix A form, read. */
interface LoopHeader {
    readonly index: string;
    readonly iterations: number;
}

/**
 * Walk a `for` loop: its header must be in the Appendix A form, its trip count at most the limit,
 * and its body must not write its index.
 * @param tokens - The function's body.
 * @param at - Where `for` is.
 * @param end - One past the last token the loop may use.
 * @param times - How many times the loop runs per call.
 * @param info - The function.
 * @param walk - Where problems are recorded.
 * @returns Where the next statement starts.
 */
function walkFor(
    tokens: readonly Token[],
    at: number,
    end: number,
    times: number,
    info: FunctionInfo,
    walk: Walk,
): number {
    const open = at + 1;
    if (tokens[open]?.text !== "(") {
        walk.fail("shader.loop-unbounded", tokens[at]);
        return end;
    }

    const close = matching(tokens, open);
    const header = readLoopHeader(tokens.slice(open + 1, close), walk.constants);
    const bodyEnd = statementEnd(tokens, close + 1, end);
    if (header === null) {
        walk.fail("shader.loop-unbounded", tokens[at]);
        return bodyEnd;
    }

    if (header.iterations > SHADER_LOOP_LIMIT) {
        walk.fail("shader.loop-too-long", tokens[at], { iterations: header.iterations, limit: SHADER_LOOP_LIMIT });
        return bodyEnd;
    }

    const write = indexWrite(tokens, close + 1, bodyEnd, header.index);
    if (write !== null) {
        walk.fail("shader.loop-unbounded", write);
        return bodyEnd;
    }

    countOperations(tokens, open, close + 1, times * (header.iterations + 1), info);
    const inner = times * Math.max(1, header.iterations);
    info.ownIterations = Math.max(info.ownIterations, inner);
    walkStatement(tokens, close + 1, end, inner, info, walk);

    return bodyEnd;
}

/**
 * Where the statement starting at an index ends.
 * @param tokens - The function's body.
 * @param index - Where it starts.
 * @param end - One past the last token it may use.
 * @returns One past its last token.
 */
function statementEnd(tokens: readonly Token[], index: number, end: number): number {
    const token = tokens[index] as Token | undefined;
    if (token === undefined) {
        return end;
    }

    if (token.text === "{") {
        return matching(tokens, index) + 1;
    }

    if ((token.text === "for" || token.text === "if") && tokens[index + 1]?.text === "(") {
        let next = statementEnd(tokens, matching(tokens, index + 1) + 1, end);
        if (token.text === "if" && tokens[next]?.text === "else") {
            next = statementEnd(tokens, next + 1, end);
        }

        return next;
    }

    let last = index;
    while (last < end && tokens[last].text !== ";") {
        last = "([{".includes(tokens[last].text) ? matching(tokens, last) + 1 : last + 1;
    }

    return last + 1;
}

/**
 * The first token in a range that writes a loop's index.
 * @param tokens - The function's body.
 * @param start - The first token.
 * @param end - One past the last.
 * @param name - The index.
 * @returns The writing token, or null when nothing writes it.
 */
function indexWrite(tokens: readonly Token[], start: number, end: number, name: string): Token | null {
    for (let index = start; index < end; index++) {
        const token = tokens[index];
        if (token.text !== name || tokens[index - 1]?.text === ".") {
            continue;
        }

        const after = tokens[index + 1]?.text ?? "";
        const before = tokens[index - 1]?.text ?? "";
        if (ASSIGNMENTS.has(after) || after === "++" || after === "--" || before === "++" || before === "--") {
            return token;
        }
    }

    return null;
}

/**
 * Read a loop header in the Appendix A form: `type i = const; i op const; i++ (or --, += c, -= c)`.
 * @param tokens - The header between its parentheses.
 * @param constants - The global constants.
 * @returns The index and the exact trip count, or null when the header is not in the form or the
 *   loop never ends.
 */
function readLoopHeader(tokens: readonly Token[], constants: ReadonlyMap<string, number>): LoopHeader | null {
    const parts: Token[][] = [[]];
    for (const token of tokens) {
        if (token.text === ";") {
            parts.push([]);
        } else {
            parts.at(-1)?.push(token);
        }
    }

    if (parts.length !== 3) {
        return null;
    }

    const [init, test, step] = parts;
    if ((init[0]?.text !== "int" && init[0]?.text !== "float") || init[1]?.kind !== "id" || init[2]?.text !== "=") {
        return null;
    }

    const index = init[1].text;
    const from = evaluateConstant(init.slice(3), constants);
    const to = test[0]?.text === index ? evaluateConstant(test.slice(2), constants) : null;
    const by = stepOf(step, index, constants);
    const relation = test[1]?.text;
    if (from === null || to === null || by === null || relation === undefined) {
        return null;
    }

    const iterations = tripCount(from, to, by, relation);

    return iterations === null ? null : { index, iterations };
}

/**
 * How much a loop's step moves its index.
 * @param tokens - The step expression.
 * @param index - The loop's index.
 * @param constants - The global constants.
 * @returns The amount, or null when the step is not in the form.
 */
function stepOf(tokens: readonly Token[], index: string, constants: ReadonlyMap<string, number>): number | null {
    const texts = tokens.map((token) => token.text);
    if (texts.length === 2 && texts.includes(index) && (texts.includes("++") || texts.includes("--"))) {
        return texts.includes("++") ? 1 : -1;
    }

    if (texts[0] === index && (texts[1] === "+=" || texts[1] === "-=")) {
        const amount = evaluateConstant(tokens.slice(2), constants);
        if (amount === null) {
            return null;
        }

        return texts[1] === "+=" ? amount : -amount;
    }

    return null;
}

/**
 * The exact number of times a loop tested with `<`, `<=`, `>` or `>=` runs.
 * @param span - The tested value less the index's first value.
 * @param by - How much each step moves the index.
 * @param relation - The test.
 * @param upward - Whether the test is `<` or `<=`.
 * @returns The trip count, or null when the loop never ends.
 */
function orderedTripCount(span: number, by: number, relation: string, upward: boolean): number | null {
    const inclusive = relation === "<=" || relation === ">=";
    const ahead = upward ? span : -span;
    if (ahead < 0 || (ahead === 0 && !inclusive)) {
        return 0;
    }

    if ((upward && by <= 0) || (!upward && by >= 0)) {
        return null;
    }

    const steps = ahead / Math.abs(by);

    return inclusive ? Math.floor(steps) + 1 : Math.ceil(steps);
}

/**
 * The exact number of times a loop runs.
 * @param from - The index's first value.
 * @param to - The value it is tested against.
 * @param by - How much each step moves it.
 * @param relation - The test.
 * @returns The trip count, or null when the loop never ends.
 */
export function tripCount(from: number, to: number, by: number, relation: string): number | null {
    const span = to - from;
    const upward = relation === "<" || relation === "<=";
    if (upward || relation === ">" || relation === ">=") {
        return orderedTripCount(span, by, relation, upward);
    }

    if (relation !== "!=") {
        return null;
    }

    const steps = span / by;
    if (span === 0) {
        return 0;
    }

    return Number.isInteger(steps) && steps > 0 ? steps : null;
}

// ---------------------------------------------------------------------------------------------
// The cost bound
// ---------------------------------------------------------------------------------------------

/** A function's bound, callees included. */
interface FunctionCost {
    /** Operations per call. */
    readonly cost: number;
    /** The most iterations along one path of loops, through calls. */
    readonly iterations: number;
}

/**
 * The cost of every function, callees included, refusing recursion.
 * @param walk - The walk, holding the functions.
 * @returns The cost of each function by name.
 */
function costs(walk: Walk): Map<string, FunctionCost> {
    const done = new Map<string, FunctionCost>();
    const visiting = new Set<string>();

    const costOf = (name: string): FunctionCost => {
        const known = done.get(name);
        if (known !== undefined) {
            return known;
        }

        const info = walk.functions.get(name);
        if (info === undefined) {
            return { cost: HELPER_COST[name] ?? 1, iterations: 1 };
        }

        if (visiting.has(name)) {
            walk.fail("shader.loop-unbounded", info.at, { reason: "recursion" });
            return { cost: 0, iterations: 1 };
        }

        visiting.add(name);
        let cost = info.ownCost;
        let iterations = info.ownIterations;
        for (const call of info.calls) {
            const callee = costOf(call.name);
            cost += call.times * callee.cost;
            iterations = Math.max(iterations, call.times * callee.iterations);
        }

        visiting.delete(name);
        const total = { cost, iterations };
        done.set(name, total);

        return total;
    };

    for (const name of walk.functions.keys()) {
        costOf(name);
    }

    return done;
}

/**
 * The cost class a bound falls in.
 * @param cost - The bound.
 * @returns Its class.
 */
export function costClassOf(cost: number): ShaderCost {
    if (cost <= COST_CLASSES[0]) {
        return "light";
    }

    return cost <= COST_CLASSES[1] ? "medium" : "heavy";
}

/**
 * Check the entry function's signature.
 * @param drawing - The shader's drawing, whose target decides the entry's input.
 * @param walk - The walk.
 * @param origin - Where the body starts, for a missing entry.
 */
function checkEntry(drawing: ShaderDrawing, walk: Walk, origin: BodyOrigin): void {
    const target = targetOf(drawing);
    const input = ENTRY_INPUT[target];
    const expected = `vec4 shade(${input} ${ENTRY_NAME[input]})`;
    const entry = walk.functions.get("shade");
    if (entry === undefined) {
        walk.problems.push(problemAt("shader.entry-missing", origin, { target, expected }));
        return;
    }

    const params = entry.params.map((token) => token.text).filter((text) => text !== "in");
    const signed =
        entry.returnType.length === 1 &&
        entry.returnType[0].text === "vec4" &&
        params.length === 2 &&
        params[0] === input &&
        entry.params.at(-1)?.kind === "id";
    if (!signed) {
        walk.fail("shader.entry-signature", entry.at, { target, expected });
    }
}

/**
 * Check a body against every static rule, in order, stopping after the first step with problems.
 * @param body - The GLSL body.
 * @param drawing - The shader's drawing, which decides the entry function and the budget.
 * @param origin - Where the body starts in the text it came from.
 * @returns The problems, and the cost bound and class when there are none.
 */
export function checkShaderBody(body: string, drawing: ShaderDrawing, origin: BodyOrigin = TEXT_START): BodyCheck {
    const failed = (problems: readonly ShaderProblem[]): BodyCheck => ({ problems, cost: 0, costClass: "heavy" });
    const bytes = body.length;
    if (bytes > SHADER_BODY_LIMIT) {
        return failed([
            problemAt("shader.too-large", placeOf(body, SHADER_BODY_LIMIT, origin), {
                bytes,
                limit: SHADER_BODY_LIMIT,
            }),
        ]);
    }

    const ascii = firstNonAscii(body);
    if (ascii !== -1) {
        return failed([problemAt("shader.not-ascii", placeOf(body, ascii, origin))]);
    }

    // A backslash is a line continuation to the driver, even at the end of a `//` comment, where it
    // pulls the next line into the comment and hides it from the checker. GLSL has no other use for one.
    const backslash = body.indexOf("\\");
    if (backslash !== -1) {
        return failed([problemAt("shader.preprocessor", placeOf(body, backslash, origin))]);
    }

    const { tokens, problem } = tokenize(body, origin);
    if (problem !== null) {
        return failed([problem]);
    }

    const walk = new Walk();
    checkTokens(tokens, walk);
    if (walk.problems.length > 0) {
        return failed(walk.problems);
    }

    readTopLevel(tokens, walk);
    if (walk.problems.length > 0) {
        return failed(walk.problems);
    }

    checkEntry(drawing, walk, origin);
    if (walk.problems.length > 0) {
        return failed(walk.problems);
    }

    return costCheck(drawing, walk);
}

/**
 * The last step: the cost bound and the unrolled size.
 * @param drawing - The shader's drawing.
 * @param walk - The walk.
 * @returns The verdict.
 */
function costCheck(drawing: ShaderDrawing, walk: Walk): BodyCheck {
    const all = costs(walk);
    const entry = walk.functions.get("shade");
    if (walk.problems.length > 0 || entry === undefined) {
        return { problems: walk.problems, cost: 0, costClass: "heavy" };
    }

    for (const info of walk.functions.values()) {
        if (info.ownCost > UNROLL_BUDGET) {
            walk.fail("shader.too-costly", info.at, { cost: info.ownCost, limit: UNROLL_BUDGET });
        }
    }

    const { cost, iterations } = all.get("shade") ?? { cost: 0, iterations: 1 };
    const limit = COST_BUDGET[drawing];
    if (iterations > SHADER_ITERATION_LIMIT) {
        walk.fail("shader.too-costly", entry.at, { iterations, limit: SHADER_ITERATION_LIMIT });
    } else if (cost > limit) {
        walk.fail("shader.too-costly", entry.at, { cost, limit });
    }

    return { problems: walk.problems, cost, costClass: costClassOf(cost) };
}

/** The struct fields that say what a body reads, by input. */
const READ_FIELDS: readonly [RegExp, ShaderInput][] = [
    [/\.(?:color|sourceColor|targetColor)\b/, "color"],
    [/\.(?:color|sourceColor|targetColor)\.[aw]\b|\.(?:color|sourceColor|targetColor)\b(?!\s*\.)/, "opacity"],
    [/\.(?:size|pixelSize)\b/, "size"],
    [/\.local\b/, "shape"],
    [/\.widthPx\b/, "width"],
    [/\.(?:selected|sourceSelected|targetSelected)\b/, "selected"],
    [/\.hovered\b/, "hovered"],
    [/\.pinned\b/, "pinned"],
    [
        /\.since(?:Entered|Exited|Matched|Unmatched|Added|Changed|Selected|Deselected|Hovered|Unhovered|Pinned|Unpinned)\b/,
        "times",
    ],
    [/\.(?:field|fieldGradient|group|groupTint)\b/, "members"],
    [/(?<![.\w])lightDir\b/, "light"],
];

/**
 * A GLSL text with its `//` and closed `/* ... *\/` comments taken out, in one pass: a regular
 * expression with a lazy block-comment match takes time quadratic in the text on many unclosed
 * `/*`, and a shader body is a consumer's text.
 * @param text - The GLSL text.
 * @returns The text without its comments; an unclosed `/*` stays as it is.
 */
function withoutComments(text: string): string {
    const kept: string[] = [];
    let at = 0;
    let closes = true;
    let slash = text.indexOf("/");
    while (slash !== -1 && slash < text.length - 1) {
        const [keep, next, stillCloses] = commentAt(text, slash, closes);
        kept.push(text.slice(at, keep));
        at = next;
        closes = stillCloses;
        slash = text.indexOf("/", next);
    }

    return kept.join("") + text.slice(at);
}

/**
 * The comment that starts at a slash, if one does.
 * @param text - The GLSL text.
 * @param slash - Where the slash is; a character follows it.
 * @param closes - Whether a `*\/` can still follow: once one did not, none further on does.
 * @returns Where the text before it ends, where the text after it starts, and `closes` again.
 */
function commentAt(text: string, slash: number, closes: boolean): [number, number, boolean] {
    if (text[slash + 1] === "/") {
        const end = text.indexOf("\n", slash);
        return [slash, end === -1 ? text.length : end, closes];
    }

    if (text[slash + 1] !== "*" || !closes) {
        return [slash + 1, slash + 1, closes];
    }

    const end = text.indexOf("*/", slash + 2);
    return end === -1 ? [slash + 1, slash + 1, false] : [slash, end + 2, true];
}

/**
 * What a body reads from the layers beneath and from element state, from the fields it names.
 * @param body - The GLSL body.
 * @returns The inputs, in the order {@link ShaderInput} lists them.
 */
export function inferShaderReads(body: string): readonly ShaderInput[] {
    const code = withoutComments(body);

    return READ_FIELDS.filter(([pattern]) => pattern.test(code)).map(([, input]) => input);
}

/**
 * Whether a body animates on its own: it reads its input's `time` field (`n.time`, `e.time`,
 * `g.time`, `b.time`). A parameter or a local named `time` is never a field access, so it never
 * counts.
 * @param body - The GLSL body.
 * @returns True when it does.
 */
export function readsShaderTime(body: string): boolean {
    return /\.\s*time\b/.test(withoutComments(body));
}

/**
 * The target a body's entry function names, from its input struct.
 * @param body - The GLSL body.
 * @returns The target, or undefined when no `vec4 shade(<Input> ...)` names a known input.
 */
export function entryTargetOf(body: string): ShaderTarget | undefined {
    const entry = /\bvec4\s+shade\s*\(\s*(?:in\s+)?(\w+)/.exec(withoutComments(body));

    return entry === null || !Object.hasOwn(TARGET_OF_INPUT, entry[1]) ? undefined : TARGET_OF_INPUT[entry[1]];
}
