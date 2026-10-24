import { d as g, N as v, a as w, f as s, c as _ } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
const O = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    C = "accesskey",
    b = [401, 403, 404];
function y(e) {
    e.endpoint?.searchParams.has(C) === !0 &&
        s(e.report, "E_SOURCE_PARAM", "an access key goes in a credential, never in the endpoint", {
            name: "endpoint",
            reason: "credentials-in-url",
        });
}
function p(e, t) {
    y(t);
    const n = String(e);
    return (
        /accesskey/i.test(n) &&
            s(t.report, "E_SOURCE_PARAM", "an access key goes in a credential, never in the uuid", {
                name: "uuid",
                reason: "credentials-in-url",
            }),
        O.test(n) ||
            s(t.report, "E_SOURCE_PARAM", "the uuid is not a network UUID", { name: "uuid", reason: "format" }),
        n.toLowerCase()
    );
}
async function l(e, t, n, o = {}) {
    const i = await e.fetch(t, { ...o, allowStatus: b });
    if (i.ok) return i;
    const r = new URL(t, e.endpoint ?? void 0),
        a = await R(i),
        { status: d } = i;
    return (
        d === 401 &&
            s(e.report, "E_SOURCE_AUTH", `NDEx answered ${String(d)}`, {
                origin: r.origin,
                status: d,
                scheme: i.headers.get("www-authenticate")?.split(/\s/)[0] ?? null,
                serverCode: a,
            }),
        d === 403 && s(e.report, "E_SOURCE_FORBIDDEN", "NDEx answered 403", { status: d, serverCode: a }),
        s(e.report, "E_SOURCE_NOT_FOUND", "NDEx has no such network", {
            what: n === null ? "url" : "network",
            value: n ?? `${r.origin}${r.pathname}`,
        })
    );
}
async function R(e) {
    try {
        const t = await e.json();
        return typeof t.errorCode == "string" ? t.errorCode.slice(0, 100) : null;
    } catch {
        return null;
    }
}
const A = 10;
function N(e) {
    return `"${e.replaceAll(/["\\]/g, String.raw`\$&`)}"`;
}
function U(e, t) {
    const { ids: n } = e,
        { idAttribute: o } = e.params,
        i = e.depth ?? 1;
    ((!Number.isInteger(i) || i < 1 || i > A) &&
        s(t.report, "E_SOURCE_PARAM", "depth is an integer from 1 to 10", { name: "depth", reason: "range" }),
        n.length === 0 &&
            s(t.report, "E_SOURCE_PARAM", "an expansion needs at least one id", { name: "ids", reason: "required" }));
    const r = e.limit === void 0 ? {} : { edgeLimit: e.limit, errorWhenLimitIsOver: !1 };
    if (o !== void 0)
        return (
            /^[A-Za-z_][\w.]*$/.test(o) ||
                s(t.report, "E_SOURCE_PARAM", "idAttribute is not an attribute name", {
                    name: "idAttribute",
                    reason: "identifier",
                }),
            { searchString: n.map((u) => `${o}:${N(String(u))}`).join(" "), searchDepth: i, ...r }
        );
    const a = n.map(Number);
    return (
        a.some((d) => !Number.isSafeInteger(d)) &&
            s(t.report, "E_SOURCE_PARAM", "NDEx node ids are integers; set idAttribute to seed by name", {
                name: "ids",
                reason: "type",
            }),
        { searchString: "", searchDepth: i, nodeIds: a, ...r }
    );
}
async function D(e, t, n) {
    const o = p(e.params.uuid, n);
    (e.direction !== void 0 &&
        e.direction !== "both" &&
        s(n.report, "E_SOURCE_UNSUPPORTED", "NDEx expands in both directions only", {
            feature: "direction",
            needs: "both",
        }),
        (e.relationshipTypes ?? []).length > 0 &&
            s(n.report, "E_SOURCE_UNSUPPORTED", "NDEx cannot filter an expansion by relationship type", {
                feature: "relationshipTypes",
            }));
    const i = await l(n, `v2/search/network/${o}/query`, o, {
        method: "POST",
        idempotent: !0,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(U(e, n)),
    });
    return (n.report.include(await _.import(i.body ?? "", t, { signal: n.signal })), n.finish());
}
async function f(e, t) {
    const n = await l(t, `v3/networks/${e}/summary`, e, { headers: { Accept: "application/json" } }),
        o = await n.text();
    try {
        return { summary: JSON.parse(o), bytes: new TextEncoder().encode(o).byteLength };
    } catch {
        return s(t.report, "E_SOURCE_RESPONSE", "the NDEx summary is not JSON", {
            expected: "json",
            contentType: n.headers.get("content-type"),
        });
    }
}
function h(e) {
    return typeof e == "number" && Number.isFinite(e) ? new Date(e).toISOString() : void 0;
}
function m(e, t) {
    return t === "cx" ? e.cxFileSize : e.cx2FileSize;
}
function k(e, t, n) {
    const o = [
        ["maxNodes", e.nodeCount, n.limits.maxNodes],
        ["maxEdges", e.edgeCount, n.limits.maxEdges],
        ["maxBytes", m(e, t), n.limits.maxBytes],
    ];
    for (const [i, r, a] of o)
        r !== void 0 &&
            a !== void 0 &&
            r > a &&
            s(n.report, "E_SOURCE_LIMIT", `the network's ${i} of ${String(r)} is over the cap`, { limit: i, value: r });
}
function T(e) {
    const t = {},
        n = h(e.modificationTime);
    (n !== void 0 && (t.modified = n), typeof e.visibility == "string" && (t.visibility = e.visibility));
    for (const o of ["rights", "rightsHolder"]) {
        const i = e.properties?.[o]?.v;
        typeof i == "string" && (t[o] = i);
    }
    return t;
}
function E(e) {
    const t = h(e.modificationTime);
    return t === void 0 ? {} : { modified: t };
}
const I = g({
    id: w,
    descriptor: v,
    async file(e, t) {
        const n = p(e.uuid, t),
            o = e.format ?? "cx2",
            { summary: i, bytes: r } = await f(n, t);
        k(i, o, t);
        const a = m(i, o);
        (t.progress(r, a === void 0 ? void 0 : r + a, "bytes"), t.finish({ validators: E(i) }));
        const d = o === "cx" ? `v2/network/${n}` : `v3/networks/${n}`;
        return { body: await l(t, d, n), format: o, meta: T(i) };
    },
    async probe(e, t) {
        const n = p(e.uuid, t),
            { summary: o } = await f(n, t);
        return { ok: !0, counts: { nodes: o.nodeCount, edges: o.edgeCount, bytes: m(o, e.format ?? "cx2") } };
    },
    async list(e, t) {
        y(t);
        const n = Number(e.cursor?.start ?? 0),
            o = e.size ?? 25,
            i = await t.fetchJson(`v2/search/network?start=${String(n)}&size=${String(o)}`, {
                method: "POST",
                idempotent: !0,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ searchString: e.search ?? "" }),
            }),
            r = Array.isArray(i.networks)
                ? i.networks
                : s(t.report, "E_SOURCE_RESPONSE", "the NDEx search answer has no networks", {
                      expected: "ndex-search",
                      contentType: "application/json",
                  }),
            { numFound: a } = i,
            d = r.flatMap((c) =>
                typeof c.externalId == "string"
                    ? [
                          {
                              params: { uuid: c.externalId },
                              name: c.name ?? c.externalId,
                              nodeCount: c.nodeCount,
                              edgeCount: c.edgeCount,
                              modified: h(c.modificationTime),
                          },
                      ]
                    : [],
            ),
            u = typeof a == "number" ? a : void 0,
            S = u === void 0 ? r.length === o : n + r.length < u;
        return { items: d, next: S && r.length > 0 ? { start: n + r.length } : null, total: u };
    },
    async validate(e, t, n) {
        const o = p(e.uuid, n),
            i = E((await f(o, n)).summary);
        return t.modified === void 0 || i.modified === void 0
            ? { status: "unverifiable", validators: i }
            : t.modified === i.modified
              ? { status: "current", via: "modified", validators: i }
              : { status: "changed", via: "modified", changedAt: i.modified, validators: i };
    },
    expand: D,
});
export { v as NDEX_DESCRIPTOR, I as ndexSource };
//# sourceMappingURL=sources-ndex-DXYWoIyU.js.map
