/**
 * A small project for the build tests: sources with their copies, steps and types, held as plain
 * data, with the steps the acts of the reference model compile to (tmp/multi-source-ui/prototype,
 * project.mjs). Only what the build cases need; the real acts arrive with the session wiring.
 */

import { build, isStaged, mintPart, nodeSpace, ownSpace, stepSources } from "../../../src/session/sources/steps/build";
import {
    checkClashRule,
    checkEdit,
    isOutcome,
    pickEdit,
    readerEdit,
    renameColumn,
    type StepsOutcome,
    withClash,
} from "../../../src/session/sources/steps/provenance";
import {
    type BuildInput,
    type BuildResult,
    type BuiltEdge,
    type BuiltNode,
    type CopyTables,
    type ElementRef,
    type Mapping,
    READER_SPACE,
    type ReaderOp,
    type Row,
    type Source,
    type SourceSettings,
    type Step,
    type TypeEntry,
    type TypeRule,
} from "../../../src/session/sources/steps/types";

/** Rows of a comma-separated text, every cell a string, as a CSV reads. */
export function csv(textRows: string): Row[] {
    const [head, ...lines] = textRows.trim().split("\n");
    const cols = head.split(",");
    return lines.map((l) => {
        const c = l.split(",");
        return Object.fromEntries(cols.map((k, i) => [k, c[i] ?? ""]));
    });
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** The working state of one test project. */
export class Fixture {
    sources: Record<string, Mutable<Source>> = {};
    steps: Step[] = [];
    readonly types: (TypeEntry & { rules: TypeRule[] })[] = [];
    reader: ReaderOp[] = [];
    readonly copies = new Map<string, CopyTables>();
    repeatedEdges: BuildInput["repeatedEdges"];
    /** The highest part minted per source this session. */
    private readonly high = new Map<string, number>();
    private seq = 0;

    get input(): BuildInput {
        return {
            sources: this.sources,
            steps: this.steps,
            types: this.types,
            reader: this.reader,
            ...(this.repeatedEdges ? { repeatedEdges: this.repeatedEdges } : {}),
        };
    }

    built(): BuildResult {
        return build(this.input, this.copies);
    }

    /** An independent copy of this project, as an undo point or a second branch of acts. */
    fork(): Fixture {
        const g = new Fixture();
        Object.assign(g.sources, structuredClone(this.sources));
        g.steps = structuredClone(this.steps);
        g.types.push(...structuredClone(this.types));
        g.reader = structuredClone(this.reader);
        for (const [c, t] of this.copies) {
            g.copies.set(c, t);
        }
        g.repeatedEdges = this.repeatedEdges;
        g.seq = this.seq;
        for (const [k, v] of this.high) {
            g.high.set(k, v);
        }
        return g;
    }

    /** A staged source: kept, read by no step. */
    stage(tables: CopyTables, mapping: Mapping, settings?: SourceSettings): string {
        this.seq++;
        const id = `src_${this.seq}`;
        const copy = `copy_${this.seq}`;
        this.copies.set(copy, tables);
        this.sources[id] = {
            id,
            origin: { copy },
            mapping: structuredClone(mapping),
            ...(settings ? { settings } : {}),
        };
        return id;
    }

    /** Add (`join.add`) a staged source. */
    add(id: string): void {
        this.steps.push({ op: "join.add", source: id });
    }

    /** The simple path: stage, give the nodes or ends their types, add. */
    import(
        tables: CopyTables,
        o: {
            mapping?: Mapping;
            key?: string;
            type?: string;
            edges?: { from: { column: string; type: string }; to: { column: string; type: string } };
        } = {},
    ): string {
        const mapping: Mutable<Mapping> = structuredClone(o.mapping ?? {});
        if (o.key !== undefined) {
            mapping.nodes = { ...mapping.nodes, key: o.key, ...(o.type ? { space: o.type } : {}) };
        }
        if (o.edges) {
            mapping.edges = {
                source: o.edges.from.column,
                sourceSpace: o.edges.from.type,
                target: o.edges.to.column,
                targetSpace: o.edges.to.type,
            };
        }
        const id = this.stage(tables, mapping);
        if (o.type !== undefined && mapping.nodes) {
            this.rule("node", o.type, { source: id });
        }
        if (o.edges) {
            this.rule("node", o.edges.from.type, { source: id, end: "source" });
            this.rule("node", o.edges.to.type, { source: id, end: "target" });
        }
        this.add(id);
        return id;
    }

    rule(kind: "node" | "edge", name: string, rule: TypeRule): void {
        const t = this.types.find((x) => x.name === name && x.kind === kind);
        if (t) {
            t.rules.push(rule);
        } else {
            this.types.push({ name, kind, rules: [rule] });
        }
    }

    /** Declare a type, or add rules to one (3.7). */
    declareType(entry: { name: string; kind: "node" | "edge"; rules: TypeRule[] }): void {
        for (const r of entry.rules) {
            this.rule(entry.kind, entry.name, r);
        }
    }

    /** The index of the first step reading a source. */
    stepOf(id: string): number {
        return this.steps.findIndex((s) => s.source === id);
    }

    /** Set one column's clash rule on a step, unless the check refuses it. */
    setClash(i: number, column: string, rule: Parameters<typeof withClash>[2]): StepsOutcome | null {
        const refused = checkClashRule(this.built(), i, column, rule);
        if (!refused) {
            this.steps[i] = withClash(this.steps[i], column, rule);
        }
        return refused;
    }

    private nextOp(): string {
        this.seq++;
        return `op_${this.seq}`;
    }

    /** A typed reader edit, unless the column is guarded. */
    edit(ref: ElementRef, column: string, value: string): StepsOutcome | string {
        const r = this.built();
        const refused = checkEdit(this.input, r, ref, column);
        if (refused) {
            return refused;
        }
        const op = readerEdit(this.input, r, { id: this.nextOp(), ref, column, value });
        this.reader.push(op);
        return op.id;
    }

    /** A pick or Use of one source's value. */
    use(ref: ElementRef, column: string, source: string): StepsOutcome | string {
        const op = pickEdit(this.input, this.built(), { id: this.nextOp(), ref, column, source });
        if (op === null) {
            throw new Error("no value to pick");
        }
        if (isOutcome(op)) {
            return op;
        }
        this.reader.push(op);
        return op.id;
    }

    /** A node the reader adds; it lives in source:reader (3.1). */
    addNode(key: string, columns: Record<string, string> = {}): string {
        const id = this.nextOp();
        this.reader.push({ id, op: "add", node: { space: READER_SPACE, key }, columns });
        return id;
    }

    /** Rename one value column of one source (4.4). */
    renameColumn(source: string, table: "nodes" | "edges", from: string, to: string): StepsOutcome | null {
        const next = renameColumn(this.input, this.copies, { source, table, from, to });
        if (isOutcome(next)) {
            return next;
        }
        this.sources = next.sources;
        this.steps = [...next.steps];
        this.reader = [...(next.reader ?? [])];
        return null;
    }

    /** What reopening a saved project loses: the session's record of minted parts. */
    forgetMinted(): void {
        this.high.clear();
    }

    mint(id: string, refs: { load: string; key: string }[] = []): number {
        const part = mintPart(this.input, id, { refs, high: this.high.get(id) });
        this.high.set(id, part);
        return part;
    }

    /** Move columns of an edge source onto one end's nodes. */
    moveColumns(id: string, columns: string[], to: "source" | "target"): void {
        const m = this.sources[id].mapping.edges;
        if (!m) {
            throw new Error("not an edge source");
        }
        const space = (to === "source" ? m.sourceSpace : m.targetSpace) ?? ownSpace(id);
        this.steps.push({ op: "join.node-values", source: id, read: { table: "edges", key: m[to], space }, columns });
    }

    /** Extract one column of an edge source as nodes of `type`, each row an edge from its `from` end. */
    extract(id: string, o: { column: string; type: string; columns?: string[]; edgeType?: string }): number {
        const m = this.sources[id].mapping.edges;
        if (!m) {
            throw new Error("not an edge source");
        }
        const part = this.mint(id);
        this.steps.push({
            op: "join.edges",
            source: id,
            part,
            read: {
                table: "edges",
                source: m.source,
                sourceSpace: m.sourceSpace ?? ownSpace(id),
                target: o.column,
                targetSpace: o.type,
                weight: null,
            },
            columns: [],
            repeated: "first",
        });
        this.rule("node", o.type, { source: id, part, end: "target" });
        if (o.edgeType !== undefined) {
            this.rule("edge", o.edgeType, { source: id, part });
        }
        if (o.columns) {
            this.steps.push({
                op: "join.node-values",
                source: id,
                read: { table: "edges", key: o.column, space: o.type },
                columns: o.columns,
            });
        }
        return part;
    }

    /** Write `join.add` of a staged source in its own space, as both acts do (3.6). */
    private addStaged(id: string, type: string | null, duplicateIds?: "merge"): void {
        const src = this.sources[id];
        const own = ownSpace(id);
        src.mapping = { ...src.mapping, ...(src.mapping.nodes ? { nodes: { ...src.mapping.nodes, space: own } } : {}) };
        if (type !== null) {
            this.rule("node", type, { source: id });
        }
        this.steps.push({ op: "join.add", source: id, ...(duplicateIds ? { duplicateIds } : {}) });
    }

    private typeIn(space: string): string | null {
        for (const n of this.built().nodes.values()) {
            if (n.space === space) {
                return n.type;
            }
        }
        return null;
    }

    /** Merge 2 into 1 (3.6): node 1 named by its space (field 1 is its key) or by a field of source 1. */
    merge(o: {
        from: { source: string; field: string };
        into: { space: string } | { source: string; field: string };
        unmatchedFrom?: "keep" | "drop";
        repeated?: "first" | "last";
    }): void {
        const s2 = this.sources[o.from.source];
        let space: string;
        let via: string | undefined;
        let keyCol: string | undefined;
        if ("space" in o.into) {
            ({ space } = o.into);
        } else {
            const s1 = this.sources[o.into.source];
            space = nodeSpace(s1);
            keyCol = s1.mapping.nodes?.key;
            via = o.into.field === keyCol ? undefined : o.into.source;
        }
        if (isStaged(this.input, o.from.source)) {
            const dup = o.from.field === s2.mapping.nodes?.key ? "merge" : undefined;
            this.addStaged(o.from.source, this.typeIn(space), dup);
        }
        this.steps.push({
            op: "join.merge",
            source: o.from.source,
            read: { key: o.from.field, space },
            unmatchedFrom: o.unmatchedFrom ?? "keep",
            ...(o.repeated ? { repeated: o.repeated } : {}),
            ...(via !== undefined && keyCol !== undefined && "field" in o.into
                ? { via, mapping: { columns: [o.into.field, keyCol] as const, space } }
                : {}),
        });
    }

    /** Make an edge (3.6) from a node source's field into node 1's space; returns the minted part. */
    connect(o: {
        from: { source: string; field: string };
        into: { space: string };
        direction?: "into-from" | "from-into";
    }): number {
        const s2 = this.sources[o.from.source];
        if (isStaged(this.input, o.from.source)) {
            this.addStaged(o.from.source, null);
        }
        const part = this.mint(o.from.source);
        const k2 = s2.mapping.nodes?.key ?? "";
        const one = { col: o.from.field, space: o.into.space };
        const two = { col: k2, space: nodeSpace(this.sources[o.from.source]) };
        const [a, b] = (o.direction ?? "into-from") === "into-from" ? [one, two] : [two, one];
        this.steps.push({
            op: "join.edges",
            source: o.from.source,
            part,
            read: {
                table: "nodes",
                source: a.col,
                sourceSpace: a.space,
                target: b.col,
                targetSpace: b.space,
                edgeId: k2,
                weight: null,
            },
            unmatchedRows: "leave-out",
            columns: [],
        });
        return part;
    }

    /** Remove a source and every step that depends on it (3.2). */
    removeSource(id: string): void {
        const { input } = this;
        this.steps = this.steps.filter((s) => !stepSources(s, input).includes(id));
        this.sources = Object.fromEntries(Object.entries(this.sources).filter(([k]) => k !== id));
    }
}

/** The node keyed `key` in `space`, found by its own space and key (never through an alias). */
export function nodeIn(r: BuildResult, space: string, key: string): BuiltNode | undefined {
    for (const n of r.nodes.values()) {
        if (n.space === space && n.key === key) {
            return n;
        }
    }
    return undefined;
}

export const edgesOf = (r: BuildResult): BuiltEdge[] => [...r.edges.values()];
export const nodesOf = (r: BuildResult): BuiltNode[] => [...r.nodes.values()];
/** The key of the node an edge end reaches. */
export const keyOf = (r: BuildResult, id: string): string | undefined => r.nodes.get(id)?.key;

/** A card-fraud scenario small enough to read: accounts A-10000.. with emails u<n>@bank-a.test. */
export function accountsCsv(keys: number[]): Row[] {
    return csv(
        ["account_id,holder,email", ...keys.map((k) => `A-${k},Holder ${k},u${k - 10000}@bank-a.test`)].join("\n"),
    );
}

/** Transactions, one per account, to merchants M-0 and M-1. */
export function transactionsCsv(keys: number[]): Row[] {
    return csv(
        [
            "txn_id,account_id,holder_name,merchant_id,merchant_name,device_id,os",
            ...keys.map(
                (k, i) => `T-${i},A-${k},Holder ${k},M-${i % 2},Shop ${i % 2},D-${i % 3},${i % 2 ? "ios" : "android"}`,
            ),
        ].join("\n"),
    );
}

/** Phase 1 of the scenario: transactions draw at once, ends typed account and merchant. */
export function phase1(keys: number[]): { f: Fixture; t: string } {
    const f = new Fixture();
    const t = f.import(
        { edges: transactionsCsv(keys) },
        {
            mapping: {
                edges: {
                    edgeId: "txn_id",
                    source: "account_id",
                    sourceSpace: "account",
                    target: "merchant_id",
                    targetSpace: "merchant",
                },
            },
        },
    );
    f.rule("node", "account", { source: t, end: "source" });
    f.rule("node", "merchant", { source: t, end: "target" });
    f.rule("edge", "transfer", { source: t });
    return { f, t };
}
