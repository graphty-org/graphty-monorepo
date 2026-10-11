/**
 * @file What the model reads back: compact records, pages with a cursor, summaries of a run's
 * result, and a backstop that keeps every result valid JSON under its cap.
 */

import type { Run } from "../../session/runs/types";
import type { GraphSession } from "../../session/types";
import { type ActionResult, type JsonObject, type JsonValue, type PageInfo, ToolRefusal } from "./types";

/** The most fields a record keeps. */
const MAX_FIELDS = 12;

/** The longest string a record keeps. */
const MAX_TEXT = 200;

/** The default and the largest page. */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

/**
 * A value as plain JSON: strings cut, typed arrays and maps flattened, functions dropped.
 * @param value - The value.
 * @param depth - How deep this is, to stop on a cycle.
 * @returns The JSON value.
 */
export function toJson(value: unknown, depth = 0): JsonValue {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "string") {
        return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT)}...` : value;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : String(value);
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "bigint") {
        return String(value);
    }

    // Deep enough for a field's schema in a refusal; the guard is against a cycle.
    if (depth > 8 || typeof value !== "object") {
        return null;
    }

    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
        return Array.from(value as ArrayLike<unknown>)
            .slice(0, MAX_LIMIT)
            .map((item) => toJson(item, depth + 1));
    }

    if (value instanceof Set) {
        return toJson([...value], depth);
    }

    if (value instanceof Map) {
        return toJson(Object.fromEntries(value), depth);
    }

    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (typeof item !== "function") {
            out[key] = toJson(item, depth + 1);
        }
    }

    return out;
}

/**
 * One record, compact: at most twelve fields, long strings cut and flagged.
 * @param record - The record.
 * @param fields - The fields asked for, or all.
 * @returns The record.
 */
export function compactRecord(record: Readonly<Record<string, unknown>>, fields?: readonly string[]): JsonObject {
    const keys = fields === undefined ? Object.keys(record) : fields.filter((key) => key in record);
    const out: JsonObject = {};
    let truncated = false;
    for (const key of keys.slice(0, MAX_FIELDS)) {
        const value = record[key];
        if (typeof value === "string" && value.length > MAX_TEXT) {
            truncated = true;
        }

        out[key] = toJson(value);
    }

    if (keys.length > MAX_FIELDS) {
        out.omittedFields = keys.length - MAX_FIELDS;
    }

    if (truncated) {
        out.truncated = true;
    }

    return out;
}

/**
 * The cursor of the page after this one: its offset and the session's revision.
 * @param offset - The next page's first record.
 * @param revision - The session's revision.
 * @returns The cursor.
 */
export function cursorOf(offset: number, revision: string): string {
    return `${String(offset)}@${revision}`;
}

/**
 * Where a cursor says to start.
 * @param cursor - The cursor, or undefined for the first page.
 * @param revision - The session's revision now.
 * @returns The offset.
 * @throws {ToolRefusal} `AI_CURSOR_STALE` when the session moved; `AI_ARG_INVALID` when it does not parse.
 */
export function offsetOf(cursor: string | undefined, revision: string): number {
    if (cursor === undefined) {
        return 0;
    }

    const match = /^(\d+)@(.+)$/.exec(cursor);
    if (match === null) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "cursor", expected: "a cursor a page returned" });
    }

    if (match[2] !== revision) {
        throw new ToolRefusal("AI_CURSOR_STALE");
    }

    return Number(match[1]);
}

/**
 * The page facts of a window onto `total` records.
 * @param total - How many records there are.
 * @param offset - Where the window starts.
 * @param returned - How many it holds.
 * @param revision - The session's revision.
 * @returns The page.
 */
export function pageOf(total: number, offset: number, returned: number, revision: string): PageInfo {
    const next = offset + returned;
    const at = { offset, revision };
    return next < total ? { total, returned, cursor: cursorOf(next, revision), at } : { total, returned, at };
}

/**
 * A page size the model asked for, bounded.
 * @param limit - What it asked for.
 * @param max - The largest allowed.
 * @returns The size.
 */
export function limitOf(limit: unknown, max = MAX_LIMIT): number {
    return typeof limit === "number" && limit > 0 ? Math.min(Math.floor(limit), max) : Math.min(DEFAULT_LIMIT, max);
}

/**
 * What a run produced, summarized per field, with no per-node lists.
 * @param session - The session, for node names.
 * @param run - The run.
 * @returns The summary.
 */
export function summarizeRun(session: Pick<GraphSession, "data">, run: Run): JsonObject {
    const out: JsonObject = {
        run: run.id,
        algorithm: run.algorithm,
        params: toJson(run.params),
        scope: { nodes: run.scope.nodeCount, edges: run.scope.edgeCount },
        status: run.status,
        shape: run.shape,
        exact: run.caveats.exact,
        ...(run.durationMs === null ? {} : { durationMs: run.durationMs }),
        ...(run.partial ? { partial: true } : {}),
        ...(run.stale === null ? {} : { stale: toJson(run.stale) }),
        ...(run.status === "running" || run.status === "queued"
            ? {
                  progress: toJson(run.progress),
                  cancellable: run.cancellable,
                  queuePosition: run.queuePosition,
                  startedAt: run.startedAt,
              }
            : {}),
    };
    const { result } = run;
    if (run.error !== undefined) {
        out.error = { code: run.error.code, params: toJson(run.error.details) };
    }

    if (result === undefined) {
        return out;
    }

    const summary = result.summary();
    out.summary = {
        count: summary.count,
        measured: summary.measured,
        min: summary.min,
        max: summary.max,
        mean: toJson(summary.mean),
        ...(summary.mean === null ? {} : { stdev: toJson(spreadOf(session, result, summary.mean)) }),
        median: toJson(summary.median),
        top: summary.top.slice(0, 5).map((entry) => {
            const id = String((entry as { id?: unknown }).id);
            return { ...(toJson(entry) as JsonObject), label: session.data.name(id) ?? id };
        }),
        ...(summary.groups === undefined
            ? {}
            : {
                  groups: summary.groups.length,
                  largest: summary.groups.slice(0, 10).map((group) => toJson(group)),
              }),
    };
    if (run.shape === "path") {
        // The route itself, in order: "what is the path" is the question a path run answers.
        out.path = pathOf(session, result);
    }

    out.fields = run.fields.map((field) => ({ field: field.name, kind: field.kind, type: field.type }));
    const graph = toJson(result.graph);
    if (graph !== null && Object.keys(graph).length > 0) {
        out.graph = graph;
    }

    return out;
}

/**
 * The standard deviation of a result's per-node values (`value`), so a model can set a cut such as
 * "three deviations above the mean" without paging every value.
 * @param session - Lists the nodes.
 * @param result - The result.
 * @param mean - The values' mean.
 * @returns The population standard deviation, or null when no node carries a number.
 */
function spreadOf(
    session: Pick<GraphSession, "data">,
    result: NonNullable<Run["result"]>,
    mean: number,
): number | null {
    let sum = 0;
    let count = 0;
    for (const node of session.data.nodes()) {
        const value = result.node(String((node as { id?: unknown }).id))?.value;
        if (typeof value === "number" && Number.isFinite(value)) {
            sum += (value - mean) ** 2;
            count++;
        }
    }

    return count === 0 ? null : Math.sqrt(sum / count);
}

/**
 * The nodes on a path result, in route order, at most a page of them.
 * @param session - Names the nodes.
 * @param result - The path run's result.
 * @returns `{ id, label }` per node, first to last.
 */
function pathOf(session: Pick<GraphSession, "data">, result: NonNullable<Run["result"]>): JsonObject[] {
    const route: { id: string; order: number }[] = [];
    for (const node of session.data.nodes()) {
        const id = String((node as { id?: unknown }).id);
        const values = result.node(id);
        if (values?.onPath === true) {
            route.push({ id, order: typeof values.order === "number" ? values.order : route.length });
        }
    }

    route.sort((a, b) => a.order - b.order);
    return route.slice(0, MAX_LIMIT).map(({ id }) => ({ id, label: session.data.name(id) ?? id }));
}

/**
 * A result as the text the model reads: `{ code, params, data, page }`, cut to `cap`
 * characters by dropping records, never mid-JSON.
 * @param result - The result.
 * @param cap - The most characters.
 * @returns The JSON text.
 */
export function resultText(result: ActionResult & { code: string }, cap: number): string {
    const { at, ...page } = result.page ?? { total: 0, returned: 0 };
    const body: JsonObject = {
        code: result.code,
        params: result.params ?? {},
        ...(result.data === undefined ? {} : { data: result.data }),
        ...(result.page === undefined ? {} : { page: toJson(page) }),
    };
    let text = JSON.stringify(body);
    if (text.length <= cap) {
        return text;
    }

    // Drop records from the end of the longest array until it fits. A page's own records keep a
    // cursor to the first one dropped, so paging on reads every record.
    const data = structuredClone(body.data ?? null);
    const list = Array.isArray(data) ? data : findList(data);
    if (list !== undefined) {
        const paged = Array.isArray(data) && result.page !== undefined && at !== undefined;
        const total = paged ? page.total : list.length;
        while (list.length > 0 && text.length > cap) {
            list.pop();
            const next = paged ? at.offset + list.length : 0;
            const cursor = paged && next < total ? { cursor: cursorOf(next, at.revision) } : {};
            text = JSON.stringify({
                ...body,
                data,
                page: { total, returned: list.length, truncated: true, ...cursor },
            });
        }
    }

    if (text.length > cap) {
        text = JSON.stringify({ code: result.code, params: result.params ?? {}, truncated: true });
    }

    return text.length > cap ? JSON.stringify({ code: result.code, truncated: true }) : text;
}

/**
 * The longest array inside a value, to drop records from.
 * @param value - The value.
 * @returns The array, or undefined.
 */
function findList(value: JsonValue): JsonValue[] | undefined {
    if (value === null || typeof value !== "object") {
        return undefined;
    }

    let best: JsonValue[] | undefined;
    for (const item of Object.values(value)) {
        const candidate = Array.isArray(item) ? item : findList(item);
        if (candidate !== undefined && (best === undefined || candidate.length > best.length)) {
            best = candidate;
        }
    }

    return best;
}
