const __vite__mapDeps = (
    i,
    m = __vite__mapDeps,
    d = m.f ||
        (m.f = [
            "assets/index-C7VeV3XG.js",
            "assets/index-hDuyXkBS.js",
            "assets/preload-helper-BXl3LOEh.js",
            "assets/index-BeYlTMKJ.css",
        ]),
) => i.map((i) => d[i]);
import { _ as be } from "./preload-helper-BXl3LOEh.js";
import {
    d as Se,
    t as N,
    o as x,
    b as ie,
    I as Z,
    S as K,
    f as p,
    s as Re,
    i as ae,
    u as we,
    w as q,
    P as ee,
    e as Ne,
    C as _e,
    g as Ae,
    h as Oe,
    j as Te,
    k as $e,
    l as Ce,
    m as G,
    n as Ie,
} from "./index-hDuyXkBS.js";
class L {
    constructor(e, n, r) {
        ((this.id = e), (this.labels = n), (this.properties = r));
    }
}
class j {
    constructor(e, n, r, s, o) {
        ((this.id = e), (this.start = n), (this.end = r), (this.type = s), (this.properties = o));
    }
}
const te = BigInt(Number.MAX_SAFE_INTEGER);
function D(t, e, n) {
    let r;
    try {
        r = BigInt(t);
    } catch {
        return Number(t);
    }
    return r <= te && r >= -te
        ? Number(r)
        : n.long === "string"
          ? r.toString()
          : (n.report.warnOnce(
                "precision",
                ee,
                `column ${e}: an integer beyond 2^53 was stored as the nearest 64-bit float; pass long: "string" to keep every digit`,
                void 0,
                `${ee}:${e}`,
            ),
            Number(r));
}
function M(t, e, n, r) {
    const s = Date.parse(Ue(t));
    return Number.isNaN(s)
        ? (q(r.report, "W_SOURCE_VALUE", `column ${n}: a ${e} kept as text`, { type: e, column: n, as: "string" }), t)
        : s;
}
function le(t, e, n) {
    q(n.report, "W_SOURCE_VALUE", `column ${e}: a ${t} value was dropped`, { type: t, column: e, as: "dropped" });
}
function _(t, e) {
    const n = {};
    for (const [r, s] of Object.entries(t)) {
        const o = e(s, r);
        o !== void 0 && (n[r] = o);
    }
    return n;
}
function Pe(t) {
    const e = /^SRID=(\d+);POINT(?: Z)? ?\(([^)]*)\)$/i.exec(t.trim());
    if (e === null) return t;
    const [n = 0, r = 0, s] = e[2].trim().split(/\s+/).map(Number);
    return s === void 0 ? { srid: Number(e[1]), x: n, y: r } : { srid: Number(e[1]), x: n, y: r, z: s };
}
function T(t, e, n) {
    if (t === null || typeof t != "object" || !("$type" in t)) return t ?? null;
    const { $type: r, _value: s } = t;
    switch (r) {
        case "Null":
            return null;
        case "Boolean":
        case "String":
            return s;
        case "Integer":
            return D(String(s), e, n);
        case "Float":
            return Number(s);
        case "Date":
            return M(`${String(s)}T00:00:00Z`, r, e, n);
        case "OffsetDateTime":
        case "ZonedDateTime":
            return M(String(s), r, e, n);
        case "LocalDateTime":
        case "LocalTime":
        case "Time":
        case "Duration":
            return String(s);
        case "Point":
            return Pe(String(s));
        case "Base64":
            le(r, e, n);
            return;
        case "List":
            return s.map((o) => T(o, e, n));
        case "Map":
            return _(s, (o) => T(o, e, n));
        case "Node": {
            const o = s;
            return new L(
                o._element_id,
                o._labels,
                _(o._properties, (i, a) => T(i, a, n)),
            );
        }
        case "Relationship": {
            const o = s;
            return new j(
                o._element_id,
                o._start_node_element_id,
                o._end_node_element_id,
                o._type,
                _(o._properties, (i, a) => T(i, a, n)),
            );
        }
        case "Path":
            return s.map((o) => T(o, e, n));
        default:
            return (
                q(n.report, "W_SOURCE_VALUE", `column ${e}: a ${r} kept as text`, { type: r, column: e, as: "string" }),
                typeof s == "string" ? s : JSON.stringify(s)
            );
    }
}
function Ue(t) {
    const e = t.length - 1;
    if (t[e] !== "]") return t;
    const n = t.indexOf("[", t.lastIndexOf("]", e - 1) + 1);
    return n === -1 || n >= e ? t : t.slice(0, n);
}
function De(t, e, n, r) {
    const s = _(t.properties, (i, a) => $(i, a, n, r)),
        o = t.elementId ?? String(t.identity);
    return e
        ? new L(o, [...(t.labels ?? [])], s)
        : new j(o, t.startNodeElementId ?? String(t.start), t.endNodeElementId ?? String(t.end), t.type ?? "", s);
}
function Me(t) {
    const e = Number(String(t.srid));
    return t.z === void 0 ? { srid: e, x: t.x, y: t.y } : { srid: e, x: t.x, y: t.y, z: t.z };
}
function $(t, e, n, r) {
    if (t == null) return null;
    if (typeof t != "object") return typeof t == "bigint" ? D(t.toString(), e, n) : t;
    const s = () => t.toString();
    if (r.isInt(t)) return D(s(), e, n);
    if (r.isNode(t) || r.isRelationship(t)) return De(t, r.isNode(t), n, r);
    if (r.isPath(t)) {
        const o = t;
        return [o.start, ...o.segments.flatMap((i) => [i.relationship, i.end])].map((i) => $(i, e, n, r));
    }
    if (r.isDate(t)) return M(`${s()}T00:00:00Z`, "Date", e, n);
    if (r.isDateTime(t)) return M(s(), "DateTime", e, n);
    if (r.isLocalDateTime(t) || r.isLocalTime(t) || r.isTime(t) || r.isDuration(t)) return s();
    if (r.isPoint(t)) return Me(t);
    if (t instanceof Uint8Array || t instanceof ArrayBuffer) {
        le("ByteArray", e, n);
        return;
    }
    return Array.isArray(t) ? t.map((o) => $(o, e, n, r)) : _(t, (o) => $(o, e, n, r));
}
function P(t, e, n) {
    if (typeof t == "number" && Number.isInteger(t) && !Number.isSafeInteger(t)) return D(BigInt(t).toString(), e, n);
    if (t === null || typeof t != "object") return t ?? null;
    if (Array.isArray(t)) return t.map((o) => P(o, e, n));
    const r = t,
        s = () => _(r["~properties"] ?? {}, (o, i) => P(o, i, n));
    switch (r["~entityType"]) {
        case "node":
            return new L(String(r["~id"]), r["~labels"] ?? [], s());
        case "relationship":
            return new j(String(r["~id"]), String(r["~start"]), String(r["~end"]), String(r["~type"]), s());
        default:
            return _(r, (o) => P(o, e, n));
    }
}
const ke = "labels",
    ve = "type",
    xe = { name: ke, dtype: "list", itemDtype: "dict", nullable: !0, role: "labels" },
    Le = { name: ve, dtype: "dict", nullable: !0, role: "kind" },
    je = { name: "id", dtype: "string", nullable: !0, role: "id" };
class ne {
    constructor() {
        ((this.nodes = new Map()), (this.rels = new Map()), (this.degrees = new Map()));
    }
    add(e, n) {
        const r = n ? e.fields.indexOf("key") : -1,
            s = n ? e.fields.indexOf("degree") : -1,
            o = n ? e.fields.indexOf("degrees") : -1;
        for (const i of e.rows)
            (i.forEach((a, l) => {
                if (l === o && Array.isArray(a))
                    for (const u of a)
                        Array.isArray(u) && typeof u[1] == "number" && this.degrees.set(String(u[0]), u[1]);
                else l !== r && l !== s && this.visit(a);
            }),
                r >= 0 && s >= 0 && typeof i[s] == "number" && this.degrees.set(String(i[r]), i[s]));
    }
    visit(e) {
        e instanceof L
            ? this.nodes.set(e.id, e)
            : e instanceof j
              ? this.rels.set(e.id, e)
              : Array.isArray(e)
                ? e.forEach((n) => {
                      this.visit(n);
                  })
                : e !== null &&
                  typeof e == "object" &&
                  Object.values(e).forEach((n) => {
                      this.visit(n);
                  });
    }
    get empty() {
        return this.nodes.size === 0 && this.rels.size === 0;
    }
}
function He(t, e, n) {
    t.rows.length > 0 &&
        e.empty &&
        p(n, "E_SOURCE_NOT_A_GRAPH", "the query returned no node, relationship or path", { columns: t.fields });
}
function ce(t, e) {
    const n = e === null ? void 0 : t.properties[e];
    return typeof n == "string" || typeof n == "number" ? n : t.id;
}
function F(t, e, n) {
    const r = n === "node" ? t.nodeColumn(e.name) : t.edgeColumn(e.name);
    return r !== G ? r : n === "node" ? t.declareNodeColumn(e) : t.declareEdgeColumn(e);
}
function ue(t, e, n, r, s) {
    e.edgeCount === 0 && !e.directedLocked && !e.directed && e.setDirected(!0);
    const o = We(t, e, n, r, s);
    Fe(t, e, o, r, s, t.nodes.size);
}
function We(t, e, n, r, s) {
    const o = new Map();
    let i = 0;
    for (const a of t.nodes.values()) {
        i++ % 64 === 0 && N(s);
        const l = ce(a, n);
        o.set(a.id, l);
        const u = t.degrees.get(String(n === null ? a.id : l));
        try {
            const c = e.indexOf(l) === G,
                d = e.addNodeRecord(l, u === void 0 ? a.properties : { ...a.properties, [Ie]: u });
            (e.setNodeValue(F(e, xe, "node"), d, a.labels), c && r.counts.nodes++);
        } catch (c) {
            (r.recordError(c, { element: String(l) }), r.counts.skippedNodes++);
        }
    }
    return o;
}
function Fe(t, e, n, r, s, o) {
    let i = o;
    for (const a of t.rels.values()) {
        i++ % 64 === 0 && N(s);
        const l = n.get(a.start) ?? a.start,
            u = n.get(a.end) ?? a.end;
        try {
            for (const d of [l, u]) e.indexOf(d) === G && (e.addNode(d), r.counts.nodes++);
            const c = e.addEdgeRecord(l, u, a.properties, null);
            (e.setEdgeValue(F(e, Le, "edge"), c, a.type), e.setEdgeValue(F(e, je, "edge"), c, a.id), r.counts.edges++);
        } catch (c) {
            (r.recordError(c, { element: `${String(l)} -> ${String(u)}` }), r.counts.skippedEdges++);
        }
    }
}
function z(t, e) {
    return t === e ? 0 : t < e ? -1 : 1;
}
function Be(t, e) {
    return `${JSON.stringify(t)}:${k(e)}`;
}
function k(t) {
    return Array.isArray(t)
        ? `[${t.map(k).join(",")}]`
        : t !== null && typeof t == "object"
          ? `{${Object.entries(t)
                .sort(([r], [s]) => z(r, s))
                .map(([r, s]) => Be(r, s))
                .join(",")}}`
          : (JSON.stringify(t) ?? "null");
}
function re(t, e) {
    const n = new Map(),
        r = [];
    for (const s of t.nodes.values()) {
        const o = ce(s, e);
        (n.set(s.id, o), r.push(k(["n", o, [...s.labels].sort(z), s.properties])));
    }
    for (const s of t.rels.values())
        r.push(k(["r", s.id, n.get(s.start) ?? s.start, n.get(s.end) ?? s.end, s.type, s.properties]));
    return r;
}
function v(t, e = "Neo4j") {
    const n = t === null ? Number.NaN : Number.parseInt(t, 10);
    return { name: "neo4j", elementIds: Number.isNaN(n) || n >= 5, product: e, version: t, readOnly: "enforced" };
}
function qe(t) {
    const [e = "", n = ""] = t.split("/");
    return e.toLowerCase() === "neo4j"
        ? v(n === "" ? null : n)
        : { name: "neo4j", elementIds: !1, product: e, version: n === "" ? null : n, readOnly: "enforced" };
}
function C(t = null) {
    return { name: "neptune", elementIds: !1, product: "Neptune", version: t, readOnly: "not-enforced" };
}
function de(t) {
    return {
        product: t.product,
        profile: t.name,
        readOnly: t.readOnly,
        ...(t.version === null ? {} : { version: t.version }),
    };
}
const pe = 10,
    Ge = 1e5,
    ze = 1e3;
function fe(t) {
    return typeof t != "string" || t === "" || t.includes("\0") ? "identifier" : null;
}
function Je(t) {
    return (
        fe(t) !== null &&
            Ne("E_SOURCE_PARAM", "a Cypher identifier must be a non-empty string without NUL", {
                name: "identifier",
                reason: "identifier",
            }),
        `\`${t.replaceAll("`", "``")}\``
    );
}
function U(t, e, n) {
    return (
        fe(t) !== null &&
            p(n, "E_SOURCE_PARAM", `parameter ${e}: not a Cypher identifier`, { name: e, reason: "identifier" }),
        Je(t)
    );
}
function w(t, e, n, r, s) {
    return (
        (typeof t != "number" || !Number.isInteger(t)) &&
            p(s, "E_SOURCE_PARAM", `parameter ${e}: not an integer`, { name: e, reason: "type" }),
        (t < n || t > r) &&
            p(s, "E_SOURCE_PARAM", `parameter ${e}: outside ${String(n)} to ${String(r)}`, {
                name: e,
                reason: "range",
            }),
        String(t)
    );
}
function A(t, e, n, r = !0) {
    return r && n.idProperty !== null ? `${t}.${n.idProperty}` : e.elementIds ? `elementId(${t})` : `id(${t})`;
}
function b(t, e) {
    const n = [];
    if (e.labels.length > 0) {
        const r = `${t}:`;
        n.push(`(${e.labels.map((s) => r + s).join(" OR ")})`);
    }
    return (
        e.idProperty !== null && n.push(`${t}.${e.idProperty} IS NOT NULL`),
        n.length === 0 ? null : n.join(" AND ")
    );
}
function H(t) {
    return t.relationshipTypes.length === 0 ? "" : `:${t.relationshipTypes.join("|")}`;
}
function he(t) {
    return `size([(${t})--() | 1])`;
}
const Ve = { out: ["-", "->"], in: ["<-", "-"], both: ["-", "-"] };
function se(t, e, n, r, s) {
    const o = b("n", e);
    return [
        "MATCH (n)",
        o === null ? null : `WHERE ${o}`,
        `WITH n, ${A("n", t, e)} AS key`,
        r ? "WHERE key > $after" : null,
        s ? `RETURN n, key, ${he("n")} AS degree` : "RETURN n, key",
        `ORDER BY key LIMIT ${n}`,
    ]
        .filter((i) => i !== null)
        .join(" ");
}
function Ye(t, e, n, r) {
    const s = b("a", e),
        o = b("b", e),
        i = [s, o].filter((a) => a !== null);
    return [
        `MATCH (a)-[r${H(e)}]->(b)`,
        i.length === 0 ? null : `WHERE ${i.join(" AND ")}`,
        `WITH a, r, b, ${A("r", t, e, !1)} AS key`,
        r ? "WHERE key > $after" : null,
        "RETURN a, r, b, key",
        `ORDER BY key LIMIT ${n}`,
    ]
        .filter((a) => a !== null)
        .join(" ");
}
function Xe(t, e, n) {
    const r = [b("a", e), b("b", e)].filter((s) => s !== null);
    return [
        `MATCH (a)-[r${H(e)}]->(b)`,
        r.length === 0 ? null : `WHERE ${r.join(" AND ")}`,
        `WITH a, r, b, ${A("a", t, e)} AS ka, ${A("b", t, e)} AS kb`,
        `WHERE ka <= $last AND kb <= $last${n ? " AND (ka > $after OR kb > $after)" : ""}`,
        "RETURN a, r, b",
    ]
        .filter((s) => s !== null)
        .join(" ");
}
function ye(t, e, n, r) {
    const s = `[${H(e)}*1..${n.depth}]`,
        [o, i] = Ve[n.direction],
        a = `${o}${s}${i}`,
        l = b("x", e),
        u = r
            ? `, [m IN CASE WHEN p IS NULL THEN [s] ELSE nodes(p) END | [${A("m", t, e)}, ${he("m")}]] AS degrees`
            : "",
        c = [`MATCH (s) WHERE ${A("s", t, e)} IN $ids`, `OPTIONAL MATCH p = (s)${a}(x)${B(l)}`];
    return n.limit === null
        ? [...c, "WITH s, p", `RETURN s, p${u}`].join(" ")
        : [
              ...c,
              `WITH s, p, ${A("x", t, e)} AS key`,
              n.after === !0 ? "WHERE key > $after" : null,
              `WITH s, p, key ORDER BY key LIMIT ${n.limit}`,
              `RETURN s, p, key${u}`,
          ]
              .filter((d) => d !== null)
              .join(" ");
}
function B(t) {
    return t === null ? "" : ` WHERE ${t}`;
}
function Qe(t) {
    const e = b("n", t),
        n = [b("a", t), b("b", t)].filter((r) => r !== null);
    return [
        `MATCH (n)${B(e)} RETURN count(n) AS c`,
        `MATCH (a)-[r${H(t)}]->(b)${B(n.length === 0 ? null : n.join(" AND "))} RETURN count(r) AS c`,
    ];
}
function Ze(t) {
    return `MATCH (${t === void 0 ? "n" : `n:${t}`}) RETURN count(n) AS c`;
}
const Ke = 500;
function J(t, e, n, r) {
    const s = e.code ?? "";
    if (/Security\.Unauthorized|AuthenticationRateLimit|UnauthorizedException/i.test(s))
        return p(t, "E_SOURCE_AUTH", `${n} refused the login`, {
            origin: n,
            status: e.status,
            scheme: null,
            serverCode: e.code,
        });
    if (/Security\.Forbidden|AccessMode|AccessDenied/i.test(s))
        return p(t, "E_SOURCE_FORBIDDEN", `${n} refused the statement`, { status: e.status, serverCode: e.code });
    if (/TimedOut|Timeout|TimeLimitExceeded/i.test(s))
        return p(t, "E_SOURCE_TIMEOUT", `${n} timed the statement out`, { timeoutMs: null, serverSide: !0 });
    if (/DatabaseNotFound/i.test(s))
        return p(t, "E_SOURCE_NOT_FOUND", `${n} has no database ${String(r)}`, { what: "database", value: r ?? null });
    const o = /line (\d+), column (\d+)/i.exec(e.message);
    return p(t, "E_SOURCE_QUERY", `${n} refused the query: ${s}`, {
        serverCode: e.code,
        line: o === null ? null : Number(o[1]),
        column: o === null ? null : Number(o[2]),
        serverMessage: e.showable && e.message !== "" ? e.message.slice(0, Ke) : null,
    });
}
function V(t) {
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
}
function et(t, e) {
    const n = [...new Set(t.flatMap((r) => Object.keys(r)))];
    return { fields: n, rows: t.map((r) => n.map((s) => e(r[s], s))) };
}
const oe = "neo4j-driver",
    tt = new Set(["bolt:", "bolt+s:", "bolt+ssc:"]);
async function nt(t) {
    let e;
    try {
        e = await be(() => import("./index-C7VeV3XG.js").then((n) => n.i), __vite__mapDeps([0, 1, 2, 3]));
    } catch {
        return p(t.ctx.report, "E_SOURCE_RUNTIME", `the bolt transport needs ${oe} installed`, {
            runtime: t.ctx.runtime,
            reason: "needs-peer-dependency",
            package: oe,
        });
    }
    return e.default ?? e;
}
function rt(t, e) {
    const n = globalThis.location;
    t.runtime === "browser" &&
        n?.protocol === "https:" &&
        e.protocol === "bolt:" &&
        !ae(e.hostname) &&
        p(t.report, "E_SOURCE_RUNTIME", "an https page cannot open a plain Bolt WebSocket", {
            runtime: t.runtime,
            reason: "insecure-endpoint",
        });
}
async function st(t, e) {
    const { ctx: n } = t,
        { report: r } = n,
        s = (d, f) => p(r, "E_SOURCE_PARAM", f, { name: "endpoint", reason: d }),
        o = n.endpoint ?? s("missing", "the bolt transport needs an endpoint");
    (tt.has(o.protocol) ||
        s(o.protocol.startsWith("neo4j") ? "routing" : "scheme", `${o.protocol} is not a direct Bolt scheme`),
        rt(n, o));
    const { credential: i, allowInsecure: a } = ie(n),
        l = x(o);
    if (!(i !== void 0 && (i.origins.length === 0 || i.origins.includes(l))) || i === void 0)
        return { url: o, auth: void 0 };
    (o.protocol === "bolt+ssc:" &&
        s("unverified-tls", "bolt+ssc accepts any certificate, so no credential is sent over it"),
        o.protocol === "bolt:" &&
            !ae(o.hostname) &&
            a !== !0 &&
            s("insecure-endpoint", "a credential is never sent without TLS"));
    const c = we(i);
    if (c !== void 0 && "username" in c) return { url: o, auth: e.auth.basic(c.username, c.password) };
    if (c !== void 0 && "token" in c) {
        const d = typeof c.token == "string" ? c.token : await c.token();
        return { url: o, auth: e.auth.bearer(d) };
    }
    return p(r, "E_SOURCE_PARAM", "the bolt transport takes a basic or bearer credential", {
        name: "credential",
        reason: "kind",
    });
}
async function ot(t) {
    const { ctx: e, params: n, m: r } = t;
    N(e.signal);
    const s = await nt(t),
        { url: o, auth: i } = await st(t, s);
    N(e.signal);
    const a = x(o),
        { userAgent: l } = ie(e),
        u = s.driver(`${o.protocol}//${o.host}`, i, l === void 0 ? {} : { userAgent: l }),
        c = u.session({
            defaultAccessMode: s.session.READ,
            ...(n.database === void 0 ? {} : { database: n.database }),
        });
    let d = null;
    const f = () => (
            (d ??= c
                .close()
                .catch(() => {})
                .then(() => u.close())
                .catch(() => {})),
            d
        ),
        E = () => {
            f();
        };
    e.signal.addEventListener("abort", E, { once: !0 });
    const S = (y) => {
        N(e.signal);
        const O = y,
            R = typeof O.code == "string" ? O.code : null;
        return R === null || R === "ServiceUnavailable" || R === "SessionExpired"
            ? e.runtime === "browser"
                ? p(e.report, "E_SOURCE_BLOCKED", `${a} could not be reached over Bolt`, { url: a, cause: "unknown" })
                : p(e.report, "E_FETCH", `${a} could not be reached over Bolt`, { url: a, status: null })
            : J(
                  e.report,
                  {
                      code: R,
                      message: typeof O.message == "string" ? O.message : "",
                      status: null,
                      showable: R.startsWith("Neo.ClientError."),
                  },
                  a,
                  n.database,
              );
    };
    let h = null;
    const m = async () => {
            if (h === null) {
                const y = await u.getServerInfo().catch(S);
                h = qe(y.agent ?? "");
            }
            return h;
        },
        g = e.limits.timeoutMs;
    return {
        async run(y, O) {
            N(e.signal);
            const R = await c.run(y, O, g === void 0 ? void 0 : { timeout: g }).catch(S),
                X = (R.records[0]?.keys ?? []).map(String);
            return { fields: X, rows: R.records.map((ge) => X.map((Q) => $(ge.get(Q), Q, r, s))) };
        },
        profile: m,
        probe: m,
        close: async () => {
            (e.signal.removeEventListener("abort", E), await f());
        },
    };
}
function me(t, e) {
    (t.runtime === "browser" || t.runtime === "worker") &&
        p(t.report, "E_SOURCE_RUNTIME", `the ${e} transport cannot run in a browser`, {
            runtime: t.runtime,
            reason: "cors",
        });
}
function it(t) {
    for (let e = t.lastIndexOf("{"); e > 0; e = t.lastIndexOf("{", e - 1)) {
        const n = V(t.slice(e));
        if (n !== null && typeof n.code == "string") return n;
    }
    return null;
}
async function Ee(t, e) {
    const { ctx: n, m: r } = t,
        s = n.endpoint === null ? "" : x(n.endpoint),
        o = await e.text(),
        i = V(o);
    let a = typeof i?.code == "string" ? i : null;
    return (
        i === null && (a = it(o)),
        a !== null &&
            J(
                n.report,
                {
                    code: a.code ?? null,
                    message: a.detailedMessage ?? a.message ?? "",
                    status: e.status,
                    showable: i !== null && e.status >= 400 && e.status < 500,
                },
                s,
                void 0,
            ),
        e.ok || p(n.report, "E_FETCH", `${s} answered ${String(e.status)}`, { url: s, status: e.status }),
        (i === null || !Array.isArray(i.results)) &&
            p(n.report, "E_SOURCE_RESPONSE", "the Neptune answer has no results", {
                expected: "json",
                contentType: e.headers.get("content-type"),
            }),
        et(i.results, (l, u) => P(l, u, r))
    );
}
function at(t) {
    const { ctx: e } = t;
    return (
        me(e, "neptune-https"),
        {
            async run(n, r) {
                const s = await e.fetch("openCypher", {
                    method: "POST",
                    idempotent: !0,
                    allowStatus: [400, 500],
                    body: new URLSearchParams({ query: n, parameters: JSON.stringify(r) }),
                });
                return Ee(t, s);
            },
            profile: () => Promise.resolve(C()),
            probe: async () => {
                const n = await e.fetchJson("status");
                return C(typeof n.dbEngineVersion == "string" ? n.dbEngineVersion : null);
            },
            close: () => Promise.resolve(),
        }
    );
}
function lt(t) {
    const { ctx: e } = t;
    me(e, "neptune-analytics");
    const n = async (r, s) => {
        const o = await e.fetch("queries", {
            method: "POST",
            idempotent: !0,
            allowStatus: [400, 500],
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: r, language: "OPEN_CYPHER", parameters: s }),
        });
        return Ee(t, o);
    };
    return {
        run: n,
        profile: () => Promise.resolve(C()),
        probe: async () => (await n("RETURN 1 AS ok", {}), C()),
        close: () => Promise.resolve(),
    };
}
const ct = "application/vnd.neo4j.query.v1.1",
    ut = [400, 404, 500];
function dt(t) {
    const { ctx: e, params: n, m: r } = t,
        s = n.database ?? "neo4j",
        o = `db/${encodeURIComponent(s)}/query/v2`,
        i = e.endpoint === null ? "" : x(e.endpoint),
        a = async (l, u) => {
            const c = await e.fetch(o, {
                    method: "POST",
                    idempotent: !0,
                    allowStatus: ut,
                    headers: { "Content-Type": "application/json", Accept: ct },
                    body: JSON.stringify({ statement: l, parameters: u, accessMode: "Read" }),
                }),
                d = V(await c.text()),
                f = d?.errors?.[0];
            (f !== void 0 &&
                J(
                    e.report,
                    {
                        code: f.code ?? null,
                        message: f.message ?? "",
                        status: c.status,
                        showable: c.status >= 400 && c.status < 500,
                    },
                    i,
                    n.database,
                ),
                c.status === 404 &&
                    p(e.report, "E_SOURCE_NOT_FOUND", `${i} has no Query API at ${o}`, {
                        what: "url",
                        value: `${i}/${o}`,
                    }),
                c.ok ||
                    p(e.report, "E_FETCH", `${i} answered ${String(c.status)}`, { url: `${i}/${o}`, status: c.status }),
                d?.data === void 0 &&
                    p(e.report, "E_SOURCE_RESPONSE", "the Query API answer has no data", {
                        expected: "json",
                        contentType: c.headers.get("content-type"),
                    }));
            const { fields: E, values: S } = d.data;
            return { fields: E, rows: S.map((h) => h.map((m, g) => T(m, E[g] ?? "", r))) };
        };
    return {
        run: a,
        profile: () => Promise.resolve(v(null)),
        probe: async () => {
            const l = await a(
                    "CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition",
                    {},
                ),
                c = (l.rows.find((f) => f[0] === "Neo4j Kernel") ?? l.rows[0])?.[1],
                d = Array.isArray(c) && typeof c[0] == "string" ? c[0] : null;
            return v(d);
        },
        close: () => Promise.resolve(),
    };
}
const pt = new Set(["out", "in", "both"]);
function W(t, e, n) {
    return t == null
        ? []
        : Array.isArray(t)
          ? t
          : typeof t == "string" || typeof t == "number"
            ? [t]
            : p(n, "E_SOURCE_PARAM", `parameter ${e}: not a list`, { name: e, reason: "type" });
}
function ft(t, e, n) {
    if (t.transport !== void 0) return t.transport;
    const r = e.endpoint?.protocol ?? "";
    return r.startsWith("bolt") || r.startsWith("neo4j")
        ? "bolt"
        : e.endpoint?.hostname.endsWith(".neptune-graph.amazonaws.com") === !0
          ? "neptune-analytics"
          : n.transport;
}
class ht {
    constructor(e, n, r) {
        ((this.transport = e), (this.params = n), (this.ctx = r), (this.known = null), (this.degree = !0));
        const { report: s } = r;
        ((this.idProperty = n.idProperty ?? null),
            (this.filters = {
                labels: W(n.labels, "labels", s).map((o) => U(o, "labels", s)),
                relationshipTypes: W(n.relationshipTypes, "relationshipTypes", s).map((o) =>
                    U(o, "relationshipTypes", s),
                ),
                idProperty: this.idProperty === null ? null : U(this.idProperty, "idProperty", s),
            }));
    }
    async profile() {
        if (this.known === null) {
            const e = await this.transport.profile();
            ((this.known = e),
                this.params.profile === "neptune"
                    ? (this.known = C(e.version))
                    : this.params.profile === "neo4j" && e.name !== "neo4j" && (this.known = v(e.version)));
        }
        return this.known;
    }
    async generated(e, n) {
        let r;
        try {
            r = await this.transport.run(e(this.degree), n);
        } catch (o) {
            if (!this.degree || !(o instanceof Z) || o.issue?.code !== K.E_SOURCE_QUERY) throw o;
            ((this.degree = !1), (r = await this.transport.run(e(!1), n)));
        }
        const s = new ne();
        return (s.add(r, !0), { collected: s, rows: r.rows, fields: r.fields });
    }
    async *pages(e, n = !0) {
        const { params: r, ctx: s } = this,
            { report: o } = s,
            i = r.mode ?? (typeof r.query == "string" && r.query !== "" ? "query" : "all");
        if (i === "query") {
            ((typeof r.query != "string" || r.query.trim() === "") &&
                p(o, "E_SOURCE_PARAM", "mode query needs a query", { name: "query", reason: "required" }),
                yield await this.userQuery(r.query, e));
            return;
        }
        const a = await this.profile();
        if (i === "neighborhood") {
            const l = W(r.ids, "ids", o);
            l.length === 0 &&
                p(o, "E_SOURCE_PARAM", "mode neighborhood needs ids", { name: "ids", reason: "required" });
            const u = {
                    depth: w(r.depth ?? 1, "depth", 1, pe, o),
                    direction: "both",
                    limit:
                        s.limits.maxNodes === void 0
                            ? null
                            : w(s.limits.maxNodes, "maxNodes", 1, Number.MAX_SAFE_INTEGER, o),
                },
                { collected: c } = await this.generated((d) => ye(a, this.filters, u, d), { ids: l });
            yield { collected: c, next: null };
            return;
        }
        yield* this.everything(a, e, n);
    }
    async userQuery(e, n) {
        const { params: r, ctx: s } = this,
            o = r.parameters ?? {},
            i = n?.rows ?? s.limits.maxNodes,
            a = i == null ? null : Number(w(i, "maxNodes", 1, Number.MAX_SAFE_INTEGER, s.report));
        let l,
            u = a !== null;
        try {
            l = await this.transport.run(
                a === null
                    ? e
                    : `CALL {
${e.trim().replace(/;+$/, "")}
}
RETURN * LIMIT ${String(a)}`,
                o,
            );
        } catch (f) {
            if (!u || !(f instanceof Z) || f.issue?.code !== K.E_SOURCE_QUERY) throw f;
            ((u = !1), (l = await this.transport.run(e, o)));
        }
        const c = new ne();
        (c.add(l, !1), He(l, c, s.report));
        const d = u && a !== null && l.rows.length >= a;
        return { collected: c, next: d ? { rows: a * 2 } : null };
    }
    async *everything(e, n, r) {
        const { params: s, ctx: o } = this,
            i = w(s.pageSize ?? ze, "pageSize", 1, Ge, o.report);
        n === null && r && (this.counted = await this.count(e));
        const a = o.limits.maxNodes;
        if (a !== void 0 && n?.phase !== "edges") {
            const f = Number(w(a, "maxNodes", 1, Number.MAX_SAFE_INTEGER, o.report));
            yield* this.cappedNodes(e, n, Math.min(Number(i), f));
            return;
        }
        let l = n?.phase === "edges" ? "edges" : "nodes",
            u = n?.after ?? null;
        const { counted: c } = this,
            d = s.countFirst === !0 && c !== void 0 ? (c.nodes ?? 0) + (c.edges ?? 0) : void 0;
        for (;;) {
            const f = l === "nodes",
                {
                    collected: E,
                    rows: S,
                    fields: h,
                } = await this.generated(
                    (y) => (f ? se(e, this.filters, i, u !== null, y) : Ye(e, this.filters, i, u !== null)),
                    u === null ? {} : { after: u },
                ),
                m = yt(l, S, h, Number(i));
            yield { collected: E, next: m };
            const { counts: g } = o.report;
            if ((o.progress(g.nodes + g.edges, d, "items"), m === null)) return;
            ((l = m.phase === "edges" ? "edges" : "nodes"), (u = m.after ?? null));
        }
    }
    async *cappedNodes(e, n, r) {
        let s = n?.after ?? null;
        for (;;) {
            const {
                    collected: o,
                    rows: i,
                    fields: a,
                } = await this.generated(
                    (d) => se(e, this.filters, String(r), s !== null, d),
                    s === null ? {} : { after: s },
                ),
                l = i.at(-1)?.[a.indexOf("key")],
                u = typeof l == "string" || typeof l == "number" ? l : null;
            if (u !== null) {
                const d = await this.transport.run(Xe(e, this.filters, s !== null), {
                    last: u,
                    ...(s === null ? {} : { after: s }),
                });
                o.add(d, !1);
            }
            const c = i.length >= r && u !== null ? { phase: "nodes", after: u } : null;
            if ((yield { collected: o, next: c }, c === null)) return;
            s = u;
        }
    }
    async count(e) {
        const n = async (i) => {
                const a = Number((await this.transport.run(i, {})).rows[0]?.[0]);
                return Number.isSafeInteger(a) && a >= 0 ? a : void 0;
            },
            { labels: r, idProperty: s } = this.filters;
        if (this.params.countFirst === !0) {
            const [i, a] = Qe(this.filters),
                [l, u] = await Promise.all([n(i), n(a)]);
            return { ...(l === void 0 ? {} : { nodes: l }), ...(u === void 0 ? {} : { edges: u }) };
        }
        if (e.name !== "neo4j" || r.length > 1 || s !== null) return;
        const o = await n(Ze(r[0]));
        return o === void 0 ? void 0 : { nodes: o };
    }
    async facts(e) {
        const n = await this.profile(),
            r = await Re(
                [...e].sort(z).join(`
`),
            );
        return {
            server: de(n),
            validators: n.version === null ? { contentHash: r } : { contentHash: r, serverVersion: n.version },
        };
    }
}
function yt(t, e, n, r) {
    const s = e.at(-1)?.[n.indexOf("key")],
        o = typeof s == "string" || typeof s == "number" ? s : null;
    return e.length >= r && o !== null
        ? { phase: t, after: o }
        : t === "nodes"
          ? { phase: "edges", after: null }
          : null;
}
async function mt(t, e, n) {
    N(e.signal);
    const r = { ctx: e, params: t, m: { long: t.long ?? "f64", report: e.report } },
        s = ft(t, e, n);
    let o;
    switch (s) {
        case "bolt":
            o = await ot(r);
            break;
        case "neptune-https":
            o = at(r);
            break;
        case "neptune-analytics":
            o = lt(r);
            break;
        default:
            o = dt(r);
            break;
    }
    try {
        return new ht(o, t, e);
    } catch (i) {
        throw (await o.close(), i);
    }
}
async function I(t, e, n, r) {
    const s = await mt(t, e, n);
    try {
        return await r(s);
    } finally {
        await s.transport.close();
    }
}
function Y(t) {
    return Se({
        id: t.id,
        descriptor: t.descriptor,
        import: (e, n, r) =>
            I(e, r, t, async (s) => {
                const o = [];
                let i = null;
                for await (const l of s.pages(r.cursor))
                    if (
                        (ue(l.collected, n, s.idProperty, r.report, r.signal),
                        o.push(...re(l.collected, s.idProperty)),
                        ({ next: i } = l),
                        i !== null && r.limits.reached())
                    )
                        break;
                const a = s.counted === void 0 ? {} : { total: s.counted };
                return r.finish({ next: i, ...a, ...(await s.facts(o)) });
            }),
        expand: (e, n, r) => I(e.params, r, t, (s) => Et(s, e, n)),
        probe: (e, n) =>
            I(e, n, t, async (r) => {
                const s = await r.transport.probe();
                return { ok: !0, server: de(s) };
            }),
        validate: (e, n, r) =>
            I(e, r, t, async (s) => {
                const o = [];
                for await (const l of s.pages(null, !1)) o.push(...re(l.collected, s.idProperty));
                const { validators: i } = await s.facts(o);
                let a = "unverifiable";
                return (
                    n.contentHash !== void 0 && (a = n.contentHash === i.contentHash ? "current" : "changed"),
                    { status: a, via: "hash", validators: i }
                );
            }),
    });
}
async function Et(t, e, n) {
    const { ctx: r } = t,
        { report: s } = r;
    e.ids.length === 0 && p(s, "E_SOURCE_PARAM", "an expansion needs seed ids", { name: "ids", reason: "required" });
    const o = e.direction ?? "both";
    pt.has(o) || p(s, "E_SOURCE_PARAM", "direction must be out, in or both", { name: "direction", reason: "enum" });
    const i = e.limit ?? r.limits.maxNodes,
        a = r.cursor?.after ?? null,
        l = {
            depth: w(e.depth ?? 1, "depth", 1, pe, s),
            direction: o,
            limit: i === void 0 ? null : w(i, "limit", 1, Number.MAX_SAFE_INTEGER, s),
            after: a !== null,
        },
        u =
            e.relationshipTypes === void 0
                ? t.filters
                : { ...t.filters, relationshipTypes: e.relationshipTypes.map((y) => U(y, "relationshipTypes", s)) },
        c = await t.profile(),
        {
            collected: d,
            rows: f,
            fields: E,
        } = await t.generated((y) => ye(c, u, l, y), { ids: e.ids, ...(a === null ? {} : { after: a }) });
    ue(d, n, t.idProperty, s, r.signal);
    const { server: S } = await t.facts([]),
        h = f.at(-1)?.[E.indexOf("key")],
        g =
            l.limit !== null && f.length >= Number(l.limit) && (typeof h == "string" || typeof h == "number")
                ? { after: h }
                : null;
    return r.finish({ server: S, next: g });
}
const St = Y({ id: Ae, descriptor: _e, transport: "query-api" }),
    Rt = Y({ id: Te, descriptor: Oe, transport: "query-api" }),
    wt = Y({ id: Ce, descriptor: $e, transport: "neptune-https" });
export {
    _e as CYPHER_DESCRIPTOR,
    Oe as NEO4J_DESCRIPTOR,
    $e as NEPTUNE_DESCRIPTOR,
    Je as cypherIdentifier,
    St as cypherSource,
    Rt as neo4jSource,
    wt as neptuneSource,
};
//# sourceMappingURL=sources-cypher-CoNJcwa8.js.map
