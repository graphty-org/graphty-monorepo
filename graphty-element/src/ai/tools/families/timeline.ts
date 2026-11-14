/**
 * @file `time` and `conditions`: moving through time, and filters kept as switchable rows. Both sit
 * beside `filter`, which replaces the one filter; a condition keeps its rule while it is switched
 * off, and a window moves along the designated time field.
 */

import { z } from "zod";

import type { FilterStep, RuleTree } from "../../../catalog/types";
import type { TimeField, TimeSettings, TimeWindowInput } from "../../../session/time/TimeApi";
import type { TransactionScope } from "../../../session/types";
import { MAX_ITEMS, MAX_SELECTOR, MAX_STRING, requireTarget, targetFields, text } from "../fields";
import type { ActionResult, ActionSpec, ToolDefinition } from "../types";
import { coded, ok } from "./common";
import { ruleOf } from "./filter";

const step = z
    .union([z.number().positive(), z.enum(["hour", "day", "week", "month", "quarter", "year"])])
    .optional()
    .describe("A step: a unit, or milliseconds.");
const mode = z.enum(["sliding", "cumulative"]).optional().describe("Both ends move, or only the end.");
const bound = z
    .union([z.number(), z.string().max(MAX_STRING)])
    .optional()
    .describe("An instant or a date.");
const on = z.enum(["node", "edge"]).optional().describe("Default node.");

/**
 * Where the window stands now, for a result.
 * @param tx - The session.
 * @returns The facts.
 */
function windowFacts(tx: TransactionScope): ActionResult {
    return ok({ window: tx.time.current, atStart: tx.time.atStart, atEnd: tx.time.atEnd });
}

/** The `time` tool. */
export const timeTool: ToolDefinition = {
    name: "time",
    plainName: "Time",
    core: false,
    description: "Moves a window along the graph's time field: name the field, then window, step, seek or play.",
    example: { action: "set_field", column: "sent" },
    actions: [
        {
            name: "status",
            summary: "the field, the span, the window, the columns that read as time",
            fields: {},
            effect: "read",
            reaches: [
                { door: "TimeApi.ready" },
                { door: "TimeApi.field" },
                { door: "TimeApi.extent" },
                { door: "TimeApi.bins" },
                { door: "TimeApi.candidates" },
                { door: "TimeApi.changes" },
                { door: "TimeApi.notices" },
                { door: "TimeApi.current" },
                { door: "TimeApi.atStart" },
                { door: "TimeApi.atEnd" },
                { door: "TimeApi.settings" },
                { door: "TimeApi.mode" },
                { door: "TimeApi.interval" },
                { door: "TimeApi.playing" },
            ],
            run: async ({ tx }) => {
                await tx.time.ready;
                return ok({
                    field: tx.time.field,
                    extent: tx.time.extent(),
                    bins: tx.time.bins(),
                    candidates: tx.time.candidates(),
                    changes: tx.time.changes(),
                    notices: tx.time.notices(),
                    window: tx.time.current,
                    atStart: tx.time.atStart,
                    atEnd: tx.time.atEnd,
                    settings: tx.time.settings,
                    mode: tx.time.mode,
                    interval: tx.time.interval,
                    playing: tx.time.playing,
                });
            },
        },
        {
            name: "set_field",
            summary: "name the time column; none clears it",
            fields: {
                column: z.string().max(200).optional().describe("The column; absent clears the field."),
                on,
            },
            effect: "write",
            reaches: [{ door: "TimeApi.setField" }, { op: "config.set" }],
            run: async ({ tx }, args) => {
                const source = { start: text(args.column) };
                const named: TimeField = args.on === "edge" ? { edges: source } : { nodes: source };
                return ok(await coded(() => tx.time.setField(args.column === undefined ? null : named)));
            },
        },
        {
            name: "settings",
            summary: "how windows move; only the settings given change",
            fields: {
                mode,
                step,
                results: z.enum(["keep", "stale", "rerun"]).optional().describe("What a move does to finished runs."),
                missing: z.enum(["inside", "outside"]).optional().describe("Where an element with no time goes."),
                outside: z.enum(["hide", "ghost"]).optional().describe("How elements outside the window draw."),
            },
            effect: "write",
            reaches: [{ door: "TimeApi.setSettings" }, { op: "visibility.playback" }, { op: "style.patch" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.time.setSettings(args as Partial<TimeSettings>));
                return ok(tx.time.settings);
            },
        },
        {
            name: "window",
            summary: "set the window; a bound left out stays",
            fields: { from: bound, to: bound, step, mode },
            effect: "write",
            reaches: [{ door: "TimeApi.window" }, { op: "visibility.window" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.time.window(args as TimeWindowInput));
                return windowFacts(tx);
            },
        },
        {
            name: "step",
            summary: "move by whole steps; negative goes back",
            fields: { count: z.number().int().min(-1000).max(1000).describe("How many steps.") },
            effect: "write",
            reaches: [{ door: "TimeApi.stepBy" }, { op: "visibility.window" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.time.stepBy(args.count as number));
                return windowFacts(tx);
            },
        },
        {
            name: "seek",
            summary: "go to an instant, the start or the end",
            fields: {
                instant: z.union([z.number(), z.enum(["start", "end"])]).describe("Milliseconds, start or end."),
            },
            effect: "write",
            reaches: [{ door: "TimeApi.seek" }, { op: "visibility.window" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.time.seek(args.instant as number | "start" | "end"));
                return windowFacts(tx);
            },
        },
        {
            name: "play",
            summary: "advance the window by itself",
            fields: {
                interval: z.number().int().min(50).max(3_600_000).optional().describe("Milliseconds per step."),
                loop: z.boolean().optional().describe("Start again at the end."),
            },
            effect: "exempt",
            reaches: [{ door: "TimeApi.play" }],
            run: async ({ tx }, args) => {
                await coded(() => {
                    tx.time.play({
                        ...(args.interval === undefined ? {} : { interval: args.interval as number }),
                        ...(args.loop === undefined ? {} : { loop: args.loop as boolean }),
                    });
                });
                return ok(undefined, { playing: tx.time.playing });
            },
        },
        {
            name: "pause",
            summary: "",
            fields: {},
            effect: "exempt",
            reaches: [{ door: "TimeApi.pause" }],
            run: async ({ tx }) => {
                await coded(() => {
                    tx.time.pause();
                });
                return ok(undefined, { playing: tx.time.playing });
            },
        },
    ] satisfies ActionSpec[],
};

/**
 * The rule a call's target means.
 * @param tx - The session.
 * @param args - The call.
 * @returns The rule.
 */
function ruleFrom(tx: TransactionScope, args: Record<string, unknown>): RuleTree {
    const kind = args.on === "edge" ? "edge" : "node";
    return ruleOf(requireTarget(tx, args, kind).target, kind);
}

const conditionId = z.string().max(200).describe("The condition's id.");
const effect = z.enum(["keep", "exclude", "select"]);

/** The `conditions` tool. */
export const conditionsTool: ToolDefinition = {
    name: "conditions",
    plainName: "Filter conditions",
    core: false,
    description:
        "Filters kept as rows a reader can switch off without losing them: keep, exclude or select what a target matches.",
    example: { action: "add", where: "data.weight > `0.5`", effect: "keep" },
    actions: [
        {
            name: "list",
            summary: "the conditions, what each matches, and the steps",
            fields: {},
            effect: "read",
            reaches: [
                { door: "VisibilityApi.conditions" },
                { door: "VisibilityApi.conditionCounts" },
                { door: "VisibilityApi.steps" },
            ],
            run: ({ tx }) =>
                Promise.resolve(
                    ok({
                        conditions: tx.visibility.conditions,
                        counts: tx.visibility.conditionCounts(),
                        steps: tx.visibility.steps,
                    }),
                ),
        },
        {
            name: "add",
            summary: "",
            fields: { ...targetFields, on, effect: effect.optional().describe("Default keep.") },
            effect: "write",
            reaches: [{ door: "VisibilityApi.addCondition" }, { op: "visibility.conditions" }],
            run: async ({ tx }, args) => {
                const rule = ruleFrom(tx, args);
                const added = await coded(() =>
                    tx.visibility.addCondition({ effect: (args.effect as "keep" | undefined) ?? "keep", rule }),
                );
                return ok(undefined, { id: added.id });
            },
        },
        {
            name: "update",
            summary: "switch one on or off, or change what it does",
            fields: {
                id: conditionId,
                enabled: z.boolean().optional().describe("false keeps the rule and does nothing."),
                effect: effect.optional().describe("What it does."),
            },
            effect: "write",
            reaches: [{ door: "VisibilityApi.updateCondition" }, { op: "visibility.conditions" }],
            run: async ({ tx }, args) => {
                await coded(() =>
                    tx.visibility.updateCondition(text(args.id), {
                        ...(args.enabled === undefined ? {} : { on: args.enabled as boolean }),
                        ...(args.effect === undefined ? {} : { effect: args.effect as "keep" }),
                    }),
                );
                return ok(undefined, { id: text(args.id) });
            },
        },
        {
            name: "remove",
            summary: "",
            fields: { id: conditionId },
            effect: "write",
            reaches: [{ door: "VisibilityApi.removeCondition" }, { op: "visibility.conditions" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.visibility.removeCondition(text(args.id)));
                return ok(undefined, { id: text(args.id) });
            },
        },
        {
            name: "clear",
            summary: "",
            fields: {},
            effect: "write",
            reaches: [{ door: "VisibilityApi.setConditions" }, { op: "visibility.conditions" }],
            run: async ({ tx }) => {
                await coded(() => tx.visibility.setConditions([]));
                return ok();
            },
        },
        {
            name: "set_steps",
            summary: "replace the steps: rules applied in order, each narrowing the last",
            fields: {
                steps: z
                    .array(
                        z.strictObject({
                            id: z.string().max(200).describe("The step's id."),
                            where: z.string().max(MAX_SELECTOR).describe("What it keeps."),
                            enabled: z.boolean().optional().describe("Default true."),
                        }),
                    )
                    .max(MAX_ITEMS)
                    .describe("The steps, in order."),
            },
            effect: "write",
            reaches: [{ door: "VisibilityApi.setSteps" }, { op: "visibility.steps" }],
            run: async ({ tx }, args) => {
                const given = args.steps as { id: string; where: string; enabled?: boolean }[];
                const steps: FilterStep[] = given.map((row) => ({
                    id: row.id,
                    on: row.enabled ?? true,
                    rule: ruleFrom(tx, { where: row.where }),
                }));
                await coded(() => tx.visibility.setSteps(steps));
                return ok(undefined, { steps: steps.length });
            },
        },
    ] satisfies ActionSpec[],
};
