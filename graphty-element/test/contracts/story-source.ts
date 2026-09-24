/**
 * @file Read what the story files actually declare, with the TypeScript parser rather than with
 * a regular expression.
 *
 * WHY THIS EXISTS. `test/contracts/story-roster.test.ts` used to find stories with
 * `/^export const ([A-Za-z0-9_]+): Story\b/gm` and titles with `/title:\s*"([^"]+)"/`. Both are
 * true of the code as it happens to be typed today and of nothing else. A story written
 * `export const Foo = { ... } satisfies Story`, or `export const Foo: StoryObj<StoryArgs> = ...`,
 * or `export { Foo }`, is a perfectly ordinary story that the pattern cannot see -- and a story
 * the roster cannot see is a story that can be deleted, renamed or hollowed out with no gate
 * going red. A title written with single quotes had the same effect over a whole file at once.
 *
 * That is the defect this package keeps finding in its own gates: a check that quietly measures
 * less than it claims to. So the reader below does two things a pattern cannot.
 *
 * IT PARSES. Every named export of a `*.stories.ts` file is a story -- that is Storybook's own
 * rule, and `excludeStories` is the only thing that changes it -- so the reader takes the export
 * names off the syntax tree and never asks how the author spelled the type annotation.
 *
 * IT REFUSES TO GUESS. Anything it meets and cannot evaluate is recorded rather than skipped:
 * a meta whose title is built by a function, an `excludeStories` that is a regular expression, a
 * layer list assembled by a helper. A caller can then decide whether that silence is acceptable
 * for what it is checking, which is a decision made in the open. The one thing that never
 * happens is a file contributing nothing and looking exactly like a file with nothing in it.
 *
 * WHAT ELSE IT READS. Beyond the ids, it reads the style CHANNELS each story writes -- the keys
 * of `setup.node`, `setup.edge`, the two encode maps, and the `set` and `encode` maps of every
 * layer, on the story and on the meta it inherits from. That is what lets a gate ask whether a
 * story named for a subject still demonstrates that subject; see
 * `test/contracts/story-demonstrates-its-subject.test.ts`.
 *
 * NO STORYBOOK, NO BROWSER, NO TYPE CHECKER. `ts.createSourceFile` parses one file at a time
 * with no program, no `tsconfig` and no module resolution, so this runs in the `default` vitest
 * project in milliseconds.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { channelDescriptor } from "../../src/session/styles/channels";

/** This file's own directory, under a bundler that defines `__dirname` and under plain Node. */
const HERE = typeof __dirname === "undefined" ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

/** The package root, from this file's own location. */
export const PACKAGE_ROOT = path.join(HERE, "../..");

/** Where the stories live. */
export const STORIES_DIR = path.join(PACKAGE_ROOT, "stories");

/** The helper a story calls to fill in the defaults every story shares. */
const SETUP_HELPER = "storySetup";

/** Setup keys whose value is a map of channel name to literal value. */
const STATIC_STYLE_KEYS = new Set(["node", "edge"]);

/** Setup keys whose value is a map of channel name to a binding onto the data. */
const ENCODING_KEYS = new Set(["nodeEncode", "edgeEncode"]);

/** The layer properties that name channels. */
const LAYER_STYLE_KEYS = new Set(["set", "encode"]);

/** A story argument whose value is a list of layers, for a story file with args of its own. */
const LAYERS_KEY = "layers";

/** A hex colour, which is how a story writes a colour into a label style field. */
const HEX_COLOUR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/** Anything spelled like a channel: the two targets, a dot, and one name. */
const CHANNEL_SHAPED = /^(?:node|edge)\.[A-Za-z][A-Za-z\d]*$/;

/** One story, as its source file declares it. */
export interface StoryDeclaration {
    /** `<meta title>::<export name>`, the pair a visual-regression baseline is keyed on. */
    readonly id: string;
    /** The sidebar title of the file's meta. */
    readonly title: string;
    /** The export name, which is also the story's display name. */
    readonly exportName: string;
    /** The file it is declared in, relative to the package root. */
    readonly file: string;
    /** Every style channel this story writes, sorted. Includes what it inherits from its meta. */
    readonly channels: readonly string[];
    /** Every field of a `labelStyle` channel value this story sets, sorted. */
    readonly labelFields: readonly string[];
    /**
     * Every dotted key path this story writes that is not a style channel, sorted.
     *
     * These are the element's own settings rather than a layer's: `selectionStyle.color`,
     * `background.backgroundType`, `layoutConfig.dim`. A story can demonstrate its subject
     * through one of these instead of through a channel -- the halo round a selected node is
     * configuration, not a channel -- so a gate reading what a story shows has to see them.
     * Arrays are not walked, which is what keeps a graph's node data out of this list.
     */
    readonly configPaths: readonly string[];
    /** Whether any `labelStyle` field is set to a hex colour, which is a colour demonstrated. */
    readonly writesColour: boolean;
    /** Everything in this story's setup the reader could not evaluate, in plain words. */
    readonly unreadable: readonly string[];
}

/** One `*.stories.ts` file, as read. */
export interface StoryFileReading {
    /** The file, relative to the package root. */
    readonly file: string;
    /** The sidebar title its meta declares. */
    readonly title: string;
    /** Every story it exports, in source order. */
    readonly stories: readonly StoryDeclaration[];
    /**
     * Every channel-shaped name written anywhere in the file, sorted.
     *
     * This is the weaker reading, for a story whose layers are built by a helper rather than
     * written out -- `stories/AllNodeShapes.stories.ts` builds one layer per shape by mapping
     * over the shape list the schema publishes, which is the right way to write it and not
     * something a parser can evaluate. A gate can fall back to this for such a story and say
     * that it did.
     */
    readonly fileChannels: readonly string[];
}

/** What the reader collects while walking one story's setup. */
interface Written {
    /** Channel names written anywhere in the setup. */
    readonly channels: Set<string>;
    /** Fields set inside a `labelStyle` channel's value. */
    readonly labelFields: Set<string>;
    /** Dotted key paths of the element's own settings this story writes. */
    readonly configPaths: Set<string>;
    /** Constructs the reader met and could not evaluate. */
    readonly unreadable: string[];
    /** Whether a `labelStyle` field was set to a hex colour. */
    colour: boolean;
}

/**
 * A fresh, empty reading.
 * @returns Somewhere to collect what one story writes.
 */
function emptyWriting(): Written {
    return {
        channels: new Set(),
        labelFields: new Set(),
        configPaths: new Set(),
        unreadable: [],
        colour: false,
    };
}

/**
 * Every `*.stories.ts` file under a directory, as absolute paths.
 * @param dir - The directory to walk.
 * @returns The story files it contains, at any depth, sorted.
 */
export function storyFiles(dir: string = STORIES_DIR): string[] {
    const found: string[] = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            found.push(...storyFiles(full));
        } else if (entry.name.endsWith(".stories.ts")) {
            found.push(full);
        }
    }

    return found.sort();
}

/**
 * Whether a statement carries the `export` keyword.
 * @param statement - The statement to look at.
 * @returns True when it is exported.
 */
function isExported(statement: ts.Statement): boolean {
    return ts.canHaveModifiers(statement)
        ? (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
        : false;
}

/**
 * Every top-level `const` in a file, by name, so an identifier can be followed to its value.
 * @param source - The parsed file.
 * @returns The initializer of each top-level variable that has one.
 */
function topLevelValues(source: ts.SourceFile): Map<string, ts.Expression> {
    const values = new Map<string, ts.Expression>();

    for (const statement of source.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
                values.set(declaration.name.text, declaration.initializer);
            }
        }
    }

    return values;
}

/**
 * Follow an expression through identifiers, casts and parentheses to the value it stands for.
 *
 * Only this file's own top-level constants are followed. An identifier that comes from an import
 * is returned unchanged, and the caller reports it as unreadable rather than assuming anything
 * about it.
 * @param expr - The expression to resolve.
 * @param values - The file's top-level constants.
 * @param seen - Names already followed, which is what stops `const a = b, b = a`.
 * @returns The expression it stands for, or the expression itself when nothing is known.
 */
function resolve(expr: ts.Expression, values: Map<string, ts.Expression>, seen = new Set<string>()): ts.Expression {
    if (ts.isIdentifier(expr)) {
        const target = values.get(expr.text);

        if (target === undefined || seen.has(expr.text)) {
            return expr;
        }

        seen.add(expr.text);

        return resolve(target, values, seen);
    }

    if (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr) || ts.isParenthesizedExpression(expr)) {
        return resolve(expr.expression, values, seen);
    }

    return expr;
}

/**
 * The name a property is written under, whatever quoting style it uses.
 * @param property - The object member.
 * @returns The property name, or null when it is computed.
 */
function propertyName(property: ts.ObjectLiteralElementLike): string | null {
    const { name } = property;

    if (name === undefined) {
        return null;
    }

    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
        return name.text;
    }

    return null;
}

/**
 * Read one property off an object literal, following spreads into the objects they spread.
 *
 * Later members win, which is what an object literal does: `{...base, title: "x"}` is titled "x".
 * @param object - The object literal.
 * @param wanted - The property name to look for.
 * @param values - The file's top-level constants, for following a spread identifier.
 * @returns The property's value, or null when the object does not set it.
 */
function property(
    object: ts.ObjectLiteralExpression,
    wanted: string,
    values: Map<string, ts.Expression>,
): ts.Expression | null {
    let found: ts.Expression | null = null;

    for (const member of object.properties) {
        if (ts.isSpreadAssignment(member)) {
            const spread = resolve(member.expression, values);

            if (ts.isObjectLiteralExpression(spread)) {
                found = property(spread, wanted, values) ?? found;
            }

            continue;
        }

        if (propertyName(member) !== wanted) {
            continue;
        }

        if (ts.isPropertyAssignment(member)) {
            found = member.initializer;
        } else if (ts.isShorthandPropertyAssignment(member)) {
            found = member.name;
        }
    }

    return found;
}

/**
 * A string literal's text, following an identifier to a literal when it is one.
 * @param expr - The expression.
 * @param values - The file's top-level constants.
 * @returns The string, or null when the expression is not a plain string literal.
 */
function stringValue(expr: ts.Expression, values: Map<string, ts.Expression>): string | null {
    const target = resolve(expr, values);

    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) {
        return target.text;
    }

    return null;
}

/**
 * Record the channels a `{channel: value}` map writes.
 * @param expr - The map, as written.
 * @param values - The file's top-level constants.
 * @param out - Where to record what was found.
 * @param where - How to describe this position in a message.
 */
function readChannelMap(
    expr: ts.Expression,
    values: Map<string, ts.Expression>,
    out: Written,
    where: string,
): void {
    const target = resolve(expr, values);

    if (!ts.isObjectLiteralExpression(target)) {
        out.unreadable.push(`${where} is not an object written out here`);

        return;
    }

    for (const member of target.properties) {
        if (ts.isSpreadAssignment(member)) {
            readChannelMap(member.expression, values, out, `${where} (spread)`);

            continue;
        }

        const channel = propertyName(member);

        if (channel === null) {
            out.unreadable.push(`${where} names a channel with a computed key`);

            continue;
        }

        out.channels.add(channel);

        // WHICH CHANNELS CARRY A LABEL STYLE COMES FROM THE CHANNEL TABLE, not from the shape of
        // the name. `node.tooltipStyle` takes exactly the value `node.labelStyle` takes -- the
        // same `LabelStyle`, through the same branch of the painter -- and a reader that matched
        // on the suffix "labelStyle" read a tooltip's colours as nothing at all, so a story
        // demonstrating them failed the gate that exists to protect it. Asking the table means a
        // channel published later is read here with nothing edited.
        if (channelDescriptor(channel)?.accepts !== "labelStyle" || !ts.isPropertyAssignment(member)) {
            continue;
        }

        const style = resolve(member.initializer, values);

        if (!ts.isObjectLiteralExpression(style)) {
            out.unreadable.push(`${where}.${channel} is not an object written out here`);

            continue;
        }

        for (const field of style.properties) {
            const name = propertyName(field);

            if (name === null) {
                out.unreadable.push(`${where}.${channel} sets a field with a computed key`);

                continue;
            }

            out.labelFields.add(name);

            // A LABEL FIELD SET TO A HEX COLOUR IS A COLOUR DEMONSTRATED, and reading it that way
            // is what lets a gate believe a story called BackgroundColor. The label vocabulary
            // names fields after what they paint rather than after what they hold -- `background`,
            // `outline`, `pointer` -- so the word "colour" appears in the story's name and in
            // nothing the story writes, while `#10B981` sits in plain sight in the value.
            if (
                ts.isPropertyAssignment(field) &&
                ts.isStringLiteral(field.initializer) &&
                HEX_COLOUR.test(field.initializer.text)
            ) {
                out.colour = true;
            }
        }
    }
}

/**
 * Record the channels a list of layers writes.
 * @param expr - The `layers` value, as written.
 * @param values - The file's top-level constants.
 * @param out - Where to record what was found.
 * @param where - How to describe this position in a message.
 */
function readLayers(expr: ts.Expression, values: Map<string, ts.Expression>, out: Written, where: string): void {
    const target = resolve(expr, values);

    if (!ts.isArrayLiteralExpression(target)) {
        out.unreadable.push(`${where}.layers is not an array written out here`);

        return;
    }

    target.elements.forEach((element, index) => {
        const layer = resolve(ts.isSpreadElement(element) ? element.expression : element, values);

        if (ts.isArrayLiteralExpression(layer)) {
            readLayers(layer, values, out, `${where}.layers[${String(index)}]`);

            return;
        }

        if (!ts.isObjectLiteralExpression(layer)) {
            out.unreadable.push(`${where}.layers[${String(index)}] is not a layer written out here`);

            return;
        }

        for (const member of layer.properties) {
            const name = propertyName(member);

            if (name !== null && LAYER_STYLE_KEYS.has(name) && ts.isPropertyAssignment(member)) {
                readChannelMap(member.initializer, values, out, `${where}.layers[${String(index)}].${name}`);
            }
        }
    });
}

/**
 * Record everything one `setup` writes.
 * @param expr - The `setup` value, as written -- usually a `storySetup({...})` call.
 * @param values - The file's top-level constants.
 * @param out - Where to record what was found.
 * @param where - How to describe this position in a message.
 */
function readSetup(expr: ts.Expression, values: Map<string, ts.Expression>, out: Written, where: string): void {
    const target = resolve(expr, values);

    if (ts.isCallExpression(target)) {
        const callee = ts.isIdentifier(target.expression) ? target.expression.text : "a function";

        if (callee !== SETUP_HELPER) {
            out.unreadable.push(`${where} is built by ${callee}(...)`);

            return;
        }

        if (target.arguments.length > 0) {
            readSetup(target.arguments[0], values, out, where);
        }

        return;
    }

    if (!ts.isObjectLiteralExpression(target)) {
        out.unreadable.push(`${where} is not an object written out here`);

        return;
    }

    for (const member of target.properties) {
        if (ts.isSpreadAssignment(member)) {
            readSetup(member.expression, values, out, `${where} (spread)`);

            continue;
        }

        const name = propertyName(member);

        if (name === null || !ts.isPropertyAssignment(member)) {
            continue;
        }

        if (STATIC_STYLE_KEYS.has(name) || ENCODING_KEYS.has(name)) {
            readChannelMap(member.initializer, values, out, `${where}.${name}`);
        } else if (name === "layers") {
            readLayers(member.initializer, values, out, where);
        }
    }
}

/**
 * Record the element settings an object writes, as dotted key paths.
 *
 * Only objects are walked. An array is data -- a graph's nodes and edges -- and walking it would
 * fill this list with the field names of whatever network a story happens to draw.
 * @param expr - The object, as written.
 * @param values - The file's top-level constants.
 * @param out - Where to record what was found.
 * @param prefix - The path so far, empty at the top.
 */
function readConfig(expr: ts.Expression, values: Map<string, ts.Expression>, out: Written, prefix: string): void {
    let target = resolve(expr, values);

    if (ts.isCallExpression(target) && ts.isIdentifier(target.expression) && target.expression.text === SETUP_HELPER) {
        if (target.arguments.length === 0) {
            return;
        }

        target = resolve(target.arguments[0], values);
    }

    if (!ts.isObjectLiteralExpression(target)) {
        return;
    }

    for (const member of target.properties) {
        if (ts.isSpreadAssignment(member)) {
            readConfig(member.expression, values, out, prefix);

            continue;
        }

        const name = propertyName(member);

        if (name === null) {
            continue;
        }

        const path = prefix === "" ? name : `${prefix}.${name}`;

        out.configPaths.add(path);

        if (ts.isPropertyAssignment(member)) {
            readConfig(member.initializer, values, out, path);
        }
    }
}

/**
 * Record everything one `args` object contributes.
 * @param expr - The `args` value, as written.
 * @param values - The file's top-level constants.
 * @param out - Where to record what was found.
 * @param where - How to describe this position in a message.
 */
function readArgs(expr: ts.Expression, values: Map<string, ts.Expression>, out: Written, where: string): void {
    const target = resolve(expr, values);

    if (!ts.isObjectLiteralExpression(target)) {
        out.unreadable.push(`${where} is not an object written out here`);

        return;
    }

    readConfig(target, values, out, "");

    for (const member of target.properties) {
        if (ts.isSpreadAssignment(member)) {
            readArgs(member.expression, values, out, where);

            continue;
        }

        const name = propertyName(member);

        if (!ts.isPropertyAssignment(member)) {
            continue;
        }

        if (name === "setup") {
            readSetup(member.initializer, values, out, `${where}.setup`);
        } else if (name === LAYERS_KEY) {
            // A story file with a `render` of its own carries its layers at the top of `args`
            // rather than inside a setup -- stories/NodeTooltips.stories.ts is written that way,
            // and its whole subject lives in the one layer its meta declares.
            readLayers(member.initializer, values, out, where);
        }
    }
}

/**
 * The names a file exports, other than its default, in source order.
 *
 * Type-only exports are not values and are not stories, so `export type Story = ...` and
 * `export type { Foo }` are both left out. Everything else is a story: that is Storybook's rule
 * for a CSF file, not a guess about how this package writes them.
 * @param source - The parsed file.
 * @returns The exported names.
 */
function exportedNames(source: ts.SourceFile): string[] {
    const names: string[] = [];

    for (const statement of source.statements) {
        if (ts.isVariableStatement(statement) && isExported(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) {
                    names.push(declaration.name.text);
                }
            }

            continue;
        }

        if (ts.isFunctionDeclaration(statement) && isExported(statement) && statement.name !== undefined) {
            names.push(statement.name.text);

            continue;
        }

        if (
            ts.isExportDeclaration(statement) &&
            !statement.isTypeOnly &&
            statement.exportClause !== undefined &&
            ts.isNamedExports(statement.exportClause)
        ) {
            for (const element of statement.exportClause.elements) {
                if (!element.isTypeOnly) {
                    names.push(element.name.text);
                }
            }
        }
    }

    return names;
}

/**
 * The names a meta keeps out of the sidebar, when it names any.
 * @param meta - The meta object literal.
 * @param values - The file's top-level constants.
 * @param file - The file, for a failure message.
 * @returns The excluded names, which is empty when the meta excludes nothing.
 */
function excludedNames(
    meta: ts.ObjectLiteralExpression,
    values: Map<string, ts.Expression>,
    file: string,
): Set<string> {
    const excluded = property(meta, "excludeStories", values);

    if (excluded === null) {
        return new Set();
    }

    const target = resolve(excluded, values);

    if (!ts.isArrayLiteralExpression(target)) {
        throw new Error(
            `${file}: "excludeStories" is not a list of names written out in the file, so this reader ` +
                `cannot tell which of its exports are stories. Write the names out, or teach ` +
                `test/contracts/story-source.ts the form used here. It must not guess: a story it ` +
                `wrongly drops is a story no gate is watching.`,
        );
    }

    const names = new Set<string>();

    for (const element of target.elements) {
        const name = stringValue(element, values);

        if (name === null) {
            throw new Error(`${file}: "excludeStories" holds something that is not a plain string.`);
        }

        names.add(name);
    }

    return names;
}

/**
 * Every channel-shaped name anywhere in a file, however it got there.
 *
 * A quoted `"node.shape"` and a property written `"node.shape":` are the same text to this, which
 * is the point: it is the reading of last resort, for a file that builds its layers rather than
 * writing them out.
 * @param source - The parsed file.
 * @returns The names, sorted.
 */
function channelShapedNames(source: ts.SourceFile): string[] {
    const found = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (
            (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
            CHANNEL_SHAPED.test(node.text)
        ) {
            found.add(node.text);
        }

        ts.forEachChild(node, visit);
    };

    visit(source);

    return [...found].sort();
}

/**
 * Read one story file.
 * @param file - The absolute path to a `*.stories.ts` file.
 * @returns Its title and every story it declares.
 */
export function readStoryFile(file: string): StoryFileReading {
    const relative = path.relative(PACKAGE_ROOT, file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const values = topLevelValues(source);
    const defaultExport = source.statements.find(
        (statement): statement is ts.ExportAssignment =>
            ts.isExportAssignment(statement) && statement.isExportEquals !== true,
    );

    if (defaultExport === undefined) {
        throw new Error(
            `${relative} has no default export, so Storybook has no meta for it and every story in it is ` +
                `invisible. A file under stories/ either exports a meta or is not a story file.`,
        );
    }

    const meta = resolve(defaultExport.expression, values);

    if (!ts.isObjectLiteralExpression(meta)) {
        throw new Error(
            `${relative}: the default export is not an object written out in this file, so its title ` +
                `cannot be read. Write the meta here, or teach test/contracts/story-source.ts the form ` +
                `used. A file whose title cannot be read contributes no story ids at all, which looks ` +
                `exactly like a file whose stories were deleted.`,
        );
    }

    const titleExpression = property(meta, "title", values);
    const title = titleExpression === null ? null : stringValue(titleExpression, values);

    if (title === null) {
        throw new Error(
            `${relative} declares no meta title that can be read as a plain string. The title is half of ` +
                `every story id in the file -- and of every visual-regression baseline -- so a title built ` +
                `at run time hides the whole file from the roster.`,
        );
    }

    const excluded = excludedNames(meta, values, relative);
    const stories: StoryDeclaration[] = [];

    for (const exportName of exportedNames(source)) {
        if (excluded.has(exportName)) {
            continue;
        }

        const declaration = values.get(exportName);
        const out = emptyWriting();
        const id = `${title}::${exportName}`;

        if (declaration === undefined) {
            out.unreadable.push(`${exportName} is exported from somewhere other than a top-level const`);
        } else {
            const story = resolve(declaration, values);

            if (ts.isObjectLiteralExpression(story)) {
                const args = property(story, "args", values);

                if (args !== null) {
                    readArgs(args, values, out, `${exportName}.args`);
                }
            } else {
                const callee =
                    ts.isCallExpression(story) && ts.isIdentifier(story.expression)
                        ? `${story.expression.text}(...)`
                        : "an expression this reader cannot evaluate";

                out.unreadable.push(`${exportName} is built by ${callee}`);
            }
        }

        const metaArgs = property(meta, "args", values);

        if (metaArgs !== null) {
            readArgs(metaArgs, values, out, "meta.args");
        }

        stories.push({
            id,
            title,
            exportName,
            file: relative,
            channels: [...out.channels].sort(),
            labelFields: [...out.labelFields].sort(),
            configPaths: [...out.configPaths].sort(),
            writesColour: out.colour,
            unreadable: out.unreadable,
        });
    }

    return { file: relative, title, stories, fileChannels: channelShapedNames(source) };
}

/**
 * Read every story file under a directory.
 * @param dir - The directory to walk. Defaults to the package's `stories/`.
 * @returns One reading per file, sorted by file name.
 */
export function readStories(dir: string = STORIES_DIR): StoryFileReading[] {
    return storyFiles(dir).map(readStoryFile);
}
