/**
 * @file `style`: every style operation as one tool. A literal style is a layer whose `values` are
 * checked channel by channel against the element's own channel table; an encoding binds a channel
 * to an attribute or a run; a run's suggestion is the run's own picture.
 */

import { z } from "zod";

import type { Channel, LayerSource, LayerSpec, Selector, StaticStyle } from "../../../catalog/types";
import type { ChannelDescriptor } from "../../../session/styles/channels";
import type { Layer } from "../../../session/styles/Layer";
import type { TransactionScope } from "../../../session/types";
import {
    attributeNames,
    idsOf,
    MAX_STRING,
    requireTarget,
    resolveNode,
    resolveRun,
    settleTarget,
    type Target,
    targetFields,
    text,
} from "../fields";
import { optionsSchema } from "../optionSchema";
import { suggest } from "../search";
import { toJson } from "../shape";
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
    type JsonObject,
    type ToolDefinition,
    ToolRefusal,
} from "../types";
import { coded, codedNow, ok, requireEntry } from "./common";

/** The plugin name the assistant records as the source of every layer it adds. */
const ASSISTANT_SOURCE_NAME = "graphty-ai";

/** What the assistant records as the source of every layer it adds. */
export const ASSISTANT_LAYER_SOURCE: LayerSource = { by: "plugin", name: ASSISTANT_SOURCE_NAME };

/**
 * Whether a layer is the assistant's own.
 * @param source - The layer's source.
 * @returns True for a layer the assistant added.
 */
function isAssistantLayer(source: LayerSource): boolean {
    return source.by === "plugin" && source.name === ASSISTANT_SOURCE_NAME;
}

/**
 * A value for one channel, checked against what the channel accepts.
 * @param descriptor - The channel.
 * @returns Its schema.
 */
function channelValue(descriptor: ChannelDescriptor): z.ZodType {
    switch (descriptor.accepts) {
        case "number": {
            let number = z.number();
            if (descriptor.min !== undefined) {
                number = number.min(descriptor.min);
            }

            if (descriptor.max !== undefined) {
                number = number.max(descriptor.max);
            }

            return number;
        }

        case "boolean":
            return z.boolean();
        case "enum":
            return z.enum((descriptor.values ?? []) as [string, ...string[]]);
        case "labelStyle":
            return z.record(z.string(), z.unknown());
        case "color":
        case "text":
            return z.string().max(MAX_STRING);
        default:
            return z.never();
    }
}

/**
 * A channel name as a model may misspell it: `node_size` or `nodeSize` for `node.size`, any case.
 * An unambiguous spelling becomes the channel's own; anything else is left for the refusal.
 * @param written - The key as written.
 * @param names - The channels.
 * @returns The channel's name, or the key as written.
 */
function channelSpelling(written: string, names: readonly string[]): string {
    if (names.includes(written)) {
        return written;
    }

    const flat = (name: string): string => name.replace(/[._\s-]/g, "").toLowerCase();
    const matches = names.filter((name) => flat(name) === flat(written));
    return matches.length === 1 ? matches[0] : written;
}

/**
 * Flatten `{ node: { color: "red" } }` to `{ "node.color": "red" }`, and check each channel.
 * @param values - The values as written.
 * @param channels - The channel table.
 * @returns The literal style, and whether it paints nodes or edges.
 * @throws {ToolRefusal} For an unknown channel, a bad value, or one call mixing nodes and edges.
 */
export function checkValues(
    values: Record<string, unknown>,
    channels: readonly ChannelDescriptor[],
): { set: StaticStyle; target: "node" | "edge" } {
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
        if (
            (key === "node" || key === "edge") &&
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            for (const [inner, innerValue] of Object.entries(value as Record<string, unknown>)) {
                flat[`${key}.${inner}`] = innerValue;
            }
        } else {
            flat[key] = value;
        }
    }

    const names = channels.map((channel) => channel.channel);
    const set: Partial<Record<Channel, unknown>> = {};
    const targets = new Set<"node" | "edge">();
    for (const [written, value] of Object.entries(flat)) {
        const key = channelSpelling(written, names);
        const descriptor = channels.find((channel) => channel.channel === key);
        if (descriptor === undefined) {
            throw new ToolRefusal("AI_UNKNOWN_ENTRY", { kind: "channel", name: key, didYouMean: suggest(key, names) });
        }

        if (!descriptor.renderable) {
            throw new ToolRefusal("AI_NOT_AVAILABLE", { name: key, requirement: "not-drawn" });
        }

        const parsed = channelValue(descriptor).safeParse(value);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const range = issue.code === "too_big" || issue.code === "too_small";
            throw new ToolRefusal(range ? "AI_ARG_OUT_OF_RANGE" : "AI_ARG_INVALID", {
                path: `values.${key}`,
                expected: descriptor.accepts,
                ...(descriptor.values === undefined ? {} : { allowed: [...descriptor.values] }),
                ...(descriptor.min === undefined ? {} : { min: descriptor.min }),
                ...(descriptor.max === undefined ? {} : { max: descriptor.max }),
            });
        }

        set[descriptor.channel] = parsed.data;
        targets.add(descriptor.target);
    }

    if (targets.size === 0) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "values", expected: "at least one channel value" });
    }

    if (targets.size > 1) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "values", expected: "node.* or edge.* channels, not both" });
    }

    return { set: set as StaticStyle, target: [...targets][0] };
}

/**
 * The selector a target means for a layer.
 * @param target - The target.
 * @param kind - Nodes or edges.
 * @returns The selector.
 */
function selectorOf(target: Target, kind: "node" | "edge"): Selector {
    if (target.kind === "all") {
        return { match: "everything" };
    }

    if (target.kind === "where") {
        return { match: "expression", where: target.where };
    }

    return kind === "node" ? { match: "ids", nodes: target.ids } : { match: "ids", edges: target.ids };
}

/**
 * The layer a call names: by id, or by a unique name.
 * @param tx - The session.
 * @param name - The id or name.
 * @returns The layer.
 */
function layerOf(tx: TransactionScope, name: unknown): Layer {
    const wanted = text(name);
    const layers = tx.styles.list();
    const found = layers.find((layer) => layer.id === wanted) ?? layers.filter((layer) => layer.name === wanted).at(-1);
    if (found === undefined) {
        throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
            kind: "layer",
            name: wanted,
            didYouMean: suggest(
                wanted,
                layers.map((layer) => layer.name),
            ),
        });
    }

    return found;
}

/**
 * Refuse a layer the style stack would refuse, with its codes.
 * @param tx - The session.
 * @param spec - The layer.
 * @returns The paths nothing answers yet, as a fact.
 */
function validate(tx: TransactionScope, spec: LayerSpec): JsonObject {
    const verdict = tx.styles.validate(spec);
    if (!verdict.ok) {
        const problem = verdict.errors[0];
        const code = problem.code === "E_BAD_SELECTOR" ? "AI_BAD_SELECTOR" : problem.code;
        throw new ToolRefusal(code, {
            path: problem.path ?? "values",
            ...(problem.candidates === undefined ? {} : { didYouMean: [...problem.candidates].slice(0, 5) }),
            ...(spec.selector.match === "expression" ? { where: spec.selector.where } : {}),
        });
    }

    return verdict.unresolvedPaths.length === 0 ? {} : { unresolved: [...verdict.unresolvedPaths] };
}

/**
 * Where a call puts a layer.
 * @param tx - The session.
 * @param args - The call.
 * @returns The position, or undefined for the top.
 */
function positionOf(
    tx: TransactionScope,
    args: Record<string, unknown>,
): { above?: string; below?: string } | undefined {
    const position = args.position as string | undefined;
    if (position === undefined || position === "top") {
        return undefined;
    }

    const layers = tx.styles.list();
    if (position === "bottom") {
        const lowest = layers.find((layer) => layer.source.by !== "element");
        return lowest === undefined ? undefined : { below: lowest.id };
    }

    const relative = layerOf(tx, args.relativeTo);
    return position === "above" ? { above: relative.id } : { below: relative.id };
}

/**
 * Add a literal style layer.
 * @param context - The action's context.
 * @param args - The call.
 * @param catalog - The catalog, for the channel table.
 * @returns The layer.
 */
async function addLayer(
    context: ActionContext,
    args: Record<string, unknown>,
    catalog: CatalogView,
): Promise<ActionResult> {
    const { tx } = context;
    const { set, target: kind } = checkValues((args.values ?? {}) as Record<string, unknown>, catalog.channels);
    const { target, notes } = requireTarget(tx, args, kind);

    if (target.kind !== "all" && idsOf(tx, target, kind, 0).total === 0) {
        throw new ToolRefusal("AI_EMPTY_MATCH", {
            where: target.kind === "where" ? target.where : target.ids.join(","),
            nodes: 0,
            edges: 0,
        });
    }

    const spec: LayerSpec = {
        name: typeof args.name === "string" && args.name !== "" ? args.name : `assistant ${kind} style`,
        target: kind,
        kind: "custom",
        source: ASSISTANT_LAYER_SOURCE,
        selector: selectorOf(target, kind),
        set,
    };
    const facts = validate(tx, spec);
    const layer = await coded(() => tx.styles.add(spec, positionOf(tx, args)));
    return ok({ layer: layer.id, name: layer.name }, { ...notes, ...facts, layer: layer.id }, "style.add-layer");
}

/**
 * Bind a channel to an attribute or a run's result.
 * @param context - The action's context.
 * @param args - The call.
 * @param catalog - The catalog.
 * @returns The layer.
 */
async function encode(
    context: ActionContext,
    args: Record<string, unknown>,
    catalog: CatalogView,
): Promise<ActionResult> {
    const { tx } = context;
    const spec = (args.encode ?? {}) as {
        channel: string;
        attribute?: string;
        run?: string;
        field?: string;
        palette?: string;
        scale?: string;
        domain?: [number, number];
        missing?: string;
        scaleOptions?: Record<string, unknown>;
    };
    const channel = requireEntry(
        "channel",
        spec.channel,
        catalog.channels.map((each) => each.channel),
    ) as Channel;
    if (spec.palette !== undefined) {
        requireEntry(
            "palette",
            spec.palette,
            catalog.palettes.map((each) => each.id),
        );
    }

    let scaleOptions: Record<string, unknown> = {};
    if (spec.scale !== undefined) {
        requireEntry(
            "scale",
            spec.scale,
            catalog.scales.map((each) => each.name),
        );
        const scale = catalog.scales.find((each) => each.name === spec.scale);
        const parsed = optionsSchema(scale?.options ?? []).schema.safeParse(spec.scaleOptions ?? {});
        if (!parsed.success) {
            throw new ToolRefusal("AI_ARG_INVALID", { path: "encode.scaleOptions", expected: "the scale's options" });
        }

        scaleOptions = parsed.data;
    }

    const kind = channel.startsWith("node.") ? "node" : "edge";
    let path: string;
    let source: { run: string; field?: string } | { column: { kind: "node" | "edge"; name: string } };
    if (spec.run !== undefined) {
        const run = resolveRun(tx, spec.run);
        source = { run, ...(spec.field === undefined ? {} : { field: spec.field }) };
        path = tx.results.path(run, spec.field);
    } else if (spec.attribute !== undefined) {
        const name = spec.attribute.replace(/^data\./, "");
        if (!attributeNames(tx, kind).includes(name)) {
            throw new ToolRefusal("AI_UNKNOWN_COLUMN", {
                name,
                on: kind,
                didYouMean: suggest(name, attributeNames(tx, kind)),
            });
        }

        source = { column: { kind, name } };
        path = `data.${name}`;
    } else {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "encode", expected: "attribute, or run and field" });
    }

    const binding = {
        ...(spec.palette === undefined ? {} : { palette: spec.palette }),
        ...(spec.scale === undefined ? {} : { scale: spec.scale }),
        ...(spec.domain === undefined ? {} : { domain: spec.domain }),
        ...(spec.missing === undefined ? {} : { missing: { value: spec.missing } }),
    };
    let layer: Layer;
    if (Object.keys(scaleOptions).every((key) => key === "reverse")) {
        layer = await coded(() =>
            tx.styles.encode({
                ...source,
                channel,
                ...binding,
                ...scaleOptions,
                ...(typeof args.name === "string" ? { name: args.name } : {}),
            }),
        );
    } else {
        // `styles.encode` takes no bins, midpoint or exponent; a layer's own binding does. Scoped to
        // the elements carrying the value, as an encoding is.
        const spec2: LayerSpec = {
            name: typeof args.name === "string" ? args.name : `assistant ${channel}`,
            target: kind,
            kind: "encoding",
            source: ASSISTANT_LAYER_SOURCE,
            selector: { match: "has", path },
            encode: { [channel]: { by: path, ...binding, ...scaleOptions } },
        };
        validate(tx, spec2);
        layer = await coded(() => tx.styles.add(spec2));
    }

    return ok({ layer: layer.id, name: layer.name }, { layer: layer.id }, "style.encode");
}

const values = z
    .record(z.string().max(100), z.unknown())
    .optional()
    .describe('e.g. {"node.color": "red", "node.size": 2}; channels: catalog search.');
const layer = z.string().max(MAX_STRING).optional().describe("Layer id or name.");
const name = z.string().max(200).optional().describe("The layer's name.");
const position = z.enum(["top", "bottom", "above", "below"]).optional().describe("Where in the stack.");
const relativeTo = z.string().max(MAX_STRING).optional().describe("Layer for above or below.");

/**
 * The `style` tool for a catalog.
 * @param catalog - The catalog.
 * @returns The tool.
 */
export function styleTool(catalog: CatalogView): ToolDefinition {
    const encodeField = z
        .strictObject({
            channel: z.string().max(100).describe("Channel, e.g. node.color, node.size, edge.width."),
            attribute: z.string().max(200).optional(),
            run: z.string().max(200).optional().describe("Instead of attribute: a run and its field."),
            field: z.string().max(200).optional(),
            palette: z.string().max(100).optional().describe("catalog search kind palette"),
            scale: z.string().max(100).optional().describe("linear, log, sqrt, bins, ordinal..."),
            domain: z.array(z.number()).length(2).optional(),
            missing: z.string().max(200).optional().describe("Value where there is none."),
            scaleOptions: z.record(z.string(), z.unknown()).optional().describe("catalog describe kind scale"),
        })
        .optional()
        .describe("Bind a channel to data.");
    const actions: ActionSpec[] = [
        {
            name: "add",
            summary: "paint values on a target",
            fields: { ...targetFields, values, name, position, relativeTo: relativeTo },
            effect: "write",
            reaches: [
                { op: "style.patch" },
                { door: "StylesApi.add" },
                { door: "StylesApi.validate" },
                ...catalog.channels.map((channel) => ({ catalog: `channels/${channel.channel}` })),
            ],
            run: (context, args) => addLayer(context, args, catalog),
        },
        {
            name: "update",
            summary: "change a layer",
            fields: {
                layer,
                ...targetFields,
                values,
                name,
                enabled: z.boolean().optional().describe("false hides the layer's paint."),
            },
            effect: "write",
            reaches: [{ door: "StylesApi.update" }, { door: "StylesApi.get" }],
            run: async ({ tx }, args) => {
                const current = layerOf(tx, args.layer);
                const patch: Partial<LayerSpec> = {};
                if (args.values !== undefined) {
                    patch.set = checkValues(args.values as Record<string, unknown>, catalog.channels).set;
                }

                const { target, notes } = settleTarget(tx, args, current.target === "edge" ? "edge" : "node", false);
                if (target !== undefined) {
                    patch.selector = selectorOf(target, current.target === "edge" ? "edge" : "node");
                }

                if (typeof args.name === "string") {
                    patch.name = args.name;
                }

                if (typeof args.enabled === "boolean") {
                    patch.enabled = args.enabled;
                }

                const updated = await coded(() => tx.styles.update(current.id, patch));
                return ok({ layer: updated.id }, { ...notes, layer: updated.id });
            },
        },
        {
            name: "remove",
            summary: "",
            fields: { layer },
            effect: "write",
            reaches: [{ door: "StylesApi.remove" }],
            run: async ({ tx }, args) => {
                const target = layerOf(tx, args.layer);
                await coded(() => tx.styles.remove(target.id));
                return ok(undefined, { layer: target.id });
            },
        },
        {
            name: "move",
            summary: "reorder a layer",
            fields: { layer, position, relativeTo: relativeTo },
            effect: "write",
            reaches: [{ door: "StylesApi.move" }],
            run: async ({ tx }, args) => {
                const target = layerOf(tx, args.layer);
                const where = positionOf(tx, { ...args, position: args.position ?? "top" });
                const layers = tx.styles.list();
                let before: string | null = null;
                if (where?.below !== undefined) {
                    before = where.below;
                } else if (where?.above !== undefined) {
                    const index = layers.findIndex((each) => each.id === where.above);
                    before = layers[index + 1]?.id ?? null;
                }

                await coded(() => tx.styles.move(target.id, before));
                return ok(undefined, { layer: target.id });
            },
        },
        {
            name: "encode",
            summary: "color/size by data or a run",
            fields: { encode: encodeField, name },
            effect: "write",
            reaches: [
                { op: "style.encode" },
                { door: "StylesApi.encode" },
                { options: "scales" },
                ...catalog.palettes.map((each) => ({ catalog: `palettes/${each.id}` })),
                ...catalog.scales.map((each) => ({ catalog: `scales/${each.name}` })),
            ],
            run: (context, args) => encode(context, args, catalog),
        },
        {
            name: "apply_suggestion",
            summary: "a run's own styles",
            fields: { run: z.string().max(200).optional().describe('Run id, algorithm name or "latest".') },
            effect: "write",
            reaches: [{ door: "Run.suggestEncodings" }, { door: "RunsApi.start" }],
            run: async ({ tx }, args) => {
                const id = resolveRun(tx, text(args.run, "latest"));
                const run = tx.runs.get(id);
                if (run === undefined) {
                    throw new ToolRefusal("AI_UNKNOWN_RUN", { run: id, runs: [] });
                }

                const suggestions = run.suggestEncodings();
                if (suggestions.length === 0) {
                    throw new ToolRefusal("AI_NOT_AVAILABLE", { name: id, requirement: "no-suggestion" });
                }

                const again = codedNow(() =>
                    tx.runs.start(run.algorithm, run.params, { scope: run.scope.spec, applySuggestedStyles: true }),
                );
                await coded(async () => {
                    await again;
                });
                return ok({ suggestions: toJson(suggestions) }, { run: again.id });
            },
        },
        {
            name: "highlight",
            summary: "a run's path or edge set",
            fields: {
                run: z.string().max(200).optional().describe('Run id, algorithm name or "latest".'),
                field: z.string().max(200).optional().describe("The run's field; default its own."),
            },
            effect: "write",
            reaches: [{ door: "StylesApi.highlight" }],
            run: async ({ tx }, args) => {
                const run = resolveRun(tx, text(args.run, "latest"));
                const layers = await coded(() =>
                    tx.styles.highlight({ run, ...(typeof args.field === "string" ? { field: args.field } : {}) }),
                );
                return ok({ layers: layers.map((each) => each.id) }, { run });
            },
        },
        {
            name: "hide_value",
            summary: "hide a legend value",
            fields: {
                layer,
                channel: z.string().max(100).describe("The layer's channel."),
                value: z.union([z.string().max(MAX_STRING), z.number(), z.boolean()]).describe("The legend value."),
                hidden: z.boolean().describe("true hides it."),
            },
            effect: "write",
            reaches: [{ door: "StylesApi.setValueHidden" }],
            run: async ({ tx }, args) => {
                const target = layerOf(tx, args.layer);
                await coded(() =>
                    tx.styles.setValueHidden(
                        target.id,
                        args.channel as Channel,
                        args.value as string | number | boolean,
                        args.hidden === true,
                    ),
                );
                return ok(undefined, { layer: target.id });
            },
        },
        {
            name: "clear_mine",
            summary: "remove all your layers",
            fields: {},
            effect: "write",
            reaches: [{ door: "StylesApi.removeBySource" }],
            run: async ({ tx }) => {
                const removed = await coded(() => tx.styles.removeBySource(isAssistantLayer));
                return ok(undefined, { removed: removed.length });
            },
        },
        {
            name: "list",
            summary: "layers, bottom first",
            fields: {},
            effect: "read",
            reaches: [{ door: "StylesApi.list" }, { door: "StylesApi.counts" }],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        tx.styles.list().map((each) => ({
                            layer: each.id,
                            name: each.name,
                            target: each.target,
                            kind: each.kind,
                            by: each.source.by,
                            enabled: each.enabled,
                            mine: isAssistantLayer(each.source),
                        })),
                    ),
                ),
        },
        {
            name: "legend",
            summary: "what colors mean",
            fields: { layer },
            effect: "read",
            reaches: [{ door: "StylesApi.legend" }, { door: "StylesApi.legendOf" }],
            run: ({ tx }, args) =>
                Promise.resolve(
                    ok(args.layer === undefined ? tx.styles.legend() : tx.styles.legendOf(layerOf(tx, args.layer).id)),
                ),
        },
        {
            name: "explain",
            summary: "why an element looks so",
            fields: {
                node: z.string().max(MAX_STRING).optional().describe("Node id or label."),
                edge: z.string().max(MAX_STRING).optional().describe("Edge id."),
            },
            effect: "read",
            reaches: [{ door: "StylesApi.explain" }],
            run: ({ tx }, args) => {
                const target =
                    typeof args.edge === "string" ? { edge: args.edge } : { node: resolveNode(tx, text(args.node)) };
                return Promise.resolve(ok(tx.styles.explain(target)));
            },
        },
    ];
    return {
        name: "style",
        plainName: "Style",
        core: true,
        description: "Paints nodes and edges as layers: literal values (add) or by data (encode). To hide, use filter.",
        example: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
        actions,
    };
}
