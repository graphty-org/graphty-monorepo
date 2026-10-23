import { m as dt, K as En, L as Co, M as Bo, Q as ui, T as Mo, U as Go, E as xr } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
const Bs = 256,
    Bt = 65535,
    ts = Bt * Bs,
    ye = 4294967295,
    Rr = 256,
    Mt = 64,
    Dr = 256,
    Ye = 256,
    cr = 32768,
    zo = 3,
    Fo = 256,
    kn = 16 * 1024 * 1024,
    Wo = 4,
    Uo = 4 * 1024,
    Vo = 64 * 1024 * 1024,
    di = 16 * 1024 * 1024,
    fi = 2,
    Fe = 256,
    qt = 32,
    He = 256,
    hi = 64,
    At = Object.freeze({
        maxIter: 100,
        jitterTolerance: 1,
        scalingRatio: 2,
        gravity: 1,
        strongGravity: !1,
        distributedAction: !1,
        linlog: !1,
        dissuadeHubs: !1,
        dim: 2,
        scale: 1,
        settleThreshold: 0.001,
        settleWindow: 10,
        iterationsPerStep: 1,
        maxInFlight: 2,
    }),
    mt = Object.freeze({
        repulsion: "auto",
        exactMaxNodes: cr,
        nearMax: 64,
        deterministic: !0,
        gridMax2D: 512,
        gridMax3D: 128,
        extentFactor: 6,
        compat: "paper",
    }),
    jo = 0.01,
    qo = 1e-4,
    Ko = 1e-8,
    In = 128,
    Es = 1,
    An = 2,
    Pr = 0.1,
    Ho = 0.7,
    Yo = 0.9,
    Xo = 5,
    Qo = 1e4,
    Zo = Object.freeze({
        k: null,
        iterations: 50,
        fixed: null,
        dim: 2,
        scale: 1,
        settleThreshold: 0.001,
        settleWindow: 10,
        iterationsPerStep: 1,
        maxInFlight: 2,
        cooling: "linear",
    }),
    Jo = 300,
    ks = Object.freeze({
        springLength: 10,
        springCoefficient: 0.8,
        gravity: -12,
        dragCoefficient: 0.9,
        timeStep: 0.5,
        dim: 2,
        scale: 1,
        settleThreshold: 0.001,
        settleWindow: 10,
        iterationsPerStep: 1,
        maxInFlight: 2,
    }),
    xn = Object.freeze({ springElectrical: 0.003, fruchtermanReingold: 0.002 }),
    ea = 2e3,
    ta = 2 ** 128 - 2 ** 104,
    pi = 8,
    gi = 4,
    Rn = 1024,
    Dn = 1e-6,
    Tn = 1.01,
    ra = 24,
    ue = 32,
    sa = 4096,
    ia = 2,
    na = 24,
    oa = 32,
    Gt = 2139095040,
    aa = 0.25,
    ca = 256,
    la = 2,
    ua = 100,
    da = 256,
    kr = 64,
    Ms = 32,
    fa = 4096,
    mi = 8,
    kt = 4,
    ha = 2147483648,
    pa = 32,
    rs = 128,
    ss = 65e3,
    Ln = 2,
    ga = 32,
    ma = Object.freeze({});
class h extends Error {
    constructor(e, t, s) {
        (super(t),
            (this.name = "WebGpuGraphError"),
            (this.code = e),
            (this.details = s === void 0 ? ma : Object.freeze({ ...s })));
    }
}
function xt(r) {
    if (typeof r != "object" || r === null) return !1;
    const e = r;
    return e.name === "WebGpuGraphError" && typeof e.code == "string";
}
function Ir(r, e) {
    return xt(r) && r.code === e;
}
const wi = Object.freeze([
        "maxBufferSize",
        "maxStorageBufferBindingSize",
        "maxStorageBuffersPerShaderStage",
        "maxComputeWorkgroupStorageSize",
        "maxComputeInvocationsPerWorkgroup",
        "maxComputeWorkgroupSizeX",
    ]),
    wa = [
        "maxTextureDimension1D",
        "maxTextureDimension2D",
        "maxTextureDimension3D",
        "maxTextureArrayLayers",
        "maxBindGroups",
        "maxBindGroupsPlusVertexBuffers",
        "maxBindingsPerBindGroup",
        "maxDynamicUniformBuffersPerPipelineLayout",
        "maxDynamicStorageBuffersPerPipelineLayout",
        "maxSampledTexturesPerShaderStage",
        "maxSamplersPerShaderStage",
        "maxStorageBuffersPerShaderStage",
        "maxStorageBuffersInVertexStage",
        "maxStorageBuffersInFragmentStage",
        "maxStorageTexturesPerShaderStage",
        "maxStorageTexturesInVertexStage",
        "maxStorageTexturesInFragmentStage",
        "maxUniformBuffersPerShaderStage",
        "maxUniformBufferBindingSize",
        "maxStorageBufferBindingSize",
        "minUniformBufferOffsetAlignment",
        "minStorageBufferOffsetAlignment",
        "maxVertexBuffers",
        "maxBufferSize",
        "maxVertexAttributes",
        "maxVertexBufferArrayStride",
        "maxInterStageShaderVariables",
        "maxColorAttachments",
        "maxColorAttachmentBytesPerSample",
        "maxComputeWorkgroupStorageSize",
        "maxComputeInvocationsPerWorkgroup",
        "maxComputeWorkgroupSizeX",
        "maxComputeWorkgroupSizeY",
        "maxComputeWorkgroupSizeZ",
        "maxComputeWorkgroupsPerDimension",
        "maxImmediateSize",
    ],
    bi = new WeakSet();
function On(r) {
    return r instanceof Error ? r.message : String(r);
}
function Nn(r) {
    return (
        r.architecture === "software" ||
        r.architecture === "swiftshader" ||
        r.architecture === "warp" ||
        r.isFallbackAdapter === !0
    );
}
function Kt(r) {
    const { info: e } = r,
        t = r.limits,
        s = {};
    for (const i of wa) {
        const n = t[i];
        typeof n == "number" && (s[i] = n);
    }
    return Object.freeze({
        vendor: e.vendor,
        architecture: e.architecture,
        device: e.device,
        description: e.description,
        software: Nn(e),
        subgroupMinSize: e.subgroupMinSize ?? 0,
        subgroupMaxSize: e.subgroupMaxSize ?? 0,
        features: Object.freeze(Array.from(r.features).sort()),
        limits: Object.freeze(s),
    });
}
async function $n(r, e) {
    let t;
    try {
        t = await r.requestAdapter({ powerPreference: e });
    } catch (s) {
        const i = `requestAdapter() threw: ${On(s)}`;
        throw new h("E_NO_ADAPTER", i, { reason: i });
    }
    if (t === null) {
        const s = "requestAdapter() returned null: no usable WebGPU adapter";
        throw new h("E_NO_ADAPTER", s, { reason: s });
    }
    return t;
}
function ba(r, e) {
    const t = {};
    if (e === "default") return t;
    if (e === "raise") {
        for (const s of wi) t[s] = r.limits[s];
        return t;
    }
    for (const s of wi) {
        const i = e[s];
        if (i === void 0) continue;
        const n = r.limits[s];
        if (i > n)
            throw new h("E_NO_DEVICE", `requested ${s} = ${i} exceeds the adapter's ${n}`, {
                reason: "limit",
                adapter: Kt(r),
                limit: s,
                requested: i,
                available: n,
            });
        t[s] = i;
    }
    return t;
}
function va(r, e, t) {
    const s = [];
    for (const i of e) {
        if (!r.features.has(i))
            throw new h("E_NO_DEVICE", `required feature "${i}" is not supported by the adapter`, {
                reason: "feature",
                adapter: Kt(r),
                requested: i,
            });
        s.includes(i) || s.push(i);
    }
    for (const i of t) r.features.has(i) && !s.includes(i) && s.push(i);
    return s;
}
function vi(r, e) {
    return new h(
        "E_NO_DEVICE",
        `the adapter already created a device (an adapter is consumed by one requestDevice, spec 2.2 step 1): ${e}`,
        { reason: "consumed", adapter: Kt(r) },
    );
}
async function ya(r, e) {
    if (bi.has(r)) throw vi(r, "recorded by this package");
    let t;
    try {
        t = await r.requestDevice(e);
    } catch (s) {
        const i = On(s);
        throw /consumed|already been used/i.test(i)
            ? vi(r, i)
            : new h("E_NO_DEVICE", `requestDevice() rejected: ${i}`, { reason: "requestDevice", adapter: Kt(r) });
    }
    return (bi.add(r), t);
}
function _a(r, e, t, s) {
    const i = new Set(r.features),
        n = i.has("subgroups");
    return {
        limits: r.limits,
        features: i,
        wgslFeatures: new Set(s),
        subgroupMinSize: n ? (e.subgroupMinSize ?? 0) : 0,
        subgroupMaxSize: n ? (e.subgroupMaxSize ?? 0) : 0,
        software: Nn(e),
        runtime: t,
        vendor: e.vendor,
        architecture: e.architecture,
        device: e.device,
        description: e.description,
    };
}
function yi(r, e) {
    const t = new Set(r.features),
        s = t.has("subgroups");
    return {
        limits: r.limits,
        features: t,
        wgslFeatures: e?.wgslFeatures ?? new Set(),
        subgroupMinSize: s ? (e?.subgroupMinSize ?? 0) : 0,
        subgroupMaxSize: s ? (e?.subgroupMaxSize ?? 0) : 0,
        software: e?.software ?? !1,
        runtime: e?.runtime ?? "unknown",
        vendor: e?.vendor ?? "",
        architecture: e?.architecture ?? "",
        device: e?.device ?? "",
        description: e?.description ?? "",
    };
}
function Gs(r) {
    const e = Math.min(Bs, r.limits.maxComputeInvocationsPerWorkgroup);
    let t = 1;
    for (; t * 2 <= e;) t *= 2;
    return t;
}
function is(r) {
    const e = r.limits.maxComputeWorkgroupsPerDimension;
    if (e !== Bt)
        throw new h(
            "E_NO_DEVICE",
            `maxComputeWorkgroupsPerDimension is ${e}; the dispatch planner and the WGSL prelude bake ${Bt}`,
            { reason: "maxComputeWorkgroupsPerDimension", adapter: null, requested: Bt, available: e },
        );
    const t = Gs(r);
    if (t < 64)
        throw new h(
            "E_NO_DEVICE",
            `the device allows a workgroup of ${t} invocations; the kernels need a power of two >= 64`,
            { reason: "limit", adapter: null, limit: "maxComputeInvocationsPerWorkgroup", requested: 64, available: t },
        );
}
function Pa(r, e) {
    return r.messages.map((t) => {
        if (t.lineNum === 0) return `${t.type} ${t.message}`;
        const s = t.lineNum - e;
        return s >= 1
            ? `${t.type} ${s}:${t.linePos} ${t.message}`
            : `${t.type} prelude:${t.lineNum}:${t.linePos} ${t.message}`;
    });
}
class Sa {
    constructor(e, t) {
        ((this.live = new Map()),
            (this.residentBytes = 0),
            (this.pending = []),
            (this.failure = null),
            (this.serial = 0),
            (this.device = e),
            (this.threshold = t ?? kn));
    }
    createBuffer(e) {
        this.serial += 1;
        const t = e.label === void 0 || e.label === "" ? `buffer-${this.serial}` : e.label,
            { size: s } = e,
            i = s >= this.threshold;
        i && this.device.pushErrorScope("out-of-memory");
        const n = this.device.createBuffer({ ...e, label: t });
        if ((this.live.set(n, s), (this.residentBytes += s), i)) {
            const o = this.device.popErrorScope().then(
                (a) => {
                    a !== null &&
                        (this.live.has(n) && (this.live.delete(n), (this.residentBytes -= s)),
                        this.failure === null &&
                            (this.failure = new h(
                                "E_OUT_OF_MEMORY",
                                `out of memory creating "${t}" (${s} bytes, ${this.residentBytes} resident): ${a.message}`,
                                { requested: s, resident: this.residentBytes, label: t },
                            )));
                },
                () => {},
            );
            this.pending.push(o);
        }
        return n;
    }
    destroy(e) {
        const t = this.live.get(e);
        (t !== void 0 && (this.live.delete(e), (this.residentBytes -= t)), e.destroy());
    }
    async check() {
        for (; this.pending.length > 0;) {
            const e = this.pending.splice(0);
            await Promise.all(e);
        }
        if (this.failure !== null) throw this.failure;
    }
    reset() {
        this.failure = null;
    }
    get resident() {
        return this.residentBytes;
    }
    get liveBuffers() {
        return this.live.size;
    }
}
class Ea {
    constructor() {
        this.queue = [];
    }
    set(e) {
        this.queue.push(e);
    }
    take() {
        if (this.queue.length === 0) return null;
        const e = this.queue.splice(0);
        let t = null;
        for (let s = e.length - 1; s >= 0; s -= 1) {
            const i = e[s];
            t = t === null ? i : new h(i.code, i.message, { ...i.details, next: t });
        }
        return t;
    }
    get pending() {
        return this.queue.length > 0;
    }
}
function ka(r, e) {
    const { message: t } = r;
    return r.constructor.name === "GPUOutOfMemoryError"
        ? new h("E_OUT_OF_MEMORY", `uncaptured out-of-memory error on "${e}": ${t}`, {
              requested: 0,
              resident: 0,
              label: e,
          })
        : new h("E_VALIDATION", `uncaptured validation error on "${e}": ${t}`, { label: e, message: t });
}
function Ia(r, e, t) {
    let s = !0;
    const i = r.label ?? "",
        n = (o) => {
            if (!s) return;
            const a = ka(o.error, i);
            t !== null ? t(a) : e.set(a);
        };
    return (
        r.addEventListener("uncapturederror", n),
        () => {
            ((s = !1), typeof r.removeEventListener == "function" && r.removeEventListener("uncapturederror", n));
        }
    );
}
function Aa(r, e) {
    let t = !1;
    return r.lost.then((s) => (t || ((t = !0), e(s)), s));
}
function Cn(r) {
    return new h("E_DEVICE_LOST", `device lost (${r.reason}): ${r.message}`, { reason: r.reason, message: r.message });
}
const ns = 16,
    xa = 32,
    _i = new WeakMap();
let Pi = 1;
function Ra(r) {
    let e = _i.get(r);
    return (e === void 0 && ((e = Pi), (Pi += 1), _i.set(r, e)), e);
}
function Da(r, e) {
    return r.offset < e.offset + e.size && e.offset < r.offset + r.size;
}
class Ta {
    constructor(e, t, s, i, n) {
        ((this.cache = new Map()),
            (this.device = e),
            (this.spec = t),
            (this.pipeline = i),
            (this.layouts = n),
            (this.workgroupSize = s.overrides.WG),
            (this.entryPoint = s.entryPoint));
        const o = n.map(() => []);
        for (const a of t.bindings) o[a.group].push(a);
        for (const a of o) a.sort((c, l) => c.binding - l.binding);
        ((this.groups = o), (this.dynamicCounts = o.map((a) => a.filter((c) => c.kind === "uniform").length)));
    }
    bind(e) {
        const { id: t } = this.spec,
            s = new Map(this.spec.bindings.map((f) => [f.name, f]));
        for (const f of Object.keys(e))
            if (!s.has(f))
                throw new h("E_INVALID_ARGUMENT", `${t}: no binding named "${f}"`, {
                    argument: "bindings",
                    value: f,
                    expected: [...s.keys()].join(", "),
                });
        const i = [];
        for (const f of this.spec.bindings) {
            const p = e[f.name];
            if (p === void 0)
                throw new h("E_INVALID_ARGUMENT", `${t}: binding "${f.name}" is missing`, {
                    argument: "bindings",
                    value: f.name,
                    expected: "a Binding for every declared name",
                });
            if (!(Number.isInteger(p.size) && p.size > 0))
                throw new h("E_INVALID_ARGUMENT", `${t}: binding "${f.name}" has size ${p.size}`, {
                    argument: f.name,
                    value: p.size,
                    expected: "size > 0 (a zero-length buffer is never bound)",
                });
            if (!(Number.isInteger(p.offset) && p.offset >= 0 && p.offset % Dr === 0))
                throw new h("E_INVALID_ARGUMENT", `${t}: binding "${f.name}" has offset ${p.offset}`, {
                    argument: f.name,
                    value: p.offset,
                    expected: `a multiple of ${Dr} (spec 2.6: the offset alignment the package always honours)`,
                });
            i.push({ decl: f, binding: p });
        }
        for (let f = 0; f < i.length; f++)
            for (let p = f + 1; p < i.length; p++) {
                const g = i[f],
                    m = i[p];
                if (!(
                    g.binding.buffer !== m.binding.buffer || !(g.decl.kind === "storage" || m.decl.kind === "storage")
                )) {
                    if (g.decl.kind !== m.decl.kind)
                        throw new h(
                            "E_INVALID_ARGUMENT",
                            `${t}: "${g.decl.name}" and "${m.decl.name}" bind one buffer with different access modes (writable usage next to another usage)`,
                            {
                                argument: "aliasing",
                                value: [g.decl.name, m.decl.name],
                                expected: "one access mode per buffer when a slot is read_write",
                                reason: "usage",
                            },
                        );
                    if (Da(g.binding, m.binding))
                        throw new h(
                            "E_INVALID_ARGUMENT",
                            `${t}: "${g.decl.name}" and "${m.decl.name}" bind intersecting ranges of one read_write buffer`,
                            {
                                argument: "aliasing",
                                value: [g.decl.name, m.decl.name],
                                expected: "disjoint ranges",
                                reason: "range",
                            },
                        );
                }
            }
        const n = i.map(({ binding: f }) => `${Ra(f.buffer)}:${f.offset}:${f.size}`).join("|"),
            o = this.cache.get(n);
        if (o !== void 0) return (this.cache.delete(n), this.cache.set(n, o), o);
        const a = new Map(i.map(({ decl: f, binding: p }) => [f.name, p])),
            c = this.layouts.map((f, p) =>
                this.device.createBindGroup({
                    label: `${t}/${p}`,
                    layout: f,
                    entries: this.groups[p].map((g) => {
                        const m = a.get(g.name);
                        return { binding: g.binding, resource: { buffer: m.buffer, offset: m.offset, size: m.size } };
                    }),
                }),
            ),
            l = [];
        this.dynamicCounts.forEach((f, p) => {
            f > 0 && l.push(p);
        });
        const d = Object.freeze({ kernel: this, bindGroups: Object.freeze(c), dynamicGroups: Object.freeze(l) });
        return (this.cache.set(n, d), this.cache.size > xa && this.cache.delete(this.cache.keys().next().value), d);
    }
    dispatch(e, t, s, i) {
        (this.check(t, i), s.x !== 0 && (this.setUp(e, t, i), e.dispatchWorkgroups(s.x, s.y, s.z)));
    }
    dispatchIndirect(e, t, s, i, n) {
        if ((this.check(t, n), !Number.isInteger(i) || i < 0 || (i + 1) * ns > s.size))
            throw new h("E_INVALID_ARGUMENT", `${this.spec.id}: args slot ${i} is outside the binding`, {
                argument: "slot",
                value: i,
                expected: `0 <= slot < ${Math.floor(s.size / ns)}`,
            });
        (this.setUp(e, t, n), e.dispatchWorkgroupsIndirect(s.buffer, s.offset + ns * i));
    }
    check(e, t) {
        const { id: s } = this.spec;
        if (e.kernel !== this)
            throw new h("E_INVALID_ARGUMENT", `${s}: the bound kernel belongs to "${e.kernel.spec.id}"`, {
                argument: "bound",
                value: e.kernel.spec.id,
                expected: s,
            });
        if (t !== void 0 && t.length !== e.dynamicGroups.length)
            throw new h(
                "E_INVALID_ARGUMENT",
                `${s}: ${t.length} dynamic offsets for ${e.dynamicGroups.length} dynamic groups`,
                { argument: "dynamicOffsets", value: t.length, expected: e.dynamicGroups.length },
            );
    }
    setUp(e, t, s) {
        e.setPipeline(this.pipeline);
        let i = 0;
        t.bindGroups.forEach((n, o) => {
            const a = this.dynamicCounts[o];
            if (a > 0) {
                const c = s?.[i] ?? 0;
                i += 1;
                const l = [];
                for (let d = 0; d < a; d++) l.push(c);
                e.setBindGroup(o, n, l);
            } else e.setBindGroup(o, n);
        });
    }
    invalidate() {
        this.cache.clear();
    }
}
const ie = Object.freeze({
        MAP_READ: 1,
        MAP_WRITE: 2,
        COPY_SRC: 4,
        COPY_DST: 8,
        INDEX: 16,
        VERTEX: 32,
        UNIFORM: 64,
        STORAGE: 128,
        INDIRECT: 256,
        QUERY_RESOLVE: 512,
    }),
    Si = Object.freeze({ READ: 1, WRITE: 2 }),
    Ei = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
function It(r) {
    if (!Number.isFinite(r))
        throw new h("E_INVALID_ARGUMENT", `wgslF32Literal: ${r} is not a finite number`, {
            argument: "value",
            value: r,
            expected: "a finite number",
        });
    const e = String(r);
    return /[.e]/.test(e) ? e : `${e}.0`;
}
const Bn = `// ---- prelude: constants, standard overrides, helpers (every module receives this text first)
const INVALID_INDEX: u32 = ${dt}u;
const U32_MAX: u32 = ${ye}u;
const F32_INF_BITS: u32 = ${Gt}u;
const F32_SIGN_BIT: u32 = ${ha}u;
const MAX_WORKGROUPS_PER_DIM: u32 = ${Bt}u;
const EXACT_TILES_PER_PASS: u32 = ${In}u;
const FA2_DIST_FLOOR: f32 = ${It(jo)};
const FA2_DIST_FLOOR_SQ: f32 = ${It(qo)};
const FA2_COINCIDENT_SQ: f32 = ${It(Ko)};
const FA2_FLAG_FIRST: u32 = ${Es}u;
const FA2_FLAG_ADAPTIVE: u32 = ${An}u;
const FR_COOLING_STEP: f32 = ${It(Yo)};
const FR_COOLING_PATIENCE: u32 = ${Xo}u;
const GRID_HUB_CELL: u32 = ${Rn}u;
const GRID_EXTENT_FLOOR: f32 = ${It(Dn)};
const GRID_BBOX_MARGIN: f32 = ${It(Tn)};
const RADIX_BINS: u32 = ${Rr}u;
const RADIX_DIGIT_MASK: u32 = ${Rr - 1}u;
const APSP_TILE: u32 = ${Ms}u;
const GROUP_HASH_LOAD_FACTOR: u32 = ${Ln}u;
const TRIANGLE_BINARY_SEARCH_RATIO: u32 = ${ga}u;
const BC_SIGMA_EXPONENT_CAP: i32 = ${ua}i;
const F32_MAX: f32 = 0x1.fffffep+127;
override WG: u32 = ${Bs}u;
override USE_PERM: bool = false;
override HAS_WEIGHTS: bool = false;
override SUBGROUP_MIN: u32 = 4u;
override SUBGROUP_MAX: u32 = 0u;

fn linear_id(wid: vec3<u32>, lid: u32) -> u32 { return (wid.x + wid.y * MAX_WORKGROUPS_PER_DIM) * WG + lid; }
fn group_id(wid: vec3<u32>) -> u32 { return wid.x + wid.y * MAX_WORKGROUPS_PER_DIM; }
// betweenness: the power of two the counts of depth L + 1 are divided by, from the f32 bits of depth L's largest count
fn sigma_shift(maxBits: u32) -> i32 { return max(0i, i32((maxBits >> 23u) & 0xffu) - 127i - BC_SIGMA_EXPONENT_CAP); }
fn lowbias32(x0: u32) -> u32 {
    var x = x0;
    x = x ^ (x >> 16u);
    x = x * 0x7feb352du;
    x = x ^ (x >> 15u);
    x = x * 0x846ca68bu;
    x = x ^ (x >> 16u);
    return x;
}
fn mask_bit(w: u32, i: u32) -> bool { return ((w >> (i & 31u)) & 1u) == 1u; }
fn unpack_u8(w: u32, i: u32) -> u32 { return (w >> (8u * (i & 3u))) & 0xFFu; }
fn pair_hash(i: u32, j: u32) -> u32 { return lowbias32((min(i, j) * 0x9E3779B9u) ^ max(i, j)); }
fn order_key(w: f32) -> u32 {
    let raw = bitcast<u32>(w);
    let bits = select(raw, 0u, raw == F32_SIGN_BIT);
    return select(bits | F32_SIGN_BIT, ~bits, (bits & F32_SIGN_BIT) != 0u);
}
fn hash_unit(h: u32) -> f32 { return f32(h >> 8u) * (1.0 / 16777216.0); }
fn hash_dir(h: u32, dim: u32) -> vec3f {
    let phi = 6.283185307179586 * hash_unit(h);
    if (dim == 2u) { return vec3f(cos(phi), sin(phi), 0.0); }
    let z = 2.0 * hash_unit(lowbias32(h ^ 0x5bd1e995u)) - 1.0;
    let r = sqrt(max(0.0, 1.0 - z * z));
    return vec3f(r * cos(phi), r * sin(phi), z);
}
fn kick_dir(i: u32, j: u32, dim: u32) -> vec3f {
    let d = hash_dir(pair_hash(i, j), dim);
    return select(d, -d, i > j);
}`;
Bn.split(`
`).length;
const La = `var<workgroup> wg_scratch_v: array<vec4f, WG>;
var<workgroup> wg_scratch_u: array<u32, WG>;
fn combine_v(a: vec4f, b: vec4f, op: u32) -> vec4f {
    if (op == 1u) { return min(a, b); }
    if (op == 2u) { return max(a, b); }
    return a + b;
}
fn combine_u(a: u32, b: u32, op: u32) -> u32 {
    if (op == 1u) { return min(a, b); }
    if (op == 2u) { return max(a, b); }
    return a + b;
}
fn wg_reduce_vec4(v: vec4f, lid: u32, op: u32) -> vec4f {
    workgroupBarrier();
    wg_scratch_v[lid] = v;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s >> 1u) {
        if (lid < s) { wg_scratch_v[lid] = combine_v(wg_scratch_v[lid], wg_scratch_v[lid + s], op); }
        workgroupBarrier();
    }
    let total = wg_scratch_v[0];
    workgroupBarrier();
    return total;
}
fn wg_reduce_u32(v: u32, lid: u32, op: u32) -> u32 {
    workgroupBarrier();
    wg_scratch_u[lid] = v;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s >> 1u) {
        if (lid < s) { wg_scratch_u[lid] = combine_u(wg_scratch_u[lid], wg_scratch_u[lid + s], op); }
        workgroupBarrier();
    }
    let total = wg_scratch_u[0];
    workgroupBarrier();
    return total;
}
fn wg_scan_u32(v: u32, lid: u32) -> u32 {
    workgroupBarrier();
    wg_scratch_u[lid] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan (scan-block's body); uniform: every lane runs every round
        var t = 0u;
        if (lid >= s) { t = wg_scratch_u[lid - s]; }
        workgroupBarrier();
        wg_scratch_u[lid] = wg_scratch_u[lid] + t;
        workgroupBarrier();
    }
    let inclusive = wg_scratch_u[lid];
    workgroupBarrier();                                          // the scratch is free for the next call
    return inclusive;
}
fn wg_reduce_f32(v: f32, lid: u32, op: u32) -> f32 { return wg_reduce_vec4(vec4f(v, 0.0, 0.0, 0.0), lid, op).x; }`,
    Oa = `override SG_SLOTS: u32 = (WG + SUBGROUP_MIN - 1u) / SUBGROUP_MIN;   // one slot per subgroup; the count is largest when the compiler picks the SMALLEST size
var<workgroup> sg_counter: atomic<u32>;
var<workgroup> sg_val_v: array<vec4f, SG_SLOTS>;
var<workgroup> sg_val_u: array<u32, SG_SLOTS>;
var<workgroup> sg_key: array<u32, SG_SLOTS>;
var<workgroup> sg_sorted_v: array<vec4f, SG_SLOTS>;
var<workgroup> sg_sorted_u: array<u32, SG_SLOTS>;
fn combine_v(a: vec4f, b: vec4f, op: u32) -> vec4f {
    if (op == 1u) { return min(a, b); }
    if (op == 2u) { return max(a, b); }
    return a + b;
}
fn combine_u(a: u32, b: u32, op: u32) -> u32 {
    if (op == 1u) { return min(a, b); }
    if (op == 2u) { return max(a, b); }
    return a + b;
}
fn wg_reduce_vec4(v: vec4f, lid: u32, op: u32) -> vec4f {
    workgroupBarrier();
    if (lid == 0u) { atomicStore(&sg_counter, 0u); }
    workgroupBarrier();
    let s_add = subgroupAdd(v);
    let s_min = subgroupMin(v);
    let s_max = subgroupMax(v);
    var partial = s_add;
    if (op == 1u) { partial = s_min; }
    if (op == 2u) { partial = s_max; }
    let key = subgroupMin(lid);                       // the smallest local id of this subgroup: a stable identity without @builtin(subgroup_id)
    var slot = 0u;
    if (subgroupElect()) { slot = atomicAdd(&sg_counter, 1u); }   // D16: the elected lane takes a slot from the counter
    slot = subgroupBroadcast(slot, 0u);                            // and broadcasts it (lane 0 is the elected lane in uniform control flow)
    if (subgroupElect()) { sg_val_v[slot] = partial; sg_key[slot] = key; }
    workgroupBarrier();
    let count = atomicLoad(&sg_counter);
    if (lid < count) {                                             // rank the slots by key so the final sum has a fixed order (11.9 item 4)
        let mine = sg_key[lid];
        var rank = 0u;
        for (var k = 0u; k < count; k = k + 1u) { if (sg_key[k] < mine) { rank = rank + 1u; } }
        sg_sorted_v[rank] = sg_val_v[lid];
    }
    workgroupBarrier();
    var total = sg_sorted_v[0];
    for (var k = 1u; k < count; k = k + 1u) { total = combine_v(total, sg_sorted_v[k], op); }
    workgroupBarrier();
    return total;
}
fn wg_reduce_u32(v: u32, lid: u32, op: u32) -> u32 {
    workgroupBarrier();
    if (lid == 0u) { atomicStore(&sg_counter, 0u); }
    workgroupBarrier();
    let s_add = subgroupAdd(v);
    let s_min = subgroupMin(v);
    let s_max = subgroupMax(v);
    var partial = s_add;
    if (op == 1u) { partial = s_min; }
    if (op == 2u) { partial = s_max; }
    let key = subgroupMin(lid);
    var slot = 0u;
    if (subgroupElect()) { slot = atomicAdd(&sg_counter, 1u); }
    slot = subgroupBroadcast(slot, 0u);
    if (subgroupElect()) { sg_val_u[slot] = partial; sg_key[slot] = key; }
    workgroupBarrier();
    let count = atomicLoad(&sg_counter);
    if (lid < count) {
        let mine = sg_key[lid];
        var rank = 0u;
        for (var k = 0u; k < count; k = k + 1u) { if (sg_key[k] < mine) { rank = rank + 1u; } }
        sg_sorted_u[rank] = sg_val_u[lid];
    }
    workgroupBarrier();
    var total = sg_sorted_u[0];
    for (var k = 1u; k < count; k = k + 1u) { total = combine_u(total, sg_sorted_u[k], op); }
    workgroupBarrier();
    return total;
}
fn wg_scan_u32(v: u32, lid: u32) -> u32 {
    workgroupBarrier();
    if (lid == 0u) { atomicStore(&sg_counter, 0u); }
    workgroupBarrier();
    let inSub = subgroupExclusiveAdd(v) + v;                     // the lane's inclusive sum within its subgroup
    let total = subgroupAdd(v);
    let key = subgroupMin(lid);                                   // the subgroup's identity: its smallest local id (D16)
    var slot = 0u;
    if (subgroupElect()) { slot = atomicAdd(&sg_counter, 1u); }
    slot = subgroupBroadcast(slot, 0u);
    if (subgroupElect()) { sg_val_u[slot] = total; sg_key[slot] = key; }
    workgroupBarrier();
    let count = atomicLoad(&sg_counter);
    var carry = 0u;                                               // the totals of every subgroup whose key is below this lane's: LANE order, whatever order the slots were taken in
    for (var k = 0u; k < count; k = k + 1u) { if (sg_key[k] < key) { carry = carry + sg_val_u[k]; } }
    workgroupBarrier();                                          // the slots are free for the next call
    return inSub + carry;
}
fn wg_reduce_f32(v: f32, lid: u32, op: u32) -> f32 { return wg_reduce_vec4(vec4f(v, 0.0, 0.0, 0.0), lid, op).x; }`,
    Na = ["wg_reduce_f32", "wg_reduce_u32", "wg_reduce_vec4", "wg_scan_u32"],
    Mn = Object.freeze(
        `NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class
    co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval
    constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export
    extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl
    implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move
    mut mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null
    nullptr of operator package packoffset partition pass patch pixelfragment precise precision premerge priv
    protected pub public readonly ref regardless register reinterpret_cast require resource restrict self set shared
    sizeof smooth snorm static static_assert static_cast std subroutine super target template this thread_local
    throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying virtual
    volatile wgsl where with writeonly yield`
            .trim()
            .split(/\s+/),
    ),
    $a = ["WG", "USE_PERM", "HAS_WEIGHTS", "SUBGROUP_MIN", "SUBGROUP_MAX"],
    Ca = Object.freeze({ WG: "u32", USE_PERM: "bool", HAS_WEIGHTS: "bool", SUBGROUP_MIN: "u32", SUBGROUP_MAX: "u32" }),
    Ba = Object.freeze(["subgroups"]),
    Ma = 4,
    Ga = new Set([
        "u32",
        "i32",
        "f32",
        "f16",
        "bool",
        "vec2f",
        "vec3f",
        "vec4f",
        "vec2u",
        "vec3u",
        "vec4u",
        "vec2i",
        "vec3i",
        "vec4i",
        "vec2h",
        "vec3h",
        "vec4h",
    ]),
    za = /^(vec[234]|mat[234]x[234]|atomic|array)</,
    ki = /^[A-Za-z_]\w*$/,
    Fa = Object.freeze({
        storage: "var<storage, read_write>",
        "storage-ro": "var<storage, read>",
        uniform: "var<uniform>",
    }),
    Is = new Set(Mn),
    Wa = /\/\/@@(\w+)@@/,
    Ua = new RegExp("(?<!\\w)[A-Za-z_]\\w*", "g"),
    Va = /@compute\b/g,
    ja = /\bfn\s+([A-Za-z_]\w*)/;
function $e(r, e, t) {
    return new h("E_SHADER_COMPILE", `${r}: ${t}`, { id: r, stage: "compose", slot: e });
}
function Gn(r) {
    return r.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, "");
}
function qa(r) {
    const e = r.trim(),
        t = e.startsWith("array<") ? e.slice(6).replace(/\s*(,[^>]*)?>\s*$/, "") : e;
    return Ga.has(t) || za.test(t) ? null : t;
}
function Ii(r, e, t, s) {
    if (
        !(t === "bool"
            ? typeof s == "boolean"
            : typeof s == "number" && Number.isFinite(s) && (t === "f32" || (Number.isInteger(s) && s >= 0)))
    )
        throw $e(r, `override:${e}`, `override ${e} (${t}) cannot take the value ${String(s)}`);
}
function Ka(r) {
    if (r.type === "bool") return r.default ? "true" : "false";
    const e = r.default;
    return r.type === "u32" ? `${e}u` : It(e);
}
function Ha(r) {
    const e = Fa[r.kind];
    return `@group(${r.group}) @binding(${r.binding}) ${e} ${r.name}: ${r.wgslType};`;
}
function Ya(r) {
    const e = Gn(r),
        t = [...e.matchAll(Va)];
    if (t.length !== 1 || t[0].index === void 0) return null;
    const s = ja.exec(e.slice(t[0].index));
    return s === null ? null : s[1];
}
function Xa(r) {
    const e = r.bindings.reduce((i, n) => Math.max(i, n.group), -1),
        t = new Map(r.uniforms.map((i) => [i.name, i])),
        s = [];
    for (let i = 0; i <= e; i++) {
        const n = r.bindings
            .filter((o) => o.group === i)
            .sort((o, a) => o.binding - a.binding)
            .map((o) => {
                if (o.kind === "uniform") {
                    const a = t.get(o.wgslType),
                        c = { type: "uniform", hasDynamicOffset: !0 };
                    return (
                        a !== void 0 && (c.minBindingSize = a.byteLength),
                        { binding: o.binding, visibility: Ei.COMPUTE, buffer: c }
                    );
                }
                return {
                    binding: o.binding,
                    visibility: Ei.COMPUTE,
                    buffer: { type: o.kind === "storage" ? "storage" : "read-only-storage" },
                };
            });
        s.push({ entries: n });
    }
    return s;
}
function Qa(r) {
    const { id: e } = r;
    for (const o of r.needs) if (!Ba.includes(o)) throw $e(e, `needs:${o}`, `unknown feature "${o}" in needs`);
    const t = new Map();
    for (const o of r.overrideDecls) {
        if (!ki.test(o.name) || Is.has(o.name))
            throw $e(e, `override:${o.name}`, `override name "${o.name}" is not a usable identifier`);
        if ($a.includes(o.name) || t.has(o.name))
            throw $e(
                e,
                `override:${o.name}`,
                `override "${o.name}" is declared twice (the prelude declares the standard ones)`,
            );
        (Ii(e, o.name, o.type, o.default), t.set(o.name, o.type));
    }
    for (const [o, a] of Object.entries(r.overrides)) {
        const l = Ca[o] ?? t.get(o);
        if (l === void 0)
            throw $e(
                e,
                `override:${o}`,
                `override "${o}" is neither a standard override nor declared in overrideDecls`,
            );
        Ii(e, o, l, a);
    }
    const s = new Set(),
        i = new Set(),
        n = new Set(r.uniforms.map((o) => o.name));
    for (const o of r.bindings) {
        if (!ki.test(o.name) || Is.has(o.name))
            throw $e(e, `binding:${o.name}`, `binding name "${o.name}" is not a usable identifier`);
        const a = `${o.group}.${o.binding}`;
        if (s.has(a)) throw $e(e, `binding:${o.name}`, `two bindings share group ${o.group} binding ${o.binding}`);
        if (i.has(o.name)) throw $e(e, `binding:${o.name}`, `two bindings share the name "${o.name}"`);
        (s.add(a), i.add(o.name));
        const c = qa(o.wgslType);
        if (c !== null && !n.has(c))
            throw $e(
                e,
                `type:${c}`,
                `binding "${o.name}" names struct "${c}" but no block in spec.uniforms declares it`,
            );
    }
}
function Za(r) {
    const { id: e } = r;
    let { body: t } = r;
    for (const [i, n] of Object.entries(r.snippets ?? {})) {
        const o = `//@@${i}@@`;
        if (!t.includes(o)) throw $e(e, `snippet:${i}`, `snippet "${i}" has no ${o} marker in the body`);
        t = t.split(o).join(n);
    }
    const s = Wa.exec(t);
    if (s !== null) throw $e(e, `marker:${s[1]}`, `marker //@@${s[1]}@@ is not filled by any snippet`);
    return t;
}
function Ja(r, e) {
    const { id: t } = r;
    for (const n of ["@group(", "override "])
        if (e.includes(n)) throw $e(t, `body:${n}`, `a body must not contain "${n}" (the composer emits those lines)`);
    const s = Gn(e),
        i = Na;
    for (const n of s.matchAll(Ua)) {
        const o = n[0];
        if (Is.has(o))
            throw $e(t, `reserved:${o}`, `"${o}" is a WGSL reserved word (spec 16.2) and cannot be an identifier`);
        if (i.includes(o) && !r.needs.includes("subgroups"))
            throw $e(t, `helper:${o}`, `the body calls ${o} but spec.needs does not list "subgroups"`);
    }
}
function ec(r, e) {
    Qa(r);
    const t = Ya(r.body);
    if (t === null) throw $e(r.id, "entry", "a body must carry exactly one @compute attribute followed by `fn <name>`");
    const s = Za(r);
    Ja(r, s);
    const i = r.needs.includes("subgroups"),
        n = i && e.features.has("subgroups"),
        o = { ...r.overrides };
    (o.WG === void 0 && (o.WG = Gs(e)),
        n && ((o.SUBGROUP_MAX = e.subgroupMaxSize), (o.SUBGROUP_MIN = Math.max(Ma, e.subgroupMinSize))));
    const a = [];
    (n && a.push("enable subgroups;"), a.push(Bn));
    for (const d of r.overrideDecls) a.push(`override ${d.name}: ${d.type} = ${Ka(d)};`);
    for (const d of r.uniforms) a.push(d.wgsl);
    i && a.push(n ? Oa : La);
    for (const d of r.bindings) a.push(Ha(d));
    const c = a.join(`
`),
        l = `${c}
${s}`;
    return Object.freeze({
        id: r.id,
        code: l,
        bodyLine:
            c.split(`
`).length + 1,
        overrides: Object.freeze(o),
        constants: Object.freeze(tc(l, o)),
        entryPoint: t,
        subgroups: n,
    });
}
function tc(r, e) {
    const t = r
            .replace(/\/\*[\s\S]*?\*\//g, " ")
            .replace(/\/\/[^\n]*/g, " ")
            .replace(/^\s*override\s+\w+\s*:[^\n]*$/gm, " "),
        s = {};
    for (const [i, n] of Object.entries(e)) new RegExp(String.raw`\b${i}\b`).test(t) && (s[i] = n);
    return s;
}
function Tr(r) {
    if (Array.isArray(r)) return `[${r.map((e) => Tr(e)).join(",")}]`;
    if (typeof r == "object" && r !== null) {
        const e = r;
        return `{${Object.keys(e)
            .sort()
            .map((i) => `${JSON.stringify(i)}:${Tr(e[i])}`)
            .join(",")}}`;
    }
    return JSON.stringify(r);
}
function rc(r) {
    if (r === void 0 || Object.keys(r).length === 0) return "0";
    const e = Tr(r);
    let t = 2166136261;
    for (let s = 0; s < e.length; s++) ((t ^= e.charCodeAt(s)), (t = Math.imul(t, 16777619) >>> 0));
    return t.toString(16).padStart(8, "0");
}
function sc(r, e) {
    const t = r.needs.filter((s) => e.features.has(s)).join(",");
    return `${r.id}|${Tr(r.overrides)}|${t}|${rc(r.snippets)}`;
}
function ic(r) {
    return r instanceof Error ? r.message : String(r);
}
class nc {
    constructor(e, t) {
        ((this.pending = new Map()),
            (this.entries = new Map()),
            (this.order = []),
            (this.disposed = !1),
            (this.device = e),
            (this.caps = t));
    }
    key(e) {
        return sc(e, this.caps);
    }
    async get(e) {
        return (await this.entry(e)).pipeline;
    }
    async kernel(e) {
        return (await this.entry(e)).kernel;
    }
    async warm(e) {
        await Promise.all(e.map((t) => this.entry(t)));
    }
    get size() {
        return this.entries.size;
    }
    keys() {
        return this.order.filter((e) => this.entries.has(e));
    }
    layoutsOf(e) {
        return this.entries.get(e)?.layouts ?? null;
    }
    dispose() {
        ((this.disposed = !0), this.pending.clear(), this.entries.clear(), (this.order.length = 0));
    }
    entry(e) {
        if (this.disposed)
            return Promise.reject(new h("E_DISPOSED", "PipelineCache: disposed", { label: "PipelineCache" }));
        const t = this.key(e),
            s = this.pending.get(t);
        if (s !== void 0) return s;
        this.order.push(t);
        const i = this.compile(e, t).then(
            (n) => (this.disposed || this.entries.set(t, n), n),
            (n) => {
                this.pending.delete(t);
                const o = this.order.indexOf(t);
                throw (o >= 0 && this.order.splice(o, 1), n);
            },
        );
        return (this.pending.set(t, i), i);
    }
    async compile(e, t) {
        const s = ec(e, this.caps),
            { device: i } = this,
            n = `${e.id}|pipeline`;
        i.pushErrorScope("validation");
        const o = i.createShaderModule({ code: s.code, label: e.id }),
            a = Xa(e).map((w, v) => i.createBindGroupLayout({ ...w, label: `${e.id}/layout${v}` })),
            c = i.createPipelineLayout({ bindGroupLayouts: a, label: `${e.id}|layout` }),
            l = i.popErrorScope(),
            d = await o.getCompilationInfo(),
            f = await l,
            p = d.messages.filter((w) => w.type === "error");
        if (p.length > 0) {
            const w = s.bodyLine - 1;
            throw new h("E_SHADER_COMPILE", `${e.id}: WGSL compilation failed (${p.length} error(s))`, {
                id: e.id,
                stage: "compile",
                messages: Pa(d, w),
                lines: p.map((v) => v.lineNum - w),
            });
        }
        if (f !== null) throw new h("E_VALIDATION", `${e.id}: ${f.message}`, { label: n, message: f.message });
        const g = {};
        for (const [w, v] of Object.entries(s.constants)) typeof v == "boolean" ? (g[w] = v ? 1 : 0) : (g[w] = v);
        let m;
        try {
            m = await i.createComputePipelineAsync({
                label: t,
                layout: c,
                compute: { module: o, entryPoint: s.entryPoint, constants: g },
            });
        } catch (w) {
            const v = ic(w);
            throw new h("E_VALIDATION", `${e.id}: pipeline creation failed: ${v}`, { label: n, message: v });
        }
        const b = new Ta(i, e, s, m, a);
        return { key: t, composed: s, pipeline: m, layouts: a, kernel: b };
    }
}
class oc {
    constructor(e, t, s, i) {
        ((this.labels = new WeakMap()),
            (this.partialRequests = new WeakSet()),
            (this.pending = []),
            (this.cursor = 0),
            (this.refused = 0),
            (this.destroyed = !1));
        const n = i ?? Fo;
        ((this.quantised = s), (this.slots = n));
        const o = t && n >= 2 && e.features.has("timestamp-query");
        ((this.enabled = o),
            o
                ? ((this.querySet = e.createQuerySet({ label: "profiler/timestamps", type: "timestamp", count: n })),
                  (this.resolveBuffer = e.createBuffer({
                      label: "profiler/resolve",
                      size: n * 8,
                      usage: ie.QUERY_RESOLVE | ie.COPY_SRC,
                  })))
                : ((this.querySet = null), (this.resolveBuffer = null)));
    }
    beginPass(e) {
        if (this.querySet === null || this.destroyed) return;
        if (this.cursor + 2 > this.slots) {
            this.refused++;
            return;
        }
        const t = this.cursor;
        return (
            (this.cursor += 2),
            this.pending.push({ label: e, begin: t }),
            { querySet: this.querySet, beginningOfPassWriteIndex: t, endOfPassWriteIndex: t + 1 }
        );
    }
    resolveInto(e) {
        if (this.querySet === null || this.resolveBuffer === null || this.destroyed || this.pending.length === 0)
            return null;
        const t = this.cursor;
        e.resolveQuerySet(this.querySet, 0, t, this.resolveBuffer);
        const s = e.readback(this.resolveBuffer, 0, t * 8);
        return (
            this.labels.set(
                s,
                this.pending.map((i) => i.label),
            ),
            this.refused > 0 && this.partialRequests.add(s),
            (this.pending = []),
            (this.cursor = 0),
            (this.refused = 0),
            s
        );
    }
    partial(e) {
        return this.partialRequests.has(e);
    }
    timings(e, t) {
        const s = this.labels.get(t);
        if (s === void 0) return [];
        const i = new DataView(e),
            n = [];
        for (let o = 0; o < s.length; o++) {
            const a = t.offset + o * 16;
            if (a + 16 > e.byteLength) break;
            const c = i.getBigUint64(a, !0),
                l = i.getBigUint64(a + 8, !0);
            n.push({ label: s[o], ns: Number(l - c) });
        }
        return n;
    }
    destroy() {
        this.destroyed ||
            ((this.destroyed = !0),
            (this.pending = []),
            (this.cursor = 0),
            (this.refused = 0),
            this.querySet !== null && this.querySet.destroy(),
            this.resolveBuffer !== null && this.resolveBuffer.destroy());
    }
}
class ac {
    constructor(e) {
        ((this.buffers = new Set()), (this.released = !1), (this.pool = e));
    }
    storage(e, t) {
        return this.acquire(e, ie.STORAGE | ie.COPY_SRC | ie.COPY_DST, t);
    }
    uniform(e, t) {
        return this.acquire(e, ie.UNIFORM | ie.COPY_DST, t);
    }
    acquire(e, t, s) {
        if (this.released) throw new h("E_DISPOSED", `lease already released: cannot acquire "${s}"`, { label: s });
        const i = this.pool.acquire(e, t, s);
        return (this.buffers.add(i), i);
    }
    release() {
        if (this.released) return;
        this.released = !0;
        const e = [...this.buffers];
        this.buffers.clear();
        for (const t of e)
            try {
                this.pool.release(t);
            } catch (s) {
                if (!Ir(s, "E_DISPOSED")) throw s;
            }
    }
    get count() {
        return this.buffers.size;
    }
}
function Ai(r, e) {
    return `${r}:${e}`;
}
class zs {
    constructor(e, t, s, i) {
        ((this.idle = new Map()),
            (this.live = new Map()),
            (this.liveBytesValue = 0),
            (this.idleBytesValue = 0),
            (this.disposed = !1),
            (this.allocator = t),
            (this.maxBufferSize = s - (s % 4)),
            (this.maxIdlePerClass = i?.maxIdlePerClass ?? Wo));
    }
    static sizeClass(e) {
        if (!Number.isInteger(e) || e <= 0)
            throw new h("E_INVALID_ARGUMENT", "byteLength: expected a positive integer", {
                argument: "byteLength",
                value: e,
                expected: "a positive integer",
            });
        if (e > Vo) return Math.ceil(e / di) * di;
        let t = Uo;
        for (; t < e;) t *= 2;
        return t;
    }
    acquire(e, t, s) {
        if (this.disposed) throw new h("E_DISPOSED", "the buffer pool was disposed", { label: "pool" });
        const i = zs.sizeClass(e);
        if (e > this.maxBufferSize)
            throw new h(
                "E_TOO_LARGE",
                `pool: ${e} bytes exceed the device maxBufferSize of ${this.maxBufferSize} bytes`,
                { needed: e, limit: this.maxBufferSize, path: "pool", algorithm: null },
            );
        const n = Math.min(i, this.maxBufferSize),
            o = Ai(n, t);
        let c = this.idle.get(o)?.pop();
        return (
            c === void 0
                ? (c = this.allocator.createBuffer({ label: s, size: n, usage: t }))
                : ((this.idleBytesValue -= n), (c.label = s)),
            this.live.set(c, { sizeClass: n, usage: t }),
            (this.liveBytesValue += n),
            c
        );
    }
    release(e) {
        if (this.disposed) return;
        const t = this.live.get(e);
        if (t === void 0)
            throw new h("E_INVALID_ARGUMENT", "buffer: not a live buffer of this pool", {
                argument: "buffer",
                value: e.label,
                expected: "a buffer acquired from this pool and not yet released",
            });
        (this.live.delete(e), (this.liveBytesValue -= t.sizeClass));
        const s = Ai(t.sizeClass, t.usage);
        let i = this.idle.get(s);
        if ((i === void 0 && ((i = []), this.idle.set(s, i)), i.length >= this.maxIdlePerClass)) {
            this.allocator.destroy(e);
            return;
        }
        (i.push(e), (this.idleBytesValue += t.sizeClass));
    }
    trim() {
        for (const e of this.idle.values()) for (const t of e) this.allocator.destroy(t);
        (this.idle.clear(), (this.idleBytesValue = 0));
    }
    destroyAll() {
        this.trim();
        for (const e of this.live.keys()) this.allocator.destroy(e);
        (this.live.clear(), (this.liveBytesValue = 0), (this.disposed = !0));
    }
    lease() {
        return new ac(this);
    }
    get liveBytes() {
        return this.liveBytesValue;
    }
    get idleBytes() {
        return this.idleBytesValue;
    }
}
const cc = 4 * 1024 * 1024,
    lc = ie.MAP_READ | ie.COPY_DST,
    xi = 256;
function uc(r) {
    return Object.prototype.toString.call(r) === "[object SharedArrayBuffer]";
}
function Xe(r, e, t) {
    return new h("E_INVALID_ARGUMENT", `${r}: expected ${t}`, { argument: r, value: e, expected: t });
}
class dc {
    constructor(e, t, s) {
        ((this.ring = []), (this.disposed = !1));
        const i = s?.slotBytes ?? cc;
        if (!Number.isInteger(i) || i <= 0 || i % 4 !== 0) throw Xe("slotBytes", i, "a positive multiple of 4");
        const n = s?.slots ?? zo;
        if (!Number.isInteger(n) || n < 0) throw Xe("slots", n, "a non-negative integer");
        ((this.device = e), (this.allocator = t), (this.slotBytes = i));
        for (let o = 0; o < n; o++) this.addSlot(i);
    }
    async read(e, t, s, i) {
        this.assertLive();
        const n = i ?? 0;
        if (!Number.isInteger(t) || t <= 0 || t % 4 !== 0) throw Xe("byteLength", t, "a positive multiple of 4");
        if (!Number.isInteger(n) || n < 0 || n % 4 !== 0) throw Xe("srcOffset", n, "a non-negative multiple of 4");
        if (n + t > e.size) throw Xe("byteLength", t, `srcOffset + byteLength <= src.size (${e.size})`);
        if ((e.usage & ie.COPY_SRC) === 0) throw Xe("src", e.label, "a buffer with COPY_SRC usage");
        let o, a;
        if (s === void 0) ((o = new ArrayBuffer(t)), (a = new Uint8Array(o)));
        else {
            if (uc(s.buffer)) throw Xe("dest", "SharedArrayBuffer", "a view over a plain ArrayBuffer");
            if (s.byteLength < t) throw Xe("dest", s.byteLength, `at least ${t} bytes`);
            ((o = s.buffer), (a = new Uint8Array(o, s.byteOffset, t)));
        }
        let c = 0;
        for (; c < t;) {
            const l = Math.min(this.slotBytes, t - c),
                d = this.borrowSlot(l),
                f = this.ring[d.index];
            try {
                const p = this.device.createCommandEncoder({ label: "readback" });
                (p.copyBufferToBuffer(e, n + c, d.buffer, 0, l),
                    this.device.queue.submit([p.finish()]),
                    await this.map(f, l),
                    a.set(new Uint8Array(d.buffer.getMappedRange(0, l)), c));
            } finally {
                this.returnSlot(d);
            }
            c += l;
        }
        return o;
    }
    async readU32(e, t) {
        const s = await this.read(e, 4, void 0, t);
        return new Uint32Array(s)[0];
    }
    borrowSlot(e) {
        if ((this.assertLive(), !Number.isInteger(e) || e <= 0)) throw Xe("byteLength", e, "a positive integer");
        for (const i of this.ring) if (!i.borrowed && i.slot.capacity >= e) return ((i.borrowed = !0), i.slot);
        const t = Math.max(this.slotBytes, Math.ceil(e / xi) * xi),
            s = this.addSlot(t);
        return ((s.borrowed = !0), s.slot);
    }
    mapSlot(e, t) {
        this.assertLive();
        const s = this.borrowedEntry(e);
        if (s.mapPending || s.mapped)
            throw Xe("slot", e.index, "a borrowed slot that is not mapped and has no map pending");
        return this.track(s, e.buffer.mapAsync(Si.READ, 0, t));
    }
    returnSlot(e) {
        if (this.disposed) return;
        const t = this.borrowedEntry(e);
        if (t.mapPending) {
            t.returnRequested = !0;
            return;
        }
        this.finishReturn(t);
    }
    borrowedEntry(e) {
        const t = this.ring[e.index];
        if (t?.slot !== e || !t.borrowed)
            throw Xe("slot", e.index, "a slot borrowed from this ring and not yet returned");
        return t;
    }
    finishReturn(e) {
        const t = e.slot.buffer.mapState;
        ((t === void 0 ? e.mapped : t !== "unmapped") && e.slot.buffer.unmap(),
            (e.mapped = !1),
            (e.borrowed = !1),
            (e.returnRequested = !1));
    }
    track(e, t) {
        e.mapPending = !0;
        const s = (i) => {
            if (((e.mapPending = !1), (e.mapped = i), this.disposed)) {
                (i && e.slot.buffer.unmap(), this.destroySlot(e), (e.mapped = !1));
                return;
            }
            e.returnRequested && this.finishReturn(e);
        };
        return (
            t.then(
                () => {
                    s(!0);
                },
                () => {
                    s(!1);
                },
            ),
            t
        );
    }
    get slots() {
        return this.ring.length;
    }
    get borrowed() {
        let e = 0;
        for (const t of this.ring) t.borrowed && e++;
        return e;
    }
    destroyAll() {
        for (const e of this.ring) e.mapPending || this.destroySlot(e);
        ((this.ring.length = 0), (this.disposed = !0));
    }
    destroySlot(e) {
        e.tracked ? this.allocator.destroy(e.slot.buffer) : e.slot.buffer.destroy();
    }
    addSlot(e) {
        const t = this.ring.length,
            s = { label: `readback:slot:${t}`, size: e, usage: lc },
            i = e >= kn,
            n = i ? this.allocator.createBuffer(s) : this.device.createBuffer(s),
            o = {
                slot: Object.freeze({ index: t, buffer: n, capacity: e }),
                borrowed: !1,
                mapped: !1,
                mapPending: !1,
                returnRequested: !1,
                tracked: i,
            };
        return (this.ring.push(o), o);
    }
    async map(e, t) {
        let s = !1,
            i = null;
        try {
            (await this.track(e, e.slot.buffer.mapAsync(Si.READ, 0, t)), (s = !0));
        } catch (n) {
            i = n;
        }
        if (this.disposed)
            throw new h("E_DISPOSED", "the readback ring was disposed while a read was pending", { label: "readback" });
        if (!s) {
            const n = i instanceof Error ? i.message : String(i);
            throw new h("E_DEVICE_LOST", `mapAsync rejected: ${n}`, { reason: "mapAsync", message: n });
        }
    }
    assertLive() {
        if (this.disposed) throw new h("E_DISPOSED", "the readback ring was disposed", { label: "readback" });
    }
}
const fc = Object.freeze(["rowPtr", "colIdx", "weights", "arcToEdge", "edgeToArc"]),
    hc = new Set(["colIdx", "weights", "arcToEdge"]);
function pc(r) {
    const e = r.arcCount,
        t = r.flags.arcToEdgeIsIdentity;
    return {
        rowPtr: 4 * (r.nodeCount + 1),
        colIdx: 4 * e,
        weights: r.flags.weighted && e > 0 ? 4 * e : 0,
        arcToEdge: !t && e > 0 ? 4 * e : 0,
        edgeToArc: !t && r.edgeCount > 0 ? 4 * r.edgeCount : 0,
    };
}
function gc(r, e) {
    const t = new Set(r);
    return (t.add("rowPtr"), fc.filter((s) => t.has(s) && e[s] > 0));
}
function Fs(r) {
    return r - (r % Mt);
}
function os(r, e, t) {
    return new h("E_TOO_LARGE", `${t}: ${r} bytes exceed the device limit of ${e} bytes`, {
        needed: r,
        limit: e,
        path: t,
        algorithm: null,
    });
}
function as(r, e, t) {
    return new h("E_INVALID_ARGUMENT", `${r}: expected ${t}`, { argument: r, value: e, expected: t });
}
function mc(r) {
    return Fs(Math.floor(r.maxStorageBufferBindingSize / 4));
}
function wc(r, e, t) {
    if (r.length === 0) throw as("rowPtr", r.length, "nodeCount + 1 entries");
    if (!Number.isInteger(t) || t < Mt || t % Mt !== 0) throw as("arcsPerWindow", t, `a positive multiple of ${Mt}`);
    const s = r.length - 1;
    if (r[s] !== e) throw as("arcCount", e, `rowPtr[${s}] === ${r[s]}`);
    const i = [];
    if (e === 0) return i;
    let n = 0,
        o = 0,
        a = 0;
    for (; n < e;) {
        for (; r[o + 1] <= n;) o++;
        const c = Fs(n),
            l = c + t;
        if (r[o + 1] > l)
            (i.push({ start: c, end: l, rowFirst: a, rowLast: o, bufferIndex: 0, offset: 4 * c }), (n = l), (a = o));
        else {
            let d = o;
            for (; d + 1 < s && r[d + 2] <= l;) d++;
            const f = r[d + 1];
            (i.push({ start: c, end: f, rowFirst: a, rowLast: d, bufferIndex: 0, offset: 4 * c }),
                (n = f),
                (a = d + 1));
        }
    }
    return i;
}
function bc(r, e, t) {
    if (e <= t) return { buffers: [{ byteOffset: 0, byteLength: e }], placed: [...r] };
    const s = [],
        i = [];
    let n = 0;
    for (; n < r.length;) {
        let o = n;
        for (; o + 1 < r.length && 4 * (r[o + 1].end - r[n].start) <= t;) o++;
        const a = r[n].start,
            c = s.length;
        s.push({ byteOffset: 4 * a, byteLength: 4 * (r[o].end - a) });
        for (let l = n; l <= o; l++) {
            const d = r[l];
            i.push({
                start: d.start,
                end: d.end,
                rowFirst: d.rowFirst,
                rowLast: d.rowLast,
                bufferIndex: c,
                offset: 4 * (d.start - a),
            });
        }
        n = o + 1;
    }
    return { buffers: s, placed: i };
}
function vc(r, e, t) {
    const { limits: s } = e,
        i = s.maxStorageBufferBindingSize,
        n = s.maxBufferSize,
        o = (w) => w <= i && w <= n,
        a = (w) => (w > i ? i : n),
        c = pc(r),
        l = gc(t, c);
    if (!o(c.rowPtr)) throw os(c.rowPtr, a(c.rowPtr), "rowPtr");
    const { arena: d } = r;
    if (d !== null) {
        const v =
                l.some((S) => (S === "arcToEdge" || S === "edgeToArc") && d.segments[S] !== null) && d.byteLength <= n,
            y = v ? d.byteLength : d.hotByteLength,
            k = l.every((S) => {
                const P = d.segments[S];
                return P === null || o(P.byteLength);
            });
        if (y <= n && k) {
            const S = (P) => {
                const E = d.segments[P];
                if (E === null) return null;
                const A = E.byteOffset - d.byteOffset;
                return A + E.byteLength <= y ? { offset: A, size: E.byteLength } : null;
            };
            return {
                kind: "arena",
                bytes: y,
                includesCold: v,
                segments: {
                    rowPtr: S("rowPtr"),
                    colIdx: S("colIdx"),
                    weights: S("weights"),
                    arcToEdge: S("arcToEdge"),
                    edgeToArc: S("edgeToArc"),
                },
            };
        }
    }
    if (l.every((w) => o(c[w])))
        return {
            kind: "perArray",
            arrays: l.map((w) => ({ name: w, byteLength: c[w], buffers: [{ byteOffset: 0, byteLength: c[w] }] })),
        };
    if (l.includes("edgeToArc") && !o(c.edgeToArc)) throw os(c.edgeToArc, a(c.edgeToArc), "binding");
    const f = Math.min(mc(s), Fs(Math.floor(n / 4)));
    if (f < Mt) throw os(4 * Mt, i, "binding");
    const p = wc(r.rowPtr, r.arcCount, f),
        { buffers: g, placed: m } = bc(p, 4 * r.arcCount, n);
    return {
        kind: "windowed",
        arrays: l.map((w) =>
            hc.has(w)
                ? { name: w, byteLength: c[w], buffers: g }
                : { name: w, byteLength: c[w], buffers: [{ byteOffset: 0, byteLength: c[w] }] },
        ),
        windows: m,
        arcsPerWindow: f,
    };
}
const yc = Object.freeze(["rowPtr", "colIdx", "weights"]),
    _c = Object.freeze(["rowPtr", "colIdx", "weights", "arcToEdge", "edgeToArc"]),
    Pc = Object.freeze(["colIdx", "weights", "arcToEdge"]),
    Sc = ie.STORAGE | ie.COPY_DST | ie.COPY_SRC;
function Ec(r) {
    return Pc.includes(r);
}
function kc(r) {
    return Object.prototype.toString.call(r) === "[object SharedArrayBuffer]";
}
function yt(r, e, t) {
    return new h("E_INVALID_ARGUMENT", `${r}: expected ${t}`, { argument: r, value: e, expected: t });
}
function Sr(r) {
    if (r.detached)
        throw new h("E_SNAPSHOT", `snapshot ${r.serial} is detached (its core was transferred away)`, {
            reason: "detached",
            serial: r.serial,
        });
}
function Ic(r, e) {
    switch (e) {
        case "rowPtr":
            return !0;
        case "colIdx":
            return r.arcCount > 0;
        case "weights":
            return r.flags.weighted && r.arcCount > 0;
        case "arcToEdge":
            return !r.flags.arcToEdgeIsIdentity && r.arcCount > 0;
        case "edgeToArc":
            return !r.flags.arcToEdgeIsIdentity && r.edgeCount > 0;
        default:
            return !1;
    }
}
function Ri(r, e) {
    switch (e) {
        case "rowPtr":
            return r.rowPtr;
        case "colIdx":
            return r.colIdx;
        case "weights": {
            const { weights: t } = r;
            if (t === null) throw yt("weights", null, "a weighted snapshot");
            return t;
        }
        case "arcToEdge":
            return r.arcToEdge;
        case "edgeToArc":
            return r.edgeToArc;
        default:
            throw yt("name", e, "a core array name");
    }
}
class Ac {
    constructor(e, t, s, i) {
        ((this.residents = new WeakMap()),
            (this.records = new WeakMap()),
            (this.bySerial = new Map()),
            (this.orphans = new Set()),
            (this.tombstones = new Set()),
            (this.liveCount = 0),
            (this.liveBytesValue = 0),
            (this.warned = !1),
            (this.disposed = !1),
            (this.device = e),
            (this.caps = t),
            (this.allocator = s),
            (this.warnUnreleasedSnapshots = i.warnUnreleasedSnapshots),
            (this.warn =
                i.warn ??
                ((n) => {
                    console.warn(n);
                })));
    }
    core(e, t) {
        (this.assertLive(), Sr(e));
        const s = t ?? yc,
            i = _c.filter((l) => (l === "rowPtr" || s.includes(l)) && Ic(e, l)),
            n = vc(e, this.caps, i),
            o = this.ensureRecord(e);
        if (o.plan === null && ((o.plan = n.kind), n.kind === "arena" && e.arena !== null)) {
            const { arena: l } = e,
                d = this.upload(
                    o,
                    e.rowPtr,
                    new Uint8Array(l.buffer, l.byteOffset, n.bytes),
                    `residency:core:${o.serial}:arena`,
                );
            o.arena = { buffer: d.buffer, segments: n.segments };
        }
        (n.kind === "windowed" && o.windows === null && ((o.plan = "windowed"), (o.windows = n.windows)),
            this.bindMissing(o, e, n, i));
        const a = o.bindings.get("rowPtr");
        if (a === void 0) throw yt("rowPtr", null, "a bound rowPtr (internal invariant)");
        const c = o.bindings.get("weights") ?? null;
        return Object.freeze({
            serial: o.serial,
            plan: n.kind,
            rowPtr: a,
            colIdx: o.bindings.get("colIdx") ?? null,
            weights: c,
            arcToEdge: o.bindings.get("arcToEdge") ?? null,
            edgeToArc: o.bindings.get("edgeToArc") ?? null,
            windows: o.windows,
            arcBuffers:
                o.windows === null
                    ? null
                    : Object.freeze({
                          colIdx: Object.freeze([...(o.arcBuffers.get("colIdx") ?? [])]),
                          weights: Object.freeze([...(o.arcBuffers.get("weights") ?? [])]),
                          arcToEdge: Object.freeze([...(o.arcBuffers.get("arcToEdge") ?? [])]),
                      }),
            hasWeights: c !== null,
        });
    }
    view(e, t, s) {
        (this.assertLive(), Sr(e));
        const i = s?.packViews === !0;
        if (t === "reverse" || t === "edgeList") {
            (this.assertNotReleased(e), this.assertNonEmpty(e));
            const f = i ? `${t}:packed` : t,
                p = this.ensureRecord(e),
                g = p.views.get(f);
            if (g !== void 0) return g;
            const m = t === "reverse" ? this.buildReverse(e, p, i) : this.buildEdgeList(e, p, i);
            return (p.views.set(f, m), m);
        }
        if (i)
            throw new h("E_UNSUPPORTED", "packViews applies to the reverse and edgeList views only", {
                option: "packViews",
                hint: `the ${t} view uploads one array`,
            });
        let n,
            o,
            a = {};
        switch (t) {
            case "outDegree":
                (this.assertNotReleased(e), this.assertNonEmpty(e), (n = e.outDegree()), (o = "outDegree"));
                break;
            case "inDegree":
                (this.assertNotReleased(e), this.assertNonEmpty(e), (n = e.inDegree()), (o = "inDegree"));
                break;
            case "degreeOrder": {
                (this.assertNotReleased(e), this.assertNonEmpty(e));
                const f = e.degreeOrder();
                ((n = f.perm), (o = "perm"), (a = { segmentOffsets: Array.from(f.segmentOffsets) }));
                break;
            }
            case "reverseDegreeOrder": {
                (this.assertNotReleased(e), this.assertNonEmpty(e));
                const f = e.degreeOrder({ of: "reverse" });
                ((n = f.perm), (o = "perm"), (a = { segmentOffsets: Array.from(f.segmentOffsets) }));
                break;
            }
            case "coo":
                if ((this.assertNotReleased(e), this.assertNonEmpty(e), e.arcCount === 0))
                    return Object.freeze({ view: t, bindings: Object.freeze({}), scalars: Object.freeze({}) });
                ((n = e.coo().src), (o = "src"));
                break;
            case "mate":
                throw new h("E_UNSUPPORTED", "the mate view is not uploaded: no kernel reads it", {
                    feature: "view:mate",
                    hint: "outDegree, inDegree, degreeOrder, reverseDegreeOrder, coo, reverse and edgeList are uploaded",
                });
            default:
                throw yt("name", t, "a view name");
        }
        const c = this.ensureRecord(e),
            l = this.upload(c, n, n, `residency:view:${c.serial}:${t}`),
            d = { buffer: l.buffer, offset: 0, size: l.byteLength, window: null };
        return Object.freeze({ view: t, bindings: Object.freeze({ [o]: d }), scalars: Object.freeze(a) });
    }
    buildReverse(e, t, s) {
        const i = e.reverse();
        if (!e.directed) {
            const a = this.core(e, ["rowPtr", "colIdx", "weights"]);
            if (a.plan === "windowed")
                throw new h(
                    "E_TOO_LARGE",
                    `snapshot ${e.serial}: the undirected reverse view is the core, which needs arc windows (${a.windows?.length ?? 0}) that no view executes`,
                    {
                        needed: 4 * e.arcCount,
                        limit: this.caps.limits.maxStorageBufferBindingSize,
                        path: "windowed",
                        algorithm: null,
                    },
                );
            const c = { rowPtr: a.rowPtr };
            return (
                a.colIdx !== null && (c.colIdx = a.colIdx),
                a.weights !== null && (c.weights = a.weights),
                Object.freeze({
                    view: "reverse",
                    bindings: Object.freeze(c),
                    scalars: Object.freeze({ arcCount: [i.arcCount], directed: [0] }),
                })
            );
        }
        const n = [
            ["rowPtr", i.rowPtr],
            ["colIdx", i.colIdx],
        ];
        i.weights !== null && n.push(["weights", i.weights]);
        const o = s
            ? this.packArrays(t, n, this.packKey(t, "reverse:packed"), `residency:view:${t.serial}:reverse:packed`)
            : this.separateArrays(t, n, `residency:view:${t.serial}:reverse`);
        return Object.freeze({
            view: "reverse",
            bindings: o,
            scalars: Object.freeze({ arcCount: [i.arcCount], directed: [1] }),
        });
    }
    buildEdgeList(e, t, s) {
        const i = e.edgeList(),
            n = [
                ["src", i.src],
                ["dst", i.dst],
            ];
        i.weights !== null && n.push(["weights", i.weights]);
        const o = s
            ? this.packArrays(t, n, this.packKey(t, "edgeList:packed"), `residency:view:${t.serial}:edgeList:packed`)
            : this.separateArrays(t, n, `residency:view:${t.serial}:edgeList`);
        return Object.freeze({ view: "edgeList", bindings: o, scalars: Object.freeze({ edgeCount: [e.edgeCount] }) });
    }
    separateArrays(e, t, s) {
        const i = {};
        for (const [n, o] of t) {
            if (o.byteLength === 0) continue;
            const a = this.upload(e, o, o, `${s}:${n}`);
            i[n] = { buffer: a.buffer, offset: 0, size: a.byteLength, window: null };
        }
        return Object.freeze(i);
    }
    packArrays(e, t, s, i) {
        const n = t.filter(([, f]) => f.byteLength > 0);
        if (n.length === 0) return Object.freeze({});
        const o = [];
        let a = 0;
        for (const [, f] of n) (o.push(a), (a += Math.ceil(f.byteLength / Dr) * Dr));
        const c = new Uint8Array(a);
        n.forEach(([, f], p) => {
            c.set(new Uint8Array(f.buffer, f.byteOffset, f.byteLength), o[p]);
        });
        const l = this.upload(e, s, c, i),
            d = {};
        return (
            n.forEach(([f, p], g) => {
                d[f] = { buffer: l.buffer, offset: o[g], size: p.byteLength, window: null };
            }),
            Object.freeze(d)
        );
    }
    packKey(e, t) {
        const s = e.packKeys.get(t);
        if (s !== void 0) return s;
        const i = {};
        return (e.packKeys.set(t, i), i);
    }
    column(e, t, s) {
        (this.assertLive(), Sr(s), this.assertNotReleased(s));
        const i = e.require(t),
            n = e.gpuView(t);
        if (n.byteLength === 0)
            throw yt("column", t, "a column with at least one row (zero-length arrays are never uploaded)");
        const o = this.ensureRecord(s),
            a = `residency:column:${o.serial}:${i.meta.domain}.${t}`,
            c = this.residents.get(i);
        let l;
        return (
            c !== void 0 && !c.destroyed && c.serial === o.serial && c.byteLength === n.byteLength
                ? ((l = c),
                  l.version !== i.version && (this.device.queue.writeBuffer(l.buffer, 0, n), (l.version = i.version)))
                : (c !== void 0 && this.residents.delete(i), (l = this.upload(o, i, n, a)), (l.version = i.version)),
            Object.freeze({
                binding: { buffer: l.buffer, offset: 0, size: l.byteLength, window: null },
                column: i,
                version: l.version,
                eligibility: i.gpu,
                components: i.meta.components,
            })
        );
    }
    array(e, t, s) {
        if ((this.assertLive(), e.byteLength === 0 || e.byteLength % 4 !== 0))
            throw yt("key", e.byteLength, "a non-empty array whose byteLength is a multiple of 4");
        if (kc(e.buffer)) throw yt("key", "SharedArrayBuffer", "an array over a plain ArrayBuffer");
        let i = null;
        s !== void 0 && (Sr(s), this.assertNotReleased(s), (i = this.ensureRecord(s)));
        const n = this.upload(i, e, e, `residency:array:${t}`);
        return {
            binding: { buffer: n.buffer, offset: 0, size: n.byteLength, window: null },
            byteLength: n.byteLength,
            owner: s ?? null,
            destroy: () => {
                this.destroyResident(n, i);
            },
        };
    }
    release(e) {
        const t = this.bySerial.get(e.serial);
        if (t !== void 0) {
            for (const s of [...t.entries]) this.destroyResident(s, t);
            (this.forget(t), this.tombstones.add(e.serial));
        }
    }
    clearOnLoss() {
        for (const e of [...this.bySerial.values()]) {
            for (const t of e.entries)
                ((t.destroyed = !0), this.residents.get(t.key) === t && this.residents.delete(t.key));
            ((e.entries.length = 0), this.forget(e));
        }
        for (const e of this.orphans)
            ((e.destroyed = !0), this.residents.get(e.key) === e && this.residents.delete(e.key));
        (this.orphans.clear(), (this.liveCount = 0), (this.liveBytesValue = 0));
    }
    destroyAll() {
        for (const e of [...this.bySerial.values()]) {
            for (const t of [...e.entries]) this.destroyResident(t, e);
            this.forget(e);
        }
        for (const e of [...this.orphans]) this.destroyResident(e, null);
        this.disposed = !0;
    }
    stats() {
        const e = [...this.bySerial.values()].map((t) => ({
            serial: t.serial,
            label: t.label,
            bytes: t.entries.reduce((s, i) => s + i.byteLength, 0),
            buffers: t.entries.length,
        }));
        return { buffers: this.liveCount, bytes: this.liveBytesValue, snapshots: this.bySerial.size, perSnapshot: e };
    }
    get residentBytes() {
        return this.liveBytesValue;
    }
    isReleased(e) {
        return this.tombstones.has(e);
    }
    bindMissing(e, t, s, i) {
        for (const n of i)
            if (!e.bindings.has(n)) {
                const o = s.kind === "windowed" ? s.arrays.find((a) => a.name === n) : void 0;
                e.bindings.set(
                    n,
                    o !== void 0 && o.buffers.length > 0 && e.windows !== null && Ec(n)
                        ? this.bindWindowed(e, t, n, o.buffers, e.windows[0])
                        : this.bindCore(e, t, n),
                );
            }
    }
    bindCore(e, t, s) {
        if (e.arena !== null) {
            const o = e.arena.segments[s];
            if (o !== null) return { buffer: e.arena.buffer, offset: o.offset, size: o.size, window: null };
        }
        const i = Ri(t, s),
            n = this.upload(e, i, i, `residency:core:${e.serial}:${s}`);
        return { buffer: n.buffer, offset: 0, size: n.byteLength, window: null };
    }
    bindWindowed(e, t, s, i, n) {
        const o = Ri(t, s),
            a = i.map(
                (c, l) =>
                    this.upload(
                        e,
                        this.windowKey(e, `${s}:${l}`),
                        new Uint8Array(o.buffer, o.byteOffset + c.byteOffset, c.byteLength),
                        `residency:core:${e.serial}:${s}:w${l}`,
                    ).buffer,
            );
        return (
            e.arcBuffers.set(s, a),
            { buffer: a[n.bufferIndex], offset: n.offset, size: 4 * (n.end - n.start), window: n }
        );
    }
    windowKey(e, t) {
        const s = e.windowKeys.get(t);
        if (s !== void 0) return s;
        const i = {};
        return (e.windowKeys.set(t, i), i);
    }
    upload(e, t, s, i) {
        const n = e === null ? null : e.serial,
            o = this.residents.get(t);
        if (o !== void 0 && !o.destroyed && o.serial === n) return o;
        const a = this.allocator.createBuffer({ label: i, size: s.byteLength, usage: Sc });
        this.device.queue.writeBuffer(a, 0, s);
        const c = { key: t, buffer: a, byteLength: s.byteLength, serial: n, version: 0, destroyed: !1 };
        return (
            this.residents.set(t, c),
            e === null ? this.orphans.add(c) : e.entries.push(c),
            this.liveCount++,
            (this.liveBytesValue += s.byteLength),
            c
        );
    }
    destroyResident(e, t) {
        if (!e.destroyed) {
            if (
                ((e.destroyed = !0),
                this.allocator.destroy(e.buffer),
                this.residents.get(e.key) === e && this.residents.delete(e.key),
                t === null)
            )
                this.orphans.delete(e);
            else {
                const s = t.entries.indexOf(e);
                s >= 0 && t.entries.splice(s, 1);
            }
            (this.liveCount--, (this.liveBytesValue -= e.byteLength));
        }
    }
    forget(e) {
        ((e.released = !0),
            e.bindings.clear(),
            e.views.clear(),
            e.packKeys.clear(),
            e.windowKeys.clear(),
            e.arcBuffers.clear(),
            (e.windows = null),
            (e.arena = null),
            (e.plan = null),
            this.bySerial.delete(e.serial));
    }
    ensureRecord(e) {
        let t = this.records.get(e);
        return (
            t?.released && (t = void 0),
            t === void 0 && (t = this.bySerial.get(e.serial)),
            t === void 0 &&
                ((t = {
                    serial: e.serial,
                    label: e.label,
                    entries: [],
                    plan: null,
                    arena: null,
                    bindings: new Map(),
                    views: new Map(),
                    packKeys: new Map(),
                    windowKeys: new Map(),
                    windows: null,
                    arcBuffers: new Map(),
                    released: !1,
                }),
                this.bySerial.set(e.serial, t),
                this.tombstones.delete(e.serial),
                !this.warned &&
                    this.bySerial.size > this.warnUnreleasedSnapshots &&
                    ((this.warned = !0),
                    this.warn(
                        `[webgpu-graph-algorithms] ${this.bySerial.size} snapshots are resident on the device (warnUnreleasedSnapshots = ${this.warnUnreleasedSnapshots}); call ctx.release(snapshot) for superseded snapshots -- GPU memory is never freed by garbage collection (spec 4.1)`,
                    ))),
            this.records.set(e, t),
            t
        );
    }
    assertNotReleased(e) {
        if (this.tombstones.has(e.serial))
            throw new h(
                "E_RELEASED",
                `snapshot ${e.serial} was released; upload it again through core() before binding views, columns or arrays`,
                { serial: e.serial },
            );
    }
    assertNonEmpty(e) {
        if (e.nodeCount === 0)
            throw yt("snapshot", 0, "nodeCount > 0 (an empty snapshot has no per-node view to upload)");
    }
    assertLive() {
        if (this.disposed) throw new h("E_DISPOSED", "the residency was disposed", { label: "residency" });
    }
}
const xc = "webgpu-graph-algorithms",
    Rc = Object.freeze(["subgroups", "timestamp-query"]),
    zn = "high-performance";
async function Dc(r) {
    if (r.adapter !== void 0) return r.adapter;
    if (r.gpu !== void 0) return $n(r.gpu, r.powerPreference ?? zn);
    throw new h("E_NO_WEBGPU", "GpuContext.create needs one of gpu, adapter or device", {
        reason: "no gpu, adapter or device given",
        hint: "pass navigator.gpu (browser) or the gpu of createNodeGpu() (Node), or use the ./browser and ./node entries",
    });
}
class zt {
    constructor(e) {
        ((this.currentState = "ready"),
            (this.lostError = null),
            (this.slot = new Ea()),
            (this.lostListeners = new Set()),
            (this.disposers = []),
            (this.batchCounter = 0),
            (this.device = e.device),
            (this.caps = e.caps),
            (this.ownsDevice = e.ownsDevice),
            (this.label = e.label),
            (this.debug = { inspect: !1 }),
            (this.workgroupSize = Gs(e.caps)),
            (this.allocator = new Sa(e.device)),
            (this.residency = new Ac(e.device, e.caps, this.allocator, {
                warnUnreleasedSnapshots: e.warnUnreleasedSnapshots,
            })),
            (this.pool = new zs(e.device, this.allocator, e.caps.limits.maxBufferSize)),
            (this.readback = new dc(e.device, this.allocator)),
            (this.pipelines = new nc(e.device, e.caps)),
            (this.profiler = e.device.features.has("timestamp-query")
                ? new oc(e.device, !0, e.caps.runtime !== "node")
                : null),
            (this.uninstallSink = Ia(e.device, this.slot, e.onError)),
            (this.lost = Aa(e.device, (t) => {
                this.handleLost(t);
            })));
    }
    static async probe(e) {
        const { gpu: t } = e;
        if (t === void 0)
            return {
                ok: !1,
                code: "E_NO_WEBGPU",
                reason: "no GPU object: navigator.gpu is undefined (no WebGPU in this runtime)",
                adapter: null,
                summary: null,
            };
        let s;
        try {
            s = await $n(t, e.powerPreference ?? zn);
        } catch (n) {
            return {
                ok: !1,
                code: "E_NO_ADAPTER",
                reason: xt(n) ? n.message : String(n),
                adapter: null,
                summary: null,
            };
        }
        const i = Kt(s);
        return e.rejectSoftware === !0 && i.software
            ? {
                  ok: !1,
                  code: "E_SOFTWARE_ONLY",
                  reason: `software adapter rejected: ${i.vendor}/${i.architecture}`,
                  adapter: s,
                  summary: i,
              }
            : { ok: !0, code: "OK", reason: null, adapter: s, summary: i };
    }
    static async create(e) {
        const t = e.runtime ?? "unknown",
            s = e.label ?? xc,
            i = e.onError ?? null,
            n = e.warnUnreleasedSnapshots ?? fi;
        if (e.device !== void 0) {
            const p = yi(e.device, { runtime: t });
            return (
                is(p),
                new zt({ device: e.device, caps: p, ownsDevice: !1, label: s, onError: i, warnUnreleasedSnapshots: n })
            );
        }
        const o = await Dc(e),
            a = Kt(o);
        if (e.rejectSoftware === !0 && a.software)
            throw new h(
                "E_SOFTWARE_ONLY",
                `software adapter rejected by rejectSoftware: ${a.vendor}/${a.architecture}`,
                { adapter: a },
            );
        const c = ba(o, e.limits ?? "raise"),
            l = va(o, e.requiredFeatures ?? [], e.optionalFeatures ?? Rc),
            d = await ya(o, { label: s, requiredLimits: c, requiredFeatures: l }),
            f = _a(d, o.info, t, e.gpu?.wgslLanguageFeatures ?? []);
        try {
            is(f);
        } catch (p) {
            throw (d.destroy(), p);
        }
        return new zt({ device: d, caps: f, ownsDevice: !0, label: s, onError: i, warnUnreleasedSnapshots: n });
    }
    static from(e, t) {
        const s = yi(e, t);
        is(s);
        const i = e.label ?? "";
        return new zt({
            device: e,
            caps: s,
            ownsDevice: !1,
            label: i === "" ? "GpuContext.from" : i,
            onError: null,
            warnUnreleasedSnapshots: fi,
        });
    }
    get state() {
        return this.currentState;
    }
    assertReady() {
        if (this.currentState === "disposed")
            throw new h("E_DISPOSED", `GpuContext "${this.label}" is disposed`, { label: this.label });
        if (this.lostError !== null) throw this.lostError;
        const e = this.slot.take();
        if (e !== null) throw e;
    }
    takePendingError() {
        return this.slot.take();
    }
    nextBatchId() {
        return ((this.batchCounter += 1), this.batchCounter);
    }
    onLost(e) {
        return (
            this.lostListeners.add(e),
            () => {
                this.lostListeners.delete(e);
            }
        );
    }
    attachDisposer(e) {
        if (this.currentState === "disposed") {
            e();
            return;
        }
        this.disposers.push(e);
    }
    release(e) {
        this.currentState !== "disposed" && (this.residency.release(e), this.pool.trim());
    }
    dispose() {
        if (this.currentState === "disposed") return;
        ((this.currentState = "disposed"),
            this.uninstallSink(),
            this.residency.destroyAll(),
            this.pool.destroyAll(),
            this.readback.destroyAll(),
            this.profiler !== null && this.profiler.destroy(),
            this.ownsDevice && this.device.destroy());
        const e = this.disposers.splice(0);
        for (const t of e) t();
    }
    handleLost(e) {
        if (this.currentState !== "disposed") {
            ((this.currentState = "lost"), (this.lostError = Cn(e)), this.residency.clearOnLoss());
            for (const t of Array.from(this.lostListeners))
                try {
                    t(e);
                } catch {}
        }
    }
}
const Di = 2e3;
async function Tc(r, e) {
    let t;
    const s = new Promise((i) => {
        t = setTimeout(i, e);
    });
    (await Promise.race([
        r.then(
            () => {},
            () => {},
        ),
        s,
    ]),
        clearTimeout(t));
}
function Lc(r) {
    return r instanceof Error ? r.message : typeof r == "string" ? r : `non-error thrown (${typeof r})`;
}
class ne {
    constructor(e, t, s) {
        ((this.requests = []),
            (this.openPass = null),
            (this.dispatchCount = 0),
            (this.stagingBytes = 0),
            (this.slot = null),
            (this.submitted = !1),
            (this.host = e),
            (this.id = e.nextBatchId()),
            (this.generation = s ?? 0),
            (this.label = t),
            (this.encoder = e.device.createCommandEncoder({ label: `batch/${t}#${this.id}` })));
    }
    get dispatches() {
        return this.dispatchCount;
    }
    pass(e) {
        (this.assertOpen("pass"), this.endPass());
        const t = { label: `batch/${this.label}#${this.id}/${e}` },
            s = this.host.profiler?.beginPass(e);
        s !== void 0 && (t.timestampWrites = s);
        const i = this.encoder.beginComputePass(t);
        return (this.countDispatches(i), (this.openPass = i), i);
    }
    endPass() {
        this.openPass !== null && (this.openPass.end(), (this.openPass = null));
    }
    copy(e, t, s) {
        if ((this.assertOpen("copy"), this.checkByteLength(s), s > e.size || s > t.size))
            throw new h("E_INVALID_ARGUMENT", `copy of ${s} bytes exceeds a binding (src ${e.size}, dst ${t.size})`, {
                argument: "byteLength",
                value: s,
                expected: `<= ${Math.min(e.size, t.size)}`,
            });
        (this.endPass(), this.encoder.copyBufferToBuffer(e.buffer, e.offset, t.buffer, t.offset, s));
    }
    readback(e, t, s) {
        if (
            (this.assertOpen("readback"),
            this.checkByteLength(s),
            !Number.isInteger(t) || t < 0 || t % 4 !== 0 || t + s > e.size)
        )
            throw new h(
                "E_INVALID_ARGUMENT",
                `readback of [${t}, ${t + s}) is outside the ${e.size}-byte source or not 4-aligned`,
                {
                    argument: "srcOffset",
                    value: t,
                    expected: `a multiple of 4 with srcOffset + byteLength <= ${e.size}`,
                },
            );
        const i = { src: e, srcOffset: t, byteLength: s, offset: this.stagingBytes };
        return (this.requests.push(i), (this.stagingBytes += s), this.ensureSlot(this.stagingBytes), i);
    }
    resolveQuerySet(e, t, s, i) {
        (this.assertOpen("resolveQuerySet"), this.endPass(), this.encoder.resolveQuerySet(e, t, s, i, 0));
    }
    submit() {
        (this.assertOpen("submit"), (this.submitted = !0), this.endPass());
        const { slot: e } = this,
            t = this.host.takePendingError();
        try {
            this.host.assertReady();
        } catch (c) {
            throw (this.releaseSlot(), c);
        }
        if (e !== null)
            for (const c of this.requests)
                this.encoder.copyBufferToBuffer(c.src, c.srcOffset, e.buffer, c.offset, c.byteLength);
        const s = this.encoder.finish({ label: `batch/${this.label}#${this.id}` });
        this.host.device.queue.submit([s]);
        const i = this.host.takePendingError(),
            n = t ?? i,
            o = { discarded: !1 },
            a = n === null ? this.awaitReadback(e, o) : this.rejectReadback(n);
        return {
            id: this.id,
            generation: this.generation,
            readback: a,
            discard: () => {
                o.discarded = !0;
            },
        };
    }
    rejectReadback(e) {
        return (this.releaseSlot(), Promise.reject(this.attribute(e)));
    }
    async awaitReadback(e, t) {
        if (e === null) return (await this.host.allocator.check(), new ArrayBuffer(0));
        const s = this.stagingBytes;
        let i = () => {};
        const n = new Promise((c, l) => {
            i = this.host.onLost((d) => {
                l(Cn(d));
            });
        });
        n.catch(() => {});
        const o = this.host.readback.mapSlot(e, s);
        o.catch(() => {});
        let a;
        try {
            (await Promise.race([o, n]),
                this.host.assertReady(),
                (a = t.discarded ? new ArrayBuffer(0) : e.buffer.getMappedRange(0, s).slice(0)));
        } catch (c) {
            throw (await Tc(o, Di), this.releaseSlot(), await this.classify(c, n));
        } finally {
            i();
        }
        return (this.releaseSlot(), await this.host.allocator.check(), a);
    }
    async classify(e, t) {
        if (xt(e)) return e.code === "E_DEVICE_LOST" || e.code === "E_DISPOSED" ? e : this.attribute(e);
        try {
            this.host.assertReady();
        } catch (a) {
            if (xt(a)) return a.code === "E_DEVICE_LOST" || a.code === "E_DISPOSED" ? a : this.attribute(a);
        }
        let s;
        const i = new Promise((a) => {
                s = setTimeout(() => {
                    a(null);
                }, Di);
            }),
            n = await Promise.race([
                t.then(
                    () => null,
                    (a) => a,
                ),
                i,
            ]);
        if ((clearTimeout(s), xt(n))) return n;
        const o = Lc(e);
        return new h("E_VALIDATION", `mapAsync failed for batch ${this.id} "${this.label}": ${o}`, {
            label: this.label,
            message: o,
            batchId: this.id,
        });
    }
    attribute(e) {
        return new h(e.code, `${e.message} (delivered to batch ${this.id} "${this.label}")`, {
            ...e.details,
            batchId: this.id,
            batchLabel: this.label,
        });
    }
    ensureSlot(e) {
        (this.slot !== null && this.slot.capacity >= e) ||
            (this.releaseSlot(), (this.slot = this.host.readback.borrowSlot(e)));
    }
    releaseSlot() {
        if (this.slot === null) return;
        const { slot: e } = this;
        this.slot = null;
        try {
            this.host.readback.returnSlot(e);
        } catch (t) {
            if (!xt(t) || t.code !== "E_DISPOSED") throw t;
        }
    }
    countDispatches(e) {
        const t = e.dispatchWorkgroups.bind(e),
            s = e.dispatchWorkgroupsIndirect.bind(e);
        ((e.dispatchWorkgroups = (i, n, o) => {
            ((this.dispatchCount += 1), t(i, n, o));
        }),
            (e.dispatchWorkgroupsIndirect = (i, n) => {
                ((this.dispatchCount += 1), s(i, n));
            }));
    }
    assertOpen(e) {
        if (this.submitted)
            throw new h("E_INVALID_ARGUMENT", `${e}() after submit() on batch ${this.id} "${this.label}"`, {
                argument: e,
                value: this.id,
                expected: "a batch that has not been submitted",
            });
    }
    checkByteLength(e) {
        if (!Number.isInteger(e) || e <= 0 || e % 4 !== 0)
            throw new h("E_INVALID_ARGUMENT", `byteLength ${e} is not a positive multiple of 4`, {
                argument: "byteLength",
                value: e,
                expected: "a positive multiple of 4",
            });
    }
}
function Fn(r) {
    return Math.min(Bt, r.limits.maxComputeWorkgroupsPerDimension);
}
function Ws(r, e) {
    if (!Number.isInteger(e) || e < 0)
        throw new h("E_INVALID_ARGUMENT", `${r} must be a non-negative integer, got ${e}`, {
            argument: r,
            value: e,
            expected: "a non-negative integer",
        });
}
function Wn(r) {
    let e = r;
    for (; Number.isInteger(e) && e > 1 && e % 2 === 0;) e /= 2;
    if (e !== 1)
        throw new h("E_INVALID_ARGUMENT", `wg must be a power of two, got ${r}`, {
            argument: "wg",
            value: r,
            expected: "a power of two >= 1",
        });
}
function Un(r, e, t) {
    const s = Fn(t);
    if (r === 0) return { x: 0, y: 1, z: 1, items: e, stride: null };
    if (r <= s) return { x: r, y: 1, z: 1, items: e, stride: null };
    const i = Math.ceil(r / s);
    if (i > s)
        throw new h("E_TOO_LARGE", `${r} workgroups exceed the 2D dispatch limit of ${s * s}`, {
            needed: r,
            limit: s * s,
            path: "dispatch",
            algorithm: null,
            items: e,
        });
    return { x: s, y: i, z: 1, items: e, stride: null };
}
function z(r, e, t) {
    return (Ws("items", r), Wn(e), Un(Math.ceil(r / e), r, t));
}
function Ft(r, e) {
    return (Ws("groups", r), Un(r, r, e));
}
function Oe(r, e, t, s) {
    if ((Ws("items", r), Wn(e), r === 0)) return { x: 0, y: 1, z: 1, items: r, stride: null };
    const i = Math.min(s ?? (t.software ? 64 : 4096), Fn(t)),
        n = Math.min(Math.ceil(r / e), i);
    return { x: n, y: 1, z: 1, items: r, stride: n * e };
}
function Us(r) {
    return r.x * r.y;
}
const Ti = Object.freeze({
        u32: { size: 4, align: 4, width: 1, scalar: "u32" },
        i32: { size: 4, align: 4, width: 1, scalar: "i32" },
        f32: { size: 4, align: 4, width: 1, scalar: "f32" },
        vec2f: { size: 8, align: 8, width: 2, scalar: "f32" },
        vec2u: { size: 8, align: 8, width: 2, scalar: "u32" },
        vec4f: { size: 16, align: 16, width: 4, scalar: "f32" },
        vec4u: { size: 16, align: 16, width: 4, scalar: "u32" },
    }),
    cs = 16,
    Oc = /^[A-Za-z_]\w*$/,
    Nc = 4294967295,
    $c = -2147483648,
    Cc = 2147483647;
function Li(r, e) {
    return Math.ceil(r / e) * e;
}
function Oi(r, e) {
    if (!Oc.test(e) || Mn.includes(e))
        throw new h("E_INVALID_ARGUMENT", `UniformBlock: "${e}" is not a usable WGSL identifier`, {
            argument: r,
            value: e,
            expected: "a WGSL identifier that is not a reserved word",
        });
}
function Ni(r, e, t) {
    if (typeof t != "number")
        throw new h("E_INVALID_ARGUMENT", `UniformBlock: field "${r}" expects a number`, {
            argument: r,
            value: t,
            expected: e,
        });
    if (e === "u32" && !(Number.isInteger(t) && t >= 0 && t <= Nc))
        throw new h("E_INVALID_ARGUMENT", `UniformBlock: field "${r}" is not a u32`, {
            argument: r,
            value: t,
            expected: "an integer in [0, 4294967295]",
        });
    if (e === "i32" && !(Number.isInteger(t) && t >= $c && t <= Cc))
        throw new h("E_INVALID_ARGUMENT", `UniformBlock: field "${r}" is not an i32`, {
            argument: r,
            value: t,
            expected: "an integer in [-2147483648, 2147483647]",
        });
}
function Bc(r, e, t, s) {
    e === "u32" ? r.setUint32(t, s, !0) : e === "i32" ? r.setInt32(t, s, !0) : r.setFloat32(t, s, !0);
}
function $i(r, e, t) {
    return e === "u32" ? r.getUint32(t, !0) : e === "i32" ? r.getInt32(t, !0) : r.getFloat32(t, !0);
}
class se {
    static define(e, t, s) {
        if ((Oi("name", e), t.length === 0))
            throw new h("E_INVALID_ARGUMENT", `UniformBlock ${e}: a block needs at least one field`, {
                argument: "fields",
                value: t.length,
                expected: ">= 1 field",
            });
        const i = [],
            n = new Map();
        let o = 0;
        for (const [p, g] of t) {
            if ((Oi("fields", p), n.has(p)))
                throw new h("E_INVALID_ARGUMENT", `UniformBlock ${e}: duplicate field "${p}"`, {
                    argument: "fields",
                    value: p,
                    expected: "unique field names",
                });
            const m = Ti[g];
            if (m === void 0)
                throw new h("E_INVALID_ARGUMENT", `UniformBlock ${e}: unknown field type "${g}"`, {
                    argument: "fields",
                    value: g,
                    expected: Object.keys(Ti).join(" | "),
                });
            const b = Li(o, m.align),
                w = { name: p, type: g, offset: b, info: m };
            (i.push(w), n.set(p, w), (o = b + m.size));
        }
        const a = Li(o, cs),
            c = s?.padTo;
        if (c !== void 0 && (!Number.isInteger(c) || c % cs !== 0 || c < a))
            throw new h("E_INVALID_ARGUMENT", `UniformBlock ${e}: padTo ${c} is not a multiple of 16 >= ${a}`, {
                argument: "padTo",
                value: c,
                expected: `a multiple of ${cs} not below ${a}`,
            });
        const l = c ?? a,
            d = i.map((p, g) => {
                const m = g === i.length - 1,
                    b = p.offset + p.info.size;
                return `    ${m && b < l ? `@size(${l - p.offset}) ` : ""}${p.name}: ${p.type},`;
            }),
            f = `struct ${e} {
${d.join(`
`)}
}`;
        return new se(e, s?.layout ?? "uniform", t, l, f, i, n);
    }
    constructor(e, t, s, i, n, o, a) {
        ((this.name = e),
            (this.layout = t),
            (this.fields = Object.freeze(s.map(([c, l]) => Object.freeze([c, l])))),
            (this.byteLength = i),
            (this.wgsl = n),
            (this.laidOut = o),
            (this.table = a));
    }
    offsetOf(e) {
        return this.fieldLayout(e).offset;
    }
    write(e, t, s) {
        const i = this.regionStart(e, s);
        for (const o of Object.keys(t))
            if (!this.table.has(o))
                throw new h("E_INVALID_ARGUMENT", `UniformBlock ${this.name}: unknown field "${o}"`, {
                    argument: "values",
                    value: o,
                    expected: this.laidOut.map((a) => a.name).join(", "),
                });
        const n = this.laidOut.map((o) => this.components(o, t[o.name]));
        for (let o = 0; o < this.byteLength; o += 4) e.setUint32(i + o, 0, !0);
        this.laidOut.forEach((o, a) => {
            const c = n[a];
            c !== null &&
                c.forEach((l, d) => {
                    Bc(e, o.info.scalar, i + o.offset + 4 * d, l);
                });
        });
    }
    components(e, t) {
        if (t === void 0) return null;
        const { scalar: s, width: i } = e.info;
        if (i === 1) return (Ni(e.name, s, t), [t]);
        if (!Array.isArray(t) || t.length !== i)
            throw new h("E_INVALID_ARGUMENT", `UniformBlock ${this.name}: field "${e.name}" expects ${i} components`, {
                argument: e.name,
                value: t,
                expected: `an array of ${i} numbers`,
            });
        const n = [];
        for (let o = 0; o < i; o++) {
            const a = t[o];
            (Ni(e.name, s, a), n.push(a));
        }
        return n;
    }
    read(e, t) {
        const s = this.regionStart(e, t),
            i = {};
        for (const n of this.laidOut) i[n.name] = this.decode(e, n, s);
        return i;
    }
    readField(e, t, s) {
        const i = this.fieldLayout(t);
        return this.decode(e, i, this.regionStart(e, s));
    }
    fieldLayout(e) {
        const t = this.table.get(e);
        if (t === void 0)
            throw new h("E_INVALID_ARGUMENT", `UniformBlock ${this.name}: unknown field "${e}"`, {
                argument: "field",
                value: e,
                expected: this.laidOut.map((s) => s.name).join(", "),
            });
        return t;
    }
    regionStart(e, t) {
        const s = t ?? 0;
        if (!Number.isInteger(s) || s < 0 || s + this.byteLength > e.byteLength)
            throw new h(
                "E_INVALID_ARGUMENT",
                `UniformBlock ${this.name}: region [${s}, ${s + this.byteLength}) is outside the view`,
                { argument: "byteOffset", value: s, expected: `0 <= byteOffset <= ${e.byteLength - this.byteLength}` },
            );
        return s;
    }
    decode(e, t, s) {
        const { scalar: i, width: n } = t.info;
        if (n === 1) return $i(e, i, s + t.offset);
        const o = [];
        for (let a = 0; a < n; a++) o.push($i(e, i, s + t.offset + 4 * a));
        return o;
    }
}
const Mc = `
var<workgroup> sh: array<u32, WG>;          // the block's degrees, then their inclusive scan
var<workgroup> rowStart: array<u32, WG>;    // the first bound arc of each entry's row
var<workgroup> base: u32;                   // the block's reserved span in the edge queue
var<workgroup> wcount: u32;                 // the frontier's length on a two-phase level, 0 on any other

@compute @workgroup_size(WG)
fn advance_expand(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { wcount = select(0u, atomicLoad(&counters[0]), atomicLoad(&counters[24]) == 1u); }   // frontierCount, on the two-phase path only (the path word)
    let count = workgroupUniformLoad(&wcount);                       // uniform: the block loop below holds barriers
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries (a direct dispatch of the plan's groups)
        let i = b0 + lid.x;                                          // this lane's frontier entry
        var deg = 0u;
        var start = 0u;
        if (i < count) {                                                 // guarded loads into locals (3.5 rule 1)
            let v = frontierIn[i];
            let lo = max(rowPtr[v], P.arcBase);                          // the row clipped to the bound window (P8-T12)
            let hi = min(rowPtr[v + 1u], P.arcEnd);
            start = lo;
            deg = select(0u, hi - lo, hi > lo);
        }
        let inclusive = wg_scan_u32(deg, lid.x);                         // the prelude's inclusive scan in LANE order (P8-T1 Step 5); the twin
        sh[lid.x] = inclusive;                                           // sh is monotone in lid.x, the index the binary search walks
        rowStart[lid.x] = start;
        workgroupBarrier();
        let aggregate = workgroupUniformLoad(&sh[WG - 1u]);              // uniform; includes a barrier
        if (lid.x == 0u) {
            base = atomicAdd(&counters[8], aggregate);                   // edgeCount: ONE reservation per workgroup, not one per arc
            atomicAdd(&counters[9], aggregate);                          // edgeCountUnclamped: the overflow detector (PD-23)
            atomicAdd(&counters[2], aggregate);                          // frontierDegreeSum: what this level expanded (the inspect seam)
        }
        workgroupBarrier();
        for (var p = lid.x; p < aggregate; p = p + WG) {                 // strip [0, aggregate): lane j takes j, j + WG, ...
            var lo = 0u;                                                 // upper_bound: the first k with sh[k] > p owns arc p
            var hi = WG;
            loop {
                if (lo >= hi) { break; }
                let mid = (lo + hi) / 2u;
                if (sh[mid] > p) { hi = mid; } else { lo = mid + 1u; }
            }
            let k = lo;
            var exclusive = 0u;
            if (k > 0u) { exclusive = sh[k - 1u]; }
            let arc = rowStart[k] + (p - exclusive);
            let q = base + p;
            if (q < P.edgeCapacity) { edgeQueue[q] = colIdx[arc - P.arcBase]; }   // the clamp of PD-23; the queue holds the target vertex only (PD-24)
        }
        workgroupBarrier();                                              // sh, rowStart and base are reused by the next block
    }
}
`,
    Gc = `
var<workgroup> tileA: array<f32, APSP_TILE * APSP_TILE>;
var<workgroup> tileB: array<f32, APSP_TILE * APSP_TILE>;

fn tile_row(block: vec2<u32>, c: u32) -> u32 { return block.x * APSP_TILE + c / APSP_TILE; }
fn tile_col(block: vec2<u32>, c: u32) -> u32 { return block.y * APSP_TILE + c % APSP_TILE; }

fn load_cell(block: vec2<u32>, c: u32) -> f32 {
    let i = tile_row(block, c);
    let j = tile_col(block, c);
    if (i < P.n && j < P.n) { return dist[i * P.n + j]; }
    return bitcast<f32>(P.infBits);                                   // outside the matrix: no path through it
}

fn store_cell(block: vec2<u32>, c: u32, v: f32) {
    let i = tile_row(block, c);
    let j = tile_col(block, c);
    if (i >= P.n || j >= P.n) { return; }                            // an edge tile stores nothing outside n x n
    dist[i * P.n + j] = v;
}

@compute @workgroup_size(WG)
fn apsp_fw(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let r = P.round;
    let others = max(P.blocks, 2u) - 1u;                             // the blocks of a strip, the pivot excluded
    let cells = APSP_TILE * APSP_TILE;
    var count = 1u;
    var own = vec2<u32>(r, r);                                        // the block this workgroup updates
    var a = vec2<u32>(r, r);                                          // staged in tileA
    var b = vec2<u32>(r, r);                                          // staged in tileB
    if (PHASE == 1u) {
        count = 2u * others;
        let s = g % others;
        let o = select(s, s + 1u, s >= r);                            // a strip skips the pivot block
        own = select(vec2<u32>(o, r), vec2<u32>(r, o), g < others);   // block row r first, then block column r
        b = own;
    }
    if (PHASE == 2u) {
        count = others * others;
        let i = g / others;
        let j = g % others;
        own = vec2<u32>(select(i, i + 1u, i >= r), select(j, j + 1u, j >= r));
        a = vec2<u32>(own.x, r);                                      // the pivot-column block (i, r)
        b = vec2<u32>(r, own.y);                                      // the pivot-row block (r, j)
    }
    if (g >= count) { return; }                                       // uniform: the workgroup id and uniforms only

    for (var c = lid.x; c < cells; c = c + WG) {
        tileA[c] = load_cell(a, c);
        if (PHASE != 0u) { tileB[c] = load_cell(b, c); }
    }
    workgroupBarrier();                                               // every staged cell is visible

    if (PHASE == 2u) {
        for (var c = lid.x; c < cells; c = c + WG) {
            let x = c / APSP_TILE;
            let y = c % APSP_TILE;
            var v = load_cell(own, c);
            for (var kr = 0u; kr < APSP_TILE; kr = kr + 1u) {
                v = min(v, tileA[x * APSP_TILE + kr] + tileB[kr * APSP_TILE + y]);
            }
            store_cell(own, c, v);
        }
        return;
    }

    let pivotRow = PHASE == 1u && own.x == r;                          // block row r reads d[x][k] from the pivot
    for (var k = 0u; k < APSP_TILE; k = k + 1u) {
        for (var c = lid.x; c < cells; c = c + WG) {
            let x = c / APSP_TILE;
            let y = c % APSP_TILE;
            if (PHASE == 0u) {
                let via = tileA[x * APSP_TILE + k] + tileA[k * APSP_TILE + y];
                if (via < tileA[c]) { tileA[c] = via; }
            } else {
                let left = select(tileB[x * APSP_TILE + k], tileA[x * APSP_TILE + k], pivotRow);
                let right = select(tileA[k * APSP_TILE + y], tileB[k * APSP_TILE + y], pivotRow);
                let via = left + right;
                if (via < tileB[c]) { tileB[c] = via; }
            }
        }
        workgroupBarrier();                                           // step k is complete before step k + 1 reads
    }
    for (var c = lid.x; c < cells; c = c + WG) {
        store_cell(own, c, select(tileB[c], tileA[c], PHASE == 0u));
    }
}
`,
    zc = `
@compute @workgroup_size(WG)
fn apsp_init(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let u = linear_id(wid, lid.x);
    if (u >= P.n) { return; }
    let rowBase = u * P.n;
    let end = rowPtr[u + 1u];
    for (var a = rowPtr[u]; a < end; a = a + 1u) {
        let v = colIdx[a];
        let w = select(1.0, weights[a], HAS_WEIGHTS);
        dist[rowBase + v] = min(dist[rowBase + v], w);               // parallel arcs collapse to the cheapest
    }
    dist[rowBase + u] = 0.0;                                          // last: a self-loop never displaces the zero
}
`,
    Fc = `
fn sigma_of(word: u32) -> f32 {                                     // a stored count: u32, or f32 bits when SCALED
    if (SCALED) { return bitcast<f32>(word); }
    return f32(word);
}

@compute @workgroup_size(WG)
fn bc_backward(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var i = linear_id(wid, lid.x); i < P.count; i = i + P.stride) {
        let t = S[P.start + i];                                      // s * n + w
        let w = t % P.n;
        let base = t - w;                                            // s * n
        let succ = depthK[t] + 1u;
        let sw = sigma_of(sigmaK[t]);
        let shift = select(0i, sigma_shift(levelMax[depthK[t]]), SCALED);   // the scale step to the successors' depth
        var acc = 0.0;
        for (var a = rowPtr[w]; a < rowPtr[w + 1u]; a = a + 1u) {
            let v = base + colIdx[a];
            if (depthK[v] == succ) {                                 // v is a successor of w for source s
                acc = acc + ldexp(sw / sigma_of(sigmaK[v]), -shift) * (1.0 + deltaK[v]);
            }
        }
        deltaK[t] = acc;                                             // written once per (w, s)
    }
}
`,
    Wc = `
@compute @workgroup_size(WG)
fn bc_count(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    let start = ends[level + 1u];                                    // the boundary closed the claim-from level here
    let count = atomicLoad(&counters[26]) - start;                   // stackTop: what the forward dispatch appended
    let shift = sigma_shift(atomicLoad(&levelMax[level]));
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {
        let t = S[start + i];                                        // s * n + x, at depth level + 1
        let x = t % P.n;
        let base = t - x;                                            // s * n
        var acc = 0.0;
        for (var a = rowPtr[x]; a < rowPtr[x + 1u]; a = a + 1u) {    // the in-arcs (v, x)
            let v = base + colIdx[a];
            if (depthK[v] == level) { acc = acc + bitcast<f32>(sigmaK[v]); }   // every predecessor's paths, CSR order
        }
        let sigma = ldexp(acc, -shift);
        let bits = bitcast<u32>(sigma);
        sigmaK[t] = bits;
        let exponent = (bits >> 23u) & 0xffu;
        if (exponent == 0u || exponent == 0xffu) { atomicOr(&counters[27], 1u); }   // out of f32's normal range
        atomicMax(&levelMax[level + 1u], bits);
    }
}
`,
    Uc = `
fn sigma_of(word: u32) -> f32 {                                     // a stored count: u32, or f32 bits when SCALED
    if (SCALED) { return bitcast<f32>(word); }
    return f32(word);
}

@compute @workgroup_size(WG)
fn bc_edge_gather(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var a = linear_id(wid, lid.x); a < P.count; a = a + P.stride) {
        var lo = 0u;                                                 // the row w with rowPtr[w] <= a < rowPtr[w + 1]
        var hi = P.n;
        loop {
            if (lo >= hi) { break; }
            let mid = (lo + hi) / 2u;
            if (rowPtr[mid + 1u] <= a) { lo = mid + 1u; } else { hi = mid; }
        }
        let w = lo;
        let nbr = colIdx[a];
        var acc = arcScores[a];
        for (var s = 0u; s < P.k; s = s + 1u) {
            let base = s * P.n;
            let dw = depthK[base + w];
            if (dw != INVALID_INDEX && depthK[base + nbr] == dw + 1u) {   // (w, nbr) is on a shortest path from s
                let shift = select(0i, sigma_shift(levelMax[dw]), SCALED);
                let ratio = ldexp(sigma_of(sigmaK[base + w]) / sigma_of(sigmaK[base + nbr]), -shift);
                acc = acc + ratio * (1.0 + deltaK[base + nbr]);
            }
        }
        arcScores[a] = acc;
    }
}
`,
    Vc = `
@compute @workgroup_size(WG)
fn bc_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                     // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 1u) {                                              // the seed of a batch
        for (var i = 0u; i < P.k; i = i + 1u) {
            let t = S[i];
            depthK[t] = 0u;                                          // the source is at depth 0
            sigmaK[t] = select(1u, bitcast<u32>(1.0), SCALED);       // with one shortest path, itself (f32 bits when SCALED)
        }
        levelMax[0] = bitcast<u32>(1.0);                             // the largest count at depth 0
        ends[0] = 0u;
        atomicStore(&counters[26], P.k);                             // stackTop: the seeds are the log's first k entries
        atomicStore(&counters[27], 0u);                              // sigmaOverflow
        atomicStore(&counters[11], U32_MAX);                         // level: the first boundary brings it to 0
        atomicStore(&counters[15], 0u);                              // done
        return;
    }
    if (atomicLoad(&counters[15]) != 0u) { return; }                 // done: a no-op level the host recorded past the end
    let level = atomicLoad(&counters[11]) + 1u;
    let top = atomicLoad(&counters[26]);
    ends[level + 1u] = top;                                          // the level's entries end where the log ends now
    let count = top - ends[level];
    atomicStore(&counters[0], count);                                // frontierCount (the inspect seam reads it)
    atomicStore(&counters[11], level);
    atomicStore(&counters[15], select(0u, 1u, count == 0u));         // an empty level ends the batch
}
`,
    jc = `
var<workgroup> sh: array<u32, WG>;                // the block's degrees, then their inclusive scan
var<workgroup> rowStart: array<u32, WG>;          // the first arc of each entry's row
var<workgroup> entryOf: array<u32, WG>;           // each entry, s * n + u
var<workgroup> wstart: u32;                       // the level's first log index
var<workgroup> wcount: u32;                       // the level's entry count
var<workgroup> wwon: atomic<u32>;                 // the strip's winners
var<workgroup> wbase: u32;                        // where the strip's winners go in the log

@compute @workgroup_size(WG)
fn bc_forward(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    if (lid.x == 0u) {
        let lo = ends[level];
        wstart = lo;
        wcount = ends[level + 1u] - lo;
    }
    let start = workgroupUniformLoad(&wstart);
    let count = workgroupUniformLoad(&wcount);                       // uniform: the block loop below holds barriers
    let next = level + 1u;
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var deg = 0u;
        var first = 0u;
        var entry = 0u;
        if (i < count) {                                             // guarded loads into locals (3.5 rule 1)
            entry = S[start + i];
            let u = entry % P.n;
            first = rowPtr[u];
            deg = rowPtr[u + 1u] - first;
        }
        sh[lid.x] = deg;
        rowStart[lid.x] = first;
        entryOf[lid.x] = entry;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan of the degrees
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let aggregate = workgroupUniformLoad(&sh[WG - 1u]);          // uniform; includes a barrier
        for (var p0 = 0u; p0 < aggregate; p0 = p0 + WG) {            // strip [0, aggregate) WG arcs at a time
            let p = p0 + lid.x;
            var won = false;
            var claimed = 0u;
            if (p < aggregate) {
                var lo = 0u;                                         // upper_bound: the first k with sh[k] > p owns arc p
                var hi = WG;
                loop {
                    if (lo >= hi) { break; }
                    let mid = (lo + hi) / 2u;
                    if (sh[mid] > p) { hi = mid; } else { lo = mid + 1u; }
                }
                let k = lo;
                var exclusive = 0u;
                if (k > 0u) { exclusive = sh[k - 1u]; }
                let origin = entryOf[k];                             // s * n + u
                let x = (origin - (origin % P.n)) + colIdx[rowStart[k] + (p - exclusive)];   // s * n + x
                if (atomicLoad(&depthK[x]) == INVALID_INDEX) {       // the pre-check of design 16.1
                    won = atomicMin(&depthK[x], next) == INVALID_INDEX;   // the claim: the one winner appends
                }
                if (!SCALED && atomicLoad(&depthK[x]) == next) {     // the count: EVERY arc on a shortest path adds
                    let add = atomicLoad(&sigmaK[origin]);
                    let old = atomicAdd(&sigmaK[x], add);
                    if (old + add < old) { atomicOr(&counters[27], 1u); }   // the u32 wrap, reported
                }
                claimed = x;
            }
            var slot = 0u;
            if (won) { slot = atomicAdd(&wwon, 1u); }
            workgroupBarrier();
            if (lid.x == 0u) {
                wbase = atomicAdd(&counters[26], atomicLoad(&wwon));   // stackTop: one global atomic per strip
                atomicStore(&wwon, 0u);
            }
            workgroupBarrier();
            if (won) { S[wbase + slot] = claimed; }
        }
        workgroupBarrier();                                          // sh, rowStart and entryOf are reused by the next block
    }
}
`,
    qc = `
var<workgroup> wlive: u32;                        // 1 when the level has entries
var<workgroup> wwon: atomic<u32>;                 // the strip's winners
var<workgroup> wbase: u32;                        // where the strip's winners go in the log

fn claim(x: u32, next: u32) -> bool {
    if (atomicLoad(&depthK[x]) != INVALID_INDEX) { return false; }   // the pre-check of design 16.1
    return atomicMin(&depthK[x], next) == INVALID_INDEX;
}

fn count_paths(origin: u32, x: u32, next: u32) {
    if (!SCALED && atomicLoad(&depthK[x]) == next) {                 // every arc on a shortest path adds
        let add = atomicLoad(&sigmaK[origin]);
        let old = atomicAdd(&sigmaK[x], add);
        if (old + add < old) { atomicOr(&counters[27], 1u); }        // the u32 wrap, reported
    }
}

@compute @workgroup_size(WG)
fn bc_forward_edge(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    if (lid.x == 0u) { wlive = select(0u, 1u, ends[level + 1u] > ends[level]); }
    if (workgroupUniformLoad(&wlive) == 0u) { return; }              // uniform: nothing below runs on an empty level
    let next = level + 1u;
    for (var s = 0u; s < P.k; s = s + 1u) {
        let base = s * P.n;
        for (var e0 = group_id(wid) * WG; e0 < P.count; e0 = e0 + P.stride) {   // grid-stride over the edges
            let e = e0 + lid.x;
            var a = INVALID_INDEX;                                   // the claims this lane won
            var b = INVALID_INDEX;
            if (e < P.count) {
                let u = base + edgeSrc[e];
                let x = base + edgeDst[e];
                if (atomicLoad(&depthK[u]) == level) {
                    if (claim(x, next)) { a = x; }
                    count_paths(u, x, next);
                }
                if (UNDIRECTED) {                                    // the other direction of an undirected edge
                    if (atomicLoad(&depthK[x]) == level) {
                        if (claim(u, next)) { b = u; }
                        count_paths(x, u, next);
                    }
                }
            }
            let mine = select(0u, 1u, a != INVALID_INDEX) + select(0u, 1u, b != INVALID_INDEX);
            var slot = 0u;
            if (mine != 0u) { slot = atomicAdd(&wwon, mine); }
            workgroupBarrier();
            if (lid.x == 0u) {
                wbase = atomicAdd(&counters[26], atomicLoad(&wwon));   // stackTop: one global atomic per strip
                atomicStore(&wwon, 0u);
            }
            workgroupBarrier();
            if (a != INVALID_INDEX) {
                S[wbase + slot] = a;
                slot = slot + 1u;
            }
            if (b != INVALID_INDEX) { S[wbase + slot] = b; }
        }
    }
}
`,
    Kc = `
@compute @workgroup_size(WG)
fn bc_gather(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var w = linear_id(wid, lid.x); w < P.n; w = w + P.stride) {
        var acc = bc[w];
        for (var s = 0u; s < P.k; s = s + 1u) {
            acc = acc + deltaK[s * P.n + w];
        }
        bc[w] = acc;
    }
}
`,
    Hc = `
fn relax(v: u32, nd: f32) {
    var cur = atomicLoad(&dist[v]);
    var tries = 0u;
    loop {
        if (!(nd < bitcast<f32>(cur))) { break; }                     // no improvement; +Inf is greater than every finite nd
        let r = atomicCompareExchangeWeak(&dist[v], cur, bitcast<u32>(nd));
        if (r.exchanged) { atomicStore(&flags[0], 1u); break; }        // changed
        if (r.old_value == cur) {                                      // a spurious failure: the only kind the bound counts
            tries = tries + 1u;
            if (tries >= P.maxRetries) { atomicStore(&flags[1], 1u); break; }   // retryExhausted (PD-12)
        }
        cur = r.old_value;                                             // else another lane's improvement won (issue #470)
    }
}

@compute @workgroup_size(WG)
fn bf_relax(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let cutoff = bitcast<f32>(P.cutoffBits);
    for (var e = first; e < P.edgeCount; e = e + P.stride) {          // each logical edge once (edgeList)
        let u = edgeSrc[e];
        let v = edgeDst[e];
        let w = weights[edgeToArc[e]];                                 // the edge's weight through its forward arc
        let du = atomicLoad(&dist[u]);
        if (du != F32_INF_BITS) {                                      // unreached is tested as the bit pattern, as sssp-pred does
            let nd = bitcast<f32>(du) + w;
            if (nd <= cutoff) { relax(v, nd); }
        }
        if (UNDIRECTED) {                                              // the other direction of an undirected edge
            let dv = atomicLoad(&dist[v]);
            if (dv != F32_INF_BITS) {
                let nd = bitcast<f32>(dv) + w;
                if (nd <= cutoff) { relax(u, nd); }
            }
        }
    }
}
`,
    Yc = `
@compute @workgroup_size(WG)
fn bfs_bitset_build(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let count = select(0u, atomicLoad(&counters[0]), atomicLoad(&counters[24]) == 3u);   // frontierCount, on the bottom-up path only (the path word)
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {   // grid-stride; no barrier anywhere
        let v = frontierIn[i];
        atomicOr(&bits[P.bitsBase + (v >> 5u)], 1u << (v & 31u));
    }
}
`,
    Xc = `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;
var<workgroup> wcount: u32;                                          // the unvisited list's length on a bottom-up level, 0 on any other

@compute @workgroup_size(WG)
fn bfs_bottom_up(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let claim = atomicLoad(&counters[11]) + 1u;
    if (lid.x == 0u) { wcount = select(0u, atomicLoad(&counters[7]), atomicLoad(&counters[24]) == 3u); }   // unvisitedListLen, on the bottom-up path only (the path word)
    let len = workgroupUniformLoad(&wcount);                         // uniform: the block loop below holds barriers
    for (var b0 = group_id(wid) * WG; b0 < len; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var won = 0u;
        var v = 0u;
        var reads = 0u;
        if (i < len) {                                                   // guarded work into locals
            v = sweepIn[i];
            if (atomicLoad(&depth[v]) == INVALID_INDEX) {                // a stale entry, claimed since the rebuild, is skipped
                let end = min(rowPtr[v + 1u], P.arcEnd);
                for (var a = max(rowPtr[v], P.arcBase); a < end; a = a + 1u) {   // in-neighbours through the reverse core
                    reads = reads + 1u;
                    let u = colIdx[a - P.arcBase];
                    if (mask_bit(sweepIn[P.bitsBase + (u >> 5u)], u)) { won = 1u; break; }   // the early exit: a real break, never a flag
                }
            }
        }
        sh[lid.x] = won;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                           // Hillis-Steele inclusive scan of won (bfs-contract's)
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let inclusive = sh[lid.x];
        let readsTotal = wg_reduce_u32(reads, lid.x, 0u);                // arcsScanned, one atomic per workgroup (the sabotage witness, Step 6)
        if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }
        if (lid.x == 0u) { atomicAdd(&counters[16], readsTotal); }
        workgroupBarrier();
        if (won == 1u) {
            atomicStore(&depth[v], claim);                               // no claim race: the list holds v once and the sweep is vertex-parallel
            frontierOut[base + inclusive - 1u] = v;
        }
        workgroupBarrier();                                              // sh and base are reused by the next block
    }
}
`,
    Qc = `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;
var<workgroup> wcount: u32;                                          // the clamped edge count on a two-phase level, 0 on any other

@compute @workgroup_size(WG)
fn bfs_contract(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { wcount = select(0u, atomicLoad(&counters[8]), atomicLoad(&counters[24]) == 1u); }   // edgeCount, clamped by role 1; the two-phase path only (the path word)
    let count = workgroupUniformLoad(&wcount);                       // uniform: the block loop below holds barriers
    let claim = atomicLoad(&counters[11]) + 1u;                      // the depth this level assigns
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var won = 0u;
        var v = 0u;
        if (i < count) {                                                 // guarded work into locals
            v = edgeQueue[i];
            let old = atomicMin(&depth[v], claim);
            won = select(0u, 1u, old == INVALID_INDEX);                  // PD-6: the unique winner
        }
        sh[lid.x] = won;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                           // Hillis-Steele inclusive scan of won
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let inclusive = sh[lid.x];
        if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }   // nextFrontierCount: one reservation per workgroup
        workgroupBarrier();
        if (won == 1u) { frontierOut[base + inclusive - 1u] = v; }
        workgroupBarrier();                                              // sh and base are reused by the next block
    }
}
`,
    Zc = `
var<workgroup> sh: array<u32, WG>;
var<workgroup> wdeg: u32;
var<workgroup> wstart: u32;
var<workgroup> base: u32;
var<workgroup> wcount: u32;                                          // the frontier's length on a fused or retry level, 0 on any other

@compute @workgroup_size(WG)
fn bfs_fused(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let claim = atomicLoad(&counters[11]) + 1u;
    if (lid.x == 0u) {
        let path = atomicLoad(&counters[24]);                        // 2 the fused level, 4 the overflow retry (PD-23)
        wcount = select(0u, atomicLoad(&counters[0]), path == 2u || path == 4u);
    }
    let count = workgroupUniformLoad(&wcount);                       // uniform: the entry loop below holds barriers
    for (var g = group_id(wid); g < count; g = g + P.stride) {       // one workgroup per frontier entry; P.stride is the dispatch's GROUP count
        if (lid.x == 0u) {
            let u = frontierIn[g];
            let a0 = max(rowPtr[u], P.arcBase);
            let a1 = min(rowPtr[u + 1u], P.arcEnd);
            let d = select(0u, a1 - a0, a1 > a0);
            wdeg = d;
            wstart = a0;
            atomicAdd(&counters[2], d);                                  // frontierDegreeSum, so the inspect seam sees fused levels too
        }
        let deg = workgroupUniformLoad(&wdeg);                           // uniform: the loop below may hold barriers
        let start = workgroupUniformLoad(&wstart);
        for (var p0 = 0u; p0 < deg; p0 = p0 + WG) {                      // strip the row WG arcs at a time
            let p = p0 + lid.x;
            var won = 0u;
            var v = 0u;
            if (p < deg) {                                               // guarded claim into locals
                v = colIdx[start + p - P.arcBase];
                let old = atomicMin(&depth[v], claim);
                won = select(0u, 1u, old == INVALID_INDEX);
            }
            sh[lid.x] = won;
            workgroupBarrier();
            for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan of won (bfs-contract's, verbatim)
                var t = 0u;
                if (lid.x >= s) { t = sh[lid.x - s]; }
                workgroupBarrier();
                sh[lid.x] = sh[lid.x] + t;
                workgroupBarrier();
            }
            let inclusive = sh[lid.x];
            if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }
            workgroupBarrier();
            if (won == 1u) { frontierOut[base + inclusive - 1u] = v; }
            workgroupBarrier();                                          // sh and base are reused by the next strip
        }
    }
}
`,
    Jc = `
@compute @workgroup_size(WG)
fn bfs_next_degree(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let count = select(0u, atomicLoad(&counters[1]), atomicLoad(&counters[24]) != 0u);   // nextFrontierCount, on a level that claimed (the path word)
    var sum = 0u;
    var inSum = 0u;
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {   // no barrier inside: the trip count is per lane
        let v = frontier[i];
        sum = sum + outDegree[v];
        inSum = inSum + inDegree[v];
    }
    let total = wg_reduce_u32(sum, lid.x, 0u);                       // the prelude's workgroup sum; uniform: after the loop
    let inTotal = wg_reduce_u32(inSum, lid.x, 0u);
    if (lid.x == 0u) {
        atomicAdd(&counters[25], total);                             // nextDegreeSum: ONE atomic per workgroup
        atomicSub(&counters[6], inTotal);                            // unvisitedDegreeSum: the claimed vertices' in-arcs leave it (issue #1358)
    }
}
`,
    el = `
@compute @workgroup_size(WG)
fn bfs_unvisited_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    var cnt = 0u;
    var degSum = 0u;
    var len = 0u;
    for (var v = first; v < P.n; v = v + P.stride) {                 // no barrier inside: the trip count is per lane
        let unv = depth[v] == INVALID_INDEX;
        let listed = unv && (inDegree[v] != 0u);
        flags[v] = select(0u, 1u, listed);
        cnt = cnt + select(0u, 1u, unv);
        degSum = degSum + select(0u, inDegree[v], unv);              // the IN-degree: what a bottom-up sweep reads at most (issue #1358)
        len = len + select(0u, 1u, listed);
    }
    let c = wg_reduce_u32(cnt, lid.x, 0u);                           // the prelude's workgroup sum (combine_u's sum code); uniform: after the loop
    let d = wg_reduce_u32(degSum, lid.x, 0u);
    let l = wg_reduce_u32(len, lid.x, 0u);
    if (lid.x == 0u) {                                               // ONE atomic per word per workgroup
        atomicAdd(&counters[5], c);
        atomicAdd(&counters[6], d);
        atomicAdd(&counters[7], l);
    }
}
`,
    tl = `
const max_words: u32 = 8u;
var<workgroup> tally: array<atomic<u32>, 32u * max_words>;   // 32 x max_words: this workgroup's claims per source lane
var<workgroup> wlive: u32;
var<workgroup> wpull: u32;
var<workgroup> wany: atomic<u32>;
var<workgroup> warcs: atomic<u32>;
var<workgroup> wover: atomic<u32>;

fn dead_lanes(j: u32) -> u32 {                        // the lanes of word j at or past the batch's source count
    let first = 32u * j;
    if (P.count >= first + 32u) { return 0u; }
    if (P.count <= first) { return U32_MAX; }
    return ~((1u << (P.count - first)) - 1u);
}

fn add_arcs(slot: u32, value: u32) {                  // the arcs total of a control slot; pull once it passes P.pullAt
    if (value == 0u) { return; }
    let before = atomicAdd(&table[slot + 1u], value);
    if (value > P.pullAt || before + value > P.pullAt || before + value < before) {
        atomicStore(&table[slot + 2u], 1u);
    }
}

fn record(j: u32, node: u32, fresh: u32, dist: u32) {   // the claims of one word: tallied per lane, a sampled run's sums
    if (P.perNode == 1u) { atomicAdd(&bits[4u * P.base + node], countOneBits(fresh) * dist); }
    var b = fresh;
    loop {
        if (b == 0u) { break; }
        atomicAdd(&tally[32u * j + firstTrailingBit(b)], 1u);
        b = b & (b - 1u);
    }
}

@compute @workgroup_size(WG)
fn closeness_level(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    let W = P.words;
    if (P.role == 1u) {                                              // seed, part 1: one invocation per word
        if (i == 0u) {
            for (var k = 0u; k < 12u; k = k + 1u) { atomicStore(&table[P.ctrl + k], 0u); }
        }
        if (i < P.total) { atomicStore(&bits[i], select(0u, dead_lanes(i % W), i < P.base)); }
        return;                                                      // uniform: P.role is
    }
    if (P.role == 2u) {                                              // seed, part 2: one invocation per source lane
        if (i < P.count) {
            var v = P.source + i;
            if (P.sourcesAt != 0u) { v = atomicLoad(&table[P.sourcesAt + P.source + i]); }
            let w = v * W + i / 32u;
            let bit = 1u << (i % 32u);
            atomicOr(&bits[w], bit);                                 // visited
            let before = atomicOr(&bits[P.base + w], bit);           // level 0's frontier (region 1)
            let slot = P.ctrl + 8u;                                  // the slot of "level -1", which level 0 reads
            atomicStore(&table[slot], 1u);
            if (before == 0u) { add_arcs(slot, rowPtr[v + 1u] - rowPtr[v]); }
        }
        return;
    }

    // role 0: one level
    let L = P.level;
    let prev = P.ctrl + 4u * ((L + 2u) % 3u);
    let cur = P.ctrl + 4u * (L % 3u);
    if (lid.x == 0u) {
        wlive = atomicLoad(&table[prev]);
        wpull = select(0u, atomicLoad(&table[prev + 2u]), P.pullOk == 1u);
        atomicStore(&wany, 0u);
        atomicStore(&warcs, 0u);
        atomicStore(&wover, 0u);
    }
    for (var k = lid.x; k < 32u * W; k = k + WG) { atomicStore(&tally[k], 0u); }
    let live = workgroupUniformLoad(&wlive);                         // uniform; includes a barrier
    if (live == 0u) { return; }                                      // the previous level claimed nothing
    let pull = workgroupUniformLoad(&wpull) == 1u;
    if (i == 0u) {                                                   // the slot of level L + 1 held level L - 2's
        let nxt = P.ctrl + 4u * ((L + 1u) % 3u);
        atomicStore(&table[nxt], 0u);
        atomicStore(&table[nxt + 1u], 0u);
        atomicStore(&table[nxt + 2u], 0u);
    }
    let frontierBase = P.base * (1u + L % 3u);
    let nextBase = P.base * (1u + (L + 1u) % 3u);
    let staleBase = P.base * (1u + (L + 2u) % 3u);
    let dist = L + 1u;
    var arcs = 0u;
    if (i < P.n) {
        for (var j = 0u; j < W; j = j + 1u) { atomicStore(&bits[staleBase + i * W + j], 0u); }
    }
    if (pull) {
        if (i < P.n) {                                               // one invocation per node: its in-arcs
            var vis: array<u32, max_words>;
            var unseen = 0u;
            for (var j = 0u; j < W; j = j + 1u) {
                vis[j] = atomicLoad(&bits[i * W + j]);
                unseen = unseen | ~vis[j];
            }
            if (unseen != 0u) {                                      // some source has not reached this node yet
                var acc: array<u32, max_words>;
                let end = inRowPtr[i + 1u];
                for (var a = inRowPtr[i]; a < end; a = a + 1u) {
                    let u = inColIdx[a];
                    var missing = 0u;
                    for (var j = 0u; j < W; j = j + 1u) {
                        acc[j] = acc[j] | atomicLoad(&bits[frontierBase + u * W + j]);
                        missing = missing | ~(acc[j] | vis[j]);
                    }
                    if (missing == 0u) { break; }                    // every source has reached it: the early exit
                }
                let degree = rowPtr[i + 1u] - rowPtr[i];
                for (var j = 0u; j < W; j = j + 1u) {
                    let fresh = acc[j] & ~vis[j];
                    if (fresh != 0u) {
                        atomicStore(&bits[i * W + j], vis[j] | fresh);
                        atomicStore(&bits[nextBase + i * W + j], fresh);
                        arcs = arcs + degree;
                        record(j, i, fresh, dist);
                    }
                }
            }
        }
    } else if (i < P.arcCount) {                                     // one invocation per arc: no row is walked whole
        var lo = 0u;                                                 // the arc's source: the last row starting at or before it
        var hi = P.n - 1u;
        loop {
            if (lo >= hi) { break; }
            let mid = (lo + hi + 1u) / 2u;
            if (rowPtr[mid] <= i) { lo = mid; } else { hi = mid - 1u; }
        }
        let u = lo;
        let x = colIdx[i];
        for (var j = 0u; j < W; j = j + 1u) {
            let mask = atomicLoad(&bits[frontierBase + u * W + j]) & ~atomicLoad(&bits[x * W + j]);   // at u, not yet at x
            if (mask == 0u) { continue; }
            let fresh = mask & ~atomicOr(&bits[x * W + j], mask);    // the claims this invocation won
            if (fresh == 0u) { continue; }
            if (atomicOr(&bits[nextBase + x * W + j], fresh) == 0u) {
                arcs = arcs + (rowPtr[x + 1u] - rowPtr[x]);
            }
            record(j, x, fresh, dist);
        }
    }
    if (arcs > P.pullAt) {
        atomicStore(&wover, 1u);
    } else if (arcs != 0u) {
        let before = atomicAdd(&warcs, arcs);
        if (before + arcs > P.pullAt || before + arcs < before) { atomicStore(&wover, 1u); }
    }
    workgroupBarrier();
    let row = P.row * 32u * W;
    for (var k = lid.x; k < 32u * W; k = k + WG) {                   // ONE global atomic per source lane per workgroup
        let c = atomicLoad(&tally[k]);
        if (c != 0u) {
            atomicAdd(&table[row + k], c);
            atomicStore(&wany, 1u);
        }
    }
    workgroupBarrier();
    if (lid.x == 0u) {
        if (atomicLoad(&wany) != 0u) { atomicStore(&table[cur], 1u); }
        if (atomicLoad(&wover) != 0u) {
            atomicStore(&table[cur + 2u], 1u);
        } else {
            add_arcs(cur, atomicLoad(&warcs));
        }
    }
}
`,
    rl = `
var<workgroup> partial: array<u32, WG>;

@compute @workgroup_size(WG)
fn closeness_rowsum(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let row = group_id(wid);                                         // uniform: one workgroup per row
    if (row >= P.n) { return; }
    var whole = 0u;
    var real = 0.0;
    for (var c = lid.x; c < P.n; c = c + WG) {
        let d = dist[row * P.n + c];
        if (c == row || bitcast<u32>(d) == F32_INF_BITS) { continue; }
        if (P.role == 0u) {
            whole = whole + u32(d);
        } else if (P.role == 1u) {
            real = real + d;
        } else if (d > 0.0) {
            real = real + 1.0 / d;                                    // a zero distance adds nothing, as on the CPU
        }
    }
    partial[lid.x] = select(whole, bitcast<u32>(real), P.role != 0u);
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        workgroupBarrier();
        if (lid.x < s) {
            let a = partial[lid.x];
            let b = partial[lid.x + s];
            partial[lid.x] = select(a + b, bitcast<u32>(bitcast<f32>(a) + bitcast<f32>(b)), P.role != 0u);
        }
    }
    if (lid.x == 0u) { out[row] = partial[0]; }
}
`,
    sl = `
@compute @workgroup_size(WG)
fn compact_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i == 0u) { outCount[P.outIndex] = offsets[P.count - 1u] + flags[P.count - 1u]; }   // the exclusive scan's total; the planner never dispatches for count 0
    if (i >= P.count) { return; }                                                          // no barrier follows
    if (flags[i] != 0u) { out[offsets[i]] = queue[i]; }
}
`,
    il = `
@compute @workgroup_size(WG)
fn coo_emit(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    var a = i;
    if (INDEXED) { a = order[i]; }                                 // the arc this position takes
    let e = a / 2u;                                                // arc 2e is edge e as declared, arc 2e + 1 its reverse
    let forward = (a % 2u) == 0u;
    let u = edgeSrc[e];
    let v = edgeDst[e];
    var w = 1.0;
    if (WEIGHTED) { w = edgeWeight[e]; }
    if (u == v) {                                                  // a self-loop is dropped: both arcs sort last and never open a run
        outSrc[i] = INVALID_INDEX;
        outDst[i] = INVALID_INDEX;
        outWeight[i] = 0.0;
        return;
    }
    outSrc[i] = select(v, u, forward);
    outDst[i] = select(u, v, forward);
    outWeight[i] = w;
}
`,
    nl = `
@compute @workgroup_size(WG)
fn coo_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let s = src[i];
    var slot = 0u;
    if (SORTED_INPUT) {
        if (i > 0u && s < src[i - 1u]) { atomicStore(&cursors[0], 1u); }   // unsorted input: the flag the driver refuses
        let within = i - rowPtr[s];                                // the arc's place in its row
        slot = rowPtr[s] + within;
    } else {
        slot = rowPtr[s] + atomicAdd(&cursors[s], 1u);             // race order: the row is not sorted in this mode
    }
    colIdx[slot] = dst[i];
    if (WEIGHTED) { outWeight[slot] = weight[i]; }
}
`,
    ol = `
@compute @workgroup_size(WG)
fn counting_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    let slot = atomicAdd(&cursor[k], 1u);                          // the per-bin cursor (6 row 5)
    outIndex[start[k] + slot] = i;
}
`,
    al = `
@compute @workgroup_size(WG)
fn dedupe_claim(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    var count = P.count;
    if (P.countIndex != U32_MAX) { count = min(atomicLoad(&counters[P.countIndex]), P.count); }   // a device-side count, clamped to the capacity
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {   // grid-stride; no barrier anywhere
        atomicStore(&owner[queue[i]], i);
    }
}
`,
    cl = `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;
var<workgroup> wcount: u32;

@compute @workgroup_size(WG)
fn dedupe_filter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) {
        var count = P.count;
        if (P.countIndex != U32_MAX) { count = min(atomicLoad(&outCount[P.countIndex]), P.count); }   // the same count source as the claim
        wcount = count;
    }
    let count = workgroupUniformLoad(&wcount);                                            // uniform: the block loop below holds barriers
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {                  // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var keep = 0u;
        var v = 0u;
        if (i < count) { v = queue[i]; keep = select(0u, 1u, atomicLoad(&owner[v]) == i); }   // guarded work into locals
        sh[lid.x] = keep;
        workgroupBarrier();                                                                   // every lane, unconditionally (3.5 rule 1)
        for (var s = 1u; s < WG; s = s * 2u) {                                                // Hillis-Steele inclusive scan of keep
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let inclusive = sh[lid.x];
        if (lid.x == WG - 1u) { base = atomicAdd(&outCount[P.outIndex], inclusive); }         // ONE atomic per workgroup: the block's aggregate
        workgroupBarrier();
        if (keep == 1u) { out[base + inclusive - 1u] = v; }
        workgroupBarrier();                                                                   // sh and base are reused by the next block
    }
}
`,
    ll = `
@compute @workgroup_size(WG)
fn degree(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let row = linear_id(wid, lid.x) + P.start;
    if (row >= P.end) { return; }
    let i = select(row, perm[row], USE_PERM);
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var d = 0u;
    for (var arc = a0; arc < a1; arc = arc + 1u) {
        let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2); never use it as an identifier
        d = d + select(0u, 1u, nbr < P.n);
    }
    out[i] = select(d, out[i] + d, P.accumulate == 1u);
}
`,
    ul = `fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_force(i: u32, lane: u32, step: u32) -> vec3f {           // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd) (4.2)
    let pi = pos[i];                                           // xyz + mass in one load (D23)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var f = vec3f(0.0);
    for (var a = a0 + lane; a < a1; a = a + step) {
        let j = colIdx[a - P.arcBase];
        if (j == i) { continue; }                              // a self-loop exerts no force
        var w = 1.0;
        if (HAS_WEIGHTS) { w = weights[a - P.arcBase]; }
        let d = pos[j].xyz - pi.xyz;                           // toward j
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { w = length(d) / P.frK; }              // LAW 1 (FR, 7.20): |F| = d^2 / k along d / d, unfloored; the linear select below applies w as is
        if (LAW == 2u) { w = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring, ngraph generateCreateSpringForce.js:33-36): Hooke k_s (d - L) toward j
        let mag = select(w, w * log(1.0 + len) / len, LINLOG); // linear: |F| = w len; linlog: |F| = w log(1 + len)
        f = f + d * mag;
    }
    return f;
}
fn row_force_dense(i: u32) -> vec3f {                          // TIER 0's stride-one twin of row_force (see the header)
    let pi = pos[i];
    let lo = max(rowPtr[i], P.arcBase);
    let hi = min(rowPtr[i + 1u], P.arcEnd);
    var total = vec3f(0.0);
    for (var left = select(0u, hi - lo, hi > lo); left > 0u; left = left - 1u) {   // counts DOWN (see the header)
        let arc = hi - left;                                   // lo, lo + 1, ..., hi - 1
        let k = arc - P.arcBase;                               // the window-local index; this walk is contiguous
        let nbr = colIdx[k];
        if (nbr == i) { continue; }                            // a self-loop exerts no force
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[k]; }
        let d = pos[nbr].xyz - pi.xyz;                         // toward the neighbour
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { weight = length(d) / P.frK; }         // LAW 1 (FR, 7.20), as in row_force
        if (LAW == 2u) { weight = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring), as in row_force
        let mag = select(weight, weight * log(1.0 + len) / len, LINLOG);
        total = total + d * mag;
    }
    return total;
}
fn finish(i: u32, f0: vec3f) {
    var f = f0;
    if (DISTRIBUTED) { f = f / pos[i].w; }
    if (P.accumulate == 1u) { f = f + load_force(i); }         // the windowed loop of 4.2 (arcBase != 0 dispatches after the first)
    store_force(i, f);                                         // overwrites: attraction is the first writer of force each iteration
}
fn tier0(wid: vec3<u32>, lane: u32) {                          // TIER 0: one row per thread over [tierStart, tierEnd); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.tierStart;
    if (row >= P.tierEnd) { return; }
    let i = row_node(row);
    finish(i, row_force_dense(i));
}

var<workgroup> sh: array<vec3f, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                          // TIER 1: 32 lanes per row over [hiEnd, midEnd); TIER 2: WG lanes per row over [0, hiEnd) (PD-6, PD-7)
    let g = group_id(wid);
    var row = g;
    var end = P.hiEnd;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.hiEnd + g * (WG / 32u) + lid / 32u; end = P.midEnd; lane = lid % 32u; step = 32u; }
    let valid = row < end;
    var i = 0u;
    var f = vec3f(0.0);
    if (valid) { i = row_node(row); f = row_force(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = f;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = vec3f(0.0);
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(i, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_vec4(vec4f(f, 0.0), lid, 0u);
        if (valid && lid == 0u) { finish(i, t.xyz); }
    }
}

@compute @workgroup_size(WG)
fn attraction(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}`,
    dl = `fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn store_old(i: u32, f: vec3f) {
    oldForce[3u * i] = f.x;
    oldForce[3u * i + 1u] = f.y;
    oldForce[3u * i + 2u] = f.z;
}

@compute @workgroup_size(WG)
fn integrate(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    var dp = vec3f(0.0);
    var p = vec4f(0.0);
    var free = false;
    var valid = false;
    var ke = 0.0;
    if (i < P.n) {
        valid = true;
        let f = load_force(i);
        p = pos[i];
        var swing_i = p.w * length(f);                                     // SWING_MODE 1: NetworkX's local swinging m |F| (layout.py line 1497)
        if (SWING_MODE == 0u) { swing_i = p.w * length(f - load_old(i)); }  // paper: m |F(t) - F(t-1)|, recomputed inline (7.2)
        let factor = S.speed / (1.0 + sqrt(S.speed * swing_i));
        let fixed = mask_bit(fixedMask[i >> 5u], i);
        dp = select(f * factor, vec3f(0.0), fixed);                        // APPLY 0 (FA2): no clamp on dp (D25)
        if (APPLY == 1u) {                                                  // APPLY 1 (FR, 7.20): move along F by min(|F|, t); a fixed node stays
            let mag = length(f);
            let t = select(P.temperature, S.temperature, (P.flags & FA2_FLAG_ADAPTIVE) != 0u);   // adaptive cooling: K1's state temperature
            dp = vec3f(0.0);
            if (mag > 0.0 && !fixed) { dp = f * (min(mag, t) / mag); }
            ke = select(0.0, dot(f, f), !fixed);                              // the force energy of Hu's step control, folded like the spring preset's kinetic energy
        }
        if (APPLY == 2u) {                                                  // APPLY 2 (spring-electrical): ngraph's Euler step over the velocity in the oldForce slot (PD-2)
            var v = load_old(i);
            let fd = f - P.dragCoefficient * v;                             // drag (generateCreateDragForce.js:18)
            v = v + (P.timeStep / p.w) * fd;                                 // v += (dt / m) F (generateIntegrator.js:27-29)
            let sp = length(v);
            if (sp > 1.0) { v = v / sp; }                                     // the unit speed clamp (generateIntegrator.js:33-37)
            if (P.dim == 2u) { v.z = 0.0; }
            dp = select(P.timeStep * v, vec3f(0.0), fixed);                  // dp = dt v; a pinned body is skipped (generateIntegrator.js:21, 39-41)
            if (!fixed) { store_old(i, v); }
            ke = select(0.0, 0.5 * p.w * dot(v, v), !fixed);                 // partials B under APPLY 2 (PD-4)
        }
        if (P.dim == 2u) { dp.z = 0.0; }                                   // 2D never integrates z (7.13)
        p = vec4f(p.xyz + dp, p.w);
        pos[i] = p;
        if (SWING_MODE == 0u) { store_old(i, f); }                         // fixed nodes too, so a later unpin sees no stale swing (7.11)
        free = !fixed;
    }
    // uniform control flow from here (3.5 rule 1): partials A (sum p, sum |p - c|^2, min, max over valid rows) and C (sum |dp|, free count)
    let c = S.centroid.xyz;
    var sumv = vec4f(0.0);
    var lo = vec4f(F32_MAX);
    var hi = vec4f(-F32_MAX);
    var dl = 0.0;
    var fr = 0u;
    if (valid) {
        let q = p.xyz - c;
        sumv = vec4f(p.xyz, dot(q, q));
        lo = vec4f(p.xyz, 0.0);
        hi = vec4f(p.xyz, dot(q, q));                                  // max.w carries max |p - c|^2 so K1 can write the exact layoutRadius (spec 3.3)
    }
    if (free) { dl = length(dp); fr = 1u; }
    let tSum = wg_reduce_vec4(sumv, lid.x, 0u);
    let tLo = wg_reduce_vec4(lo, lid.x, 1u);
    let tHi = wg_reduce_vec4(hi, lid.x, 2u);
    let tDl = wg_reduce_f32(dl, lid.x, 0u);
    let tFr = wg_reduce_u32(fr, lid.x, 0u);
    let tKe = wg_reduce_f32(ke, lid.x, 0u);
    if (lid.x == 0u) {
        let g = group_id(wid);
        partials[g].sum = tSum;
        partials[g].min = tLo;
        partials[g].max = tHi;
        partials[g].dispFree = vec2f(tDl, f32(tFr));
        if (APPLY != 0u) { partials[g].swingTraction = vec2f(tKe, 0.0); }   // overwrites K3's epilogue: K4 never runs under FR or the preset (PD-4)
    }
}`,
    fl = `
var<workgroup> tile: array<vec4f, WG>;                         // xyz + mass, 4 KiB at WG = 256

fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
fn gravity_force(pi: vec4f) -> vec3f {                         // spec 7.9: centroid (GRAVITY_CENTER 0) or origin (1); regular or strong
    var q = pi.xyz;
    if (GRAVITY_CENTER == 0u) { q = pi.xyz - S.centroid.xyz; }
    if (STRONG_GRAVITY) { return -P.gravity * pi.w * q; }
    let d = length(q);
    if (d > FA2_DIST_FLOOR) { return -P.gravity * pi.w * q / d; }
    return vec3f(0.0);
}

@compute @workgroup_size(WG)
fn repulsion(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(local_invocation_id) lid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
) {
    // issue #87: pass p of the tile range is dispatched with p + 1 z slices; only the last slice works, so the pass
    // index needs no uniform. Uniform: keyed on workgroup_id and num_workgroups only.
    if (wid.z + 1u < nwg.z) { return; }
    let i = linear_id(wid, lid.x);
    let valid = i < P.n;
    var pi = vec4f(0.0);
    if (valid) { pi = pos[i]; }
    var f = vec3f(0.0);
    let tiles = (P.n + WG - 1u) / WG;
    let tileBegin = (nwg.z - 1u) * EXACT_TILES_PER_PASS;
    let tileEnd = min(tiles, tileBegin + EXACT_TILES_PER_PASS);
    for (var t = tileBegin; t < tileEnd; t = t + 1u) {
        let j = t * WG + lid.x;
        if (j < P.n) { tile[lid.x] = pos[j]; } else { tile[lid.x] = vec4f(0.0); }   // guarded fill; mass 0 marks the pad
        workgroupBarrier();                                                       // uniform: every invocation reaches it
        for (var s = 0u; s < WG; s = s + 1u) {
            let o = tile[s];
            let jj = t * WG + s;
            if (o.w > 0.0 && jj != i) {                                           // mass > 0 for every real node, 0 for the pad
                let d = pi.xyz - o.xyz;
                var d2 = dot(d, d);
                if (d2 < FA2_COINCIDENT_SQ) {                                     // coincident: antisymmetric unit kick of the law's magnitude at d = 0.01 (7.2; PD-10)
                    f = f + kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w);
                    continue;
                }
                if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }               // FA2 alone floors d >= 0.01 (7.2); FR and coulomb are unfloored (7.20)
                let k = P.scalingRatio * pi.w * o.w;
                if (LAW == 0u) { f = f + d * (k / d2); }                          // LAW 0 (FA2): |F| = k m_i m_j / d along d / d
                if (LAW == 1u) { f = f + d * (P.frK * P.frK / d2); }              // LAW 1 (FR, 7.20): |F| = k^2 / d, mass ignored
                if (LAW == 2u) { f = f + d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }   // LAW 2 (coulomb, ngraph generateQuadTree.js:131-132): |F| = -g m_i m_j / d^2
            }
        }
        workgroupBarrier();
    }
    if (tileEnd < tiles) {                                                        // an earlier pass: its partial sum only (uniform: P.n, nwg)
        if (valid) { store_force(i, load_force(i) + f); }
        return;
    }
    // epilogue (7.9, 7.10): gravity and force += under the guard, the swing / traction reduction outside it
    var sw = 0.0;
    var tr = 0.0;
    if (valid) {
        f = f + gravity_force(pi);
        let fnew = load_force(i) + f;
        store_force(i, fnew);
        if (SWING_MODE == 1u) {                                                   // NetworkX: positions and forces mixed, every node (7.2)
            sw = pi.w * length(pi.xyz - fnew);
            tr = 0.5 * pi.w * length(pi.xyz + fnew);
        } else if (!mask_bit(fixedMask[i >> 5u], i)) {                            // paper: free nodes only (Gephi ForceAtlas2.java 283-293)
            let fold = load_old(i);
            sw = pi.w * length(fnew - fold);
            tr = 0.5 * pi.w * length(fnew + fold);
        }
    }
    let t = wg_reduce_vec4(vec4f(sw, tr, 0.0, 0.0), lid.x, 0u);                   // uniform control flow: 256 -> 1
    if (lid.x == 0u) { partials[group_id(wid)].swingTraction = t.xy; }
}
`,
    hl = `
@compute @workgroup_size(WG)
fn speed_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    let groups = (P.n + WG - 1u) / WG;
    var st = vec2f(0.0);
    for (var g = lid.x; g < groups; g = g + WG) { st = st + partials[g].swingTraction; }   // sequential per lane: deterministic
    let t = wg_reduce_vec4(vec4f(st, 0.0, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        var swing = t.x;
        var traction = t.y;
        if (SWING_MODE == 1u) { swing = S.swing + t.x; traction = S.traction + t.y; }   // NetworkX accumulates across iterations from 1
        let n = f32(P.n);
        let optJitter = 0.05 * sqrt(n);
        let minJitter = sqrt(optJitter);
        let maxJitter = 10.0;
        let tr = max(traction, 1.0e-30);                                             // guards the division only (7.10)
        let other = min(maxJitter, optJitter * traction / (n * n));
        var jitter = P.jitterTolerance * max(minJitter, other);
        var eff = S.speedEfficiency;
        if (swing > 2.0 * tr) {                                                      // swing / traction > 2 in the exact form (contract 4.5 CONTRACT DECISION K4-1: 2 x is exact, a WGSL f32 division is not)
            if (eff > 0.05) { eff = eff * 0.5; }                                     // the CPU's conditional multiply (7.2)
            jitter = max(jitter, P.jitterTolerance);
        }
        let targetSpeed = select(jitter * eff * traction / swing, 1.0e30, swing == 0.0);  // +Inf in the port; 1e30 gives the same min() below (\`target\` is reserved)
        if (swing > jitter * traction) {
            if (eff > 0.05) { eff = eff * 0.7; }
        } else if (S.speed < 1000.0) {
            eff = eff * 1.3;
        }
        S.speed = S.speed + min(targetSpeed - S.speed, 0.5 * S.speed);
        S.speedEfficiency = eff;
        S.swing = swing;
        S.traction = traction;
        T[P.iterationIndex].swing = swing;
        T[P.iterationIndex].traction = traction;
        T[P.iterationIndex].speed = S.speed;
        T[P.iterationIndex].speedEfficiency = eff;
    }
}
`,
    pl = `// K1: folds the previous integrate's partials into the state block (spec 7.4); one workgroup
@compute @workgroup_size(WG)
fn stats_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    let groups = (P.n + WG - 1u) / WG;
    let fold = (P.flags & FA2_FLAG_FIRST) == 0u;    // the first iteration after load() keeps the host-written state
    var sum = vec4f(0.0);
    var lo = vec4f(F32_MAX);
    var hi = vec4f(-F32_MAX);
    var disp = 0.0;
    var free = 0u;
    var ke = 0.0;
    if (fold) {
        for (var g = lid.x; g < groups; g = g + WG) {   // sequential per lane in index order: deterministic
            let q = partials[g];
            sum = sum + q.sum;
            lo = min(lo, q.min);
            hi = max(hi, q.max);
            disp = disp + q.dispFree.x;
            free = free + u32(q.dispFree.y);
            ke = ke + q.swingTraction.x;
        }
    }
    let tSum = wg_reduce_vec4(sum, lid.x, 0u);
    let tLo = wg_reduce_vec4(lo, lid.x, 1u);
    let tHi = wg_reduce_vec4(hi, lid.x, 2u);
    let tDisp = wg_reduce_f32(disp, lid.x, 0u);
    let tFree = wg_reduce_u32(free, lid.x, 0u);
    let tKe = wg_reduce_f32(ke, lid.x, 0u);
    if (lid.x == 0u) {
        if (fold) {
            let n = f32(P.n);
            let c = tSum.xyz / n;
            S.centroid = vec4f(c, 0.0);
            S.rmsRadius = sqrt(max(tSum.w, 0.0) / n);                  // RMS radius about the previous centroid (7.17)
            S.min = vec4f(tLo.xyz, 0.0);
            S.max = vec4f(tHi.xyz, 0.0);
            S.radius = sqrt(max(tHi.w, 0.0));                          // max |p - centroid| about the same previous centroid as rmsRadius (K5 puts |q|^2 in max.w)
            let meanDisp = select(tDisp / f32(tFree), 0.0, tFree == 0u);  // all-fixed: 0, never NaN (7.4)
            S.meanDisplacement = meanDisp;
            S.settledCount = select(0u, S.settledCount + 1u, meanDisp <= min(P.settleThreshold * S.rmsRadius, P.settleFloor));   // relative AND absolute (issue #97)
        }
        S.iteration = S.iteration + 1u;
        T[P.iterationIndex].meanDisplacement = S.meanDisplacement;
        T[P.iterationIndex].settledCount = S.settledCount;
        T[P.iterationIndex].iteration = S.iteration;
        if (P.gridMax > 0u) {                                      // the grid tier (7.7): the robust extent, the cell size, eps, last iteration's counts, the hub counter reset (PD-14)
            let cells = P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u);
            if (fold) {
                let box = (S.max.xyz - S.min.xyz) * GRID_BBOX_MARGIN;
                var bboxExtent = max(box.x, box.y);
                if (P.dim == 3u) { bboxExtent = max(bboxExtent, box.z); }
                let extent = max(min(bboxExtent, P.extentFactor * S.rmsRadius), GRID_EXTENT_FLOOR);   // min(bbox, extentFactor x rms), floored (7.7)
                let cellSize = extent / f32(P.gridMax);
                S.gridMin = vec4f(S.centroid.xyz - vec3f(0.5 * extent), cellSize);   // gridMin.w carries cellSize
                S.invCellSize = 1.0 / cellSize;
                S.eps = 0.25 * cellSize;
            }
            var outside = 0u;                                        // the previous iteration's pseudo-cell counts, one per orthant (issue #90; 0 after load)
            for (var o = 0u; o < select(4u, 8u, P.dim == 3u); o = o + 1u) { outside = outside + cellHist[cells + o]; }
            S.outsideGrid = outside;
            S.maxCellOccupancy = atomicLoad(&hubCounters[1]);
            atomicStore(&hubCounters[0], 0u);
            atomicStore(&hubCounters[1], 0u);
        }
        if (STATS_MODE == 1u) {                                    // FR: this iteration's temperature (7.20) into the state and the trace
            if ((P.flags & FA2_FLAG_ADAPTIVE) != 0u) {                // adaptive cooling (Yifan Hu 2005 3.2): tKe is the previous iteration's sum |F|^2 over free nodes
                if (fold) {
                    var t = S.temperature;
                    if (tKe < S.frEnergy) {
                        S.frProgress = S.frProgress + 1u;
                        if (S.frProgress >= FR_COOLING_PATIENCE) { S.frProgress = 0u; t = t / FR_COOLING_STEP; }
                    } else {
                        S.frProgress = 0u;
                        t = t * FR_COOLING_STEP;
                    }
                    S.frEnergy = tKe;
                    S.temperature = t;
                }
            } else {
                S.temperature = P.temperature;
            }
            T[P.iterationIndex].modelScalar = S.temperature;
        }
        if (STATS_MODE == 2u) {                                    // spring-electrical: the kinetic energy K5 folded into partials B (PD-4); 0 on the first iteration after load()
            S.kineticEnergy = tKe;
            T[P.iterationIndex].modelScalar = tKe;
        }
    }
}`,
    gl = `@compute @workgroup_size(WG)
fn to_scene(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }
    let s = pos[i].xyz * P.scale + P.center.xyz;
    scene[3u * i] = s.x;
    scene[3u * i + 1u] = s.y;
    scene[3u * i + 2u] = select(s.z, P.center.z, P.dim == 2u);       // 2D writes z = center.z on every readback (7.13)
}`,
    ml = `
@compute @workgroup_size(WG)
fn fill(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }
    dst[i] = select(P.value, i + P.value, P.mode == 1u);
}
`,
    wl = `
@compute @workgroup_size(WG)
fn frontier_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                       // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 0u) {                                                // the level boundary
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op level the host recorded past the end
            atomicStore(&counters[24], 0u);                            // the path word is the only word that moves (P8-T6's levels formula reads the rest)
            return;
        }
        let finished = atomicLoad(&counters[0]);
        let next = atomicLoad(&counters[1]);
        let degSum = atomicLoad(&counters[2]);
        let nextDeg = atomicLoad(&counters[25]);                       // deg(F_b), summed by bfs-next-degree when F_b was claimed (issue #391)
        atomicStore(&counters[3], finished);                           // prevFrontierCount
        atomicStore(&counters[4], degSum);                             // prevDegreeSum
        atomicStore(&counters[0], next);                               // the rotation
        atomicStore(&counters[1], 0u);
        atomicStore(&counters[2], 0u);
        atomicStore(&counters[25], 0u);                                // the next level's claims sum from 0
        atomicStore(&counters[8], 0u);                                 // edgeCount
        atomicStore(&counters[9], 0u);                                 // edgeCountUnclamped
        atomicStore(&counters[12], atomicLoad(&counters[12]) + next);  // visitedCount
        if (P.firstOfSubmit >= 1u) {                                   // b = the boundary's index inside its submit, clamped (P8-T8, PD-18): F_b was inside the submit's rebuilt sums iff b >= 1
            atomicStore(&counters[5], atomicLoad(&counters[5]) - next);       // unvisitedCount, exact (bfs-next-degree keeps unvisitedDegreeSum exact)
        }
        let level = atomicLoad(&counters[11]) + 1u;                    // the seed is U32_MAX, so the first boundary lands on 0
        atomicStore(&counters[11], level);
        let done = (next == 0u) || (level >= P.maxDepth);
        atomicStore(&counters[15], select(0u, 1u, done));
        var direction = atomicLoad(&counters[14]);
        if (P.mode == 1u) {
            direction = 0u;                                                 // top-down only (the test seam)
        } else if (direction == 0u) {
            let bottomUpReads = select(max(atomicLoad(&counters[5]), atomicLoad(&counters[6]) / P.alpha), 0u, P.mode == 2u);   // what a sweep is expected to read: at least one in-arc per unvisited vertex (issue #1358); mode 2 (the test seam) forces the switch
            if (nextDeg > bottomUpReads && next > finished) { direction = 1u; }   // m_f > the sweep's reads and growing, m_f the degree of the frontier about to be expanded
        } else {
            if (next * P.beta < atomicLoad(&counters[5]) && next < finished) { direction = 0u; }      // next * beta < unvisited and shrinking
        }
        if (direction != atomicLoad(&counters[14])) { atomicStore(&counters[13], atomicLoad(&counters[13]) + 1u); }   // switches
        var path = 0u;                                                 // word 24: what the level's kernels run (0 nothing, 1 two-phase, 2 fused, 3 bottom-up; role 1 writes 4 for the retry)
        if (done) {
            path = 0u;
        } else if (direction == 1u) {                                  // the bottom-up level (P8-T8): the bits fill, the bitset build, the sweep
            path = 3u;
            atomicStore(&counters[19], atomicLoad(&counters[19]) + 1u);
        } else if (next < P.fusedMax) {                                // P8-T7 makes this branch reachable (fusedMax is 0 until then)
            path = 2u;                                                 // bfs-fused: one WORKGROUP per frontier entry
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            path = 1u;                                                 // advance-expand, then role 1 and bfs-contract
        }
        atomicStore(&counters[14], direction);
        atomicStore(&counters[24], path);
    } else if (P.role == 1u) {                                         // the edge queue is filled
        if (atomicLoad(&counters[24]) != 1u) {                         // role 0 did not choose the two-phase path (done, fused or bottom-up): nothing to clamp, nothing to count
            return;
        }
        let clamped = min(atomicLoad(&counters[8]), P.edgeCapacity);
        atomicStore(&counters[8], clamped);
        if (atomicLoad(&counters[9]) > P.edgeCapacity) {               // PD-23: the fused retry
            atomicStore(&counters[24], 4u);                            // the path word: bfs-fused runs the retry over frontierCount, bfs-contract nothing
            atomicStore(&counters[10], atomicLoad(&counters[10]) + 1u);
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            atomicStore(&counters[18], atomicLoad(&counters[18]) + 1u);   // twoPhaseLevels counts the CHOICE role 0 made, even for zero edges (P8-T7 Step 4's invariant)
        }
    } else if (P.role == 2u) {                                         // the SSSP round boundary (P8-T9, PD-20): which pile this round relaxes
        atomicStore(&counters[8], 0u);                                 // the dedupe counts (words 8 and 9, the SSSP sense) and the path word: nothing unless a pile is chosen below
        atomicStore(&counters[9], 0u);
        atomicStore(&counters[24], 0u);
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op round the host recorded past the end (rule 1)
            return;
        }
        let nearRaw = atomicLoad(&counters[1]);                        // the raw near half's appends, unclamped
        let farRaw = atomicLoad(&counters[21]);                        // the raw far half's appends, unclamped
        if (nearRaw > P.edgeCapacity || farRaw > P.edgeCapacity) {     // a pile overflowed its half: the host raises E_TOO_LARGE
            atomicStore(&counters[15], 2u);
            return;
        }
        if (nearRaw != 0u) {                                           // a near round: dedupe the near half into nearIn
            atomicStore(&counters[0], 0u);                             // the deduped near count, accumulated by dedupe-filter
            atomicStore(&counters[14], 0u);                            // mode 0
            atomicStore(&counters[8], nearRaw);                        // the near dedupe's count word (dedupe-claim, dedupe-filter over the near half)
            atomicStore(&counters[24], 5u);                            // the path word: sssp-relax role 0 runs, role 1 nothing
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);   // rounds dispatched (the done boundary is not counted)
        } else if (farRaw != 0u) {                                     // the near pile is empty: raise the threshold and re-bucket the far pile
            let threshold = bitcast<f32>(atomicLoad(&counters[22]));
            let raised = threshold + bitcast<f32>(atomicLoad(&counters[23]));   // ONE f32 add on the bit patterns (PD-9)
            if (raised == threshold) {                                 // the delta is below the threshold's ulp: the host raises E_UNSUPPORTED
                atomicStore(&counters[15], 3u);
                return;
            }
            atomicStore(&counters[4], atomicLoad(&counters[22]));      // prevThresholdBits: what the pass-through drops below
            atomicStore(&counters[22], bitcast<u32>(raised));
            atomicStore(&counters[20], 0u);                            // the deduped far count, accumulated by dedupe-filter
            atomicStore(&counters[14], 1u);                            // mode 1
            atomicStore(&counters[9], farRaw);                         // the far dedupe's count word (dedupe-claim, dedupe-filter over the far half)
            atomicStore(&counters[24], 6u);                            // the path word: sssp-relax role 1 runs, role 0 nothing
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);
        } else {                                                       // both piles empty: finished
            atomicStore(&counters[15], 1u);
        }
    } else if (P.role == 3u) {                                         // the piles are deduped: restart the raw half the round consumed
        if (atomicLoad(&counters[15]) != 0u) { return; }               // role 2 chose no pile this round
        if (atomicLoad(&counters[14]) == 0u) {
            atomicStore(&counters[1], 0u);                             // the raw near half restarts (sssp-relax role 0 sizes itself from word 0)
        } else {
            atomicStore(&counters[21], 0u);                            // the raw far half restarts (the pass-through re-appends what stays far; role 1 sizes itself from word 20)
        }
    }
}
`,
    bl = `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_cell_key(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    let cells = grid_cells();
    let gf = f32(P.gridMax);
    let q = (pos[i].xyz - S.gridMin.xyz) * S.invCellSize;          // PD-10: never a division
    let c = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    let g = i32(P.gridMax);
    var inside = c.x >= 0 && c.x < g && c.y >= 0 && c.y < g;
    if (P.dim == 3u) { inside = inside && c.z >= 0 && c.z < g; }
    var key = cells + select(0u, 1u, c.x >= g / 2) + select(0u, 2u, c.y >= g / 2);   // an outside pseudo-cell: its orthant (issue #90)
    if (P.dim == 3u) { key = key + select(0u, 4u, c.z >= g / 2); }
    if (inside) {
        key = u32(c.x) + P.gridMax * u32(c.y);
        if (P.dim == 3u) { key = key + P.gridMax * P.gridMax * u32(c.z); }
    }
    cellKey[i] = key;
    cellVal[i] = i;
}
`,
    vl = `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_centroid(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let c = linear_id(wid, lid.x);
    if (c >= grid_cells() + select(4u, 8u, P.dim == 3u)) { return; }   // cells [0, cells + 2^dim): the pseudo-cells follow the real ones; no barrier follows
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    atomicMax(&hubCounters[1], count);                             // maxCellOccupancy, read by K1 next iteration
    if (count > GRID_HUB_CELL) {                                   // a hub cell: G4b sums it (PD-13)
        hubList[atomicAdd(&hubCounters[0], 1u)] = c;
        return;
    }
    var acc = vec4f(0.0);
    for (var k = start; k < start + count; k = k + 1u) {           // sorted order: deterministic
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);                       // (sum m x, sum m y, sum m z, sum m)
    }
    pyramid[c] = acc;
}
`,
    yl = `
@compute @workgroup_size(WG)
fn grid_centroid_hub(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let h = group_id(wid);
    let valid = h < hubCount[0];                                   // a workgroup past the count sums nothing
    var c = 0u;
    var start = 0u;
    var count = 0u;
    if (valid) {
        c = hubList[h];
        start = cellStart[c];
        count = cellStart[c + 1u] - start;
    }
    var acc = vec4f(0.0);
    for (var k = start + lid.x; k < start + count; k = k + WG) {   // strided over the cell's sorted range
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);
    }
    let t = wg_reduce_vec4(acc, lid.x, 0u);                        // uniform control flow: 256 -> 1
    if (valid && lid.x == 0u) { pyramid[c] = t; }
}
`,
    _l = `
@compute @workgroup_size(WG)
fn grid_downsample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let pc = linear_id(wid, lid.x);                                // the parent cell inside its level
    if (pc >= P.parentCells) { return; }                           // no barrier follows
    let side = P.parentSide;
    let cs = 2u * side;                                            // the child level's side
    let px = pc % side;
    let py = (pc / side) % side;
    let pz = pc / (side * side);
    var acc = vec4f(0.0);
    for (var dz = 0u; dz < P.depth; dz = dz + 1u) {
        for (var dy = 0u; dy < 2u; dy = dy + 1u) {
            for (var dx = 0u; dx < 2u; dx = dx + 1u) {
                let child = (2u * px + dx) + cs * ((2u * py + dy) + cs * (2u * pz + dz));
                acc = acc + pyramid[P.childBase + child];
            }
        }
    }
    pyramid[P.parentBase + pc] = acc;
}
`,
    Pl = `
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }
fn grid_side(level: u32) -> u32 { return P.gridMax >> level; }
fn outside_cells() -> u32 { return select(4u, 8u, P.dim == 3u); }   // one pseudo-cell per orthant (issue #90)
fn level_base(level: u32) -> u32 {                             // the pyramid index of level L's cell 0 (level 0 carries the pseudo-cells at cells ..)
    var base = 0u;
    for (var l = 0u; l < level; l = l + 1u) {
        let s = grid_side(l);
        base = base + s * s * select(1u, s, P.dim == 3u) + select(0u, outside_cells(), l == 0u);
    }
    return base;
}
fn cell_at(level: u32, cx: i32, cy: i32, cz: i32) -> u32 {
    let s = grid_side(level);
    return level_base(level) + u32(cx) + s * (u32(cy) + select(0u, s * u32(cz), P.dim == 3u));
}
fn cell_force(pi: vec4f, q: vec4f) -> vec3f {                  // one far-field term, softened by state.eps (7.7)
    if (q.w <= 0.0) { return vec3f(0.0); }                     // an empty cell
    let d = pi.xyz - q.xyz / q.w;                              // to the mass-weighted centroid
    var d2 = dot(d, d);
    if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }        // FA2 alone floors d >= 0.01, as K3 and G7 do (issue #89); FR and coulomb are unfloored (7.20)
    d2 = d2 + S.eps * S.eps;
    if (LAW == 1u) { return d * (P.frK * P.frK * q.w / d2); }                       // LAW 1 (FR, 7.20): k^2 / d per node, q.w nodes at the centroid
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * q.w / (d2 * sqrt(d2))); }     // LAW 2 (coulomb): -g m_i M_cell / d^2
    return d * (P.scalingRatio * pi.w * q.w / d2);             // LAW 0 (FA2): |F| = k m_i M_cell / d
}

@compute @workgroup_size(WG)
fn grid_far_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    if (t >= P.n) { return; }                                      // no barrier follows
    let i = sortedIdx[t];                                          // sorted order (D24)
    let pi = pos[i];
    let gf = f32(P.gridMax);
    let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;              // PD-10
    var c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    if (P.dim == 2u) { c0.z = 0; }                                 // 2D: one z plane; the loops below visit cz = 0 only, so the 3x3 test must see cz - 0
    let g = i32(P.gridMax);
    var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
    if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
    let top = P.levels - 1u;
    let ts = i32(grid_side(top));                                  // the coarsest side (4)
    let zTop = select(0, ts - 1, P.dim == 3u);                     // z ranges: one plane in 2D
    var f = vec3f(0.0);
    if (inside) {
        let ct = c0 / i32(1u << top);                              // the node's coarsest cell
        for (var cz = 0; cz <= zTop; cz = cz + 1) {
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    if (abs(cx - ct.x) <= 1 && abs(cy - ct.y) <= 1 && abs(cz - ct.z) <= 1) { continue; }   // the 3x3(x3) is finer levels' work
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
        for (var l = top; l > 0u; l = l - 1u) {                    // level l - 1: the parent's 3x3 at level l, refined, minus this level's own 3x3
            let level = l - 1u;
            let cl = c0 / i32(1u << level);
            let cp = cl / 2;
            let side = i32(grid_side(level));
            let zLo = select(0, max(0, 2 * (cp.z - 1)), P.dim == 3u);
            let zHi = select(0, min(side - 1, 2 * (cp.z + 1) + 1), P.dim == 3u);
            for (var cz = zLo; cz <= zHi; cz = cz + 1) {
                for (var cy = max(0, 2 * (cp.y - 1)); cy <= min(side - 1, 2 * (cp.y + 1) + 1); cy = cy + 1) {
                    for (var cx = max(0, 2 * (cp.x - 1)); cx <= min(side - 1, 2 * (cp.x + 1) + 1); cx = cx + 1) {
                        if (abs(cx - cl.x) <= 1 && abs(cy - cl.y) <= 1 && abs(cz - cl.z) <= 1) { continue; }
                        f = f + cell_force(pi, pyramid[cell_at(level, cx, cy, cz)]);
                    }
                }
            }
        }
        for (var o = 0u; o < outside_cells(); o = o + 1u) {        // every outside pseudo-cell: one far-field term per orthant
            f = f + cell_force(pi, pyramid[grid_cells() + o]);
        }
    } else {
        for (var cz = 0; cz <= zTop; cz = cz + 1) {                // an outside node: the coarsest level in full, no pseudo-cell (G7 sums them pair by pair)
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
    }
    store_force(i, load_force(i) + f);
}
`,
    Sl = `
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn gravity_force(pi: vec4f) -> vec3f {                         // spec 7.9: centroid (GRAVITY_CENTER 0) or origin (1); regular or strong
    var q = pi.xyz;
    if (GRAVITY_CENTER == 0u) { q = pi.xyz - S.centroid.xyz; }
    if (STRONG_GRAVITY) { return -P.gravity * pi.w * q; }
    let d = length(q);
    if (d > FA2_DIST_FLOOR) { return -P.gravity * pi.w * q / d; }
    return vec3f(0.0);
}
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (the P5 plan's PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
fn pair_force(i: u32, pi: vec4f, jj: u32, o: vec4f) -> vec3f {  // the exact pair law of K3 (7.6, 7.20): the floor (FA2 only), the coincident kick
    let d = pi.xyz - o.xyz;
    var d2 = dot(d, d);
    if (d2 < FA2_COINCIDENT_SQ) { return kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w); }
    if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }
    let k = P.scalingRatio * pi.w * o.w;
    if (LAW == 1u) { return d * (P.frK * P.frK / d2); }
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }
    return d * (k / d2);
}
fn cell_sum(i: u32, pi: vec4f, c: u32, own: bool) -> vec3f {     // one finest cell: exact below nearMax entries, Horvitz-Thompson above (PD-15)
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    var f = vec3f(0.0);
    if (count <= P.nearMax) {
        for (var k = start; k < start + count; k = k + 1u) {
            let jj = sortedIdx[k];
            if (jj != i) { f = f + pair_force(i, pi, jj, pos[jj]); }
        }
        return f;
    }
    let base = (c ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed;                  // the per-iteration draw seed (7.16)
    var sampled = 0u;
    for (var k = 0u; k < P.nearMax; k = k + 1u) {
        let jj = sortedIdx[start + (lowbias32(base ^ (k * 0x85EBCA6Bu)) % count)];   // draw k: independent inclusion, with replacement (PD-15)
        if (jj == i) { continue; }
        f = f + pair_force(i, pi, jj, pos[jj]);
        sampled = sampled + 1u;
    }
    if (sampled == 0u) { return vec3f(0.0); }
    let others = select(count, count - 1u, own);
    return f * (f32(others) / f32(sampled));                     // others / sampled over the realised sample (DEP-P4-K)
}

@compute @workgroup_size(WG)
fn grid_near_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    let valid = t < P.n;
    var i = 0u;
    var pi = vec4f(0.0);
    var f = vec3f(0.0);
    if (valid) {
        i = sortedIdx[t];                                          // sorted order (D24)
        pi = pos[i];
        let gf = f32(P.gridMax);
        let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;
        var c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
        if (P.dim == 2u) { c0.z = 0; }                             // 2D: the one z plane
        let g = i32(P.gridMax);
        var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
        if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
        if (inside) {
            let zr = select(0, 1, P.dim == 3u);
            for (var dz = -zr; dz <= zr; dz = dz + 1) {
                for (var dy = -1; dy <= 1; dy = dy + 1) {
                    for (var dx = -1; dx <= 1; dx = dx + 1) {
                        let cx = c0.x + dx;
                        let cy = c0.y + dy;
                        let cz = c0.z + dz;
                        if (cx < 0 || cx >= g || cy < 0 || cy >= g || cz < 0 || cz >= g) { continue; }
                        let c = u32(cx) + P.gridMax * (u32(cy) + select(0u, P.gridMax * u32(cz), P.dim == 3u));
                        f = f + cell_sum(i, pi, c, dx == 0 && dy == 0 && dz == 0);
                    }
                }
            }
        } else {
            var own = grid_cells() + select(0u, 1u, c0.x >= g / 2) + select(0u, 2u, c0.y >= g / 2);   // G1's orthant key
            if (P.dim == 3u) { own = own + select(0u, 4u, c0.z >= g / 2); }
            for (var o = grid_cells(); o < grid_cells() + select(4u, 8u, P.dim == 3u); o = o + 1u) {   // an outside node: every outside pseudo-cell
                f = f + cell_sum(i, pi, o, o == own);
            }
        }
    }
    // epilogue (7.9, 7.10): gravity and force += under the guard, the swing / traction reduction outside it (K3's text)
    var sw = 0.0;
    var tr = 0.0;
    if (valid) {
        f = f + gravity_force(pi);
        let fnew = load_force(i) + f;
        store_force(i, fnew);
        if (SWING_MODE == 1u) {                                    // NetworkX: positions and forces mixed, every node (7.2)
            sw = pi.w * length(pi.xyz - fnew);
            tr = 0.5 * pi.w * length(pi.xyz + fnew);
        } else if (!mask_bit(fixedMask[i >> 5u], i)) {             // paper: free nodes only
            let fold = load_old(i);
            sw = pi.w * length(fnew - fold);
            tr = 0.5 * pi.w * length(fnew + fold);
        }
    }
    let tt = wg_reduce_vec4(vec4f(sw, tr, 0.0, 0.0), lid.x, 0u);   // uniform control flow: 256 -> 1
    if (lid.x == 0u) { partials[group_id(wid)].swingTraction = tt.xy; }
}
`,
    El = `
var<workgroup> shMax: array<f32, WG>;
var<workgroup> shKey: array<u32, WG>;
var<workgroup> shSum: array<u32, WG>;

fn weight_of(a: u32) -> f32 {
    if (WEIGHTED) { return weights[a]; }
    return 1.0;
}
fn scale_of(maxW: f32, d: u32) -> f32 {                            // 2^s, maxW x d x 2^s in [2^28, 2^30), from exponents alone
    let em = i32((bitcast<u32>(maxW) >> 23u) & 255u) - 127;
    let ed = i32(firstLeadingBit(max(d, 1u)));
    let s = clamp(28 - em - ed, -126, 126);
    return bitcast<f32>(u32(s + 127) << 23u);
}
fn inverse_of(scale: f32) -> f32 {                                 // 2^-s, exact
    let s = i32((bitcast<u32>(scale) >> 23u) & 255u) - 127;
    return bitcast<f32>(u32(127 - s) << 23u);
}
fn quantize(w: f32, scale: f32) -> u32 {                           // nearest integer, halves up; every step exact
    let x = max(w * scale, 0.0);
    let i = u32(x);
    return select(i, i + 1u, x - f32(i) >= 0.5);
}
fn better(sum: u32, key: u32, bestSum: u32, bestKey0: u32, own: u32) -> bool {  // the larger sum; on a tie own key, then lowest
    return sum > bestSum || (sum == bestSum && bestKey0 != own && (key == own || key < bestKey0));
}

fn row_thread(v: u32) {
    let lo = rowPtr[v];
    let hi = rowPtr[v + 1u];
    var maxW = 0.0;
    for (var a = lo; a < hi; a = a + 1u) { maxW = max(maxW, weight_of(a)); }
    let scale = scale_of(maxW, hi - lo);
    let own = keyIn[v];
    var bk = INVALID_INDEX;
    var bs = 0u;
    for (var a = lo; a < hi; a = a + 1u) {
        let k = keyIn[colIdx[a]];
        var seen = false;
        for (var b = lo; b < a; b = b + 1u) { if (keyIn[colIdx[b]] == k) { seen = true; break; } }
        if (seen) { continue; }                                    // this key was summed at its first arc
        var sum = 0u;
        for (var b = a; b < hi; b = b + 1u) { if (keyIn[colIdx[b]] == k) { sum = sum + quantize(weight_of(b), scale); } }
        if (better(sum, k, bs, bk, own)) { bk = k; bs = sum; }
    }
    bestKey[v] = bk;
    bestScore[v] = f32(bs) * inverse_of(scale);
}

fn row_hash(g: u32, lid: u32) {
    let v = rows[P.rowsBase + g];
    let base = rows[P.basesBase + g];
    let lo = rowPtr[v];
    let hi = rowPtr[v + 1u];
    let cap = GROUP_HASH_LOAD_FACTOR * (hi - lo);
    var m = 0.0;
    for (var a = lo + lid; a < hi; a = a + WG) { m = max(m, weight_of(a)); }
    shMax[lid] = m;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        if (lid < s) { shMax[lid] = max(shMax[lid], shMax[lid + s]); }
        workgroupBarrier();
    }
    let scale = scale_of(shMax[0], hi - lo);
    for (var j = lid; j < cap; j = j + WG) {                       // the region is this workgroup's alone: clear it
        atomicStore(&hashRegion[base + 2u * j], INVALID_INDEX);
        atomicStore(&hashRegion[base + 2u * j + 1u], 0u);
    }
    storageBarrier();
    var exhausted = false;
    for (var a = lo + lid; a < hi; a = a + WG) {
        let k = keyIn[colIdx[a]];
        let q = quantize(weight_of(a), scale);
        var slot = lowbias32(k) % cap;
        var steps = 0u;
        loop {
            if (steps >= cap + 64u) { exhausted = true; break; }   // bounded: a spurious compare-exchange failure is legal (WGSL 17.8.5)
            steps = steps + 1u;
            let r = atomicCompareExchangeWeak(&hashRegion[base + 2u * slot], INVALID_INDEX, k);
            if (r.exchanged || r.old_value == k) { atomicAdd(&hashRegion[base + 2u * slot + 1u], q); break; }
            if (r.old_value == INVALID_INDEX) { continue; }        // a spurious failure: the same slot again
            slot = (slot + 1u) % cap;                              // linear probing
        }
    }
    if (exhausted) { atomicStore(&hashRegion[0], 1u); }
    storageBarrier();
    let own = keyIn[v];
    var bk = INVALID_INDEX;
    var bs = 0u;
    for (var j = lid; j < cap; j = j + WG) {
        let k = atomicLoad(&hashRegion[base + 2u * j]);
        if (k != INVALID_INDEX) {
            let sum = atomicLoad(&hashRegion[base + 2u * j + 1u]);
            if (better(sum, k, bs, bk, own)) { bk = k; bs = sum; }
        }
    }
    shKey[lid] = bk;
    shSum[lid] = bs;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        if (lid < s && better(shSum[lid + s], shKey[lid + s], shSum[lid], shKey[lid], own)) {
            shKey[lid] = shKey[lid + s];
            shSum[lid] = shSum[lid + s];
        }
        workgroupBarrier();
    }
    if (lid == 0u) {
        bestKey[v] = shKey[0];
        bestScore[v] = f32(shSum[0]) * inverse_of(scale);
    }
}

@compute @workgroup_size(WG)
fn group_by_key_row(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) {
        let i = linear_id(wid, lid.x);
        if (i < P.count) { row_thread(rows[P.rowsBase + i]); }
        return;                                                    // TIER is an override: uniform
    }
    let g = group_id(wid);
    if (g >= P.count) { return; }                                  // uniform: the workgroup id and a uniform
    row_hash(g, lid.x);
}
`,
    kl = `
@compute @workgroup_size(WG)
fn histogram(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    if (k < P.bins) { atomicAdd(&hist[k], 1u); }                   // order-independent: the count is the same whatever the schedule
}
`,
    Il = `
@compute @workgroup_size(WG)
fn indirect_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                   // one lane; no barrier follows (3.5 rule 1)
    let count = counters[P.countIndex];
    let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);   // ceil(count / wg) without the u32 wrap of (count + wg - 1) above 2^32 - wg: plan1d's rule (5.2) for ANY u32 count
    var x = groups;
    var y = 1u;
    if (groups > MAX_WORKGROUPS_PER_DIM) {                         // the 2D split; y <= 1,025 for any u32 count
        x = MAX_WORKGROUPS_PER_DIM;
        y = (groups + MAX_WORKGROUPS_PER_DIM - 1u) / MAX_WORKGROUPS_PER_DIM;
    }
    let base = 4u * P.slot;                                        // 16-byte slots: (x, y, 1, count) (PD-2)
    args[base] = x;
    args[base + 1u] = y;
    args[base + 2u] = 1u;
    args[base + 3u] = count;
}
`,
    Al = `
var<workgroup> moved: atomic<u32>;

@compute @workgroup_size(WG)
fn lpa_step(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { atomicStore(&moved, 0u); }
    workgroupBarrier();
    let v = linear_id(wid, lid.x);
    if (v < P.n) {
        let cur = labelsIn[v];
        let best = bestKey[v];
        var next = cur;
        if (best != INVALID_INDEX && best != cur) {
            let down = best < cur;
            if (down == (P.direction == 0u)) { next = best; }        // the alternating direction rule
        }
        labelsOut[v] = next;
        if (next != cur) { atomicAdd(&moved, 1u); }
    }
    workgroupBarrier();                                            // every lane, unconditionally
    if (lid.x == 0u) {
        let m = atomicLoad(&moved);
        if (m > 0u) { atomicAdd(&counters[P.counterIndex], m); }  // one atomic per workgroup
    }
}
`,
    xl = `
@compute @workgroup_size(WG)
fn mst_best(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let e = linear_id(wid, lid.x);
    if (e >= P.count) { return; }
    let cu = comp[edgeSrc[e]];
    let cv = comp[edgeDst[e]];
    if (cu == cv) { return; }                                     // inside one component, or a self-loop
    var w = 1.0;
    if (WEIGHTED) { w = edgeWeight[e]; }
    let k = order_key(w);
    if (PASS == 0u) {
        atomicMin(&bestKey[cu], k);
        atomicMin(&bestKey[cv], k);
    } else {
        if (k == atomicLoad(&bestKey[cu])) { atomicMin(&bestEdge[cu], e); }
        if (k == atomicLoad(&bestKey[cv])) { atomicMin(&bestEdge[cv], e); }
    }
}
`,
    Rl = `
var<workgroup> added: atomic<u32>;

@compute @workgroup_size(WG)
fn mst_link(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { atomicStore(&added, 0u); }
    workgroupBarrier();
    let c = linear_id(wid, lid.x);
    if (c < P.count) {
        let e = bestEdge[c];
        if (e != INVALID_INDEX) {
            let a = atomicLoad(&comp[edgeSrc[e]]);
            let b = atomicLoad(&comp[edgeDst[e]]);
            let other = select(a, b, a == c);
            let keep = bestEdge[other] == e && c <= other;           // the lower root of a two-cycle stays
            if (!keep) { atomicStore(&comp[c], other); }
            if (!keep) { treeEdge[c] = e; atomicAdd(&added, 1u); }
        }
    }
    workgroupBarrier();                                            // every lane, unconditionally
    if (lid.x == 0u) {
        let k = atomicLoad(&added);
        if (k > 0u) { atomicAdd(&counters[P.counterIndex], k); }  // one atomic per workgroup
    }
}
`,
    Dl = `
@compute @workgroup_size(WG)
fn orient_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let a = linear_id(wid, lid.x);
    if (a >= P.count) { return; }                                  // no barrier follows
    let u = src[a];
    let v = colIdx[a];
    let du = rowPtr[u + 1u] - rowPtr[u];
    let dv = rowPtr[v + 1u] - rowPtr[v];
    let keep = dv > du || (dv == du && v > u);                     // (degree, id) of the target above the source's
    flags[a] = select(0u, 1u, keep);
}
`,
    Tl = `
@compute @workgroup_size(WG)
fn pr_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    var d = 0.0;
    var e = 0.0;
    var m = 0.0;
    for (var g = lid.x; g < P.groups; g = g + WG) {
        d = d + partials[1u + g].danglingMass;
        e = e + partials[1u + g].delta;
        m = m + partials[1u + g].norm;
    }
    let folded = wg_reduce_vec4(vec4f(d, e, m, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        partials[0].danglingMass = folded.x;
        partials[0].delta = folded.y;
        var norm = folded.z;
        if (NORM_MODE == 2u) { norm = sqrt(max(0.0, folded.z)); }
        partials[0].norm = norm;
        partials[0].iteration = P.iteration;
        let unset = partials[0].firstConverged == U32_MAX;
        if (P.trackConvergence == 1u && P.iteration >= 2u && folded.y < P.convergeThreshold && unset) {
            partials[0].firstConverged = P.iteration - 1u;
        }
    }
}
`,
    Ll = `
@compute @workgroup_size(WG)
fn pr_scale(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let u = linear_id(wid, lid.x);
    let inRange = u < P.n;
    var x = 0.0;
    var prev = 0.0;
    if (inRange) { x = rankIn[u]; prev = rankPrev[u]; }
    var dangling = 0.0;
    var delta = 0.0;
    var normTerm = 0.0;
    if (inRange) {
        delta = abs(x - prev);
        if (NORM_MODE == 0u) {
            let divisor = outWeightSum[u];
            if (divisor <= 0.0) { dangling = x; xNorm[u] = 0.0; } else { xNorm[u] = x / divisor; }
        }
        if (NORM_MODE == 1u) { normTerm = abs(x); }
        if (NORM_MODE == 2u) { normTerm = x * x; }
        if (NORM_MODE == 3u) {
            var scale = partials[0].norm;
            if (scale <= 0.0) { scale = 1.0; }
            xNorm[u] = x / scale;
        }
        if (NORM_MODE == 4u) { xNorm[u] = x; }
    }
    let folded = wg_reduce_vec4(vec4f(dangling, delta, normTerm, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        let slot = 1u + group_id(wid);
        partials[slot].danglingMass = folded.x;
        partials[slot].delta = folded.y;
        partials[slot].norm = folded.z;
    }
}
`,
    Ol = `
var<workgroup> local: array<atomic<u32>, RADIX_BINS>;

@compute @workgroup_size(WG)
fn radix_hist(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < RADIX_BINS; b = b + WG) { atomicStore(&local[b], 0u); }
    workgroupBarrier();
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < P.count) {
        let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;                 // the pass's digit
        atomicAdd(&local[d], 1u);
    }
    workgroupBarrier();
    // Above MAX_1D_ITEMS plan1d pads the 2D grid to x * y >= P.groups workgroups; a padding workgroup (g >= P.groups)
    // holds an all-zero table and its digit-major slot b * P.groups + g is digit b + 1's slot of a REAL group, so it
    // must not store. Uniform per workgroup, no barrier inside. Every test size fits 1D (the ladder tops at 2^22); no
    // case reaches this branch, so the guard is proved by reading, not by a run.
    if (g < P.groups) {
        for (var b = lid.x; b < RADIX_BINS; b = b + WG) { hist[b * P.groups + g] = atomicLoad(&local[b]); }   // digit-major
    }
}
`,
    Nl = `
var<workgroup> rank: array<u32, WG>;
var<workgroup> cnt: array<u32, RADIX_BINS>;

@compute @workgroup_size(WG)
fn radix_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < RADIX_BINS; b = b + WG) { cnt[b] = 0u; }
    let g = group_id(wid);
    let i = g * WG + lid.x;
    var key = 0u;
    var d = 0u;
    if (i < P.count) {
        key = keys[i];
        d = (key >> P.shift) & RADIX_DIGIT_MASK;
    }
    workgroupBarrier();
    if (lid.x == 0u) {                                             // serial stable ranking (PD-5)
        let last = min(WG, P.count - g * WG);
        for (var s = 0u; s < last; s = s + 1u) {
            let ds = (keys[g * WG + s] >> P.shift) & RADIX_DIGIT_MASK;
            rank[s] = cnt[ds];
            cnt[ds] = cnt[ds] + 1u;
        }
    }
    workgroupBarrier();
    if (i < P.count) {
        let dst = offsets[d * P.groups + g] + rank[lid.x];
        keysOut[dst] = key;
        valsOut[dst] = vals[i];
    }
}
`,
    $l = `
// DTYPE 0 = f32, 1 = u32, 2 = vec4f (4 words per element); OP 0 = sum, 1 = min, 2 = max; FINAL = the one-workgroup level
fn identity_f() -> f32 { if (OP == 1u) { return F32_MAX; } if (OP == 2u) { return -F32_MAX; } return 0.0; }
fn identity_u() -> u32 { if (OP == 1u) { return U32_MAX; } return 0u; }        // U32_MAX from the prelude: the literal is forbidden in bodies (4.1)
fn comb_f(a: f32, b: f32) -> f32 { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn comb_u(a: u32, b: u32) -> u32 { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn comb_v(a: vec4f, b: vec4f) -> vec4f { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn load_f(i: u32) -> f32 { return bitcast<f32>(src[i]); }
fn load_v(i: u32) -> vec4f {
    return vec4f(bitcast<f32>(src[4u * i]), bitcast<f32>(src[4u * i + 1u]), bitcast<f32>(src[4u * i + 2u]), bitcast<f32>(src[4u * i + 3u]));
}
fn store_f(i: u32, v: f32) { out[i] = bitcast<u32>(v); }
fn store_v(i: u32, v: vec4f) {
    out[4u * i] = bitcast<u32>(v.x);
    out[4u * i + 1u] = bitcast<u32>(v.y);
    out[4u * i + 2u] = bitcast<u32>(v.z);
    out[4u * i + 3u] = bitcast<u32>(v.w);
}

@compute @workgroup_size(WG)
fn reduce(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    var accF = identity_f();
    var accU = identity_u();
    var accV = vec4f(identity_f());
    if (FINAL) {
        for (var i = lid.x; i < P.count; i = i + WG) {           // sequential per lane in index order: deterministic
            if (DTYPE == 0u) { accF = comb_f(accF, load_f(i)); }
            else if (DTYPE == 1u) { accU = comb_u(accU, src[i]); }
            else { accV = comb_v(accV, load_v(i)); }
        }
    } else {
        let i = linear_id(wid, lid.x);
        if (i < P.count) {
            if (DTYPE == 0u) { accF = load_f(i); }
            else if (DTYPE == 1u) { accU = src[i]; }
            else { accV = load_v(i); }
        }
    }
    // uniform control flow: the workgroup reduction of the selected dtype (DTYPE is a pipeline constant, so the branch is uniform)
    var tF = 0.0;
    var tU = 0u;
    var tV = vec4f(0.0);
    if (DTYPE == 0u) { tF = wg_reduce_f32(accF, lid.x, OP); }
    else if (DTYPE == 1u) { tU = wg_reduce_u32(accU, lid.x, OP); }
    else { tV = wg_reduce_vec4(accV, lid.x, OP); }
    if (lid.x == 0u) {
        let g = select(group_id(wid), 0u, FINAL);
        let o = P.outOffset + g;
        if (DTYPE == 0u) { store_f(o, tF); }
        else if (DTYPE == 1u) { out[o] = tU; }
        else { store_v(o, tV); }
    }
}
`,
    Cl = `
@compute @workgroup_size(WG)
fn run_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let a = keysA[i];
    var first = a != INVALID_INDEX;                                // a dropped arc never opens a run
    if (i > 0u) { first = first && (a != keysA[i - 1u] || keysB[i] != keysB[i - 1u]); }
    flags[i] = select(0u, 1u, first);
}
`,
    Bl = `
@compute @workgroup_size(WG)
fn scan_add(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i >= P.count) { return; }                                  // no barrier follows
    out[i] = out[i] + blockOffsets[g];
}
`,
    Ml = `
var<workgroup> sh: array<u32, WG>;

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    var v = 0u;
    if (i < P.count) { v = src[i]; }
    sh[lid.x] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan; uniform: every lane runs every round
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    if (i < P.count) { out[i] = inclusive - v; }                  // exclusive = inclusive - own value
    if (lid.x == WG - 1u) { blockSums[g] = inclusive; }           // the block total (the last lane's inclusive sum)
}
`,
    Gl = `
fn identity() -> f32 { if (OP == 1u) { return F32_MAX; } if (OP == 2u) { return -F32_MAX; } return 0.0; }
fn comb(a: f32, b: f32) -> f32 { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_fold(i: u32, lane: u32, step: u32) -> f32 {              // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd)
    let row = i;                                                 // the CSR row the VALUE snippet may name (the node index, under USE_PERM too)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var acc = identity();
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // the neighbour index (\`target\` is a WGSL reserved word)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        var v = 0.0;
        //@@VALUE@@
        acc = comb(acc, v);
    }
    return acc;
}
fn row_fold_dense(i: u32) -> f32 {                              // TIER 0's stride-one twin of row_fold (see the header)
    let row = i;                                                 // the CSR row the VALUE snippet may name (as in row_fold)
    let lo = max(rowPtr[i], P.arcBase);
    let hi = min(rowPtr[i + 1u], P.arcEnd);
    var acc = identity();
    for (var left = select(0u, hi - lo, hi > lo); left > 0u; left = left - 1u) {   // counts DOWN (see the header)
        let arc = hi - left;                             // lo, lo + 1, ..., hi - 1
        let k = arc - P.arcBase;                         // the window-local index; this walk is contiguous
        let nbr = colIdx[k];
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[k]; }
        var v = 0.0;
        //@@VALUE@@
        acc = comb(acc, v);
    }
    return acc;
}
fn finish(i: u32, acc: f32) { out[i] = select(acc, comb(out[i], acc), P.accumulate == 1u); }
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: one row per thread over [P.start, P.end); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.start;
    if (row >= P.end) { return; }
    let i = row_node(row);
    finish(i, row_fold_dense(i));
}

var<workgroup> sh: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row, WG / 32 rows per workgroup; TIER 2: WG lanes per row (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.end;
    var i = 0u;
    var acc = identity();
    if (valid) { i = row_node(row); acc = row_fold(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = identity();
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = comb(sh[lid], t);
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(i, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, OP);                     // the workgroup tree of the prelude (subgroup variant when available)
        if (valid && lid == 0u) { finish(i, t); }
    }
}

@compute @workgroup_size(WG)
fn segmented_reduce(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
`,
    zl = `
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_sum(v: u32, lane: u32, step: u32) -> f32 {               // this lane's arcs of row v inside the bound window, the two-level 64-term fold of the header
    let a0 = max(rowPtr[v], P.arcBase);
    let a1 = min(rowPtr[v + 1u], P.arcEnd);
    var acc = 0.0;
    var chunk = 0.0;
    var inChunk = 0u;
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        // two-level sum: 64 terms into chunk, chunk into acc (see the header; no compensation, no select)
        chunk = chunk + (weight * xNorm[nbr]);
        inChunk = inChunk + 1u;
        if (inChunk == 64u) {
            acc = acc + chunk;
            chunk = 0.0;
            inChunk = 0u;
        }
    }
    acc = acc + chunk;
    return acc;
}
fn row_sum_dense(v: u32) -> f32 {                                // TIER 0's stride-one twin of row_sum (see the header)
    let lo = max(rowPtr[v], P.arcBase);
    let hi = min(rowPtr[v + 1u], P.arcEnd);
    var acc = 0.0;
    var chunk = 0.0;
    var inChunk = 0u;
    for (var left = select(0u, hi - lo, hi > lo); left > 0u; left = left - 1u) {   // counts DOWN (see the header)
        let arc = hi - left;                             // lo, lo + 1, ..., hi - 1
        let k = arc - P.arcBase;                         // the window-local index; this walk is contiguous
        let nbr = colIdx[k];                             // \`target\` is a WGSL reserved word (spec 16.2)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[k]; }
        // two-level sum: 64 terms into chunk, chunk into acc (see the header; no compensation, no select)
        chunk = chunk + (weight * xNorm[nbr]);
        inChunk = inChunk + 1u;
        if (inChunk == 64u) {
            acc = acc + chunk;
            chunk = 0.0;
            inChunk = 0u;
        }
    }
    acc = acc + chunk;
    return acc;
}
fn finish(v: u32, acc: f32) {
    var dangling = 0.0;
    if (USE_DANGLING) { dangling = partials[0].danglingMass; }
    var pv = P.uniformP;
    if (HAS_PERSONALIZATION) { pv = personalization[v]; }
    rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)));
}
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: grid-stride over the rows [P.start, P.n); no barrier
    for (var row = linear_id(wid, lane) + P.start; row < P.n; row = row + P.stride) {
        let v = row_node(row);
        finish(v, row_sum_dense(v));
    }
}

var<workgroup> sh: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row; TIER 2: WG lanes per row; rows [P.start, P.n) (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.n;
    var v = 0u;
    var acc = 0.0;
    if (valid) { v = row_node(row); acc = row_sum(v, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = 0.0;
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(v, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, 0u);
        if (valid && lid == 0u) { finish(v, t); }
    }
}

@compute @workgroup_size(WG)
fn spmv_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
`,
    Fl = `
@compute @workgroup_size(WG)
fn sssp_pred(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let hb = ((P.n + 63u) / 64u) * 64u;                              // MODE 0 only: hops[v] is pred[hb + v]; pred[2 hb] is the changed word, pred[2 hb + 1] the orphan word (PD-27)
    if (P.role == 1u && P.iteration != 0u && atomicLoad(&pred[2u * hb]) < P.iteration) { return; }   // the previous hop pass changed nothing: converged (no barrier anywhere, so the early return is legal)
    for (var u = first; u < P.n; u = u + P.stride) {                 // grid-stride over the rows (planGridStride(n)); no barrier anywhere
        let du = dist[u];
        var unreached = false;
        if (MODE == 1u) { unreached = du == INVALID_INDEX; } else { unreached = du == F32_INF_BITS; }
        if (unreached) { continue; }
        var hu = 0u;                                                 // u's hop count (MODE 0, roles 1 and 2)
        if (MODE == 0u && P.role != 0u) {
            hu = atomicLoad(&pred[hb + u]);
            if (hu == INVALID_INDEX) {                               // the key has not reached u yet
                if (P.role == 2u && u != P.source) { atomicAdd(&pred[2u * hb + 1u], 1u); }   // an orphan: only bellmanFord can make one (P8-T10 Step 3)
                continue;
            }
        }
        let end = min(rowPtr[u + 1u], P.arcEnd);
        for (var a = max(rowPtr[u], P.arcBase); a < end; a = a + 1u) {
            let v = colIdx[a - P.arcBase];
            if (v == P.source) { continue; }                         // the source keeps INVALID_INDEX whatever attains it (a zero-weight arc could)
            let dv = dist[v];
            var tight = false;                                       // the arc explains dist[v]
            var below = false;                                       // and its source sits at a strictly smaller distance
            if (MODE == 1u) {
                tight = (du + 1u) == dv;                             // depth mode: BFS parent, one depth down
            } else {
                let w = select(1.0, weights[a - P.arcBase], HAS_WEIGHTS);
                tight = (dv != F32_INF_BITS) && (bitcast<u32>(bitcast<f32>(du) + w) == dv);   // one f32 add, compared as the bit pattern PD-9 stores; never into an unreached v (an overflowed sum is +Inf too)
                below = bitcast<f32>(du) < bitcast<f32>(dv);
            }
            if (!tight) { continue; }
            var admit = false;                                       // this arc is one key step below v
            if (MODE == 1u) {
                admit = true;
            } else if (P.role == 0u) {                               // the roots pass (the plateau rule only; bellmanFord seeds the source alone)
                if (P.mode == 0u && below) { atomicMin(&pred[hb + v], 0u); }
            } else if (P.role == 1u) {                               // a hop pass: one hop along a plateau arc (mode 0) or along any tight arc (mode 1)
                if (P.mode == 1u || du == dv) {
                    let old = atomicMin(&pred[hb + v], hu + 1u);
                    if (hu + 1u < old) { atomicMax(&pred[2u * hb], P.iteration + 1u); }   // this pass changed something
                }
            } else {                                                 // the predecessor pass: the smallest tight arc one key step below v
                let hv = atomicLoad(&pred[hb + v]);
                if (P.mode == 1u) { admit = hu + 1u == hv; } else if (hv == 0u) { admit = below; } else { admit = (du == dv) && (hu + 1u == hv); }
            }
            if (admit) { atomicMin(&pred[v], select(a, u, P.predKind == 1u)); }
        }
    }
}
`,
    Wl = `
@compute @workgroup_size(WG)
fn sssp_relax(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let mine = select(5u, 6u, P.role == 1u);                           // the path word role 2 wrote: 5 a near round, 6 a far pass-through
    let chosen = atomicLoad(&counters[24]) == mine;                    // the other role's dispatch of the round is a no-op
    let count = select(0u, min(atomicLoad(&counters[select(0u, 20u, P.role == 1u)]), P.n), chosen);   // the deduped near or far pile
    let threshold = bitcast<f32>(atomicLoad(&counters[22]));
    let cutoff = bitcast<f32>(P.cutoffBits);
    for (var i = first; i < count; i = i + P.stride) {                // no barrier anywhere: the loops may be per lane
        let u = queueIn[i];
        let du = bitcast<f32>(atomicLoad(&dist[u]));
        if (P.role == 1u) {                                            // the pass-through (PD-20): re-bucket a far entry
            if (du < bitcast<f32>(atomicLoad(&counters[4]))) { continue; }   // below the previous threshold: relaxed in an earlier bucket
            if (du < threshold) {
                let q = atomicAdd(&counters[1], 1u);
                if (q < P.edgeCapacity) { queueOut[q] = u; }
            } else {
                let q = atomicAdd(&counters[21], 1u);
                if (q < P.edgeCapacity) { queueOut[P.edgeCapacity + q] = u; }
            }
            continue;
        }
        let end = rowPtr[u + 1u];
        for (var a = rowPtr[u]; a < end; a = a + 1u) {                 // the whole row: never windowed (DEP-P8-E)
            let v = colIdx[a];
            let nd = du + select(1.0, weights[a], HAS_WEIGHTS);         // ONE f32 add (PD-9)
            if (nd > cutoff) { continue; }                             // SsspOptions.cutoff: the CPU port's dv <= cutoff
            let bits = bitcast<u32>(nd);
            let old = atomicMin(&dist[v], bits);                       // exact on non-negative floats
            if (bits < old) {                                          // this lane improved v, so it owns the append
                if (nd < threshold) {
                    let q = atomicAdd(&counters[1], 1u);
                    if (q < P.edgeCapacity) { queueOut[q] = v; }
                } else {
                    let q = atomicAdd(&counters[21], 1u);
                    if (q < P.edgeCapacity) { queueOut[P.edgeCapacity + q] = v; }
                }
            }
        }
    }
}
`,
    Ul = `
fn contains(lo0: u32, hi0: u32, x: u32) -> bool {                  // binary search of x in colIdx[lo0, hi0), sorted ascending
    var lo = lo0;
    var hi = hi0;
    loop {
        if (lo >= hi) { break; }
        let mid = lo + (hi - lo) / 2u;
        let y = colIdx[mid];
        if (y == x) { return true; }
        if (y < x) { lo = mid + 1u; } else { hi = mid; }
    }
    return false;
}

@compute @workgroup_size(WG)
fn tri_intersect(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let a = linear_id(wid, lid.x);
    if (a >= P.count) { return; }                                  // no barrier follows
    let u = src[a];
    let v = colIdx[a];
    let uLo = rowPtr[u];
    let uHi = rowPtr[u + 1u];
    let vLo = rowPtr[v];
    let vHi = rowPtr[v + 1u];
    let du = uHi - uLo;
    let dv = vHi - vLo;
    var search = SEARCH == 2u;
    if (SEARCH == 0u) { search = du / TRIANGLE_BINARY_SEARCH_RATIO > dv || dv / TRIANGLE_BINARY_SEARCH_RATIO > du; }
    var found = 0u;
    if (search) {
        var sLo = uLo;
        var sHi = uHi;
        var lLo = vLo;
        var lHi = vHi;
        if (du > dv) { sLo = vLo; sHi = vHi; lLo = uLo; lHi = uHi; }
        for (var k = sLo; k < sHi; k = k + 1u) {
            let w = colIdx[k];
            if (contains(lLo, lHi, w)) { atomicAdd(&counts[w], 1u); found = found + 1u; }
        }
    } else {
        var i = uLo;
        var j = vLo;
        loop {
            if (i >= uHi || j >= vHi) { break; }
            let x = colIdx[i];
            let y = colIdx[j];
            if (x == y) { atomicAdd(&counts[x], 1u); found = found + 1u; i = i + 1u; j = j + 1u; }
            else if (x < y) { i = i + 1u; }
            else { j = j + 1u; }
        }
    }
    if (found > 0u) { atomicAdd(&counts[u], found); atomicAdd(&counts[v], found); }
}
`,
    Vl = `
@compute @workgroup_size(WG)
fn wcc_compress(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var v = first; v < P.items; v = v + P.stride) {
        var root = atomicLoad(&comp[v]);
        var steps = 0u;
        loop {
            let parent = atomicLoad(&comp[root]);
            if (parent == root) { break; }
            if (steps >= P.maxSteps) { break; }
            steps = steps + 1u;
            root = parent;
        }
        atomicStore(&comp[v], root);
    }
}
`,
    jl = `
fn link_pair(a: u32, b: u32) {
    var p1 = atomicLoad(&comp[a]);
    var p2 = atomicLoad(&comp[b]);
    var steps = 0u;
    loop {
        if (p1 == p2) { break; }
        if (steps >= P.maxSteps) { atomicStore(&comp[P.flagIndex], 1u); break; }
        steps = steps + 1u;
        let hi = max(p1, p2);
        let lo = min(p1, p2);
        let pHigh = atomicLoad(&comp[hi]);
        if (pHigh == lo) { break; }
        if (pHigh == hi) {
            let swapped = atomicCompareExchangeWeak(&comp[hi], hi, lo);
            if (swapped.exchanged) { atomicStore(&comp[P.flagIndex], 1u); break; }
        }
        p1 = atomicLoad(&comp[atomicLoad(&comp[hi])]);
        p2 = atomicLoad(&comp[lo]);
    }
}

@compute @workgroup_size(WG)
fn wcc_link_edges(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var e = first; e < P.items; e = e + P.stride) {
        let u = edgeSrc[e];
        let v = edgeDst[e];
        if (u == v) { continue; }
        if (atomicLoad(&comp[u]) == P.giant && atomicLoad(&comp[v]) == P.giant) { continue; }
        link_pair(u, v);
    }
}
`,
    ql = `
fn link_pair(a: u32, b: u32) {
    var p1 = atomicLoad(&comp[a]);
    var p2 = atomicLoad(&comp[b]);
    var steps = 0u;
    loop {
        if (p1 == p2) { break; }
        if (steps >= P.maxSteps) { atomicStore(&comp[P.flagIndex], 1u); break; }
        steps = steps + 1u;
        let hi = max(p1, p2);
        let lo = min(p1, p2);
        let pHigh = atomicLoad(&comp[hi]);
        if (pHigh == lo) { break; }
        if (pHigh == hi) {
            let swapped = atomicCompareExchangeWeak(&comp[hi], hi, lo);
            if (swapped.exchanged) { atomicStore(&comp[P.flagIndex], 1u); break; }
        }
        p1 = atomicLoad(&comp[atomicLoad(&comp[hi])]);
        p2 = atomicLoad(&comp[lo]);
    }
}

@compute @workgroup_size(WG)
fn wcc_link_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var row = first; row < P.items; row = row + P.stride) {
        let v = select(row, perm[row], USE_PERM);
        let a0 = rowPtr[v];
        let a1 = rowPtr[v + 1u];
        if (a0 + P.r < a1) {
            link_pair(v, colIdx[a0 + P.r]);
        }
    }
}
`,
    Kl = `
@compute @workgroup_size(WG)
fn wcc_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.items) { return; }
    let v = lowbias32(i + P.r) % P.n;
    hist[i] = atomicLoad(&comp[v]);
}
`,
    Vs = se.define("RangeParams", [
        ["start", "u32"],
        ["end", "u32"],
        ["arcBase", "u32"],
        ["arcEnd", "u32"],
        ["accumulate", "u32"],
        ["n", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
    ]),
    Hl = se.define("ReduceParams", [
        ["count", "u32"],
        ["outOffset", "u32"],
        ["level", "u32"],
        ["pad0", "u32"],
    ]),
    Ae = se.define("FillParams", [
        ["count", "u32"],
        ["value", "u32"],
        ["mode", "u32"],
        ["pad0", "u32"],
    ]),
    Ue = se.define("Fa2Params", [
        ["n", "u32"],
        ["dim", "u32"],
        ["flags", "u32"],
        ["tierStart", "u32"],
        ["tierEnd", "u32"],
        ["iterationIndex", "u32"],
        ["seed", "u32"],
        ["nearMax", "u32"],
        ["scalingRatio", "f32"],
        ["gravity", "f32"],
        ["jitterTolerance", "f32"],
        ["scale", "f32"],
        ["center", "vec4f"],
        ["settleThreshold", "f32"],
        ["extentFactor", "f32"],
        ["gridMax", "u32"],
        ["levels", "u32"],
        ["arcBase", "u32"],
        ["arcEnd", "u32"],
        ["accumulate", "u32"],
        ["hiEnd", "u32"],
        ["frK", "f32"],
        ["temperature", "f32"],
        ["springLength", "f32"],
        ["springCoefficient", "f32"],
        ["coulomb", "f32"],
        ["dragCoefficient", "f32"],
        ["timeStep", "f32"],
        ["midEnd", "u32"],
        ["settleFloor", "f32"],
    ]),
    et = se.define(
        "Fa2State",
        [
            ["speed", "f32"],
            ["speedEfficiency", "f32"],
            ["swing", "f32"],
            ["traction", "f32"],
            ["centroid", "vec4f"],
            ["rmsRadius", "f32"],
            ["radius", "f32"],
            ["meanDisplacement", "f32"],
            ["iteration", "u32"],
            ["min", "vec4f"],
            ["max", "vec4f"],
            ["gridMin", "vec4f"],
            ["eps", "f32"],
            ["settledCount", "u32"],
            ["outsideGrid", "u32"],
            ["maxCellOccupancy", "u32"],
            ["temperature", "f32"],
            ["kineticEnergy", "f32"],
            ["frEnergy", "f32"],
            ["frProgress", "u32"],
            ["invCellSize", "f32"],
            ["reserved0", "f32"],
            ["reserved1", "vec2f"],
            ["reserved2", "vec4f"],
            ["reserved3", "vec4f"],
            ["reserved4", "vec4f"],
            ["reserved5", "vec4f"],
            ["reserved6", "vec4f"],
            ["reserved7", "vec4f"],
            ["reserved8", "vec4f"],
        ],
        { layout: "storage", padTo: He },
    ),
    Xt = se.define(
        "Fa2Trace",
        [
            ["swing", "f32"],
            ["traction", "f32"],
            ["speed", "f32"],
            ["speedEfficiency", "f32"],
            ["meanDisplacement", "f32"],
            ["settledCount", "u32"],
            ["iteration", "u32"],
            ["modelScalar", "f32"],
        ],
        { layout: "storage" },
    ),
    hr = se.define(
        "Fa2Partial",
        [
            ["sum", "vec4f"],
            ["min", "vec4f"],
            ["max", "vec4f"],
            ["swingTraction", "vec2f"],
            ["dispFree", "vec2f"],
        ],
        { layout: "storage" },
    ),
    Vn = se.define("SpmvParams", [
        ["n", "u32"],
        ["arcBase", "u32"],
        ["arcEnd", "u32"],
        ["stride", "u32"],
        ["alpha", "f32"],
        ["beta", "f32"],
        ["uniformP", "f32"],
        ["start", "u32"],
    ]),
    Ur = se.define("PrParams", [
        ["n", "u32"],
        ["groups", "u32"],
        ["iteration", "u32"],
        ["trackConvergence", "u32"],
        ["convergeThreshold", "f32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
        ["pad2", "u32"],
    ]),
    Ie = se.define(
        "PrPartial",
        [
            ["danglingMass", "f32"],
            ["delta", "f32"],
            ["firstConverged", "u32"],
            ["iteration", "u32"],
            ["norm", "f32"],
            ["pad0", "f32"],
            ["pad1", "f32"],
            ["pad2", "f32"],
        ],
        { layout: "storage" },
    ),
    Qt = se.define("WccParams", [
        ["n", "u32"],
        ["items", "u32"],
        ["stride", "u32"],
        ["r", "u32"],
        ["flagIndex", "u32"],
        ["giant", "u32"],
        ["maxSteps", "u32"],
        ["pad0", "u32"],
    ]),
    Yl = se.define("IndirectParams", [
        ["countIndex", "u32"],
        ["wg", "u32"],
        ["slot", "u32"],
        ["pad0", "u32"],
    ]),
    Lr = se.define("ScanParams", [
        ["count", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
        ["pad2", "u32"],
    ]),
    jn = se.define("GridLevelParams", [
        ["childBase", "u32"],
        ["parentBase", "u32"],
        ["parentSide", "u32"],
        ["parentCells", "u32"],
        ["depth", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
        ["pad2", "u32"],
    ]),
    Vr = se.define("HistParams", [
        ["count", "u32"],
        ["bins", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
    ]),
    js = se.define("RadixParams", [
        ["count", "u32"],
        ["shift", "u32"],
        ["groups", "u32"],
        ["pad0", "u32"],
    ]),
    dr = se.define("CompactParams", [
        ["count", "u32"],
        ["outIndex", "u32"],
        ["countIndex", "u32"],
        ["stride", "u32"],
    ]),
    Be = se.define(
        "FrontierCounters",
        [
            ["frontierCount", "u32"],
            ["nextFrontierCount", "u32"],
            ["frontierDegreeSum", "u32"],
            ["prevFrontierCount", "u32"],
            ["prevDegreeSum", "u32"],
            ["unvisitedCount", "u32"],
            ["unvisitedDegreeSum", "u32"],
            ["unvisitedListLen", "u32"],
            ["edgeCount", "u32"],
            ["edgeCountUnclamped", "u32"],
            ["overflowLevels", "u32"],
            ["level", "u32"],
            ["visitedCount", "u32"],
            ["switches", "u32"],
            ["direction", "u32"],
            ["done", "u32"],
            ["arcsScanned", "u32"],
            ["fusedLevels", "u32"],
            ["twoPhaseLevels", "u32"],
            ["bottomUpLevels", "u32"],
            ["farCount", "u32"],
            ["nextFarCount", "u32"],
            ["thresholdBits", "u32"],
            ["deltaBits", "u32"],
            ["path", "u32"],
            ["nextDegreeSum", "u32"],
            ["stackTop", "u32"],
            ["sigmaOverflow", "u32"],
        ],
        { layout: "storage" },
    ),
    ve = se.define("FrontierParams", [
        ["role", "u32"],
        ["wg", "u32"],
        ["alpha", "u32"],
        ["beta", "u32"],
        ["fusedMax", "u32"],
        ["edgeCapacity", "u32"],
        ["maxDepth", "u32"],
        ["n", "u32"],
        ["mode", "u32"],
        ["cutoffBits", "u32"],
        ["arcBase", "u32"],
        ["arcEnd", "u32"],
        ["predKind", "u32"],
        ["bitsBase", "u32"],
        ["source", "u32"],
        ["stride", "u32"],
        ["firstOfSubmit", "u32"],
        ["iteration", "u32"],
        ["pad3", "u32"],
        ["pad2", "u32"],
    ]),
    _t = se.define("BcParams", [
        ["n", "u32"],
        ["k", "u32"],
        ["start", "u32"],
        ["count", "u32"],
        ["stride", "u32"],
        ["role", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
    ]),
    Wt = se.define("ClosenessParams", [
        ["role", "u32"],
        ["n", "u32"],
        ["words", "u32"],
        ["base", "u32"],
        ["total", "u32"],
        ["level", "u32"],
        ["row", "u32"],
        ["ctrl", "u32"],
        ["count", "u32"],
        ["source", "u32"],
        ["sourcesAt", "u32"],
        ["pullAt", "u32"],
        ["perNode", "u32"],
        ["arcCount", "u32"],
        ["pullOk", "u32"],
        ["pad0", "u32"],
    ]),
    qn = se.define("BfParams", [
        ["edgeCount", "u32"],
        ["stride", "u32"],
        ["maxRetries", "u32"],
        ["cutoffBits", "u32"],
    ]),
    tr = se.define(
        "BfFlags",
        [
            ["changed", "u32"],
            ["retryExhausted", "u32"],
            ["pad0", "u32"],
            ["pad1", "u32"],
        ],
        { layout: "storage" },
    ),
    Or = se.define("ApspParams", [
        ["n", "u32"],
        ["round", "u32"],
        ["blocks", "u32"],
        ["infBits", "u32"],
    ]),
    nt = se.define("CooParams", [
        ["count", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
        ["pad2", "u32"],
    ]),
    Kn = se.define("GroupParams", [
        ["rowsBase", "u32"],
        ["basesBase", "u32"],
        ["count", "u32"],
        ["pad0", "u32"],
    ]),
    Hn = se.define("LpaParams", [
        ["n", "u32"],
        ["direction", "u32"],
        ["counterIndex", "u32"],
        ["pad0", "u32"],
    ]),
    Nr = se.define("MstParams", [
        ["count", "u32"],
        ["counterIndex", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
    ]);
function u(r, e, t, s, i) {
    return { group: r, binding: e, name: t, kind: s, wgslType: i };
}
const tt = [
        u(0, 0, "rowPtr", "storage-ro", "array<u32>"),
        u(0, 1, "colIdx", "storage-ro", "array<u32>"),
        u(0, 2, "weights", "storage-ro", "array<f32>"),
        u(0, 3, "perm", "storage-ro", "array<u32>"),
    ],
    Xl = {
        id: "degree",
        body: ll,
        entryPoint: "degree",
        bindings: tt.concat(u(1, 0, "out", "storage", "array<u32>"), u(2, 0, "P", "uniform", "RangeParams")),
        overrideDecls: [],
        uniforms: [Vs],
        needs: [],
        snippetSlots: [],
        phase: "P1",
    },
    Ql = {
        id: "reduce",
        body: $l,
        entryPoint: "reduce",
        bindings: [
            u(1, 0, "src", "storage-ro", "array<u32>"),
            u(1, 1, "out", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "ReduceParams"),
        ],
        overrideDecls: [
            { name: "OP", type: "u32", default: 0 },
            { name: "DTYPE", type: "u32", default: 0 },
            { name: "FINAL", type: "bool", default: !1 },
        ],
        uniforms: [Hl],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P1",
    },
    Zl = {
        id: "fill",
        body: ml,
        entryPoint: "fill",
        bindings: [u(1, 0, "dst", "storage", "array<u32>"), u(2, 0, "P", "uniform", "FillParams")],
        overrideDecls: [],
        uniforms: [Ae],
        needs: [],
        snippetSlots: [],
        phase: "P1",
    },
    Jl = {
        id: "segmented-reduce",
        body: Gl,
        entryPoint: "segmented_reduce",
        bindings: tt.concat(u(1, 0, "out", "storage", "array<f32>"), u(2, 0, "P", "uniform", "RangeParams")),
        overrideDecls: [
            { name: "OP", type: "u32", default: 0 },
            { name: "TIER", type: "u32", default: 0 },
        ],
        uniforms: [Vs],
        needs: ["subgroups"],
        snippetSlots: ["VALUE"],
        phase: "P2",
    },
    eu = {
        id: "fa2-stats-finalize",
        body: pl,
        entryPoint: "stats_finalize",
        bindings: [
            u(1, 0, "partials", "storage-ro", "array<Fa2Partial>"),
            u(1, 1, "S", "storage", "Fa2State"),
            u(1, 2, "T", "storage", "array<Fa2Trace>"),
            u(1, 3, "cellHist", "storage-ro", "array<u32>"),
            u(1, 4, "hubCounters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [{ name: "STATS_MODE", type: "u32", default: 0 }],
        uniforms: [Ue, et, Xt, hr],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P3",
    },
    tu = {
        id: "fa2-attraction",
        body: ul,
        entryPoint: "attraction",
        bindings: tt.concat(
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "force", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ),
        overrideDecls: [
            { name: "LINLOG", type: "bool", default: !1 },
            { name: "DISTRIBUTED", type: "bool", default: !1 },
            { name: "TIER", type: "u32", default: 0 },
            { name: "LAW", type: "u32", default: 0 },
        ],
        uniforms: [Ue],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P3",
    },
    ru = {
        id: "fa2-repulsion-exact",
        body: fl,
        entryPoint: "repulsion",
        bindings: [
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "S", "storage", "Fa2State"),
            u(1, 2, "force", "storage", "array<f32>"),
            u(1, 3, "oldForce", "storage-ro", "array<f32>"),
            u(1, 4, "fixedMask", "storage-ro", "array<u32>"),
            u(1, 5, "partials", "storage", "array<Fa2Partial>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [
            { name: "SWING_MODE", type: "u32", default: 0 },
            { name: "STRONG_GRAVITY", type: "bool", default: !1 },
            { name: "GRAVITY_CENTER", type: "u32", default: 0 },
            { name: "LAW", type: "u32", default: 0 },
        ],
        uniforms: [Ue, et, hr],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P1",
    },
    su = {
        id: "fa2-speed-finalize",
        body: hl,
        entryPoint: "speed_finalize",
        bindings: [
            u(1, 0, "partials", "storage-ro", "array<Fa2Partial>"),
            u(1, 1, "S", "storage", "Fa2State"),
            u(1, 2, "T", "storage", "array<Fa2Trace>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [{ name: "SWING_MODE", type: "u32", default: 0 }],
        uniforms: [Ue, et, Xt, hr],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P1",
    },
    iu = {
        id: "fa2-integrate",
        body: dl,
        entryPoint: "integrate",
        bindings: [
            u(1, 0, "force", "storage-ro", "array<f32>"),
            u(1, 1, "oldForce", "storage", "array<f32>"),
            u(1, 2, "fixedMask", "storage-ro", "array<u32>"),
            u(1, 3, "S", "storage", "Fa2State"),
            u(1, 4, "pos", "storage", "array<vec4f>"),
            u(1, 5, "partials", "storage", "array<Fa2Partial>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [
            { name: "SWING_MODE", type: "u32", default: 0 },
            { name: "APPLY", type: "u32", default: 0 },
        ],
        uniforms: [Ue, et, hr],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P3",
    },
    nu = {
        id: "fa2-to-scene",
        body: gl,
        entryPoint: "to_scene",
        bindings: [
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "scene", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [],
        uniforms: [Ue],
        needs: [],
        snippetSlots: [],
        phase: "P3",
    },
    ou = {
        id: "spmv-pull",
        body: zl,
        entryPoint: "spmv_pull",
        bindings: tt.concat(
            u(1, 0, "xNorm", "storage-ro", "array<f32>"),
            u(1, 1, "rankOut", "storage", "array<f32>"),
            u(1, 2, "personalization", "storage-ro", "array<f32>"),
            u(1, 3, "partials", "storage-ro", "array<PrPartial>"),
            u(2, 0, "P", "uniform", "SpmvParams"),
        ),
        overrideDecls: [
            { name: "HAS_PERSONALIZATION", type: "bool", default: !1 },
            { name: "USE_DANGLING", type: "bool", default: !1 },
            { name: "TIER", type: "u32", default: 0 },
        ],
        uniforms: [Vn, Ie],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P7",
    },
    au = {
        id: "pr-scale",
        body: Ll,
        entryPoint: "pr_scale",
        bindings: [
            u(1, 0, "rankIn", "storage-ro", "array<f32>"),
            u(1, 1, "rankPrev", "storage-ro", "array<f32>"),
            u(1, 2, "outWeightSum", "storage-ro", "array<f32>"),
            u(1, 3, "xNorm", "storage", "array<f32>"),
            u(1, 4, "partials", "storage", "array<PrPartial>"),
            u(2, 0, "P", "uniform", "PrParams"),
        ],
        overrideDecls: [{ name: "NORM_MODE", type: "u32", default: 0 }],
        uniforms: [Ur, Ie],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P7",
    },
    cu = {
        id: "pr-finalize",
        body: Tl,
        entryPoint: "pr_finalize",
        bindings: [u(1, 0, "partials", "storage", "array<PrPartial>"), u(2, 0, "P", "uniform", "PrParams")],
        overrideDecls: [{ name: "NORM_MODE", type: "u32", default: 0 }],
        uniforms: [Ur, Ie],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P7",
    },
    lu = {
        id: "wcc-link-sample",
        body: ql,
        entryPoint: "wcc_link_sample",
        bindings: tt.concat(u(1, 0, "comp", "storage", "array<atomic<u32>>"), u(2, 0, "P", "uniform", "WccParams")),
        overrideDecls: [],
        uniforms: [Qt],
        needs: [],
        snippetSlots: [],
        phase: "P7",
    },
    uu = {
        id: "wcc-link-edges",
        body: jl,
        entryPoint: "wcc_link_edges",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "comp", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "WccParams"),
        ],
        overrideDecls: [],
        uniforms: [Qt],
        needs: [],
        snippetSlots: [],
        phase: "P7",
    },
    du = {
        id: "wcc-compress",
        body: Vl,
        entryPoint: "wcc_compress",
        bindings: [u(1, 0, "comp", "storage", "array<atomic<u32>>"), u(2, 0, "P", "uniform", "WccParams")],
        overrideDecls: [],
        uniforms: [Qt],
        needs: [],
        snippetSlots: [],
        phase: "P7",
    },
    fu = {
        id: "wcc-sample",
        body: Kl,
        entryPoint: "wcc_sample",
        bindings: [
            u(1, 0, "comp", "storage", "array<atomic<u32>>"),
            u(1, 1, "hist", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "WccParams"),
        ],
        overrideDecls: [],
        uniforms: [Qt],
        needs: [],
        snippetSlots: [],
        phase: "P7",
    },
    hu = {
        id: "indirect-finalize",
        body: Il,
        entryPoint: "indirect_finalize",
        bindings: [
            u(1, 0, "counters", "storage-ro", "array<u32>"),
            u(1, 1, "args", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "IndirectParams"),
        ],
        overrideDecls: [],
        uniforms: [Yl],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    pu = {
        id: "scan-block",
        body: Ml,
        entryPoint: "scan_block",
        bindings: [
            u(1, 0, "src", "storage-ro", "array<u32>"),
            u(1, 1, "out", "storage", "array<u32>"),
            u(1, 2, "blockSums", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "ScanParams"),
        ],
        overrideDecls: [],
        uniforms: [Lr],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    gu = {
        id: "scan-add",
        body: Bl,
        entryPoint: "scan_add",
        bindings: [
            u(1, 0, "out", "storage", "array<u32>"),
            u(1, 1, "blockOffsets", "storage-ro", "array<u32>"),
            u(2, 0, "P", "uniform", "ScanParams"),
        ],
        overrideDecls: [],
        uniforms: [Lr],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    mu = {
        id: "histogram",
        body: kl,
        entryPoint: "histogram",
        bindings: [
            u(1, 0, "keys", "storage-ro", "array<u32>"),
            u(1, 1, "hist", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "HistParams"),
        ],
        overrideDecls: [],
        uniforms: [Vr],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    wu = {
        id: "counting-scatter",
        body: ol,
        entryPoint: "counting_scatter",
        bindings: [
            u(1, 0, "keys", "storage-ro", "array<u32>"),
            u(1, 1, "start", "storage-ro", "array<u32>"),
            u(1, 2, "cursor", "storage", "array<atomic<u32>>"),
            u(1, 3, "outIndex", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "HistParams"),
        ],
        overrideDecls: [],
        uniforms: [Vr],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    bu = {
        id: "radix-hist",
        body: Ol,
        entryPoint: "radix_hist",
        bindings: [
            u(1, 0, "keys", "storage-ro", "array<u32>"),
            u(1, 1, "hist", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "RadixParams"),
        ],
        overrideDecls: [],
        uniforms: [js],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    vu = {
        id: "radix-scatter",
        body: Nl,
        entryPoint: "radix_scatter",
        bindings: [
            u(1, 0, "keys", "storage-ro", "array<u32>"),
            u(1, 1, "vals", "storage-ro", "array<u32>"),
            u(1, 2, "offsets", "storage-ro", "array<u32>"),
            u(1, 3, "keysOut", "storage", "array<u32>"),
            u(1, 4, "valsOut", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "RadixParams"),
        ],
        overrideDecls: [],
        uniforms: [js],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    yu = {
        id: "grid-cell-key",
        body: bl,
        entryPoint: "grid_cell_key",
        bindings: [
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "S", "storage-ro", "Fa2State"),
            u(1, 2, "cellKey", "storage", "array<u32>"),
            u(1, 3, "cellVal", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [],
        uniforms: [Ue, et],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    _u = {
        id: "grid-centroid",
        body: vl,
        entryPoint: "grid_centroid",
        bindings: [
            u(1, 0, "sortedIdx", "storage-ro", "array<u32>"),
            u(1, 1, "cellStart", "storage-ro", "array<u32>"),
            u(1, 2, "pos", "storage-ro", "array<vec4f>"),
            u(1, 3, "pyramid", "storage", "array<vec4f>"),
            u(1, 4, "hubList", "storage", "array<u32>"),
            u(1, 5, "hubCounters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [],
        uniforms: [Ue],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    Pu = {
        id: "grid-centroid-hub",
        body: yl,
        entryPoint: "grid_centroid_hub",
        bindings: [
            u(1, 0, "sortedIdx", "storage-ro", "array<u32>"),
            u(1, 1, "cellStart", "storage-ro", "array<u32>"),
            u(1, 2, "pos", "storage-ro", "array<vec4f>"),
            u(1, 3, "pyramid", "storage", "array<vec4f>"),
            u(1, 4, "hubList", "storage-ro", "array<u32>"),
            u(1, 5, "hubCount", "storage-ro", "array<u32>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [],
        uniforms: [Ue],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P4",
    },
    Su = {
        id: "grid-downsample",
        body: _l,
        entryPoint: "grid_downsample",
        bindings: [u(1, 0, "pyramid", "storage", "array<vec4f>"), u(2, 0, "P", "uniform", "GridLevelParams")],
        overrideDecls: [],
        uniforms: [jn],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    Eu = {
        id: "grid-far-field",
        body: Pl,
        entryPoint: "grid_far_field",
        bindings: [
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "sortedIdx", "storage-ro", "array<u32>"),
            u(1, 2, "pyramid", "storage-ro", "array<vec4f>"),
            u(1, 3, "S", "storage-ro", "Fa2State"),
            u(1, 4, "force", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [{ name: "LAW", type: "u32", default: 0 }],
        uniforms: [Ue, et],
        needs: [],
        snippetSlots: [],
        phase: "P4",
    },
    ku = {
        id: "grid-near-field",
        body: Sl,
        entryPoint: "grid_near_field",
        bindings: [
            u(1, 0, "pos", "storage-ro", "array<vec4f>"),
            u(1, 1, "sortedIdx", "storage-ro", "array<u32>"),
            u(1, 2, "cellStart", "storage-ro", "array<u32>"),
            u(1, 3, "S", "storage", "Fa2State"),
            u(1, 4, "force", "storage", "array<f32>"),
            u(1, 5, "oldForce", "storage-ro", "array<f32>"),
            u(1, 6, "fixedMask", "storage-ro", "array<u32>"),
            u(1, 7, "partials", "storage", "array<Fa2Partial>"),
            u(2, 0, "P", "uniform", "Fa2Params"),
        ],
        overrideDecls: [
            { name: "SWING_MODE", type: "u32", default: 0 },
            { name: "STRONG_GRAVITY", type: "bool", default: !1 },
            { name: "GRAVITY_CENTER", type: "u32", default: 0 },
            { name: "LAW", type: "u32", default: 0 },
        ],
        uniforms: [Ue, et, hr],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P4",
    },
    Iu = {
        id: "compact-scatter",
        body: sl,
        entryPoint: "compact_scatter",
        bindings: [
            u(1, 0, "queue", "storage-ro", "array<u32>"),
            u(1, 1, "flags", "storage-ro", "array<u32>"),
            u(1, 2, "offsets", "storage-ro", "array<u32>"),
            u(1, 3, "out", "storage", "array<u32>"),
            u(1, 4, "outCount", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "CompactParams"),
        ],
        overrideDecls: [],
        uniforms: [dr],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Au = {
        id: "dedupe-claim",
        body: al,
        entryPoint: "dedupe_claim",
        bindings: [
            u(1, 0, "queue", "storage-ro", "array<u32>"),
            u(1, 1, "owner", "storage", "array<atomic<u32>>"),
            u(1, 2, "counters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "CompactParams"),
        ],
        overrideDecls: [],
        uniforms: [dr],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    xu = {
        id: "dedupe-filter",
        body: cl,
        entryPoint: "dedupe_filter",
        bindings: [
            u(1, 0, "queue", "storage-ro", "array<u32>"),
            u(1, 1, "owner", "storage", "array<atomic<u32>>"),
            u(1, 2, "out", "storage", "array<u32>"),
            u(1, 3, "outCount", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "CompactParams"),
        ],
        overrideDecls: [],
        uniforms: [dr],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Ru = {
        id: "frontier-finalize",
        body: wl,
        entryPoint: "frontier_finalize",
        bindings: [u(1, 0, "counters", "storage", "array<atomic<u32>>"), u(2, 0, "P", "uniform", "FrontierParams")],
        overrideDecls: [],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Du = {
        id: "advance-expand",
        body: Mc,
        entryPoint: "advance_expand",
        bindings: tt.concat(
            u(1, 0, "frontierIn", "storage-ro", "array<u32>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "edgeQueue", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ),
        overrideDecls: [],
        uniforms: [ve],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P8",
    },
    Tu = {
        id: "bfs-contract",
        body: Qc,
        entryPoint: "bfs_contract",
        bindings: [
            u(1, 0, "edgeQueue", "storage-ro", "array<u32>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "depth", "storage", "array<atomic<u32>>"),
            u(1, 3, "frontierOut", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ],
        overrideDecls: [],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Lu = {
        id: "sssp-pred",
        body: Fl,
        entryPoint: "sssp_pred",
        bindings: tt.concat(
            u(1, 0, "dist", "storage-ro", "array<u32>"),
            u(1, 1, "pred", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ),
        overrideDecls: [{ name: "MODE", type: "u32", default: 0 }],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Ou = {
        id: "bfs-fused",
        body: Zc,
        entryPoint: "bfs_fused",
        bindings: tt.concat(
            u(1, 0, "frontierIn", "storage-ro", "array<u32>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "depth", "storage", "array<atomic<u32>>"),
            u(1, 3, "frontierOut", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ),
        overrideDecls: [],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Nu = {
        id: "bfs-bottom-up",
        body: Xc,
        entryPoint: "bfs_bottom_up",
        bindings: tt.concat(
            u(1, 0, "sweepIn", "storage-ro", "array<u32>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "depth", "storage", "array<atomic<u32>>"),
            u(1, 3, "frontierOut", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ),
        overrideDecls: [],
        uniforms: [ve],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P8",
    },
    $u = {
        id: "bfs-bitset-build",
        body: Yc,
        entryPoint: "bfs_bitset_build",
        bindings: [
            u(1, 0, "frontierIn", "storage-ro", "array<u32>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "bits", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ],
        overrideDecls: [],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Cu = {
        id: "bfs-unvisited-flags",
        body: el,
        entryPoint: "bfs_unvisited_flags",
        bindings: [
            u(1, 0, "inDegree", "storage-ro", "array<u32>"),
            u(1, 1, "depth", "storage-ro", "array<u32>"),
            u(1, 2, "flags", "storage", "array<u32>"),
            u(1, 3, "counters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ],
        overrideDecls: [],
        uniforms: [ve],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P8",
    },
    Bu = {
        id: "bfs-next-degree",
        body: Jc,
        entryPoint: "bfs_next_degree",
        bindings: [
            u(1, 0, "frontier", "storage-ro", "array<u32>"),
            u(1, 1, "outDegree", "storage-ro", "array<u32>"),
            u(1, 2, "counters", "storage", "array<atomic<u32>>"),
            u(1, 3, "inDegree", "storage-ro", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ],
        overrideDecls: [],
        uniforms: [ve],
        needs: ["subgroups"],
        snippetSlots: [],
        phase: "P8",
    },
    Mu = {
        id: "sssp-relax",
        body: Wl,
        entryPoint: "sssp_relax",
        bindings: tt.concat(
            u(1, 0, "dist", "storage", "array<atomic<u32>>"),
            u(1, 1, "counters", "storage", "array<atomic<u32>>"),
            u(1, 2, "queueIn", "storage-ro", "array<u32>"),
            u(1, 3, "queueOut", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "FrontierParams"),
        ),
        overrideDecls: [],
        uniforms: [ve],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Gu = {
        id: "bf-relax",
        body: Hc,
        entryPoint: "bf_relax",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "edgeToArc", "storage-ro", "array<u32>"),
            u(1, 3, "weights", "storage-ro", "array<f32>"),
            u(1, 4, "dist", "storage", "array<atomic<u32>>"),
            u(1, 5, "flags", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "BfParams"),
        ],
        overrideDecls: [{ name: "UNDIRECTED", type: "bool", default: !1 }],
        uniforms: [qn],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    zu = {
        id: "closeness-level",
        body: tl,
        entryPoint: "closeness_level",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "inRowPtr", "storage-ro", "array<u32>"),
            u(1, 3, "inColIdx", "storage-ro", "array<u32>"),
            u(1, 4, "bits", "storage", "array<atomic<u32>>"),
            u(1, 5, "table", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "ClosenessParams"),
        ],
        overrideDecls: [],
        uniforms: [Wt],
        needs: [],
        snippetSlots: [],
        phase: "P8",
    },
    Fu = {
        id: "closeness-rowsum",
        body: rl,
        entryPoint: "closeness_rowsum",
        bindings: [
            u(1, 0, "dist", "storage-ro", "array<f32>"),
            u(1, 1, "out", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "ClosenessParams"),
        ],
        overrideDecls: [],
        uniforms: [Wt],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Wu = {
        id: "bc-finalize",
        body: Vc,
        entryPoint: "bc_finalize",
        bindings: [
            u(1, 0, "counters", "storage", "array<atomic<u32>>"),
            u(1, 1, "ends", "storage", "array<u32>"),
            u(1, 2, "S", "storage-ro", "array<u32>"),
            u(1, 3, "depthK", "storage", "array<u32>"),
            u(1, 4, "sigmaK", "storage", "array<u32>"),
            u(1, 5, "levelMax", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [{ name: "SCALED", type: "bool", default: !1 }],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Uu = {
        id: "bc-forward",
        body: jc,
        entryPoint: "bc_forward",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "S", "storage", "array<u32>"),
            u(1, 3, "ends", "storage-ro", "array<u32>"),
            u(1, 4, "counters", "storage", "array<atomic<u32>>"),
            u(1, 5, "depthK", "storage", "array<atomic<u32>>"),
            u(1, 6, "sigmaK", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [{ name: "SCALED", type: "bool", default: !1 }],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Vu = {
        id: "bc-backward",
        body: Fc,
        entryPoint: "bc_backward",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "S", "storage-ro", "array<u32>"),
            u(1, 3, "depthK", "storage-ro", "array<u32>"),
            u(1, 4, "sigmaK", "storage-ro", "array<u32>"),
            u(1, 5, "deltaK", "storage", "array<f32>"),
            u(1, 6, "levelMax", "storage-ro", "array<u32>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [{ name: "SCALED", type: "bool", default: !1 }],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    ju = {
        id: "bc-gather",
        body: Kc,
        entryPoint: "bc_gather",
        bindings: [
            u(1, 0, "deltaK", "storage-ro", "array<f32>"),
            u(1, 1, "bc", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    qu = {
        id: "bc-edge-gather",
        body: Uc,
        entryPoint: "bc_edge_gather",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "depthK", "storage-ro", "array<u32>"),
            u(1, 3, "sigmaK", "storage-ro", "array<u32>"),
            u(1, 4, "deltaK", "storage-ro", "array<f32>"),
            u(1, 5, "arcScores", "storage", "array<f32>"),
            u(1, 6, "levelMax", "storage-ro", "array<u32>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [{ name: "SCALED", type: "bool", default: !1 }],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Ku = {
        id: "bc-forward-edge",
        body: qc,
        entryPoint: "bc_forward_edge",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "S", "storage", "array<u32>"),
            u(1, 3, "ends", "storage-ro", "array<u32>"),
            u(1, 4, "counters", "storage", "array<atomic<u32>>"),
            u(1, 5, "depthK", "storage", "array<atomic<u32>>"),
            u(1, 6, "sigmaK", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [
            { name: "UNDIRECTED", type: "bool", default: !1 },
            { name: "SCALED", type: "bool", default: !1 },
        ],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Hu = {
        id: "bc-count",
        body: Wc,
        entryPoint: "bc_count",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "S", "storage-ro", "array<u32>"),
            u(1, 3, "ends", "storage-ro", "array<u32>"),
            u(1, 4, "counters", "storage", "array<atomic<u32>>"),
            u(1, 5, "depthK", "storage-ro", "array<u32>"),
            u(1, 6, "sigmaK", "storage", "array<u32>"),
            u(1, 7, "levelMax", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "BcParams"),
        ],
        overrideDecls: [],
        uniforms: [_t],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Yu = {
        id: "apsp-init",
        body: zc,
        entryPoint: "apsp_init",
        bindings: tt.concat(u(1, 0, "dist", "storage", "array<f32>"), u(2, 0, "P", "uniform", "ApspParams")),
        overrideDecls: [],
        uniforms: [Or],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Xu = {
        id: "apsp-fw",
        body: Gc,
        entryPoint: "apsp_fw",
        bindings: [u(1, 0, "dist", "storage", "array<f32>"), u(2, 0, "P", "uniform", "ApspParams")],
        overrideDecls: [{ name: "PHASE", type: "u32", default: 0 }],
        uniforms: [Or],
        needs: [],
        snippetSlots: [],
        phase: "P9",
    },
    Qu = {
        id: "coo-emit",
        body: il,
        entryPoint: "coo_emit",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "edgeWeight", "storage-ro", "array<f32>"),
            u(1, 3, "order", "storage-ro", "array<u32>"),
            u(1, 4, "outSrc", "storage", "array<u32>"),
            u(1, 5, "outDst", "storage", "array<u32>"),
            u(1, 6, "outWeight", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "CooParams"),
        ],
        overrideDecls: [
            { name: "INDEXED", type: "bool", default: !1 },
            { name: "WEIGHTED", type: "bool", default: !1 },
        ],
        uniforms: [nt],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    Zu = {
        id: "run-flags",
        body: Cl,
        entryPoint: "run_flags",
        bindings: [
            u(1, 0, "keysA", "storage-ro", "array<u32>"),
            u(1, 1, "keysB", "storage-ro", "array<u32>"),
            u(1, 2, "flags", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "CooParams"),
        ],
        overrideDecls: [],
        uniforms: [nt],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    Ju = {
        id: "coo-scatter",
        body: nl,
        entryPoint: "coo_scatter",
        bindings: [
            u(1, 0, "src", "storage-ro", "array<u32>"),
            u(1, 1, "dst", "storage-ro", "array<u32>"),
            u(1, 2, "weight", "storage-ro", "array<f32>"),
            u(1, 3, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 4, "cursors", "storage", "array<atomic<u32>>"),
            u(1, 5, "colIdx", "storage", "array<u32>"),
            u(1, 6, "outWeight", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "CooParams"),
        ],
        overrideDecls: [
            { name: "SORTED_INPUT", type: "bool", default: !1 },
            { name: "WEIGHTED", type: "bool", default: !1 },
        ],
        uniforms: [nt],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    ed = {
        id: "orient-flags",
        body: Dl,
        entryPoint: "orient_flags",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "src", "storage-ro", "array<u32>"),
            u(1, 3, "flags", "storage", "array<u32>"),
            u(2, 0, "P", "uniform", "CooParams"),
        ],
        overrideDecls: [],
        uniforms: [nt],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    td = {
        id: "tri-intersect",
        body: Ul,
        entryPoint: "tri_intersect",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "src", "storage-ro", "array<u32>"),
            u(1, 3, "counts", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "CooParams"),
        ],
        overrideDecls: [{ name: "SEARCH", type: "u32", default: 0 }],
        uniforms: [nt],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    rd = {
        id: "group-by-key-row",
        body: El,
        entryPoint: "group_by_key_row",
        bindings: [
            u(1, 0, "rowPtr", "storage-ro", "array<u32>"),
            u(1, 1, "colIdx", "storage-ro", "array<u32>"),
            u(1, 2, "weights", "storage-ro", "array<f32>"),
            u(1, 3, "keyIn", "storage-ro", "array<u32>"),
            u(1, 4, "rows", "storage-ro", "array<u32>"),
            u(1, 5, "hashRegion", "storage", "array<atomic<u32>>"),
            u(1, 6, "bestKey", "storage", "array<u32>"),
            u(1, 7, "bestScore", "storage", "array<f32>"),
            u(2, 0, "P", "uniform", "GroupParams"),
        ],
        overrideDecls: [
            { name: "TIER", type: "u32", default: 0 },
            { name: "WEIGHTED", type: "bool", default: !1 },
        ],
        uniforms: [Kn],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    sd = {
        id: "lpa-step",
        body: Al,
        entryPoint: "lpa_step",
        bindings: [
            u(1, 0, "labelsIn", "storage-ro", "array<u32>"),
            u(1, 1, "bestKey", "storage-ro", "array<u32>"),
            u(1, 2, "labelsOut", "storage", "array<u32>"),
            u(1, 3, "counters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "LpaParams"),
        ],
        overrideDecls: [],
        uniforms: [Hn],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    id = {
        id: "mst-best",
        body: xl,
        entryPoint: "mst_best",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "edgeWeight", "storage-ro", "array<f32>"),
            u(1, 3, "comp", "storage-ro", "array<u32>"),
            u(1, 4, "bestKey", "storage", "array<atomic<u32>>"),
            u(1, 5, "bestEdge", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "MstParams"),
        ],
        overrideDecls: [
            { name: "PASS", type: "u32", default: 0 },
            { name: "WEIGHTED", type: "bool", default: !1 },
        ],
        uniforms: [Nr],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    nd = {
        id: "mst-link",
        body: Rl,
        entryPoint: "mst_link",
        bindings: [
            u(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
            u(1, 1, "edgeDst", "storage-ro", "array<u32>"),
            u(1, 2, "bestEdge", "storage-ro", "array<u32>"),
            u(1, 3, "comp", "storage", "array<atomic<u32>>"),
            u(1, 4, "treeEdge", "storage", "array<u32>"),
            u(1, 5, "counters", "storage", "array<atomic<u32>>"),
            u(2, 0, "P", "uniform", "MstParams"),
        ],
        overrideDecls: [],
        uniforms: [Nr],
        needs: [],
        snippetSlots: [],
        phase: "P11",
    },
    Ci = Object.freeze({
        degree: Xl,
        reduce: Ql,
        fill: Zl,
        "segmented-reduce": Jl,
        "fa2-stats-finalize": eu,
        "fa2-attraction": tu,
        "fa2-repulsion-exact": ru,
        "fa2-speed-finalize": su,
        "fa2-integrate": iu,
        "fa2-to-scene": nu,
        "spmv-pull": ou,
        "pr-scale": au,
        "pr-finalize": cu,
        "wcc-link-sample": lu,
        "wcc-link-edges": uu,
        "wcc-compress": du,
        "wcc-sample": fu,
        "indirect-finalize": hu,
        "scan-block": pu,
        "scan-add": gu,
        histogram: mu,
        "counting-scatter": wu,
        "radix-hist": bu,
        "radix-scatter": vu,
        "grid-cell-key": yu,
        "grid-centroid": _u,
        "grid-centroid-hub": Pu,
        "grid-downsample": Su,
        "grid-far-field": Eu,
        "grid-near-field": ku,
        "compact-scatter": Iu,
        "dedupe-claim": Au,
        "dedupe-filter": xu,
        "frontier-finalize": Ru,
        "advance-expand": Du,
        "bfs-contract": Tu,
        "sssp-pred": Lu,
        "bfs-fused": Ou,
        "bfs-bottom-up": Nu,
        "bfs-bitset-build": $u,
        "bfs-unvisited-flags": Cu,
        "bfs-next-degree": Bu,
        "sssp-relax": Mu,
        "bf-relax": Gu,
        "closeness-level": zu,
        "closeness-rowsum": Fu,
        "bc-finalize": Wu,
        "bc-forward": Uu,
        "bc-backward": Vu,
        "bc-gather": ju,
        "bc-count": Hu,
        "bc-edge-gather": qu,
        "bc-forward-edge": Ku,
        "apsp-init": Yu,
        "apsp-fw": Xu,
        "coo-emit": Qu,
        "run-flags": Zu,
        "coo-scatter": Ju,
        "orient-flags": ed,
        "tri-intersect": td,
        "group-by-key-row": rd,
        "lpa-step": sd,
        "mst-best": id,
        "mst-link": nd,
    }),
    od = new Map();
function ad(r) {
    const e = Ci[r];
    if (e === void 0)
        throw new h("E_INVALID_ARGUMENT", `unknown kernel id "${r}"`, {
            argument: "id",
            value: r,
            expected: Object.keys(Ci),
        });
    return e;
}
function _(r, e, t) {
    const s = ad(r);
    return {
        id: s.id,
        body: od.get(r) ?? s.body,
        bindings: s.bindings,
        overrideDecls: s.overrideDecls,
        overrides: e ?? {},
        needs: s.needs,
        uniforms: s.uniforms,
        snippets: t,
    };
}
function Ze(r, e, t) {
    const s = r.colIdx ?? r.rowPtr,
        i = t === void 0 ? r.weights : t;
    return { rowPtr: r.rowPtr, colIdx: s, weights: i ?? s, perm: e ?? r.rowPtr };
}
function Ge(r, e, t) {
    const s = t === void 0 ? r.weights : t;
    return { USE_PERM: e !== null, HAS_WEIGHTS: s !== null };
}
const lt = 32;
function cd(r) {
    const { perm: e } = r.bindings;
    if (e === void 0)
        throw new h("E_INVALID_ARGUMENT", `the ${r.view} view has no perm binding`, {
            argument: "view",
            value: r.view,
            expected: "a view with a perm binding (degreeOrder, reverseDegreeOrder)",
        });
    const t = r.scalars.segmentOffsets;
    if (
        !(t?.length === 5 && t[0] === 0 && t.every((n, o) => Number.isInteger(n) && (o === 0 || n >= t[o - 1]))) ||
        t[4] !== e.size / 4
    )
        throw new h(
            "E_INVALID_ARGUMENT",
            `the ${r.view} view's segmentOffsets are not five ascending numbers ending at the row count`,
            {
                argument: "view",
                value: t === void 0 ? null : Array.from(t),
                expected: `[0, hiEnd, midEnd, lowEnd, ${e.size / 4}] ascending`,
            },
        );
    const i = [t[0], t[1], t[2], t[3], t[4]];
    return Object.freeze({ perm: e, segmentOffsets: i });
}
function pr(r, e) {
    const t = r.rowPtr.size;
    if (t < 4 || t % 4 !== 0)
        throw new h("E_INVALID_ARGUMENT", `${e}: a rowPtr binding of ${t} bytes is not 4(n + 1)`, {
            argument: "core.rowPtr",
            value: t,
            expected: "a positive multiple of 4",
        });
    return t / 4 - 1;
}
function jr(r) {
    return r.colIdx === null ? 0 : r.colIdx.size / 4;
}
function $r(r, e, t) {
    const s = r.arcBuffers?.[e][t.bufferIndex];
    if (s === void 0)
        throw new h("E_INVALID_ARGUMENT", `windowBinding: the core has no window buffers of ${e}`, {
            argument: "core",
            value: e,
            expected: "a windowed core whose plan uploaded the array",
        });
    return { buffer: s, offset: t.offset, size: 4 * (t.end - t.start), window: t };
}
function As(r) {
    return r.windows === null
        ? [{ arcBase: 0, arcEnd: jr(r), core: r }]
        : r.windows.map((e, t, s) => ({
              arcBase: e.start,
              arcEnd: t + 1 < s.length ? s[t + 1].start : e.end,
              core: { ...r, colIdx: $r(r, "colIdx", e), weights: r.weights === null ? null : $r(r, "weights", e) },
          }));
}
function ld(r, e) {
    if (r.plan === "windowed" || r.windows !== null)
        throw new h("E_UNSUPPORTED", `${e}: windowed cores are not executed by the pull`, { feature: `${e}.windowed` });
}
function Pt(r, e, t, s) {
    if (r.plan === "windowed")
        throw new h(
            "E_TOO_LARGE",
            `${s}: the arc arrays need a windowed upload (${r.windows?.length ?? 0} windows), which ${s} does not execute (DEP-P4-B)`,
            { needed: 4 * e, limit: t, path: "windowed", algorithm: s },
        );
}
function qr(r, e) {
    const { rowPtr: t } = r.bindings;
    if (t === void 0)
        throw new h("E_INVALID_ARGUMENT", `the ${r.view} view has no rowPtr binding`, {
            argument: "view",
            value: r.view,
            expected: "a view with a rowPtr binding (reverse)",
        });
    const s = r.bindings.colIdx === void 0 || r.bindings.colIdx.size === 0 ? null : r.bindings.colIdx,
        i = r.bindings.weights === void 0 || r.bindings.weights.size === 0 ? null : r.bindings.weights,
        n = s === null ? 0 : s.size / 4;
    if (n !== e)
        throw new h("E_INVALID_ARGUMENT", `the ${r.view} view binds ${n} arcs but its arcCount scalar says ${e}`, {
            argument: "arcCount",
            value: e,
            expected: n,
        });
    return Object.freeze({
        serial: -1,
        plan: "perArray",
        rowPtr: t,
        colIdx: s,
        weights: i,
        arcToEdge: null,
        edgeToArc: null,
        windows: null,
        arcBuffers: null,
        hasWeights: i !== null,
    });
}
class qs {
    constructor(e, t, s, i) {
        if (
            ((this.overruns = 0),
            (this.next = 0),
            (this.dirtyLo = -1),
            (this.dirtyHi = -1),
            (this.destroyed = !1),
            !Number.isInteger(s) || s < 1)
        )
            throw new h("E_INVALID_ARGUMENT", `UniformRing "${i}": slots must be a positive integer, got ${s}`, {
                argument: "slots",
                value: s,
                expected: "an integer >= 1",
            });
        ((this.device = e),
            (this.allocator = t),
            (this.slots = s),
            (this.label = i),
            (this.shadow = new ArrayBuffer(s * Ye)),
            (this.view = new DataView(this.shadow)),
            (this.dirty = new Uint8Array(s)),
            (this.buffer = t.createBuffer({ label: i, size: s * Ye, usage: ie.UNIFORM | ie.COPY_DST })));
    }
    binding(e) {
        return (
            this.assertLive(),
            this.assertFits(e),
            { buffer: this.buffer, offset: 0, size: e.byteLength, window: null }
        );
    }
    offsetOf(e) {
        return (this.checkSlot(e), e * Ye);
    }
    reserve(e) {
        if ((this.assertLive(), !Number.isInteger(e) || e < 1 || e > this.slots))
            throw new h(
                "E_INVALID_ARGUMENT",
                `UniformRing "${this.label}": cannot reserve ${e} of ${this.slots} slots`,
                { argument: "count", value: e, expected: `an integer in [1, ${this.slots}]` },
            );
        this.next + e > this.slots && (this.next = 0);
        const t = this.next;
        return ((this.next += e), this.dirty.subarray(t, t + e).includes(1) && (this.overruns += 1), t);
    }
    write(e, t, s) {
        (this.checkSlot(e),
            this.assertFits(t),
            t.write(this.view, s, e * Ye),
            (this.dirty[e] = 1),
            (this.dirtyLo < 0 || e < this.dirtyLo) && (this.dirtyLo = e),
            e > this.dirtyHi && (this.dirtyHi = e));
    }
    flush() {
        if ((this.assertLive(), this.dirtyLo < 0)) return;
        const e = this.dirtyLo * Ye,
            t = (this.dirtyHi + 1) * Ye;
        (this.device.queue.writeBuffer(this.buffer, e, this.shadow, e, t - e),
            this.dirty.fill(0),
            (this.dirtyLo = -1),
            (this.dirtyHi = -1));
    }
    destroy() {
        this.destroyed || ((this.destroyed = !0), this.allocator.destroy(this.buffer));
    }
    assertLive() {
        if (this.destroyed)
            throw new h("E_DISPOSED", `UniformRing "${this.label}" is destroyed`, { label: this.label });
    }
    checkSlot(e) {
        if ((this.assertLive(), !Number.isInteger(e) || e < 0 || e >= this.slots))
            throw new h("E_INVALID_ARGUMENT", `UniformRing "${this.label}": slot ${e} is outside [0, ${this.slots})`, {
                argument: "slot",
                value: e,
                expected: `an integer in [0, ${this.slots})`,
            });
    }
    assertFits(e) {
        if (e.byteLength > Ye)
            throw new h(
                "E_INVALID_ARGUMENT",
                `UniformRing "${this.label}": block ${e.name} is ${e.byteLength} bytes, a slot holds ${Ye}`,
                { argument: "block", value: e.name, expected: `byteLength <= ${Ye}` },
            );
    }
}
const ud = 4294967295;
async function Dt(r) {
    const e = await r.pipelines.kernel(_("scan-block")),
        t = await r.pipelines.kernel(_("scan-add")),
        s = r.scratch(4, "scan/zero");
    return (
        r.device.queue.writeBuffer(s, 0, new Uint32Array(1)),
        new fd(r, e, t, { buffer: s, offset: 0, size: 4, window: null })
    );
}
function dd(r, e, t) {
    if (!Number.isSafeInteger(e) || e < 0 || e > ud)
        throw new h("E_INVALID_ARGUMENT", "scan: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: e,
        });
    if (r.size < 4 * e)
        throw new h("E_INVALID_ARGUMENT", "scan: src is smaller than 4 x count bytes", {
            argument: "src",
            value: r.size,
            expected: 4 * e,
        });
    if (t.size < 4 * e)
        throw new h("E_INVALID_ARGUMENT", "scan: out is smaller than 4 x count bytes", {
            argument: "out",
            value: t.size,
            expected: 4 * e,
        });
}
class fd {
    constructor(e, t, s, i) {
        ((this.dispatches = 0), (this.scope = e), (this.block = t), (this.add = s), (this.zero = i));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s, i) {
        if ((dd(t, s, i), s === 0)) return ((this.dispatches = 0), { binding: this.zero, index: 0 });
        const n = this.scope.workgroupSize,
            o = [];
        let a = t,
            c = i,
            l = s;
        for (;;) {
            const f = Math.ceil(l / n),
                p = z(l, n, this.scope.caps),
                g = Us(p),
                m = this.scratch(g, `scan/sums${o.length}`);
            if ((o.push({ input: a, output: c, count: l, plan: p, sums: m }), f === 1)) break;
            ((a = m), (c = this.scratch(g, `scan/offsets${o.length}`)), (l = f));
        }
        for (const f of o) {
            const p = this.scope.params(Lr, { count: f.count, pad0: 0, pad1: 0, pad2: 0 }),
                g = this.block.bind({ src: f.input, out: f.output, blockSums: f.sums, P: p.binding });
            this.block.dispatch(e, g, f.plan, [p.offset]);
        }
        for (let f = o.length - 2; f >= 0; f--) {
            const p = o[f],
                g = this.scope.params(Lr, { count: p.count, pad0: 0, pad1: 0, pad2: 0 }),
                m = this.add.bind({ out: p.output, blockOffsets: o[f + 1].output, P: g.binding });
            this.add.dispatch(e, m, p.plan, [g.offset]);
        }
        return ((this.dispatches = 2 * o.length - 1), { binding: o[o.length - 1].sums, index: 0 });
    }
    scratch(e, t) {
        const s = 4 * e;
        return { buffer: this.scope.scratch(s, t), offset: 0, size: s, window: null };
    }
}
const Cr = 3735928559,
    Bi = 32,
    hd = 8,
    ls = new WeakMap();
function Yn(r) {
    return r + 1;
}
function pd(r, e, t) {
    let s = 0;
    for (let i = 0; i < t; i++) {
        const n = r[i];
        if (n !== s) return { where: `out[${String(i)}]`, expected: s, actual: n, poison: n === Cr };
        s = (s + Yn(i)) >>> 0;
    }
    return e !== s ? { where: "total", expected: s, actual: e, poison: e === Cr } : null;
}
function Mi(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
async function gd(r) {
    const e = performance.now(),
        t = r.workgroupSize,
        s = Bi * t + 1,
        i = 4 * s,
        n = r.pool.lease(),
        o = new qs(r.device, r.allocator, hd, "device-check/ring");
    try {
        const a = {
                device: r.device,
                caps: r.caps,
                pipelines: r.pipelines,
                pool: r.pool,
                workgroupSize: t,
                scratch: (y, k) => n.storage(y, `device-check/${k}`),
                params(y, k) {
                    const S = o.reserve(1);
                    return (o.write(S, y, k), { binding: o.binding(y), offset: o.offsetOf(S) });
                },
            },
            c = await Dt(a),
            l = n.storage(i, "device-check/src"),
            d = n.storage(i, "device-check/out"),
            f = new Uint32Array(s);
        for (let y = 0; y < s; y++) f[y] = Yn(y);
        (r.device.queue.writeBuffer(l, 0, f), r.device.queue.writeBuffer(d, 0, new Uint32Array(s).fill(Cr)));
        const p = r.device.createCommandEncoder({ label: "device-check" }),
            g = p.beginComputePass({ label: "device-check" }),
            m = c.record(g, Mi(l, i), s, Mi(d, i));
        (g.end(), o.flush(), r.device.queue.submit([p.finish()]));
        const b = new Uint32Array(await r.readback.read(d, i)),
            w = new Uint32Array(await r.readback.read(m.binding.buffer, 4, void 0, m.binding.offset + 4 * m.index)),
            v = pd(b, w[0], s);
        return {
            check: "exclusive-scan",
            ok: v === null,
            workgroupSize: t,
            count: s,
            blocks: Bi,
            ms: performance.now() - e,
            vendor: r.caps.vendor,
            architecture: r.caps.architecture,
            description: r.caps.description,
            mismatch: v,
        };
    } finally {
        (o.destroy(), n.release());
    }
}
function Xn(r) {
    const e = ls.get(r.device);
    if (e !== void 0) return e;
    const t = gd(r).catch((s) => {
        throw (ls.delete(r.device), s);
    });
    return (ls.set(r.device, t), t);
}
async function Ve(r) {
    const e = await Xn(r),
        { mismatch: t } = e;
    if (t === null) return;
    const s = { vendor: e.vendor, architecture: e.architecture, device: r.caps.device, description: e.description },
        i =
            e.architecture === "warp"
                ? "this is the Microsoft Basic Render Driver; the Microsoft.Direct3D.WARP redistributable (1.0.21 or newer) beside the host executable computes it correctly"
                : void 0,
        n = t.poison
            ? `${t.where} was never written (the ${String(Cr)} the check wrote beforehand survived the dispatch)`
            : `${t.where} came back as ${String(t.actual)} where ${String(t.expected)} was required`,
        o = `this device computes multi-workgroup shaders incorrectly: an exclusive scan of ${String(e.count)} known numbers is wrong -- ${n}. Refusing to run: every number this package computed here would be unreliable. adapter: ${s.vendor}/${s.architecture} "${s.description}"`;
    throw new h("E_DEVICE_INCORRECT", i === void 0 ? o : `${o}. ${i}`, {
        check: e.check,
        where: t.where,
        expected: t.expected,
        actual: t.actual,
        poison: t.poison,
        count: e.count,
        blocks: e.blocks,
        workgroupSize: e.workgroupSize,
        adapter: s,
        ...(i === void 0 ? {} : { hint: i }),
    });
}
function je(r, e, t) {
    const s = r.pool.lease(),
        i = new qs(r.device, r.allocator, t, `${e}/ring`);
    return {
        device: r.device,
        caps: r.caps,
        pipelines: r.pipelines,
        pool: r.pool,
        workgroupSize: r.workgroupSize,
        scratch: (n, o) => s.storage(n, `${e}/${o}`),
        params(n, o) {
            const a = i.reserve(1);
            return (i.write(a, n, o), { binding: i.binding(n), offset: i.offsetOf(a) });
        },
        flush: () => {
            i.flush();
        },
        dispose() {
            (i.destroy(), s.release());
        },
        ringOverruns: () => i.overruns,
    };
}
async function Kr(r) {
    const e = await r.pipelines.kernel(_("compact-scatter")),
        t = await r.pipelines.kernel(_("dedupe-claim")),
        s = await r.pipelines.kernel(_("dedupe-filter")),
        i = await Dt(r);
    return new bd(r, e, t, s, i);
}
function Qn(r, e) {
    if (!Number.isSafeInteger(e) || e < 0 || e > ye)
        throw new h("E_INVALID_ARGUMENT", `${r}: count must be a non-negative integer below 2^32`, {
            argument: "count",
            value: e,
        });
}
function lr(r, e, t, s) {
    if (t.size < 4 * s)
        throw new h("E_INVALID_ARGUMENT", `${r}: ${e} is smaller than 4 x ${s} bytes`, {
            argument: e,
            value: t.size,
            expected: 4 * s,
        });
}
function xs(r, e, t, s) {
    if (!Number.isSafeInteger(t) || t < 0 || 4 * (t + 1) > s.size)
        throw new h("E_INVALID_ARGUMENT", `${r}: ${e} ${t} is outside the block`, {
            argument: e,
            value: t,
            expected: `0 <= ${e} < ${Math.floor(s.size / 4)}`,
        });
}
function md(r) {
    (Qn("compact", r.count),
        lr("compact", "queue", r.queue, r.count),
        lr("compact", "flags", r.flags, r.count),
        lr("compact", "out", r.out, r.count),
        xs("compact", "outIndex", r.outIndex, r.outCount));
}
function wd(r) {
    if (
        (Qn("dedupe", r.count),
        lr("dedupe", "queue", r.queue, r.count),
        lr("dedupe", "out", r.out, Math.min(r.count, Math.floor(r.owner.size / 4))),
        xs("dedupe", "outIndex", r.outIndex, r.outCount),
        r.countIndex !== ye)
    ) {
        if ((xs("dedupe", "countIndex", r.countIndex, r.counters), r.countIndex === r.outIndex))
            throw new h("E_INVALID_ARGUMENT", "dedupe: countIndex must not be the output word outIndex", {
                argument: "countIndex",
                value: r.countIndex,
            });
        if (
            r.counters.buffer !== r.outCount.buffer ||
            r.counters.offset !== r.outCount.offset ||
            r.counters.size !== r.outCount.size
        )
            throw new h(
                "E_INVALID_ARGUMENT",
                "dedupe: counters must be the same range as outCount when countIndex names a device word",
                { argument: "counters", value: r.counters.size, expected: r.outCount.size },
            );
    }
}
class bd {
    constructor(e, t, s, i, n) {
        ((this.dispatches = 0),
            (this.scope = e),
            (this.scatter = t),
            (this.claim = s),
            (this.filter = i),
            (this.scan = n));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t) {
        if ((md(t), t.count === 0)) {
            this.dispatches = 0;
            return;
        }
        const s = 4 * t.count,
            i = { buffer: this.scope.scratch(s, "compact/offsets"), offset: 0, size: s, window: null };
        this.scan.record(e, t.flags, t.count, i);
        const n = this.scope.params(dr, { count: t.count, outIndex: t.outIndex, countIndex: ye, stride: 0 }),
            o = this.scatter.bind({
                queue: t.queue,
                flags: t.flags,
                offsets: i,
                out: t.out,
                outCount: t.outCount,
                P: n.binding,
            });
        (this.scatter.dispatch(e, o, z(t.count, this.scope.workgroupSize, this.scope.caps), [n.offset]),
            (this.dispatches = this.scan.lastDispatches + 1));
    }
    recordDedupe(e, t) {
        if ((wd(t), t.count === 0)) {
            this.dispatches = 0;
            return;
        }
        const s = Oe(t.count, this.scope.workgroupSize, this.scope.caps),
            i = this.bindDedupe(t, s.stride ?? this.scope.workgroupSize);
        (this.claim.dispatch(e, i.claim, s, [i.offset]),
            this.filter.dispatch(e, i.filter, s, [i.offset]),
            (this.dispatches = 2));
    }
    bindDedupe(e, t) {
        const s = this.scope.params(dr, { count: e.count, outIndex: e.outIndex, countIndex: e.countIndex, stride: t });
        return {
            claim: this.claim.bind({ queue: e.queue, owner: e.owner, counters: e.counters, P: s.binding }),
            filter: this.filter.bind({
                queue: e.queue,
                owner: e.owner,
                out: e.out,
                outCount: e.outCount,
                P: s.binding,
            }),
            offset: s.offset,
        };
    }
}
const st = Object.freeze({
    frontierCount: 0,
    nextFrontierCount: 1,
    frontierDegreeSum: 2,
    prevFrontierCount: 3,
    prevDegreeSum: 4,
    unvisitedCount: 5,
    unvisitedDegreeSum: 6,
    unvisitedListLen: 7,
    edgeCount: 8,
    edgeCountUnclamped: 9,
    overflowLevels: 10,
    level: 11,
    visitedCount: 12,
    switches: 13,
    direction: 14,
    done: 15,
    arcsScanned: 16,
    fusedLevels: 17,
    twoPhaseLevels: 18,
    bottomUpLevels: 19,
    farCount: 20,
    nextFarCount: 21,
    thresholdBits: 22,
    deltaBits: 23,
    path: 24,
    nextDegreeSum: 25,
    stackTop: 26,
    sigmaOverflow: 27,
});
function Zn(r) {
    const e = {};
    for (const [t, s] of Object.entries(r)) s !== void 0 && (e[t] = s);
    return e;
}
const Gi = 3;
function zi(r, e) {
    if (!Number.isSafeInteger(e) || e < 0)
        throw new h("E_INVALID_ARGUMENT", `frontier: ${r} must be a non-negative integer`, {
            argument: r,
            value: e,
            expected: "a non-negative integer",
        });
}
class vd {
    constructor(e, t, s, i, n) {
        ((this.sideIndex = 0),
            (this.vertices = e),
            (this.counters = t),
            (this.edgeQueue = s),
            (this.edgeCapacity = i),
            (this.n = n));
    }
    get side() {
        return this.sideIndex;
    }
    get input() {
        return this.sideIndex === 0 ? this.vertices[0] : this.vertices[1];
    }
    get output() {
        return this.sideIndex === 0 ? this.vertices[1] : this.vertices[0];
    }
    swap() {
        this.sideIndex = this.sideIndex === 0 ? 1 : 0;
    }
    reset(e, t, s) {
        if (!Number.isInteger(t) || t < 0 || t >= this.n)
            throw new h("E_INVALID_ARGUMENT", `frontier: source ${t} is outside [0, ${this.n})`, {
                argument: "source",
                value: t,
                expected: `an integer in [0, ${this.n})`,
            });
        const i = new ArrayBuffer(Be.byteLength);
        (Be.write(new DataView(i), Zn(s)),
            (this.sideIndex = 0),
            e.writeBuffer(this.counters.buffer, this.counters.offset, i),
            e.writeBuffer(this.vertices[0].buffer, this.vertices[0].offset, Uint32Array.of(t)));
    }
}
async function Jn(r, e, t, s) {
    (zi("n", e), zi("arcCount", t));
    const i = s ?? Math.max(1, Math.min(t, Math.floor(r.caps.limits.maxStorageBufferBindingSize / 4)));
    if (!Number.isSafeInteger(i) || i < 1 || i > ye)
        throw new h("E_INVALID_ARGUMENT", "frontier: edgeCapacity must be an integer >= 1", {
            argument: "edgeCapacity",
            value: i,
            expected: "an integer in [1, 2^32)",
        });
    const n = await r.pipelines.kernel(_("frontier-finalize")),
        o = 4 * Math.max(1, e),
        a = [
            { buffer: r.scratch(o, "frontier/vertices-0"), offset: 0, size: o, window: null },
            { buffer: r.scratch(o, "frontier/vertices-1"), offset: 0, size: o, window: null },
        ],
        c = { buffer: r.scratch(Be.byteLength, "frontier/counters"), offset: 0, size: Be.byteLength, window: null },
        l = { buffer: r.scratch(4 * i, "frontier/edge-queue"), offset: 0, size: 4 * i, window: null },
        d = new vd(a, c, l, i, e);
    return new yd(r, n, d);
}
class yd {
    constructor(e, t, s) {
        ((this.scope = e), (this.kernel = t), (this.frontier = s));
    }
    recordFinalize(e, t, s, i) {
        if (!Number.isInteger(s) || s < 0 || s >= ue)
            throw new h("E_INVALID_ARGUMENT", `frontier: level ${s} is outside the submit`, {
                argument: "level",
                value: s,
                expected: `an integer in [0, ${ue})`,
            });
        if (!Number.isInteger(t) || t < 0 || t > Gi)
            throw new h("E_INVALID_ARGUMENT", `frontier: role ${t} is not a finalize role`, {
                argument: "role",
                value: t,
                expected: `an integer in [0, ${Gi}]`,
            });
        const { scope: n, frontier: o } = this,
            a = n.params(ve, { ...Zn(i), role: t, wg: n.workgroupSize, edgeCapacity: o.edgeCapacity, n: o.n }),
            c = this.kernel.bind({ counters: o.counters, P: a.binding });
        this.kernel.dispatch(e, c, z(1, n.workgroupSize, n.caps), [a.offset]);
    }
}
async function _d(r, e) {
    const t = await r.pipelines.kernel(_("advance-expand", Ge(e, null)));
    return new Pd(r, e, t);
}
class Pd {
    constructor(e, t, s) {
        ((this.scope = e), (this.kernel = s), (this.windows = As(t)), (this.n = pr(t, "advance")));
    }
    record(e, t) {
        if (t.n !== this.n)
            throw new h("E_INVALID_ARGUMENT", `advance: the frontier holds ${t.n} vertices, the core ${this.n} rows`, {
                argument: "frontier",
                value: t.n,
                expected: this.n,
            });
        const { scope: s } = this,
            i = Oe(t.n, s.workgroupSize, s.caps);
        for (const n of this.windows) {
            const o = s.params(ve, {
                    wg: s.workgroupSize,
                    edgeCapacity: t.edgeCapacity,
                    n: t.n,
                    arcBase: n.arcBase,
                    arcEnd: n.arcEnd,
                    stride: i.stride ?? s.workgroupSize,
                }),
                a = this.kernel.bind({
                    ...Ze(n.core, null),
                    frontierIn: t.input,
                    counters: t.counters,
                    edgeQueue: t.edgeQueue,
                    P: o.binding,
                });
            this.kernel.dispatch(e, a, i, [o.offset]);
        }
    }
}
const Fi = 8;
function Hr(r, e) {
    return 4 * Rr * Math.ceil(r / e);
}
async function Ks(r) {
    const e = await r.pipelines.kernel(_("radix-hist")),
        t = await r.pipelines.kernel(_("radix-scatter")),
        s = await Dt(r);
    return new Ed(r, e, t, s);
}
function Lt(r, e, t) {
    if (e.size < t)
        throw new h("E_INVALID_ARGUMENT", `radixSort: ${r} is smaller than ${t} bytes`, {
            argument: r,
            value: e.size,
            expected: t,
        });
}
function Sd(r, e, t, s, i, n) {
    if (s !== 8 && s !== 16 && s !== 24 && s !== 32)
        throw new h("E_INVALID_ARGUMENT", "radixSort: bits must be 8, 16, 24 or 32", {
            argument: "bits",
            value: s,
            expected: [8, 16, 24, 32],
        });
    if (!Number.isSafeInteger(t) || t < 0 || t > ye)
        throw new h("E_INVALID_ARGUMENT", "radixSort: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: t,
        });
    const o = 4 * t;
    (Lt("keys", r, o), Lt("vals", e, o), Lt("scratch.keys", i.keys, o), Lt("scratch.vals", i.vals, o));
    const a = Hr(t, n);
    (Lt("scratch.hist", i.hist, a), Lt("scratch.offsets", i.offsets, a));
}
class Ed {
    constructor(e, t, s, i) {
        ((this.dispatches = 0), (this.scope = e), (this.hist = t), (this.scatter = s), (this.scan = i));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s, i, n, o) {
        const a = this.scope.workgroupSize;
        if ((Sd(t, s, i, n, o, a), i === 0)) return ((this.dispatches = 0), { keys: t, vals: s });
        const c = Math.ceil(i / a),
            l = z(i, a, this.scope.caps),
            d = Rr * c,
            f = 4 * d,
            p = { ...o.hist, size: f },
            g = { ...o.offsets, size: f };
        let m = { keys: t, vals: s },
            b = { keys: o.keys, vals: o.vals },
            w = 0;
        const v = n / Fi;
        for (let y = 0; y < v; y++) {
            const k = this.scope.params(js, { count: i, shift: Fi * y, groups: c, pad0: 0 }),
                S = this.hist.bind({ keys: m.keys, hist: p, P: k.binding });
            (this.hist.dispatch(e, S, l, [k.offset]), this.scan.record(e, p, d, g));
            const P = this.scatter.bind({
                keys: m.keys,
                vals: m.vals,
                offsets: g,
                keysOut: b.keys,
                valsOut: b.vals,
                P: k.binding,
            });
            (this.scatter.dispatch(e, P, l, [k.offset]), (w += 2 + this.scan.lastDispatches), ([m, b] = [b, m]));
        }
        return ((this.dispatches = w), m);
    }
}
const ke = "breadthFirstSearch",
    kd = 128;
function Id(r, e) {
    return Math.max((5 + 4 * r) * e + 16, Ad + r);
}
const Ad = 34;
function xd(r) {
    return r === void 0 || Number.isNaN(r) || r >= ye ? ye : Math.max(0, Math.ceil(r));
}
function Rd(r, e) {
    if (r === void 0) return null;
    if (r instanceof Uint32Array && r.length === e && r.buffer instanceof ArrayBuffer) return r;
    throw new h("E_INVALID_ARGUMENT", `${ke}: dest must be a Uint32Array of length ${e} over an ArrayBuffer`, {
        argument: "dest",
        value: `${r.constructor.name}(${r.length})`,
        expected: `Uint32Array(${e}) over an ArrayBuffer`,
    });
}
function Ke(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
function Wi(r, e, t) {
    const { bindings: s } = r.residency.view(e, t),
        { [t]: i } = s;
    if (i === void 0)
        throw new h("E_VALIDATION", `${ke}: the ${t} view has no ${t} binding`, {
            label: `${ke}/${t}`,
            message: `the ${t} view has no ${t} binding`,
        });
    return i;
}
function Ui(r) {
    return new h("E_ABORTED", `${ke}: the signal was aborted`, r === void 0 ? {} : { batchId: r });
}
function rr(r, e) {
    const t = r[e];
    if (typeof t != "number")
        throw new h("E_VALIDATION", `${ke}: counters.${e} did not decode to a number`, {
            label: `${ke}/counters`,
            message: `the field ${e} did not decode to a number`,
        });
    return t;
}
async function eo(r, e, t, s, i) {
    (r.assertReady(), await Ve(r));
    const n = e.nodeCount;
    if (!Number.isInteger(t) || t < 0 || t >= n)
        throw new h("E_INVALID_ARGUMENT", `${ke}: source ${t} is outside [0, ${n})`, {
            argument: "source",
            value: t,
            expected: `an integer in [0, ${n})`,
        });
    const o = i.levelsPerSubmit ?? ue;
    if (!Number.isInteger(o) || o < 1 || o > ue)
        throw new h("E_INVALID_ARGUMENT", `${ke}: levelsPerSubmit must be an integer in [1, ${ue}]`, {
            argument: "levelsPerSubmit",
            value: o,
            expected: `an integer in [1, ${ue}]`,
        });
    const a = Rd(s?.dest, n),
        c = xd(s?.maxDepth),
        l = i.predKind ?? 1;
    if (s?.signal?.aborted) throw Ui();
    const d = r.residency.core(e),
        f = As(d);
    if (e.directed && 4 * e.arcCount > r.caps.limits.maxStorageBufferBindingSize)
        throw new h(
            "E_TOO_LARGE",
            `${ke}: the reverse adjacency of a directed snapshot (${4 * e.arcCount} bytes) needs arc windows, which no view executes (spec 4.3); the bottom-up sweep binds it whole`,
            {
                needed: 4 * e.arcCount,
                limit: r.caps.limits.maxStorageBufferBindingSize,
                path: "windowed",
                algorithm: ke,
            },
        );
    const p = e.directed ? qr(r.residency.view(e, "reverse"), e.arcCount) : d,
        g = As(p),
        m = Wi(r, e, "outDegree"),
        b = Wi(r, e, "inDegree"),
        w = je(r, ke, Id(f.length, o));
    i.onScope?.(w);
    try {
        const v = 4 * n,
            y = r.workgroupSize,
            k = Ke(w.scratch(v, "depth"), v),
            S = Math.ceil(n / 64) * 64,
            P = Math.ceil(n / 32),
            E = 4 * (S + P),
            A = Ke(w.scratch(E, "sweep-in"), E),
            D = { buffer: A.buffer, offset: 0, size: v, window: null },
            $ = { buffer: A.buffer, offset: 4 * S, size: 4 * P, window: null },
            T = Ke(w.scratch(v, "unvisited-flags"), v),
            x = Ke(w.scratch(v, "iota"), v),
            L = Ke(w.scratch(4, "compact-count"), 4);
        await r.allocator.check();
        const I = await Jn(w, n, e.arcCount, i.edgeCapacity),
            C = await _d(w, d),
            N = await Kr(w),
            R = await r.pipelines.kernel(_("bfs-contract")),
            O = await r.pipelines.kernel(_("bfs-fused", Ge(d, null))),
            B = await r.pipelines.kernel(_("bfs-bitset-build")),
            F = await r.pipelines.kernel(_("bfs-bottom-up", Ge(p, null))),
            M = await r.pipelines.kernel(_("bfs-unvisited-flags")),
            X = await r.pipelines.kernel(_("bfs-next-degree")),
            K = await r.pipelines.kernel(_("sssp-pred", { ...Ge(d, null), MODE: 1 })),
            q = await r.pipelines.kernel(_("fill")),
            j = await Ks(w),
            { frontier: G } = I,
            { counters: W } = G,
            { queue: H } = r.device,
            Q = z(n, y, r.caps),
            V = Oe(Math.max(n, G.edgeCapacity), y, r.caps),
            U = Oe(n, y, r.caps),
            oe = Oe(n, y, r.caps, kd),
            te = Oe(n * y, y, r.caps),
            de = z(P, y, r.caps),
            pe = (Pe, Se, pt, Zr) => {
                const vr = w.params(Ae, { count: n, value: pt, mode: Zr, pad0: 0 });
                q.dispatch(Pe, q.bind({ dst: Se, P: vr.binding }), Q, [vr.offset]);
            },
            ge = Oe(n, y, r.caps),
            ce = (Pe) => {
                const Se = w.params(ve, { wg: y, n, stride: ge.stride ?? n }),
                    pt = M.bind({ inDegree: b, depth: k, flags: T, counters: W, P: Se.binding });
                (M.dispatch(Pe, pt, ge, [Se.offset]),
                    N.record(Pe, { queue: x, flags: T, count: n, out: D, outCount: L, outIndex: 0 }));
            },
            xe = (Pe) => (w.flush(), Pe.submit()),
            ae = new ne(r, `${ke}/setup`),
            Y = ae.pass("fill");
        (pe(Y, k, dt, 0),
            pe(Y, x, 0, 1),
            ae.endPass(),
            await xe(ae).readback,
            r.assertReady(),
            H.writeBuffer(k.buffer, k.offset + 4 * t, Uint32Array.of(0)),
            G.reset(H, t, { nextFrontierCount: 1, level: ye }));
        const Z = {
            mode: { auto: 0, "top-down": 1, "bottom-up": 2 }[i.direction ?? "auto"],
            alpha: i.alpha ?? ia,
            beta: i.beta ?? na,
            fusedMax: i.fusedMax ?? sa,
            maxDepth: c,
        };
        let we = 0,
            me = 0;
        for (;;) {
            H.writeBuffer(W.buffer, W.offset + 4 * st.unvisitedCount, new Uint32Array(3));
            const Pe = new ne(r, `${ke}/levels`),
                Se = Pe.pass("bfs");
            ce(Se);
            const pt = w.params(Ae, { count: P, value: 0, mode: 0, pad0: 0 }),
                Zr = q.bind({ dst: $, P: pt.binding });
            for (let gt = 0; gt < o; gt++) {
                (I.recordFinalize(Se, 0, gt, { ...Z, firstOfSubmit: Math.min(gt, 1) }),
                    C.record(Se, G),
                    I.recordFinalize(Se, 1, gt, Z));
                const Tt = w.params(ve, {
                        wg: y,
                        n,
                        edgeCapacity: G.edgeCapacity,
                        arcBase: 0,
                        arcEnd: e.arcCount,
                        bitsBase: S,
                        stride: V.stride ?? y,
                    }),
                    Jr = R.bind({
                        edgeQueue: G.edgeQueue,
                        counters: W,
                        depth: k,
                        frontierOut: G.output,
                        P: Tt.binding,
                    });
                R.dispatch(Se, Jr, V, [Tt.offset]);
                for (const St of f) {
                    const er = w.params(ve, {
                            wg: y,
                            n,
                            edgeCapacity: G.edgeCapacity,
                            arcBase: St.arcBase,
                            arcEnd: St.arcEnd,
                            stride: te.x * te.y,
                        }),
                        es = O.bind({
                            ...Ze(St.core, null),
                            frontierIn: G.input,
                            counters: W,
                            depth: k,
                            frontierOut: G.output,
                            P: er.binding,
                        });
                    O.dispatch(Se, es, te, [er.offset]);
                }
                q.dispatch(Se, Zr, de, [pt.offset]);
                const No = B.bind({ frontierIn: G.input, counters: W, bits: A, P: Tt.binding });
                B.dispatch(Se, No, V, [Tt.offset]);
                for (const St of g) {
                    const er = w.params(ve, {
                            wg: y,
                            n,
                            arcBase: St.arcBase,
                            arcEnd: St.arcEnd,
                            bitsBase: S,
                            stride: U.stride ?? y,
                        }),
                        es = F.bind({
                            ...Ze(St.core, null),
                            sweepIn: A,
                            counters: W,
                            depth: k,
                            frontierOut: G.output,
                            P: er.binding,
                        });
                    F.dispatch(Se, es, U, [er.offset]);
                }
                const li = w.params(ve, { wg: y, n, stride: oe.stride ?? y }),
                    $o = X.bind({ frontier: G.output, outDegree: m, inDegree: b, counters: W, P: li.binding });
                (X.dispatch(Se, $o, oe, [li.offset]), G.swap());
            }
            Pe.endPass();
            const vr = Pe.readback(W.buffer, W.offset + 4 * st.done, 4),
                yr =
                    i.onLevel === void 0
                        ? null
                        : {
                              block: Pe.readback(W.buffer, W.offset, Be.byteLength),
                              frontier: Pe.readback(G.input.buffer, G.input.offset, G.input.size),
                              count: Pe.readback(L.buffer, L.offset, 4),
                          },
                ci = xe(Pe),
                _r = await ci.readback;
            if (((we += o), (me += 1), r.assertReady(), s?.signal?.aborted)) throw Ui(ci.id);
            if ((s?.onProgress?.(Math.min(we, n), n), yr !== null && i.onLevel !== void 0)) {
                const gt = Be.read(new DataView(_r), yr.block.offset),
                    Tt = new Uint32Array(_r, yr.frontier.offset, rr(gt, "nextFrontierCount")),
                    Jr = new Uint32Array(_r, yr.count.offset, 1)[0];
                i.onLevel(we - 1, gt, Tt.slice(), Jr);
            }
            if (new Uint32Array(_r, vr.offset, 1)[0] !== 0) break;
            if (me > n + 1)
                throw new h(
                    "E_VALIDATION",
                    `${ke}: the done flag never rose in ${me} submits (a traversal has at most ${n} levels)`,
                    { label: ke, message: `the done flag never rose in ${me} submits` },
                );
        }
        const De = Ke(w.scratch(v, "order/keys"), v),
            ot = Ke(w.scratch(v, "order/vals"), v),
            qe = Hr(n, y),
            at = {
                keys: Ke(w.scratch(v, "order/keys-scratch"), v),
                vals: Ke(w.scratch(v, "order/vals-scratch"), v),
                hist: Ke(w.scratch(qe, "order/hist"), qe),
                offsets: Ke(w.scratch(qe, "order/offsets"), qe),
            },
            rt = Ke(w.scratch(v, "parent"), v),
            ze = new ne(r, `${ke}/result`);
        ze.copy(k, De, v);
        const J = ze.pass("result");
        pe(J, ot, 0, 1);
        const Te = j.record(J, De, ot, n, 32, at);
        pe(J, rt, dt, 0);
        const ct = Oe(n, y, r.caps);
        for (const Pe of f) {
            const Se = w.params(ve, {
                    wg: y,
                    n,
                    arcBase: Pe.arcBase,
                    arcEnd: Pe.arcEnd,
                    predKind: l,
                    source: t,
                    stride: ct.stride ?? n,
                }),
                pt = K.bind({ ...Ze(Pe.core, null), dist: k, pred: rt, P: Se.binding });
            K.dispatch(J, pt, ct, [Se.offset]);
        }
        ze.endPass();
        const ht = ze.readback(k.buffer, k.offset, v),
            mr = ze.readback(rt.buffer, rt.offset, v),
            Qr = ze.readback(Te.vals.buffer, Te.vals.offset, v),
            Lo = ze.readback(W.buffer, W.offset, Be.byteLength),
            wr = await xe(ze).readback;
        r.assertReady();
        const br = Be.read(new DataView(wr), Lo.offset),
            Jt = rr(br, "visitedCount");
        if (Jt > n)
            throw new h("E_VALIDATION", `${ke}: visitedCount ${Jt} exceeds the ${n} vertices (a duplicate claim)`, {
                label: `${ke}/visitedCount`,
                message: `the device counted ${Jt} visits of ${n} vertices`,
            });
        const oi = rr(br, "level"),
            Oo = rr(br, "frontierCount") === 0 ? oi : oi + 1,
            ai = a ?? new Uint32Array(n);
        return (
            ai.set(new Uint32Array(wr, ht.offset, n)),
            {
                depth: ai,
                parent: new Uint32Array(wr, mr.offset, n).slice(),
                order: new Uint32Array(wr, Qr.offset, Jt).slice(),
                visitedCount: Jt,
                levels: Oo,
                switches: rr(br, "switches"),
            }
        );
    } finally {
        w.dispose();
    }
}
function Dd(r, e, t, s) {
    return eo(r, e, t, s, {});
}
const le = "sssp",
    Vi = 64,
    Td = 4 * ue + 40;
function Rs(r) {
    return new Uint32Array(Float32Array.of(r).buffer)[0];
}
function Ce(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
function Je(r, e) {
    return new h("E_ABORTED", `${r}: the signal was aborted`, e === void 0 ? {} : { batchId: e });
}
function to(r, e, t) {
    if (!Number.isInteger(e) || e < 0 || e >= t)
        throw new h("E_INVALID_ARGUMENT", `${r}: source ${e} is outside [0, ${t})`, {
            argument: "source",
            value: e,
            expected: `an integer in [0, ${t})`,
        });
}
function us(r, e) {
    const t = r[e];
    if (typeof t != "number")
        throw new h("E_VALIDATION", `${le}: counters.${e} did not decode to a number`, {
            label: `${le}/counters`,
            message: `the field ${e} did not decode to a number`,
        });
    return t;
}
function Zt(r, e, t) {
    if (e === void 0) return null;
    if (e instanceof Float32Array && e.length === t && e.buffer instanceof ArrayBuffer) return e;
    throw new h("E_INVALID_ARGUMENT", `${r}: dest must be a Float32Array of length ${t} over an ArrayBuffer`, {
        argument: "dest",
        value: `${e.constructor.name}(${e.length})`,
        expected: `Float32Array(${t}) over an ArrayBuffer`,
    });
}
function ro(r, e) {
    if (e === void 0) return 1 / 0;
    if (Number.isNaN(e))
        throw new h("E_INVALID_ARGUMENT", `${r}: cutoff must not be NaN`, {
            argument: "cutoff",
            value: e,
            expected: "a number (the CPU port and the kernel would disagree on NaN)",
        });
    return e;
}
function so(r, e, t) {
    if (t === void 0) {
        if (e.weights === null) return null;
        let c = 0;
        for (const l of e.weights) c += l;
        return {
            values: e.weights,
            override: null,
            allOne: e.flags.allWeightsOne,
            nonNegative: e.flags.nonNegativeWeights,
            finite: e.flags.finiteWeights,
            sum: c,
        };
    }
    if (t.length !== e.arcCount)
        throw new h("E_INVALID_ARGUMENT", `${r}: weights has ${t.length} entries, the snapshot ${e.arcCount} arcs`, {
            argument: "weights",
            value: t.length,
            expected: e.arcCount,
        });
    const s = t instanceof Float32Array ? t : Float32Array.from(t);
    let i = !0,
        n = !0,
        o = !0,
        a = 0;
    for (const c of s) (c !== 1 && (i = !1), c < 0 && (n = !1), Number.isFinite(c) || (o = !1), (a += c));
    return { values: s, override: s, allOne: i, nonNegative: n, finite: o, sum: a };
}
async function io(r, e, t, s, i, n) {
    const o = s === 1 / 0 ? void 0 : Math.floor(s),
        a = await eo(r, e, t, { maxDepth: o, signal: n?.signal, onProgress: n?.onProgress }, { predKind: 0 }),
        c = i ?? new Float32Array(e.nodeCount);
    for (let l = 0; l < e.nodeCount; l++) {
        const d = a.depth[l];
        c[l] = d === dt ? 1 / 0 : d;
    }
    return { dist: c, predArc: a.parent, reachedCount: a.visitedCount };
}
function no(r) {
    return 2 * Math.ceil(r / 64) * 64 + 64;
}
async function oo(r) {
    const {
            algorithm: e,
            ctx: t,
            scope: s,
            predKernel: i,
            recordFill: n,
            graph: o,
            dist: a,
            pred: c,
            n: l,
            arcCount: d,
            source: f,
            mode: p,
        } = r,
        g = t.workgroupSize,
        { queue: m } = t.device,
        b = 4 * l,
        w = Math.ceil(l / 64) * 64,
        v = { buffer: c.buffer, offset: c.offset, size: b, window: null };
    (m.writeBuffer(c.buffer, c.offset + 4 * (w + f), Uint32Array.of(0)),
        m.writeBuffer(c.buffer, c.offset + 8 * w, new Uint32Array(2)));
    const y = Oe(l, g, t.caps),
        k = { wg: g, n: l, arcBase: 0, arcEnd: d, predKind: 0, source: f, stride: y.stride ?? l, mode: p },
        S = Math.ceil((l + 1) / ue) + 1;
    let P = 0;
    for (;;) {
        const E = new ne(t, `${e}/pred`),
            A = E.pass("pred"),
            D = (N, R) => {
                const O = s.params(ve, { ...k, role: N, iteration: R }),
                    B = i.bind({ ...o, dist: a, pred: c, P: O.binding });
                i.dispatch(A, B, y, [O.offset]);
            };
        P === 0 && p === 0 && D(0, 0);
        for (let N = 0; N < ue; N++) D(1, N);
        (n(A, v, l, dt), D(2, 0), E.endPass());
        const $ = E.readback(a.buffer, a.offset, b),
            T = E.readback(c.buffer, c.offset, b),
            x = E.readback(c.buffer, c.offset + 8 * w, 8);
        s.flush();
        const L = await E.submit().readback;
        (t.assertReady(), (P += 1));
        const [I, C] = new Uint32Array(L, x.offset, 2);
        if (I < ue)
            return {
                dist: new Float32Array(L, $.offset, l),
                predArc: new Uint32Array(L, T.offset, l).slice(),
                orphans: C,
            };
        if (P > S)
            throw new h(
                "E_VALIDATION",
                `${e}: the hop passes still changed something after ${P} batches (a hop count is at most ${l})`,
                { label: `${e}/pred`, message: `the hop passes did not converge in ${P} batches` },
            );
        m.writeBuffer(c.buffer, c.offset + 8 * w, new Uint32Array(2));
    }
}
async function Ld(r, e, t, s, i) {
    (r.assertReady(), await Ve(r));
    const n = e.nodeCount;
    to(le, t, n);
    const o = i.roundsPerSubmit ?? ue;
    if (!Number.isInteger(o) || o < 1 || o > ue)
        throw new h("E_INVALID_ARGUMENT", `${le}: roundsPerSubmit must be an integer in [1, ${ue}]`, {
            argument: "roundsPerSubmit",
            value: o,
            expected: `an integer in [1, ${ue}]`,
        });
    if (i.delta !== void 0 && !(Number.isFinite(i.delta) && i.delta > 0))
        throw new h("E_INVALID_ARGUMENT", `${le}: delta must be a finite positive number`, {
            argument: "delta",
            value: i.delta,
            expected: "a finite positive number",
        });
    const a = Zt(le, s?.dest, n),
        c = so(le, e, s?.weights),
        l = ro(le, s?.cutoff);
    if (s?.signal?.aborted) throw Je(le);
    if (c === null || c.allOne) return io(r, e, t, l, a, s);
    if (!c.nonNegative)
        throw new h("E_UNSUPPORTED", `${le}: a negative weight has no shortest path here`, {
            feature: "sssp.negativeWeights",
            hint: "use bellmanFord",
        });
    if (!c.finite)
        throw new h("E_UNSUPPORTED", `${le}: a NaN or infinite weight has no bit-pattern order`, {
            feature: "sssp.nonFiniteWeights",
        });
    const { arcCount: d } = e,
        f = r.residency.core(e),
        p = r.caps.limits.maxStorageBufferBindingSize;
    Pt(f, d, p, le);
    const g = Math.ceil(Math.max(1, d) / Vi) * Vi;
    if (8 * g > p)
        throw new h(
            "E_TOO_LARGE",
            `${le}: the near-far queue of ${g} entries per half needs ${8 * g} bytes, above the ${p}-byte binding limit (the relax is never windowed)`,
            { needed: 8 * g, limit: p, path: "sssp.queue", algorithm: le },
        );
    const m = Math.fround(i.delta ?? (c.sum === 0 ? 1 : (oa * (c.sum / d)) / (d / n))),
        b = Rs(m),
        w = n + Math.ceil(c.sum / m) + 1,
        v = Math.ceil((w + 1) / o) + 1,
        y = je(r, le, Td);
    try {
        const k = r.workgroupSize,
            S = 4 * n,
            P = Ce(y.scratch(S, "dist"), S),
            E = Ce(y.scratch(S, "owner"), S),
            A = Ce(y.scratch(8 * g, "queue-out"), 8 * g),
            D = { buffer: A.buffer, offset: 0, size: 4 * g, window: null },
            $ = { buffer: A.buffer, offset: 4 * g, size: 4 * g, window: null },
            T = no(n),
            x = Ce(y.scratch(4 * T, "pred"), 4 * T),
            { queue: L } = r.device;
        let I;
        if (c.override !== null) {
            const ae = y.scratch(4 * d, "weights");
            (L.writeBuffer(ae, 0, c.override), (I = Ce(ae, 4 * d)));
        }
        await r.allocator.check();
        const C = await Jn(y, n, d, g),
            N = await Kr(y),
            R = Ge(f, null, I),
            O = await r.pipelines.kernel(_("sssp-relax", R)),
            B = await r.pipelines.kernel(_("sssp-pred", { ...R, MODE: 0 })),
            F = await r.pipelines.kernel(_("fill")),
            M = Ze(f, null, I),
            { frontier: X } = C,
            { counters: K } = X,
            q = X.vertices[0],
            j = X.vertices[1],
            G = (ae, Y, Z, we) => {
                const me = y.params(Ae, { count: Z, value: we, mode: 0, pad0: 0 });
                F.dispatch(ae, F.bind({ dst: Y, P: me.binding }), z(Z, k, r.caps), [me.offset]);
            },
            W = (ae) => (y.flush(), ae.submit()),
            H = new ne(r, `${le}/setup`),
            Q = H.pass("fill");
        (G(Q, P, n, Gt),
            G(Q, x, T, dt),
            H.endPass(),
            await W(H).readback,
            r.assertReady(),
            L.writeBuffer(P.buffer, P.offset + 4 * t, Uint32Array.of(0)),
            X.reset(L, t, { nextFrontierCount: 1, thresholdBits: b, deltaBits: b }),
            L.writeBuffer(A.buffer, A.offset, Uint32Array.of(t)));
        const V = {
                queue: D,
                count: g,
                countIndex: st.edgeCount,
                counters: K,
                owner: E,
                out: q,
                outCount: K,
                outIndex: st.frontierCount,
            },
            U = {
                queue: $,
                count: g,
                countIndex: st.edgeCountUnclamped,
                counters: K,
                owner: E,
                out: j,
                outCount: K,
                outIndex: st.farCount,
            },
            oe = Oe(n, k, r.caps),
            te = {
                wg: k,
                n,
                edgeCapacity: g,
                arcBase: 0,
                arcEnd: d,
                cutoffBits: Rs(l),
                source: t,
                stride: oe.stride ?? k,
            };
        let de = 0,
            pe = 0;
        for (;;) {
            const ae = new ne(r, `${le}/rounds`),
                Y = ae.pass("sssp"),
                Z = y.params(ve, { ...te, role: 0 }),
                we = y.params(ve, { ...te, role: 1 }),
                me = O.bind({ ...M, dist: P, counters: K, queueIn: q, queueOut: A, P: Z.binding }),
                De = O.bind({ ...M, dist: P, counters: K, queueIn: j, queueOut: A, P: we.binding });
            for (let J = 0; J < o; J++)
                (C.recordFinalize(Y, 2, J, {}),
                    N.recordDedupe(Y, V),
                    N.recordDedupe(Y, U),
                    C.recordFinalize(Y, 3, J, {}),
                    O.dispatch(Y, me, oe, [Z.offset]),
                    O.dispatch(Y, De, oe, [we.offset]));
            ae.endPass();
            const ot = ae.readback(K.buffer, K.offset + 4 * st.done, 4),
                qe = i.onRound === void 0 ? null : ae.readback(K.buffer, K.offset, Be.byteLength),
                at = W(ae),
                rt = await at.readback;
            if (((de += o), (pe += 1), r.assertReady(), s?.signal?.aborted)) throw Je(le, at.id);
            (s?.onProgress?.(Math.min(de, w), w),
                qe !== null && i.onRound !== void 0 && i.onRound(de - 1, Be.read(new DataView(rt), qe.offset)));
            const ze = new Uint32Array(rt, ot.offset, 1)[0];
            if (ze === 1) break;
            if (ze !== 0) {
                const J = Be.read(new DataView(await r.readback.read(K.buffer, Be.byteLength, void 0, K.offset)));
                if (ze === 2) {
                    const Te = Math.max(us(J, "nextFrontierCount"), us(J, "nextFarCount"));
                    throw new h("E_TOO_LARGE", `${le}: a raw pile of ${Te} entries overflowed its ${g}-entry half`, {
                        needed: Te,
                        limit: g,
                        path: "sssp.pile",
                        algorithm: le,
                    });
                }
                throw new h(
                    "E_UNSUPPORTED",
                    `${le}: the f32 threshold ${us(J, "thresholdBits")} absorbed the delta ${b} (as bit patterns); the far pile can no longer be bucketed`,
                    { feature: "sssp.thresholdAbsorbed", hint: "the distances outgrew the delta's f32 precision" },
                );
            }
            if (pe > v)
                throw new h("E_VALIDATION", `${le}: the done flag never rose in ${pe} submits (at most ${w} rounds)`, {
                    label: `${le}/rounds`,
                    message: `the done flag never rose in ${pe} submits`,
                });
        }
        const ge = await oo({
            algorithm: le,
            ctx: r,
            scope: y,
            predKernel: B,
            recordFill: G,
            graph: M,
            dist: P,
            pred: x,
            n,
            arcCount: d,
            source: t,
            mode: 0,
        });
        if (ge.orphans !== 0)
            throw new h(
                "E_VALIDATION",
                `${le}: ${ge.orphans} reached node(s) the predecessor key never reached (a kernel bug)`,
                { label: `${le}/pred`, message: `${ge.orphans} orphan(s) in the predecessor pass` },
            );
        const ce = a ?? new Float32Array(n);
        ce.set(ge.dist);
        let xe = 0;
        for (const ae of ce) ae !== 1 / 0 && (xe += 1);
        return { dist: ce, predArc: ge.predArc, reachedCount: xe };
    } finally {
        y.dispose();
    }
}
function ao(r, e, t, s) {
    return Ld(r, e, t, s, {});
}
const wt = "allPairsShortestPath",
    $t = Math.floor(fa / 3);
function co(r) {
    const e = r.maxStorageBufferBindingSize,
        t = r.maxBufferSize,
        s = t < e ? "maxBufferSize" : "maxStorageBufferBindingSize",
        i = Math.min(e, t);
    let n = Math.floor(Math.sqrt(i / 4));
    for (; 4 * n * n > i;) n -= 1;
    for (; 4 * (n + 1) * (n + 1) <= i;) n += 1;
    return { maxNodes: n, limit: i, limitName: s };
}
async function lo(r, e, t, s, i, n, o) {
    const a = e.nodeCount,
        c = r.residency.core(e);
    Pt(c, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, o);
    const l = Math.ceil(a / Ms),
        d = r.workgroupSize,
        f = 4 * a * a,
        p = Ce(t.scratch(f, "dist"), f);
    await r.allocator.check();
    const g = s ? void 0 : null,
        m = await r.pipelines.kernel(_("fill")),
        b = await r.pipelines.kernel(_("apsp-init", Ge(c, null, g))),
        w = await Promise.all([0, 1, 2].map((S) => r.pipelines.kernel(_("apsp-fw", { PHASE: S })))),
        v = Ze(c, null, g),
        y = l - 1,
        k = [Ft(1, r.caps), Ft(2 * y, r.caps), Ft(y * y, r.caps)];
    for (let S = 0; S < l; S += i) {
        const P = new ne(r, `${o}/sweep`),
            E = P.pass("apsp");
        if (S === 0) {
            const $ = t.params(Ae, { count: a * a, value: Gt, mode: 0, pad0: 0 });
            m.dispatch(E, m.bind({ dst: p, P: $.binding }), z(a * a, d, r.caps), [$.offset]);
            const T = t.params(Or, { n: a, round: 0, blocks: l, infBits: Gt });
            b.dispatch(E, b.bind({ ...v, dist: p, P: T.binding }), z(a, d, r.caps), [T.offset]);
        }
        const A = Math.min(S + i, l);
        for (let $ = S; $ < A; $++) {
            const T = t.params(Or, { n: a, round: $, blocks: l, infBits: Gt });
            for (let x = 0; x < 3; x++) {
                const L = w[x];
                L.dispatch(E, L.bind({ dist: p, P: T.binding }), k[x], [T.offset]);
            }
        }
        (P.endPass(), t.flush());
        const D = P.submit();
        if ((await D.readback, r.assertReady(), n?.onProgress?.(A, l), n?.signal?.aborted)) throw Je(o, D.id);
    }
    return p;
}
async function Od(r, e, t, s) {
    r.assertReady();
    const i = e.nodeCount,
        n = s.roundsPerSubmit ?? $t;
    if (!Number.isInteger(n) || n < 1 || n > $t)
        throw new h("E_INVALID_ARGUMENT", `${wt}: roundsPerSubmit must be an integer in [1, ${$t}]`, {
            argument: "roundsPerSubmit",
            value: n,
            expected: `an integer in [1, ${$t}]`,
        });
    const { maxNodes: o, limit: a, limitName: c } = co(r.caps.limits);
    if (i > o)
        throw new h(
            "E_TOO_LARGE",
            `${wt}: ${i} nodes need a ${4 * i * i}-byte distance matrix in one storage binding; this device's ${c} of ${a} bytes holds at most ${o} nodes -- raise it through GpuContextOptions.limits`,
            {
                needed: 4 * i * i,
                limit: a,
                path: "allPairs.matrix",
                algorithm: wt,
                nodes: i,
                maxNodes: o,
                limitName: c,
                hint: `raise ${c} through GpuContextOptions.limits`,
            },
        );
    const l = Zt(wt, t?.dest, i * i) ?? new Float32Array(i * i),
        d = e.weights !== null && e.weights !== null && !e.flags.allWeightsOne;
    if (d && !e.flags.nonNegativeWeights)
        throw new h("E_UNSUPPORTED", `${wt}: a negative weight is not supported`, {
            feature: "allPairs.negativeWeights",
            hint: "the blocked Floyd-Warshall sweep needs non-negative weights; pass weighted: false for hop counts",
        });
    if (d && !e.flags.finiteWeights)
        throw new h("E_UNSUPPORTED", `${wt}: a NaN or infinite weight has no shortest path`, {
            feature: "allPairs.nonFiniteWeights",
        });
    if (i === 0) return { dist: l, n: i };
    await Ve(r);
    const f = je(r, wt, Math.min(n, Math.ceil(i / Ms)) + 2);
    try {
        const p = await lo(r, e, f, d, n, t, wt),
            g = 4 * i * i;
        return (await r.readback.read(p.buffer, g, l), r.assertReady(), { dist: l, n: i });
    } finally {
        f.dispose();
    }
}
function Nd(r, e, t) {
    return Od(r, e, t, {});
}
const Ee = "bellmanFord",
    $d = 8,
    Cd = 16,
    Bd = ue + 16;
function Md(r, e) {
    const { arcToEdge: t, edgeToArc: s } = r;
    for (let i = 0; i < r.arcCount; i++) {
        const n = s[t[i]];
        if (e[i] !== e[n])
            throw new h(
                "E_UNSUPPORTED",
                `${Ee}: weights[${i}] = ${e[i]} differs from weights[${n}] = ${e[n]}, the forward arc of the same undirected edge; the kernel reads one weight per edge`,
                { feature: "bellmanFord.asymmetricUndirectedWeights", hint: "use a directed snapshot" },
            );
    }
}
async function Gd(r, e, t, s, i) {
    (r.assertReady(), await Ve(r));
    const n = e.nodeCount;
    to(Ee, t, n);
    const o = i.maxRetries ?? Cd;
    if (!Number.isInteger(o) || o < 1)
        throw new h("E_INVALID_ARGUMENT", `${Ee}: maxRetries must be an integer >= 1`, {
            argument: "maxRetries",
            value: o,
            expected: "an integer >= 1",
        });
    const a = i.roundsPerBatch ?? $d;
    if (!Number.isInteger(a) || a < 1 || a > ue)
        throw new h("E_INVALID_ARGUMENT", `${Ee}: roundsPerBatch must be an integer in [1, ${ue}]`, {
            argument: "roundsPerBatch",
            value: a,
            expected: `an integer in [1, ${ue}]`,
        });
    const c = Zt(Ee, s?.dest, n),
        l = so(Ee, e, s?.weights),
        d = ro(Ee, s?.cutoff);
    if (s?.signal?.aborted) throw Je(Ee);
    if (l === null || l.allOne)
        return {
            result: { ...(await io(r, e, t, d, c, s)), hasNegativeCycle: !1 },
            rounds: 0,
            retryExhaustedRounds: 0,
        };
    if (!l.finite)
        throw new h("E_UNSUPPORTED", `${Ee}: a NaN or infinite weight has no shortest path`, {
            feature: "bellmanFord.nonFiniteWeights",
        });
    !e.directed && l.override !== null && Md(e, l.override);
    const { arcCount: f } = e,
        p = r.residency.core(e, ["rowPtr", "colIdx", "weights", "edgeToArc"]);
    Pt(p, f, r.caps.limits.maxStorageBufferBindingSize, Ee);
    const g = r.residency.view(e, "edgeList"),
        m = g.scalars.edgeCount[0],
        b = je(r, Ee, Bd);
    try {
        const w = r.workgroupSize,
            v = 4 * n,
            y = Ce(b.scratch(v, "dist"), v),
            k = no(n),
            S = Ce(b.scratch(4 * k, "pred"), 4 * k),
            P = Ce(b.scratch(tr.byteLength, "flags"), tr.byteLength);
        let E = null,
            { edgeToArc: A } = p;
        A === null && ((E = Ce(b.scratch(4 * m, "iota"), 4 * m)), (A = E));
        const { queue: D } = r.device;
        let $;
        if (l.override !== null) {
            const U = b.scratch(4 * f, "weights");
            (D.writeBuffer(U, 0, l.override), ($ = Ce(U, 4 * f)));
        }
        await r.allocator.check();
        const T = Ge(p, null, $),
            x = await r.pipelines.kernel(_("bf-relax", { UNDIRECTED: !e.directed })),
            L = await r.pipelines.kernel(_("sssp-pred", { ...T, MODE: 0 })),
            I = await r.pipelines.kernel(_("fill")),
            C = Ze(p, null, $),
            N = (U, oe, te, de, pe = 0) => {
                const ge = b.params(Ae, { count: te, value: de, mode: pe, pad0: 0 });
                I.dispatch(U, I.bind({ dst: oe, P: ge.binding }), z(te, w, r.caps), [ge.offset]);
            },
            R = (U) => (b.flush(), U.submit()),
            O = new ne(r, `${Ee}/setup`),
            B = O.pass("fill");
        (N(B, y, n, Gt),
            N(B, S, k, dt),
            E !== null && N(B, E, m, 0, 1),
            O.endPass(),
            await R(O).readback,
            r.assertReady(),
            D.writeBuffer(y.buffer, y.offset + 4 * t, Uint32Array.of(0)));
        const F = Oe(m, w, r.caps),
            M = {
                edgeSrc: g.bindings.src,
                edgeDst: g.bindings.dst,
                edgeToArc: A,
                weights: C.weights,
                dist: y,
                flags: P,
            },
            X = { edgeCount: m, stride: F.stride ?? m, maxRetries: o, cutoffBits: Rs(d) },
            K = new Uint32Array(tr.byteLength / 4),
            q = async (U, oe) => {
                D.writeBuffer(P.buffer, P.offset, K);
                const te = new ne(r, `${Ee}/${oe}`),
                    de = te.pass("relax"),
                    pe = b.params(qn, X),
                    ge = x.bind({ ...M, P: pe.binding });
                for (let Z = 0; Z < U; Z++) x.dispatch(de, ge, F, [pe.offset]);
                te.endPass();
                const ce = te.readback(P.buffer, P.offset, tr.byteLength),
                    xe = R(te),
                    ae = await xe.readback;
                r.assertReady();
                const Y = tr.read(new DataView(ae), ce.offset);
                return { changed: Number(Y.changed), retryExhausted: Number(Y.retryExhausted), id: xe.id };
            };
        let j = 0,
            G = 0,
            W = !1;
        for (;;) {
            const U = n - 1 - j;
            if (U <= 0) {
                const de = await q(1, "decision");
                if (de.retryExhausted !== 0)
                    throw new h(
                        "E_VALIDATION",
                        `${Ee}: a lane exhausted the ${o}-retry compare-exchange bound in the decision round, so its change is not a verdict`,
                        { label: `${Ee}/retry`, message: "retryExhausted in the decision round", batchId: de.id },
                    );
                W = de.changed !== 0;
                break;
            }
            const oe = Math.min(a, U),
                te = await q(oe, "rounds");
            if (((j += oe), te.retryExhausted !== 0 && (G += 1), s?.signal?.aborted)) throw Je(Ee, te.id);
            if ((s?.onProgress?.(j, n), te.changed === 0 && te.retryExhausted === 0)) break;
        }
        const H = await oo({
            algorithm: Ee,
            ctx: r,
            scope: b,
            predKernel: L,
            recordFill: N,
            graph: C,
            dist: y,
            pred: S,
            n,
            arcCount: f,
            source: t,
            mode: 1,
        });
        if (H.orphans !== 0 && !W)
            throw new h(
                "E_UNSUPPORTED",
                `${Ee}: ${H.orphans} reached node(s) the tight subgraph never reaches (a cycle of weights below one f32 ulp relaxed once)`,
                {
                    feature: "bellmanFord.roundedCycle",
                    hint: "a cycle of weights below one f32 ulp relaxed once at a distance above 2^24; scale the weights or shorten the distances",
                },
            );
        const Q = c ?? new Float32Array(n);
        Q.set(H.dist);
        let V = 0;
        for (const U of Q) U !== 1 / 0 && (V += 1);
        return {
            result: { dist: Q, predArc: H.predArc, reachedCount: V, hasNegativeCycle: W },
            rounds: j,
            retryExhaustedRounds: G,
        };
    } finally {
        b.dispose();
    }
}
async function zd(r, e, t, s) {
    return (await Gd(r, e, t, s, {})).result;
}
class Fd {
    constructor(e, t, s, i, n) {
        ((this.dispatches = 0),
            (this.scope = e),
            (this.tiers = t),
            (this.perm = s),
            (this.weights = i),
            (this.hasWeights = n));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s, i) {
        const { HAS_WEIGHTS: n } = Ge(t, this.perm, this.weights);
        if (n !== this.hasWeights)
            throw new h("E_INVALID_ARGUMENT", "spmvPull: the core's weights pattern differs from the one prepared", {
                argument: "rev",
                value: n,
                expected: this.hasWeights,
            });
        const o = pr(t, "spmvPull"),
            a = this.scope.workgroupSize;
        this.dispatches = 0;
        for (const { tier: c, kernel: l, start: d, end: f } of this.tiers) {
            const p = c === 0 ? o : f,
                g = p - d;
            if (g <= 0) continue;
            const m = c === 2 ? 1 : a / lt,
                b = c === 0 ? Oe(g, a, this.scope.caps) : z(g, m, this.scope.caps);
            if (b.x === 0) continue;
            const w = this.scope.params(Vn, {
                    n: p,
                    arcBase: 0,
                    arcEnd: jr(t),
                    stride: b.stride ?? g,
                    alpha: i.alpha,
                    beta: i.beta,
                    uniformP: i.uniformP,
                    start: d,
                }),
                v = l.bind({
                    ...Ze(t, this.perm, this.weights),
                    xNorm: s.xNorm,
                    rankOut: s.rankOut,
                    personalization: s.personalization ?? s.xNorm,
                    partials: s.partials,
                    P: w.binding,
                });
            (l.dispatch(e, v, b, [w.offset]), this.dispatches++);
        }
    }
}
async function Ds(r, e, t) {
    ld(e, "spmvPull");
    const { tiers: s } = t,
        i = s?.perm ?? null;
    if (s !== null && r.workgroupSize < lt)
        throw new h(
            "E_UNSUPPORTED",
            `spmvPull: the mid tier folds ${lt} lanes per row, more than the workgroup size ${r.workgroupSize}`,
            { feature: "spmvPull.tiers" },
        );
    const n =
            s === null
                ? [{ tier: 0, start: 0, end: pr(e, "spmvPull") }]
                : [
                      { tier: 2, start: 0, end: s.segmentOffsets[1] },
                      { tier: 1, start: s.segmentOffsets[1], end: s.segmentOffsets[2] },
                      { tier: 0, start: s.segmentOffsets[2], end: s.segmentOffsets[4] },
                  ],
        o = [];
    for (const c of n) {
        if (c.tier !== 0 && c.end <= c.start) continue;
        const l = _("spmv-pull", {
            ...Ge(e, i, t.weights),
            HAS_PERSONALIZATION: t.personalization,
            USE_DANGLING: t.dangling,
            TIER: c.tier,
        });
        o.push({ ...c, kernel: await r.pipelines.kernel(l) });
    }
    const { HAS_WEIGHTS: a } = Ge(e, i, t.weights);
    return new Fd(r, o, i, t.weights, a);
}
const uo = 8,
    Wd = 4 * uo + 8;
function Ud(r, e, t) {
    if (r === void 0) return null;
    if (r instanceof Float32Array && r.length === e && r.buffer instanceof ArrayBuffer) return r;
    throw new h("E_INVALID_ARGUMENT", `${t}: dest must be a Float32Array of length ${e} over an ArrayBuffer`, {
        argument: "dest",
        value: `${r.constructor.name}(${r.length})`,
        expected: `Float32Array(${e}) over an ArrayBuffer`,
    });
}
function fo(r, e, t) {
    const s = r.residency.core(e);
    return (Pt(s, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, t), s);
}
function Hs(r, e) {
    r.residency.core(e, ["rowPtr"]);
    const t = r.residency.view(e, "reverse");
    return qr(t, t.scalars.arcCount[0]);
}
function ho(r, e) {
    return new h("E_ABORTED", `${r}: the signal was aborted`, e === void 0 ? {} : { batchId: e });
}
function ds(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
async function Br(r, e, t) {
    await Ve(r);
    const s = je(r, t.label, Wd);
    try {
        const i = 4 * e,
            n = (t.alternate === null ? ["rankA", "rankB"] : ["rankA", "rankB", "rankC"]).map((E) =>
                ds(s.scratch(i, E), i),
            ),
            o = ds(s.scratch(i, "xNorm"), i),
            a = z(e, r.workgroupSize, r.caps),
            c = Us(a),
            l = Ie.byteLength * (1 + c),
            d = s.scratch(l, "partials"),
            f = ds(d, l);
        await r.allocator.check();
        const p = { personalization: !1, dangling: !1, weights: t.weights, tiers: null },
            g = [{ core: t.adjacency, pull: await Ds(s, t.adjacency, p) }];
        t.alternate !== null && g.push({ core: t.alternate, pull: await Ds(s, t.alternate, p) });
        const m = await r.pipelines.kernel(_("pr-scale", { NORM_MODE: t.normMode })),
            b = t.normMode === 4 ? null : await r.pipelines.kernel(_("pr-scale", { NORM_MODE: 3 })),
            w = await r.pipelines.kernel(_("pr-finalize", { NORM_MODE: t.normMode })),
            v = z(1, r.workgroupSize, r.caps),
            { queue: y } = r.device;
        y.writeBuffer(n[0].buffer, 0, new Float32Array(e).fill(1 / e));
        for (const E of n.slice(1)) y.writeBuffer(E.buffer, 0, new Float32Array(e));
        const k = new ArrayBuffer(Ie.byteLength);
        (Ie.write(new DataView(k), { firstConverged: ye, iteration: 0 }), y.writeBuffer(d, 0, k));
        const S = { alpha: t.alpha, beta: t.beta, uniformP: t.uniformP };
        let P = 0;
        for (;;) {
            const E = Math.min(uo, t.maxIterations - P),
                A = new ne(r, t.label),
                D = A.pass("iterations"),
                $ = P + E === t.maxIterations;
            for (let B = 0; B < E + ($ ? 1 : 0); B++) {
                const F = P + B + 1,
                    M = s.params(Ur, {
                        n: e,
                        groups: c,
                        iteration: F,
                        trackConvergence: 1,
                        convergeThreshold: t.tolerance * e,
                    }),
                    X = n[(F - 1) % n.length],
                    K = n[F % n.length],
                    { core: q, pull: j } = g[(F - 1) % g.length],
                    G = { rankIn: X, rankPrev: K, outWeightSum: X, xNorm: o, partials: f, P: M.binding };
                if (
                    (m.dispatch(D, m.bind(G), a, [M.offset]),
                    w.dispatch(D, w.bind({ partials: f, P: M.binding }), v, [M.offset]),
                    B === E)
                )
                    break;
                (b !== null && b.dispatch(D, b.bind(G), a, [M.offset]),
                    j.record(D, q, { xNorm: o, rankOut: K, personalization: null, partials: f }, S));
            }
            A.endPass();
            const T = A.readback(d, 0, Ie.byteLength),
                x = A.readback(n[(P + E) % n.length].buffer, 0, i),
                L = t.alternate === null ? null : A.readback(n[(P + E - 1) % n.length].buffer, 0, i);
            s.flush();
            const I = A.submit(),
                C = await I.readback;
            if (((P += E), r.assertReady(), t.signal?.aborted === !0)) throw ho(t.label, I.id);
            t.onProgress?.(P, t.maxIterations);
            const R = Ie.read(new DataView(C), T.offset).firstConverged,
                O = R !== ye;
            if (O || P >= t.maxIterations)
                return (
                    O && P < t.maxIterations && t.onProgress?.(t.maxIterations, t.maxIterations),
                    {
                        scores: new Float32Array(C, x.offset, e).slice(),
                        previous: L === null ? null : new Float32Array(C, L.offset, e).slice(),
                        iterations: O ? R : P,
                        converged: O,
                        iterationsRun: P,
                    }
                );
        }
    } finally {
        s.dispose();
    }
}
const Ne = "betweennessCentrality",
    Vd = 16,
    jd = 2654435769,
    qd = Math.max(3 * ue, kr) + 16;
function ji(r, e, t) {
    const s = 4 * (r + 2);
    if (s > t.maxStorageBufferBindingSize)
        throw new h(
            "E_TOO_LARGE",
            `${Ne}: one source needs ${s} bytes in its largest binding at n = ${r}, above maxStorageBufferBindingSize = ${t.maxStorageBufferBindingSize}; a limit of at least ${s} admits one source per batch`,
            { needed: s, limit: t.maxStorageBufferBindingSize, path: "binding", algorithm: Ne },
        );
    const i = Math.floor(t.maxStorageBufferBindingSize / (4 * r)),
        n = Math.floor((aa * t.maxBufferSize) / (Vd * r));
    return Math.max(1, Math.min(i, n, ca, e));
}
function Kd(r, e) {
    const t = Array.from({ length: r }, (i, n) => n);
    let s = jd;
    for (let i = 0; i < e; i++) {
        s = (s + 1831565813) >>> 0;
        let n = Math.imul(s ^ (s >>> 15), s | 1);
        n = (n + Math.imul(n ^ (n >>> 7), n | 61)) ^ n;
        const o = ((n ^ (n >>> 14)) >>> 0) / 2 ** 32,
            a = i + Math.floor(o * (r - i));
        [t[i], t[a]] = [t[a], t[i]];
    }
    return t.slice(0, e);
}
function Ar(r, e, t) {
    return new h("E_INVALID_ARGUMENT", `${Ne}: ${r} must be ${t}`, { argument: r, value: e, expected: t });
}
function po(r, e) {
    const t = r?.k;
    if (t !== void 0 && (!Number.isInteger(t) || t < 0 || t > e)) throw Ar("k", t, `an integer in [0, ${e}]`);
    const s = r?.sources;
    if (s !== void 0) {
        for (const i of s)
            if (!Number.isInteger(i) || i < 0 || i >= e) throw Ar("sources", i, `node indices in [0, ${e})`);
        if (t !== void 0 && t !== s.length) throw Ar("k", t, `absent or equal to sources.length (${s.length})`);
        return [...s];
    }
    return t !== void 0 ? Kd(e, t) : Array.from({ length: e }, (i, n) => n);
}
async function qi(r, e, t, s, i, n) {
    const o = n,
        [a, c, l] = await Promise.all(
            ["bc-finalize", "bc-forward", "bc-backward"].map((g) => r.pipelines.kernel(_(g, { SCALED: o }))),
        ),
        d = s ? await r.pipelines.kernel(_("bc-forward-edge", { UNDIRECTED: !e.directed, SCALED: o })) : null,
        f = i ? await r.pipelines.kernel(_("bc-edge-gather", { SCALED: o })) : null;
    let p = null;
    if (n) {
        const g = e.directed ? Hs(r, e) : t;
        p = { kernel: await r.pipelines.kernel(_("bc-count")), rowPtr: g.rowPtr, colIdx: g.colIdx ?? g.rowPtr };
    }
    return { finalize: a, forward: c, forwardEdge: d, backward: l, edgeGather: f, count: p };
}
function Ct(r, e, t, s, i) {
    const { scope: n, fill: o, ctx: a } = r,
        c = n.params(Ae, { count: s, value: i, mode: 0, pad0: 0 });
    o.dispatch(e, o.bind({ dst: t, P: c.binding }), z(s, a.workgroupSize, a.caps), [c.offset]);
}
function bt(r, e, t, s, i, n, o) {
    const { scope: a, ctx: c } = r,
        l = Oe(n, c.workgroupSize, c.caps, o),
        d = a.params(_t, { ...i, stride: l.stride ?? 0 });
    let f = r.bound.get(t);
    (f === void 0 && ((f = t.bind({ ...s, P: d.binding })), r.bound.set(t, f)),
        t.dispatch(e, f, n === 0 ? z(1, c.workgroupSize, c.caps) : l, [d.offset]));
}
async function Mr(r, e, t) {
    r.scope.flush();
    const s = e.submit(),
        i = await s.readback;
    if ((r.ctx.assertReady(), t?.aborted)) throw Je(Ne, s.id);
    return i;
}
async function Ki(r, e, t, s, i, n, o) {
    const { ctx: a, n: c, S: l, ends: d, levelMax: f, depthK: p, sigmaK: g, deltaK: m, counters: b } = r,
        w = t.length,
        v = c * w,
        y = Uint32Array.from(t, (x, L) => L * c + x);
    a.device.queue.writeBuffer(l.buffer, l.offset, y);
    const k = { n: c, k: w, count: s === "edge" ? r.edgeCount : 0 },
        S = s === "edge" ? r.edgeCount : v;
    let P = 0,
        E = 0,
        A = !1,
        D = null;
    for (let x = !0; D === null; x = !1) {
        const L = new ne(a, `${Ne}/forward`),
            I = L.pass("forward");
        x &&
            (Ct(r, I, p, v, 4294967295),
            Ct(r, I, g, v, 0),
            Ct(r, I, m, v, 0),
            e.count !== null && Ct(r, I, f, c + 2, 0),
            bt(
                r,
                I,
                e.finalize,
                { counters: b, ends: d, S: l, depthK: p, sigmaK: g, levelMax: f },
                { n: c, k: w, role: 1 },
                1,
            ));
        for (let F = 0; F < i; F++)
            if (
                (bt(
                    r,
                    I,
                    e.finalize,
                    { counters: b, ends: d, S: l, depthK: p, sigmaK: g, levelMax: f },
                    { n: c, k: w, role: 0 },
                    1,
                ),
                s === "edge" && e.forwardEdge !== null && r.edgeSrc !== null && r.edgeDst !== null
                    ? bt(
                          r,
                          I,
                          e.forwardEdge,
                          { edgeSrc: r.edgeSrc, edgeDst: r.edgeDst, S: l, ends: d, counters: b, depthK: p, sigmaK: g },
                          k,
                          S,
                      )
                    : bt(
                          r,
                          I,
                          e.forward,
                          { rowPtr: r.rowPtr, colIdx: r.colIdx, S: l, ends: d, counters: b, depthK: p, sigmaK: g },
                          k,
                          S,
                      ),
                e.count !== null)
            ) {
                const { kernel: M, rowPtr: X, colIdx: K } = e.count;
                bt(
                    r,
                    I,
                    M,
                    { rowPtr: X, colIdx: K, S: l, ends: d, counters: b, depthK: p, sigmaK: g, levelMax: f },
                    { n: c, k: w },
                    v,
                    da,
                );
            }
        ((P += i), L.endPass());
        const C = Math.min(c + 2, P + 1),
            N = L.readback(b.buffer, b.offset, Be.byteLength),
            R = L.readback(d.buffer, d.offset, 4 * C),
            O = await Mr(r, L, o),
            B = new Uint32Array(O, N.offset, Be.byteLength / 4);
        if (B[st.done] !== 0) {
            if (
                ((E = B[st.level]),
                (A = B[st.sigmaOverflow] !== 0),
                (D = new Uint32Array(O, R.offset, C).slice(0, E + 1)),
                A && e.count === null)
            )
                return { levels: E, wrapped: !0, overflow: !1 };
        } else if (P > c + 2)
            throw new h("E_VALIDATION", `${Ne}: the done flag never rose in ${P} levels`, {
                label: Ne,
                message: `the done flag never rose in ${P} levels`,
            });
    }
    const $ = [];
    for (let x = E - 1; x >= 1; x--) $.push(x);
    let T = null;
    for (let x = 0; ; x += kr) {
        const L = $.slice(x, x + kr),
            I = x + kr >= $.length,
            C = new ne(a, `${Ne}/backward`),
            N = C.pass("backward");
        for (const F of L) {
            const M = D[F],
                X = D[F + 1] - M;
            bt(
                r,
                N,
                e.backward,
                { rowPtr: r.rowPtr, colIdx: r.colIdx, S: l, depthK: p, sigmaK: g, deltaK: m, levelMax: f },
                { n: c, k: w, start: M, count: X },
                X,
            );
        }
        (I &&
            (bt(r, N, r.gather, { deltaK: m, bc: r.bc }, { n: c, k: w }, c),
            e.edgeGather !== null &&
                r.arcScores !== null &&
                bt(
                    r,
                    N,
                    e.edgeGather,
                    {
                        rowPtr: r.rowPtr,
                        colIdx: r.colIdx,
                        depthK: p,
                        sigmaK: g,
                        deltaK: m,
                        arcScores: r.arcScores,
                        levelMax: f,
                    },
                    { n: c, k: w, count: r.arcCount },
                    r.arcCount,
                )),
            C.endPass());
        const R = I && n.readArrays === !0,
            O = R ? [p, g, m].map((F) => C.readback(F.buffer, F.offset, 4 * v)) : [],
            B = await Mr(r, C, o);
        if (
            (R &&
                (T = {
                    depthK: new Uint32Array(B, O[0].offset, v).slice(),
                    sigmaK: new Uint32Array(B, O[1].offset, v).slice(),
                    deltaK: new Float32Array(B, O[2].offset, v).slice(),
                }),
            I)
        )
            break;
    }
    return (
        n.onBatch?.({
            sources: t,
            forward: s,
            levels: E,
            ends: D.slice(),
            scaled: e.count !== null,
            sigmaOverflow: A,
            depthK: T?.depthK ?? null,
            sigmaK: T?.sigmaK ?? null,
            deltaK: T?.deltaK ?? null,
        }),
        { levels: E, wrapped: !1, overflow: A }
    );
}
async function go(r, e, t, s, i, n) {
    const o = e.nodeCount,
        a = i.forward ?? "auto",
        c = i.levelsPerSubmit ?? ue;
    if (!Number.isInteger(c) || c < 1 || c > ue) throw Ar("levelsPerSubmit", c, `an integer in [1, ${ue}]`);
    const l = i.limits ?? r.caps.limits,
        d = ji(o, t.length, l),
        f = r.residency.core(e);
    Pt(f, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, Ne);
    const { edgeCount: p } = e,
        m = (a === "edge" || (a === "auto" && t.length > d)) && p > 0 ? r.residency.view(e, "edgeList") : null,
        b = je(r, Ne, qd);
    try {
        const w = 4 * o * d,
            v = (R, O) => Ce(b.scratch(R, O), R),
            y = 4 * Math.max(1, e.arcCount),
            [k, S] = await Promise.all(["fill", "bc-gather"].map((R) => r.pipelines.kernel(_(R)))),
            P = await qi(r, e, f, m !== null, s, !1),
            E = {
                ctx: r,
                scope: b,
                n: o,
                S: v(w, "S"),
                ends: v(4 * (o + 2), "ends"),
                levelMax: v(4 * (o + 2), "level-max"),
                depthK: v(w, "depthK"),
                sigmaK: v(w, "sigmaK"),
                deltaK: v(w, "deltaK"),
                counters: v(Be.byteLength, "counters"),
                bc: v(4 * o, "bc"),
                arcScores: s ? v(y, "arc-scores") : null,
                rowPtr: f.rowPtr,
                colIdx: f.colIdx ?? f.rowPtr,
                edgeSrc: m?.bindings.src ?? null,
                edgeDst: m?.bindings.dst ?? null,
                edgeCount: p,
                arcCount: e.arcCount,
                fill: k,
                gather: S,
                exact: P,
                scaled: null,
                bound: new Map(),
            };
        await r.allocator.check();
        const A = new ne(r, `${Ne}/setup`),
            D = A.pass("setup");
        (Ct(E, D, E.bc, o, 0),
            E.arcScores !== null && Ct(E, D, E.arcScores, y / 4, 0),
            A.endPass(),
            await Mr(E, A, n?.signal));
        let $ = !1,
            T = 0,
            x = -1;
        for (let R = 0; R < t.length;) {
            const O = ji(o, t.length - R, l);
            let B = a === "edge" ? "edge" : "frontier";
            (a === "auto" && x >= 0 && (B = x < la * Math.log2(o) ? "edge" : "frontier"),
                E.exact.forwardEdge === null && (B = "frontier"));
            const F = t.slice(R, R + O);
            let M = await Ki(E, E.scaled ?? E.exact, F, B, c, i, n?.signal);
            (M.wrapped &&
                ((E.scaled ??= await qi(r, e, f, m !== null, s, !0)),
                (M = await Ki(E, E.scaled, F, B, c, i, n?.signal))),
                ($ = $ || M.overflow),
                (x = M.levels),
                (R += O),
                (T += 1),
                n?.onProgress?.(R, t.length));
        }
        const L = new ne(r, `${Ne}/result`),
            I = L.readback(E.bc.buffer, E.bc.offset, 4 * o),
            C = E.arcScores === null ? null : L.readback(E.arcScores.buffer, E.arcScores.offset, 4 * e.arcCount),
            N = await Mr(E, L, n?.signal);
        return {
            vertex: new Float32Array(N, I.offset, o).slice(),
            perArc: C === null ? null : new Float32Array(N, C.offset, e.arcCount).slice(),
            sourcesUsed: t.length,
            sigmaOverflow: $,
            batches: T,
        };
    } finally {
        b.dispose();
    }
}
function mo(r, e) {
    const t = r.nodeCount,
        s = r.directed ? (t - 1) * (t - 2) : ((t - 1) * (t - 2)) / 2;
    return e === !0 && s > 0 ? s : 1;
}
async function wo(r, e) {
    if ((r.assertReady(), await Ve(r), e?.endpoints === !0))
        throw new h("E_UNSUPPORTED", `${Ne}: endpoints: true is not supported`, {
            feature: "betweenness.endpoints",
            hint: "the CPU endpoints branch in algorithms/src/algorithms/centrality/betweenness.ts (predecessors.length === 0 && w !== source) never fires, so there is no convention to match",
        });
}
async function Hd(r, e, t, s) {
    await wo(r, t);
    const i = e.nodeCount,
        n = Zt(Ne, t?.dest, i) ?? new Float32Array(i),
        o = po(t, i);
    if (t?.signal?.aborted) throw Je(Ne);
    if (i === 0 || o.length === 0)
        return (
            n.fill(0),
            { scores: n, iterations: 0, converged: !0, precision: "f32", sourcesUsed: 0, sigmaOverflow: !1 }
        );
    const a = await go(r, e, o, !1, s, t),
        c = (e.directed ? 1 : 2) * mo(e, t?.normalized);
    for (let l = 0; l < i; l++) n[l] = a.vertex[l] / c;
    return {
        scores: n,
        iterations: a.batches,
        converged: !0,
        precision: "f32",
        sourcesUsed: a.sourcesUsed,
        sigmaOverflow: a.sigmaOverflow,
    };
}
async function Yd(r, e, t, s, i) {
    await wo(r, t);
    const n = e.nodeCount,
        o = Zt("edgeBetweennessCentrality", t?.dest, e.edgeCount) ?? new Float32Array(e.edgeCount),
        a = po(t, n);
    if (t?.signal?.aborted) throw Je(Ne);
    if (n === 0 || a.length === 0 || e.arcCount === 0)
        return (o.fill(0), { scores: o, precision: "f32", sourcesUsed: a.length, sigmaOverflow: !1 });
    const c = await go(r, e, a, !0, s, t),
        l = c.perArc ?? new Float32Array(e.arcCount),
        d = Co(e, l, "sum"),
        f = (e.directed ? 1 : 2) * mo(e, t?.normalized);
    for (let p = 0; p < e.edgeCount; p++) o[p] = d[p] / f;
    return { scores: o, precision: "f32", sourcesUsed: c.sourcesUsed, sigmaOverflow: c.sigmaOverflow };
}
function Xd(r, e, t) {
    return Hd(r, e, t, {});
}
function Qd(r, e, t) {
    return Yd(r, e, t, {});
}
const fe = "closenessCentrality",
    sr = 8,
    Zd = 64,
    Jd = 4096,
    Hi = 12,
    ef = 1024;
function Ht(r) {
    return r === 0 ? 0 : 1 / r;
}
async function tf(r, e, t, s, i, n) {
    const o = e.nodeCount,
        a = s?.length ?? o,
        c = s === null ? null : new Float64Array(o);
    for (let l = 0; l < a; l++) {
        if (n?.signal?.aborted) throw Je(fe);
        const d = s === null ? l : s[l],
            { dist: f } = await ao(r, e, d, { signal: n?.signal });
        let p = 0;
        for (let g = 0; g < o; g++) {
            const m = f[g];
            g !== d && m !== 1 / 0 && (c !== null ? (c[g] += m) : i ? m > 0 && (p += 1 / m) : (p += m));
        }
        (c === null && (t[d] = i ? p : Ht(p)), n?.onProgress?.(l + 1, a));
    }
    return (
        c?.forEach((l, d) => {
            t[d] = Ht(l);
        }),
        { scores: t, iterations: a, converged: !0, precision: "f32", sourcesUsed: a }
    );
}
async function rf(r, e, t, s, i, n) {
    const o = e.nodeCount,
        a = je(r, fe, Math.min($t, Math.ceil(o / 32)) + 3);
    try {
        const c = await lo(r, e, a, s, $t, { signal: n?.signal }, fe),
            l = await r.pipelines.kernel(_("closeness-rowsum")),
            d = Ce(a.scratch(4 * o, "row-sums"), 4 * o),
            f = i ? 2 : Number(s),
            p = a.params(Wt, { role: f, n: o }),
            g = new ne(r, `${fe}/row-sums`);
        (l.dispatch(g.pass("row-sums"), l.bind({ dist: c, out: d, P: p.binding }), Ft(o, r.caps), [p.offset]),
            g.endPass());
        const m = g.readback(d.buffer, d.offset, 4 * o);
        a.flush();
        const b = await g.submit().readback;
        return (
            r.assertReady(),
            f === 0
                ? new Uint32Array(b, m.offset, o).forEach((w, v) => {
                      t[v] = Ht(w);
                  })
                : new Float32Array(b, m.offset, o).forEach((w, v) => {
                      t[v] = i ? w : Ht(w);
                  }),
            n?.onProgress?.(o, o),
            { scores: t, iterations: 1, converged: !0, precision: "f32", sourcesUsed: o }
        );
    } finally {
        a.dispose();
    }
}
async function sf(r, e, t, s, i, n) {
    const { sources: o, harmonic: a, levelsPerSubmit: c } = s,
        l = e.nodeCount,
        d = o?.length ?? l;
    if (d === 0) return { scores: t, iterations: 0, converged: !0, precision: "f32", sourcesUsed: 0 };
    const f = Math.min(r.caps.limits.maxStorageBufferBindingSize, r.caps.limits.maxBufferSize),
        p = r.residency.core(e);
    if ((Pt(p, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, fe), e.directed && 4 * e.arcCount > f))
        throw new h(
            "E_TOO_LARGE",
            `${fe}: the reverse adjacency of a directed snapshot (${4 * e.arcCount} bytes) does not fit one binding`,
            { needed: 4 * e.arcCount, limit: f, path: "closeness.reverse", algorithm: fe },
        );
    const g = e.directed ? qr(r.residency.view(e, "reverse"), e.arcCount) : p,
        m = o === null ? 0 : l,
        b = Math.floor((f / 4 - m) / (4 * l)),
        w = o === null ? sr : Math.floor(4294967295 / (32 * Math.max(1, l - 1))),
        v = n.words ?? Math.max(1, Math.min(sr, Math.ceil(d / 32), b, w));
    if (!Number.isInteger(v) || v < 1 || v > sr)
        throw new h("E_INVALID_ARGUMENT", `${fe}: words must be an integer in [1, ${sr}]`, {
            argument: "words",
            value: v,
            expected: `an integer in [1, ${sr}]`,
        });
    const y = l * v,
        k = 4 * y + m;
    if (4 * k > f)
        throw new h(
            "E_TOO_LARGE",
            `${fe}: ${l} nodes need a ${4 * k}-byte search state in one binding of at most ${f} bytes`,
            { needed: 4 * k, limit: f, path: "closeness.bits", algorithm: fe },
        );
    const S = 32 * v,
        P = c * S,
        E = P,
        A = o === null ? 0 : E + Hi,
        D = E + Hi + (o?.length ?? 0),
        $ = n.pullAt ?? Math.min(4294967295, Math.floor((v * e.arcCount) / Zd)),
        T = je(r, fe, c + 4);
    try {
        const x = r.workgroupSize,
            L = Ce(T.scratch(4 * k, "bits"), 4 * k),
            I = Ce(T.scratch(4 * D, "table"), 4 * D),
            C = { ...I, size: 4 * P };
        (o !== null && r.device.queue.writeBuffer(I.buffer, I.offset + 4 * A, Uint32Array.from(o)),
            await r.allocator.check());
        const N = await r.pipelines.kernel(_("closeness-level")),
            R = await r.pipelines.kernel(_("fill")),
            O = {
                rowPtr: p.rowPtr,
                colIdx: p.colIdx ?? p.rowPtr,
                inRowPtr: g.rowPtr,
                inColIdx: g.colIdx ?? g.rowPtr,
                bits: L,
                table: I,
            },
            B = z(Math.max(l, e.arcCount), x, r.caps),
            F = e.inDegree().every((q) => q <= Jd) ? 1 : 0,
            M = o === null ? null : new Float64Array(l),
            X = {
                n: l,
                words: v,
                base: y,
                ctrl: E,
                pullAt: $,
                perNode: o === null ? 0 : 1,
                sourcesAt: A,
                arcCount: e.arcCount,
                pullOk: F,
            };
        let K = 0;
        for (let q = 0; q < d; q += S) {
            const j = Math.min(S, d - q),
                G = new Float64Array(j),
                W = new Float64Array(j),
                H = new Uint32Array(j);
            let Q = !1,
                V = 0;
            for (; !Q;) {
                if (V > l + 1)
                    throw new h("E_VALIDATION", `${fe}: the batch at ${q} still claimed at level ${V}`, {
                        label: fe,
                        message: `the batch still claimed at level ${V}`,
                    });
                const U = new ne(r, `${fe}/levels`),
                    oe = U.pass("closeness");
                if (V === 0) {
                    const Y = T.params(Wt, { ...X, role: 1, total: k, count: j }),
                        Z = N.bind({ ...O, P: Y.binding });
                    N.dispatch(oe, Z, z(k, x, r.caps), [Y.offset]);
                    const we = T.params(Wt, { ...X, role: 2, count: j, source: q });
                    N.dispatch(oe, Z, z(j, x, r.caps), [we.offset]);
                }
                const te = T.params(Ae, { count: P, value: 0, mode: 0, pad0: 0 });
                R.dispatch(oe, R.bind({ dst: C, P: te.binding }), z(P, x, r.caps), [te.offset]);
                let de = null;
                for (let Y = 0; Y < c; Y++) {
                    const Z = T.params(Wt, { ...X, role: 0, count: j, level: V + Y, row: Y });
                    ((de ??= N.bind({ ...O, P: Z.binding })), N.dispatch(oe, de, B, [Z.offset]));
                }
                U.endPass();
                const pe = U.readback(I.buffer, I.offset, 4 * P),
                    ge = M === null ? null : U.readback(L.buffer, L.offset + 16 * y, 4 * l);
                T.flush();
                const ce = U.submit(),
                    xe = await ce.readback;
                if ((r.assertReady(), i?.signal?.aborted)) throw Je(fe, ce.id);
                const ae = new Uint32Array(xe, pe.offset, P);
                for (let Y = 0; Y < c && !Q; Y++) {
                    const Z = V + Y + 1;
                    let we = 0;
                    for (let me = 0; me < j; me++) {
                        const De = ae[Y * S + me];
                        ((G[me] += De * Z), (W[me] += De / Z), (H[me] += De), (we += De));
                    }
                    Q = we === 0;
                }
                (Q &&
                    M !== null &&
                    ge !== null &&
                    new Uint32Array(xe, ge.offset, l).forEach((Y, Z) => {
                        M[Z] += Y;
                    }),
                    (V += c));
            }
            if (o === null) {
                for (let U = 0; U < j; U++) t[q + U] = a ? W[U] : Ht(G[U]);
                n.onBatch?.(q, G, H);
            }
            ((K += 1), i?.onProgress?.(q + j, d));
        }
        return (
            M?.forEach((q, j) => {
                t[j] = Ht(q);
            }),
            { scores: t, iterations: K, converged: !0, precision: "f32", sourcesUsed: d }
        );
    } finally {
        T.dispose();
    }
}
function nf(r, e) {
    if (e === void 0) return null;
    if (r.directed)
        throw new h("E_UNSUPPORTED", `${fe}: sampled sources need an undirected snapshot`, {
            feature: "closenessCentrality.directedSources",
            hint: "run the CPU port, which searches the in-arcs",
        });
    for (const t of e)
        if (!Number.isInteger(t) || t < 0 || t >= r.nodeCount)
            throw new h("E_INVALID_ARGUMENT", `${fe}: a source is not a node index`, {
                argument: "sources",
                value: t,
                expected: `an integer in [0, ${r.nodeCount})`,
            });
    return e;
}
async function of(r, e, t, s) {
    (r.assertReady(), await Ve(r));
    for (const p of ["maxIterations", "tolerance"])
        if (t?.[p] !== void 0)
            throw new h("E_UNSUPPORTED", `${fe}: ${p} has no meaning for an exact traversal`, {
                option: p,
                hint: "closeness is an exact traversal; the option has no meaning here",
            });
    const i = e.nodeCount,
        n = nf(e, t?.sources),
        o = t?.harmonic === !0;
    if (o && n !== null)
        throw new h("E_UNSUPPORTED", `${fe}: harmonic closeness from sampled sources`, {
            feature: "closenessCentrality.sampledHarmonic",
            hint: "run the CPU port, or drop the sources for the exact harmonic score",
        });
    const a = s.levelsPerSubmit ?? ue;
    if (!Number.isInteger(a) || a < 1 || a > ue)
        throw new h("E_INVALID_ARGUMENT", `${fe}: levelsPerSubmit must be an integer in [1, ${ue}]`, {
            argument: "levelsPerSubmit",
            value: a,
            expected: `an integer in [1, ${ue}]`,
        });
    const c = Zt(fe, t?.dest, i) ?? new Float32Array(i),
        l = (t?.weighted ?? e.flags.weighted) && e.weights !== null && !e.flags.allWeightsOne;
    if (t?.signal?.aborted) throw Je(fe);
    if (l && !e.flags.nonNegativeWeights)
        throw new h("E_UNSUPPORTED", `${fe}: a negative weight has no shortest-path distance to sum`, {
            feature: "closenessCentrality.negativeWeights",
            hint: "pass weighted: false to ignore the column",
        });
    if (l && !e.flags.finiteWeights)
        throw new h("E_UNSUPPORTED", `${fe}: a NaN or infinite weight has no shortest path`, {
            feature: "closenessCentrality.nonFiniteWeights",
        });
    const d = i > 0 && i <= co(r.caps.limits).maxNodes;
    let f;
    return (
        n !== null || !d ? (f = l ? "per-source" : "levels") : (f = s.route ?? (l || i <= ef ? "all-pairs" : "levels")),
        f === "levels" && l && (f = "per-source"),
        s.onRoute?.(f),
        f === "all-pairs"
            ? rf(r, e, c, l, o, t)
            : f === "per-source"
              ? tf(r, e, c, n, o, t)
              : sf(r, e, c, { sources: n, harmonic: o, levelsPerSubmit: a }, t, s)
    );
}
function af(r, e, t) {
    return of(r, e, t, {});
}
const We = "connectedComponents",
    Ts = 4,
    fs = 64,
    cf = 1024,
    lf = 1024,
    uf = 2 * Ts;
function df(r, e) {
    if (r === void 0) return null;
    if (r instanceof Uint32Array && r.length === e && r.buffer instanceof ArrayBuffer) return r;
    throw new h("E_INVALID_ARGUMENT", `${We}: dest must be a Uint32Array of length ${e} over an ArrayBuffer`, {
        argument: "dest",
        value: `${r.constructor.name}(${r.length})`,
        expected: `Uint32Array(${e}) over an ArrayBuffer`,
    });
}
function ff(r, e) {
    const t = r.residency.core(e);
    return (Pt(t, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, We), t);
}
function hs(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
function Ut(r, e) {
    let t = null;
    return {
        labels: r,
        count: e,
        groups() {
            if (t !== null) return t;
            const s = r.length,
                i = new Uint32Array(s).fill(ye),
                n = new Uint32Array(e);
            let o = 0;
            for (let l = 0; l < s; l++) {
                let d = i[r[l]];
                (d === ye && ((d = o++), (i[r[l]] = d)), n[d]++);
            }
            const a = Array.from(n, (l) => new Uint32Array(l)),
                c = new Uint32Array(e);
            for (let l = 0; l < s; l++) {
                const d = i[r[l]];
                a[d][c[d]++] = l;
            }
            return ((t = a), a);
        },
    };
}
function hf(r) {
    const e = new Map();
    let t = r[0],
        s = 0;
    for (const i of r) {
        const n = (e.get(i) ?? 0) + 1;
        (e.set(i, n), n > s && ((t = i), (s = n)));
    }
    return t;
}
function pf(r) {
    const e = r.length,
        t = new Uint8Array(e);
    let s = 0;
    for (let i = 0; i < e; i++) {
        const n = r[i];
        if (n >= e)
            throw new h("E_VALIDATION", `${We}: labels[${i}] = ${n} is not a node index`, {
                label: `${We}/labels`,
                message: `the device produced a label outside [0, ${e})`,
            });
        t[n] === 0 && ((t[n] = 1), s++);
    }
    return s;
}
function gf(r, e, t) {
    const s = e ?? new Uint32Array(r);
    for (let i = 0; i < r; i++) s[i] = i;
    return (t?.onProgress?.(1, 1), Ut(s, r));
}
function mf(r, e, t, s, i) {
    if (i?.aborted) throw new h("E_ABORTED", `${We}: the signal was aborted`, { batchId: s });
    if (new Uint32Array(r, e, 1)[0] === 0) return !0;
    if (t >= fs)
        throw new h("E_VALIDATION", `${We}: the changed flag never settled in ${fs} rounds`, {
            label: We,
            message: `the changed flag never settled in ${fs} rounds`,
        });
    return !1;
}
async function Yi(r, e, t) {
    (r.assertReady(), await Ve(r));
    const s = e.nodeCount,
        i = t?.renumber !== !1,
        n = df(t?.dest, s);
    if (t?.signal?.aborted) throw new h("E_ABORTED", `${We}: the signal was aborted before any work started`, {});
    if (s === 0) return (t?.onProgress?.(1, 1), Ut(n ?? new Uint32Array(0), 0));
    const o = ff(r, e);
    if (e.arcCount === 0) return gf(s, n, t);
    const a = r.residency.view(e, "edgeList"),
        c = a.scalars.edgeCount[0],
        l = je(r, We, uf);
    try {
        const d = 4 * (s + 1),
            f = l.scratch(d, "comp"),
            p = Math.min(cf, s),
            g = l.scratch(4 * p, "hist");
        await r.allocator.check();
        const m = await r.pipelines.kernel(_("fill", {})),
            b = await r.pipelines.kernel(_("wcc-link-sample", Ge(o, null))),
            w = await r.pipelines.kernel(_("wcc-link-edges", {})),
            v = await r.pipelines.kernel(_("wcc-compress", {})),
            y = await r.pipelines.kernel(_("wcc-sample", {})),
            { queue: k } = r.device,
            S = hs(f, d),
            P = hs(g, 4 * p),
            E = Oe(s, r.workgroupSize, r.caps),
            A = Oe(c, r.workgroupSize, r.caps),
            D = s,
            $ = new Uint32Array(1),
            T = (V) => l.params(Qt, { n: s, ...V, flagIndex: D, maxSteps: lf, pad0: 0 }),
            x = (V) => {
                const U = T({ items: s, stride: E.stride ?? s, r: 0, giant: ye });
                v.dispatch(V, v.bind({ comp: S, P: U.binding }), E, [U.offset]);
            },
            L = (V) => (l.flush(), V.submit());
        k.writeBuffer(f, 4 * D, $);
        const I = new ne(r, `${We}/setup`);
        let C = I.pass("sample-rounds");
        const N = l.params(Ae, { count: s, value: 0, mode: 1, pad0: 0 });
        m.dispatch(C, m.bind({ dst: hs(f, 4 * s), P: N.binding }), z(s, r.workgroupSize, r.caps), [N.offset]);
        const R = Ze(o, null);
        for (let V = 0; V < 2; V++) {
            const U = T({ items: s, stride: E.stride ?? s, r: V, giant: ye }),
                oe = b.bind({ ...R, comp: S, P: U.binding });
            b.dispatch(C, oe, E, [U.offset]);
        }
        (x(C), I.endPass(), await L(I).readback, r.assertReady());
        const O = new ne(r, `${We}/sample`);
        C = O.pass("sample");
        const B = T({ items: p, stride: 0, r: 0, giant: ye });
        (y.dispatch(C, y.bind({ comp: S, hist: P, P: B.binding }), z(p, r.workgroupSize, r.caps), [B.offset]),
            O.endPass());
        const F = O.readback(g, 0, 4 * p),
            M = await L(O).readback;
        r.assertReady();
        const X = hf(new Uint32Array(M, F.offset, p)),
            K = { edgeSrc: a.bindings.src, edgeDst: a.bindings.dst, comp: S };
        let q = 0;
        for (;;) {
            k.writeBuffer(f, 4 * D, $);
            const V = new ne(r, `${We}/rounds`);
            C = V.pass("edge-rounds");
            for (let de = 0; de < Ts; de++) {
                const pe = T({ items: c, stride: A.stride ?? c, r: 0, giant: X }),
                    ge = w.bind({ ...K, P: pe.binding });
                (w.dispatch(C, ge, A, [pe.offset]), x(C));
            }
            V.endPass();
            const U = V.readback(f, 4 * D, 4),
                oe = L(V),
                te = await oe.readback;
            if (((q += Ts), r.assertReady(), mf(te, U.offset, q, oe.id, t?.signal))) break;
        }
        const j = new ne(r, `${We}/final`);
        (x(j.pass("compress")), j.endPass(), await L(j).readback, r.assertReady());
        const G = !i && n !== null ? n : new Uint32Array(s);
        (await r.readback.read(f, 4 * s, G), r.assertReady());
        const W = pf(G);
        if ((t?.onProgress?.(1, 1), !i)) return Ut(G, W);
        const { labels: H, count: Q } = En(G, n ?? void 0);
        return Ut(H, Q);
    } finally {
        l.dispose();
    }
}
function wf(r, e = pa) {
    if (!Number.isInteger(e) || e < 0 || e > rs)
        throw new h("E_INVALID_ARGUMENT", `planGroupRows: threadMax must be an integer in [0, ${rs}]`, {
            argument: "threadMax",
            value: e,
            expected: `[0, ${rs}]`,
        });
    const t = r.length,
        s = [],
        i = [];
    for (let a = 0; a < t; a++) (r[a] <= e ? s : i).push(a);
    const n = new Uint32Array(s.length + 2 * i.length);
    (n.set(s, 0), n.set(i, s.length));
    let o = 1;
    for (let a = 0; a < i.length; a++) ((n[s.length + i.length + a] = o), (o += 2 * Ln * r[i[a]]));
    return { words: n, threadCount: s.length, hashCount: i.length, regionWords: o };
}
async function bf(r) {
    const e = new Map();
    for (const t of [0, 1])
        for (const s of [!1, !0]) {
            const i = _("group-by-key-row", { TIER: t, WEIGHTED: s });
            e.set(`${t}/${s}`, await r.pipelines.kernel(i));
        }
    return new vf(r, e);
}
function ps(r, e, t) {
    if (e.size < 4 * t)
        throw new h("E_INVALID_ARGUMENT", `groupByKeyRow: ${r} is smaller than 4 x ${t} bytes`, {
            argument: r,
            value: e.size,
            expected: 4 * t,
        });
}
class vf {
    constructor(e, t) {
        ((this.scope = e), (this.kernels = t));
    }
    record(e, t) {
        const { threadCount: s, hashCount: i } = t.plan,
            n = s + i;
        if (
            (ps("rows", t.rows, n + i),
            ps("hashRegion", t.hashRegion, t.plan.regionWords),
            ps("rowPtr", t.rowPtr, n + 1),
            n === 0)
        )
            return;
        const o = t.weights !== null,
            a = [
                [0, 0, s],
                [1, s, i],
            ];
        for (const [c, l, d] of a) {
            if (d === 0) continue;
            const f = this.kernels.get(`${c}/${o}`);
            if (f === void 0)
                throw new h("E_INVALID_ARGUMENT", "groupByKeyRow: no variant was prepared", {
                    argument: "tier",
                    value: c,
                });
            const p = this.scope.params(Kn, { rowsBase: l, basesBase: s + i, count: d, pad0: 0 }),
                g = f.bind({
                    rowPtr: t.rowPtr,
                    colIdx: t.colIdx,
                    weights: t.weights ?? t.colIdx,
                    keyIn: t.keyIn,
                    rows: t.rows,
                    hashRegion: t.hashRegion,
                    bestKey: t.bestKey,
                    bestScore: t.bestScore,
                    P: p.binding,
                }),
                m = c === 0 ? z(d, this.scope.workgroupSize, this.scope.caps) : Ft(d, this.scope.caps);
            f.dispatch(e, g, m, [p.offset]);
        }
    }
}
const Xi = 4294967295;
async function bo(r) {
    return vo(r);
}
async function vo(r) {
    const e = await r.pipelines.kernel(_("histogram")),
        t = await r.pipelines.kernel(_("fill"));
    return new _f(r, e, t);
}
async function yf(r) {
    const e = await vo(r),
        t = await Dt(r),
        s = await r.pipelines.kernel(_("counting-scatter"));
    return new Pf(r, e, t, s);
}
function ur(r, e, t) {
    if (e.size < 4 * t)
        throw new h("E_INVALID_ARGUMENT", `histogram: ${r} is smaller than 4 x ${t} bytes`, {
            argument: r,
            value: e.size,
            expected: 4 * t,
        });
}
function yo(r, e, t, s) {
    if (!Number.isSafeInteger(e) || e < 0 || e > Xi)
        throw new h("E_INVALID_ARGUMENT", "histogram: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: e,
        });
    if (!Number.isSafeInteger(t) || t < 1 || t > Xi)
        throw new h("E_INVALID_ARGUMENT", "histogram: bins must be an integer in [1, 2^32)", {
            argument: "bins",
            value: t,
        });
    (ur("keys", r, e), ur("hist", s, t));
}
class _f {
    constructor(e, t, s) {
        ((this.dispatches = 0), (this.scope = e), (this.histogram = t), (this.fill = s));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s, i, n) {
        if ((yo(t, s, i, n), this.recordZero(e, n, i), (this.dispatches = 1), s === 0)) return;
        const o = this.scope.params(Vr, { count: s, bins: i, pad0: 0, pad1: 0 }),
            a = this.histogram.bind({ keys: t, hist: n, P: o.binding });
        (this.histogram.dispatch(e, a, z(s, this.scope.workgroupSize, this.scope.caps), [o.offset]),
            (this.dispatches = 2));
    }
    recordZero(e, t, s) {
        const i = this.scope.params(Ae, { count: s, value: 0, mode: 0, pad0: 0 }),
            n = this.fill.bind({ dst: t, P: i.binding });
        this.fill.dispatch(e, n, z(s, this.scope.workgroupSize, this.scope.caps), [i.offset]);
    }
}
class Pf {
    constructor(e, t, s, i) {
        ((this.dispatches = 0), (this.scope = e), (this.histogram = t), (this.scan = s), (this.scatter = i));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s, i, n, o, a) {
        if (
            (yo(t, s, i, n.hist),
            ur("cursor", n.cursor, i),
            ur("outIndex", o, s),
            ur("outStart", a, i),
            this.histogram.record(e, t, s, i, n.hist),
            this.scan.record(e, n.hist, i, a),
            this.histogram.recordZero(e, n.cursor, i),
            (this.dispatches = this.histogram.lastDispatches + this.scan.lastDispatches + 1),
            s === 0)
        )
            return;
        const c = this.scope.params(Vr, { count: s, bins: i, pad0: 0, pad1: 0 }),
            l = this.scatter.bind({ keys: t, start: a, cursor: n.cursor, outIndex: o, P: c.binding });
        (this.scatter.dispatch(e, l, z(s, this.scope.workgroupSize, this.scope.caps), [c.offset]),
            (this.dispatches += 1));
    }
}
async function _o(r) {
    const e = await bo(r),
        t = await Dt(r),
        s = await r.pipelines.kernel(_("fill")),
        i = new Map();
    for (const n of [!1, !0])
        for (const o of [!1, !0]) {
            const a = _("coo-scatter", { SORTED_INPUT: n, WEIGHTED: o });
            i.set(`${n}/${o}`, await r.pipelines.kernel(a));
        }
    return new Ef(r, e, t, s, i);
}
function Et(r, e, t) {
    if (e.size < 4 * t)
        throw new h("E_INVALID_ARGUMENT", `cooToCsr: ${r} is smaller than 4 x ${t} bytes`, {
            argument: r,
            value: e.size,
            expected: 4 * t,
        });
}
function Sf(r) {
    for (const [e, t] of [
        ["count", r.count],
        ["n", r.n],
    ])
        if (!Number.isSafeInteger(t) || t < 0 || t >= ye)
            throw new h("E_INVALID_ARGUMENT", `cooToCsr: ${e} must be an integer in [0, 2^32 - 1)`, {
                argument: e,
                value: t,
            });
    if ((r.weights === null) != (r.out.weights === null))
        throw new h("E_INVALID_ARGUMENT", "cooToCsr: weights and out.weights must be both present or both null", {
            argument: "weights",
            value: r.weights === null ? "null" : "present",
            expected: r.out.weights === null ? "null" : "present",
        });
    (Et("src", r.src, r.count),
        Et("dst", r.dst, r.count),
        Et("out.rowPtr", r.out.rowPtr, r.n + 1),
        Et("out.colIdx", r.out.colIdx, r.count),
        Et("out.flag", r.out.flag, 1),
        r.weights !== null &&
            r.out.weights !== null &&
            (Et("weights", r.weights, r.count), Et("out.weights", r.out.weights, r.count)));
}
class Ef {
    constructor(e, t, s, i, n) {
        ((this.scope = e), (this.histogram = t), (this.scan = s), (this.fill = i), (this.scatter = n));
    }
    record(e, t) {
        Sf(t);
        const { scope: s } = this,
            i = s.workgroupSize,
            n = 4 * (t.n + 1),
            o = { buffer: s.scratch(n, "cooToCsr/degrees"), offset: 0, size: n, window: null };
        (this.histogram.record(e, t.src, t.count, t.n + 1, o), this.scan.record(e, o, t.n + 1, t.out.rowPtr));
        let a = t.out.flag;
        if (t.sortedInput) this.zero(e, t.out.flag, 1);
        else if (t.n > 0) {
            const g = 4 * t.n;
            ((a = { buffer: s.scratch(g, "cooToCsr/cursors"), offset: 0, size: g, window: null }),
                this.zero(e, a, t.n));
        }
        if (t.count === 0) return;
        const c = t.weights !== null,
            l = this.scatter.get(`${t.sortedInput}/${c}`);
        if (l === void 0)
            throw new h("E_INVALID_ARGUMENT", "cooToCsr: no scatter variant was prepared", {
                argument: "sortedInput",
                value: t.sortedInput,
            });
        const d = t.out.weights ?? { buffer: s.scratch(4, "cooToCsr/weight-dummy"), offset: 0, size: 4, window: null },
            f = s.params(nt, { count: t.count, pad0: 0, pad1: 0, pad2: 0 }),
            p = l.bind({
                src: t.src,
                dst: t.dst,
                weight: t.weights ?? t.dst,
                rowPtr: t.out.rowPtr,
                cursors: a,
                colIdx: t.out.colIdx,
                outWeight: d,
                P: f.binding,
            });
        l.dispatch(e, p, z(t.count, i, s.caps), [f.offset]);
    }
    zero(e, t, s) {
        const i = this.scope.params(Ae, { count: s, value: 0, mode: 0, pad0: 0 }),
            n = this.fill.bind({ dst: t, P: i.binding });
        this.fill.dispatch(e, n, z(s, this.scope.workgroupSize, this.scope.caps), [i.offset]);
    }
}
const Qi = 2 ** 128 - 2 ** 104;
function kf(r) {
    let e = 0;
    r === "min" ? (e = Qi) : r === "max" && (e = -Qi);
    const t = new DataView(new ArrayBuffer(4));
    return (t.setFloat32(0, e, !0), t.getUint32(0, !0));
}
const If = new Set(["row", "arc", "nbr", "weight", "v"]),
    Af = new Set([
        "if",
        "else",
        "let",
        "var",
        "const",
        "true",
        "false",
        "f32",
        "u32",
        "i32",
        "bool",
        "abs",
        "ceil",
        "clamp",
        "exp",
        "exp2",
        "floor",
        "fract",
        "inverseSqrt",
        "log",
        "log2",
        "max",
        "min",
        "mix",
        "pow",
        "round",
        "select",
        "sign",
        "sqrt",
        "step",
        "trunc",
    ]);
function xf(r) {
    switch (r) {
        case "sum":
            return 0;
        case "min":
            return 1;
        case "max":
            return 2;
        default:
            throw new h("E_INVALID_ARGUMENT", `segmentedReduce: unknown op ${String(r)}`, {
                argument: "op",
                value: r,
                expected: "sum | min | max",
            });
    }
}
function Rf(r) {
    return r.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}
function Df(r) {
    const e = Rf(r);
    if (!/\bv\s*[-+*/]?=(?!=)/.test(e))
        throw new h("E_SHADER_COMPILE", "segmentedReduce: the VALUE snippet never assigns v", {
            id: "segmented-reduce",
            stage: "compose",
            slot: "VALUE",
        });
    const t = e.match(/[A-Za-z_]\w*|\d[0-9A-Za-z_.]*/g) ?? [];
    for (const s of t)
        if (!(/^\d/.test(s) || If.has(s) || Af.has(s)))
            throw new h(
                "E_SHADER_COMPILE",
                `segmentedReduce: the VALUE snippet names "${s}"; the only identifiers allowed are row, arc, nbr, weight and v`,
                { id: "segmented-reduce", stage: "compose", slot: "VALUE", identifier: s },
            );
}
function Tf(r, e, t, s, i, n) {
    return s !== null && n
        ? { first: s.rowFirst, last: s.rowLast + 1, arcEnd: s.end }
        : { first: r.start, last: r.tier === 0 ? t : r.end, arcEnd: s === null ? jr(e) : Math.min(s.end, i) };
}
function Lf(r, e) {
    return r === 2 ? 1 : r === 1 ? e / lt : e;
}
class Of {
    constructor(e, t, s, i, n, o, a) {
        ((this.dispatches = 0),
            (this.scope = e),
            (this.tiers = t),
            (this.fill = s),
            (this.perm = i),
            (this.hasWeights = n),
            (this.accumulate = o),
            (this.identityWord = a));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    record(e, t, s) {
        if ((t.weights !== null) !== this.hasWeights)
            throw new h(
                "E_INVALID_ARGUMENT",
                "segmentedReduce: the core's weights pattern differs from the one prepared",
                { argument: "core", value: t.weights !== null, expected: this.hasWeights },
            );
        const i = pr(t, "segmentedReduce");
        if (s.size < 4 * i)
            throw new h("E_INVALID_ARGUMENT", `segmentedReduce: out holds ${s.size} bytes, ${4 * i} needed`, {
                argument: "out",
                value: s.size,
                expected: `>= ${4 * i}`,
            });
        if (((this.dispatches = 0), i === 0)) return;
        if (t.windows === null) {
            this.recordWindow(e, t, s, i, null, 0);
            return;
        }
        if (!this.accumulate) {
            const o = this.scope.params(Ae, { count: i, value: this.identityWord, mode: 0 }),
                a = this.fill.bind({ dst: s, P: o.binding });
            (this.fill.dispatch(e, a, z(i, this.scope.workgroupSize, this.scope.caps), [o.offset]), this.dispatches++);
        }
        const { windows: n } = t;
        n.forEach((o, a) => {
            const c = { ...t, colIdx: $r(t, "colIdx", o), weights: t.weights === null ? null : $r(t, "weights", o) };
            this.recordWindow(e, c, s, i, o, a + 1 < n.length ? n[a + 1].start : o.end);
        });
    }
    recordWindow(e, t, s, i, n, o) {
        const a = this.scope.workgroupSize;
        for (const c of this.tiers) {
            const { tier: l, kernel: d } = c,
                { first: f, last: p, arcEnd: g } = Tf(c, t, i, n, o, this.perm === null),
                m = p - f;
            if (m <= 0) continue;
            const b = this.scope.params(Vs, {
                    start: f,
                    end: p,
                    arcBase: n === null ? 0 : n.start,
                    arcEnd: g,
                    accumulate: n !== null || this.accumulate ? 1 : 0,
                    n: i,
                }),
                w = d.bind({ ...Ze(t, this.perm), out: s, P: b.binding });
            (d.dispatch(e, w, z(m, Lf(l, a), this.scope.caps), [b.offset]), this.dispatches++);
        }
    }
}
async function Po(r, e, t) {
    const s = xf(t.op);
    Df(t.valueSnippet);
    const { tiers: i } = t,
        n = i?.perm ?? null;
    if (i !== null && r.workgroupSize < lt)
        throw new h(
            "E_UNSUPPORTED",
            `segmentedReduce: the mid tier folds ${lt} lanes per row, more than the workgroup size ${r.workgroupSize}`,
            { feature: "segmentedReduce.tiers" },
        );
    const o =
            i === null
                ? [{ tier: 0, start: 0, end: pr(e, "segmentedReduce") }]
                : [
                      { tier: 2, start: 0, end: i.segmentOffsets[1] },
                      { tier: 1, start: i.segmentOffsets[1], end: i.segmentOffsets[2] },
                      { tier: 0, start: i.segmentOffsets[2], end: i.segmentOffsets[4] },
                  ],
        a = [];
    for (const l of o) {
        if (l.tier !== 0 && l.end <= l.start) continue;
        const d = { ...Ge(e, n), OP: s, TIER: l.tier },
            f = _("segmented-reduce", d, { VALUE: t.valueSnippet });
        a.push({ ...l, kernel: await r.pipelines.kernel(f) });
    }
    const c = await r.pipelines.kernel(_("fill"));
    return new Of(r, a, c, n, e.weights !== null, t.accumulate === !0, kf(t.op));
}
function Nf(r) {
    for (const e of [8, 16, 24]) if (r < 2 ** e) return e;
    return 32;
}
function be(r, e, t) {
    const s = 4 * Math.max(1, e);
    return { buffer: r.scratch(s, t), offset: 0, size: s, window: null };
}
function So(r, e, t, s) {
    const i = r.caps.limits.maxStorageBufferBindingSize;
    if (e > i)
        throw new h("E_TOO_LARGE", `${s}: ${t} needs ${e} bytes in one binding, above the device limit of ${i}`, {
            needed: e,
            limit: i,
            path: t,
            algorithm: s,
        });
}
function $f(r, e, t, s) {
    const i = new Uint32Array(r);
    for (let a = 0; a < e.length; a++) e[a] !== t[a] && (i[e[a]]++, i[t[a]]++);
    const n = new Map();
    for (let a = 0; a < r; a++) i[a] > ss && n.set(a, n.size);
    if (n.size < 2) return;
    const o = new Uint32Array(n.size * n.size);
    for (let a = 0; a < e.length; a++) {
        const c = n.get(e[a]),
            l = n.get(t[a]);
        if (c === void 0 || l === void 0 || c === l) continue;
        const d = Math.min(c, l) * n.size + Math.max(c, l);
        if (++o[d] > ss)
            throw new h(
                "E_UNSUPPORTED",
                `${s}: nodes ${e[a]} and ${t[a]} are joined by more than ${ss} parallel edges, more than one weighted merge sums`,
                { feature: `${s}.parallelEdges`, hint: "run it unweighted, or merge the parallel edges first" },
            );
    }
}
function Ls(r, e, t) {
    if (new Uint32Array(r, e.flag.offset, 1)[0] !== 0)
        throw new h("E_VALIDATION", `${t}: the simple graph's arcs reached cooToCsr out of order`, {
            label: `${t}/simple-graph`,
            message: "the sorted-input precondition of cooToCsr failed on the device",
        });
}
async function Eo(r, e, t, s, i) {
    const n = e.nodeCount,
        o = r.workgroupSize,
        a = await _o(t),
        c = be(t, 1, "simple/flag"),
        l = be(t, n + 1, "simple/rowPtr"),
        { edgeCount: d } = e,
        f = e.edgeList();
    let p = 0;
    for (let J = 0; J < d; J++) f.src[J] === f.dst[J] && p++;
    const g = 2 * (d - p),
        m = () => {
            const J = new ne(r, `${i}/simple-graph`);
            return (
                a.record(J.pass("simple-graph"), {
                    src: c,
                    dst: c,
                    weights: null,
                    count: 0,
                    n,
                    sortedInput: !0,
                    out: { rowPtr: l, colIdx: c, weights: null, flag: c },
                }),
                J.endPass(),
                {
                    graph: { n, arcCount: 0, rowPtr: l, colIdx: null, weights: null, src: null },
                    batch: J,
                    flag: J.readback(c.buffer, 0, 4),
                }
            );
        };
    if (g === 0) return m();
    const b = 2 * d,
        w = Math.max(4, Hr(b, o));
    (So(r, Math.max(4 * (b + 1), w), "the simple graph's arc arrays", i),
        s && $f(n, f.src, f.dst, i),
        r.residency.core(e, ["rowPtr"]));
    const v = r.residency.view(e, "edgeList"),
        y = v.bindings.weights ?? null,
        k = z(b, o, r.caps),
        S = new Map();
    for (const J of [!1, !0]) {
        const Te = _("coo-emit", { INDEXED: J, WEIGHTED: y !== null });
        S.set(J, await r.pipelines.kernel(Te));
    }
    const P = await r.pipelines.kernel(_("fill")),
        E = await r.pipelines.kernel(_("run-flags")),
        A = await Ks(t),
        D = await Dt(t),
        $ = await Kr(t),
        T = be(t, b, "simple/aSrc"),
        x = be(t, b, "simple/aDst"),
        L = be(t, b, "simple/aW"),
        I = be(t, b, "simple/vals"),
        C = be(t, b, "simple/sortKeys"),
        N = be(t, b, "simple/sortVals"),
        R = { buffer: t.scratch(w, "simple/hist"), offset: 0, size: w, window: null },
        O = { buffer: t.scratch(w, "simple/offsets"), offset: 0, size: w, window: null },
        B = be(t, b, "simple/sortedSrc"),
        F = be(t, b, "simple/sortedDst"),
        M = be(t, b, "simple/sortedW"),
        X = be(t, b, "simple/flags"),
        K = be(t, b, "simple/runIndex"),
        q = be(t, 1, "simple/dummy");
    await r.allocator.check();
    const j = (J, Te, ct) => {
            const ht = S.get(Te !== null);
            if (ht === void 0)
                throw new h("E_INVALID_ARGUMENT", "buildSimpleSymmetric: no coo-emit variant", {
                    argument: "order",
                    value: Te === null ? "null" : "present",
                });
            const mr = t.params(nt, { count: b, pad0: 0, pad1: 0, pad2: 0 }),
                Qr = ht.bind({
                    edgeSrc: v.bindings.src,
                    edgeDst: v.bindings.dst,
                    edgeWeight: y ?? v.bindings.src,
                    order: Te ?? q,
                    outSrc: ct[0],
                    outDst: ct[1],
                    outWeight: ct[2],
                    P: mr.binding,
                });
            ht.dispatch(J, Qr, k, [mr.offset]);
        },
        G = (J, Te, ct) => {
            const ht = t.params(Ae, { count: ct, value: 0, mode: 1, pad0: 0 });
            P.dispatch(J, P.bind({ dst: Te, P: ht.binding }), z(ct, o, r.caps), [ht.offset]);
        },
        W = Nf(n),
        H = new ne(r, `${i}/simple-sort`),
        Q = H.pass("simple-sort");
    (j(Q, null, [T, x, L]), G(Q, I, b));
    const V = A.record(Q, x, I, b, W, { keys: C, vals: N, hist: R, offsets: O });
    j(Q, V.vals, [T, x, L]);
    const U = V.vals.buffer === I.buffer ? N : I,
        oe = A.record(Q, T, V.vals, b, W, { keys: V.keys.buffer === x.buffer ? C : x, vals: U, hist: R, offsets: O });
    j(Q, oe.vals, [B, F, M]);
    const te = t.params(nt, { count: b, pad0: 0, pad1: 0, pad2: 0 });
    E.dispatch(Q, E.bind({ keysA: B, keysB: F, flags: X, P: te.binding }), k, [te.offset]);
    const de = D.record(Q, X, b, K);
    H.endPass();
    const pe = H.readback(de.binding.buffer, de.binding.offset + 4 * de.index, 4);
    t.flush();
    const ge = await H.submit().readback;
    r.assertReady();
    const ce = new Uint32Array(ge, pe.offset, 1)[0];
    if (ce === 0 || ce > g)
        throw new h("E_VALIDATION", `${i}: ${ce} distinct arcs from ${g} valid ones`, {
            label: `${i}/simple-graph`,
            message: "the run count of the simple graph build is outside [1, valid arcs]",
        });
    const xe = be(t, b, "simple/src"),
        ae = be(t, b, "simple/dst"),
        Y = be(t, b + 1, "simple/runStart"),
        Z = be(t, 1, "simple/count"),
        we = be(t, ce, "simple/colIdx"),
        me = s ? be(t, ce, "simple/weights") : null,
        De = s ? be(t, ce, "simple/merged") : null;
    r.device.queue.writeBuffer(Y.buffer, 4 * ce, Uint32Array.of(g));
    const ot =
            De === null
                ? null
                : await Po(t, Zi(Y, ce, F, M, g), { op: "sum", valueSnippet: "v = weight;", tiers: null }),
        qe = new ne(r, `${i}/simple-graph`),
        at = qe.pass("simple-graph"),
        rt = I;
    G(at, rt, b);
    for (const [J, Te] of [
        [B, xe],
        [F, ae],
        [rt, Y],
    ])
        $.record(at, { queue: J, flags: X, count: b, out: Te, outCount: Z, outIndex: 0 });
    return (
        ot !== null && De !== null && ot.record(at, Zi(Y, ce, F, M, g), De),
        a.record(at, {
            src: xe,
            dst: ae,
            weights: De,
            count: ce,
            n,
            sortedInput: !0,
            out: { rowPtr: l, colIdx: we, weights: me, flag: c },
        }),
        qe.endPass(),
        {
            graph: { n, arcCount: ce, rowPtr: l, colIdx: we, weights: me, src: xe },
            batch: qe,
            flag: qe.readback(c.buffer, 0, 4),
        }
    );
}
function Zi(r, e, t, s, i) {
    return {
        serial: -1,
        plan: "perArray",
        rowPtr: { ...r, size: 4 * (e + 1) },
        colIdx: { ...t, size: 4 * i },
        weights: { ...s, size: 4 * i },
        arcToEdge: null,
        edgeToArc: null,
        windows: null,
        arcBuffers: null,
        hasWeights: !0,
    };
}
const Le = "labelPropagation",
    Cf = 100,
    Bf = 1024,
    gs = 857579651;
function Mf(r) {
    return (
        (r ^= r >>> 16),
        (r = Math.imul(r, 2246822507)),
        (r ^= r >>> 13),
        (r = Math.imul(r, 3266489909)),
        (r ^= r >>> 16),
        r >>> 0
    );
}
function Gf(r) {
    return (
        (r ^= r >>> 16),
        (r = Math.imul(r, 2127672349)),
        (r ^= (r >>> 13) ^ (r >>> 26)),
        (r = Math.imul(r, 2781581891)),
        (r ^= r >>> 16),
        r >>> 0
    );
}
function zf(r, e) {
    if (r === void 0) return null;
    if (r instanceof Uint32Array && r.length === e && r.buffer instanceof ArrayBuffer) return r;
    throw new h("E_INVALID_ARGUMENT", `${Le}: dest must be a Uint32Array of length ${e} over an ArrayBuffer`, {
        argument: "dest",
        value: `${r.constructor.name}(${r.length})`,
        expected: `Uint32Array(${e}) over an ArrayBuffer`,
    });
}
function Ff(r) {
    if (r === void 0) return Cf;
    if (!Number.isSafeInteger(r) || r < 0)
        throw new h("E_INVALID_ARGUMENT", `${Le}: maxIterations must be a non-negative integer`, {
            argument: "maxIterations",
            value: r,
            expected: "a non-negative integer",
        });
    return r;
}
function Wf(r) {
    const e = r.outDegree();
    if (!r.directed) return e;
    const t = r.inDegree(),
        s = new Uint32Array(r.nodeCount);
    for (let i = 0; i < s.length; i++) s[i] = e[i] + t[i];
    return s;
}
function Uf(r, e) {
    const t = r.length;
    for (let n = 0; n < t; n++) {
        const o = Gf(r[n]);
        if (o >= t)
            throw new h("E_VALIDATION", `${Le}: labels[${n}] = ${r[n]} is not a node's label`, {
                label: `${Le}/labels`,
                message: `the device produced a label that scrambles no index in [0, ${t})`,
            });
        r[n] = o;
    }
    const { labels: s, count: i } = En(r, e ?? void 0);
    return Ut(s, i);
}
function Ji(r, e) {
    const t = e ?? new Uint32Array(r);
    for (let s = 0; s < r; s++) t[s] = s;
    return Ut(t, r);
}
async function Vf(r, e, t) {
    (r.assertReady(), await Ve(r));
    const s = e.nodeCount,
        i = zf(t?.dest, s),
        n = Ff(t?.maxIterations),
        o = t?.weighted !== !1;
    if (t?.signal?.aborted) throw new h("E_ABORTED", `${Le}: the signal was aborted before any work started`, {});
    if (s === 0 || e.edgeCount === 0 || n === 0) return (t?.onProgress?.(1, 1), Ji(s, i));
    if (s > gs)
        throw new h("E_TOO_LARGE", `${Le}: ${s} nodes, above the ${gs} the labels allow`, {
            needed: s,
            limit: gs,
            path: "the scrambled labels",
            algorithm: Le,
        });
    const a = wf(Wf(e));
    So(r, 4 * a.regionWords, "the group-by hash region", Le);
    const c = je(r, Le, Bf);
    try {
        const l = await Eo(r, e, c, o, Le),
            { graph: d } = l;
        if (d.colIdx === null) {
            c.flush();
            const R = await l.batch.submit().readback;
            return (r.assertReady(), Ls(R, l, Le), t?.onProgress?.(1, 1), Ji(s, i));
        }
        const f = r.workgroupSize,
            p = (R, O) => {
                const B = 4 * Math.max(1, R);
                return { buffer: c.scratch(B, O), offset: 0, size: B, window: null };
            },
            g = p(a.words.length, "rows"),
            m = p(a.regionWords, "hashRegion"),
            b = p(s, "labelsA"),
            w = p(s, "labelsB"),
            v = p(s, "bestKey"),
            y = p(s, "bestScore"),
            k = p(mi, "counters");
        await r.allocator.check();
        const { queue: S } = r.device;
        (S.writeBuffer(g.buffer, 0, a.words), S.writeBuffer(m.buffer, 0, new Uint32Array(1)));
        const P = await bf(c),
            E = await r.pipelines.kernel(_("lpa-step")),
            A = z(s, f, r.caps),
            D = new Uint32Array(s);
        for (let R = 0; R < s; R++) D[R] = Mf(R);
        S.writeBuffer(b.buffer, 0, D);
        let { batch: $ } = l,
            T = !0,
            x = b,
            L = w,
            I = 0,
            C = -1;
        for (;;) {
            const R = Math.min(mi, n - I);
            S.writeBuffer(k.buffer, 0, new Uint32Array(R));
            const O = $.pass("passes");
            for (let j = 0; j < R; j++) {
                P.record(O, {
                    rowPtr: d.rowPtr,
                    colIdx: d.colIdx,
                    weights: o ? d.weights : null,
                    keyIn: x,
                    plan: a,
                    rows: g,
                    hashRegion: m,
                    bestKey: v,
                    bestScore: y,
                });
                const G = c.params(Hn, { n: s, direction: (I + j + 1) % 2, counterIndex: j, pad0: 0 });
                (E.dispatch(O, E.bind({ labelsIn: x, bestKey: v, labelsOut: L, counters: k, P: G.binding }), A, [
                    G.offset,
                ]),
                    ([x, L] = [L, x]));
            }
            $.endPass();
            const B = $.readback(k.buffer, 0, 4 * R),
                F = $.readback(m.buffer, 0, 4);
            c.flush();
            const M = $.submit(),
                X = await M.readback;
            if ((r.assertReady(), T && (Ls(X, l, Le), (T = !1)), new Uint32Array(X, F.offset, 1)[0] !== 0))
                throw new h("E_VALIDATION", `${Le}: a hash probe exhausted its bound`, {
                    label: `${Le}/group-by-key`,
                    message: "a compare-exchange loop of the workgroup tier ran out of steps",
                });
            const K = new Uint32Array(X, B.offset, R);
            I += R;
            const q = R >= 2 ? K[R - 2] + K[R - 1] : C + K[0];
            if (((C = K[R - 1]), t?.signal?.aborted))
                throw new h("E_ABORTED", `${Le}: the signal was aborted`, { batchId: M.id });
            if ((t?.onProgress?.(I, n), q === 0 || I >= n)) break;
            $ = new ne(r, `${Le}/passes`);
        }
        const N = new Uint32Array(s);
        return (await r.readback.read(x.buffer, 4 * s, N), r.assertReady(), Uf(N, i));
    } finally {
        c.dispose();
    }
}
const Qe = "minimumSpanningTree",
    Os = 1024,
    jf = 64,
    qf = 5 + kt;
function Kf(r) {
    let e = 1;
    for (let t = Os; t < r; t *= Os) e++;
    return e;
}
function Hf(r, e, t) {
    const s = new Uint32Array(t),
        { weights: i } = r.edgeList();
    let n = 0,
        o = 0;
    for (const a of e)
        if (a !== dt) {
            if (a >= r.edgeCount || n === t)
                throw new h("E_VALIDATION", `${Qe}: the device recorded an edge it did not count`, {
                    label: `${Qe}/treeEdge`,
                    message: `edge ${a} at forest position ${n} of ${t}`,
                });
            ((s[n++] = a), (o += i === null ? 1 : i[a]));
        }
    if (n !== t)
        throw new h("E_VALIDATION", `${Qe}: ${n} recorded edges, ${t} counted`, {
            label: `${Qe}/treeEdge`,
            message: "the per-round counts disagree with the recorded forest",
        });
    return { edges: s, totalWeight: o };
}
async function Yf(r, e, t) {
    (r.assertReady(), await Ve(r));
    const s = e.nodeCount,
        i = e.edgeCount;
    if (s === 0 || i === 0) return { edges: new Uint32Array(0), totalWeight: 0 };
    r.residency.core(e, ["rowPtr"]);
    const n = r.residency.view(e, "edgeList"),
        o = n.bindings.weights ?? null,
        a = je(r, Qe, qf);
    try {
        const c = r.workgroupSize,
            l = (N, R) => {
                const O = 4 * Math.max(1, N);
                return { buffer: a.scratch(O, R), offset: 0, size: O, window: null };
            },
            d = l(s, "comp"),
            f = l(s, "bestKey"),
            p = l(s, "bestEdge"),
            g = l(s, "treeEdge"),
            m = l(kt, "counters");
        await r.allocator.check();
        const b = await r.pipelines.kernel(_("fill")),
            w = o !== null,
            v = await r.pipelines.kernel(_("mst-best", { PASS: 0, WEIGHTED: w })),
            y = await r.pipelines.kernel(_("mst-best", { PASS: 1, WEIGHTED: w })),
            k = await r.pipelines.kernel(_("mst-link")),
            S = await r.pipelines.kernel(_("wcc-compress")),
            P = z(s, c, r.caps),
            E = z(i, c, r.caps),
            A = Oe(s, c, r.caps),
            D = Kf(s),
            { queue: $ } = r.device;
        let T = new ne(r, `${Qe}/rounds`),
            x = !0,
            L = 0,
            I = 0;
        for (;;) {
            $.writeBuffer(m.buffer, 0, new Uint32Array(kt));
            const N = T.pass("rounds"),
                R = (W, H) => a.params(Ae, { count: s, value: W, mode: H, pad0: 0 });
            if (x) {
                const W = R(0, 1);
                b.dispatch(N, b.bind({ dst: d, P: W.binding }), P, [W.offset]);
                const H = R(dt, 0);
                b.dispatch(N, b.bind({ dst: g, P: H.binding }), P, [H.offset]);
            }
            const O = R(ye, 0),
                B = a.params(Nr, { count: i, counterIndex: 0, pad0: 0, pad1: 0 }),
                F = a.params(Qt, {
                    n: s,
                    items: s,
                    stride: A.stride ?? s,
                    r: 0,
                    flagIndex: 0,
                    giant: ye,
                    maxSteps: Os,
                    pad0: 0,
                }),
                M = { edgeSrc: n.bindings.src, edgeDst: n.bindings.dst, edgeWeight: o ?? n.bindings.src };
            for (let W = 0; W < kt; W++) {
                for (const Q of [f, p]) b.dispatch(N, b.bind({ dst: Q, P: O.binding }), P, [O.offset]);
                for (const Q of [v, y])
                    Q.dispatch(N, Q.bind({ ...M, comp: d, bestKey: f, bestEdge: p, P: B.binding }), E, [B.offset]);
                const H = a.params(Nr, { count: s, counterIndex: W, pad0: 0, pad1: 0 });
                k.dispatch(
                    N,
                    k.bind({
                        edgeSrc: M.edgeSrc,
                        edgeDst: M.edgeDst,
                        bestEdge: p,
                        comp: d,
                        treeEdge: g,
                        counters: m,
                        P: H.binding,
                    }),
                    P,
                    [H.offset],
                );
                for (let Q = 0; Q < D; Q++) S.dispatch(N, S.bind({ comp: d, P: F.binding }), A, [F.offset]);
            }
            T.endPass();
            const X = T.readback(m.buffer, 0, 4 * kt);
            a.flush();
            const q = await T.submit().readback;
            (r.assertReady(), (x = !1), t?.signal?.aborted);
            const j = new Uint32Array(q, X.offset, kt);
            let G = !1;
            for (const W of j) ((I += W), (G ||= W === 0));
            if (((L += kt), I > s - 1))
                throw new h("E_VALIDATION", `${Qe}: ${I} forest edges on ${s} nodes`, {
                    label: `${Qe}/counters`,
                    message: "a spanning forest has at most n - 1 edges",
                });
            if (G) break;
            if (L >= jf)
                throw new h("E_VALIDATION", `${Qe}: still merging after ${L} rounds`, {
                    label: `${Qe}/rounds`,
                    message: "Boruvka halves the components every round; the device did not",
                });
            T = new ne(r, `${Qe}/rounds`);
        }
        const C = new Uint32Array(s);
        return (await r.readback.read(g.buffer, 4 * s, C), r.assertReady(), t?.onProgress?.(1, 1), Hf(e, C, I));
    } finally {
        a.dispose();
    }
}
const ko = 8,
    Xf = 2 * ko + 2;
function Qf(r, e, t) {
    if (r === void 0) return null;
    if (r instanceof Float32Array && r.length === e && r.buffer instanceof ArrayBuffer) return r;
    throw new h("E_INVALID_ARGUMENT", `${t}: dest must be a Float32Array of length ${e} over an ArrayBuffer`, {
        argument: "dest",
        value: `${r.constructor.name}(${r.length})`,
        expected: `Float32Array(${e}) over an ArrayBuffer`,
    });
}
function Zf(r, e, t) {
    const s = r.residency.core(e);
    return (Pt(s, e.arcCount, r.caps.limits.maxStorageBufferBindingSize, t), s);
}
function Ot(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
function en(r, e) {
    return new h("E_ABORTED", `${r}: the signal was aborted`, e === void 0 ? {} : { batchId: e });
}
async function Io(r, e, t, s, i) {
    (r.assertReady(), await Ve(r));
    const n = e.nodeCount,
        o = s?.dampingFactor ?? 0.85,
        a = s?.maxIterations ?? 100,
        c = s?.tolerance ?? 1e-6,
        l = s?.weighted !== !1;
    if (!Number.isInteger(a) || a < 1)
        throw new h("E_INVALID_ARGUMENT", `${i}: maxIterations must be a positive integer`, {
            argument: "maxIterations",
            value: a,
            expected: "a positive integer",
        });
    const d = Qf(s?.dest, n, i);
    if (s?.signal?.aborted) throw en(i);
    if (n === 0)
        return (
            s?.onProgress?.(a, a),
            { scores: d ?? new Float32Array(0), iterations: 0, converged: !0, danglingMass: 0, precision: "f32" }
        );
    const f = Zf(r, e, i);
    if (e.arcCount === 0) {
        const k = d ?? new Float32Array(n);
        return (
            t === null ? k.fill(1 / n) : k.set(t),
            s?.onProgress?.(a, a),
            { scores: k, iterations: 0, converged: !0, danglingMass: 1, precision: "f32" }
        );
    }
    const p = r.residency.view(e, "reverse"),
        g = qr(p, p.scalars.arcCount[0]),
        m = l ? void 0 : null,
        b = l ? f : { ...f, weights: null, hasWeights: !1 },
        w = l ? g : { ...g, weights: null, hasWeights: !1 },
        v = je(r, i, Xf);
    let y = null;
    try {
        const k = 4 * n,
            S = v.scratch(k, "rankA"),
            P = v.scratch(k, "rankB"),
            E = v.scratch(k, "xNorm"),
            A = v.scratch(k, "outWeightSum"),
            D = z(n, r.workgroupSize, r.caps),
            $ = Us(D),
            T = Ie.byteLength * (1 + $),
            x = v.scratch(T, "partials"),
            L = v.scratch(Ie.byteLength, "lastHeader");
        (t !== null && (y = r.residency.array(t, `${i}/personalization`)), await r.allocator.check());
        const I = await Po(v, b, { op: "sum", valueSnippet: "v = weight;", tiers: null }),
            C = await Ds(v, w, { personalization: t !== null, dangling: !0, weights: m, tiers: null }),
            N = await r.pipelines.kernel(_("pr-scale", { NORM_MODE: 0 })),
            R = await r.pipelines.kernel(_("pr-finalize", { NORM_MODE: 0 })),
            O = z(1, r.workgroupSize, r.caps),
            { queue: B } = r.device;
        (B.writeBuffer(S, 0, new Float32Array(n).fill(1 / n)), B.writeBuffer(P, 0, new Float32Array(n)));
        const F = new ArrayBuffer(Ie.byteLength);
        (Ie.write(new DataView(F), { firstConverged: ye, iteration: 0 }), B.writeBuffer(x, 0, F));
        const M = [Ot(S, k), Ot(P, k)],
            X = Ot(E, k),
            K = Ot(A, k),
            q = Ot(x, T),
            j = Ot(L, Ie.byteLength),
            G = { alpha: o, beta: 1 - o, uniformP: 1 / n };
        let W = 0,
            H = 0;
        for (;;) {
            const Q = Math.min(ko, a - H),
                V = new ne(r, i);
            let U = V.pass("iterations");
            H === 0 && I.record(U, b, K);
            const oe = H + Q === a;
            for (let Z = 0; Z < Q + (oe ? 1 : 0); Z++) {
                const we = v.params(Ur, {
                        n,
                        groups: $,
                        iteration: H + Z + 1,
                        trackConvergence: 1,
                        convergeThreshold: c * n,
                    }),
                    me = 1 - W;
                Z === Q && (V.copy(q, j, Ie.byteLength), (U = V.pass("convergence")));
                const De = N.bind({
                    rankIn: M[W],
                    rankPrev: M[me],
                    outWeightSum: K,
                    xNorm: X,
                    partials: q,
                    P: we.binding,
                });
                N.dispatch(U, De, D, [we.offset]);
                const ot = R.bind({ partials: q, P: we.binding });
                if ((R.dispatch(U, ot, O, [we.offset]), Z === Q)) break;
                (C.record(U, w, { xNorm: X, rankOut: M[me], personalization: y?.binding ?? null, partials: q }, G),
                    (W = me));
            }
            V.endPass();
            const te = V.readback(x, 0, Ie.byteLength),
                de = oe ? V.readback(L, 0, Ie.byteLength) : te,
                pe = V.readback(M[W].buffer, 0, k);
            v.flush();
            const ge = V.submit(),
                ce = await ge.readback;
            if (((H += Q), r.assertReady(), s?.signal?.aborted)) throw en(i, ge.id);
            s?.onProgress?.(H, a);
            const ae = Ie.read(new DataView(ce), te.offset).firstConverged,
                Y = ae !== ye;
            if (Y || H >= a) {
                const Z = d ?? new Float32Array(n);
                return (
                    Z.set(new Float32Array(ce, pe.offset, n)),
                    Y && H < a && s?.onProgress?.(a, a),
                    {
                        scores: Z,
                        iterations: Y ? ae : H,
                        converged: Y,
                        danglingMass: Ie.read(new DataView(ce), de.offset).danglingMass,
                        precision: "f32",
                    }
                );
            }
        }
    } finally {
        (y?.destroy(), v.dispose());
    }
}
function Jf(r, e, t) {
    return Io(r, e, null, t, "pageRank");
}
async function eh(r, e, t, s) {
    const i = e.nodeCount,
        n = (c, l) =>
            new h("E_INVALID_ARGUMENT", `personalizedPageRank: personalization must be ${l}`, {
                argument: "personalization",
                value: c,
                expected: l,
            });
    if (!(t instanceof Float32Array) || t.length !== i)
        throw n(`${t.constructor.name}(${t.length})`, `a Float32Array of length ${i}`);
    let o = 0;
    for (let c = 0; c < i; c++) {
        const l = t[c];
        if (!Number.isFinite(l) || l < 0) throw n(l, "finite and non-negative in every entry");
        o += l;
    }
    if (i > 0 && !(o > 0)) throw n(o, "a vector whose entries sum to a positive number");
    const a = new Float32Array(i);
    for (let c = 0; c < i; c++) a[c] = t[c] / o;
    return Io(r, e, a, s, "personalizedPageRank");
}
function Ys(r, e, t, s) {
    r.assertReady();
    const i = e.nodeCount,
        n = t?.maxIterations ?? 100,
        o = t?.tolerance ?? 1e-6;
    if (!Number.isInteger(n) || n < 1)
        throw new h("E_INVALID_ARGUMENT", `${s}: maxIterations must be a positive integer`, {
            argument: "maxIterations",
            value: n,
            expected: "a positive integer",
        });
    const a = Ud(t?.dest, i, s);
    if (t?.signal?.aborted) throw ho(s);
    return { n: i, maxIterations: n, tolerance: o, weights: t?.weighted === !1 ? null : void 0, dest: a };
}
function tn(r, e, t) {
    const s = r ?? e;
    if (!Number.isFinite(s))
        throw new h("E_INVALID_ARGUMENT", `katzCentrality: ${t} must be a finite number`, {
            argument: t,
            value: s,
            expected: "a finite number",
        });
    return s;
}
function Ns(r, e, t) {
    let s = 0;
    for (const o of r) s += t === "sum" ? Math.abs(o) : o * o;
    const i = t === "sum" ? s : Math.sqrt(s),
        n = e ?? r;
    for (let o = 0; o < r.length; o++) n[o] = i > 0 ? r[o] / i : r[o];
    return n;
}
function Ao(r, e, t) {
    return { scores: Ns(r.scores, e, t), iterations: r.iterations, converged: r.converged, precision: "f32" };
}
function Xs(r, e, t) {
    return (t?.(e, e), { scores: r ?? new Float32Array(0), iterations: 0, converged: !0, precision: "f32" });
}
function rn(r, e) {
    const t = r.iterationsRun % 2 === 0 ? r.iterationsRun : r.iterationsRun - 1,
        s = e.iterationsRun % 2 === 1 ? e.iterationsRun : e.iterationsRun - 1,
        i = t >= s ? r : e;
    return (Math.max(t, s) === i.iterationsRun ? i.scores : i.previous) ?? i.scores;
}
async function th(r, e, t) {
    const s = "eigenvectorCentrality",
        i = Ys(r, e, t, s);
    if (i.n === 0) return Xs(i.dest, i.maxIterations, t?.onProgress);
    const n = await Br(r, i.n, {
        normMode: 2,
        adjacency: fo(r, e, s),
        alternate: null,
        alpha: 1,
        beta: 0,
        uniformP: 0,
        maxIterations: i.maxIterations,
        tolerance: i.tolerance,
        weights: i.weights,
        label: s,
        signal: t?.signal,
        onProgress: t?.onProgress,
    });
    return Ao(n, i.dest, "l2");
}
async function rh(r, e, t) {
    const s = "katzCentrality",
        i = tn(t?.alpha, 0.1, "alpha"),
        n = tn(t?.beta, 1, "beta"),
        o = Ys(r, e, t, s);
    if (o.n === 0) return Xs(o.dest, o.maxIterations, t?.onProgress);
    const a = await Br(r, o.n, {
        normMode: 4,
        adjacency: Hs(r, e),
        alternate: null,
        alpha: i,
        beta: n,
        uniformP: 1,
        maxIterations: o.maxIterations,
        tolerance: o.tolerance,
        weights: o.weights,
        label: s,
        signal: t?.signal,
        onProgress: t?.onProgress,
    });
    return Ao(a, o.dest, "l2");
}
async function sh(r, e, t) {
    const s = "hits",
        i = Ys(r, e, t, s),
        n = 2 * i.maxIterations;
    if (i.n === 0) {
        const { scores: p, iterations: g, converged: m, precision: b } = Xs(i.dest, n, t?.onProgress);
        return { hubs: p, authorities: new Float32Array(0), iterations: g, converged: m, precision: b };
    }
    const o = t?.onProgress,
        a = {
            normMode: 1,
            alpha: 1,
            beta: 0,
            uniformP: 0,
            maxIterations: i.maxIterations,
            tolerance: i.tolerance,
            weights: i.weights,
            signal: t?.signal,
        },
        c = fo(r, e, s),
        l = Hs(r, e),
        d = await Br(r, i.n, {
            ...a,
            adjacency: l,
            alternate: c,
            label: `${s}/hub-seeded`,
            onProgress:
                o === void 0
                    ? void 0
                    : (p) => {
                          o(p, n);
                      },
        }),
        f = await Br(r, i.n, {
            ...a,
            adjacency: c,
            alternate: l,
            label: `${s}/authority-seeded`,
            onProgress:
                o === void 0
                    ? void 0
                    : (p) => {
                          o(i.maxIterations + p, n);
                      },
        });
    return {
        hubs: Ns(rn(d, f), i.dest, "sum"),
        authorities: Ns(rn(f, d), null, "sum"),
        iterations: Math.max(d.iterations, f.iterations),
        converged: d.converged && f.converged,
        precision: "f32",
    };
}
const ir = "triangleCount",
    ih = 1024;
function nh(r, e) {
    return null;
}
function sn(r, e) {
    const t = r.length,
        s = new Float32Array(t);
    let i = 0,
        n = 0;
    for (let o = 0; o < t; o++) {
        const a = e[o + 1] - e[o],
            c = r[o];
        if (((i += c), a >= 2)) {
            const l = (a * (a - 1)) / 2;
            ((n += l), (s[o] = c / l));
        }
    }
    return { perNode: r, total: i / 3, coefficient: s, transitivity: n === 0 ? 0 : i / n };
}
async function oh(r, e, t) {
    return await ah(r, e, 0, t);
}
async function ah(r, e, t, s) {
    (r.assertReady(), await Ve(r));
    const i = e.nodeCount,
        n = nh();
    if (i === 0) return sn(n ?? new Uint32Array(0), new Uint32Array(1));
    const o = je(r, ir, ih);
    try {
        const a = await Eo(r, e, o, !1, ir),
            { graph: c, batch: l } = a,
            d = r.workgroupSize,
            f = 4 * i,
            p = { buffer: o.scratch(f, "counts"), offset: 0, size: f, window: null },
            g = await r.pipelines.kernel(_("fill")),
            m = l.pass("triangles");
        let b = null;
        const w = o.params(Ae, { count: i, value: 0, mode: 0, pad0: 0 });
        if (
            (g.dispatch(m, g.bind({ dst: p, P: w.binding }), z(i, d, r.caps), [w.offset]),
            c.arcCount > 0 && c.colIdx !== null && c.src !== null)
        ) {
            const D = c.arcCount / 2,
                $ = await r.pipelines.kernel(_("orient-flags")),
                T = await r.pipelines.kernel(_("tri-intersect", { SEARCH: t })),
                x = await Kr(o),
                L = await _o(o),
                I = (j, G) => ({ buffer: o.scratch(4 * j, G), offset: 0, size: 4 * j, window: null }),
                C = I(c.arcCount, "orient/flags"),
                N = I(c.arcCount, "orient/src"),
                R = I(c.arcCount, "orient/dst"),
                O = I(i + 1, "orient/rowPtr"),
                B = I(D, "orient/colIdx"),
                F = I(1, "orient/count"),
                M = I(1, "orient/flag"),
                X = z(c.arcCount, d, r.caps),
                K = o.params(nt, { count: c.arcCount, pad0: 0, pad1: 0, pad2: 0 });
            ($.dispatch(m, $.bind({ rowPtr: c.rowPtr, colIdx: c.colIdx, src: c.src, flags: C, P: K.binding }), X, [
                K.offset,
            ]),
                x.record(m, { queue: c.src, flags: C, count: c.arcCount, out: N, outCount: F, outIndex: 0 }),
                x.record(m, { queue: c.colIdx, flags: C, count: c.arcCount, out: R, outCount: F, outIndex: 0 }),
                L.record(m, {
                    src: N,
                    dst: R,
                    weights: null,
                    count: D,
                    n: i,
                    sortedInput: !0,
                    out: { rowPtr: O, colIdx: B, weights: null, flag: M },
                }),
                (b = M));
            const q = o.params(nt, { count: D, pad0: 0, pad1: 0, pad2: 0 });
            T.dispatch(m, T.bind({ rowPtr: O, colIdx: B, src: N, counts: p, P: q.binding }), z(D, d, r.caps), [
                q.offset,
            ]);
        }
        l.endPass();
        const v = l.readback(p.buffer, 0, f),
            y = l.readback(c.rowPtr.buffer, 0, 4 * (i + 1)),
            k = b === null ? null : l.readback(b.buffer, 0, 4);
        o.flush();
        const P = await l.submit().readback;
        if ((r.assertReady(), s?.signal?.aborted, Ls(P, a, ir), k !== null && new Uint32Array(P, k.offset, 1)[0] !== 0))
            throw new h("E_VALIDATION", `${ir}: the oriented arcs reached cooToCsr out of order`, {
                label: `${ir}/oriented`,
                message: "the sorted-input precondition of cooToCsr failed on the device",
            });
        const E = n ?? new Uint32Array(i);
        E.set(new Uint32Array(P, v.offset, i));
        const A = new Uint32Array(P, y.offset, i + 1);
        return (s?.onProgress?.(1, 1), sn(E, A));
    } finally {
        o.dispose();
    }
}
function ch(r) {
    let e = 1;
    for (; e < r;) e *= 2;
    return e;
}
function lh(r) {
    let e = 1;
    for (; e * 2 <= r;) e *= 2;
    return e;
}
function uh(r, e) {
    const t = (n) => (e === 3 ? n * n * n : n * n);
    let s = 1;
    for (; t(s) < r;) s *= 2;
    let i = 0;
    for (; i < s;) {
        const n = Math.floor((i + s) / 2);
        t(n) >= r ? (s = n) : (i = n + 1);
    }
    return i;
}
function ut(r, e, t) {
    const s = e === 3 ? t.gridMax3D : t.gridMax2D,
        i = Math.max(pi, lh(Math.max(1, s))),
        n = Math.min(i, Math.max(pi, ch(2 * uh(r, e))));
    let o = 1;
    for (let f = n; f > gi; f /= 2) o++;
    const a = n ** e,
        c = 2 ** e,
        l = [0];
    let d = n;
    for (let f = 0; f + 1 < o; f++) (l.push(l[f] + d ** e + (f === 0 ? c : 0)), (d /= 2));
    return {
        dim: e,
        g: n,
        levels: o,
        cells: a,
        outsideCells: c,
        histWords: a + c + 1,
        levelOffsets: Object.freeze(l),
        pyramidCells: l[o - 1] + gi ** e,
        deterministic: t.deterministic,
    };
}
function dh(r) {
    return 16 * r.pyramidCells;
}
async function fh(r, e) {
    const t = await r.pipelines.kernel(_("grid-cell-key")),
        s = e.deterministic
            ? { kind: "radix", radix: await Ks(r), histogram: await bo(r), scan: await Dt(r) }
            : { kind: "counting", counting: await yf(r) };
    return new hh(r, e, t, s);
}
class hh {
    constructor(e, t, s, i) {
        ((this.bound = null),
            (this.dispatches = 0),
            (this.scope = e),
            (this.spec = t),
            (this.cellKey = s),
            (this.path = i));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    bind(e) {
        const t = Math.floor(e.cellKey.size / 4);
        if (t < 1)
            throw new h("E_INVALID_ARGUMENT", "gridBuild: cellKey must hold at least one word", {
                argument: "cellKey",
                value: e.cellKey.size,
                expected: 4,
            });
        const s = this.path.kind === "radix" ? Hr(t, this.scope.workgroupSize) / 4 : this.spec.histWords;
        this.bound = {
            bindings: e,
            capacity: t,
            scratchA: this.scratch(s, "grid/sort-scratch-a"),
            scratchB: this.scratch(s, "grid/sort-scratch-b"),
        };
    }
    record(e, t, s, i) {
        const { bound: n } = this;
        if (n === null) throw new h("E_NOT_LOADED", "gridBuild: record() before bind()", { argument: "bind" });
        if (!Number.isSafeInteger(t) || t < 1 || t > n.capacity)
            throw new h("E_INVALID_ARGUMENT", "gridBuild: n must be an integer in [1, the capacity]", {
                argument: "n",
                value: t,
                expected: n.capacity,
            });
        const o = i ?? "G3",
            a = n.bindings,
            c = this.cellKey.bind({ pos: a.pos, S: a.state, cellKey: a.cellKey, cellVal: a.cellVal, P: a.params });
        if (
            (this.cellKey.dispatch(e, c, z(t, this.scope.workgroupSize, this.scope.caps), [s]),
            (this.dispatches = 1),
            o === "G1")
        )
            return;
        const { histWords: l } = this.spec;
        if (this.path.kind === "counting") {
            const { counting: g } = this.path,
                m = { hist: a.cellHist, cursor: n.scratchA };
            (g.record(e, a.cellKey, t, l, m, a.sortedIdx, a.cellStart), (this.dispatches += g.lastDispatches));
            return;
        }
        const { radix: d, histogram: f, scan: p } = this.path;
        (d.record(e, a.cellKey, a.cellVal, t, ra, {
            keys: a.sortedKey,
            vals: a.sortedIdx,
            hist: n.scratchA,
            offsets: n.scratchB,
        }),
            (this.dispatches += d.lastDispatches),
            o !== "G2" &&
                (f.record(e, a.cellKey, t, l, a.cellHist),
                p.record(e, a.cellHist, l, a.cellStart),
                (this.dispatches += f.lastDispatches + p.lastDispatches)));
    }
    scratch(e, t) {
        const s = 4 * Math.max(1, e);
        return { buffer: this.scope.scratch(s, t), offset: 0, size: s, window: null };
    }
}
const ms = 34359738337,
    ph = 185852,
    gh = 1;
class mh {
    constructor(e) {
        ((this.seed = e === null || e === 0 || Number.isNaN(e) ? Math.floor(Math.random() * 1e6) : e),
            (this.state = this.seed % ms));
    }
    next() {
        return ((this.state = (ph * this.state + gh) % ms), this.state / ms);
    }
}
function wh(r) {
    const e = [0, 0, 0];
    if (r === null) return e;
    for (let t = 0; t < 3 && t < r.length; t++) {
        const s = r[t];
        if (!Number.isFinite(s))
            throw new h("E_INVALID_ARGUMENT", `center[${t}] is not finite`, {
                argument: "center",
                value: s,
                expected: "finite components",
            });
        e[t] = s;
    }
    return e;
}
function bh(r, e, t, s, i, n, o) {
    const a = r.nodeCount;
    if (s !== 2 && s !== 3)
        throw new h("E_INVALID_ARGUMENT", `dim must be 2 or 3, got ${String(s)}`, {
            argument: "dim",
            value: s,
            expected: "2 or 3",
        });
    if (e.length !== 3 * a)
        throw new h("E_INVALID_ARGUMENT", `positions has ${e.length} entries, expected ${3 * a}`, {
            argument: "positions",
            value: e.length,
            expected: 3 * a,
        });
    if (!Number.isFinite(i) || i <= 0)
        throw new h("E_INVALID_ARGUMENT", `scale must be a finite number > 0, got ${i}`, {
            argument: "scale",
            value: i,
            expected: "a finite number > 0",
        });
    const c = wh(n),
        l = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
        d = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    let f = 0,
        p = 0;
    for (let y = 0; y < a; y++) {
        let k = !0;
        for (let S = 0; S < s; S++) {
            const P = e[3 * y + S];
            Number.isFinite(P) ? (P < l[S] && (l[S] = P), P > d[S] && (d[S] = P)) : (k = !1);
        }
        k ? f++ : p++;
    }
    if (p === 0) return;
    const g = o === "fr" ? 0 : -1,
        m = 1,
        b = [g, g, g],
        w = [m, m, m];
    if (f > 0) {
        for (let y = 0; y < s; y++)
            if (
                Number.isFinite(l[y]) &&
                Number.isFinite(d[y]) &&
                ((b[y] = (l[y] - c[y]) / i), (w[y] = (d[y] - c[y]) / i), b[y] === w[y])
            ) {
                const k = (m - g) / 2;
                ((b[y] -= k), (w[y] += k));
            }
    }
    const v = new mh(t);
    for (let y = 0; y < a; y++) {
        let k = !1;
        for (let S = 0; S < s; S++) Number.isFinite(e[3 * y + S]) || (k = !0);
        if (k) {
            for (let S = 0; S < s; S++) {
                const P = 3 * y + S;
                if (!Number.isFinite(e[P])) {
                    const E = v.next(),
                        A = b[S] + E * (w[S] - b[S]);
                    e[P] = A * i + c[S];
                }
            }
            s === 2 && (e[3 * y + 2] = c[2]);
        }
    }
}
const vh = [
        ["n", 1],
        ["dim", 1],
        ["flags", 1],
        ["iterationIndex", 1],
        ["seed", 1],
        ["scale", 1],
        ["center", 4],
        ["settleThreshold", 1],
    ],
    yh = [
        ["centroid", 4],
        ["min", 4],
        ["max", 4],
        ["rmsRadius", 1],
        ["radius", 1],
        ["meanDisplacement", 1],
        ["iteration", 1],
        ["settledCount", 1],
    ],
    _h = new Set(["positions", "scenePositions", "fixed", "partials", "state", "trace"]),
    Ph = new Set([
        "fixed",
        "trace",
        "cellKey",
        "cellVal",
        "sortedKey",
        "sortedIdx",
        "cellHist",
        "cellStart",
        "hubList",
        "hubCounters",
    ]),
    Sh = "toScene";
let nn = 0;
function ee(r, e, t, s) {
    return new h("E_INVALID_ARGUMENT", s, { argument: r, value: e, expected: t });
}
function on(r) {
    return new h("E_DISPOSED", `${r} is disposed`, { label: r });
}
function Nt(r) {
    return r instanceof Error ? r : new Error(typeof r == "string" ? r : "unknown error");
}
function ws(r, e) {
    return r[e];
}
function Qs(r) {
    switch (r) {
        case "u32":
        case "i32":
        case "f32":
            return 1;
        case "vec2f":
        case "vec2u":
            return 2;
        case "vec4f":
        case "vec4u":
            return 4;
        default:
            throw ee("type", r, "a UniformFieldType", "unknown uniform field type");
    }
}
function xo(r, e) {
    for (const [t, s] of r.fields) if (t === e) return s;
    return null;
}
function Ro(r, e) {
    const t = xo(r, e);
    if (t === null)
        throw ee(
            "field",
            e,
            r.fields.map((s) => s[0]),
            `block ${r.name} has no field ${e}`,
        );
    return t;
}
function an(r, e, t) {
    for (const [s, i] of e) {
        const n = xo(r, s);
        if (n === null)
            throw ee(
                t,
                s,
                e.map((o) => o[0]),
                `${t} block ${r.name} must declare ${s}`,
            );
        if (Qs(n) !== i) throw ee(t, s, `a field of width ${i}`, `${t}.${s} must have width ${i}`);
    }
}
function cn(r) {
    return JSON.stringify(
        Object.keys(r)
            .sort()
            .map((e) => [e, r[e]]),
    );
}
function ln(r, e) {
    return { ...r, msPerIteration: e };
}
function Eh(r) {
    return typeof SharedArrayBuffer < "u" && r instanceof SharedArrayBuffer;
}
function bs(r) {
    const e = r.scale ?? At.scale;
    if (!Number.isFinite(e) || e <= 0)
        throw ee("scale", e, "a finite number > 0", `scale must be a finite number > 0, got ${e}`);
    return e;
}
function vs(r) {
    const e = [0, 0, 0],
        { center: t } = r;
    if (t === void 0) return e;
    for (let s = 0; s < 3 && s < t.length; s++) {
        const i = t[s];
        if (!Number.isFinite(i)) throw ee("center", i, "finite components", `center[${s}] is not finite`);
        e[s] = i;
    }
    return e;
}
function gr(r, e) {
    return r.repulsion === "exact"
        ? "exact"
        : r.repulsion === "grid"
          ? "grid"
          : e <= r.exactMaxNodes
            ? "exact"
            : "grid";
}
function nr(r, e) {
    return { buffer: r, offset: 0, size: e, window: null };
}
class kh {
    constructor(e) {
        ((this.shadow = new Map()), (this.queued = new Map()), (this.block = e), this.reset());
    }
    set(e, t) {
        const s = Qs(Ro(this.block, e));
        if (!(s === 1 ? typeof t == "number" : typeof t != "number" && t.length === s))
            throw ee("value", t, `a value of width ${s}`, `state field ${e} takes a value of width ${s}`);
        (this.shadow.set(e, t), this.queued.set(e, t));
    }
    get(e) {
        const t = this.shadow.get(e);
        if (t === void 0)
            throw ee(
                "field",
                e,
                this.block.fields.map((s) => s[0]),
                `state block has no field ${e}`,
            );
        return t;
    }
    reset() {
        (this.shadow.clear(), this.queued.clear());
        const e = this.block.read(new DataView(new ArrayBuffer(this.block.byteLength)));
        for (const [t, s] of Object.entries(e)) this.shadow.set(t, s);
    }
    headerBytes() {
        const e = new ArrayBuffer(this.block.byteLength);
        return (this.block.write(new DataView(e), Object.fromEntries(this.shadow)), e);
    }
    absorb(e) {
        for (const [t, s] of Object.entries(this.block.read(e))) this.queued.has(t) || this.shadow.set(t, s);
    }
    takeQueued() {
        const e = [...this.queued.keys()];
        return (this.queued.clear(), e);
    }
    clearQueued() {
        this.queued.clear();
    }
}
function Ih(r, e) {
    let t = () => {},
        s = () => {};
    const i = new Promise((n, o) => {
        ((t = n), (s = o));
    });
    return {
        k: r,
        generation: e,
        promise: i,
        resolve: () => {
            t();
        },
        reject: (n) => {
            s(n);
        },
        id: 0,
        submitted: null,
        stale: !1,
        startedAt: 0,
        sceneOffset: 0,
        stateOffset: 0,
        profile: null,
    };
}
class Zs {
    constructor(e, t, s, i, n) {
        if (
            ((this.overrideList = new Map()),
            (this.pending = []),
            (this.stateValue = "created"),
            (this.generationValue = 0),
            (this.snapshot = null),
            (this.serial = null),
            (this.owner = null),
            (this.n = 0),
            (this.scale = 1),
            (this.center = [0, 0, 0]),
            (this.buffers = null),
            (this.core = null),
            (this.resources = null),
            (this.weightsUpload = null),
            (this.ready = Promise.resolve()),
            (this.submitChain = Promise.resolve()),
            (this.fixedWords = new Uint32Array(0)),
            (this.fixedDirty = !1),
            (this.iterationsSubmitted = 0),
            (this.iterationsDoneValue = 0),
            (this.settledCountValue = 0),
            (this.settledValue = !1),
            (this.firstPending = !0),
            (this.statsValue = null),
            (this.lastPassTimingsValue = null),
            (this.lastSubmittedBatchIdValue = 0),
            (this.reheatedAfterBatchId = 0),
            (this.coalescedValue = 0),
            (this.torndown = !1),
            e.assertReady(),
            an(t.params, vh, "model.params"),
            an(t.state, yh, "model.state"),
            t.params.byteLength > Ye)
        )
            throw ee("model.params", t.params.byteLength, `<= ${Ye} bytes`, "the params block must fit one ring slot");
        if (t.state.byteLength > He)
            throw ee("model.state", t.state.byteLength, `<= ${He} bytes`, "the state block must fit the state header");
        if (t.stages.length === 0)
            throw ee("model.stages", t.stages, "at least one stage name", "a model declares its stages");
        const o = s.maxInFlight ?? At.maxInFlight;
        if (!Number.isInteger(o) || o < 1)
            throw ee("maxInFlight", o, "an integer >= 1", `maxInFlight must be an integer >= 1, got ${o}`);
        const a = s.dim ?? At.dim;
        if (a !== 2 && a !== 3) throw ee("dim", a, "2 or 3", `dim must be 2 or 3, got ${String(a)}`);
        (bs(s),
            vs(s),
            nn++,
            (this.ctx = e),
            (this.model = t),
            (this.tuning = i),
            (this.resolveOptions = n),
            (this.optionsValue = s),
            (this.maxInFlight = o),
            (this.dimValue = a),
            (this.tierValue = i.repulsion === "grid" ? "grid" : "exact"),
            (this.label = `${t.kind}#${nn}`),
            (this.traceBytes = t.trace.byteLength),
            (this.writer = new kh(t.state)),
            (this.ring = new qs(e.device, e.allocator, (o + 1) * Fe, `${this.label}/ring`)),
            (this.unregisterLost = e.onLost((c) => {
                this.onDeviceLost(c);
            })),
            e.debug.inspect &&
                ((this.inspect = (c) => this.inspectBuffer(c)), (this.debugRunStages = (c) => this.runStages(c))));
    }
    get state() {
        return this.stateValue;
    }
    get options() {
        return this.optionsValue;
    }
    get tier() {
        return this.tierValue;
    }
    get lastPassTimings() {
        return this.lastPassTimingsValue;
    }
    get generation() {
        return this.generationValue;
    }
    get nodeCount() {
        return this.n;
    }
    get dim() {
        return this.dimValue;
    }
    get settled() {
        return this.settledValue;
    }
    get inFlight() {
        return this.pending.length;
    }
    get iterationsDone() {
        return this.iterationsDoneValue;
    }
    get stats() {
        if (this.statsValue !== null) return this.statsValue;
        const e = new DataView(this.writer.headerBytes()),
            t = new DataView(new ArrayBuffer(0));
        return ln(this.model.readStats(e, t), null);
    }
    get overrides() {
        return this.overrideList;
    }
    get lastSubmittedBatchId() {
        return this.lastSubmittedBatchIdValue;
    }
    get coalesced() {
        return this.coalescedValue;
    }
    load(e, t) {
        if ((this.assertNotDisposed(), this.ctx.assertReady(), e.directed))
            throw new h("E_SNAPSHOT", "a layout needs an undirected snapshot: pass toUndirected().snapshot", {
                reason: "directed",
                serial: e.serial,
            });
        const s = e.nodeCount;
        if (s > ts)
            throw new h("E_TOO_LARGE", `${s} nodes exceed ${ts} (the third partials level is P4)`, {
                needed: s,
                limit: ts,
                path: "partials",
                algorithm: this.model.kind,
            });
        if (t.length !== 3 * s)
            throw ee("positions", t.length, 3 * s, `positions has ${t.length} entries, expected ${3 * s}`);
        if (Eh(t.buffer))
            throw ee(
                "positions",
                "SharedArrayBuffer",
                "an ArrayBuffer-backed Float32Array",
                "positions must not be backed by a SharedArrayBuffer",
            );
        const i = bs(this.optionsValue),
            n = vs(this.optionsValue),
            o = gr(this.tuning, s),
            a = 16 * s;
        if (a > this.ctx.caps.limits.maxBufferSize)
            throw new h("E_TOO_LARGE", `${a} bytes of positions exceed maxBufferSize`, {
                needed: a,
                limit: this.ctx.caps.limits.maxBufferSize,
                path: "positions",
                algorithm: this.model.kind,
            });
        let c = null,
            l = null,
            d = null;
        if (s > 0) {
            if (((c = this.ctx.residency.core(e)), c.plan === "windowed"))
                throw new h("E_TOO_LARGE", "a windowed core cannot be walked by the layout kernels until P4", {
                    needed: e.arcCount,
                    limit: this.ctx.caps.limits.maxStorageBufferBindingSize,
                    path: "windowed",
                    algorithm: this.model.kind,
                });
            if (
                (e.degreeOrder().segmentOffsets[2] > 0 && (l = cd(this.ctx.residency.view(e, "degreeOrder"))),
                (d = this.model.inputs(e, this.optionsValue)),
                d.mass.length !== s)
            )
                throw ee("nodeMass", d.mass.length, s, `the model resolved ${d.mass.length} masses for ${s} nodes`);
            const v = Math.ceil(s / 32);
            if (d.fixed !== void 0 && d.fixed !== null && d.fixed.length < v)
                throw ee(
                    "fixed",
                    d.fixed.length,
                    v,
                    `the model resolved a fixed mask of ${d.fixed.length} words, ${v} needed for ${s} nodes`,
                );
        }
        (this.generationValue++, this.discardPending());
        const f = this.buffers === null || s !== this.n || e.serial !== this.serial;
        if (
            ((this.snapshot = e),
            (this.serial = e.serial),
            (this.owner = t),
            (this.n = s),
            (this.tierValue = o),
            (this.scale = i),
            (this.center = n),
            (this.core = c),
            (this.iterationsSubmitted = 0),
            (this.iterationsDoneValue = 0),
            (this.settledCountValue = 0),
            (this.firstPending = !0),
            (this.statsValue = null),
            this.writer.reset(),
            f && (this.destroyBuffers(), this.overrideList.clear(), (this.fixedWords = Bo(s)), (this.fixedDirty = !1)),
            d?.fixed !== void 0 &&
                d.fixed !== null &&
                (this.fixedWords.set(d.fixed.subarray(0, Math.ceil(s / 32))), (this.fixedDirty = !0)),
            s === 0 || c === null || d === null)
        ) {
            ((this.weightsUpload = null),
                (this.resources = null),
                (this.ready = this.ready.catch(() => {})),
                (this.settledValue = !0),
                (this.stateValue = "loaded"));
            return;
        }
        const p = f ? this.allocate(s) : this.requireBuffers();
        (f || this.clearKept(p), (this.buffers = p));
        const g = this.model.kind === "fruchtermanReingold" ? "fr" : "fa2";
        (bh(e, t, this.optionsValue.seed ?? null, this.dimValue, i, n, g), this.uploadPositions(p, t, d.mass));
        const m = this.resolveWeightsBinding(e, c, d.weights),
            b = { ...this.model.overrides(this.optionsValue), ...Ge(c, l?.perm ?? null, m) },
            w = this.makeResources(c, l, m, p);
        ((this.resources = w), this.startBind(w, b), (this.settledValue = !1), (this.stateValue = "loaded"));
    }
    step(e) {
        if (this.stateValue === "created")
            return Promise.reject(new h("E_NOT_LOADED", `${this.label}: load() first`, { state: "created" }));
        if (this.stateValue === "disposed") return Promise.reject(on(this.label));
        try {
            this.ctx.assertReady();
        } catch (n) {
            return Promise.reject(Nt(n));
        }
        const { snapshot: t } = this;
        if (t !== null && this.ctx.residency.isReleased(t.serial))
            return Promise.reject(
                new h("E_RELEASED", `snapshot ${t.serial} was released while ${this.label} used it`, {
                    serial: t.serial,
                }),
            );
        const s = e ?? this.optionsValue.iterationsPerStep ?? At.iterationsPerStep;
        if (!Number.isInteger(s) || s < 1 || s > Fe)
            return Promise.reject(
                ee(
                    "iterations",
                    s,
                    `an integer in [1, ${Fe}]`,
                    `step(${s}): iterations must be an integer in [1, ${Fe}]`,
                ),
            );
        if (this.settledValue || this.n === 0) return Promise.resolve();
        if (this.pending.length >= this.maxInFlight) return (this.coalescedValue++, this.pending[0].promise);
        const i = Ih(s, this.generationValue);
        return (this.pending.push(i), (this.submitChain = this.submitChain.then(() => this.submitBatch(i))), i.promise);
    }
    async flush() {
        for (; this.pending.length > 0;) await Promise.allSettled(this.pending.map((e) => e.promise));
    }
    async run(e) {
        this.assertNotDisposed();
        const t = e?.batch ?? 8;
        if (!Number.isInteger(t) || t < 1 || t > Fe)
            throw ee(
                "batch",
                t,
                `an integer in [1, ${Fe}]`,
                "run(): batch must be an integer in [1, MAX_ITERATIONS_PER_STEP]",
            );
        const s = e?.maxIter ?? this.iterationBudget();
        if (Number.isNaN(s) || s < 0) throw ee("maxIter", s, "a number >= 0", "run(): maxIter must be >= 0");
        const i = e?.signal,
            n = () => {
                this.discardPending();
            };
        if (i !== void 0) {
            if (i.aborted) throw this.abortedError();
            i.addEventListener("abort", n, { once: !0 });
        }
        try {
            for (; !this.settled && this.iterationsDoneValue < s;) {
                if (i?.aborted === !0) throw this.abortedError();
                const o = Math.min(t, s - this.iterationsDoneValue);
                await this.step(o);
            }
            if (i?.aborted === !0) throw this.abortedError();
            return this.stats;
        } finally {
            i?.removeEventListener("abort", n);
        }
    }
    setFixed(e) {
        this.assertLoaded();
        const { n: t } = this,
            s = Math.ceil(t / 32);
        if (e.length < s)
            throw ee("mask", e.length, s, `setFixed: the mask has ${e.length} words, ${s} needed for ${t} nodes`);
        let i = !1;
        for (let n = 0; n < s && !i; n++) {
            if (this.fixedWords[n] === e[n]) continue;
            const o = Math.min(t, n * 32 + 32);
            for (let a = n * 32; a < o; a++)
                if (ui(this.fixedWords, a) && !ui(e, a)) {
                    i = !0;
                    break;
                }
        }
        (this.fixedWords.set(e.subarray(0, s)), (this.fixedDirty = !0), i && this.reheat());
    }
    setPosition(e, t, s, i) {
        this.assertLoaded();
        const { n } = this;
        if (!Number.isInteger(e) || e < 0 || e >= n)
            throw ee("index", e, `an integer in [0, ${n})`, `setPosition(${e}): index out of range`);
        if (!Number.isFinite(t) || !Number.isFinite(s) || !Number.isFinite(i))
            throw ee("position", [t, s, i], "finite coordinates", "setPosition: coordinates must be finite");
        const { owner: o, buffers: a } = this;
        if (o === null || a === null)
            throw new h("E_NOT_LOADED", `${this.label}: load() first`, { state: this.stateValue });
        ((o[3 * e] = t), (o[3 * e + 1] = s), (o[3 * e + 2] = i));
        const [c, l, d] = this.center,
            f = new Float32Array([
                (t - c) / this.scale,
                (s - l) / this.scale,
                this.dimValue === 2 ? 0 : (i - d) / this.scale,
            ]);
        (this.ctx.device.queue.writeBuffer(a.positions, 16 * e, f),
            this.overrideList.set(e, this.lastSubmittedBatchIdValue),
            this.reheat());
    }
    reheat() {
        (this.assertNotDisposed(),
            (this.iterationsDoneValue = 0),
            (this.settledCountValue = 0),
            (this.reheatedAfterBatchId = this.lastSubmittedBatchIdValue),
            this.writer.set("settledCount", 0),
            this.model.onReheat(this.writer),
            (this.settledValue = this.computeSettled()));
    }
    setParams(e) {
        this.assertNotDisposed();
        const t = this.optionsValue,
            { dim: s, maxInFlight: i } = e;
        if (s !== void 0 && s !== this.dimValue)
            throw ee(
                "dim",
                s,
                this.dimValue,
                "dim is fixed at construction; graphty-element re-creates the engine on a view-mode switch (spec 7.13)",
            );
        if (i !== void 0 && i !== this.maxInFlight)
            throw ee(
                "maxInFlight",
                i,
                this.maxInFlight,
                "maxInFlight is fixed at construction (the uniform ring is sized by it)",
            );
        const n = ws(e, "nodeSize");
        if (n != null)
            throw new h("E_UNSUPPORTED", "nodeSize (adjustSizes) is deferred (spec 7.14)", {
                option: "nodeSize",
                hint: "leave nodeSize null; the size correction ships in a later slice",
            });
        const o = this.resolveOptions(e, t),
            a = bs(o),
            c = vs(o),
            l = cn(this.model.overrides(t)),
            d = cn(this.model.overrides(o));
        ((this.optionsValue = o), (this.scale = a), (this.center = c));
        const { resources: f, core: p } = this;
        if (this.stateValue === "loaded" && f !== null && p !== null && l !== d) {
            const g = { ...this.model.overrides(o), ...Ge(p, f.tiers?.perm ?? null, f.weights) };
            this.startBind(f, g);
        }
        (this.model.onSetParams(e, this.writer), this.reheat());
    }
    dispose() {
        this.stateValue !== "disposed" && ((this.stateValue = "disposed"), this.teardown());
    }
    async submitBatch(e) {
        try {
            (await this.ready, await this.ctx.allocator.check());
        } catch (s) {
            if ((this.finish(e), this.isStale(e))) {
                e.resolve();
                return;
            }
            (Ir(s, "E_OUT_OF_MEMORY") && this.outOfMemory(), e.reject(Nt(s)));
            return;
        }
        if (this.isStale(e)) {
            (this.finish(e), e.resolve());
            return;
        }
        let t;
        try {
            t = this.recordAndSubmit(e);
        } catch (s) {
            (this.finish(e), e.reject(Nt(s)));
            return;
        }
        t.readback.then(
            (s) => {
                this.onLanded(e, s);
            },
            (s) => {
                this.onFailed(e, s);
            },
        );
    }
    recordAndSubmit(e) {
        const t = this.requireBuffers(),
            { k: s } = e,
            { device: i } = this.ctx;
        (this.fixedDirty && (i.queue.writeBuffer(t.fixed, 0, this.fixedWords), (this.fixedDirty = !1)),
            this.flushStateWrites(t.state));
        const n = this.ring.reserve(s);
        for (let g = 0; g < s; g++) {
            const m = g === 0 && this.firstPending ? Es : 0;
            this.ring.write(n + g, this.model.params, this.paramsForSlot(this.iterationsSubmitted + g, g, m));
        }
        this.ring.flush();
        const o = new ne(this.ctx, `${this.label}/batch`, this.generationValue),
            a = this.lastIterationStage();
        for (let g = 0; g < s; g++) this.model.recordIteration(o, n + g, this.tierValue, g === s - 1 ? void 0 : a);
        o.endPass();
        const c = o.readback(t.scene, 0, 12 * this.n),
            l = o.readback(t.state, 0, He + s * this.traceBytes),
            { profiler: d } = this.ctx,
            f = d === null ? null : d.resolveInto(o),
            p = o.submit();
        return (
            (e.submitted = p),
            (e.id = p.id),
            (e.sceneOffset = c.offset),
            (e.stateOffset = l.offset),
            (e.profile = f),
            (e.startedAt = performance.now()),
            (this.lastSubmittedBatchIdValue = p.id),
            (this.iterationsSubmitted += s),
            (this.firstPending = !1),
            p
        );
    }
    onLanded(e, t) {
        this.finish(e);
        const { owner: s } = this;
        if (this.isStale(e) || s === null) {
            e.resolve();
            return;
        }
        try {
            const { k: i } = e,
                { n } = this,
                o = Math.max(e.sceneOffset + 12 * n, e.stateOffset + He + i * this.traceBytes);
            if (t.byteLength < o) {
                e.resolve();
                return;
            }
            this.copyScene(s, t, e);
            const a = new DataView(t, e.stateOffset, He),
                c = new DataView(t, e.stateOffset + He, i * this.traceBytes);
            this.writer.absorb(a);
            const l = this.model.state.readField(a, "settledCount");
            if (typeof l != "number") throw ee("settledCount", l, "a scalar", "settledCount must be a scalar field");
            const d = this.batchMilliseconds(e, t);
            ((this.statsValue = ln(this.model.readStats(a, c), d / i)),
                (this.iterationsDoneValue += i),
                (this.settledCountValue = e.id <= this.reheatedAfterBatchId ? 0 : l),
                (this.settledValue = this.computeSettled()),
                e.resolve());
        } catch (i) {
            e.reject(Nt(i));
        }
    }
    onFailed(e, t) {
        if ((this.finish(e), Ir(t, "E_ABORTED") && this.isStale(e))) {
            e.resolve();
            return;
        }
        if (this.ctx.state === "lost" && !Ir(t, "E_DEVICE_LOST")) {
            e.reject(
                new h("E_DEVICE_LOST", "the device was lost while the batch was in flight", {
                    reason: "unknown",
                    message: Nt(t).message,
                }),
            );
            return;
        }
        e.reject(Nt(t));
    }
    copyScene(e, t, s) {
        const { n: i } = this,
            n = new Float32Array(t, s.sceneOffset, 3 * i);
        if (this.overrideList.size === 0) {
            e.set(n);
            return;
        }
        for (let o = 0; o < i; o++) {
            const a = this.overrideList.get(o);
            (a !== void 0 && a >= s.id) ||
                ((e[3 * o] = n[3 * o]), (e[3 * o + 1] = n[3 * o + 1]), (e[3 * o + 2] = n[3 * o + 2]));
        }
        for (const [o, a] of this.overrideList) a < s.id && this.overrideList.delete(o);
    }
    batchMilliseconds(e, t) {
        const { profiler: s } = this.ctx;
        if (s !== null && e.profile !== null) {
            const i = s.timings(t, e.profile);
            if (((this.lastPassTimingsValue = i), i.length > 0 && !s.partial(e.profile))) {
                let n = 0;
                for (const o of i) n += o.ns;
                return n / 1e6;
            }
        }
        return performance.now() - e.startedAt;
    }
    isStale(e) {
        return e.stale || this.stateValue !== "loaded" || e.generation !== this.generationValue;
    }
    finish(e) {
        const t = this.pending.indexOf(e);
        t >= 0 && this.pending.splice(t, 1);
    }
    discardPending() {
        for (const e of this.pending) ((e.stale = !0), e.submitted?.discard());
    }
    outOfMemory() {
        (this.discardPending(),
            this.destroyBuffers(),
            this.ctx.allocator.reset(),
            (this.settledValue = !1),
            (this.stateValue = "created"));
    }
    abortedError() {
        return new h("E_ABORTED", `${this.label}: run() aborted by the signal`, {
            batchId: this.lastSubmittedBatchIdValue,
        });
    }
    paramsForSlot(e, t, s) {
        const [i, n, o] = this.center,
            a = this.model.paramsFor(e, this.optionsValue),
            c = typeof a.flags == "number" ? a.flags : 0,
            l = {
                n: this.n,
                dim: this.dimValue,
                flags: s | c,
                iterationIndex: t,
                seed: this.seedU32(),
                scale: this.scale,
                center: [i, n, o, 0],
                settleThreshold: this.settleThreshold(),
            };
        return { ...a, ...l };
    }
    seedU32() {
        const { seed: e } = this.optionsValue;
        return e == null || !Number.isFinite(e) ? 0 : Math.floor(Math.abs(e)) % 4294967296;
    }
    flushStateWrites(e) {
        const t = this.writer.takeQueued();
        if (t.length === 0) return;
        const s = this.writer.headerBytes(),
            i = this.model.state;
        for (const n of t) {
            const o = i.offsetOf(n),
                a = 4 * Qs(Ro(i, n));
            this.ctx.device.queue.writeBuffer(e, o, s, o, a);
        }
    }
    lastIterationStage() {
        const e = this.model.stages.indexOf(Sh);
        if (!(e <= 0)) return this.model.stages[e - 1];
    }
    settleThreshold() {
        return this.optionsValue.settleThreshold ?? At.settleThreshold;
    }
    settleWindow() {
        return this.optionsValue.settleWindow ?? At.settleWindow;
    }
    iterationBudget() {
        const e = ws(this.optionsValue, "maxIter");
        if (typeof e == "number") return e;
        const t = ws(this.optionsValue, "iterations");
        return typeof t == "number" ? t : Number.POSITIVE_INFINITY;
    }
    computeSettled() {
        return this.stateValue !== "loaded"
            ? !1
            : this.n === 0 ||
                  this.iterationsDoneValue >= this.iterationBudget() ||
                  this.settledCountValue >= this.settleWindow();
    }
    allocate(e) {
        const { allocator: t } = this.ctx,
            { label: s } = this,
            i = Math.ceil(e / this.ctx.workgroupSize),
            n = Fe * this.traceBytes,
            o = ie.STORAGE | ie.COPY_SRC | ie.COPY_DST,
            a = t.createBuffer({ label: `${s}/positions`, size: 16 * e, usage: o }),
            c = t.createBuffer({ label: `${s}/scenePositions`, size: 12 * e, usage: ie.STORAGE | ie.COPY_SRC }),
            l = t.createBuffer({ label: `${s}/fixed`, size: 4 * Math.ceil(e / 32), usage: o }),
            d = t.createBuffer({ label: `${s}/partials`, size: hi * i, usage: o }),
            f = t.createBuffer({ label: `${s}/state`, size: He + n, usage: o }),
            p = new Map();
        (p.set("positions", nr(a, 16 * e)),
            p.set("scenePositions", nr(c, 12 * e)),
            p.set("fixed", nr(l, 4 * Math.ceil(e / 32))),
            p.set("partials", nr(d, hi * i)),
            p.set("state", { buffer: f, offset: 0, size: He, window: null }),
            p.set("trace", { buffer: f, offset: He, size: n, window: null }));
        const g = new Map();
        for (const m of this.model.buffers(e, this.dimValue)) {
            if (_h.has(m.name) || p.has(m.name))
                throw ee(
                    "BufferSpec.name",
                    m.name,
                    "a name no other buffer uses",
                    `BufferSpec "${m.name}" reuses a buffer name`,
                );
            if (!Number.isInteger(m.byteLength) || m.byteLength <= 0 || m.byteLength % 4 !== 0)
                throw ee(
                    "BufferSpec.byteLength",
                    m.byteLength,
                    "a positive multiple of 4",
                    `BufferSpec "${m.name}" has byteLength ${m.byteLength}`,
                );
            if (m.zero && (m.usage & ie.COPY_DST) === 0)
                throw ee(
                    "BufferSpec.usage",
                    m.usage,
                    "COPY_DST on a zero: true spec",
                    `BufferSpec "${m.name}" is zero: true but lacks COPY_DST`,
                );
            const b = t.createBuffer({ label: `${s}/${m.name}`, size: m.byteLength, usage: m.usage });
            (g.set(m.name, { buffer: b, spec: m }), p.set(m.name, nr(b, m.byteLength)));
        }
        return { positions: a, scene: c, fixed: l, partials: d, state: f, model: g, bindings: p, traceRegionBytes: n };
    }
    clearKept(e) {
        const { device: t } = this.ctx,
            s = t.createCommandEncoder({ label: `${this.label}/clear` });
        (s.clearBuffer(e.partials), s.clearBuffer(e.state, He, e.traceRegionBytes));
        for (const { buffer: i, spec: n } of e.model.values()) n.zero && s.clearBuffer(i);
        t.queue.submit([s.finish()]);
    }
    destroyBuffers() {
        const { buffers: e } = this;
        if (e === null) return;
        ((this.buffers = null), (this.resources = null));
        const t = [e.positions, e.scene, e.fixed, e.partials, e.state];
        for (const { buffer: s } of e.model.values()) t.push(s);
        this.afterInFlight(() => {
            const { allocator: s } = this.ctx;
            for (const i of t) s.destroy(i);
        });
    }
    afterInFlight(e) {
        const t = [];
        for (const s of this.pending) s.submitted !== null && t.push(s.submitted.readback.catch(() => {}));
        if (t.length === 0) {
            e();
            return;
        }
        Promise.all(t).then(e, e);
    }
    requireBuffers() {
        const { buffers: e } = this;
        if (e === null) throw new h("E_NOT_LOADED", `${this.label}: load() first`, { state: this.stateValue });
        return e;
    }
    uploadPositions(e, t, s) {
        const { n: i, scale: n } = this,
            [o, a, c] = this.center,
            l = new Float32Array(4 * i);
        for (let P = 0; P < i; P++)
            ((l[4 * P] = (t[3 * P] - o) / n),
                (l[4 * P + 1] = (t[3 * P + 1] - a) / n),
                (l[4 * P + 2] = this.dimValue === 2 ? 0 : (t[3 * P + 2] - c) / n),
                (l[4 * P + 3] = s[P]));
        this.ctx.device.queue.writeBuffer(e.positions, 0, l);
        let d = 0,
            f = 0,
            p = 0;
        const g = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
            m = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
        for (let P = 0; P < i; P++) {
            const E = l[4 * P],
                A = l[4 * P + 1],
                D = l[4 * P + 2];
            ((d += E),
                (f += A),
                (p += D),
                (g[0] = Math.min(g[0], E)),
                (g[1] = Math.min(g[1], A)),
                (g[2] = Math.min(g[2], D)),
                (m[0] = Math.max(m[0], E)),
                (m[1] = Math.max(m[1], A)),
                (m[2] = Math.max(m[2], D)));
        }
        const b = d / i,
            w = f / i,
            v = p / i;
        let y = 0,
            k = 0;
        for (let P = 0; P < i; P++) {
            const E = l[4 * P] - b,
                A = l[4 * P + 1] - w,
                D = l[4 * P + 2] - v,
                $ = E * E + A * A + D * D;
            ((y += $), (k = Math.max(k, $)));
        }
        const { writer: S } = this;
        (S.set("iteration", 0),
            S.set("settledCount", 0),
            S.set("meanDisplacement", 0),
            S.set("centroid", [b, w, v, 0]),
            S.set("min", [g[0], g[1], g[2], 0]),
            S.set("max", [m[0], m[1], m[2], 0]),
            S.set("rmsRadius", Math.sqrt(y / i)),
            S.set("radius", Math.sqrt(k)),
            this.model.onLoad(S),
            this.ctx.device.queue.writeBuffer(e.state, 0, S.headerBytes()),
            S.clearQueued());
    }
    resolveWeightsBinding(e, t, s) {
        if (s.source === "arcs") return ((this.weightsUpload = null), t.weights);
        if (s.source === "none" || s.data === null || s.column === null) return ((this.weightsUpload = null), null);
        const i = this.weightsUpload,
            o =
                i !== null &&
                i.serial === e.serial &&
                i.column === s.column &&
                i.version === s.column.version &&
                i.data.length === s.data.length &&
                i !== null
                    ? i.data
                    : s.data,
            a = this.ctx.residency.array(o, "weights", e);
        return (
            (this.weightsUpload = {
                serial: e.serial,
                column: s.column,
                version: s.column.version,
                data: o,
                upload: a,
            }),
            a.binding
        );
    }
    makeResources(e, t, s, i) {
        const { bindings: n } = i;
        return {
            device: this.ctx.device,
            caps: this.ctx.caps,
            pipelines: this.ctx.pipelines,
            core: e,
            tiers: t,
            weights: s,
            n: this.n,
            dim: this.dimValue,
            tier: this.tierValue,
            ring: this.ring,
            pool: this.ctx.pool,
            buffer: (o) => {
                const a = n.get(o);
                if (a === void 0) throw ee("name", o, [...n.keys()], `no simulation buffer named "${o}"`);
                return a;
            },
        };
    }
    startBind(e, t) {
        const s = this.generationValue,
            i = () => this.compileAndBind(e, t, s),
            n = this.ready.catch(() => {}).then(i);
        (n.catch(() => {}), (this.ready = n));
    }
    async compileAndBind(e, t, s) {
        await Ve(this.ctx);
        const i = this.ctx.caps.features.has("subgroups");
        (await this.ctx.pipelines.warm(this.model.specs(t, i)),
            !(this.stateValue !== "loaded" || s !== this.generationValue) && (await this.model.bind(e, t)));
    }
    async inspectBuffer(e) {
        this.assertLoaded();
        const { buffers: t } = this,
            s = t?.bindings.get(e);
        if (t === null || s === void 0)
            throw ee("name", e, t === null ? [] : [...t.bindings.keys()], `inspect("${e}"): no such buffer`);
        await this.flush();
        const i = await this.ctx.readback.read(s.buffer, s.size, void 0, s.offset);
        return Ph.has(e) ? new Uint32Array(i) : new Float32Array(i);
    }
    async runStages(e) {
        if ((this.assertLoaded(), !this.model.stages.includes(e)))
            throw ee("upTo", e, [...this.model.stages], `debugRunStages("${e}"): not a stage of ${this.model.kind}`);
        if (this.n === 0) return;
        (await this.flush(), await this.ready, await this.ctx.allocator.check(), this.assertLoaded());
        const t = this.requireBuffers(),
            { device: s } = this.ctx;
        (this.fixedDirty && (s.queue.writeBuffer(t.fixed, 0, this.fixedWords), (this.fixedDirty = !1)),
            this.flushStateWrites(t.state));
        const i = this.ring.reserve(1);
        (this.ring.write(
            i,
            this.model.params,
            this.paramsForSlot(this.iterationsSubmitted, 0, this.firstPending ? Es : 0),
        ),
            this.ring.flush());
        const n = new ne(this.ctx, `${this.label}/debug`, this.generationValue);
        (this.model.recordIteration(n, i, this.tierValue, e), n.endPass(), n.readback(t.state, 0, He));
        const o = n.submit();
        ((this.lastSubmittedBatchIdValue = o.id), await o.readback);
    }
    onDeviceLost(e) {
        if (this.stateValue === "disposed") return;
        const t = new h("E_DEVICE_LOST", `device lost (${e.reason}): ${e.message}`, {
                reason: e.reason,
                message: e.message,
            }),
            s = this.pending.splice(0);
        this.stateValue = "disposed";
        for (const i of s) ((i.stale = !0), i.reject(t));
        this.teardown();
    }
    teardown() {
        this.torndown ||
            ((this.torndown = !0),
            this.discardPending(),
            this.destroyBuffers(),
            this.afterInFlight(() => {
                (this.ring.destroy(), this.model.dispose?.());
            }),
            this.ctx.state === "ready" && this.ctx.pool.trim(),
            this.unregisterLost(),
            (this.core = null),
            (this.snapshot = null),
            (this.owner = null),
            (this.weightsUpload = null));
    }
    assertNotDisposed() {
        if (this.stateValue === "disposed") throw on(this.label);
    }
    assertLoaded() {
        if (this.stateValue === "created")
            throw new h("E_NOT_LOADED", `${this.label}: load() first`, { state: "created" });
        this.assertNotDisposed();
    }
}
async function Js(r, e) {
    const { n: t, tiers: s, pipelines: i, caps: n } = r,
        o = s?.segmentOffsets,
        a = o?.[1] ?? 0,
        c = o?.[2] ?? 0,
        l = [
            { tier: 2, rows: a },
            { tier: 1, rows: c - a },
            { tier: 0, rows: t - c },
        ],
        d = [];
    for (const { tier: f, rows: p } of l) {
        if (f !== 0 && p <= 0) continue;
        const g = await i.kernel(_("fa2-attraction", { ...e, TIER: f })),
            m = g.workgroupSize;
        if (f !== 0 && m < lt)
            throw new h(
                "E_UNSUPPORTED",
                `fa2-attraction: the mid tier folds ${lt} lanes per row, more than the workgroup size ${m}`,
                { feature: "fa2-attraction.tiers" },
            );
        if (p <= 0) continue;
        let b = m;
        (f === 2 ? (b = 1) : f === 1 && (b = m / lt), d.push([g, z(p, b, n)]));
    }
    return { kernels: d };
}
function Ah(r, e, t) {
    const { core: s, tiers: i, weights: n } = e,
        o = { ...Ze(s, i?.perm ?? null, n), pos: t.pos, force: t.force, P: t.params };
    return { kernels: r.kernels.map(([a, c]) => [a, a.bind(o), c]) };
}
function xh(r, e, t) {
    for (const [s, i, n] of e.kernels) s.dispatch(r, i, n, [t]);
}
const Rh = 12,
    un = "fillParams",
    Dh = 4294967296;
function Yr(r) {
    return r === null
        ? "null"
        : typeof r == "number" || typeof r == "boolean" || typeof r == "string"
          ? String(r)
          : r === void 0
            ? "undefined"
            : typeof r == "object" && "length" in r && typeof r.length == "number"
              ? `[${r.length} values]`
              : typeof r;
}
function Re(r, e, t) {
    return new h("E_INVALID_ARGUMENT", `${r} must be ${t}; got ${Yr(e)}`, { argument: r, value: e, expected: t });
}
function re(r, e, t, s, i) {
    const n = e === void 0 ? t : e;
    if (typeof n != "number" || !Number.isFinite(n) || !s(n)) throw Re(r, n, i);
    return n;
}
function ar(r, e, t) {
    const s = e === void 0 ? t : e;
    if (typeof s != "boolean") throw Re(r, s, "a boolean");
    return s;
}
function ei(r, e) {
    const t = r === void 0 ? e : r;
    if (t !== 2 && t !== 3) throw Re("dim", t, "2 or 3");
    return t;
}
function ti(r, e) {
    if (r === void 0) return e;
    const t = "an array of 2 or 3 finite numbers",
        s = r;
    if (typeof s != "object" || s === null || !("length" in s)) throw Re("center", r, t);
    const { length: i } = s;
    if (i !== 2 && i !== 3) throw Re("center", r, t);
    const n = r[0],
        o = r[1],
        a = i === 3 ? r[2] : 0;
    if (
        typeof n != "number" ||
        typeof o != "number" ||
        typeof a != "number" ||
        !Number.isFinite(n) ||
        !Number.isFinite(o) ||
        !Number.isFinite(a)
    )
        throw Re("center", r, t);
    return [n, o, a];
}
function ri(r, e) {
    if (r === void 0) return e;
    const t = r;
    if (t !== null && (typeof t != "number" || !Number.isFinite(t))) throw Re("seed", r, "a finite number or null");
    return t;
}
function Me(r) {
    return Number.isInteger(r) && r >= 1;
}
function Th(r) {
    return r === null ? 0 : Math.floor(Math.abs(r)) % Dh;
}
function he(r, e) {
    const t = r[e];
    if (typeof t != "number") throw Re(e, t, "a scalar field");
    return t;
}
function Lh(r, e) {
    const t = r[e];
    if (typeof t == "number") throw Re(e, t, "a vector field");
    return t;
}
function _e(r, e) {
    const t = {};
    for (const s of Object.keys(e)) t[s] = s in r ? r[s] : e[s];
    return t;
}
function Do(r, e, t, s, i, n) {
    const o = Math.max(1, Math.ceil(Math.ceil(i / r.workgroupSize) / In));
    for (let a = 1; a <= o; a++) r.dispatch(e, t, { ...s, z: a }, [n]);
}
class fr {
    constructor(e, t, s, i) {
        ((this.boundRepulsion = null),
            (this.boundSpeedFinalize = null),
            (this.repulsion = e),
            (this.speedFinalize = t),
            (this.caps = s),
            (this.overrides = Object.freeze({
                SWING_MODE: i.SWING_MODE,
                STRONG_GRAVITY: i.STRONG_GRAVITY,
                GRAVITY_CENTER: i.GRAVITY_CENTER,
            })),
            (this.finalizePlan = z(t.workgroupSize, t.workgroupSize, s)));
    }
    static async create(e, t, s) {
        const [i, n] = fr.specs(s),
            o = await e.kernel(i),
            a = await e.kernel(n);
        return new fr(o, a, t, s);
    }
    static specs(e) {
        return [
            _("fa2-repulsion-exact", {
                SWING_MODE: e.SWING_MODE,
                STRONG_GRAVITY: e.STRONG_GRAVITY,
                GRAVITY_CENTER: e.GRAVITY_CENTER,
            }),
            _("fa2-speed-finalize", { SWING_MODE: e.SWING_MODE }),
        ];
    }
    bind(e) {
        ((this.boundRepulsion = this.repulsion.bind({
            pos: e.pos,
            S: e.state,
            force: e.force,
            oldForce: e.oldForce,
            fixedMask: e.fixedMask,
            partials: e.partials,
            P: e.params,
        })),
            (this.boundSpeedFinalize = this.speedFinalize.bind({
                partials: e.partials,
                S: e.state,
                T: e.trace,
                P: e.params,
            })));
    }
    record(e, t, s) {
        (this.recordRepulsion(e, t, s), this.recordSpeedFinalize(e, s));
    }
    recordRepulsion(e, t, s) {
        const i = this.bound(this.boundRepulsion, "recordRepulsion"),
            n = z(t, this.repulsion.workgroupSize, this.caps);
        Do(this.repulsion, e, i, n, t, s);
    }
    recordSpeedFinalize(e, t) {
        const s = this.bound(this.boundSpeedFinalize, "recordSpeedFinalize");
        this.speedFinalize.dispatch(e, s, this.finalizePlan, [t]);
    }
    bound(e, t) {
        if (e === null)
            throw new h("E_NOT_LOADED", `RepulsionExact.${t}(): bind() has not been called for this stage`, {
                state: "unbound",
            });
        return e;
    }
}
async function Oh(r, e) {
    const t = await r.pipelines.kernel(_("grid-centroid")),
        s = await r.pipelines.kernel(_("grid-centroid-hub")),
        i = await r.pipelines.kernel(_("grid-downsample"));
    return new Nh(r, e, { centroid: t, hub: s, downsample: i });
}
class Nh {
    constructor(e, t, s) {
        ((this.bound = null), (this.dispatches = 0), (this.scope = e), (this.spec = t), (this.kernels = s));
    }
    get lastDispatches() {
        return this.dispatches;
    }
    bind(e) {
        const { centroid: t, hub: s, downsample: i } = this.kernels,
            { spec: n, scope: o } = this,
            a = e,
            c = [];
        let l = n.g;
        for (let d = 0; d + 1 < n.levels; d++) {
            l /= 2;
            const f = l ** n.dim,
                p = o.params(jn, {
                    childBase: n.levelOffsets[d],
                    parentBase: n.levelOffsets[d + 1],
                    parentSide: l,
                    parentCells: f,
                    depth: n.dim === 3 ? 2 : 1,
                    pad0: 0,
                    pad1: 0,
                    pad2: 0,
                });
            c.push({ bound: i.bind({ pyramid: a.pyramid, P: p.binding }), offset: p.offset, parentCells: f });
        }
        this.bound = {
            centroid: t.bind({
                sortedIdx: a.sortedIdx,
                cellStart: a.cellStart,
                pos: a.pos,
                pyramid: a.pyramid,
                hubList: a.hubList,
                hubCounters: a.hubCounters,
                P: a.params,
            }),
            hub: s.bind({
                sortedIdx: a.sortedIdx,
                cellStart: a.cellStart,
                pos: a.pos,
                pyramid: a.pyramid,
                hubList: a.hubList,
                hubCount: a.hubCounters,
                P: a.params,
            }),
            hubSlots: Math.floor(a.hubList.size / 4),
            levels: c,
        };
    }
    record(e, t, s) {
        const { bound: i, scope: n, spec: o } = this;
        if (i === null) throw new h("E_NOT_LOADED", "gridPyramid: record() before bind()", { argument: "bind" });
        const { centroid: a, hub: c, downsample: l } = this.kernels,
            d = o.cells + o.outsideCells;
        if (
            (a.dispatch(e, i.centroid, z(d, n.workgroupSize, n.caps), [t]),
            c.dispatch(e, i.hub, Ft(i.hubSlots, n.caps), [t]),
            (this.dispatches = 2),
            (s ?? "G5") !== "G4")
        )
            for (const f of i.levels)
                (l.dispatch(e, f.bound, z(f.parentCells, n.workgroupSize, n.caps), [f.offset]), (this.dispatches += 1));
    }
}
const $h = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"],
    vt = ie.STORAGE | ie.COPY_SRC | ie.COPY_DST;
function Er(r) {
    if (r.lease === null)
        throw new h("E_DISPOSED", "RepulsionGrid: the stage was disposed", { label: "RepulsionGrid" });
    return r.lease;
}
function Ch(r, e, t, s) {
    const i = e.uniform(t.byteLength, `grid/${t.name}`),
        n = new ArrayBuffer(t.byteLength);
    return (
        t.write(new DataView(n), s),
        r.queue.writeBuffer(i, 0, n),
        { binding: { buffer: i, offset: 0, size: t.byteLength, window: null }, offset: 0 }
    );
}
function dn(r) {
    return _("grid-far-field", { LAW: r.LAW });
}
function fn(r) {
    return _("grid-near-field", {
        SWING_MODE: r.SWING_MODE,
        STRONG_GRAVITY: r.STRONG_GRAVITY,
        GRAVITY_CENTER: r.GRAVITY_CENTER,
        LAW: r.LAW,
    });
}
class ft {
    constructor(e, t, s, i, n, o, a) {
        ((this.bound = null),
            (this.caps = e.caps),
            (this.box = n),
            (this.workgroupSize = t),
            (this.overrides = Object.freeze({
                SWING_MODE: s.SWING_MODE,
                STRONG_GRAVITY: s.STRONG_GRAVITY,
                GRAVITY_CENTER: s.GRAVITY_CENTER,
                LAW: s.LAW,
            })),
            (this.spec = i),
            (this.build = o.build),
            (this.pyramid = o.pyramid),
            (this.far = a.far),
            (this.near = a.near),
            (this.speedFinalize = a.speedFinalize));
    }
    static buffers(e, t) {
        const s = 4 * Math.max(1, e);
        return [
            { name: "cellKey", byteLength: s, usage: vt, zero: !1 },
            { name: "cellVal", byteLength: s, usage: vt, zero: !1 },
            { name: "sortedKey", byteLength: s, usage: vt, zero: !1 },
            { name: "sortedIdx", byteLength: s, usage: vt, zero: !1 },
            { name: "cellHist", byteLength: 4 * t.histWords, usage: vt, zero: !0 },
            { name: "cellStart", byteLength: 4 * t.histWords, usage: vt, zero: !0 },
            { name: "hubList", byteLength: 4 * Math.max(1, Math.ceil(e / Rn)), usage: vt, zero: !1 },
            { name: "pyramid", byteLength: dh(t), usage: vt, zero: !0 },
        ];
    }
    static specs(e, t) {
        const s = t.deterministic
            ? [_("radix-hist"), _("radix-scatter"), _("scan-block"), _("scan-add")]
            : [_("counting-scatter"), _("scan-block"), _("scan-add")];
        return [
            _("grid-cell-key"),
            ...s,
            _("histogram"),
            _("fill"),
            _("grid-centroid"),
            _("grid-centroid-hub"),
            _("grid-downsample"),
            dn(e),
            fn(e),
            _("fa2-speed-finalize", { SWING_MODE: e.SWING_MODE }),
        ];
    }
    static async create(e, t, s, i) {
        const n = { lease: e.pool.lease() },
            o = {
                device: e.device,
                caps: e.caps,
                pipelines: e.pipelines,
                pool: e.pool,
                workgroupSize: t,
                scratch: (a, c) => Er(n).storage(a, c),
                params: (a, c) => Ch(e.device, Er(n), a, c),
            };
        try {
            const a = await fh(o, i),
                c = await Oh(o, i),
                l = await e.pipelines.kernel(dn(s)),
                d = await e.pipelines.kernel(fn(s)),
                f = await e.pipelines.kernel(_("fa2-speed-finalize", { SWING_MODE: s.SWING_MODE }));
            return new ft(e, t, s, i, n, { build: a, pyramid: c }, { far: l, near: d, speedFinalize: f });
        } catch (a) {
            throw (Er(n).release(), a);
        }
    }
    bind(e) {
        Er(this.box);
        const t = e;
        (this.build.bind({
            pos: t.pos,
            state: t.state,
            params: t.params,
            cellKey: t.cellKey,
            cellVal: t.cellVal,
            sortedKey: t.sortedKey,
            sortedIdx: t.sortedIdx,
            cellHist: t.cellHist,
            cellStart: t.cellStart,
        }),
            this.pyramid.bind({
                pos: t.pos,
                params: t.params,
                sortedIdx: t.sortedIdx,
                cellStart: t.cellStart,
                pyramid: t.pyramid,
                hubList: t.hubList,
                hubCounters: t.hubCounters,
            }),
            (this.bound = {
                far: this.far.bind({
                    pos: t.pos,
                    sortedIdx: t.sortedIdx,
                    pyramid: t.pyramid,
                    S: t.state,
                    force: t.force,
                    P: t.params,
                }),
                near: this.near.bind({
                    pos: t.pos,
                    sortedIdx: t.sortedIdx,
                    cellStart: t.cellStart,
                    S: t.state,
                    force: t.force,
                    oldForce: t.oldForce,
                    fixedMask: t.fixedMask,
                    partials: t.partials,
                    P: t.params,
                }),
                speedFinalize: this.speedFinalize.bind({ partials: t.partials, S: t.state, T: t.trace, P: t.params }),
            }));
    }
    recordRepulsion(e, t, s, i) {
        const n = this.requireBound("recordRepulsion"),
            o = $h.indexOf(i ?? "G7");
        let a = "G3";
        if (
            (o === 0 ? (a = "G1") : o === 1 && (a = "G2"),
            this.build.record(e, t, s, a),
            o < 3 || (this.pyramid.record(e, s, o === 3 ? "G4" : "G5"), o < 5))
        )
            return;
        const c = z(t, this.workgroupSize, this.caps);
        (this.far.dispatch(e, n.far, c, [s]), !(o < 6) && this.near.dispatch(e, n.near, c, [s]));
    }
    recordSpeedFinalize(e, t) {
        const s = this.requireBound("recordSpeedFinalize"),
            i = z(this.speedFinalize.workgroupSize, this.speedFinalize.workgroupSize, this.caps);
        this.speedFinalize.dispatch(e, s.speedFinalize, i, [t]);
    }
    dispose() {
        this.box.lease !== null && (this.box.lease.release(), (this.box.lease = null));
        for (const e of [this.far, this.near, this.speedFinalize]) e.invalidate();
        this.bound = null;
    }
    requireBound(e) {
        if (this.bound === null)
            throw new h("E_NOT_LOADED", `RepulsionGrid.${e}(): bind() has not been called for this stage`, {
                state: "unbound",
            });
        return this.bound;
    }
}
const or = ["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"],
    Bh = 3,
    ys = 10,
    hn = 11,
    _s = 12,
    pn = "hubCounters",
    Mh = { x: 1, y: 1, z: 1, items: 1, stride: null },
    Gr = { STATS_MODE: 0 },
    zr = { LINLOG: !1, DISTRIBUTED: !1, TIER: 0, USE_PERM: !1, HAS_WEIGHTS: !1, LAW: 0 },
    Fr = { SWING_MODE: 0, STRONG_GRAVITY: !1, GRAVITY_CENTER: 0, LAW: 0 },
    Wr = { SWING_MODE: 0, APPLY: 0 };
class Xr {
    constructor(e, t, s) {
        ((this.kernel = e), (this.bound = t), (this.plan = s));
    }
    static binder(e) {
        return ({ pos: t, state: s, force: i, oldForce: n, fixedMask: o, partials: a, params: c }, l) =>
            new Xr(e, e.bind({ pos: t, S: s, force: i, oldForce: n, fixedMask: o, partials: a, P: c }), l);
    }
    recordRepulsion(e, t, s) {
        Do(this.kernel, e, this.bound, this.plan, t, s);
    }
    invalidate() {
        this.kernel.invalidate();
    }
}
class si {
    constructor(e, t) {
        ((this.names = t),
            (this.stages = or),
            (this.params = Ue),
            (this.state = et),
            (this.trace = Xt),
            (this.resources = null),
            (this.nextGrid = null),
            (this.resetCarry = !1),
            (this.bound = null),
            (this.openPass = null),
            (this.tuning = e));
    }
    zeroesCarry() {
        return !1;
    }
    recordSpeed(e, t, s) {}
    buffers(e, t) {
        const s = Math.max(1, e) * Rh,
            i = ie.STORAGE | ie.COPY_SRC | ie.COPY_DST,
            n = gr(this.tuning, e) === "grid" ? ft.buffers(e, ut(e, t, this.tuning)) : [];
        return [
            { name: "force", byteLength: s, usage: i, zero: !0 },
            { name: this.names.carry, byteLength: s, usage: i, zero: !0 },
            { name: un, byteLength: Ye, usage: ie.UNIFORM | ie.COPY_DST, zero: !1 },
            { name: pn, byteLength: 16, usage: i, zero: !0 },
            ...n,
        ];
    }
    async bind(e, t) {
        (this.dropBound(), (this.resources = e));
        const { n: s, caps: i, core: n, ring: o, device: a } = e;
        if (s === 0) return;
        const c = e.buffer("positions"),
            l = e.buffer("force"),
            d = o.binding(Ue),
            f = n.colIdx !== null,
            p = await this.compile(e, t),
            { k1: g, k5: m, toScene: b, fill: w, grid: v } = p;
        if (this.resources !== e) {
            v?.dispose();
            return;
        }
        const y = e.buffer("scenePositions"),
            k = e.buffer("fixed"),
            S = e.buffer("partials"),
            P = e.buffer("state"),
            E = e.buffer("trace"),
            A = e.buffer(this.names.carry),
            D = e.buffer(un),
            $ = { buffer: D.buffer, offset: D.offset, size: Ae.byteLength, window: null },
            T = new ArrayBuffer(Ae.byteLength);
        (Ae.write(new DataView(T), { count: 3 * s, value: 0, mode: 0 }), a.queue.writeBuffer(D.buffer, D.offset, T));
        const x = e.buffer(pn),
            L = { pos: c, state: P, trace: E, force: l, oldForce: A, fixedMask: k, partials: S, params: d };
        v?.bind({
            ...L,
            cellKey: e.buffer("cellKey"),
            cellVal: e.buffer("cellVal"),
            sortedKey: e.buffer("sortedKey"),
            sortedIdx: e.buffer("sortedIdx"),
            cellHist: e.buffer("cellHist"),
            cellStart: e.buffer("cellStart"),
            hubList: e.buffer("hubList"),
            hubCounters: x,
            pyramid: e.buffer("pyramid"),
        });
        const I = g.workgroupSize,
            C = z(s, I, i);
        this.bound = {
            n: s,
            plan: C,
            fillPlan: z(3 * s, I, i),
            k1: g,
            k1Bound: g.bind({
                partials: S,
                S: P,
                T: E,
                cellHist: v === null ? S : e.buffer("cellHist"),
                hubCounters: x,
                P: d,
            }),
            attraction: p.attraction === null ? null : Ah(p.attraction, e, { pos: c, force: l, params: d }),
            exact: p.exact?.(L, C) ?? null,
            grid: v,
            k5: m,
            k5Bound: m.bind({ force: l, oldForce: A, fixedMask: k, S: P, pos: c, partials: S, P: d }),
            toScene: b,
            toSceneBound: b.bind({ pos: c, scene: y, P: d }),
            fill: w,
            fillForceBound: f ? null : w.bind({ dst: l, P: $ }),
            fillCarryBound: this.zeroesCarry() ? w.bind({ dst: A, P: $ }) : null,
        };
    }
    recordIteration(e, t, s, i) {
        const n = this.requireResources(),
            o = i === void 0 ? _s : this.stageIndex(i),
            { bound: a } = this;
        if (a === null) {
            if (n.n === 0) return;
            throw new h("E_NOT_LOADED", `the ${this.names.name} model is not bound (bind() has not completed)`, {
                state: "loaded",
            });
        }
        const c = n.ring.offsetOf(t);
        if (s === "grid") {
            this.recordGridIteration(e, a, c, o);
            return;
        }
        const { exact: l } = a;
        if (l === null)
            throw new h("E_NOT_LOADED", `the ${this.names.name} model was bound on the grid tier`, { state: "loaded" });
        const d = this.openPass !== null && this.openPass.id === e.id ? this.openPass.pass : e.pass(this.names.pass);
        ((this.openPass = { id: e.id, pass: d }),
            this.recordK1(d, a, c),
            !(o < 1) &&
                (this.recordK2(d, a, c),
                !(o < 2) &&
                    (l.recordRepulsion(d, a.n, c),
                    !(o < ys) &&
                        (this.recordSpeed(d, l, c),
                        !(o < hn) &&
                            (a.k5.dispatch(d, a.k5Bound, a.plan, [c]), !(o < _s) && this.recordToScene(e, a, c))))));
    }
    recordGridIteration(e, t, s, i) {
        const { grid: n } = t;
        if (n === null)
            throw new h("E_NOT_LOADED", `the ${this.names.name} model was bound on the exact tier`, {
                state: "loaded",
            });
        if (
            ((this.openPass = null),
            this.recordK1(e.pass(`${this.names.pass}-k1`), t, s),
            i < 1 || (this.recordK2(e.pass(`${this.names.pass}-attraction`), t, s), i < Bh))
        )
            return;
        const o = e.pass(`${this.names.pass}-grid`),
            a = i < ys ? or[i] : void 0;
        (n.recordRepulsion(o, t.n, s, a),
            !(i < ys) &&
                (this.recordSpeed(o, n, s),
                !(i < hn) && (t.k5.dispatch(o, t.k5Bound, t.plan, [s]), !(i < _s) && this.recordToScene(e, t, s))));
    }
    recordK1(e, t, s) {
        (this.resetCarry &&
            ((this.resetCarry = !1),
            t.fillCarryBound !== null && t.fill.dispatch(e, t.fillCarryBound, t.fillPlan, [0])),
            t.k1.dispatch(e, t.k1Bound, Mh, [s]));
    }
    recordK2(e, t, s) {
        t.attraction !== null
            ? xh(e, t.attraction, s)
            : t.fillForceBound !== null && t.fill.dispatch(e, t.fillForceBound, t.fillPlan, [0]);
    }
    recordToScene(e, t, s) {
        this.openPass = null;
        const i = e.pass(this.names.scenePass);
        t.toScene.dispatch(i, t.toSceneBound, t.plan, [s]);
    }
    sharedParams(e, t) {
        const { n: s, core: i, tiers: n, tier: o, dim: a } = this.requireResources(),
            { nearMax: c, extentFactor: l } = this.tuning,
            d = o === "grid" ? ut(s, a, this.tuning) : null,
            f = n?.segmentOffsets,
            p = f?.[1] ?? 0,
            g = f?.[2] ?? 0;
        return {
            n: s,
            dim: t.dim,
            flags: 0,
            tierStart: g,
            tierEnd: s,
            iterationIndex: e,
            seed: Th(t.seed),
            nearMax: c,
            scale: t.scale,
            center: [t.center[0], t.center[1], t.center[2], 0],
            settleThreshold: t.settleThreshold,
            extentFactor: l,
            gridMax: d?.g ?? 0,
            levels: d?.levels ?? 0,
            arcBase: 0,
            arcEnd: jr(i),
            accumulate: 0,
            hiEnd: p,
            midEnd: g,
        };
    }
    sharedStats(e) {
        const t = Lh(e, "centroid"),
            s = this.resources?.tier === "grid";
        return {
            iteration: he(e, "iteration"),
            meanDisplacement: he(e, "meanDisplacement"),
            rmsRadius: he(e, "rmsRadius"),
            layoutRadius: he(e, "radius"),
            centroid: [t[0], t[1], t[2]],
            repulsionTier: s ? "grid" : "exact",
            maxCellOccupancy: s ? he(e, "maxCellOccupancy") : null,
            outsideGrid: s ? he(e, "outsideGrid") : null,
            msPerIteration: null,
        };
    }
    requireResources() {
        if (this.resources === null)
            throw new h("E_NOT_LOADED", `the ${this.names.name} model has not been bound (load() first)`, {
                state: "created",
            });
        return this.resources;
    }
    stageIndex(e) {
        for (let t = 0; t < or.length; t++) if (or[t] === e) return t;
        throw Re("upTo", e, or.join(" | "));
    }
    dispose() {
        this.dropBound();
    }
    dropBound() {
        this.openPass = null;
        const { bound: e } = this;
        if (e !== null) {
            for (const t of [e.k1, e.k5, e.toScene, e.fill]) t.invalidate();
            e.exact?.invalidate?.();
            for (const [t] of e.attraction?.kernels ?? []) t.invalidate();
            (e.grid?.dispose(), (this.bound = null));
        }
    }
}
const gn =
    "write a role 'mass' node column (nodes.set(name, vec, { role: 'mass', replaceRole: true })) or pass a Float32Array; @graphty/layout's resolveNodeVector does this on the CPU path";
function it(r, e, t, s) {
    return new h("E_INVALID_ARGUMENT", s, { argument: r, value: e, expected: t });
}
function $s(r, e) {
    for (let t = 0; t < r.length; t++) {
        const s = r[t];
        if (!Number.isFinite(s) || s <= 0)
            throw new h("E_INVALID_ARGUMENT", `${e}: mass[${t}] = ${s} is not a finite number > 0`, {
                argument: "nodeMass",
                value: s,
                index: t,
                expected: "finite masses > 0",
            });
    }
}
function Gh(r) {
    const e = r.nodeCount,
        t = r.outDegree(),
        s = new Float32Array(e);
    for (let i = 0; i < e; i++) s[i] = t[i] + 1;
    return s;
}
function mn(r, e) {
    const { name: t } = e.meta;
    if (e.meta.components !== 1)
        throw it(
            "nodeMass",
            t,
            "a one-component numeric node column",
            `node column "${t}" has ${e.meta.components} components; a mass column has one`,
        );
    let s;
    switch (e.dtype) {
        case "f32":
        case "f64": {
            const n = r.nodes.gpuView(t),
                o = n instanceof Float32Array ? n : new Float32Array(n);
            return ($s(o, `node column "${t}"`), o);
        }
        case "u32":
        case "i32":
            s = r.nodes.gpuView(t);
            break;
        case "u8":
            s = e.data;
            break;
        default:
            throw it(
                "nodeMass",
                t,
                "a numeric node column (f32, f64, u32, i32, u8)",
                `node column "${t}" is ${e.dtype}, not numeric`,
            );
    }
    const i = new Float32Array(r.nodeCount);
    for (let n = 0; n < i.length; n++) i[n] = s[n];
    return ($s(i, `node column "${t}"`), i);
}
function zh(r, e) {
    const t = r.nodeCount;
    if (e == null) {
        const s = r.nodes.byRole("mass");
        return s === null ? Gh(r) : mn(r, s);
    }
    if (e instanceof Float32Array) {
        if (e.length !== t)
            throw it("nodeMass", e.length, `${t} values`, `nodeMass has ${e.length} values, expected ${t}`);
        return ($s(e, "nodeMass"), e);
    }
    if (typeof e == "string") {
        const s = r.nodes.get(e);
        if (s === null)
            throw it(
                "nodeMass",
                e,
                "an existing numeric node column",
                `nodeMass names node column "${e}", which the snapshot does not hold`,
            );
        return mn(r, s);
    }
    throw ArrayBuffer.isView(e)
        ? it("nodeMass", "typed array", "a Float32Array", "nodeMass must be a Float32Array, a column name or null")
        : new h("E_UNSUPPORTED", `nodeMass as a Record is not supported on the GPU path: ${gn}`, {
              option: "nodeMass",
              hint: gn,
          });
}
function Fh(r, e) {
    if (e === !0) return { data: r.weights, source: "arcs", column: null };
    if (e === !1 || e === null || e === void 0) return { data: null, source: "none", column: null };
    if (typeof e != "string")
        throw it(
            "weight",
            e,
            "true, false, null or an edge column name",
            "weight must be true, false, null or an edge column name",
        );
    const t = r.edges.get(e);
    if (t === null)
        throw it(
            "weight",
            e,
            "an existing numeric edge column",
            `weight names edge column "${e}", which the snapshot does not hold`,
        );
    if (t.meta.components !== 1)
        throw it(
            "weight",
            e,
            "a one-component numeric edge column",
            `edge column "${e}" has ${t.meta.components} components; a weight column has one`,
        );
    switch (t.dtype) {
        case "f32":
        case "f64":
        case "u32":
        case "i32": {
            const s = r.edges.gpuView(e),
                i = Mo(r, s);
            return { data: i instanceof Float32Array ? i : new Float32Array(i), source: "column", column: t };
        }
        case "string":
        case "list":
        case "json":
            throw (r.edges.gpuView(e), it("weight", e, "a numeric edge column", `edge column "${e}" is ${t.dtype}`));
        default:
            throw it(
                "weight",
                e,
                "an f32 / f64 / u32 / i32 edge column",
                `edge column "${e}" is ${t.dtype}: its gpuView is packed words, not per-edge values`,
            );
    }
}
const wn = { LINLOG: !1, DISTRIBUTED: !1, TIER: 0, USE_PERM: !1, HAS_WEIGHTS: !1 },
    bn = { SWING_MODE: 0 },
    Wh = Object.freeze({ ...At, nodeMass: null, nodeSize: null, weight: null, center: [0, 0, 0], seed: null });
function Cs(r) {
    return {
        SWING_MODE: r.SWING_MODE === 1 ? 1 : 0,
        STRONG_GRAVITY: r.STRONG_GRAVITY === !0,
        GRAVITY_CENTER: r.GRAVITY_CENTER === 1 ? 1 : 0,
    };
}
function vn(r) {
    return { ...Cs(r), LAW: 0 };
}
function Rt(r, e) {
    const t = r ?? {},
        s = e ?? Wh;
    if (e !== void 0 && t.maxInFlight !== void 0 && t.maxInFlight !== e.maxInFlight)
        throw new h(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${Yr(t.maxInFlight)}, current ${e.maxInFlight}`,
            { argument: "maxInFlight", value: t.maxInFlight, expected: e.maxInFlight },
        );
    const i = t.nodeSize === void 0 ? s.nodeSize : t.nodeSize;
    if (i !== null)
        throw new h(
            "E_UNSUPPORTED",
            "nodeSize (the adjustSizes correction) is not supported by the GPU ForceAtlas2 yet (spec 7.14)",
            { option: "nodeSize", hint: "pass nodeSize: null; the size-aware repulsion is deferred (spec 7.2, Q-25)" },
        );
    const n = {
        maxIter: re("maxIter", t.maxIter, s.maxIter, Me, "an integer >= 1"),
        jitterTolerance: re("jitterTolerance", t.jitterTolerance, s.jitterTolerance, (o) => o > 0, "> 0"),
        scalingRatio: re("scalingRatio", t.scalingRatio, s.scalingRatio, (o) => o > 0, "> 0"),
        gravity: re("gravity", t.gravity, s.gravity, (o) => o >= 0, ">= 0"),
        strongGravity: ar("strongGravity", t.strongGravity, s.strongGravity),
        distributedAction: ar("distributedAction", t.distributedAction, s.distributedAction),
        linlog: ar("linlog", t.linlog, s.linlog),
        nodeMass: t.nodeMass === void 0 ? s.nodeMass : t.nodeMass,
        nodeSize: i,
        weight: t.weight === void 0 ? s.weight : t.weight,
        dissuadeHubs: ar("dissuadeHubs", t.dissuadeHubs, s.dissuadeHubs),
        dim: ei(t.dim, s.dim),
        scale: re("scale", t.scale, s.scale, (o) => o > 0, "> 0"),
        center: ti(t.center, s.center),
        seed: ri(t.seed, s.seed),
        settleThreshold: re("settleThreshold", t.settleThreshold, s.settleThreshold, (o) => o >= 0, ">= 0"),
        settleWindow: re("settleWindow", t.settleWindow, s.settleWindow, Me, "an integer >= 1"),
        iterationsPerStep: re(
            "iterationsPerStep",
            t.iterationsPerStep,
            s.iterationsPerStep,
            (o) => Me(o) && o <= Fe,
            `an integer in [1, ${Fe}]`,
        ),
        maxInFlight: re("maxInFlight", t.maxInFlight, s.maxInFlight, Me, "an integer >= 1"),
    };
    return Object.freeze(n);
}
function ii(r) {
    const e = r ?? {},
        t = e.repulsion ?? mt.repulsion;
    if (t !== "exact" && t !== "grid" && t !== "auto") throw Re("repulsion", t, '"exact", "grid" or "auto"');
    const s = e.compat ?? mt.compat;
    if (s !== "paper" && s !== "networkx") throw Re("compat", s, '"paper" or "networkx"');
    const i = {
        repulsion: t,
        exactMaxNodes: re("exactMaxNodes", e.exactMaxNodes, mt.exactMaxNodes, Me, "an integer >= 1"),
        nearMax: re("nearMax", e.nearMax, mt.nearMax, (n) => Me(n) && n >= 2, "an integer >= 2"),
        deterministic: ar("deterministic", e.deterministic, mt.deterministic),
        gridMax2D: re("gridMax2D", e.gridMax2D, mt.gridMax2D, Me, "an integer >= 1"),
        gridMax3D: re("gridMax3D", e.gridMax3D, mt.gridMax3D, Me, "an integer >= 1"),
        extentFactor: re("extentFactor", e.extentFactor, mt.extentFactor, (n) => n > 0, "> 0"),
        compat: s,
    };
    return Object.freeze(i);
}
class Uh extends si {
    constructor(e, t) {
        (super(e, { name: "ForceAtlas2", pass: "fa2", scenePass: "fa2-to-scene", carry: "oldForce" }),
            (this.kind = "forceatlas2"),
            (this.current = t));
    }
    get swingMode() {
        return this.tuning.compat === "networkx" ? 1 : 0;
    }
    inputs(e, t) {
        const s = Rt(t, this.current),
            i = e.nodeCount,
            n = { mass: zh(e, s.nodeMass), weights: Fh(e, s.weight) };
        return ((this.nextGrid = gr(this.tuning, i) === "grid" ? ut(i, s.dim, this.tuning) : null), n);
    }
    overrides(e) {
        const t = Rt(e, this.current),
            s = this.swingMode;
        return {
            LINLOG: t.linlog,
            DISTRIBUTED: t.distributedAction,
            TIER: 0,
            SWING_MODE: s,
            STRONG_GRAVITY: t.strongGravity,
            GRAVITY_CENTER: s,
        };
    }
    specs(e, t) {
        const [s, i] = fr.specs(Cs(e)),
            n = this.nextGrid === null ? [] : ft.specs(vn(e), ut(cr + 1, 2, this.tuning));
        return [
            _("fa2-stats-finalize"),
            _("fa2-attraction", _e(e, wn)),
            s,
            i,
            _("fa2-integrate", _e(e, bn)),
            _("fa2-to-scene"),
            _("fill"),
            ...n,
        ];
    }
    async compile(e, t) {
        const { n: s, pipelines: i, caps: n } = e,
            [o, a, c, l] = await Promise.all([
                i.kernel(_("fa2-stats-finalize")),
                i.kernel(_("fa2-integrate", _e(t, bn))),
                i.kernel(_("fa2-to-scene")),
                i.kernel(_("fill")),
            ]),
            d = e.tier === "grid" ? null : await fr.create(i, n, Cs(t)),
            f = e.core.colIdx !== null ? await Js(e, _e(t, wn)) : null,
            p = e.tier === "grid" ? await ft.create(e, o.workgroupSize, vn(t), ut(s, e.dim, this.tuning)) : null;
        return {
            k1: o,
            k5: a,
            toScene: c,
            fill: l,
            attraction: f,
            exact: d === null ? null : (m) => (d.bind(m), d),
            grid: p,
        };
    }
    zeroesCarry() {
        return this.swingMode === 0;
    }
    recordSpeed(e, t, s) {
        t.recordSpeedFinalize(e, s);
    }
    paramsFor(e, t) {
        this.requireResources();
        const s = Rt(t, this.current);
        return {
            ...this.sharedParams(e, s),
            scalingRatio: s.scalingRatio,
            gravity: s.gravity,
            jitterTolerance: s.jitterTolerance,
            settleFloor: ta,
        };
    }
    onLoad(e) {
        (e.set("speed", 1),
            e.set("speedEfficiency", 1),
            e.set("swing", 1),
            e.set("traction", 1),
            (this.resetCarry = !0),
            this.nextGrid !== null && ni(e, this.nextGrid, this.tuning.extentFactor));
    }
    onReheat(e) {
        this.swingMode === 1 && (e.set("swing", 1), e.set("traction", 1));
    }
    onSetParams(e, t) {
        const s = Rt(e, this.current),
            i =
                s.linlog !== this.current.linlog ||
                s.strongGravity !== this.current.strongGravity ||
                s.distributedAction !== this.current.distributedAction;
        ((this.current = s), i && (t.set("speed", 1), t.set("speedEfficiency", 1)));
    }
    readStats(e, t) {
        const s = et.read(e),
            i = [],
            n = Math.floor(t.byteLength / qt);
        for (let o = 0; o < n; o++) {
            const a = Xt.read(t, o * qt);
            i.push({
                swing: he(a, "swing"),
                traction: he(a, "traction"),
                speed: he(a, "speed"),
                speedEfficiency: he(a, "speedEfficiency"),
                meanDisplacement: he(a, "meanDisplacement"),
                settledCount: he(a, "settledCount"),
            });
        }
        return {
            ...this.sharedStats(s),
            swing: he(s, "swing"),
            traction: he(s, "traction"),
            speed: he(s, "speed"),
            speedEfficiency: he(s, "speedEfficiency"),
            trace: i,
        };
    }
}
function ni(r, e, t) {
    const s = Math.fround,
        i = (b) => {
            const w = r.get(b);
            return typeof w == "number" ? [w, w, w] : w;
        },
        n = i("min"),
        o = i("max"),
        a = i("centroid"),
        c = r.get("rmsRadius"),
        l = [0, 1, 2].map((b) => s(s(s(o[b]) - s(n[b])) * s(Tn))),
        d = e.dim === 3 ? Math.max(l[0], l[1], l[2]) : Math.max(l[0], l[1]),
        f = s(s(t) * s(typeof c == "number" ? c : 0)),
        p = Math.max(Math.min(d, f), s(Dn)),
        g = s(p / e.g),
        m = s(0.5 * p);
    (r.set("gridMin", [s(s(a[0]) - m), s(s(a[1]) - m), s(s(a[2]) - m), g]),
        r.set("invCellSize", s(1 / g)),
        r.set("eps", s(0.25 * g)),
        r.set("outsideGrid", 0),
        r.set("maxCellOccupancy", 0));
}
function Vh(r, e) {
    return Rt(r, Rt(e));
}
function jh(r, e) {
    r.assertReady();
    const t = Rt(e),
        s = ii(e),
        i = new Uh(s, t);
    return new Zs(r, i, t, s, Vh);
}
const qh = Object.freeze({
        LINLOG: !1,
        DISTRIBUTED: !1,
        TIER: 0,
        SWING_MODE: 1,
        STRONG_GRAVITY: !1,
        GRAVITY_CENTER: 0,
        LAW: 1,
        APPLY: 1,
        STATS_MODE: 1,
    }),
    yn = Object.freeze({ SWING_MODE: 1, STRONG_GRAVITY: !1, GRAVITY_CENTER: 0, LAW: 1 }),
    Kh = Object.freeze({ ...Zo, center: [0, 0, 0], seed: null });
function Hh(r, e) {
    return r === void 0
        ? e
        : r === null || r === 0 || Number.isNaN(r)
          ? null
          : re("k", r, 1, (t) => t > 0, "> 0 or null");
}
function Yh(r, e) {
    if (r === void 0) return e;
    if (r === "linear" || r === "adaptive") return r;
    throw Re("cooling", r, '"linear" | "adaptive"');
}
function Vt(r, e) {
    const t = r ?? {},
        s = e ?? Kh;
    if (e !== void 0 && t.maxInFlight !== void 0 && t.maxInFlight !== e.maxInFlight)
        throw new h(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${Yr(t.maxInFlight)}, current ${e.maxInFlight}`,
            { argument: "maxInFlight", value: t.maxInFlight, expected: e.maxInFlight },
        );
    const i = t.fixed === void 0 ? s.fixed : t.fixed;
    if (i !== null && typeof i != "string" && !(i instanceof Uint32Array))
        throw Re("fixed", i, "a NodeMask (Uint32Array), the name of a bool node column, or null");
    const n = Yh(t.cooling, s.cooling),
        o = e === void 0 && n === "adaptive" && t.iterations === void 0 ? Qo : s.iterations,
        a = {
            k: Hh(t.k, s.k),
            iterations: re("iterations", t.iterations, o, (c) => Number.isInteger(c) && c >= 0, "an integer >= 0"),
            cooling: n,
            fixed: i,
            dim: ei(t.dim, s.dim),
            scale: re("scale", t.scale, s.scale, (c) => c > 0, "> 0"),
            center: ti(t.center, s.center),
            seed: ri(t.seed, s.seed),
            settleThreshold: re("settleThreshold", t.settleThreshold, s.settleThreshold, (c) => c >= 0, ">= 0"),
            settleWindow: re("settleWindow", t.settleWindow, s.settleWindow, Me, "an integer >= 1"),
            iterationsPerStep: re(
                "iterationsPerStep",
                t.iterationsPerStep,
                s.iterationsPerStep,
                (c) => Me(c) && c <= Fe,
                `an integer in [1, ${Fe}]`,
            ),
            maxInFlight: re("maxInFlight", t.maxInFlight, s.maxInFlight, Me, "an integer >= 1"),
        };
    return Object.freeze(a);
}
function Xh(r, e) {
    const t = Math.ceil(r.nodeCount / 32);
    if (typeof e == "string") {
        const i = r.nodes.get(e);
        if (i === null)
            throw Re("fixed", e, `the name of a bool node column (the snapshot holds no node column "${e}")`);
        if (i.dtype !== "bool") throw Re("fixed", e, `the name of a bool node column ("${e}" is ${i.dtype})`);
        return new Uint32Array(i.data.subarray(0, t));
    }
    if (e !== null) {
        if (e.length < t) throw Re("fixed", e.length, `a mask of at least ${t} words for ${r.nodeCount} nodes`);
        return new Uint32Array(e.subarray(0, t));
    }
    const s = r.nodes.byRole("fixed");
    return s !== null && s.dtype === "bool" ? new Uint32Array(s.data.subarray(0, t)) : null;
}
class Qh extends si {
    constructor(e, t) {
        (super(e, { name: "Fruchterman-Reingold", pass: "fr", scenePass: "fa2-to-scene", carry: "oldForce" }),
            (this.kind = "fruchtermanReingold"),
            (this.tempOrigin = 0),
            (this.pendingReheat = !1),
            (this.current = t));
    }
    inputs(e, t) {
        const s = Vt(t, this.current),
            i = {
                mass: new Float32Array(e.nodeCount).fill(1),
                weights: { data: null, source: "none", column: null },
                fixed: Xh(e, s.fixed),
            },
            n = e.nodeCount;
        return ((this.nextGrid = gr(this.tuning, n) === "grid" ? ut(n, s.dim, this.tuning) : null), i);
    }
    overrides(e) {
        return qh;
    }
    specs(e, t) {
        const s = this.nextGrid === null ? [] : ft.specs(yn, this.nextGrid);
        return [
            _("fa2-stats-finalize", _e(e, Gr)),
            _("fa2-attraction", _e(e, zr)),
            _("fa2-repulsion-exact", _e(e, Fr)),
            _("fa2-integrate", _e(e, Wr)),
            _("fa2-to-scene"),
            _("fill"),
            ...s,
        ];
    }
    async compile(e, t) {
        const { n: s, pipelines: i } = e,
            n = await i.kernel(_("fa2-stats-finalize", _e(t, Gr))),
            o = e.core.colIdx !== null ? await Js(e, _e(t, zr)) : null,
            a = e.tier === "grid" ? null : await i.kernel(_("fa2-repulsion-exact", _e(t, Fr))),
            c = await i.kernel(_("fa2-integrate", _e(t, Wr))),
            l = await i.kernel(_("fa2-to-scene")),
            d = await i.kernel(_("fill")),
            f = e.tier === "grid" ? await ft.create(e, n.workgroupSize, yn, ut(s, e.dim, this.tuning)) : null,
            p = a === null ? null : Xr.binder(a);
        return { k1: n, k5: c, toScene: l, fill: d, attraction: o, exact: p, grid: f };
    }
    paramsFor(e, t) {
        const { n: s } = this.requireResources(),
            i = Vt(t, this.current),
            n = i.cooling === "adaptive";
        return {
            ...this.sharedParams(e, i),
            flags: n ? An : 0,
            scalingRatio: 0,
            gravity: 0,
            jitterTolerance: 0,
            frK: i.k ?? 1 / Math.sqrt(s),
            settleFloor: xn.fruchtermanReingold * (i.k ?? 1 / Math.sqrt(s)),
            temperature: n ? Pr : this.temperatureAt(e, i),
        };
    }
    onLoad(e) {
        (this.resetAdaptive(e),
            e.set("kineticEnergy", 0),
            (this.tempOrigin = 0),
            (this.pendingReheat = !1),
            this.nextGrid !== null && ni(e, this.nextGrid, this.tuning.extentFactor));
    }
    resetAdaptive(e) {
        (e.set("temperature", Pr), e.set("frEnergy", Number.POSITIVE_INFINITY), e.set("frProgress", 0));
    }
    onReheat(e) {
        ((this.pendingReheat = !0), this.current.cooling === "adaptive" && this.resetAdaptive(e));
    }
    onSetParams(e, t) {
        this.current = Vt(e, this.current);
    }
    readStats(e, t) {
        const s = et.read(e),
            i = [],
            n = Math.floor(t.byteLength / qt);
        for (let o = 0; o < n; o++) {
            const a = Xt.read(t, o * qt);
            i.push({
                temperature: he(a, "modelScalar"),
                meanDisplacement: he(a, "meanDisplacement"),
                settledCount: he(a, "settledCount"),
            });
        }
        return { ...this.sharedStats(s), temperature: he(s, "temperature"), trace: i };
    }
    temperatureAt(e, t) {
        this.pendingReheat && ((this.tempOrigin = e - Math.floor(Ho * t.iterations)), (this.pendingReheat = !1));
        const s = Pr / (t.iterations + 1);
        return Math.max(0, Pr - s * (e - this.tempOrigin));
    }
}
function Zh(r, e) {
    if ("fixed" in r)
        throw new h("E_INVALID_ARGUMENT", "setParams({ fixed }) is not a live option (spec 7.12)", {
            argument: "fixed",
            value: r.fixed,
            expected: "absent",
            hint: "use setFixed(mask); fixed is applied at load()",
        });
    return Vt(r, Vt(e));
}
function Jh(r, e) {
    r.assertReady();
    const t = Vt(e),
        s = ii(e),
        i = new Qh(s, t);
    return new Zs(r, i, t, s, Zh);
}
const ep = Object.freeze({
        LINLOG: !1,
        DISTRIBUTED: !1,
        TIER: 0,
        SWING_MODE: 1,
        STRONG_GRAVITY: !1,
        GRAVITY_CENTER: 0,
        LAW: 2,
        APPLY: 2,
        STATS_MODE: 2,
    }),
    _n = Object.freeze({ SWING_MODE: 1, STRONG_GRAVITY: !1, GRAVITY_CENTER: 0, LAW: 2 }),
    tp = "velocity",
    rp = Object.freeze({ ...ks, maxIter: null, gravity: null, springCoefficient: null, center: [0, 0, 0], seed: null });
function Pn(r) {
    return Math.min(1, Jo / Math.max(1, r));
}
function Ps(r, e, t, s, i) {
    return e === void 0 ? t : e === null ? null : re(r, e, 1, s, `${i} or null`);
}
function jt(r, e) {
    const t = r ?? {},
        s = e ?? rp;
    if (e !== void 0 && t.maxInFlight !== void 0 && t.maxInFlight !== e.maxInFlight)
        throw new h(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${Yr(t.maxInFlight)}, current ${e.maxInFlight}`,
            { argument: "maxInFlight", value: t.maxInFlight, expected: e.maxInFlight },
        );
    const i = {
        maxIter: Ps("maxIter", t.maxIter, s.maxIter, Me, "an integer >= 1"),
        springLength: re("springLength", t.springLength, s.springLength, (n) => n > 0, "> 0"),
        springCoefficient: Ps("springCoefficient", t.springCoefficient, s.springCoefficient, (n) => n > 0, "> 0"),
        gravity: Ps("gravity", t.gravity, s.gravity, () => !0, "a finite number (negative repels)"),
        dragCoefficient: re("dragCoefficient", t.dragCoefficient, s.dragCoefficient, (n) => n >= 0, ">= 0"),
        timeStep: re("timeStep", t.timeStep, s.timeStep, (n) => n > 0, "> 0"),
        dim: ei(t.dim, s.dim),
        scale: re("scale", t.scale, s.scale, (n) => n > 0, "> 0"),
        center: ti(t.center, s.center),
        seed: ri(t.seed, s.seed),
        settleThreshold: re("settleThreshold", t.settleThreshold, s.settleThreshold, (n) => n >= 0, ">= 0"),
        settleWindow: re("settleWindow", t.settleWindow, s.settleWindow, Me, "an integer >= 1"),
        iterationsPerStep: re(
            "iterationsPerStep",
            t.iterationsPerStep,
            s.iterationsPerStep,
            (n) => Me(n) && n <= Fe,
            `an integer in [1, ${Fe}]`,
        ),
        maxInFlight: re("maxInFlight", t.maxInFlight, s.maxInFlight, Me, "an integer >= 1"),
    };
    return Object.freeze(i);
}
function sp(r) {
    const e = r.outDegree(),
        t = new Float32Array(r.nodeCount);
    for (let s = 0; s < r.nodeCount; s++) t[s] = 1 + e[s] / 3;
    return t;
}
class ip extends si {
    constructor(e, t) {
        (super(e, { name: "spring-electrical", pass: "se", scenePass: "se-to-scene", carry: tp }),
            (this.kind = "springElectrical"),
            (this.current = t));
    }
    inputs(e, t) {
        const { dim: s } = jt(t, this.current),
            i = e.nodeCount;
        return (
            (this.nextGrid = gr(this.tuning, i) === "grid" ? ut(i, s, this.tuning) : null),
            { mass: sp(e), weights: { data: null, source: "none", column: null } }
        );
    }
    overrides(e) {
        return ep;
    }
    specs(e, t) {
        const s = this.nextGrid === null ? [] : ft.specs(_n, this.nextGrid);
        return [
            _("fa2-stats-finalize", _e(e, Gr)),
            _("fa2-attraction", _e(e, zr)),
            _("fa2-repulsion-exact", _e(e, Fr)),
            _("fa2-integrate", _e(e, Wr)),
            _("fa2-to-scene"),
            _("fill"),
            ...s,
        ];
    }
    async compile(e, t) {
        const { n: s, pipelines: i } = e,
            [n, o, a, c] = await Promise.all([
                i.kernel(_("fa2-stats-finalize", _e(t, Gr))),
                i.kernel(_("fa2-integrate", _e(t, Wr))),
                i.kernel(_("fa2-to-scene")),
                i.kernel(_("fill")),
            ]),
            l = e.core.colIdx !== null ? await Js(e, _e(t, zr)) : null,
            d = e.tier === "grid" ? null : await i.kernel(_("fa2-repulsion-exact", _e(t, Fr))),
            f = e.tier === "grid" ? await ft.create(e, n.workgroupSize, _n, ut(s, e.dim, this.tuning)) : null,
            p = d === null ? null : Xr.binder(d);
        return { k1: n, k5: o, toScene: a, fill: c, attraction: l, exact: p, grid: f };
    }
    paramsFor(e, t) {
        const { n: s } = this.requireResources(),
            i = jt(t, this.current);
        return {
            ...this.sharedParams(e, i),
            scalingRatio: 0,
            gravity: 0,
            jitterTolerance: 0,
            frK: 0,
            temperature: 0,
            springLength: i.springLength,
            settleFloor: xn.springElectrical * i.springLength * (ea / Math.max(s, 1)) ** 0.25,
            springCoefficient: i.springCoefficient ?? ks.springCoefficient * Pn(s),
            coulomb: i.gravity ?? ks.gravity * Pn(s),
            dragCoefficient: i.dragCoefficient,
            timeStep: i.timeStep,
        };
    }
    onLoad(e) {
        (e.set("kineticEnergy", 0),
            e.set("temperature", 0),
            this.nextGrid !== null && ni(e, this.nextGrid, this.tuning.extentFactor));
    }
    onReheat(e) {}
    onSetParams(e, t) {
        this.current = jt(e, this.current);
    }
    readStats(e, t) {
        const s = et.read(e),
            i = [],
            n = Math.floor(t.byteLength / qt);
        for (let o = 0; o < n; o++) {
            const a = Xt.read(t, o * qt);
            i.push({
                kineticEnergy: he(a, "modelScalar"),
                meanDisplacement: he(a, "meanDisplacement"),
                settledCount: he(a, "settledCount"),
            });
        }
        return { ...this.sharedStats(s), kineticEnergy: he(s, "kineticEnergy"), trace: i };
    }
}
function np(r, e) {
    return jt(r, jt(e));
}
function op(r, e) {
    r.assertReady();
    const t = jt(e),
        s = ii(e),
        i = new ip(s, t);
    return new Zs(r, i, t, s, np);
}
function ap(r) {
    const e = { ...r };
    return (r.sources !== void 0 && (e.sources = Object.freeze([...r.sources])), Object.freeze(e));
}
function Sn(r, e, t) {
    return r === void 0 || e?.sources !== void 0 || e?.k !== void 0
        ? e
        : r.sources !== void 0
          ? { ...e, sources: r.sources.filter((s) => s < t) }
          : { ...e, k: r.k !== void 0 && r.k < t ? r.k : void 0 };
}
function cp(r) {
    const e = { ...r };
    return (r.betweenness !== void 0 && (e.betweenness = ap(r.betweenness)), Object.freeze(e));
}
function lp(r) {
    if (r === void 0) return Object.freeze({});
    const e = { ...r };
    return (
        r.layout !== void 0 && (e.layout = Object.freeze({ ...r.layout })),
        r.algorithms !== void 0 && (e.algorithms = cp(r.algorithms)),
        Object.freeze(e)
    );
}
function up(r, e) {
    r.assertReady();
    const t = lp(e);
    return {
        kind: "webgpu",
        harmonicCloseness: !0,
        ctx: r,
        options: t,
        forceAtlas2(s) {
            return (r.assertReady(), jh(r, { ...s, ...t.layout }));
        },
        fruchtermanReingold(s) {
            return (r.assertReady(), Jh(r, { ...s, ...t.layout }));
        },
        springElectrical(s) {
            return (r.assertReady(), op(r, { ...s, ...t.layout }));
        },
        async pageRank(s, i) {
            return (r.assertReady(), await Jf(r, s, i));
        },
        async personalizedPageRank(s, i, n) {
            r.assertReady();
            const o = i instanceof Float32Array ? i : Float32Array.from(i);
            return await eh(r, s, o, n);
        },
        async hits(s, i) {
            return (r.assertReady(), await sh(r, s, i));
        },
        async eigenvectorCentrality(s, i) {
            return (r.assertReady(), await th(r, s, i));
        },
        async katzCentrality(s, i) {
            return (r.assertReady(), await rh(r, s, i));
        },
        async connectedComponents(s, i) {
            return (r.assertReady(), await Yi(r, s, i));
        },
        async weaklyConnectedComponents(s, i) {
            return (r.assertReady(), await Yi(r, s, i));
        },
        async breadthFirstSearch(s, i, n) {
            return (r.assertReady(), await Dd(r, s, i, n));
        },
        async sssp(s, i, n) {
            return (r.assertReady(), await ao(r, s, i, n));
        },
        async bellmanFord(s, i, n) {
            return (r.assertReady(), await zd(r, s, i, n));
        },
        async betweennessCentrality(s, i) {
            return (r.assertReady(), await Xd(r, s, Sn(t.algorithms?.betweenness, i, s.nodeCount)));
        },
        async edgeBetweennessCentrality(s, i) {
            return (r.assertReady(), await Qd(r, s, Sn(t.algorithms?.betweenness, i, s.nodeCount)));
        },
        async closenessCentrality(s, i) {
            return (r.assertReady(), await af(r, s, i));
        },
        async allPairsShortestPath(s, i) {
            r.assertReady();
            for (const n of ["cutoff", "weights"])
                if (i?.[n] !== void 0)
                    throw new h("E_UNSUPPORTED", `allPairsShortestPath: ${n} is not supported`, {
                        option: n,
                        hint: "all-pairs shortest paths runs over the snapshot's own weights with no cutoff",
                    });
            return await Nd(r, s);
        },
        async triangleCount(s) {
            return (r.assertReady(), await oh(r, s));
        },
        async labelPropagation(s, i) {
            if ((r.assertReady(), i?.tolerance !== void 0))
                throw new h("E_UNSUPPORTED", "labelPropagation: tolerance has no meaning here", {
                    option: "tolerance",
                    hint: "label propagation stops at a fixed point or after maxIterations passes",
                });
            return await Vf(r, s, { maxIterations: i?.maxIterations, weighted: i?.weighted });
        },
        async minimumSpanningTree(s, i) {
            if ((r.assertReady(), i?.weights !== void 0))
                throw new h("E_UNSUPPORTED", "minimumSpanningTree: weights is not supported", {
                    option: "weights",
                    hint: "the spanning forest runs over the snapshot's own edge weights",
                });
            return await Yf(r, s);
        },
        release(s) {
            r.release(s);
        },
        dispose() {
            r.dispose();
        },
    };
}
const dp = "pass acceptSoftware: true to use the software adapter (usually slower than the CPU)",
    fp = new Set(["E_NO_WEBGPU", "E_NO_ADAPTER", "E_SOFTWARE_ONLY"]);
function Ss(r, e, t, s = {}) {
    let i = null;
    return (
        e === "E_SOFTWARE_ONLY" ? (i = dp) : e === "E_NO_WEBGPU" && (i = r.noWebGpuFix()),
        { ok: !1, code: e, reason: t, fix: i, adapter: s.adapter ?? null, check: s.check ?? null }
    );
}
async function hp(r, e) {
    const t = e.acceptSoftware !== !0,
        s = await r.probe(e, t);
    if (!s.ok || s.code !== "OK") {
        const o = s.code === "OK" ? "E_NO_ADAPTER" : s.code;
        return Ss(r, o, s.reason ?? o, { adapter: s.summary });
    }
    let i;
    try {
        i = await r.open(e, s, t);
    } catch (o) {
        if (xt(o) && fp.has(o.code)) return Ss(r, o.code, o.message, { adapter: s.summary });
        throw o;
    }
    let n;
    try {
        const o = await (r.verify ?? Xn)(i);
        if (o.mismatch !== null) {
            i.dispose();
            const a = o.mismatch.poison
                ? `${o.mismatch.where} was never written`
                : `${o.mismatch.where} came back as ${String(o.mismatch.actual)} where ${String(o.mismatch.expected)} was required`;
            return Ss(r, "E_DEVICE_INCORRECT", `the ${o.vendor} device computed a known prefix sum incorrectly: ${a}`, {
                adapter: s.summary,
                check: o,
            });
        }
        n = up(i, e.accelerator);
    } catch (o) {
        throw (i.dispose(), o);
    }
    return { ok: !0, code: "OK", accelerator: n };
}
function pp(r, e = {}) {
    let t = null,
        s = null,
        i = !1;
    const n = () => new h("E_DISPOSED", "the managed accelerator was disposed", { label: "acquireAccelerator" });
    return {
        current() {
            if (i) return Promise.reject(n());
            if ((s !== null && s.ctx.state !== "ready" && ((s = null), (t = null)), t === null)) {
                const o = hp(r, e).then(
                    (a) => {
                        if (!a.ok) return a;
                        if (i) throw (a.accelerator.dispose(), n());
                        return ((s = a.accelerator), a);
                    },
                    (a) => {
                        throw (t === o && (t = null), a);
                    },
                );
                t = o;
            }
            return t;
        },
        dispose() {
            ((i = !0), s?.dispose(), (s = null), (t = null));
        },
    };
}
function To() {
    return typeof navigator > "u" ? void 0 : navigator.gpu;
}
function gp(r) {
    return zt.probe({
        gpu: To(),
        powerPreference: r?.powerPreference ?? "high-performance",
        rejectSoftware: r?.rejectSoftware,
    });
}
function mp(r) {
    const e = To();
    return e === void 0 && r?.adapter === void 0
        ? Promise.reject(
              new h("E_NO_WEBGPU", "navigator.gpu is undefined: this browser or context has no WebGPU", {
                  reason: "navigator.gpu is undefined",
                  hint: "WebGPU needs a supporting browser and a secure context (https or localhost)",
              }),
          )
        : zt.create({ powerPreference: "high-performance", ...r, gpu: e, runtime: "browser" });
}
function wp(r) {
    return pp(
        {
            probe: (e, t) => gp({ powerPreference: e.powerPreference, rejectSoftware: t }),
            open: (e, t, s) =>
                mp({
                    adapter: t.adapter ?? void 0,
                    powerPreference: e.powerPreference,
                    rejectSoftware: s,
                    warnUnreleasedSnapshots: e.warnUnreleasedSnapshots,
                }),
            noWebGpuFix: () =>
                globalThis.isSecureContext === !1
                    ? "serve the page over https or from localhost: WebGPU needs a secure context"
                    : null,
        },
        r,
    );
}
const Yt = "webgpu-graph-algorithms",
    bp = new Set(["kind", "ctx", "options", "dispose", "verify"]);
function vp(r, e) {
    for (const [t, s] of Object.entries(r)) bp.has(t) || typeof s != "function" || (e[t] = s.bind(r));
}
function yp(r) {
    const { check: e } = r,
        t = e?.mismatch ?? null;
    if (e === null || t === null)
        return new xr({
            code: "E_DEVICE_INCORRECT",
            message: `this GPU computes incorrectly: ${r.reason}`,
            source: "acceleration",
            recoverable: !1,
            details: { accelerator: Yt },
        });
    const s = t.poison
        ? `${t.where} was never written at all`
        : `${t.where} came back as ${String(t.actual)} where ${String(t.expected)} was required`;
    return new xr({
        code: "E_DEVICE_INCORRECT",
        message: `this GPU computes multi-workgroup shaders incorrectly: a prefix sum of ${String(e.count)} known numbers came back wrong -- ${s}. The graph is being computed on the processor instead, because every number this device produced would be unreliable`,
        source: "acceleration",
        recoverable: !1,
        details: {
            accelerator: Yt,
            check: e.check,
            where: t.where,
            expected: t.expected,
            actual: t.actual,
            poison: t.poison,
            count: e.count,
            blocks: e.blocks,
            workgroupSize: e.workgroupSize,
            ms: e.ms,
            adapter: { vendor: e.vendor, architecture: e.architecture, description: e.description },
        },
    });
}
function _p(r) {
    if (r.code === "E_DEVICE_INCORRECT") return yp(r);
    const t = {
        E_NO_WEBGPU:
            typeof globalThis.isSecureContext == "boolean" && !globalThis.isSecureContext
                ? "WebGPU requires a secure context (https or localhost)"
                : "this browser has no WebGPU",
        E_NO_ADAPTER: "WebGPU is present but no graphics adapter would answer",
        E_SOFTWARE_ONLY: "the only WebGPU adapter here is a software renderer, which is slower than the CPU path",
    };
    return new xr({
        code: r.code,
        message: t[r.code],
        source: "acceleration",
        recoverable: !1,
        details: { accelerator: Yt, probe: r.reason },
    });
}
function Pp(r, e) {
    const { ctx: t } = r,
        { caps: s } = t,
        i = {
            name: Yt,
            backend: "webgpu",
            device: {
                vendor: s.vendor,
                architecture: s.architecture,
                description: s.description === "" ? s.device : s.description,
            },
            precision: "f32",
            lost: t.lost.then((n) => ({ reason: n.message === "" ? n.reason : n.message })),
            dispose: e,
        };
    return (vp(r, i), i);
}
async function Sp(r) {
    const { exactMaxNodes: e } = r ?? {};
    if (e !== void 0 && e > cr)
        throw new xr({
            code: "E_TOO_LARGE",
            message: `the WebGPU accelerator computes exactly up to ${String(cr)} nodes, not ${String(e)}`,
            source: "acceleration",
            details: { accelerator: Yt, exactMaxNodes: e, limit: cr },
        });
    const t = wp({
            acceptSoftware: r?.acceptSoftware ?? !1,
            accelerator: e === void 0 ? void 0 : { layout: { exactMaxNodes: e } },
        }),
        s = await t.current();
    if (!s.ok) throw _p(s);
    return Pp(s.accelerator, () => {
        t.dispose();
    });
}
Go({ name: Yt, backend: "webgpu", factory: Sp });
//# sourceMappingURL=webgpu-BkDkyYJe.js.map
