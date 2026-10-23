import { d as V, z as Q, A as j, f as u, s as q, t as B } from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
const R = /\s*(?:<([^<>]*)>|_:([\w.-]*[\w-])|"((?:[^"\\]|\\.)*)"(?:@([A-Za-z][\w-]*)|\^\^<([^<>]*)>)?)/y,
    v = /\s*\.\s*(?:#.*)?$/y,
    L = "http://www.w3.org/2001/XMLSchema#",
    W = new Set(
        [
            "integer",
            "decimal",
            "double",
            "float",
            "int",
            "long",
            "short",
            "byte",
            "nonNegativeInteger",
            "nonPositiveInteger",
            "positiveInteger",
            "negativeInteger",
            "unsignedInt",
            "unsignedLong",
            "unsignedShort",
            "unsignedByte",
        ].map((e) => L + e),
    );
function _(e) {
    if (!e.includes("\\")) return e;
    const t = {
        t: "	",
        b: "\b",
        n: `
`,
        r: "\r",
        f: "\f",
    };
    return e.replaceAll(/\\(?:u([\da-fA-F]{4})|U([\da-fA-F]{8})|(.))/g, (n, r, o, a) => {
        const s = r ?? o;
        return s !== void 0 ? String.fromCodePoint(Number.parseInt(s, 16)) : (t[a ?? ""] ?? a ?? "");
    });
}
function T(e, t) {
    R.lastIndex = t;
    const n = R.exec(e);
    if (n === null) return null;
    const [, r, o, a, s, i] = n;
    let l;
    return (
        r !== void 0
            ? (l = { kind: "iri", value: _(r) })
            : o === void 0
              ? (l = { kind: "literal", value: _(a ?? ""), lang: s?.toLowerCase() ?? "", datatype: i ?? "" })
              : (l = { kind: "bnode", value: `_:${o}` }),
        { term: l, end: R.lastIndex }
    );
}
function X(e) {
    const t = [],
        n = e.split(/\r?\n/);
    for (let r = 0; r < n.length; r++) {
        const o = n[r],
            a = o.trim();
        if (a === "" || a.startsWith("#")) continue;
        const s = T(o, 0),
            i = s === null ? null : T(o, s.end),
            l = i === null ? null : T(o, i.end);
        if (
            ((v.lastIndex = l?.end ?? 0),
            s === null || i === null || l === null || s.term.kind === "literal" || i.term.kind !== "iri" || !v.test(o))
        )
            return { triples: t, badLine: r + 1 };
        t.push({ s: s.term, p: i.term.value, o: l.term });
    }
    return { triples: t, badLine: null };
}
function $(e) {
    const t = Math.max(e.lastIndexOf("#"), e.lastIndexOf("/"), e.lastIndexOf(":")),
        n = e.slice(t + 1);
    return n === "" ? e : n;
}
function G(e) {
    if (W.has(e.datatype)) {
        const t = Number(e.value);
        return Number.isFinite(t) ? t : e.value;
    }
    return e.datatype === `${L}boolean` ? e.value === "true" || e.value === "1" : e.value;
}
function Y(e, t) {
    return t === "" || e === "" || e === t || e.startsWith(`${t}-`);
}
function N(e, t, n) {
    const r = n ?? { nodes: new Map(), edges: [] };
    for (const { s: o, p: a, o: s } of e) {
        let i = r.nodes.get(o.value);
        if ((i === void 0 && ((i = {}), r.nodes.set(o.value, i)), s.kind === "literal")) {
            const l = $(a);
            Y(s.lang, t) && !(l in i) && (i[l] = G(s));
        } else r.edges.push({ source: o.value, target: s.value, type: $(a), predicate: a });
    }
    return r;
}
function Z(e) {
    const t = e.o.kind === "literal" ? JSON.stringify([e.o.value, e.o.lang, e.o.datatype]) : e.o.value;
    return `${e.s.value} ${e.p} ${t}`;
}
const J = /[\s<>"{}|^`\\]/,
    K = /^[a-z]{1,8}(-[a-z\d]{1,8})*$/i;
function x(e) {
    return e
        .replaceAll(/<[^<>\s]*>/g, "<>")
        .replaceAll(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
        .replaceAll(/#[^\n]*/g, "");
}
function ee(e) {
    const t = x(e),
        n = /\b(CONSTRUCT|DESCRIBE|SELECT|ASK)\b/i.exec(t)?.[1]?.toLowerCase() ?? null,
        r = t.slice(t.lastIndexOf("}") + 1);
    let o = [];
    if (n === "construct") {
        const a = /\bCONSTRUCT\s*\{([^}]*)\}/i.exec(t)?.[1] ?? "";
        o = [...new Set(a.match(/[?$]\w+/g) ?? [])].map((s) => `?${s.slice(1)}`);
    }
    return { form: n, ownLimit: /\b(LIMIT|OFFSET)\b/i.test(r), ordered: /\bORDER\s+BY\b/i.test(r), templateVars: o };
}
function A(e, t, n, r) {
    const o =
        t.ordered || t.templateVars.length === 0
            ? ""
            : `
ORDER BY ${t.templateVars.join(" ")}`;
    return `${e.trimEnd()}${o}
LIMIT ${String(n)}${r > 0 ? ` OFFSET ${String(r)}` : ""}`;
}
function b(e) {
    const t = String(e);
    return /^[a-z][\w+.-]*:/i.test(t) && !J.test(t) ? `<${t}>` : null;
}
function y(e) {
    const { language: t, predicates: n } = e,
        r = t === "" ? "" : ` FILTER(!isLiteral(?o) || lang(?o) = "" || langMatches(lang(?o), "${t}"))`,
        o = n.map((a) => `STRSTARTS(STR(?p), "${a}")`).join(" || ");
    return n.length === 0 ? r : `${r} FILTER(isLiteral(?o) || ${o})`;
}
function te(e) {
    return K.test(e);
}
function ne(e, t, n) {
    return A(
        `CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o .${y(e)} }`,
        { ordered: !1, templateVars: ["?s", "?p", "?o"] },
        t,
        n,
    );
}
function U(e, t, n, r, o) {
    const a = e.join(" "),
        s = `{ VALUES ?s { ${a} } ?s ?p ?o .${y(n)} }`,
        i = `{ VALUES ?o { ${a} } ?s ?p ?o .${y({ ...n, language: "" })} }`;
    let l = `${s} UNION ${i}`;
    return (
        t !== "both" && (l = t === "out" ? s : i),
        A(`CONSTRUCT { ?s ?p ?o } WHERE { ${l} }`, { ordered: !1, templateVars: ["?s", "?p", "?o"] }, r, o)
    );
}
const M = 1e3,
    re = 500,
    oe = 10,
    se = "application/n-triples, text/plain;q=0.9";
async function E(e, t) {
    B(e.signal);
    const n = await e.fetch(e.endpoint ?? "", {
        method: "POST",
        idempotent: !0,
        headers: { Accept: se, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ query: t }).toString(),
        allowStatus: [400],
    });
    if (n.status === 400) {
        const i = (await n.text()).trim().slice(0, 500);
        u(e.report, "E_SOURCE_QUERY", "the endpoint refused the query", {
            serverCode: null,
            line: null,
            column: null,
            serverMessage: i === "" ? null : i,
        });
    }
    const r = n.headers.get("content-type"),
        o = () =>
            u(e.report, "E_SOURCE_RESPONSE", "the endpoint did not answer N-Triples", {
                expected: "n-triples",
                contentType: r,
            });
    r !== null && /html|json|xml/i.test(r) && o();
    const { triples: a, badLine: s } = X(await n.text());
    return (s !== null && o(), a);
}
function I(e, t, n, r) {
    return (
        (!Number.isInteger(e) || e < 1 || e > n) &&
            u(r.report, "E_SOURCE_PARAM", `${t} is an integer from 1 to ${String(n)}`, { name: t, reason: "range" }),
        e
    );
}
function m(e, t) {
    const n = e.language ?? "";
    return (
        n !== "" &&
            !te(n) &&
            u(t.report, "E_SOURCE_PARAM", "language is a language tag", { name: "language", reason: "type" }),
        n.toLowerCase()
    );
}
function P(e, t) {
    const n = e.predicates ?? [],
        r = typeof n == "string" ? [n] : n;
    for (const o of r)
        (typeof o != "string" || b(o) === null) &&
            u(t.report, "E_SOURCE_PARAM", "predicates are IRI prefixes", { name: "predicates", reason: "iri" });
    return r;
}
function D(e, t, n) {
    return (
        (e === void 0 || e.length === 0) &&
            u(n.report, "E_SOURCE_PARAM", `${t} needs at least one IRI`, { name: t, reason: "required" }),
        e.map((r) => b(r) ?? u(n.report, "E_SOURCE_PARAM", `${t}: not an IRI`, { name: t, reason: "iri" }))
    );
}
function F(e, t) {
    const n = I(e.pageSize ?? M, "pageSize", 1e4, t),
        r = { language: m(e, t), predicates: P(e, t) },
        o = e.query?.trim() ?? "",
        a = e.mode ?? (o === "" ? "all" : "query");
    if (a === "neighborhood") {
        const i = D(e.ids, "ids", t);
        return { at: (l) => U(i, "both", r, n, l), paged: !0 };
    }
    if (a === "all") return { at: (i) => ne(r, n, i), paged: !0 };
    o === "" && u(t.report, "E_SOURCE_PARAM", "mode query needs a query", { name: "query", reason: "required" });
    const s = ee(o);
    return (
        s.form !== "construct" &&
            s.form !== "describe" &&
            u(t.report, "E_SOURCE_PARAM", "the query must be CONSTRUCT or DESCRIBE", { name: "query", reason: "form" }),
        s.ownLimit ? { at: () => o, paged: !1 } : { at: (i) => A(o, s, n, i), paged: !0 }
    );
}
function k(e, t, n) {
    const { report: r } = n;
    t.edgeCount === 0 && t.setDirected(!0);
    for (const [o, a] of e.nodes)
        try {
            (t.addNodeRecord(o, a), r.counts.nodes++);
        } catch (s) {
            (r.recordError(s, { element: o }), r.counts.skippedNodes++);
        }
    for (const { source: o, target: a, ...s } of e.edges)
        try {
            (t.addEdgeRecord(o, a, s, null), r.counts.edges++);
        } catch (i) {
            (r.recordError(i, { element: `${o} -> ${a}` }), r.counts.skippedEdges++);
        }
}
function z(e) {
    return q(
        e.map(Z).sort().join(`
`),
    );
}
async function ie(e, t, n) {
    const r = F(e, n),
        o = e.pageSize ?? M,
        a = Number(n.cursor?.offset ?? 0),
        s = m(e, n);
    let i = a,
        l = null,
        d;
    for (;;) {
        const p = await E(n, r.at(i));
        (i === 0 && (d = await z(p)), k(N(p, s), t, n));
        const { counts: f } = n.report;
        if ((n.progress(f.nodes + f.edges, void 0, "items"), !r.paged || p.length === 0)) {
            l = null;
            break;
        }
        if (((i += o), (l = { offset: i }), n.limits.reached())) break;
    }
    return n.finish({ next: l, ...(d === void 0 ? {} : { validators: { contentHash: d } }) });
}
async function ae(e, t, n) {
    const r = e.direction ?? "both";
    ["out", "in", "both"].includes(r) ||
        u(n.report, "E_SOURCE_PARAM", "direction must be out, in or both", { name: "direction", reason: "enum" });
    const o = I(e.depth ?? 1, "depth", oe, n),
        a = I(e.limit ?? re, "limit", Number.MAX_SAFE_INTEGER, n),
        s = m(e.params, n),
        i = { language: s, predicates: P(e.params, n) },
        l = e.relationshipTypes === void 0 ? null : new Set(e.relationshipTypes),
        d = o === 1 ? Number(n.cursor?.offset ?? 0) : 0,
        p = new Set(e.ids.map(String));
    let f = D(e.ids, "ids", n),
        w = null;
    const g = { nodes: new Map(), edges: [] };
    for (let C = 0; C < o && f.length > 0; C++) {
        const O = await E(n, U(f, r, i, a, d)),
            S = g.edges.length;
        if ((N(O, s, g), l !== null)) {
            const c = g.edges.slice(S).filter((h) => l.has(h.type) || l.has(h.predicate));
            g.edges.splice(S, 1 / 0, ...c);
        }
        o === 1 && O.length > 0 && (w = { offset: d + a });
        const H = g.edges.slice(S).flatMap((c) => [c.source, c.target]);
        f = [...new Set(H)]
            .filter((c) => !p.has(c))
            .flatMap((c) => {
                p.add(c);
                const h = b(c);
                return h === null ? [] : [h];
            });
    }
    return (k(g, t, n), n.finish({ next: w }));
}
const ce = V({
    id: j,
    descriptor: Q,
    import: ie,
    expand: ae,
    probe: async (e, t) => (await E(t, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } LIMIT 1"), m(e, t), { ok: !0 }),
    validate: async (e, t, n) => {
        const r = await z(await E(n, F(e, n).at(0)));
        let o = "unverifiable";
        return (
            t.contentHash !== void 0 && (o = t.contentHash === r ? "current" : "changed"),
            { status: o, via: "hash", validators: { contentHash: r } }
        );
    },
});
export { Q as SPARQL_DESCRIPTOR, ce as sparqlSource };
//# sourceMappingURL=sources-sparql-DuY8hgjO.js.map
