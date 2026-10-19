/**
 * @file A run's result as a column of a record page: which run and field a column or a sort names,
 * and the value each record has there.
 *
 * A page names a result by the run, never by a path, so the run id never has to be known and a
 * column of imported data can never pose as a result. The values are read from the run's own
 * result, the same records a style layer's `results.<run>.<field>` reads, so a page and a layer
 * cannot disagree.
 */

import type { NodeId } from "@graphty/graph-format";

import { runIdOfRef } from "../../catalog/sets/canonical";
import type { EdgeId, Path, RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { Run } from "../runs/types";
import type { PageColumn, ResultCell, ResultColumn, ResultColumnDescriptor, ResultSort } from "../types";
import { nearestNames } from "./ResultsApi";
import { resultPath, resultShapeContract, type RunResult } from "./types";

/** Where a page looks runs up. */
interface PageRuns {
    /**
     * One run.
     * @param id - The run id.
     * @returns The run, or undefined when this session holds none with that id.
     */
    run(id: RunId): Run | undefined;
    /**
     * Every run id, for the candidates of an unknown one.
     * @returns The ids.
     */
    runIds(): readonly RunId[];
}

/** A result column or sort, resolved against the session's runs. */
export interface ResolvedResult {
    readonly run: RunId;
    readonly field: string;
    readonly path: Path;
    readonly type: PageColumn["type"];
    /** The run's result now, or undefined while it has none. */
    readonly result: RunResult | undefined;
}

/** The fields a grouping shape keys its groups by; they sort by group size, not by group id. */
const GROUPING_FIELDS = new Set(["group", "level"]);

/**
 * Whether a column names a field as well as a run.
 * @param ref - A run, or `{ run, field? }`.
 * @returns True for `{ run, field? }`.
 */
function isResultRef(ref: ResultColumn): ref is Exclude<ResultColumn, string | Run | RunResult> {
    return typeof ref === "object" && (ref as unknown) !== null && "run" in ref;
}

/**
 * Resolve a page's result column or result sort.
 * @param ref - The run, `{ run, field? }`, or a result sort.
 * @param target - Whether the page holds nodes or edges.
 * @param runs - Where runs are looked up.
 * @param verb - The verb, for the message.
 * @returns The run, the field, its path and type, and the result.
 * @throws A `GraphtyError` with `E_UNKNOWN_RUN` for a run this session does not hold,
 *   `E_UNKNOWN_ATTRIBUTE` for a field the run does not publish, or `E_BAD_COMMAND` for a field
 *   that has no value per record of this kind (a graph-level field, an edge field on a node page,
 *   a table) or a run with no primary field when none was named.
 */
export function resolveResult(
    ref: ResultColumn | ResultSort,
    target: "node" | "edge",
    runs: PageRuns,
    verb: string,
): ResolvedResult {
    const named = isResultRef(ref) ? ref : { run: ref };
    const wanted = runIdOfRef(named.run);
    const run = typeof wanted === "string" ? runs.run(wanted) : undefined;
    if (run === undefined) {
        const available = runs.runIds();
        const shown = String(wanted);
        // A path such as "results.pagerank.value" type-checks, because a string is a run id; name
        // the run it points at first, so the mistake is one lookup away from the fix.
        const pathRun = /^results\.([^.]+)/.exec(shown)?.[1];
        const pointed = pathRun !== undefined && available.includes(pathRun) ? [pathRun] : [];
        const hint = pointed.length > 0 ? ` A string names a run, not a path: pass "${pointed[0]}".` : "";
        throw new GraphtyError({
            code: "E_UNKNOWN_RUN",
            message: `data.${verb}() names a run this session does not hold: "${shown}".${hint}`,
            source: "data",
            details: {
                run: shown,
                available,
                candidates: [...new Set([...pointed, ...nearestNames(shown, available)])],
            },
        });
    }

    const field = named.field ?? resultShapeContract(run.shape).primaryField;
    if (field === null) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `Run "${run.id}" has no primary field; name the field to read.`,
            source: "data",
            details: { run: run.id, field: null },
        });
    }

    const fields = run.result?.fields ?? run.fields;
    const declared = fields.filter((candidate) => candidate.name === field);
    const perRecord = declared.find((candidate) => candidate.kind === target);
    if (perRecord === undefined) {
        if (declared.length === 0) {
            const names = fields.filter((candidate) => candidate.kind === target).map((candidate) => candidate.name);
            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                message: `Run "${run.id}" publishes no ${target} field named "${field}".`,
                source: "data",
                details: { run: run.id, field, kind: target, candidates: nearestNames(field, names) },
            });
        }

        const kind = declared[0]?.kind ?? "graph";
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `"${field}" of run "${run.id}" is a ${kind} field, not one per ${target}; read it from results.get(run).`,
            source: "data",
            details: { run: run.id, field, kind },
        });
    }

    if (perRecord.type === "table") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `"${field}" of run "${run.id}" is a table, not one value per ${target}; read it from results.get(run).`,
            source: "data",
            details: { run: run.id, field, kind: target, type: "table" },
        });
    }

    return { run: run.id, field, path: resultPath(run.id, field), type: perRecord.type, result: run.result };
}

/**
 * What a column naming only a run reads, when the run's primary field has one value per record of
 * the kind: the same rule {@link resolveResult} enforces, as an answer rather than a refusal.
 * @param run - The run.
 * @param target - Whether the page holds nodes or edges.
 * @returns The column, or undefined when a page of this kind refuses the run.
 */
export function primaryResultColumn(run: Run, target: "node" | "edge"): ResultColumnDescriptor | undefined {
    const field = resultShapeContract(run.shape).primaryField;
    const fields = run.result?.fields ?? run.fields;
    const perRecord = fields.find((candidate) => candidate.name === field && candidate.kind === target);
    if (field === null || perRecord === undefined || perRecord.type === "table") {
        return undefined;
    }

    return Object.freeze({
        run: run.id,
        field,
        path: resultPath(run.id, field),
        type: perRecord.type,
        grouping: GROUPING_FIELDS.has(field),
    });
}

/**
 * Read one record's cell.
 * @param resolved - The column.
 * @param target - Nodes or edges.
 * @param id - The record's id.
 * @returns The value, or undefined when the run has none for it.
 */
export function resultCell(resolved: ResolvedResult, target: "node" | "edge", id: NodeId | EdgeId): ResultCell {
    // ponytail: RunResult.node() builds a record per call; read the result's typed column by
    // dense index if a 50,000-row sort per revision shows up in a profile.
    const record = target === "node" ? resolved.result?.node(id) : resolved.result?.edge(id as EdgeId);
    const value = record?.[resolved.field];
    return typeof value === "number" || typeof value === "string" || typeof value === "boolean" ? value : undefined;
}

/**
 * Each group's place by size, from 1 for the largest, for a grouping field.
 * @param resolved - The column.
 * @returns The rank by group value, or undefined when the field is not a grouping one.
 */
function sizeRanks(resolved: ResolvedResult): ReadonlyMap<unknown, number> | undefined {
    const sizes = resolved.result?.graph.sizes;
    if (!GROUPING_FIELDS.has(resolved.field) || !Array.isArray(sizes)) {
        return undefined;
    }

    // `sizes` is largest first, ties broken as the summary and the legend break them.
    return new Map<unknown, number>(
        (sizes as readonly { readonly group: unknown }[]).map((row, position) => [row.group, position + 1]),
    );
}

/**
 * Each cell's group rank, for a column of a partition's groups: the same `rank` the run summary's
 * group and the legend's swatch carry.
 * @param resolved - The column.
 * @param target - Nodes or edges.
 * @param ids - The page's record ids.
 * @returns The ranks aligned with the ids, or undefined when the column is not a partition's groups.
 */
export function resultCellRanks(
    resolved: ResolvedResult,
    target: "node" | "edge",
    ids: readonly (NodeId | EdgeId)[],
): readonly (number | undefined)[] | undefined {
    const ranks =
        resolved.result?.shape === "community" && resolved.field === "group" ? sizeRanks(resolved) : undefined;

    return ranks === undefined ? undefined : ids.map((id) => ranks.get(resultCell(resolved, target, id)));
}

/**
 * What a record sorts by under a result sort: its value, or for a grouping field its group's size
 * rank, so the largest group is the greatest value.
 * @param resolved - The sort's column.
 * @param target - Nodes or edges.
 * @returns The reader, by record id.
 */
export function resultSortValue(resolved: ResolvedResult, target: "node" | "edge"): (id: NodeId | EdgeId) => unknown {
    const ranks = sizeRanks(resolved);
    if (ranks === undefined) {
        return (id) => resultCell(resolved, target, id);
    }

    // Largest group first under a descending sort, so it is the greatest value.
    return (id) => {
        const rank = ranks.get(resultCell(resolved, target, id));
        return rank === undefined ? undefined : ranks.size + 1 - rank;
    };
}
