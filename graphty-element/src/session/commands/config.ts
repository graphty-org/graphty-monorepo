/**
 * @file `config.set`: change project settings, one undoable step per call.
 *
 * The project settings are the keys of the `config` slice, one key per leaf, named by its dotted
 * path: every leaf of the zod `DataConfig` schema under `data.` (the id, label, weight and time
 * paths, the repeated-edge policy, the position scale, the id coercion, the on-load algorithms and
 * the direction), whether the on-load algorithms run, the background, the selection style, and
 * three layout-behaviour keys, the author stamped on notes, and the project's name. The `DataConfig` leaves are read from the schema when this module
 * loads, so a field added there joins the slice without an edit here.
 *
 * The slice holds only what has been set, as the caller gave it; a key that is absent reads as
 * its default. Setting a key to `undefined` removes it, which returns it to its default.
 * Everything else a graph is configured with -- the camera distance, the view mode, the
 * interaction and throughput preferences -- is not saved in a project file, is not a key here,
 * and `config.set` refuses it. See design/undo/undo-design.md sections 3.1, 3.2 and 10.1.
 */

import { z } from "zod/v4";

import { DataConfig } from "../../config/DataConfig";
import { GraphBehaviorOpts } from "../../config/GraphBehavior";
import { type GraphBackgroundConfig, type GraphSelectionStyleConfig, GraphStyle } from "../../config/GraphStyle";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";
import { deepFreeze } from "../project/draft";
import { deepEquals } from "../styles/predicate";
import type { ProjectConfig, ProjectConfigPatch, SessionDataConfig } from "../types";

/** `config.set`: write project settings. */
export interface ConfigSetCommand {
    readonly op: "config.set";
    readonly values: ProjectConfigPatch;
}

/** Which part of the project settings a key belongs to: the discriminant of `config.set`. */
type ConfigGroup =
    | "data"
    | "runAlgorithmsOnLoad"
    | "background"
    | "selectionStyle"
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
function unwrap(schema: z.ZodType): z.ZodType {
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

/**
 * Whether a value is a plain object, which a patch recurses into.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * The error of a patch that names something that is not a project setting, or a value a setting
 * cannot take.
 * @param message - What is wrong.
 * @param details - The key and value.
 * @param cause - The schema's own complaint, when there is one.
 * @returns The error.
 */
function badPatch(message: string, details: Readonly<Record<string, unknown>>, cause?: unknown): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "config",
        details,
        ...(cause === undefined ? {} : { cause }),
    });
}

/**
 * The leaves a patch writes, checked: every path is a key of the slice, and every value one the
 * key takes. Plain objects are recursed into until a key is reached; a key's value is taken
 * whole.
 * @param values - The patch.
 * @returns Each key written and its value, `undefined` for a key returned to its default.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the first path that is not a project
 *     setting or the first value its key refuses. Nothing is written then.
 */
function configLeaves(values: ProjectConfigPatch): [string, unknown][] {
    const leaves: [string, unknown][] = [];
    const visit = (given: unknown, path: string): void => {
        // `null` clears the author or the name, and one that is empty or only white space is none.
        const value =
            (path === "author" || path === "name") &&
            (given === null || (typeof given === "string" && !/\S/u.test(given)))
                ? undefined
                : given;
        const key = CONFIG_KEYS.get(path);
        if (key !== undefined) {
            if (value !== undefined) {
                const parsed = key.schema.safeParse(value);
                if (!parsed.success) {
                    throw badPatch(
                        `${JSON.stringify(value)} is not a value the setting "${path}" takes: ${parsed.error.issues[0]?.message ?? "refused"}.`,
                        { key: path, value },
                        parsed.error,
                    );
                }
            }

            leaves.push([path, value]);
            return;
        }

        const within = path === "" ? "" : `${path}.`;
        if (!isPlainObject(value) || ![...CONFIG_KEYS.keys()].some((each) => each.startsWith(within))) {
            throw badPatch(
                `"${path}" is not a project setting, so config.set cannot change it. The settings are: ${[...CONFIG_KEYS.keys()].join(", ")}.`,
                { key: path },
            );
        }

        for (const [name, child] of Object.entries(value)) {
            visit(child, `${within}${name}`);
        }
    };

    visit(values, "");
    return leaves;
}

/**
 * The step's name: the one setting it changed, or how many.
 * @param command - The command.
 * @returns The label.
 */
function labelOf(command: ConfigSetCommand): string {
    const keys = configLeaves(command.values).map(([path]) => path);
    return keys.length === 1 ? `Changed the setting "${keys[0]}"` : `Changed ${keys.length} settings`;
}

const configSet: UndoableDefinition<ConfigSetCommand> = {
    op: "config.set",
    moves: false,
    // The background and the selection highlight are drawn.
    draws: true,
    // One round-trip fixture per group of keys.
    variants: [...new Set([...CONFIG_KEYS.values()].map((key) => key.group))],
    lane: { kind: "immediate" },
    keys: (command) => configLeaves(command.values).map(([path]) => `config/${path}`),
    undo: {
        kind: "undoable",
        label: labelOf,
        // Dragging a colour picker is one step: sets of the same keys recorded close together merge.
        coalesce: (command) =>
            `config:${configLeaves(command.values)
                .map(([path]) => path)
                .sort()
                .join(",")}`,
    },
    execute: (command, ctx) => {
        const effective = ctx.services.config?.();
        for (const [path, value] of configLeaves(command.values)) {
            if (effective !== undefined && value !== undefined && !ctx.state.config.has(path)) {
                // An unset key already reads as its default: writing that default changes nothing.
                const current = path
                    .split(".")
                    .reduce<unknown>((at, name) => (at as Record<string, unknown> | undefined)?.[name], effective);
                if (deepEquals(CONFIG_KEYS.get(path)?.schema.parse(value), current)) {
                    continue;
                }
            }

            if (value === undefined) {
                ctx.draft.config.delete(path);
            } else {
                ctx.draft.config.set(path, value);
            }
        }
    },
};

/**
 * The project settings a slice holds, with every absent key at its default.
 * @param slice - The `config` slice.
 * @param base - The data configuration an absent `data.` key reads from: the element's defaults,
 *     or what a headless session was built with.
 * @returns The settings, frozen.
 */
export function readProjectConfig(slice: ReadonlyMap<string, unknown>, base: SessionDataConfig): ProjectConfig {
    // The parsed values are fresh objects, so freezing them reaches nothing the caller holds.
    const read = (path: string): unknown => deepFreeze(CONFIG_KEYS.get(path)?.schema.parse(slice.get(path)));
    const data: Record<string, unknown> = { ...base, knownFields: { ...base.knownFields } };
    for (const path of CONFIG_KEYS.keys()) {
        if (path.startsWith("data.") && slice.has(path)) {
            const [, first, second] = path.split(".");
            if (second === undefined) {
                data[first] = read(path);
            } else {
                (data[first] as Record<string, unknown>)[second] = read(path);
            }
        }
    }

    Object.freeze(data.knownFields);
    const author = slice.get("author");
    const name = slice.get("name");
    return Object.freeze({
        data: Object.freeze(data) as SessionDataConfig,
        runAlgorithmsOnLoad: read("runAlgorithmsOnLoad") as boolean,
        background: read("background") as GraphBackgroundConfig,
        selectionStyle: read("selectionStyle") as GraphSelectionStyleConfig,
        layoutBehavior: Object.freeze({
            preSteps: read("layoutBehavior.preSteps") as number,
            stepMultiplier: read("layoutBehavior.stepMultiplier") as number,
            minDelta: read("layoutBehavior.minDelta") as number,
        }),
        ...(typeof author === "string" ? { author } : {}),
        ...(typeof name === "string" ? { name } : {}),
    });
}

/** The config op's definition. */
export const CONFIG_DEFINITIONS = [configSet] as const;
