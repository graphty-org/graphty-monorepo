/**
 * @file What a selector becomes: the one closure a repaint calls per element, and the small
 * expression language behind the only selector kind that needs an evaluator.
 *
 * A PREDICATE IS A CLOSURE OVER DENSE INDICES. It is built once, when a layer is added or
 * updated, and from then on a repaint calls it and nothing else. No string is parsed, no object
 * is allocated and no expression tree is walked while the repaint is running. That is the whole
 * reason this file exists: the element's previous selector path called `jmespath.search()` once
 * per element, which re-parses the expression on every call, and at 50,000 nodes that is 50 ms
 * of parsing for one layer against a 16 ms budget for a whole single-layer edit.
 *
 * NULL MEANS NO TEST AT ALL. {@link CompiledSelector.test} is null for `{match:"everything"}`
 * rather than a function that always answers true, so the repaint skips the call instead of
 * paying for one whose answer is known. This is the same convention `CompiledVisibility` uses
 * for a filter half that constrains nothing.
 *
 * WHY THE ELEMENT COMPILES ITS OWN EXPRESSIONS. The expression kind speaks JMESPath, but it
 * speaks a declared SUBSET of it, parsed here. Three measured facts drove that:
 *
 * - `jmespath@0.16.0` exports `compile()`, but it exposes no evaluator for the tree that comes
 *   back, so a parsed expression cannot be run. `search()` is the only door and it re-parses
 *   every call: 1,322 ns per call measured, against 7.8 ns for the closure this file builds.
 * - Its parser reports no error position and accepts input that is not JMESPath at all --
 *   `data.` and `data..a` both compile -- while `data.a === 1` fails with an internal
 *   `TypeError` rather than a parse error. A selector typed into a form has to be refused at
 *   the character that is wrong, which that parser cannot say.
 * - A path is not walked here, it is READ: `results.louvain.group` is one column lookup, not
 *   three object dereferences, because the session stores values in columns addressed by path.
 *   An off-the-shelf evaluator would need the whole root materialised per element, which is an
 *   object allocation per element per layer.
 *
 * THE SUBSET IS REFUSED AT ITS EDGE, NEVER NARROWED IN SILENCE. Everything JMESPath can express
 * that this file does not implement -- projections, slices, functions, pipes, multi-selects,
 * wildcards, the current-node reference -- is rejected where it was typed, by name, with the
 * offset. A selector that is accepted means exactly what JMESPath means by it. A wrong picture
 * is worse than a refusal, so there is no branch that guesses.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, NodeId, Path, Query } from "../../catalog/types";
import { GraphtyError } from "../../errors";

// ---------------------------------------------------------------------------------------------
// What a predicate reads
// ---------------------------------------------------------------------------------------------

/** Which kind of element a selector and its predicate speak about. */
export type SelectorTarget = "node" | "edge";

/**
 * Everything a compiled selector needs from the rest of the session.
 *
 * The two `value` readers are required, because every selector kind but `everything` and `ids`
 * is a question about a value. The rest are optional, and each absence is a REFUSAL rather than
 * a quiet widening, for the reason the visibility filter gives: a layer that silently dropped
 * the half of itself this session cannot evaluate would paint a confident picture of the wrong
 * elements.
 */
export interface SelectorSource {
    /**
     * The value one node carries for a path.
     * @param index - The dense node index.
     * @param path - The column path, such as `results.louvain.group`.
     * @returns The value, or undefined when the node carries none.
     */
    readonly nodeValue: (index: number, path: Path) => unknown;
    /**
     * The value one edge carries for a path.
     * @param index - The dense (logical) edge index.
     * @param path - The column path.
     * @returns The value, or undefined when the edge carries none.
     */
    readonly edgeValue: (index: number, path: Path) => unknown;
    /**
     * Whether one node carries a value for a path.
     *
     * Optional, and worth supplying: this is the test `{match:"has"}` compiles to and the test
     * `<path> != \`null\`` is recognised as, so a store holding a presence bitmap answers it
     * without materialising the value. Absent, it is derived from {@link nodeValue}.
     *
     * PRESENT MEANS A VALUE THAT IS NEITHER ABSENT NOR NULL. An override that answers anything
     * else disagrees with the expression form of the same question, and the two would paint
     * different sets.
     * @param index - The dense node index.
     * @param path - The column path.
     * @returns True when the node carries a value that is neither undefined nor null.
     */
    readonly nodeHas?: (index: number, path: Path) => boolean;
    /**
     * Whether one edge carries a value for a path. See {@link nodeHas} for the contract.
     * @param index - The dense (logical) edge index.
     * @param path - The column path.
     * @returns True when the edge carries a value that is neither undefined nor null.
     */
    readonly edgeHas?: (index: number, path: Path) => boolean;
    /**
     * The id of the node at a dense index.
     *
     * Read per element rather than resolved to indices once, so that a predicate stays correct
     * across a freeze that remaps the index space. A compiled set of indices would go on
     * answering after a removal and paint the elements that moved into those rows, which is the
     * silent wrong picture this whole file exists to prevent. Absent, an `ids` selector on a
     * node layer is refused.
     * @param index - The dense node index, already bounded by the caller.
     * @returns The id at that row.
     */
    readonly nodeIdOf?: (index: number) => NodeId;
    /**
     * The id of the edge at a dense index. See {@link nodeIdOf} for why it is read per element.
     * @param index - The dense (logical) edge index, already bounded by the caller.
     * @returns The id at that row.
     */
    readonly edgeIdOf?: (index: number) => EdgeId;
}

/**
 * One target's half of a {@link SelectorSource}, resolved once so the predicate never chooses.
 *
 * Picking the node or the edge reader per element would put a branch in the hot loop for a
 * question that was settled when the layer was added.
 */
export interface ElementColumns {
    /**
     * The value one element carries for a path.
     * @param index - The element's dense index.
     * @param path - The column path.
     * @returns The value, or undefined when the element carries none.
     */
    readonly value: (index: number, path: Path) => unknown;
    /**
     * Whether one element carries a value for a path.
     * @param index - The element's dense index.
     * @param path - The column path.
     * @returns True when the element carries a value that is neither undefined nor null.
     */
    readonly has: (index: number, path: Path) => boolean;
    /**
     * The id at a dense index, or null when this session cannot answer that question.
     * @param index - The element's dense index.
     * @returns The id at that row.
     */
    readonly idOf: ((index: number) => NodeId | EdgeId) | null;
}

/**
 * The half of a source one target uses.
 * @param source - What the session can answer.
 * @param target - Which kind of element the layer paints.
 * @returns The readers for that kind, with `has` derived when the source supplied none.
 */
export function columnsFor(source: SelectorSource, target: SelectorTarget): ElementColumns {
    const isNode = target === "node";
    const value = isNode ? source.nodeValue : source.edgeValue;
    const suppliedHas = isNode ? source.nodeHas : source.edgeHas;
    const suppliedIdOf = isNode ? source.nodeIdOf : source.edgeIdOf;

    return {
        value,
        has: suppliedHas ?? ((index, path): boolean => isPresent(value(index, path))),
        idOf: suppliedIdOf ?? null,
    };
}

// ---------------------------------------------------------------------------------------------
// What a selector becomes
// ---------------------------------------------------------------------------------------------

/**
 * Whether one element, named by its dense index, is painted by a layer.
 *
 * Call it, and nothing else, during a repaint.
 */
export type ElementPredicate = (index: number) => boolean;

/** A selector, reduced to the test a repaint runs and the columns that test reads. */
export interface CompiledSelector {
    /** Which selector kind this was compiled from. */
    readonly match: "everything" | "expression" | "has" | "ids";
    /** Which kind of element it speaks about. */
    readonly target: SelectorTarget;
    /**
     * The test, or null when the selector tests nothing at all.
     *
     * Null is `{match:"everything"}`, and a repaint reads it as "every element, no call". A
     * function that always returned true would cost one call per element for an answer that was
     * known when the layer was added.
     */
    readonly test: ElementPredicate | null;
    /**
     * Every column path the test reads, in the order the selector names them, without repeats.
     *
     * This is what the caller resolves against the run list and the attribute catalogue. A
     * selector that parses perfectly and names a run or an attribute nothing answers matches
     * NOTHING, silently, and an empty screen reads exactly like a correct answer of zero. The
     * compiler cannot tell the difference -- it has no catalogue -- so it reports what was asked
     * for and leaves the reference check to whoever holds one.
     */
    readonly paths: readonly Path[];
}

// ---------------------------------------------------------------------------------------------
// JMESPath value semantics
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value counts as present.
 *
 * A column answers undefined for an element it has no value for; JMESPath answers null for a
 * field that is not there. They are the same fact, so both are absent here and every read is
 * normalised to null before anything compares it.
 * @param value - The value a column answered.
 * @returns True when it is neither undefined nor null.
 */
function isPresent(value: unknown): boolean {
    return value !== undefined && value !== null;
}

/**
 * JMESPath truthiness, which is not JavaScript truthiness.
 *
 * False in JMESPath is exactly: false, null, an empty string, an empty list and an empty object.
 * ZERO IS TRUE. A selector reading `data.count` matches an element whose count is 0, because a
 * measured zero is a measurement; treating it as false is how a betweenness layer silently drops
 * every node the metric scored at zero, which on a real graph is most of them.
 * @param value - The value to weigh.
 * @returns Whether JMESPath considers it true.
 */
function isTruthy(value: unknown): boolean {
    if (value === undefined || value === null || value === false || value === "") {
        return false;
    }

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    if (typeof value === "object") {
        return Object.keys(value).length > 0;
    }

    return true;
}

/**
 * JMESPath equality: deep, and structural for lists and objects.
 * @param left - One value.
 * @param right - The other.
 * @returns Whether JMESPath considers them equal.
 */
function deepEquals(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        return left.length === right.length && left.every((member, at) => deepEquals(member, right[at]));
    }

    if (isPlainObject(left) && isPlainObject(right)) {
        const keys = Object.keys(left);

        return keys.length === Object.keys(right).length && keys.every((key) => deepEquals(left[key], right[key]));
    }

    return false;
}

/**
 * Whether a value is an object with own string keys, as opposed to null or a list.
 * @param value - The value to test.
 * @returns True when it can be compared key by key.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal an expression that is not in the subset gets.
 *
 * Every one of these names the construct and the offset, because the person who reads it typed
 * the expression into a field and has to be told which character to change.
 * @param message - What is wrong, in a sentence.
 * @param where - The whole expression, so the message can be shown beside it.
 * @param position - The character offset the problem starts at.
 * @param details - Anything else worth carrying, such as the construct's name.
 * @returns The error to throw.
 */
function badSelector(
    message: string,
    where: Query,
    position: number,
    details: Readonly<Record<string, unknown>> = {},
): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_SELECTOR",
        message: `${message} (at character ${String(position)} of ${JSON.stringify(where)})`,
        source: "style",
        details: { ...details, position, where },
    });
}

/**
 * The JMESPath constructs this subset does not implement, keyed by the character that opens one.
 *
 * Spelled out rather than lumped into one "unsupported syntax" message, because "selectors do
 * not support projections" tells a person what to write instead and "unexpected token [" does
 * not.
 */
const UNSUPPORTED_BY_CHARACTER: Readonly<Record<string, string>> = Object.freeze({
    "[": "index, slice, wildcard and filter expressions",
    "]": "index, slice, wildcard and filter expressions",
    "{": "multi-select hashes",
    "}": "multi-select hashes",
    ",": "multi-select lists",
    "*": "wildcards",
    "@": "the current-node reference",
    ":": "slices",
});

// ---------------------------------------------------------------------------------------------
// The expression subset: tokens
// ---------------------------------------------------------------------------------------------

/** What a token is. */
type TokenKind = "identifier" | "literal" | "operator" | "end";

/** One lexed piece of an expression. */
interface Token {
    /** What kind of piece it is. */
    readonly kind: TokenKind;
    /** The operator text, or the identifier's decoded name. Empty for a literal and for the end. */
    readonly text: string;
    /** A literal's decoded value. Undefined for every other kind. */
    readonly value?: unknown;
    /** Where the token starts in the expression. */
    readonly at: number;
}

/** The operators the subset reads, longest first so `<=` is never lexed as `<` then `=`. */
const OPERATORS = ["&&", "||", "==", "!=", "<=", ">=", "!", "<", ">", ".", "(", ")"] as const;

/**
 * Whether a character can start an unquoted identifier.
 * @param character - The character to test.
 * @returns True for a letter or an underscore.
 */
function startsIdentifier(character: string): boolean {
    return /[A-Za-z_]/.test(character);
}

/**
 * Whether a character can continue an unquoted identifier.
 * @param character - The character to test.
 * @returns True for a letter, a digit or an underscore.
 */
function continuesIdentifier(character: string): boolean {
    return /[A-Za-z0-9_]/.test(character);
}

/**
 * Find the end of a delimited run, honouring backslash escapes.
 * @param where - The expression being lexed.
 * @param from - The index of the opening delimiter.
 * @param delimiter - The character that closes the run.
 * @returns The index of the closing delimiter.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the run is never closed.
 */
function findClose(where: Query, from: number, delimiter: string): number {
    for (let at = from + 1; at < where.length; at++) {
        if (where[at] === "\\") {
            at++;
            continue;
        }

        if (where[at] === delimiter) {
            return at;
        }
    }

    throw badSelector(`A ${delimiter} is opened and never closed`, where, from, { delimiter });
}

/**
 * Decode a raw string literal, where only \' and \\ are escapes.
 * @param body - The characters between the quotes.
 * @returns The string the literal denotes.
 */
function decodeRawString(body: string): string {
    let decoded = "";

    for (let at = 0; at < body.length; at++) {
        if (body[at] === "\\" && (body[at + 1] === "'" || body[at + 1] === "\\")) {
            decoded += body[at + 1];
            at++;
            continue;
        }

        decoded += body[at];
    }

    return decoded;
}

/**
 * Decode a backtick literal, whose body is JSON with the backtick itself escaped.
 * @param where - The expression being lexed, for the refusal.
 * @param at - The index of the opening backtick.
 * @param body - The characters between the backticks.
 * @returns The value the literal denotes.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the body is not JSON.
 */
function decodeJsonLiteral(where: Query, at: number, body: string): unknown {
    const json = body.replace(/\\`/g, "`");

    try {
        return JSON.parse(json) as unknown;
    } catch {
        throw badSelector(
            `A literal between backticks must be JSON, so a bare word needs quotes: write \`"${json}"\` ` +
                `rather than \`${json}\``,
            where,
            at,
            { literal: json },
        );
    }
}

/**
 * Decode a quoted attribute name, which is a JSON string.
 * @param where - The expression being lexed, for the refusal.
 * @param at - The index of the opening quote.
 * @param quoted - The name with its quotes still on it.
 * @returns The name it denotes.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the escapes are not JSON's.
 */
function decodeQuotedName(where: Query, at: number, quoted: string): string {
    try {
        const decoded: unknown = JSON.parse(quoted);

        if (typeof decoded === "string") {
            return decoded;
        }
    } catch {
        // Falls through to the one refusal below, so both failures read the same way.
    }

    throw badSelector(
        `A quoted attribute name follows JSON's rules for a string, and ${quoted} does not`,
        where,
        at,
        { name: quoted },
    );
}

/**
 * Turn an expression into tokens, refusing every JMESPath construct outside the subset.
 * @param where - The expression as it was typed.
 * @returns The tokens, ending with one of kind `end`.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` at the offset of anything unsupported.
 */
function tokenize(where: Query): readonly Token[] {
    const tokens: Token[] = [];
    let at = 0;

    while (at < where.length) {
        const character = where.charAt(at);

        if (/\s/.test(character)) {
            at++;
            continue;
        }

        const unsupported = UNSUPPORTED_BY_CHARACTER[character];
        if (unsupported !== undefined) {
            throw badSelector(`A selector does not support ${unsupported}`, where, at, { construct: unsupported });
        }

        if (character === "|" && where.charAt(at + 1) !== "|") {
            throw badSelector("A selector does not support pipe expressions", where, at, { construct: "pipe expressions" });
        }

        if (character === "&" && where.charAt(at + 1) !== "&") {
            throw badSelector("A selector does not support expression references", where, at, {
                construct: "expression references",
            });
        }

        const operator = OPERATORS.find((candidate) => where.startsWith(candidate, at));
        if (operator !== undefined) {
            tokens.push({ kind: "operator", text: operator, at });
            at += operator.length;
            continue;
        }

        if (character === "`") {
            const close = findClose(where, at, "`");
            tokens.push({ kind: "literal", text: "", value: decodeJsonLiteral(where, at, where.slice(at + 1, close)), at });
            at = close + 1;
            continue;
        }

        if (character === "'") {
            const close = findClose(where, at, "'");
            tokens.push({ kind: "literal", text: "", value: decodeRawString(where.slice(at + 1, close)), at });
            at = close + 1;
            continue;
        }

        if (character === '"') {
            const close = findClose(where, at, '"');
            tokens.push({ kind: "identifier", text: decodeQuotedName(where, at, where.slice(at, close + 1)), at });
            at = close + 1;
            continue;
        }

        if (startsIdentifier(character)) {
            let end = at + 1;
            while (end < where.length && continuesIdentifier(where.charAt(end))) {
                end++;
            }

            tokens.push({ kind: "identifier", text: where.slice(at, end), at });
            at = end;
            continue;
        }

        if (/[0-9-]/.test(character)) {
            throw badSelector(
                "A number in a selector goes between backticks, so write `5` rather than 5",
                where,
                at,
                { character },
            );
        }

        throw badSelector(`${JSON.stringify(character)} is not something a selector can contain`, where, at, {
            character,
        });
    }

    tokens.push({ kind: "end", text: "", at: where.length });

    return tokens;
}

// ---------------------------------------------------------------------------------------------
// The expression subset: the grammar
// ---------------------------------------------------------------------------------------------

/**
 * The grammar, written out, because a reader of this file should not have to infer it from the
 * functions below.
 *
 * ```
 * expression := or
 * or         := and ( "||" and )*
 * and        := comparison ( "&&" comparison )*
 * comparison := unary ( ("=="|"!="|"<"|"<="|">"|">=") unary )?
 * unary      := "!" unary | operand
 * operand    := literal | path | "(" expression ")"
 * path       := name ( "." name )*
 * ```
 *
 * The shape follows JMESPath's own binding powers, so an accepted expression groups the way
 * JMESPath groups it: `||` is loosest, then `&&`, then the comparators, and `!` binds tighter
 * than all of them. A comparison does not chain, because JMESPath's does not either.
 */
type CompareOperator = "!=" | "<" | "<=" | "==" | ">" | ">=";

/** The comparators, keyed by their text, so the parser recognises one without a cast. */
const COMPARATORS: Readonly<Record<string, CompareOperator | undefined>> = Object.freeze({
    "!=": "!=",
    "<": "<",
    "<=": "<=",
    "==": "==",
    ">": ">",
    ">=": ">=",
} satisfies Record<CompareOperator, CompareOperator>);

/** One node of a parsed selector expression. */
type ExpressionNode =
    | { readonly kind: "and"; readonly left: ExpressionNode; readonly right: ExpressionNode }
    | { readonly kind: "compare"; readonly operator: CompareOperator; readonly left: ExpressionNode; readonly right: ExpressionNode }
    | { readonly kind: "group"; readonly inner: ExpressionNode }
    | { readonly kind: "literal"; readonly value: unknown }
    | { readonly kind: "not"; readonly operand: ExpressionNode }
    | { readonly kind: "or"; readonly left: ExpressionNode; readonly right: ExpressionNode }
    | { readonly kind: "path"; readonly path: Path; readonly at: number };

/** The parser's position in one expression. */
interface ParseState {
    /** The expression as it was typed, for every refusal. */
    readonly where: Query;
    /** The tokens. */
    readonly tokens: readonly Token[];
    /** Which token comes next. */
    index: number;
}

/**
 * The token the parser is looking at.
 * @param state - The parse state.
 * @returns The current token.
 */
function peek(state: ParseState): Token {
    return state.tokens[state.index];
}

/**
 * Whether the parser is looking at a particular operator.
 * @param state - The parse state.
 * @param text - The operator to look for.
 * @returns True when the current token is that operator.
 */
function atOperator(state: ParseState, text: string): boolean {
    const token = peek(state);

    return token.kind === "operator" && token.text === text;
}

/**
 * Parse one path: a name, then every `.name` that follows it.
 *
 * The segments are joined back into a dotted string, because that string IS the column key the
 * session stores the value under. `results.louvain.group` is one lookup, not a walk down three
 * objects, and `data."min-cut".partition` is the column `data.min-cut.partition`.
 * @param state - The parse state.
 * @returns The path node.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` for a function call, a dot with no name
 *     after it, or a quoted segment carrying a dot of its own.
 */
function parsePath(state: ParseState): ExpressionNode {
    const first = peek(state);
    const segments: string[] = [];

    for (;;) {
        const token = peek(state);

        if (token.kind !== "identifier") {
            throw badSelector("A `.` must be followed by an attribute name", state.where, token.at);
        }

        if (token.text.includes(".")) {
            throw badSelector(
                `A quoted attribute name may not contain a dot: ${JSON.stringify(token.text)} would be ` +
                    "indistinguishable from two names",
                state.where,
                token.at,
                { segment: token.text },
            );
        }

        state.index++;

        if (atOperator(state, "(")) {
            throw badSelector(
                `A selector does not support functions, so ${token.text}(...) cannot be called here`,
                state.where,
                token.at,
                { construct: "functions", function: token.text },
            );
        }

        segments.push(token.text);

        if (!atOperator(state, ".")) {
            return { kind: "path", path: segments.join("."), at: first.at };
        }

        state.index++;
    }
}

/**
 * Parse a literal, a path, or a parenthesised expression.
 * @param state - The parse state.
 * @returns The operand node.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the token starts none of those.
 */
function parseOperand(state: ParseState): ExpressionNode {
    const token = peek(state);

    if (token.kind === "literal") {
        state.index++;

        return { kind: "literal", value: token.value };
    }

    if (token.kind === "identifier") {
        return parsePath(state);
    }

    if (atOperator(state, "(")) {
        state.index++;
        const inner = parseOr(state);

        if (!atOperator(state, ")")) {
            throw badSelector("A `(` is opened and never closed", state.where, token.at);
        }

        state.index++;

        return { kind: "group", inner };
    }

    throw badSelector(
        token.kind === "end"
            ? "The selector ends where an attribute name, a literal or a `(` should be"
            : `${JSON.stringify(token.text)} is where an attribute name, a literal or a \`(\` should be`,
        state.where,
        token.at,
    );
}

/**
 * Parse `!`, which binds tighter than everything else, including the dot.
 *
 * That is JMESPath's rule, and it is a trap: `!data.flag` means `(!data).flag` -- the field
 * `flag` of a boolean -- and not "the opposite of data.flag". Rather than quietly reading it the
 * way most people meant it, which would make an accepted selector mean something JMESPath does
 * not, it is refused with the parenthesised form to write instead.
 * @param state - The parse state.
 * @returns The unary node.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when `!` is applied to a multi-part path.
 */
function parseUnary(state: ParseState): ExpressionNode {
    if (!atOperator(state, "!")) {
        return parseOperand(state);
    }

    const bang = peek(state);
    state.index++;
    const operand = parseUnary(state);

    if (operand.kind === "path" && operand.path.includes(".")) {
        throw badSelector(
            `In JMESPath \`!\` binds tighter than \`.\`, so !${operand.path} means (!${operand.path.split(".")[0]})` +
                `${operand.path.slice(operand.path.indexOf("."))} rather than the opposite of ${operand.path}. ` +
                `Write !(${operand.path}) for that`,
            state.where,
            bang.at,
            { path: operand.path },
        );
    }

    return { kind: "not", operand };
}

/**
 * Parse a comparison, which does not chain.
 * @param state - The parse state.
 * @returns The comparison node, or its left side when there was no comparator.
 */
function parseComparison(state: ParseState): ExpressionNode {
    const left = parseUnary(state);
    const token = peek(state);
    const operator = token.kind === "operator" ? COMPARATORS[token.text] : undefined;

    if (operator === undefined) {
        return left;
    }

    state.index++;

    return { kind: "compare", operator, left, right: parseUnary(state) };
}

/**
 * Parse a run of `&&`.
 * @param state - The parse state.
 * @returns The node.
 */
function parseAnd(state: ParseState): ExpressionNode {
    let left = parseComparison(state);

    while (atOperator(state, "&&")) {
        state.index++;
        left = { kind: "and", left, right: parseComparison(state) };
    }

    return left;
}

/**
 * Parse a run of `||`.
 * @param state - The parse state.
 * @returns The node.
 */
function parseOr(state: ParseState): ExpressionNode {
    let left = parseAnd(state);

    while (atOperator(state, "||")) {
        state.index++;
        left = { kind: "or", left, right: parseAnd(state) };
    }

    return left;
}

/**
 * Parse a whole selector expression.
 * @param where - The expression as it was typed.
 * @returns The parsed tree.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` naming the offset of whatever is wrong.
 */
function parseExpression(where: Query): ExpressionNode {
    const state: ParseState = { where, tokens: tokenize(where), index: 0 };
    const parsed = parseOr(state);
    const trailing = peek(state);

    if (trailing.kind !== "end") {
        throw badSelector(
            `${JSON.stringify(trailing.text)} is left over at the end of the selector`,
            where,
            trailing.at,
        );
    }

    return parsed;
}

// ---------------------------------------------------------------------------------------------
// The expression subset: compiling a tree into a closure
// ---------------------------------------------------------------------------------------------

/** What one element's value for a subexpression is. */
type ValueReader = (index: number) => unknown;

/**
 * Collect the column paths a tree reads, in the order it names them, without repeats.
 * @param node - The tree.
 * @param into - The list being built.
 */
function collectPaths(node: ExpressionNode, into: Path[]): void {
    switch (node.kind) {
        case "path":
            if (!into.includes(node.path)) {
                into.push(node.path);
            }

            return;
        case "group":
            collectPaths(node.inner, into);

            return;
        case "not":
            collectPaths(node.operand, into);

            return;
        case "and":
        case "or":
        case "compare":
            collectPaths(node.left, into);
            collectPaths(node.right, into);

            return;
        default:
            return;
    }
}

/**
 * Compile a tree into the closure that reads one element's value for it.
 *
 * A path reads its column and normalises an absent value to null, because that is what JMESPath
 * calls a field that is not there, and every comparison below is written against that.
 * @param node - The tree.
 * @param columns - Where to read values.
 * @returns The reader.
 */
function compileValue(node: ExpressionNode, columns: ElementColumns): ValueReader {
    switch (node.kind) {
        case "path": {
            const { path } = node;
            const { value } = columns;

            return (index): unknown => {
                const read = value(index, path);

                return read === undefined ? null : read;
            };
        }
        case "literal": {
            const { value } = node;

            return (): unknown => value;
        }
        case "group":
            return compileValue(node.inner, columns);
        case "not": {
            const operand = compileValue(node.operand, columns);

            return (index): boolean => !isTruthy(operand(index));
        }
        case "and": {
            const left = compileValue(node.left, columns);
            const right = compileValue(node.right, columns);

            return (index): unknown => {
                const answer = left(index);

                return isTruthy(answer) ? right(index) : answer;
            };
        }
        case "or": {
            const left = compileValue(node.left, columns);
            const right = compileValue(node.right, columns);

            return (index): unknown => {
                const answer = left(index);

                return isTruthy(answer) ? answer : right(index);
            };
        }
        default:
            return compileComparison(node.operator, node.left, node.right, columns);
    }
}

/** The four ordering comparisons, so the compiled closure holds one function and no branch. */
const ORDERINGS: Readonly<Record<"<" | "<=" | ">" | ">=", (a: number, b: number) => boolean>> = Object.freeze({
    "<": (a, b) => a < b,
    "<=": (a, b) => a <= b,
    ">": (a, b) => a > b,
    ">=": (a, b) => a >= b,
});

/**
 * The literal side of a comparison, when exactly one side is a literal.
 * @param left - The comparison's left side.
 * @param right - Its right side.
 * @returns The literal node, or null when neither side is one.
 */
function pickLiteral(left: ExpressionNode, right: ExpressionNode): { readonly value: unknown } | null {
    if (left.kind === "literal") {
        return left;
    }

    if (right.kind === "literal") {
        return right;
    }

    return null;
}

/**
 * Compile a comparison, taking the cheap road whenever one side is a literal.
 *
 * Two of those roads matter. `<path> != \`null\`` and `<path> == \`null\`` are the presence test
 * in disguise -- they are half of every selector the element ships -- so they compile to
 * {@link ElementColumns.has}, which a columnar store can answer from a presence bitmap without
 * materialising the value. And an equality against a primitive compiles to `===` rather than to
 * a structural walk, because a structural walk on a number is three type checks for nothing.
 * @param operator - Which comparison.
 * @param left - Its left side.
 * @param right - Its right side.
 * @param columns - Where to read values.
 * @returns The reader, whose answer is a boolean for `==` and `!=` and may be null for an
 *     ordering comparison of something that is not a number.
 */
function compileComparison(
    operator: CompareOperator,
    left: ExpressionNode,
    right: ExpressionNode,
    columns: ElementColumns,
): ValueReader {
    if (operator === "==" || operator === "!=") {
        const wanted = operator === "==";
        const leftIsLiteral = left.kind === "literal";
        const constant = pickLiteral(left, right);
        const other = leftIsLiteral ? right : left;

        if (constant !== null && constant.value === null && other.kind === "path") {
            const { path } = other;
            const { has } = columns;

            return (index): boolean => has(index, path) !== wanted;
        }

        const readLeft = compileValue(left, columns);
        const readRight = compileValue(right, columns);

        if (constant !== null && constant.value !== null && typeof constant.value !== "object") {
            const { value } = constant;
            const read = leftIsLiteral ? readRight : readLeft;

            return (index): boolean => (read(index) === value) === wanted;
        }

        return (index): boolean => deepEquals(readLeft(index), readRight(index)) === wanted;
    }

    const readLeft = compileValue(left, columns);
    const readRight = compileValue(right, columns);
    const compare = ORDERINGS[operator];

    return (index): boolean | null => {
        const a = readLeft(index);
        const b = readRight(index);

        // JMESPath orders numbers and nothing else: anything else answers null, which is false.
        return typeof a === "number" && typeof b === "number" ? compare(a, b) : null;
    };
}

/**
 * Compile a tree into the boolean test a repaint runs.
 *
 * A comparison and a `!` already answer a boolean, so their reader is the test. Everything else
 * is weighed by JMESPath's truthiness on the way out.
 * @param node - The tree.
 * @param columns - Where to read values.
 * @returns The test.
 */
function compileTest(node: ExpressionNode, columns: ElementColumns): ElementPredicate {
    switch (node.kind) {
        case "compare":
        case "not": {
            const read = compileValue(node, columns);

            return (index): boolean => read(index) === true;
        }
        case "group":
            return compileTest(node.inner, columns);
        case "and": {
            const left = compileTest(node.left, columns);
            const right = compileTest(node.right, columns);

            return (index): boolean => left(index) && right(index);
        }
        case "or": {
            const left = compileTest(node.left, columns);
            const right = compileTest(node.right, columns);

            return (index): boolean => left(index) || right(index);
        }
        default: {
            const read = compileValue(node, columns);

            return (index): boolean => isTruthy(read(index));
        }
    }
}

/**
 * Write a column key as a path an expression selector reads back as the same key.
 *
 * A segment is only an unquoted name when it is a letter or an underscore followed by letters,
 * digits and underscores; anything else has to be written as a quoted name, which is what the
 * grammar provides double quotes for. A run's column key is `results.<algorithm>_<random>.<field>`
 * and a great many algorithm names carry a hyphen -- "min-cut", "shortest-path",
 * "bipartite-matching" -- so a key pasted into an expression unquoted lexes the hyphen as
 * arithmetic and the whole selector is refused. That is not a hypothetical: it took the picture
 * off every highlight-shaped algorithm whose name has a hyphen in it.
 * @param path - The column key.
 * @returns The same key, with every segment that is not an unquoted name written as a JSON string.
 */
export function quotePath(path: Path): Query {
    return path
        .split(".")
        .map((segment) => (isUnquotedName(segment) ? segment : JSON.stringify(segment)))
        .join(".");
}

/**
 * Whether a path segment can be written in an expression without quotes.
 * @param segment - One segment of a column key.
 * @returns True when the lexer would read the whole segment as one identifier.
 */
function isUnquotedName(segment: string): boolean {
    if (segment === "" || !startsIdentifier(segment[0])) {
        return false;
    }

    for (let at = 1; at < segment.length; at++) {
        if (!continuesIdentifier(segment[at])) {
            return false;
        }
    }

    return true;
}

// ---------------------------------------------------------------------------------------------
// The compiled forms
// ---------------------------------------------------------------------------------------------

/**
 * The predicate for `{match:"has"}`: one column presence test, and the reason `encode()` writes
 * this selector rather than an expression.
 * @param columns - Where to read values.
 * @param path - The column path.
 * @returns The test.
 */
export function hasPredicate(columns: ElementColumns, path: Path): ElementPredicate {
    const { has } = columns;

    return (index): boolean => has(index, path);
}

/**
 * The predicate for `{match:"ids"}`: a set membership test against the ids the layer named.
 *
 * The id is read per element rather than the ids being resolved to dense indices once, so that
 * the predicate survives a freeze that remaps the index space instead of painting whichever
 * elements moved into the remembered rows.
 * @param columns - Where to read ids.
 * @param ids - The ids the layer named.
 * @returns The test.
 */
export function idsPredicate(columns: ElementColumns, ids: ReadonlySet<EdgeId | NodeId>): ElementPredicate {
    const { idOf } = columns;

    if (idOf === null) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message:
                'This session cannot evaluate an "ids" selector, because it cannot say which id sits at which ' +
                "row. Painting the layer anyway would colour elements it never named.",
            source: "style",
            details: { match: "ids" },
        });
    }

    return (index): boolean => ids.has(idOf(index));
}

/**
 * Parse and compile `{match:"expression"}`.
 *
 * The parse happens HERE, once, when the layer is added or updated. An expression that is not in
 * the subset is refused at this call, in front of whoever typed it, rather than failing per
 * element later where nothing would report it.
 * @param where - The expression as it was typed.
 * @param columns - Where to read values.
 * @returns The test and the column paths it reads.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the expression does not parse or
 *     uses a JMESPath construct the subset does not implement.
 */
export function compileExpressionPredicate(
    where: Query,
    columns: ElementColumns,
): { readonly paths: readonly Path[]; readonly test: ElementPredicate } {
    const parsed = parseExpression(where);
    const paths: Path[] = [];
    collectPaths(parsed, paths);

    return { paths: Object.freeze(paths), test: compileTest(parsed, columns) };
}
