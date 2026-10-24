import {
    d as C,
    R as W,
    p as F,
    O as V,
    q as G,
    f as l,
    o as X,
    r as J,
    I as Y,
    w as U,
    v as Z,
    x as N,
    t as M,
} from "./index-hDuyXkBS.js";
import { D as Ft, y as Vt } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
const K = /^([^.[\]]+)(\[\])?$/,
    T = new Map();
function L(n) {
    const t = T.get(n);
    if (t !== void 0) return t;
    let e = [];
    if (n !== ".")
        for (const i of n.split(".")) {
            const s = K.exec(i);
            if (s === null) {
                e = null;
                break;
            }
            e.push({ key: s[1], flatten: s[2] !== void 0 });
        }
    return (T.set(n, e), e);
}
function g(n, t) {
    let e = n === void 0 ? [] : [n];
    for (const i of L(t) ?? []) {
        const s = [];
        for (const o of e) {
            if (typeof o != "object" || o === null || !Object.hasOwn(o, i.key)) continue;
            const a = o[i.key];
            i.flatten && Array.isArray(a) ? s.push(...a) : a != null && s.push(a);
        }
        e = s;
    }
    return e.filter((i) => i != null);
}
function y(n, t) {
    return g(n, t)[0];
}
function Q(n, t) {
    const e = g(n, t);
    return e.length === 1 && Array.isArray(e[0]) ? e[0] : e;
}
const E = /\{([^{}]*)\}/g,
    tt = /^[A-Za-z_][A-Za-z0-9_-]*$/;
function et(n) {
    const t = [];
    for (const e of n.matchAll(E)) {
        if (!tt.test(e[1])) return null;
        t.push(e[1]);
    }
    return /[{}]/.test(n.replaceAll(E, "")) ? null : t;
}
function R(n, t, e, i) {
    return n.replaceAll(E, (s, o) => {
        const a = t[o];
        return (
            a === void 0 &&
                l(i, "E_SOURCE_PARAM", `the mapping's template needs ${o}`, { name: o, reason: "required" }),
            e(a)
        );
    });
}
function it(n) {
    return (t) => (
        (t === "." || t === ".." || t === "") &&
            l(n, "E_SOURCE_PARAM", "a path value may not be empty or a dot segment", { name: "path", reason: "path" }),
        encodeURIComponent(t)
    );
}
function x(n, t, e) {
    const i = t.pathname.replace(/\/$/, "");
    return (
        (n.origin !== t.origin || !(n.pathname === i || n.pathname.startsWith(`${i}/`))) &&
            l(e, "E_SOURCE_PARAM", "a request left the mapping's endpoint", { name: "url", reason: "origin" }),
        n
    );
}
function nt(n, t, e, i) {
    const s = R(t.path, e, it(i), i),
        o = new URL(`${n.origin}${n.pathname.replace(/\/$/, "")}${s}`);
    for (const [d, r] of Object.entries(t.query ?? {}))
        o.searchParams.set(
            d,
            R(r, e, (c) => c, i),
        );
    if ((x(o, n, i), t.method !== "POST")) return { url: o, init: {} };
    const a = k(t.body, e, i);
    return {
        url: o,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(a ?? null),
            idempotent: !0,
        },
    };
}
function k(n, t, e) {
    return typeof n == "string"
        ? R(n, t, (i) => i, e)
        : Array.isArray(n)
          ? n.map((i) => k(i, t, e))
          : typeof n == "object" && n !== null
            ? Object.fromEntries(Object.entries(n).map(([i, s]) => [i, k(s, t, e)]))
            : n;
}
function u(n) {
    return typeof n == "object" && n !== null && !Array.isArray(n);
}
function h(n, t, e, i, s = !1) {
    (n === void 0 && !i) ||
        (typeof n != "string" ? e("missing", t) : !(s && n === "#") && L(n) === null && e("selector", t));
}
function I(n, t, e) {
    typeof n != "string" ? e("missing", t) : et(n) === null && e("template", t);
}
function st(n, t, e) {
    if (n !== void 0) {
        if (!u(n)) {
            e("missing", `${t}.query`);
            return;
        }
        for (const [i, s] of Object.entries(n)) I(s, `${t}.query.${i}`, e);
    }
}
function ot(n) {
    return u(n) && Number.isInteger(n.max) && n.max >= 1 && typeof n.join == "string";
}
function rt(n, t, e, i) {
    if (!u(n)) {
        i("missing", t);
        return;
    }
    (n.method !== void 0 && n.method !== "GET" && n.method !== "POST" && i("missing", `${t}.method`),
        I(n.path, `${t}.path`, i),
        typeof n.path == "string" && !n.path.startsWith("/") && i("template", `${t}.path`),
        st(n.query, t, i),
        h(n.records, `${t}.records`, i, !0),
        typeof n.entity != "string"
            ? i("missing", `${t}.entity`)
            : e.has(n.entity) || i("unknown-entity", `${t}.entity`),
        n.batch !== void 0 && !ot(n.batch) && i("batch", `${t}.batch`),
        n.paging !== void 0 && at(n.paging, `${t}.paging`, i));
}
function at(n, t, e) {
    const i = n;
    if (!u(i)) {
        e("paging", t);
        return;
    }
    switch (i.style) {
        case "cursor":
            ((typeof i.param != "string" || typeof i.first != "string") && e("paging", t),
                h(i.next, `${t}.next`, e, !0));
            break;
        case "offset": {
            const s = i.size;
            (typeof i.param == "string" &&
                u(s) &&
                typeof s.param == "string" &&
                Number.isInteger(s.value) &&
                s.value > 0 &&
                (i.unit === void 0 || i.unit === "items" || i.unit === "pages") &&
                (i.base === void 0 || i.base === 0 || i.base === 1)) ||
                e("paging", t);
            break;
        }
        case "link-header":
            i.rel !== void 0 && typeof i.rel != "string" && e("paging", t);
            break;
        case "next-url":
            h(i.next, `${t}.next`, e, !0);
            break;
        default:
            e("paging", `${t}.style`);
    }
}
function dt(n, t, e, i) {
    if (!u(n)) {
        i("missing", t);
        return;
    }
    const s = n;
    if ((typeof s.type != "string" && i("missing", `${t}.type`), h(s.each, `${t}.each`, i, !1), "pairs" in s))
        h(s.pairs, `${t}.pairs`, i, !0);
    else if ((h(s.to, `${t}.to`, i, !0), h(s.from, `${t}.from`, i, !1), u(s.fields)))
        for (const [o, a] of Object.entries(s.fields)) h(a, `${t}.fields.${o}`, i, !0);
    else s.fields !== void 0 && i("missing", `${t}.fields`);
    s.entity !== void 0 && (typeof s.entity != "string" || !e.has(s.entity)) && i("unknown-entity", `${t}.entity`);
}
function ct(n, t, e, i) {
    if (!u(n)) {
        i("missing", t);
        return;
    }
    if (
        (h(n.id, `${t}.id`, i, !0, !0),
        n.stripPrefix !== void 0 && typeof n.stripPrefix != "string" && i("missing", `${t}.stripPrefix`),
        n.label !== void 0 && typeof n.label != "string" && i("missing", `${t}.label`),
        n.node !== void 0 && n.node && i("missing", `${t}.node`),
        u(n.fields))
    )
        for (const [s, o] of Object.entries(n.fields)) h(o, `${t}.fields.${s}`, i, !0, !0);
    else n.fields !== void 0 && i("missing", `${t}.fields`);
    (Array.isArray(n.edges)
        ? n.edges.forEach((s, o) => {
              dt(s, `${t}.edges.${String(o)}`, e, i);
          })
        : n.edges !== void 0 && i("missing", `${t}.edges`),
        Array.isArray(n.embedded)
            ? n.embedded.forEach((s, o) => {
                  const a = `${t}.embedded.${String(o)}`;
                  if (!u(s)) {
                      i("missing", a);
                      return;
                  }
                  (h(s.at, `${a}.at`, i, !0),
                      (typeof s.entity != "string" || !e.has(s.entity)) && i("unknown-entity", `${a}.entity`));
              })
            : n.embedded !== void 0 && i("missing", `${t}.embedded`));
}
function ut(n, t, e) {
    const i = [
        ["load", n.load],
        ["hydrate", n.hydrate],
        ["seed", n.seed],
    ];
    u(n.expand) ? i.push(["expand.in", n.expand.in], ["expand.out", n.expand.out]) : i.push(["expand", n.expand]);
    for (const [s, o] of i)
        (o === void 0 && s !== "load") ||
            (typeof o != "string" ? e("missing", s) : t.has(o) || e("unknown-request", s));
}
function ft(n, t) {
    let e = null;
    try {
        e = new URL(typeof n == "string" ? n : "");
    } catch {}
    (e === null ||
        (e.protocol !== "https:" && e.protocol !== "http:") ||
        e.username !== "" ||
        e.password !== "" ||
        e.search !== "" ||
        e.hash !== "") &&
        t("endpoint", "endpoint");
}
function lt(n) {
    const t = [],
        e = (d, r) => {
            t.push(Object.freeze({ code: d, at: r }));
        };
    if (!u(n)) return (e("missing", ""), t);
    const i = n;
    (i.version !== 1 && e("version", "version"), ft(i.endpoint, e));
    const s = u(i.requests) ? i.requests : {},
        o = u(i.entities) ? i.entities : {};
    (u(i.requests) || e("missing", "requests"), u(i.entities) || e("missing", "entities"));
    const a = new Set(Object.keys(o));
    for (const [d, r] of Object.entries(s)) rt(r, `requests.${d}`, a, e);
    for (const [d, r] of Object.entries(o)) ct(r, `entities.${d}`, a, e);
    return (
        ut(i, new Set(Object.keys(s)), e),
        ht(i, e),
        h(i.modified, "modified", e, !1),
        i.directed !== void 0 && typeof i.directed != "boolean" && e("missing", "directed"),
        t
    );
}
function ht(n, t) {
    for (const [e, i] of [
        ["rateLimit.requests", n.rateLimit?.requests],
        ["rateLimit.perMs", n.rateLimit?.perMs],
    ])
        n.rateLimit !== void 0 && !(typeof i == "number" && i > 0) && t("number", e);
    n.budgetHeaders !== void 0 &&
        (typeof n.budgetHeaders.remaining != "string" ||
            (n.budgetHeaders.reset !== void 0 && typeof n.budgetHeaders.reset != "string")) &&
        t("missing", "budgetHeaders");
}
function pt(n) {
    switch (n?.style) {
        case "cursor":
            return n.first;
        case "offset":
            return n.base ?? 0;
        default:
            return null;
    }
}
function D(n, t, e, i, s) {
    if (e === null) return n;
    const o = new URL(n);
    switch (t?.style) {
        case "cursor":
            return (o.searchParams.set(t.param, String(e)), o);
        case "offset":
            return (o.searchParams.set(t.param, String(e)), o.searchParams.set(t.size.param, String(t.size.value)), o);
        default:
            return x(new URL(String(e), n), i, s);
    }
}
function gt(n, t, e, i) {
    return D(n, t, pt(t), e, i);
}
function mt(n, t) {
    for (const e of n.split(/,(?=\s*<)/)) {
        const i = /^\s*<([^>]*)>(.*)$/.exec(e);
        if (i === null) continue;
        if (/;\s*rel="?([^";]+)"?/i.exec(i[2])?.[1].split(/\s+/).includes(t)) return i[1];
    }
    return null;
}
function yt(n, t, e, i) {
    const s = t.headers.get("link");
    if (s === null)
        return (
            t.runtime === "browser" &&
                l(i, "E_SOURCE_RESPONSE", "the Link header cannot be read", {
                    expected: "link-header",
                    contentType: t.headers.get("content-type"),
                }),
            null
        );
    const o = mt(s, n);
    return o === null ? null : x(new URL(o, t.url), e, i).href;
}
function bt(n, t, e, i, s) {
    switch (n?.style) {
        case "cursor": {
            const o = y(e.body, n.next);
            return (typeof o == "string" && o !== "") || typeof o == "number" ? o : null;
        }
        case "offset": {
            if (e.records < n.size.value || e.records === 0) return null;
            const o = n.unit === "pages" ? 1 : n.size.value;
            return Number(t) + o;
        }
        case "link-header":
            return yt(n.rel ?? "next", e, i, s);
        case "next-url": {
            const o = y(e.body, n.next);
            return typeof o == "string" && o !== "" ? x(new URL(o, e.url), i, s).href : null;
        }
        default:
            return null;
    }
}
function A(n = []) {
    return { full: new Set(), stubs: new Set(), known: new Set(n), modified: null };
}
function b(n, t) {
    if (typeof n != "string" && typeof n != "number") return null;
    const e = String(n),
        i = t?.stripPrefix;
    return i !== void 0 && i !== "" && e.startsWith(i) ? e.slice(i.length) : e;
}
function O(n, t, e) {
    return t === "#" ? e : t.includes("[]") ? g(n, t) : y(n, t);
}
class vt {
    constructor(t, e) {
        ((this.mapping = t), (this.state = e), (this.out = { nodes: [], edges: [] }), (this.pending = []));
    }
    addRecords(t, e) {
        const i = this.mapping.entities[e];
        t.forEach((s, o) => {
            const a = i.node === !1 ? null : b(O(s, i.id, o), i);
            if (i.node !== !1) {
                if (a === null) return;
                this.addNode(s, o, a, e, i);
            }
            const d = this.mapping.modified === void 0 ? void 0 : y(s, this.mapping.modified);
            (typeof d == "string" &&
                (this.state.modified === null || d > this.state.modified) &&
                (this.state.modified = d),
                this.pending.push({ record: s, entity: e, id: a }));
            for (const r of i.embedded ?? []) this.addRecords(g(s, r.at), r.entity);
        });
    }
    addNode(t, e, i, s, o) {
        const a = { labels: [o.label ?? s] };
        if (o.fields === void 0)
            for (const [d, r] of Object.entries(t))
                d !== "id" &&
                    d !== "labels" &&
                    (typeof r == "string" || typeof r == "number" || typeof r == "boolean") &&
                    (a[d] = r);
        else
            for (const [d, r] of Object.entries(o.fields)) {
                const c = O(t, r, e);
                c !== void 0 && (a[d] = c);
            }
        (this.state.stubs.has(i) && (a[N] = !1), this.state.full.add(i), this.out.nodes.push({ id: i, ...a }));
    }
    end(t, e) {
        const { full: i, stubs: s, known: o } = this.state;
        i.has(t) ||
            s.has(t) ||
            o.has(t) ||
            (s.add(t), this.out.nodes.push({ id: t, [N]: !0, ...(e === void 0 ? {} : { [Z]: e }) }));
    }
    runRule(t, e, i, s) {
        const o = t.each === void 0 ? [e] : g(e, t.each);
        "pairs" in t ? this.runPairsRule(t, o, i) : this.runLinkRule(t, o, i, s);
    }
    runPairsRule(t, e, i) {
        const s = t.entity ?? i,
            o = this.mapping.entities[s];
        for (const a of e) {
            const d = [...new Set(g(a, t.pairs).map((r) => b(r, o)))].filter((r) => r !== null);
            for (let r = 0; r < d.length; r++)
                for (let c = r + 1; c < d.length; c++)
                    (this.end(d[r], s),
                        this.end(d[c], s),
                        this.out.edges.push({ source: d[r], target: d[c], type: t.type }));
        }
    }
    runLinkRule(t, e, i, s) {
        const o = this.mapping.entities[i],
            a = t.entity === void 0 ? o : this.mapping.entities[t.entity];
        for (const d of e) {
            const r = t.from === void 0 ? s : b(y(d, t.from), o);
            if (r === null) continue;
            const c = g(d, t.to)
                .map((f) => b(f, a))
                .filter((f) => f !== null);
            for (const f of c)
                (this.end(r, t.from === void 0 ? i : void 0),
                    this.end(f, t.entity),
                    this.out.edges.push({ ...xt(t.fields, d), source: r, target: f, type: t.type }));
        }
    }
    finish() {
        for (const { record: t, entity: e, id: i } of this.pending)
            for (const s of this.mapping.entities[e].edges ?? []) this.runRule(s, t, e, i);
        return ((this.pending.length = 0), this.out);
    }
}
function xt(n, t) {
    const e = {};
    for (const [i, s] of Object.entries(n ?? {})) {
        const o = O(t, s, 0);
        o !== void 0 && (e[i] = o);
    }
    return e;
}
function $(n, t, e) {
    const i = new vt(n, e);
    for (const s of t) i.addRecords(s.records, s.entity);
    return i.finish();
}
const wt = new Set(["E_SOURCE_AUTH", "E_SOURCE_FORBIDDEN"]);
function St(n) {
    return Math.max(0, n > 1e9 ? n * 1e3 - Date.now() : n * 1e3);
}
class v {
    constructor(t, e, i) {
        ((this.plan = t),
            (this.ctx = e),
            (this.paced = i),
            (this.facts = {}),
            (this.last = 0),
            (this.endpoint = new URL(t.mapping.endpoint)),
            e.endpoint !== null &&
                X(e.endpoint) !== this.endpoint.origin &&
                l(e.report, "E_SOURCE_PARAM", "the endpoint is not the mapping's", {
                    name: "endpoint",
                    reason: "origin",
                }));
    }
    async pace() {
        const t = this.plan.mapping.rateLimit;
        if (!this.paced || t === void 0) return;
        const e = this.last + t.perMs / t.requests - Date.now();
        (e > 0 && (await J(e, this.ctx.signal)), (this.last = Date.now()));
    }
    noteBudget(t) {
        const e = this.plan.mapping.budgetHeaders,
            i = e === void 0 ? null : t.get(e.remaining);
        if (e === void 0 || i === null || !Number.isFinite(Number(i))) return;
        const s = e.reset === void 0 ? null : Number(t.get(e.reset) ?? Number.NaN),
            o = s === null || !Number.isFinite(s) ? void 0 : St(s);
        this.facts.budget = { remaining: Number(i), ...(o === void 0 ? {} : { resetMs: o }) };
    }
    async read(t, e, i, s) {
        const o = this.plan.mapping.requests[t],
            { report: a } = this.ctx,
            d = nt(this.endpoint, o, e, a),
            r = i === void 0 ? gt(d.url, o.paging, this.endpoint, a) : D(d.url, o.paging, i, this.endpoint, a);
        await this.pace();
        const c = await this.ctx.fetch(r, {
            ...d.init,
            headers: { accept: "application/json", ...d.init.headers, ...s },
            allowStatus: [304],
        });
        if ((this.noteBudget(c.headers), c.status === 304))
            return { records: [], next: null, headers: c.headers, status: 304 };
        const f = await c.text();
        let p;
        try {
            p = JSON.parse(f);
        } catch {
            l(a, "E_SOURCE_RESPONSE", "the response is not JSON", {
                expected: "json",
                contentType: c.headers.get("content-type"),
            });
        }
        const P = Q(p, o.records),
            B = i ?? null,
            H = bt(
                o.paging,
                i ?? (o.paging?.style === "offset" ? (o.paging.base ?? 0) : B),
                { body: p, headers: c.headers, url: r, records: P.length, runtime: this.ctx.runtime },
                this.endpoint,
                a,
            );
        return { records: P, next: H, headers: c.headers, status: c.status };
    }
    finish(t, e = null) {
        return (
            t?.modified !== null &&
                t?.modified !== void 0 &&
                (this.facts.validators = { ...this.facts.validators, modified: t.modified }),
            this.ctx.finish({ ...this.facts, next: e })
        );
    }
    noteValidators(t) {
        const e = t.get("etag"),
            i = t.get("last-modified");
        this.facts.validators = {
            ...this.facts.validators,
            ...(e === null ? {} : { etag: e }),
            ...(i === null ? {} : { lastModified: i }),
        };
    }
    meta() {
        const { directed: t } = this.plan.mapping;
        return t === void 0 ? void 0 : { directed: t };
    }
}
function _t(n, t) {
    const e = {};
    for (const [i, s] of Object.entries(n))
        i !== t && (typeof s == "string" || typeof s == "number" || typeof s == "boolean") && (e[i] = String(s));
    return e;
}
async function* Et(n) {
    const { mapping: t, values: e } = n.plan,
        { cursor: i } = n.ctx;
    i !== null &&
        i.r !== t.load &&
        l(n.ctx.report, "E_SOURCE_PARAM", "the cursor is not this mapping's", {
            name: "cursor",
            reason: "stale-cursor",
        });
    const s = A(),
        o = [];
    if (i === null && t.seed !== void 0) {
        const c = await n.read(t.seed, e, void 0);
        o.push({ records: c.records, entity: t.requests[t.seed].entity });
    }
    const { entity: a } = t.requests[t.load];
    let d = i === null ? void 0 : i.at,
        r = !0;
    for (;;) {
        const c = await n.read(t.load, e, d);
        r && i === null && n.noteValidators(c.headers);
        const f = $(t, [...o.splice(0), { records: c.records, entity: a }], s);
        n.finish(s);
        const p = c.next === null ? null : { r: t.load, at: c.next };
        if ((yield { nodes: f.nodes, edges: f.edges, next: p, meta: r ? n.meta() : void 0 }, c.next === null)) return;
        ((r = !1), (d = c.next));
    }
}
function Rt(n, t, e, i) {
    const { report: s } = e;
    let o = 0;
    for (const { id: a, ...d } of n.nodes) {
        o++ % 64 === 0 && M(e.signal);
        try {
            (t.addNodeRecord(a, d), s.counts.nodes++);
        } catch (r) {
            (s.recordError(r, { element: String(a) }), s.counts.skippedNodes++);
        }
    }
    for (const { source: a, target: d, ...r } of n.edges)
        if ((o++ % 64 === 0 && M(e.signal), !(i !== void 0 && !i.has(String(r.type)))))
            try {
                (t.addEdgeRecord(a, d, r), s.counts.edges++);
            } catch (c) {
                (s.recordError(c, { element: `${String(a)} -> ${String(d)}` }), s.counts.skippedEdges++);
            }
}
function kt(n, t) {
    if (t.depth === 0) return n.hydrate === void 0 ? [] : [n.hydrate];
    const { expand: e } = n;
    if (typeof e == "string" || e === void 0) return e === void 0 ? [] : [e];
    const i = t.direction ?? "both",
        s = [i !== "out" ? e.in : void 0, i !== "in" ? e.out : void 0];
    return [...new Set(s.filter((o) => o !== void 0))];
}
function Ot(n, t) {
    const e = [];
    for (let i = 0; i < n.length; i += t) e.push(n.slice(i, i + t));
    return e;
}
async function At(n, t, e) {
    return new $t(n, t, e).expand();
}
class $t {
    constructor(t, e, i) {
        ((this.run = t), (this.request = e), (this.sink = i), (this.added = 0), (this.wrote = !1));
        const { ctx: s } = t;
        ((this.mapping = t.plan.mapping),
            (this.names = kt(this.mapping, e)),
            this.names.length === 0 &&
                l(s.report, "E_SOURCE_UNSUPPORTED", "the mapping has no request for this expansion", {
                    feature: e.depth === 0 ? "hydrate" : "expand",
                }),
            e.ids.length === 0 &&
                l(s.report, "E_SOURCE_PARAM", "an expansion needs seed ids", { name: "ids", reason: "required" }),
            (this.state = A([...e.ids.map(String), ...(e.exclude ?? []).map(String)])),
            (this.types = e.relationshipTypes === void 0 ? void 0 : new Set(e.relationshipTypes)),
            this.mapping.directed !== void 0 && i.edgeCount === 0 && i.setDirected(this.mapping.directed));
    }
    async expand() {
        let t = this.request.ids.map(String);
        const e = Math.max(1, this.request.depth ?? 1);
        for (let i = 1; i <= e && t.length > 0; i++) {
            const s = [],
                o = await this.hop(i, t, s);
            if (o !== null) return o;
            t = [...new Set(s)];
        }
        return this.run.finish(this.state, null);
    }
    async hop(t, e, i) {
        for (const [s, o] of this.names.entries()) {
            const a = this.mapping.requests[o].batch?.max ?? 1;
            for (const [d, r] of Ot(e, a).entries()) {
                if (this.skipped({ hop: t, x: s, b: d })) continue;
                const c = await this.readBatch({ hop: t, x: s, b: d }, o, r, e, i);
                if (c !== null) return c;
            }
        }
        return null;
    }
    skipped(t) {
        const { hop: e, x: i, b: s } = t,
            o = this.run.ctx.cursor;
        if (e !== 1 || o === null) return !1;
        const a = Number(o.x);
        return i < a || (i === a && s < Number(o.b));
    }
    startPosition(t) {
        const { hop: e, x: i, b: s } = t,
            o = this.run.ctx.cursor;
        return e === 1 && o !== null && i === Number(o.x) && s === Number(o.b) ? (o.at ?? void 0) : void 0;
    }
    async readBatch(t, e, i, s, o) {
        const a = this.mapping.requests[e],
            d = { ...this.run.plan.values, id: i[0], ids: i.join(a.batch?.join ?? ",") };
        let r = this.startPosition(t);
        for (;;) {
            let c;
            try {
                c = await this.run.read(e, d, r);
            } catch (p) {
                return this.authStop(p, t.hop === 1 ? { x: t.x, b: t.b, at: r ?? null } : null);
            }
            this.writeNew(c, a.entity, o);
            const f = this.capStop(t, c, s);
            if (f !== null || c.next === null) return f;
            r = c.next;
        }
    }
    authStop(t, e) {
        if (!this.wrote || !(t instanceof Y) || !wt.has(String(t.issue?.code))) throw t;
        const i = t.issue?.params ?? {};
        return (
            U(this.run.ctx.report, "W_SOURCE_AUTH", "a later page needs a credential; the pages before it are kept", {
                origin: typeof i.origin == "string" ? i.origin : this.run.endpoint.origin,
                status: typeof i.status == "number" ? i.status : null,
            }),
            this.run.finish(this.state, e)
        );
    }
    writeNew(t, e, i) {
        const { state: s } = this,
            o = new Set([...s.full, ...s.stubs]),
            a = $(this.mapping, [{ records: t.records, entity: e }], s);
        (Rt(a, this.sink, this.run.ctx, this.types), (this.wrote = !0));
        for (const d of a.nodes) {
            const r = String(d.id);
            !o.has(r) && !s.known.has(r) && (i.push(r), this.added++);
        }
    }
    capStop(t, e, i) {
        const { hop: s, x: o, b: a } = t,
            { ctx: d } = this.run,
            r = this.request.limit !== void 0 && this.added >= this.request.limit;
        if (
            (r &&
                U(d.report, "W_SOURCE_LIMIT", "the expansion reached its limit", { limit: "limit", value: this.added }),
            !r && !d.limits.reached())
        )
            return null;
        const c = e.next === null ? null : { x: o, b: a, at: e.next };
        return this.run.finish(this.state, s === 1 ? (c ?? Pt(o, a, this.names, i, this.mapping)) : null);
    }
}
function Pt(n, t, e, i, s) {
    const o = Math.ceil(i.length / (s.requests[e[n]].batch?.max ?? 1));
    return t + 1 < o ? { x: n, b: t + 1, at: null } : n + 1 < e.length ? { x: n + 1, b: 0, at: null } : null;
}
async function Ut(n, t) {
    const { mapping: e, values: i } = n.plan,
        s = {};
    (t.etag !== void 0 && (s["if-none-match"] = t.etag),
        t.lastModified !== void 0 && (s["if-modified-since"] = t.lastModified));
    const o = A(),
        a = [];
    if (e.seed !== void 0) {
        const c = await n.read(e.seed, i, void 0);
        a.push({ records: c.records, entity: e.requests[e.seed].entity });
    }
    const d = await n.read(e.load, i, void 0, s);
    if (d.status === 304) return { status: "current", via: t.etag === void 0 ? "modified" : "etag", validators: t };
    ($(e, [...a, { records: d.records, entity: e.requests[e.load].entity }], o), n.noteValidators(d.headers));
    const r = { ...n.facts.validators, ...(o.modified === null ? {} : { modified: o.modified }) };
    return t.etag !== void 0 && r.etag !== void 0
        ? { status: t.etag === r.etag ? "current" : "changed", via: "etag", validators: r }
        : t.modified !== void 0 && r.modified !== void 0
          ? r.modified > t.modified
              ? { status: "changed", via: "modified", changedAt: r.modified, validators: r }
              : { status: "current", via: "modified", validators: r }
          : { status: "unverifiable", validators: r };
}
function z(n, t) {
    return {
        records: (e, i) => Et(new v(n(e, i, "load"), i, t)),
        expand: (e, i, s) => At(new v(n(e.params, s, "expand"), s, t), e, i),
        async probe(e, i) {
            const s = new v(n(e, i, "probe"), i, t),
                o = await s.read(s.plan.mapping.load, s.plan.values, void 0);
            return (
                o.records.length === 0 &&
                    o.status !== 304 &&
                    l(i.report, "E_SOURCE_NOT_FOUND", "the load request found no records", {
                        what: "records",
                        value: s.plan.mapping.load,
                    }),
                { ok: !0 }
            );
        },
        validate: (e, i, s) => Ut(new v(n(e, s, "validate"), s, t), i),
    };
}
function Nt(n, t) {
    const [e] = lt(n);
    return (
        e !== void 0 &&
            l(t.report, "E_SOURCE_PARAM", `the mapping is invalid at ${e.at}`, {
                name: "mapping",
                reason: e.code,
                at: e.at,
            }),
        n
    );
}
const zt = C({ id: F, descriptor: W, ...z((n, t) => ({ mapping: Nt(n.mapping, t), values: _t(n, "mapping") }), !0) }),
    w = "https://openalex.org/",
    Mt = "id,display_name,publication_year,cited_by_count,updated_date,referenced_works";
function S(n, t, e) {
    return {
        path: "/works",
        query: { filter: n, "per-page": t, select: "{select}" },
        batch: { max: 50, join: "|" },
        records: "results",
        entity: "work",
        ...(e ? { paging: { style: "cursor", param: "cursor", first: "*", next: "meta.next_cursor" } } : {}),
    };
}
const _ = { id: "id", stripPrefix: w, fields: { name: "display_name" } },
    m = Object.freeze({
        version: 1,
        endpoint: "https://api.openalex.org",
        load: "citing",
        seed: "by-id",
        expand: { in: "citing", out: "by-id" },
        hydrate: "by-id",
        directed: !0,
        modified: "updated_date",
        auth: { kind: "api-key", query: "api_key" },
        rateLimit: { requests: 10, perMs: 1e3 },
        budgetHeaders: { remaining: "x-ratelimit-remaining", reset: "x-ratelimit-reset" },
        requests: {
            citing: S("cites:{ids}", "200", !0),
            "by-id": S("openalex:{ids}", "50", !1),
            authored: S("authorships.author.id:{ids}", "200", !0),
            "authors-by-id": {
                path: "/authors",
                query: { filter: "openalex:{ids}", "per-page": "50", select: "id,display_name" },
                batch: { max: 50, join: "|" },
                records: "results",
                entity: "author",
            },
        },
        entities: {
            work: {
                id: "id",
                stripPrefix: w,
                fields: {
                    title: "display_name",
                    year: "publication_year",
                    citedBy: "cited_by_count",
                    updated: "updated_date",
                },
                edges: [
                    { to: "referenced_works[]", type: "cites", entity: "work" },
                    { to: "authorships[].author.id", type: "authored_by", entity: "author" },
                    {
                        each: "authorships[]",
                        from: "author.id",
                        to: "institutions[].id",
                        type: "affiliated_with",
                        entity: "institution",
                    },
                    { to: "topics[].id", type: "has_topic", entity: "topic" },
                ],
                embedded: [
                    { at: "authorships[].author", entity: "author" },
                    { at: "authorships[].institutions[]", entity: "institution" },
                    { at: "topics[]", entity: "topic" },
                ],
            },
            author: _,
            institution: _,
            topic: _,
        },
    });
function Tt(n) {
    const t = typeof n == "string" ? n.split(",") : [];
    Array.isArray(n) && t.push(...n);
    const e = new Set(t.map((i) => String(i).trim()).filter((i) => i !== ""));
    return (e.has("institutions") && e.add("authors"), e);
}
function jt(n) {
    const { work: t } = m.entities,
        e = (s) =>
            s === "cites" ||
            (s === "authored_by" && n.has("authors")) ||
            (s === "affiliated_with" && n.has("institutions")) ||
            (s === "has_topic" && n.has("topics")),
        i = (s) => n.has(`${s}s`);
    return {
        ...m,
        entities: {
            ...m.entities,
            work: { ...t, edges: t.edges?.filter((s) => e(s.type)), embedded: t.embedded?.filter((s) => i(s.entity)) },
        },
    };
}
function qt(n, t) {
    const e = n.has("institutions");
    return {
        ...m,
        load: t ? "by-id" : "authored",
        seed: void 0,
        expand: "authored",
        hydrate: "authors-by-id",
        directed: !1,
        entities: {
            ...m.entities,
            work: {
                id: "id",
                stripPrefix: w,
                node: !1,
                edges: [
                    { pairs: "authorships[].author.id", type: "coauthor", entity: "author" },
                    ...(e
                        ? [
                              {
                                  each: "authorships[]",
                                  from: "author.id",
                                  to: "institutions[].id",
                                  type: "affiliated_with",
                                  entity: "institution",
                              },
                          ]
                        : []),
                ],
                embedded: [
                    { at: "authorships[].author", entity: "author" },
                    ...(e ? [{ at: "authorships[].institutions[]", entity: "institution" }] : []),
                ],
            },
        },
    };
}
function j(n, t, e, i) {
    const s = typeof n == "string" ? n.trim().replace(w, "") : "";
    return (
        new RegExp(String.raw`^${e}\d+$`, "i").test(s) ||
            l(i.report, "E_SOURCE_PARAM", `${t} is not an OpenAlex id`, { name: t, reason: "format" }),
        s.toUpperCase()
    );
}
function Ct(n, t, e) {
    const i = n.graph ?? "citation",
        s = Tt(n.include),
        o = n.work !== void 0 && n.work !== "",
        a = n.author !== void 0 && n.author !== "";
    e !== "expand" &&
        o === a &&
        l(t.report, "E_SOURCE_PARAM", "give exactly one of work and author", {
            name: "work",
            reason: o ? "exclusive" : "required",
        });
    let d = "";
    if ((o ? (d = j(n.work, "work", "W", t)) : a && (d = j(n.author, "author", "A", t)), i === "coauthorship"))
        return {
            mapping: qt(s, o),
            values: { ids: d, select: e === "validate" ? "id,updated_date" : "id,updated_date,authorships" },
        };
    let r = Mt + (s.has("authors") ? ",authorships" : "") + (s.has("topics") ? ",topics" : "");
    e === "validate" && (r = "id,updated_date");
    const c = jt(s);
    return { mapping: o ? c : { ...c, load: "authored", seed: void 0 }, values: { ids: d, select: r } };
}
const Lt = /^[WAIT]\d+$/,
    q = z(Ct, !1),
    Bt = C({
        id: G,
        descriptor: V,
        ...q,
        expand(n, t, e) {
            for (const i of n.ids)
                Lt.test(String(i)) ||
                    l(e.report, "E_SOURCE_PARAM", "an expansion seed is not an OpenAlex id", {
                        name: "ids",
                        reason: "format",
                    });
            return q.expand(n, t, e);
        },
    });
export {
    Ft as DEPS_DEV_MAPPING,
    V as OPENALEX_DESCRIPTOR,
    m as OPENALEX_MAPPING,
    W as REST_DESCRIPTOR,
    Vt as STRING_MAPPING,
    lt as checkRestMapping,
    Bt as openalexSource,
    zt as restMappingSource,
};
//# sourceMappingURL=sources-rest-rRhHEGPf.js.map
