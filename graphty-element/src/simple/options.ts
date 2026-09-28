/**
 * @file Options in short form, and the checks a run or a layout makes on them before the author's
 * code runs (design/extensions/simple-tier.md section 2.2).
 *
 * `options: { tier: { type: "attribute", default: "tier" }, spacing: 2 }` is expanded into the
 * ordinary `OptionDescriptor[]` every advanced extension declares, so the reader's form, the
 * validation, the defaults and the catalogue entry work exactly as for a built-in.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { OPTION_TYPES, type OptionDescriptor, type OptionType } from "../catalog/types";
import { GraphtyError, type GraphtyErrorSource } from "../errors";
import { badDefinition, describeValue, sentenceCase, type SimpleVerb } from "./definition";
import type { GraphView, NodeId } from "./types";
import { carriedList, quoteId, requireCarried } from "./view";

/** The option types a short-form object may name: every published type but "unknown". */
const AUTHORABLE_TYPES: readonly OptionType[] = OPTION_TYPES.filter((type) => type !== "unknown");

/** The types whose value names an attribute. */
const ATTRIBUTE_TYPES: ReadonlySet<OptionType> = new Set(["attribute", "partition"]);

/**
 * Expand a definition's `options` into option descriptors, refusing a malformed entry.
 * @param verb - The call, for the refusal.
 * @param id - The definition's id.
 * @param options - What the definition carried under `options`.
 * @returns The descriptors, in key order.
 */
export function expandOptions(verb: SimpleVerb, id: string, options: unknown): OptionDescriptor[] {
    if (options === undefined) {
        return [];
    }

    if (typeof options !== "object" || options === null || Array.isArray(options)) {
        throw badDefinition(
            verb,
            id,
            "options",
            `"options" must be an object such as { spacing: 2 }; got ${describeValue(options)}.`,
        );
    }

    return Object.entries(options as Record<string, unknown>).map(([name, entry]) => expandOne(verb, id, name, entry));
}

/**
 * Expand one short-form option.
 * @param verb - The call.
 * @param id - The definition's id.
 * @param name - The option's key.
 * @param entry - Its short form.
 * @returns The descriptor.
 */
function expandOne(verb: SimpleVerb, id: string, name: string, entry: unknown): OptionDescriptor {
    const field = `options.${name}`;
    const plainName = sentenceCase(name);

    if (typeof entry === "number") {
        if (!Number.isFinite(entry)) {
            throw badDefinition(verb, id, field, `"${field}" must be a finite number; got ${describeValue(entry)}.`);
        }

        return { name, plainName, type: "number", default: entry };
    }

    if (typeof entry === "string") {
        return { name, plainName, type: "string", default: entry };
    }

    if (typeof entry === "boolean") {
        return { name, plainName, type: "boolean", default: entry };
    }

    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw badDefinition(
            verb,
            id,
            field,
            `"${field}" must be a number, a string, a boolean, or an object with a "type" such as ` +
                `{ type: "attribute", default: "weight" }; got ${describeValue(entry)}.`,
        );
    }

    const { type, on, ...rest } = entry as Record<string, unknown>;
    if (typeof type !== "string" || !AUTHORABLE_TYPES.includes(type as OptionType)) {
        throw badDefinition(
            verb,
            id,
            `${field}.type`,
            `"${field}" needs a "type", one of ${AUTHORABLE_TYPES.map((item) => `"${item}"`).join(", ")}; ` +
                `got ${describeValue(type)}.`,
        );
    }

    if (on !== undefined) {
        if (!ATTRIBUTE_TYPES.has(type as OptionType)) {
            throw badDefinition(
                verb,
                id,
                `${field}.on`,
                `"${field}" has "on", which only an "attribute" or "partition" option takes.`,
            );
        }

        if (on !== "node" && on !== "edge") {
            throw badDefinition(verb, id, `${field}.on`, `"${field}.on" must be "node" or "edge"; got ${describeValue(on)}.`);
        }
    }

    if (type === "enum" && !Array.isArray(rest.values)) {
        throw badDefinition(
            verb,
            id,
            `${field}.values`,
            `"${field}" is an "enum" and needs "values", such as [{ value: "a", label: "A" }].`,
        );
    }

    const descriptor: Record<string, unknown> = { ...rest, name, plainName: rest.plainName ?? plainName, type };
    if (on !== undefined) {
        descriptor.on = on;
    }

    // A default of null is the short form's "optional": the option is unbound until the reader
    // picks a value, so it has no default at all.
    if (descriptor.default === null) {
        delete descriptor.default;
    }

    return descriptor as unknown as OptionDescriptor;
}

/**
 * Check the resolved options of one run or layout against the graph before the author's code
 * runs: an "attribute" option must name an attribute some element carries, and a "node-id" or
 * "node-set" option must name nodes the graph has. An unbound option (undefined) is not checked.
 * @param view - The graph view the code will read.
 * @param id - The extension's id.
 * @param descriptors - The declared options.
 * @param values - The resolved values.
 * @param source - Which area of the element a refusal names.
 */
export function checkViewOptions(
    view: GraphView,
    id: string,
    descriptors: readonly OptionDescriptor[],
    values: Readonly<Record<string, unknown>>,
    source: GraphtyErrorSource = "run",
): void {
    for (const option of descriptors) {
        const value = values[option.name];
        if (value === undefined || value === null) {
            continue;
        }

        if (ATTRIBUTE_TYPES.has(option.type) && typeof value === "string") {
            const target = option.on ?? "node";
            requireCarried(view, target, value, (facts) =>
                facts.run === undefined
                    ? `${id}: option "${option.name}" names ${target} attribute "${value}", which no ${target} carries; ${carriedList(facts)}.`
                    : `${id}: option "${option.name}" reads ${value}, but no completed run is named "${facts.run}"; ` +
                      `run the algorithm that produces it first, with { as: "${facts.run}" }.`,
            );
        }

        if (option.type === "node-id") {
            requireNode(view, id, option.name, value as NodeId, source);
        }

        if (option.type === "node-set" && Array.isArray(value)) {
            for (const node of value as NodeId[]) {
                requireNode(view, id, option.name, node, source);
            }
        }
    }
}

/**
 * Refuse a node id the graph does not have.
 * @param view - The view.
 * @param id - The extension's id.
 * @param option - The option's name.
 * @param node - The id it named.
 * @param source - Which area of the element the refusal names.
 */
function requireNode(view: GraphView, id: string, option: string, node: NodeId, source: GraphtyErrorSource): void {
    if (view.node(node) === undefined) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `${id}: option "${option}" names node ${quoteId(node)}, which the graph does not have.`,
            source,
            details: { extension: id, option, node },
        });
    }
}
