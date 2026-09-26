/**
 * The upload cache of spec 4.1 / 4.3 / 4.5: every core array, view array, column and ad hoc array a kernel binds
 * lives on the device exactly once per snapshot core, keyed on the typed-array object (or the Column object for
 * columns, PLAN DECISION 8), recorded per serial so `release(snapshot)` destroys every buffer of a snapshot and its
 * withColumns() siblings, and tombstoned so a live user learns of the release through `isReleased` (spec 4.5).
 * Uploads follow the pure planner of ./upload-plan.ts: the arena path writes ONE buffer with ONE writeBuffer of the
 * hot prefix (or the full arena when a cold segment is needed and fits) and binds segments at
 * `segment.byteOffset - arena.byteOffset`; the perArray path writes one buffer per array; the windowed path (P4-T7,
 * PD-8) writes one buffer per PlannedArray range of every arc-indexed array and binds window 0 as the default
 * colIdx / weights, the whole window list and the per-array buffers riding on the CoreBinding for the row-walking
 * primitives to bind per window. Identity permutations are never materialised: presence is
 * decided from counts and flags, and the arcToEdge / edgeToArc getters are read only when a segment exists. Nothing
 * is freed by garbage collection; the once-only warning above warnUnreleasedSnapshots names the missing release.
 */

import {
    type AttributeTable,
    type Column,
    type CoreArrayName,
    type GpuEligibility,
    type GraphSnapshot,
    type TypedArrayData,
} from "@graphty/graph-format";

import { STORAGE_ALIGN } from "../constants.js";
import { type AllocationTracker } from "../device/error-scope.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type PlanCaps } from "../types/context.js";
import { type ArcWindow, type Binding } from "../types/memory.js";
import { planUpload } from "./upload-plan.js";

/** The core arrays a kernel binds by default (spec 4.1); the cold segments are named explicitly by the caller. */
const DEFAULT_NEED: readonly CoreArrayName[] = Object.freeze(["rowPtr", "colIdx", "weights"]);

/** The five core arrays in arena (hot-to-cold) order. */
const CORE_ORDER: readonly CoreArrayName[] = Object.freeze(["rowPtr", "colIdx", "weights", "arcToEdge", "edgeToArc"]);

/** The arc-indexed core arrays: the ones a windowed plan splits into window buffers (upload-plan.ts ARC_INDEXED). */
const ARC_INDEXED: readonly ("colIdx" | "weights" | "arcToEdge")[] = Object.freeze(["colIdx", "weights", "arcToEdge"]);

/** Every resident buffer is bound by kernels, filled by writeBuffer and readable back (tests, readbacks of state). */
const RESIDENT_USAGE = BufferUsage.STORAGE | BufferUsage.COPY_DST | BufferUsage.COPY_SRC;

/**
 * The core arrays of a snapshot on the device (spec 4.1); a null member is absent (zero-length, unweighted or an
 * identity permutation) and is bound as a dummy by the kernel layer (3.9). `Binding` itself is declared in
 * src/types/memory.ts (3.3). Exported by contract 3.8: P1-T4's graphBindings / graphOverrides and every later
 * kernel driver take it; nothing at P1-T2 imports it by name.
 * @public
 */
export interface CoreBinding {
    readonly serial: number;
    readonly plan: "arena" | "perArray" | "windowed";
    readonly rowPtr: Binding;
    readonly colIdx: Binding | null;
    readonly weights: Binding | null;
    readonly arcToEdge: Binding | null;
    readonly edgeToArc: Binding | null;
    readonly windows: readonly ArcWindow[] | null;
    /** The buffers each arc-indexed array was split into by the windowed plan (indexed by ArcWindow.bufferIndex; an absent array has none); non-null iff `plan === "windowed"`. */
    readonly arcBuffers: Readonly<Record<"colIdx" | "weights" | "arcToEdge", readonly GPUBuffer[]>> | null;
    readonly hasWeights: boolean;
}

/**
 * A view's arrays on the device plus the CPU-side scalars (degreeOrder's segmentOffsets) (spec 4.3). Exported by
 * contract 3.8: the degreeOrder permutation of P4's kernels is a ViewBinding; nothing at P1-T2 imports it by name.
 * @public
 */
export interface ViewBinding {
    readonly view:
        | "reverse"
        | "coo"
        | "edgeList"
        | "outDegree"
        | "inDegree"
        | "degreeOrder"
        | "reverseDegreeOrder"
        | "mate";
    readonly bindings: Readonly<Record<string, Binding>>;
    readonly scalars: Readonly<Record<string, readonly number[]>>;
}

/**
 * A column's gpuView() on the device (spec 4.3). Exported by contract 3.8: P3's layout inputs register columns
 * through it; nothing at P1-T2 imports it by name.
 * @public
 */
export interface ColumnBinding {
    readonly binding: Binding;
    readonly column: Column;
    readonly version: number;
    readonly eligibility: GpuEligibility;
    readonly components: number;
}

/**
 * An ad hoc array on the device (spec 4.1 last row); `destroy()` is the caller's when no owner was given. Exported
 * by contract 3.8: P3's model resolves column inputs to a registered ArrayBinding; nothing at P1-T2 imports it by
 * name.
 * @public
 */
export interface ArrayBinding {
    readonly binding: Binding;
    readonly byteLength: number;
    readonly owner: GraphSnapshot | null;
    destroy(): void;
}

/**
 * stats() shape (spec 4.1). Exported by contract 3.8 for the callers of ctx.residency.stats(); nothing at P1-T2
 * imports it by name.
 * @public
 */
export interface ResidencyStats {
    readonly buffers: number;
    readonly bytes: number;
    readonly snapshots: number;
    readonly perSnapshot: readonly {
        readonly serial: number;
        readonly label: string | null;
        readonly bytes: number;
        readonly buffers: number;
    }[];
}

/** One buffer the residency owns. */
interface Resident {
    /** The typed-array object or the Column object the buffer was uploaded for. */
    readonly key: object;
    readonly buffer: GPUBuffer;
    readonly byteLength: number;
    /** The owning record's serial, or null for an owner-less ad hoc array. */
    readonly serial: number | null;
    /** For columns: the column.version the buffer holds. */
    version: number;
    destroyed: boolean;
}

/** One uploaded segment of the arena buffer. */
interface ArenaSegmentBinding {
    readonly offset: number;
    readonly size: number;
}

/** Everything recorded for one serial (a snapshot and its withColumns() siblings). */
interface ResidencyRecord {
    readonly serial: number;
    readonly label: string | null;
    readonly entries: Resident[];
    plan: "arena" | "perArray" | "windowed" | null;
    arena: {
        readonly buffer: GPUBuffer;
        readonly segments: Readonly<Record<CoreArrayName, ArenaSegmentBinding | null>>;
    } | null;
    readonly bindings: Map<CoreArrayName, Binding>;
    /** Memo of the P7 views by `name` or `name + ":packed"`, so a second view() call uploads nothing (spec 4.3). */
    readonly views: Map<string, ViewBinding>;
    /**
     * One fresh marker object per PACKED view, keyed the same way as `views`. It is the `key` argument of
     * upload(): a packed view must never be keyed on one of the snapshot's own arrays, because upload()
     * memoises on the key object and does NOT compare byte lengths, and `s.reverse()` is cached
     * (graph-format `graph-snapshot.ts:600-601`) so the packed and the unpacked builder see the same
     * `rev.rowPtr` object.
     */
    readonly packKeys: Map<string, object>;
    /** One marker object per window buffer, keyed `<name>:<bufferIndex>` (the packKey pattern: never one of the snapshot's own arrays). */
    readonly windowKeys: Map<string, object>;
    /** The windowed plan's windows, or null on the arena / perArray plans. */
    windows: readonly ArcWindow[] | null;
    /** The window buffers of every arc-indexed array uploaded so far (windowed plan only). */
    readonly arcBuffers: Map<CoreArrayName, GPUBuffer[]>;
    released: boolean;
}

/**
 * Whether a core array is arc-indexed (split into window buffers by a windowed plan).
 * @param name - the core array
 * @returns true for colIdx, weights and arcToEdge
 */
function isArcIndexed(name: CoreArrayName): name is "colIdx" | "weights" | "arcToEdge" {
    return (ARC_INDEXED as readonly CoreArrayName[]).includes(name);
}

/**
 * Whether an ArrayBuffer-like is a SharedArrayBuffer (checked by tag so the global need not exist).
 * @param buffer - the buffer to test
 * @returns true for a SharedArrayBuffer
 */
function isSharedBuffer(buffer: ArrayBufferLike): boolean {
    return Object.prototype.toString.call(buffer) === "[object SharedArrayBuffer]";
}

/**
 * The E_INVALID_ARGUMENT error of a bad residency argument.
 * @param argument - the argument name
 * @param value - the value given
 * @param expected - what was expected
 * @returns the error to throw
 */
function invalid(argument: string, value: unknown, expected: string): WebGpuGraphError {
    return new WebGpuGraphError("E_INVALID_ARGUMENT", `${argument}: expected ${expected}`, {
        argument,
        value,
        expected,
    });
}

/**
 * Throws E_SNAPSHOT { reason: "detached" } for a snapshot whose core was transferred away.
 * @param s - the snapshot
 */
function assertAttached(s: GraphSnapshot): void {
    if (s.detached) {
        throw new WebGpuGraphError("E_SNAPSHOT", `snapshot ${s.serial} is detached (its core was transferred away)`, {
            reason: "detached",
            serial: s.serial,
        });
    }
}

/**
 * Whether a core array exists on the snapshot, from counts and flags alone (mirrors coreByteLengths of
 * ./upload-plan.ts; spec 5.6: zero-length arrays are never uploaded; spec 4.1: identity permutations never
 * materialised).
 * @param s - the snapshot
 * @param name - the core array
 * @returns true when the array has bytes to upload
 */
function isPresent(s: GraphSnapshot, name: CoreArrayName): boolean {
    switch (name) {
        case "rowPtr":
            return true;
        case "colIdx":
            return s.arcCount > 0;
        case "weights":
            return s.flags.weighted && s.arcCount > 0;
        case "arcToEdge":
            return !s.flags.arcToEdgeIsIdentity && s.arcCount > 0;
        case "edgeToArc":
            return !s.flags.arcToEdgeIsIdentity && s.edgeCount > 0;
        default:
            return false;
    }
}

/**
 * The array object of a PRESENT core array (the caller checked isPresent, so the two getters never materialise).
 * @param s - the snapshot
 * @param name - the core array
 * @returns the array
 */
function coreArray(s: GraphSnapshot, name: CoreArrayName): TypedArrayData {
    switch (name) {
        case "rowPtr":
            return s.rowPtr;
        case "colIdx":
            return s.colIdx;
        case "weights": {
            const { weights } = s;
            if (weights === null) {
                throw invalid("weights", null, "a weighted snapshot");
            }
            return weights;
        }
        case "arcToEdge":
            return s.arcToEdge;
        case "edgeToArc":
            return s.edgeToArc;
        default:
            throw invalid("name", name, "a core array name");
    }
}

/** The upload cache (spec 4.1): WeakMap on array objects, WeakMap on snapshots, a strong Map by serial; @internal (reached as ctx.residency). */
export class GraphResidency {
    private readonly device: GPUDevice;
    private readonly caps: PlanCaps;
    private readonly allocator: AllocationTracker;
    private readonly warnUnreleasedSnapshots: number;
    private readonly warn: (message: string) => void;
    /** Fast lookup by the uploaded object (a typed array or a Column). */
    private readonly residents = new WeakMap<object, Resident>();
    /** Fast lookup of a snapshot's record (entries of released records are recognised by `released`). */
    private readonly records = new WeakMap<GraphSnapshot, ResidencyRecord>();
    /** The strong map by serial: withColumns() siblings share one record; cleared by release. */
    private readonly bySerial = new Map<number, ResidencyRecord>();
    /** Owner-less ad hoc arrays. */
    private readonly orphans = new Set<Resident>();
    /** Serials released and not re-uploaded. */
    private readonly tombstones = new Set<number>();
    private liveCount = 0;
    private liveBytesValue = 0;
    private warned = false;
    private disposed = false;

    /**
     * Creates an empty residency over a device.
     * @param device - the device (queue.writeBuffer)
     * @param caps - the device capabilities the planner reads
     * @param allocator - the context's OOM-scoped allocator (every buffer is created and destroyed through it)
     * @param options - the once-only warning
     * @param options.warnUnreleasedSnapshots - the resident-snapshot count above which the warning fires once
     * @param options.warn - the warning sink; default console.warn
     */
    constructor(
        device: GPUDevice,
        caps: PlanCaps,
        allocator: AllocationTracker,
        options: { readonly warnUnreleasedSnapshots: number; readonly warn?: ((message: string) => void) | undefined },
    ) {
        this.device = device;
        this.caps = caps;
        this.allocator = allocator;
        this.warnUnreleasedSnapshots = options.warnUnreleasedSnapshots;
        this.warn =
            options.warn ??
            ((message: string): void => {
                console.warn(message);
            });
    }

    /**
     * Uploads (or finds) the core; `need` defaults to ["rowPtr", "colIdx", "weights"]; cold segments on demand
     * (spec 4.2). Never materialises an identity permutation. A windowed plan (spec 4.2, PD-8) uploads every
     * arc-indexed array as the plan's buffer ranges and binds window 0 as its default binding; rowPtr and edgeToArc
     * stay whole. A tombstoned serial is lifted and re-uploaded (PLAN DECISION 7).
     * @param s - the snapshot
     * @param need - the core arrays to bind (rowPtr is always included; absent arrays are ignored)
     * @returns the core binding (a frozen object; grows as cold segments are added)
     */
    core(s: GraphSnapshot, need?: readonly CoreArrayName[]): CoreBinding {
        this.assertLive();
        assertAttached(s);
        const wanted = need ?? DEFAULT_NEED;
        const names = CORE_ORDER.filter((name) => (name === "rowPtr" || wanted.includes(name)) && isPresent(s, name));
        const plan = planUpload(s, this.caps, names);
        const record = this.ensureRecord(s);
        if (record.plan === null) {
            record.plan = plan.kind;
            if (plan.kind === "arena" && s.arena !== null) {
                const { arena } = s;
                const resident = this.upload(
                    record,
                    s.rowPtr,
                    new Uint8Array(arena.buffer, arena.byteOffset, plan.bytes),
                    `residency:core:${record.serial}:arena`,
                );
                record.arena = { buffer: resident.buffer, segments: plan.segments };
            }
            if (plan.kind === "windowed") {
                record.windows = plan.windows;
            }
        }
        for (const name of names) {
            if (!record.bindings.has(name)) {
                const planned = plan.kind === "windowed" ? plan.arrays.find((a) => a.name === name) : undefined;
                record.bindings.set(
                    name,
                    planned !== undefined && planned.buffers.length > 0 && record.windows !== null && isArcIndexed(name)
                        ? this.bindWindowed(record, s, name, planned.buffers, record.windows[0])
                        : this.bindCore(record, s, name),
                );
            }
        }
        const rowPtr = record.bindings.get("rowPtr");
        if (rowPtr === undefined) {
            throw invalid("rowPtr", null, "a bound rowPtr (internal invariant)");
        }
        const weights = record.bindings.get("weights") ?? null;
        return Object.freeze({
            serial: record.serial,
            plan: plan.kind,
            rowPtr,
            colIdx: record.bindings.get("colIdx") ?? null,
            weights,
            arcToEdge: record.bindings.get("arcToEdge") ?? null,
            edgeToArc: record.bindings.get("edgeToArc") ?? null,
            windows: record.windows,
            arcBuffers:
                record.windows === null
                    ? null
                    : Object.freeze({
                          colIdx: Object.freeze([...(record.arcBuffers.get("colIdx") ?? [])]),
                          weights: Object.freeze([...(record.arcBuffers.get("weights") ?? [])]),
                          arcToEdge: Object.freeze([...(record.arcBuffers.get("arcToEdge") ?? [])]),
                      }),
            hasWeights: weights !== null,
        });
    }

    /**
     * Uploads (or finds) a view: outDegree / inDegree / degreeOrder / reverseDegreeOrder upload one array each;
     * reverse and edgeList (P7) upload their arrays perArray, never into the arena, and are memoised per record so
     * a second call uploads nothing (spec 4.3). coo and mate -> E_UNSUPPORTED until P11. packViews concatenates a
     * reverse or edgeList view into ONE buffer at STORAGE_ALIGN offsets; on any other view `true` is E_UNSUPPORTED
     * { option: "packViews" }.
     * @param s - the snapshot
     * @param name - the view
     * @param options - view options
     * @param options.packViews - pack the reverse / edgeList arrays into one buffer (a no-op on an undirected reverse)
     * @returns the view binding
     */
    view(
        s: GraphSnapshot,
        name: "reverse" | "coo" | "edgeList" | "outDegree" | "inDegree" | "degreeOrder" | "reverseDegreeOrder" | "mate",
        options?: { readonly packViews?: boolean | undefined },
    ): ViewBinding {
        this.assertLive();
        assertAttached(s);
        const packed = options?.packViews === true;
        if (name === "reverse" || name === "edgeList") {
            this.assertNotReleased(s);
            this.assertNonEmpty(s);
            const memoKey = packed ? `${name}:packed` : name;
            const record = this.ensureRecord(s);
            const memo = record.views.get(memoKey);
            if (memo !== undefined) {
                return memo;
            }
            const built =
                name === "reverse" ? this.buildReverse(s, record, packed) : this.buildEdgeList(s, record, packed);
            record.views.set(memoKey, built);
            return built;
        }
        if (packed) {
            throw new WebGpuGraphError("E_UNSUPPORTED", "packViews applies to the reverse and edgeList views only", {
                option: "packViews",
                hint: `the ${name} view uploads one array`,
            });
        }
        let array: TypedArrayData;
        let bindingName: string;
        let scalars: Readonly<Record<string, readonly number[]>> = {};
        switch (name) {
            case "outDegree":
                this.assertNotReleased(s);
                this.assertNonEmpty(s);
                array = s.outDegree();
                bindingName = "outDegree";
                break;
            case "inDegree":
                this.assertNotReleased(s);
                this.assertNonEmpty(s);
                array = s.inDegree();
                bindingName = "inDegree";
                break;
            case "degreeOrder": {
                this.assertNotReleased(s);
                this.assertNonEmpty(s);
                const order = s.degreeOrder();
                array = order.perm;
                bindingName = "perm";
                scalars = { segmentOffsets: Array.from(order.segmentOffsets) };
                break;
            }
            case "reverseDegreeOrder": {
                this.assertNotReleased(s);
                this.assertNonEmpty(s);
                const order = s.degreeOrder({ of: "reverse" });
                array = order.perm;
                bindingName = "perm";
                scalars = { segmentOffsets: Array.from(order.segmentOffsets) };
                break;
            }
            case "coo":
            case "mate":
                throw new WebGpuGraphError("E_UNSUPPORTED", `the ${name} view is not uploaded before P11`, {
                    feature: `view:${name}`,
                    hint: "outDegree, inDegree, degreeOrder, reverseDegreeOrder, reverse and edgeList are uploaded",
                });
            default:
                throw invalid("name", name, "a view name");
        }
        const record = this.ensureRecord(s);
        const resident = this.upload(record, array, array, `residency:view:${record.serial}:${name}`);
        const binding: Binding = { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null };
        return Object.freeze({
            view: name,
            bindings: Object.freeze({ [bindingName]: binding }),
            scalars: Object.freeze(scalars),
        });
    }

    /**
     * The reverse adjacency's bindings. On an UNDIRECTED snapshot graph-format invariant I7 makes reverse() return
     * the FORWARD arrays, so the core bindings ARE the reverse bindings and nothing is uploaded -- delegating to
     * core() rather than re-uploading the arrays is what makes that true on the arena plan as well, where the
     * per-array WeakMap key resolves to the whole-arena resident (spec 4.3 lines 1182-1186). `fwdArc` is never
     * uploaded (spec 13 row P7). `packed` is ignored when undirected: there is nothing to pack.
     * @param s - the snapshot
     * @param record - its residency record
     * @param packed - concatenate the arrays into one buffer (directed only)
     * @returns the view binding
     */
    private buildReverse(s: GraphSnapshot, record: ResidencyRecord, packed: boolean): ViewBinding {
        const rev = s.reverse();
        if (!s.directed) {
            const core = this.core(s, ["rowPtr", "colIdx", "weights"]);
            if (core.plan === "windowed") {
                // a view is never windowed (spec 4.3): window 0's colIdx must not pose as the whole reverse adjacency
                throw new WebGpuGraphError(
                    "E_TOO_LARGE",
                    `snapshot ${s.serial}: the undirected reverse view is the core, which needs arc windows (${core.windows?.length ?? 0}) that no view executes`,
                    {
                        needed: 4 * s.arcCount,
                        limit: this.caps.limits.maxStorageBufferBindingSize,
                        path: "windowed",
                        algorithm: null,
                    },
                );
            }
            const bindings: Record<string, Binding> = { rowPtr: core.rowPtr };
            if (core.colIdx !== null) {
                bindings.colIdx = core.colIdx;
            }
            if (core.weights !== null) {
                bindings.weights = core.weights;
            }
            return Object.freeze({
                view: "reverse",
                bindings: Object.freeze(bindings),
                scalars: Object.freeze({ arcCount: [rev.arcCount], directed: [0] }),
            });
        }
        const arrays: [string, TypedArrayData][] = [
            ["rowPtr", rev.rowPtr],
            ["colIdx", rev.colIdx],
        ];
        if (rev.weights !== null) {
            arrays.push(["weights", rev.weights]);
        }
        const bindings = packed
            ? this.packArrays(
                  record,
                  arrays,
                  this.packKey(record, "reverse:packed"),
                  `residency:view:${record.serial}:reverse:packed`,
              )
            : this.separateArrays(record, arrays, `residency:view:${record.serial}:reverse`);
        return Object.freeze({
            view: "reverse",
            bindings,
            scalars: Object.freeze({ arcCount: [rev.arcCount], directed: [1] }),
        });
    }

    /**
     * The each-edge-once binding an edge-parallel kernel uses on directed and undirected snapshots alike (spec 8.1
     * row 2); `arc` is not uploaded (no kernel of P7 reads it).
     * @param s - the snapshot
     * @param record - its residency record
     * @param packed - concatenate into one buffer
     * @returns the view binding
     */
    private buildEdgeList(s: GraphSnapshot, record: ResidencyRecord, packed: boolean): ViewBinding {
        const list = s.edgeList();
        const arrays: [string, TypedArrayData][] = [
            ["src", list.src],
            ["dst", list.dst],
        ];
        if (list.weights !== null) {
            arrays.push(["weights", list.weights]);
        }
        const bindings = packed
            ? this.packArrays(
                  record,
                  arrays,
                  this.packKey(record, "edgeList:packed"),
                  `residency:view:${record.serial}:edgeList:packed`,
              )
            : this.separateArrays(record, arrays, `residency:view:${record.serial}:edgeList`);
        return Object.freeze({
            view: "edgeList",
            bindings,
            scalars: Object.freeze({ edgeCount: [s.edgeCount] }),
        });
    }

    /**
     * One resident per array (spec 4.3: views upload in perArray mode, never into the arena). An empty array (the
     * colIdx of an edgeless directed reverse view, the src / dst of an edgeless edgeList) is skipped: spec 5.6 never
     * uploads a zero-length array, and Kernel.bind rejects a zero-size binding, so it is absent as in core().
     * @param record - the owning record
     * @param arrays - the named arrays
     * @param label - the buffer label prefix
     * @returns the bindings by name
     */
    private separateArrays(
        record: ResidencyRecord,
        arrays: readonly (readonly [string, TypedArrayData])[],
        label: string,
    ): Readonly<Record<string, Binding>> {
        const bindings: Record<string, Binding> = {};
        for (const [name, array] of arrays) {
            if (array.byteLength === 0) {
                continue;
            }
            const resident = this.upload(record, array, array, `${label}:${name}`);
            bindings[name] = { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null };
        }
        return Object.freeze(bindings);
    }

    /**
     * The arrays concatenated into ONE buffer at STORAGE_ALIGN-aligned offsets (spec 4.3 packViews): one
     * createBuffer and one writeBuffer instead of three of each, which is what the option buys. The resident is
     * keyed on `key`, a marker object owned by the record (packKey), NOT on one of the snapshot's arrays: upload()
     * returns an existing resident whenever the key matches and the serial matches, without comparing byte
     * lengths, so keying the packed buffer on `rev.rowPtr` would make the packed and the unpacked view of one
     * snapshot collide -- whichever was built second would get the other's buffer. The record still owns the
     * resident, so release(s) destroys it with the rest. Offsets are STORAGE_ALIGN-aligned because Kernel.bind
     * rejects any other offset synchronously (E_INVALID_ARGUMENT { argument: "offset" }). Empty arrays are left
     * out as in separateArrays; when nothing is left, nothing is uploaded.
     * @param record - the owning record
     * @param all - the named arrays, in buffer order
     * @param key - the marker object the resident is keyed on
     * @param label - the buffer label
     * @returns the bindings by name, all into the one buffer
     */
    private packArrays(
        record: ResidencyRecord,
        all: readonly (readonly [string, TypedArrayData])[],
        key: object,
        label: string,
    ): Readonly<Record<string, Binding>> {
        const arrays = all.filter(([, array]) => array.byteLength > 0);
        if (arrays.length === 0) {
            return Object.freeze({});
        }
        const offsets: number[] = [];
        let total = 0;
        for (const [, array] of arrays) {
            offsets.push(total);
            total += Math.ceil(array.byteLength / STORAGE_ALIGN) * STORAGE_ALIGN;
        }
        const staging = new Uint8Array(total);
        arrays.forEach(([, array], i) => {
            staging.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offsets[i]);
        });
        const resident = this.upload(record, key, staging, label);
        const bindings: Record<string, Binding> = {};
        arrays.forEach(([name, array], i) => {
            bindings[name] = { buffer: resident.buffer, offset: offsets[i], size: array.byteLength, window: null };
        });
        return Object.freeze(bindings);
    }

    /**
     * The upload key of a packed view: a marker object allocated once per record and memo name, never one of the
     * snapshot's arrays.
     * @param record - the owning record
     * @param memoKey - the `views` memo key of this packed view
     * @returns the stable marker object
     */
    private packKey(record: ResidencyRecord, memoKey: string): object {
        const existing = record.packKeys.get(memoKey);
        if (existing !== undefined) {
            return existing;
        }
        const created = {};
        record.packKeys.set(memoKey, created);
        return created;
    }

    /**
     * gpuView(name) + column.version; re-uploads in place when the version changed and the byte length did not
     * (spec 4.3). CONTRACT DECISION: `owner` is required so release(owner) can find the buffer (a table has no
     * back-reference to its snapshot). The key is the Column object (PLAN DECISION 8). E_GPU_INELIGIBLE and
     * E_UNKNOWN_COLUMN from the format pass through unchanged.
     * @param table - the table holding the column
     * @param name - the column name
     * @param owner - the snapshot the buffer is recorded against
     * @returns the column binding
     */
    column(table: AttributeTable, name: string, owner: GraphSnapshot): ColumnBinding {
        this.assertLive();
        assertAttached(owner);
        this.assertNotReleased(owner);
        const column = table.require(name);
        const data = table.gpuView(name);
        if (data.byteLength === 0) {
            throw invalid("column", name, "a column with at least one row (zero-length arrays are never uploaded)");
        }
        const record = this.ensureRecord(owner);
        const label = `residency:column:${record.serial}:${column.meta.domain}.${name}`;
        const existing = this.residents.get(column);
        let resident: Resident;
        if (
            existing !== undefined &&
            !existing.destroyed &&
            existing.serial === record.serial &&
            existing.byteLength === data.byteLength
        ) {
            resident = existing;
            if (resident.version !== column.version) {
                this.device.queue.writeBuffer(resident.buffer, 0, data);
                resident.version = column.version;
            }
        } else {
            if (existing !== undefined) {
                // the stale buffer stays in its record until release (spec 4.1: no leak, no stale read)
                this.residents.delete(column);
            }
            resident = this.upload(record, column, data, label);
            resident.version = column.version;
        }
        return Object.freeze({
            binding: { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null },
            column,
            version: resident.version,
            eligibility: column.gpu,
            components: column.meta.components,
        });
    }

    /**
     * Any format array keyed on the object; registered against `owner` when given (spec 4.1).
     * @param key - the array (a non-empty, 4-byte-multiple array over a plain ArrayBuffer)
     * @param label - the buffer label suffix
     * @param owner - the snapshot to record the buffer against, or undefined for a caller-owned buffer
     * @returns the array binding; `destroy()` is idempotent (PLAN DECISION 12)
     */
    array(key: TypedArrayData, label: string, owner?: GraphSnapshot): ArrayBinding {
        this.assertLive();
        if (key.byteLength === 0 || key.byteLength % 4 !== 0) {
            throw invalid("key", key.byteLength, "a non-empty array whose byteLength is a multiple of 4");
        }
        if (isSharedBuffer(key.buffer)) {
            throw invalid("key", "SharedArrayBuffer", "an array over a plain ArrayBuffer");
        }
        let record: ResidencyRecord | null = null;
        if (owner !== undefined) {
            assertAttached(owner);
            this.assertNotReleased(owner);
            record = this.ensureRecord(owner);
        }
        const resident = this.upload(record, key, key, `residency:array:${label}`);
        const binding: Binding = { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null };
        return {
            binding,
            byteLength: resident.byteLength,
            owner: owner ?? null,
            destroy: (): void => {
                this.destroyResident(resident, record);
            },
        };
    }

    /**
     * Destroys every buffer recorded for s.serial (siblings included, Q-27) and tombstones the serial; idempotent
     * (spec 4.5); safe on a snapshot never uploaded (nothing to tombstone, PLAN DECISION 7).
     * @param s - the snapshot (or any withColumns() sibling)
     */
    release(s: GraphSnapshot): void {
        const record = this.bySerial.get(s.serial);
        if (record === undefined) {
            return;
        }
        for (const resident of [...record.entries]) {
            this.destroyResident(resident, record);
        }
        this.forget(record);
        this.tombstones.add(s.serial);
    }

    /** Drops every record WITHOUT destroying (device lost: the buffers are gone). @internal */
    clearOnLoss(): void {
        for (const record of [...this.bySerial.values()]) {
            for (const resident of record.entries) {
                resident.destroyed = true;
                if (this.residents.get(resident.key) === resident) {
                    this.residents.delete(resident.key);
                }
            }
            record.entries.length = 0;
            this.forget(record);
        }
        for (const resident of this.orphans) {
            resident.destroyed = true;
            if (this.residents.get(resident.key) === resident) {
                this.residents.delete(resident.key);
            }
        }
        this.orphans.clear();
        this.liveCount = 0;
        this.liveBytesValue = 0;
    }

    /** Destroys everything (ctx.dispose()); idempotent. @internal */
    destroyAll(): void {
        for (const record of [...this.bySerial.values()]) {
            for (const resident of [...record.entries]) {
                this.destroyResident(resident, record);
            }
            this.forget(record);
        }
        for (const resident of [...this.orphans]) {
            this.destroyResident(resident, null);
        }
        this.disposed = true;
    }

    /**
     * The resident buffers, bytes and snapshots (spec 4.1).
     * @returns the statistics
     */
    stats(): ResidencyStats {
        const perSnapshot = [...this.bySerial.values()].map((record) => ({
            serial: record.serial,
            label: record.label,
            bytes: record.entries.reduce((sum, resident) => sum + resident.byteLength, 0),
            buffers: record.entries.length,
        }));
        return { buffers: this.liveCount, bytes: this.liveBytesValue, snapshots: this.bySerial.size, perSnapshot };
    }

    /**
     * Bytes of every resident buffer (graft: C R-18).
     * @returns the resident byte count
     */
    get residentBytes(): number {
        return this.liveBytesValue;
    }

    /**
     * True when the serial was released and not re-uploaded. @internal
     * @param serial - a snapshot serial
     * @returns whether a live user holding bindings of that serial must stop
     */
    isReleased(serial: number): boolean {
        return this.tombstones.has(serial);
    }

    /**
     * Binds one core array: a segment of the arena buffer when the buffer holds it, else its own buffer keyed on
     * the array object (the cold-segment-on-demand path of spec 4.2, and the whole perArray path).
     * @param record - the snapshot's record
     * @param s - the snapshot
     * @param name - a PRESENT core array
     * @returns the binding
     */
    private bindCore(record: ResidencyRecord, s: GraphSnapshot, name: CoreArrayName): Binding {
        if (record.arena !== null) {
            const segment = record.arena.segments[name];
            if (segment !== null) {
                return { buffer: record.arena.buffer, offset: segment.offset, size: segment.size, window: null };
            }
        }
        const array = coreArray(s, name);
        const resident = this.upload(record, array, array, `residency:core:${record.serial}:${name}`);
        return { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null };
    }

    /**
     * Uploads one arc-indexed array as the windowed plan's buffer ranges (spec 4.2: an array above maxBufferSize is
     * split across buffers at window boundaries), each keyed on a marker object of the record (windowKey), and
     * returns window 0's binding so a caller that ignores windows still binds something valid (PD-8).
     * @param record - the snapshot's record
     * @param s - the snapshot
     * @param name - a PRESENT arc-indexed core array
     * @param ranges - the plan's buffer ranges of the array
     * @param first - window 0
     * @returns the binding of window 0
     */
    private bindWindowed(
        record: ResidencyRecord,
        s: GraphSnapshot,
        name: "colIdx" | "weights" | "arcToEdge",
        ranges: readonly { readonly byteOffset: number; readonly byteLength: number }[],
        first: ArcWindow,
    ): Binding {
        const array = coreArray(s, name);
        const buffers = ranges.map(
            (range, index) =>
                this.upload(
                    record,
                    this.windowKey(record, `${name}:${index}`),
                    new Uint8Array(array.buffer, array.byteOffset + range.byteOffset, range.byteLength),
                    `residency:core:${record.serial}:${name}:w${index}`,
                ).buffer,
        );
        record.arcBuffers.set(name, buffers);
        return {
            buffer: buffers[first.bufferIndex],
            offset: first.offset,
            size: 4 * (first.end - first.start),
            window: first,
        };
    }

    /**
     * The upload key of one window buffer: a marker object allocated once per record and `<name>:<bufferIndex>`.
     * @param record - the owning record
     * @param memoKey - `<name>:<bufferIndex>`
     * @returns the stable marker object
     */
    private windowKey(record: ResidencyRecord, memoKey: string): object {
        const existing = record.windowKeys.get(memoKey);
        if (existing !== undefined) {
            return existing;
        }
        const created = {};
        record.windowKeys.set(memoKey, created);
        return created;
    }

    /**
     * Uploads `data` into a new buffer keyed on `key`, or returns the resident already uploaded for that key by
     * the same owner (PLAN DECISION 11: a resident belongs to one record).
     * @param record - the owning record, or null for an owner-less array
     * @param key - the object the buffer is keyed on
     * @param data - the bytes (byteLength a multiple of 4, graph-format invariant I10; a view over a plain
     *   ArrayBuffer, which is what writeBuffer's GPUAllowSharedBufferSource accepts under @webgpu/types 0.1.72)
     * @param label - the buffer label
     * @returns the resident
     */
    private upload(
        record: ResidencyRecord | null,
        key: object,
        data: ArrayBufferView<ArrayBuffer>,
        label: string,
    ): Resident {
        const serial = record === null ? null : record.serial;
        const existing = this.residents.get(key);
        if (existing !== undefined && !existing.destroyed && existing.serial === serial) {
            return existing;
        }
        const buffer = this.allocator.createBuffer({ label, size: data.byteLength, usage: RESIDENT_USAGE });
        this.device.queue.writeBuffer(buffer, 0, data);
        const resident: Resident = { key, buffer, byteLength: data.byteLength, serial, version: 0, destroyed: false };
        this.residents.set(key, resident);
        if (record === null) {
            this.orphans.add(resident);
        } else {
            record.entries.push(resident);
        }
        this.liveCount++;
        this.liveBytesValue += data.byteLength;
        return resident;
    }

    /**
     * Destroys one resident buffer and unregisters it; idempotent.
     * @param resident - the resident
     * @param record - its owning record, or null for an orphan
     */
    private destroyResident(resident: Resident, record: ResidencyRecord | null): void {
        if (resident.destroyed) {
            return;
        }
        resident.destroyed = true;
        this.allocator.destroy(resident.buffer);
        if (this.residents.get(resident.key) === resident) {
            this.residents.delete(resident.key);
        }
        if (record === null) {
            this.orphans.delete(resident);
        } else {
            const index = record.entries.indexOf(resident);
            if (index >= 0) {
                record.entries.splice(index, 1);
            }
        }
        this.liveCount--;
        this.liveBytesValue -= resident.byteLength;
    }

    /**
     * Marks a record released and drops it from the serial map (the snapshot WeakMap entries recognise it by the flag).
     * @param record - the record
     */
    private forget(record: ResidencyRecord): void {
        record.released = true;
        record.bindings.clear();
        record.views.clear();
        record.packKeys.clear();
        record.windowKeys.clear();
        record.arcBuffers.clear();
        record.windows = null;
        record.arena = null;
        record.plan = null;
        this.bySerial.delete(record.serial);
    }

    /**
     * The record of a snapshot's serial, created when absent (which lifts a tombstone and may fire the warning).
     * @param s - the snapshot
     * @returns the record
     */
    private ensureRecord(s: GraphSnapshot): ResidencyRecord {
        let record = this.records.get(s);
        if (record !== undefined && record.released) {
            record = undefined;
        }
        if (record === undefined) {
            record = this.bySerial.get(s.serial);
        }
        if (record === undefined) {
            record = {
                serial: s.serial,
                label: s.label,
                entries: [],
                plan: null,
                arena: null,
                bindings: new Map<CoreArrayName, Binding>(),
                views: new Map<string, ViewBinding>(),
                packKeys: new Map<string, object>(),
                windowKeys: new Map<string, object>(),
                windows: null,
                arcBuffers: new Map<CoreArrayName, GPUBuffer[]>(),
                released: false,
            };
            this.bySerial.set(s.serial, record);
            this.tombstones.delete(s.serial);
            if (!this.warned && this.bySerial.size > this.warnUnreleasedSnapshots) {
                this.warned = true;
                this.warn(
                    `[webgpu-graph-algorithms] ${this.bySerial.size} snapshots are resident on the device (warnUnreleasedSnapshots = ${this.warnUnreleasedSnapshots}); call ctx.release(snapshot) for superseded snapshots -- GPU memory is never freed by garbage collection (spec 4.1)`,
                );
            }
        }
        this.records.set(s, record);
        return record;
    }

    /**
     * Throws E_RELEASED for a tombstoned serial (a bind without a fresh core()).
     * @param s - the snapshot
     */
    private assertNotReleased(s: GraphSnapshot): void {
        if (this.tombstones.has(s.serial)) {
            throw new WebGpuGraphError(
                "E_RELEASED",
                `snapshot ${s.serial} was released; upload it again through core() before binding views, columns or arrays`,
                { serial: s.serial },
            );
        }
    }

    /**
     * Throws E_INVALID_ARGUMENT for an empty snapshot (a view of it would be a zero-length array, spec 5.6).
     * @param s - the snapshot
     */
    private assertNonEmpty(s: GraphSnapshot): void {
        if (s.nodeCount === 0) {
            throw invalid("snapshot", 0, "nodeCount > 0 (an empty snapshot has no per-node view to upload)");
        }
    }

    /** Throws E_DISPOSED after destroyAll() (PLAN DECISION 13). */
    private assertLive(): void {
        if (this.disposed) {
            throw new WebGpuGraphError("E_DISPOSED", "the residency was disposed", { label: "residency" });
        }
    }
}
