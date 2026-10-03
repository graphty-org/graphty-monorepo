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
import type { PageColumn, ResultCell, ResultColumn, ResultSort } from "../types";
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
        throw new GraphtyError({
            code: "E_UNKNOWN_RUN",
            message: `data.${verb}() names a run this session does not hold: "${shown}".`,
            source: "data",
            details: { run: shown, available, candidates: nearestNames(shown, available) },
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
 * What a record sorts by under a result sort: its value, or for a grouping field its group's size
 * rank, so the largest group is the greatest value.
 * @param resolved - The sort's column.
 * @param target - Nodes or edges.
 * @returns The reader, by record id.
 */
export function resultSortValue(resolved: ResolvedResult, target: "node" | "edge"): (id: NodeId | EdgeId) => unknown {
    const sizes = resolved.result?.graph.sizes;
    if (!GROUPING_FIELDS.has(resolved.field) || !Array.isArray(sizes)) {
        return (id) => resultCell(resolved, target, id);
    }

    // `sizes` is largest first, ties broken as the legend breaks them.
    const rank = new Map<unknown, number>(
        (sizes as readonly { readonly group: unknown }[]).map((row, position) => [row.group, sizes.length - position]),
    );
    return (id) => rank.get(resultCell(resolved, target, id));
}
