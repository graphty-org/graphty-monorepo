/**
 * Characterization of how fromWire installs the views a manifest carries: for directed, undirected,
 * unweighted and empty snapshots carrying every view, at the "none" and "structure" levels, which
 * views end up cached and with what contents, and what each corruption of a carried member (wrong
 * contents, wrong length, wrong dtype, missing, weights on an unweighted graph) does. The outcomes
 * are pinned in a snapshot file, so any change in installation order, checks or error text shows.
 */

import { describe, expect, it } from "vitest";

import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { GraphFormatError } from "../../src/errors.js";
import { type GraphSnapshot } from "../../src/snapshot/graph-snapshot.js";
import { type ViewName, type WireBufferRef, type WireSnapshot } from "../../src/types/index.js";
import { fromWire } from "../../src/wire/from-wire.js";
import { richSnapshot } from "./helpers.js";

const ALL_VIEWS: readonly ViewName[] = [
    "reverse",
    "coo",
    "edgeList",
    "outDegree",
    "inDegree",
    "degree",
    "weightedOutDegree",
    "weightedInDegree",
    "weightedDegree",
    "selfLoopWeight",
    "selfLoopArcs",
    "selfLoopsPerNode",
    "mate",
    "degreeOrder",
    "reverseDegreeOrder",
];

type ViewRefs = Record<string, Record<string, WireBufferRef | undefined>>;

function unweightedDirected(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    b.addEdge(0, 1);
    b.addEdge(1, 2);
    b.addEdge(2, 2);
    b.addEdge(2, 0);
    return b.freeze();
}

function emptyGraph(): GraphSnapshot {
    return new GraphBuilder({ directed: false }).freeze();
}

const GRAPHS: Record<string, () => GraphSnapshot> = {
    directed: () => richSnapshot({ directed: true }),
    undirected: () => richSnapshot(),
    unweightedDirected,
    empty: emptyGraph,
};

function carryingWire(make: () => GraphSnapshot): WireSnapshot {
    const s = make();
    s.prepare(ALL_VIEWS.filter((v) => v !== "mate" || !s.directed));
    return structuredClone(s.toWire({ includeViews: ALL_VIEWS }));
}

function numbers(a: ArrayLike<number> | null | undefined): number[] | null {
    return a === null || a === undefined ? null : Array.from(a, (x) => (Object.is(x, -0) ? 0 : x));
}

/** The cached views and their contents, as plain data. */
function describeCache(s: GraphSnapshot): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const cached = s.cachedViews();
    out.cached = cached;
    for (const name of cached) {
        switch (name) {
            case "reverse": {
                const r = s.reverse();
                out[name] = [numbers(r.rowPtr), numbers(r.colIdx), numbers(r.fwdArc), numbers(r.weights)];
                break;
            }
            case "coo":
                out[name] = numbers(s.coo().src);
                break;
            case "edgeList": {
                const e = s.edgeList();
                out[name] = [numbers(e.src), numbers(e.dst), numbers(e.weights)];
                break;
            }
            case "degreeOrder":
                out[name] = [numbers(s.degreeOrder().perm), numbers(s.degreeOrder().segmentOffsets)];
                break;
            case "reverseDegreeOrder": {
                const d = s.degreeOrder({ of: "reverse" });
                out[name] = [numbers(d.perm), numbers(d.segmentOffsets)];
                break;
            }
            default:
                out[name] = numbers((s as unknown as Record<string, () => ArrayLike<number>>)[name]());
        }
    }
    return out;
}

function outcome(wire: WireSnapshot, validate: "none" | "structure", contents = true): unknown {
    try {
        const back = fromWire(wire, { validate });
        return contents ? describeCache(back) : { cached: back.cachedViews() };
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return { code: err.code, message: err.message, details: err.details };
        }
        throw err;
    }
}

function viewRefs(wire: WireSnapshot): ViewRefs {
    return wire.manifest.views ?? {};
}

/** A typed view over the clone's bytes of a carried member. */
function memberArray(wire: WireSnapshot, ref: WireBufferRef): Uint32Array | Float32Array | Float64Array {
    const buffer = wire.buffers[ref.buffer];
    if (ref.dtype === "f32") {
        return new Float32Array(buffer, ref.byteOffset, ref.length);
    }
    if (ref.dtype === "f64") {
        return new Float64Array(buffer, ref.byteOffset, ref.length);
    }
    return new Uint32Array(buffer, ref.byteOffset, ref.length);
}

/** Every corruption of every carried member, each applied to a fresh clone. */
function corruptions(make: () => GraphSnapshot): Record<string, unknown> {
    const base = carryingWire(make);
    const out: Record<string, unknown> = {};
    for (const [view, members] of Object.entries(viewRefs(base))) {
        for (const member of Object.keys(members)) {
            const edits: Record<string, (refs: Record<string, WireBufferRef | undefined>, w: WireSnapshot) => void> = {
                bump: (refs, w) => {
                    const a = memberArray(w, refs[member] as WireBufferRef);
                    if (a.length > 0) {
                        a[a.length - 1] = (a[a.length - 1] ?? 0) + 1;
                    }
                },
                zero: (refs, w) => memberArray(w, refs[member] as WireBufferRef).fill(0),
                short: (refs) => {
                    const ref = refs[member] as WireBufferRef;
                    const bytes = ref.byteLength / Math.max(ref.length, 1);
                    refs[member] = { ...ref, length: ref.length - 1, byteLength: ref.byteLength - bytes };
                },
                dtype: (refs) => {
                    const ref = refs[member] as WireBufferRef;
                    refs[member] = { ...ref, dtype: ref.dtype === "u32" ? "f32" : "u32" };
                },
                missing: (refs) => {
                    Reflect.deleteProperty(refs, member);
                },
            };
            for (const [kind, edit] of Object.entries(edits)) {
                if ((kind === "short" || kind === "bump") && (members[member]?.length ?? 0) === 0) {
                    continue;
                }
                const w = structuredClone(base);
                edit(viewRefs(w)[view], w);
                out[`${view}.${member}.${kind}`] = {
                    none: outcome(w, "none", false),
                    structure: outcome(w, "structure", false),
                };
            }
        }
    }
    return out;
}

describe("fromWire carried views (characterization)", () => {
    for (const [name, make] of Object.entries(GRAPHS)) {
        it(`installs the views a ${name} snapshot carries`, () => {
            const wire = carryingWire(make);
            expect({
                carried: Object.keys(viewRefs(wire)),
                none: outcome(wire, "none"),
                structure: outcome(wire, "structure"),
                full: describeCache(fromWire(structuredClone(wire), { validate: "full" })),
            }).toMatchSnapshot();
        });

        it(`reports every corruption of a ${name} snapshot's carried views`, () => {
            expect(corruptions(make)).toMatchSnapshot();
        });
    }

    it("rejects weights carried for an unweighted snapshot in reverse and edgeList", () => {
        const s = unweightedDirected();
        s.prepare(["reverse", "edgeList"]);
        const base = structuredClone(s.toWire({ includeViews: ["reverse", "edgeList"] }));
        const out: Record<string, unknown> = {};
        for (const view of ["reverse", "edgeList"]) {
            const w = structuredClone(base);
            const refs = viewRefs(w)[view];
            const src = (refs.colIdx ?? refs.src) as WireBufferRef;
            refs.weights = { ...src, dtype: "f32" };
            out[view] = { none: outcome(w, "none"), structure: outcome(w, "structure") };
        }
        expect(out).toMatchSnapshot();
    });

    it("ignores an unknown or inherited view name", () => {
        const s = unweightedDirected();
        s.prepare(["outDegree"]);
        const w = structuredClone(s.toWire({ includeViews: ["outDegree"] }));
        const refs = viewRefs(w);
        for (const name of ["futureView", "constructor", "toString", "__proto__"]) {
            Object.defineProperty(refs, name, { value: { data: refs.outDegree?.data }, enumerable: true });
        }
        expect(outcome(w, "structure")).toMatchSnapshot();
    });
});
