/**
 * @file The keys of the project settings `config.set` writes, one per leaf, named by its dotted
 * path, each with its group and its schema: every leaf of the zod `DataConfig` schema under
 * `data.`, whether the on-load algorithms run, the background, the selection style, the pinned style, the starting rows, the run placement, three
 * layout-behaviour keys, the author stamped on notes, and the project's name. Kept apart from the
 * command so a reader of the settings (the assistant's `project` tool) loads the schemas alone.
 */

import { z } from "zod";

import { DataConfig } from "../config/DataConfig";
import { GraphBehaviorOpts } from "../config/GraphBehavior";
import { GraphStyle } from "../config/GraphStyle";

/** Which part of the project settings a key belongs to: the discriminant of `config.set`. */
export type ConfigGroup =
    | "data"
    | "runAlgorithmsOnLoad"
    | "background"
    | "selectionStyle"
    | "pinnedStyle"
    | "startingRows"
    | "runPlacement"
    | "layoutBehavior"
    | "author"
    | "name";

/** One key of the `config` slice. */
interface ConfigKey {
    readonly group: ConfigGroup;
    /** Validates a value set, and reads a stored value (or `undefined`) as the setting. */
    readonly schema: z.ZodType;
}

/**
 * Strip the default, prefault and optional wrappers off a schema.
 * @param schema - The schema.
 * @returns The schema inside them.
 */
export function unwrap(schema: z.ZodType): z.ZodType {
    let inner = schema;
    while ("innerType" in inner.def) {
        inner = inner.def.innerType as z.ZodType;
    }

    return inner;
}

/**
 * Every leaf of an object schema, by dotted path.
 * @param shape - The object's shape.
 * @param prefix - The path of the object.
 * @returns The leaves and their schemas.
 */
function leavesOf(shape: Readonly<Record<string, z.ZodType>>, prefix: string): [string, z.ZodType][] {
    return Object.entries(shape).flatMap(([name, schema]): [string, z.ZodType][] => {
        const inner = unwrap(schema);
        return inner instanceof z.ZodObject
            ? leavesOf(inner.shape, `${prefix}${name}.`)
            : [[`${prefix}${name}`, schema]];
    });
}

const LAYOUT = unwrap(GraphBehaviorOpts.shape.layout) as z.ZodObject;

/** Every key of the `config` slice, with its group and schema. */
export const CONFIG_KEYS: ReadonlyMap<string, ConfigKey> = new Map<string, ConfigKey>([
    ...leavesOf(DataConfig.shape, "data.").map(([path, schema]): [string, ConfigKey] => [
        path,
        { group: "data", schema },
    ]),
    ["runAlgorithmsOnLoad", { group: "runAlgorithmsOnLoad", schema: z.boolean().default(false) }],
    ["background", { group: "background", schema: GraphStyle.shape.background }],
    ["selectionStyle", { group: "selectionStyle", schema: unwrap(GraphStyle.shape.selection).prefault({}) }],
    // Unset by default: set, the starting rows gain the Pinned row, drawing this halo.
    ["pinnedStyle", { group: "pinnedStyle", schema: unwrap(GraphStyle.shape.selection) }],
    ["startingRows", { group: "startingRows", schema: z.boolean().default(false) }],
    // The base look's home goes with the starting rows: one round-trip fixture covers both.
    ["editableBase", { group: "startingRows", schema: z.boolean().default(false) }],
    ["runPlacement", { group: "runPlacement", schema: z.enum(["beneath", "top"]).default("beneath") }],
    ...(["preSteps", "stepMultiplier", "minDelta"] as const).map((name): [string, ConfigKey] => [
        `layoutBehavior.${name}`,
        { group: "layoutBehavior", schema: LAYOUT.shape[name] as z.ZodType },
    ]),
    // Who is writing, stamped on each note. Never blank: a blank name is written as no name.
    [
        "author",
        {
            group: "author",
            schema: z.string().refine((name) => Array.from(name).length <= 256, "An author is at most 256 characters."),
        },
    ],
    // The project's name, which a project file carries. Never blank, as the author.
    [
        "name",
        {
            group: "name",
            schema: z.string().refine((name) => Array.from(name).length <= 256, "A name is at most 256 characters."),
        },
    ],
]);
