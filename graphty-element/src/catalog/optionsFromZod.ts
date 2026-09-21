/**
 * @file The Zod-to-JSON option descriptor emitter.
 *
 * Option schemas are authored in Zod because Zod validates, applies defaults and infers the
 * option type for the implementation. None of that is any use to a consumer rendering a form,
 * and shipping the Zod object across the package boundary makes the consumer's Zod version
 * part of this package's API: the one consumer that tried it ended up reading Zod's private
 * internals in two modules, with a branch for each Zod major.
 *
 * So the walk happens once, here, inside the element, and what leaves is plain JSON.
 *
 * The walk goes through Zod's own public JSON Schema exporter rather than through its private
 * definition objects, which is what keeps this file from becoming the thing it replaces. The
 * emitter then classifies each property of the resulting JSON Schema into one
 * {@link OptionDescriptor}.
 *
 * Two rules the emitter never breaks:
 *
 * - An option is never dropped. A construct it cannot classify still produces a descriptor,
 *   carrying the option's name, its default and a type of "unknown" with a sentence in
 *   `unsupportedReason` saying what stopped it.
 * - The emitter never throws. A schema that cannot be converted at all becomes a set of
 *   "unknown" descriptors, one per option, not an exception in the middle of building a
 *   catalogue.
 *
 * What the emitter will not do is guess semantics from a name. An option called "seed" is an
 * integer as far as the schema is concerned, and turning it into the "seed" control is a
 * decision for whoever authors the descriptor: pass it through `overrides`.
 */

import { z } from "zod/v4";

import type { OptionsSchema } from "../config/OptionsSchema";
import type { OptionChoice, OptionDescriptor, OptionType } from "./types";

/** The UI metadata the element's own option schemas carry beside each Zod schema. */
export type OptionUiMeta = OptionsSchema[string]["meta"];

/**
 * What the emitter accepts: a Zod object schema, or the element's own options schema, which is
 * a record of Zod schemas each paired with UI metadata.
 */
export type OptionsSource = z.ZodType | OptionsSchema;

/** Everything the emitter cannot learn from a Zod schema on its own. */
export interface OptionsFromZodOptions {
    /**
     * UI metadata by option name, for a bare Zod object schema that has none of its own. An
     * element options schema carries its metadata already; anything given here wins over it.
     */
    meta?: Readonly<Record<string, Partial<OptionUiMeta>>>;
    /**
     * Descriptor fields that win over everything the walk inferred, by option name. This is
     * where an author says that a string-or-number option is really a "node-id", that an
     * integer is really a "seed", or that an option is `internal`.
     */
    overrides?: Readonly<Record<string, Partial<OptionDescriptor>>>;
}

/** The subset of JSON Schema that Zod's exporter produces and this emitter reads. */
interface JsonSchemaNode {
    type?: string | readonly string[];
    anyOf?: readonly JsonSchemaNode[];
    oneOf?: readonly JsonSchemaNode[];
    allOf?: readonly JsonSchemaNode[];
    enum?: readonly unknown[];
    const?: unknown;
    default?: unknown;
    description?: string;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    properties?: Readonly<Record<string, JsonSchemaNode>>;
    $ref?: string;
    $defs?: Readonly<Record<string, JsonSchemaNode>>;
}

/** One property of the converted schema, with whatever metadata belongs to it. */
interface OptionEntry {
    name: string;
    node: JsonSchemaNode | null;
    /** Why there is no node. Only set when `node` is null. */
    failure?: string;
    meta?: Partial<OptionUiMeta>;
}

/** The arms of a union, with the null arm taken out and nested unions flattened away. */
interface FlatUnion {
    arms: JsonSchemaNode[];
    nullable: boolean;
    unresolvedRef: boolean;
}

/** How deep the emitter will follow nested unions and references before giving up. */
const MAX_DEPTH = 12;

/**
 * Turn a Zod option schema into plain-JSON option descriptors.
 * @param schema - A Zod object schema, or the element's options schema of Zod schemas paired
 * with UI metadata.
 * @param options - Metadata and per-option overrides the schema cannot express.
 * @returns One descriptor per option, in the order the schema declares them.
 */
export function optionsFromZod(
    schema: OptionsSource,
    options: OptionsFromZodOptions = {},
): readonly OptionDescriptor[] {
    const entries = isZodType(schema) ? entriesFromZodObject(schema) : entriesFromOptionsSchema(schema);

    return entries.map((entry) => {
        const meta = { ...entry.meta, ...options.meta?.[entry.name] };
        const base =
            entry.node === null
                ? unknownDescriptor(entry.name, meta, entry.failure ?? "the schema could not be converted")
                : describeNode(entry.name, entry.node, meta);

        const override = options.overrides?.[entry.name];

        return override === undefined ? base : { ...base, ...override };
    });
}

/**
 * Tell whether a value is a Zod schema rather than a record of option definitions.
 * @param value - The value to test.
 * @returns True when the value carries Zod's schema marker.
 */
function isZodType(value: unknown): value is z.ZodType {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    return "_zod" in value || "_def" in value;
}

/**
 * Convert a Zod object schema once and split the result into per-option entries.
 * @param schema - The Zod object schema to convert.
 * @returns One entry per declared property, or none when the schema is not an object.
 */
function entriesFromZodObject(schema: z.ZodType): OptionEntry[] {
    const root = toJsonSchema(schema);
    if (root === null) {
        return [];
    }

    const { properties } = root;
    if (properties === undefined) {
        return [];
    }

    return Object.entries(properties).map(([name, node]) => ({ name, node: resolve(node, root) }));
}

/**
 * Convert an element options schema once, keeping each option's UI metadata beside it.
 * @param schema - The record of Zod schemas and UI metadata to convert.
 * @returns One entry per option, in declaration order.
 */
function entriesFromOptionsSchema(schema: OptionsSchema): OptionEntry[] {
    const definitions = Object.entries(schema);
    const shape: Record<string, z.ZodType> = {};
    for (const [name, definition] of definitions) {
        shape[name] = definition.schema;
    }

    const root = objectJsonSchema(shape);
    const properties = root?.properties;

    return definitions.map(([name, definition]) => {
        const node = properties?.[name];
        if (root === null || node === undefined) {
            return {
                name,
                node: null,
                failure: "the schema could not be converted to JSON Schema",
                meta: definition.meta,
            };
        }

        return { name, node: resolve(node, root), meta: definition.meta };
    });
}

/**
 * Convert one Zod schema to JSON Schema without letting a failure escape.
 * @param schema - The Zod schema to convert.
 * @returns The converted schema, or null when Zod refused to convert it.
 */
function toJsonSchema(schema: z.ZodType): JsonSchemaNode | null {
    try {
        return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as unknown as JsonSchemaNode;
    } catch {
        return null;
    }
}

/**
 * Assemble a shape into one object schema and convert it, without letting a failure escape.
 * @param shape - The option name to Zod schema mapping to assemble.
 * @returns The converted schema, or null when the shape could not be assembled or converted.
 */
function objectJsonSchema(shape: Record<string, z.ZodType>): JsonSchemaNode | null {
    try {
        return toJsonSchema(z.object(shape));
    } catch {
        return null;
    }
}

/** Where Zod puts a schema that carries an id, and the reference that points at it. */
const DEFINITION_PREFIX = "#/$defs/";

/**
 * Put back a schema that Zod hoisted into the document's definitions. A schema registered with
 * an id is emitted once and referenced everywhere it is used, so the property itself carries a
 * reference and nothing else. A reference that points anywhere but the definitions is left
 * alone, which is what lets a self-referential schema be reported as recursive rather than
 * silently described as the object it sits inside.
 * @param node - The property node, which may be a reference.
 * @param root - The converted document the reference points into.
 * @returns The referenced definition, or the node unchanged.
 */
function resolve(node: JsonSchemaNode, root: JsonSchemaNode): JsonSchemaNode {
    const ref = node.$ref;
    if (ref === undefined || !ref.startsWith(DEFINITION_PREFIX)) {
        return node;
    }

    const name = ref.slice(DEFINITION_PREFIX.length).replaceAll("~1", "/").replaceAll("~0", "~");

    return root.$defs?.[name] ?? node;
}

/**
 * Build a descriptor for one converted option.
 * @param name - The option's name, which is also its technical name.
 * @param node - The option's converted JSON Schema.
 * @param meta - The UI metadata for this option, if any.
 * @returns The finished descriptor.
 */
function describeNode(name: string, node: JsonSchemaNode, meta: Partial<OptionUiMeta>): OptionDescriptor {
    const union = flatten(node, 0);
    const classified = classify(union);

    const descriptor: OptionDescriptor = {
        name,
        plainName: meta.label ?? humanize(name),
        technicalName: name,
        type: classified.type,
    };

    const description = meta.description ?? node.description ?? classified.node?.description;
    if (description !== undefined) {
        descriptor.description = description;
    }

    if ("default" in node) {
        descriptor.default = node.default;
    }

    const bounds = classified.node;
    if (bounds !== undefined && (classified.type === "number" || classified.type === "integer")) {
        const min = authoredBound(bounds.minimum ?? bounds.exclusiveMinimum);
        const max = authoredBound(bounds.maximum ?? bounds.exclusiveMaximum);
        if (min !== undefined) {
            descriptor.min = min;
        }

        if (max !== undefined) {
            descriptor.max = max;
        }
    }

    const step = meta.step ?? bounds?.multipleOf;
    if (step !== undefined) {
        descriptor.step = step;
    }

    if (classified.values !== undefined) {
        descriptor.values = classified.values;
    }

    if (meta.group !== undefined) {
        descriptor.group = meta.group;
    }

    if (meta.advanced !== undefined) {
        descriptor.advanced = meta.advanced;
    }

    if (classified.unsupportedReason !== undefined) {
        descriptor.unsupportedReason = classified.unsupportedReason;
    }

    return descriptor;
}

/**
 * Build the descriptor for an option whose schema could not be converted at all.
 * @param name - The option's name.
 * @param meta - The UI metadata for this option, if any.
 * @param reason - Why the option could not be classified.
 * @returns A descriptor of type "unknown" that still names the option.
 */
function unknownDescriptor(name: string, meta: Partial<OptionUiMeta>, reason: string): OptionDescriptor {
    const descriptor: OptionDescriptor = {
        name,
        plainName: meta.label ?? humanize(name),
        technicalName: name,
        type: "unknown",
        unsupportedReason: reason,
    };

    if (meta.description !== undefined) {
        descriptor.description = meta.description;
    }

    if (meta.step !== undefined) {
        descriptor.step = meta.step;
    }

    if (meta.group !== undefined) {
        descriptor.group = meta.group;
    }

    if (meta.advanced !== undefined) {
        descriptor.advanced = meta.advanced;
    }

    return descriptor;
}

/**
 * Flatten nested unions into a list of arms, with the null arm recorded separately.
 * @param node - The node to flatten.
 * @param depth - How many levels of union have already been followed.
 * @returns The flattened arms, whether null was one of them, and whether a reference stopped
 * the walk.
 */
function flatten(node: JsonSchemaNode, depth: number): FlatUnion {
    if (depth >= MAX_DEPTH) {
        return { arms: [], nullable: false, unresolvedRef: true };
    }

    if (node.$ref !== undefined) {
        return { arms: [], nullable: false, unresolvedRef: true };
    }

    const branches = node.anyOf ?? node.oneOf;
    if (branches === undefined) {
        if (node.type === "null") {
            return { arms: [], nullable: true, unresolvedRef: false };
        }

        return { arms: [node], nullable: false, unresolvedRef: false };
    }

    const result: FlatUnion = { arms: [], nullable: false, unresolvedRef: false };
    for (const branch of branches) {
        const inner = flatten(branch, depth + 1);
        result.arms.push(...inner.arms);
        result.nullable = result.nullable || inner.nullable;
        result.unresolvedRef = result.unresolvedRef || inner.unresolvedRef;
    }

    return result;
}

/** What the classifier decided about one option. */
interface Classification {
    type: OptionType;
    /** The arm the bounds and the description come from, when exactly one arm survived. */
    node?: JsonSchemaNode;
    values?: readonly OptionChoice[];
    unsupportedReason?: string;
}

/**
 * Decide which control an option asks for, from the arms that survived flattening.
 * @param union - The flattened union.
 * @returns The option type, plus the bounds source and any enumerated values.
 */
function classify(union: FlatUnion): Classification {
    if (union.arms.length === 0) {
        if (union.unresolvedRef) {
            return {
                type: "unknown",
                unsupportedReason: "the schema is recursive, so it has no single value type",
            };
        }

        return {
            type: "unknown",
            unsupportedReason: union.nullable
                ? "the only value the schema accepts is null"
                : "the schema declares no value type",
        };
    }

    const choices = choicesFrom(union.arms);
    if (choices !== undefined) {
        return { type: "enum", node: union.arms[0], values: choices };
    }

    if (union.arms.length === 1) {
        return classifyLeaf(union.arms[0]);
    }

    const types = union.arms.map((arm) => typeNameOf(arm));
    if (types.length === 2 && types.includes("string") && types.includes("number")) {
        // NodeId is exactly `string | number`, so a union of the two is a node reference.
        return { type: "node-id" };
    }

    return {
        type: "unknown",
        unsupportedReason: `the schema is a union of ${types.join(" and ")}, which has no single control`,
    };
}

/**
 * Classify a single, non-union schema node.
 * @param node - The node to classify.
 * @returns The option type, and the node itself when it carries bounds.
 */
function classifyLeaf(node: JsonSchemaNode): Classification {
    switch (typeNameOf(node)) {
        case "integer":
            return { type: "integer", node };
        case "number":
            return { type: "number", node };
        case "boolean":
            return { type: "boolean", node };
        case "string":
            return { type: "string", node };
        case "array":
            return {
                type: "unknown",
                node,
                unsupportedReason: "an array option has no descriptor type; give it one with an override",
            };
        case "object":
            return {
                type: "unknown",
                node,
                unsupportedReason: "an object or record option has no descriptor type; give it one with an override",
            };
        default:
            return {
                type: "unknown",
                node,
                unsupportedReason: "the Zod construct has no JSON Schema type, so its values cannot be classified",
            };
    }
}

/**
 * Read the enumerated values out of a set of union arms, when every arm is enumerated.
 * @param arms - The arms to read.
 * @returns The choices, or undefined when the arms are not all enumerations or literals.
 */
function choicesFrom(arms: readonly JsonSchemaNode[]): readonly OptionChoice[] | undefined {
    const values: unknown[] = [];
    for (const arm of arms) {
        if (arm.enum !== undefined) {
            values.push(...arm.enum);
        } else if ("const" in arm) {
            values.push(arm.const);
        } else {
            return undefined;
        }
    }

    if (values.length === 0) {
        return undefined;
    }

    const choices: OptionChoice[] = [];
    for (const value of values) {
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            return undefined;
        }

        const text = String(value);
        choices.push({ value: text, label: humanize(text) });
    }

    return choices;
}

/**
 * Read a node's JSON Schema type name, collapsing the array form to its first entry.
 * @param node - The node to read.
 * @returns The type name, or "none" when the node declares no type.
 */
function typeNameOf(node: JsonSchemaNode): string {
    const { type } = node;
    if (typeof type === "string") {
        return type;
    }

    if (Array.isArray(type) && type.length > 0) {
        return type[0];
    }

    return "none";
}

/**
 * Drop a bound that is only the safe-integer limit. Marking a number as an integer implies
 * those limits, and a form that reads one of them as a range renders a slider nine quadrillion
 * steps wide instead of the range its author meant.
 * @param bound - The bound read from the converted schema.
 * @returns The bound, or undefined when it is a safe-integer limit rather than an authored one.
 */
function authoredBound(bound: number | undefined): number | undefined {
    if (bound === Number.MAX_SAFE_INTEGER || bound === -Number.MAX_SAFE_INTEGER) {
        return undefined;
    }

    return bound;
}

/**
 * Turn an identifier into a readable label, for when no metadata supplies one.
 * @param name - The identifier to convert.
 * @returns The identifier with word breaks restored and each word capitalised.
 */
function humanize(name: string): string {
    const spaced = name
        .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
        .replace(/[_-]+/gu, " ")
        .trim();
    if (spaced === "") {
        return name;
    }

    return spaced
        .split(/\s+/u)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
