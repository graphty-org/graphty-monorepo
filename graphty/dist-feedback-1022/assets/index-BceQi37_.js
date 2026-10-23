const __vite__mapDeps = (
    i,
    m = __vite__mapDeps,
    d = m.f ||
        (m.f = [
            "assets/WebLlmProvider-zYPXU5qa.js",
            "assets/preload-helper-BXl3LOEh.js",
            "assets/index-hDuyXkBS.js",
            "assets/index-BeYlTMKJ.css",
        ]),
) => i.map((i) => d[i]);
import { _ as cl } from "./preload-helper-BXl3LOEh.js";
import {
    ay as dl,
    az as pl,
    aA as fl,
    aB as ml,
    aC as u,
    aD as N,
    aE as ie,
    aF as s,
    aG as ne,
    aH as f,
    aI as m,
    aJ as X,
    aK as J,
    aL as we,
    aM as Ue,
    aN as hl,
    aO as Gn,
    aP as Ot,
    aQ as Ge,
    aR as wr,
    aS as un,
    aT as gl,
    aU as _l,
} from "./index-hDuyXkBS.js";
function yl(e) {
    return dl(pl, e);
}
const xo = "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    vl = Object.freeze([
        {
            id: "openai",
            plainName: "OpenAI",
            requiresKey: !0,
            keyShape: { prefix: "sk-", minLength: 21 },
            runsLocally: !1,
            testOnly: !1,
            defaultModel: "gpt-4o",
            models: [{ id: "gpt-4o", plainName: "GPT-4o", supportsTools: !0 }],
        },
        {
            id: "anthropic",
            plainName: "Anthropic",
            requiresKey: !0,
            keyShape: { prefix: "sk-ant-", minLength: 21 },
            runsLocally: !1,
            testOnly: !1,
            defaultModel: "claude-haiku-4-5-20251001",
            models: [{ id: "claude-haiku-4-5-20251001", plainName: "Claude Haiku 4.5", supportsTools: !0 }],
        },
        {
            id: "google",
            plainName: "Google",
            requiresKey: !0,
            keyShape: { minLength: 11 },
            runsLocally: !1,
            testOnly: !1,
            defaultModel: "gemini-3.8-flash",
            models: [{ id: "gemini-3.8-flash", plainName: "Gemini 3.8 Flash", supportsTools: !0 }],
        },
        {
            id: "webllm",
            plainName: "WebLLM",
            requiresKey: !1,
            runsLocally: !0,
            testOnly: !1,
            defaultModel: xo,
            models: [
                { id: xo, plainName: "Llama 3.2 1B", supportsTools: !1, downloadMB: 500 },
                {
                    id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
                    plainName: "Llama 3.2 3B",
                    supportsTools: !1,
                    downloadMB: 1500,
                },
                {
                    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
                    plainName: "Phi 3.5 Mini",
                    supportsTools: !1,
                    downloadMB: 2e3,
                },
                {
                    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
                    plainName: "Qwen 2.5 1.5B",
                    supportsTools: !1,
                    downloadMB: 800,
                },
                {
                    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
                    plainName: "SmolLM2 360M",
                    supportsTools: !1,
                    downloadMB: 200,
                },
                {
                    id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
                    plainName: "Hermes 3 Llama 3.1 8B",
                    supportsTools: !0,
                    downloadMB: 4500,
                },
                {
                    id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
                    plainName: "Hermes 2 Pro Mistral 7B",
                    supportsTools: !0,
                    downloadMB: 4e3,
                },
            ],
        },
        {
            id: "mock",
            plainName: "Mock",
            requiresKey: !1,
            runsLocally: !0,
            testOnly: !0,
            defaultModel: "mock",
            models: [{ id: "mock", plainName: "Mock", supportsTools: !0 }],
        },
    ]);
function In(e) {
    const t = vl.find((n) => n.id === e);
    if (!t) throw new Error(`Unknown AI provider: ${e}`);
    return t;
}
const mt = "[redacted]",
    bl = [
        [/\b(?:sk|pk|rk)-[\w-]{8,}/g, mt],
        [/\bAIza[\w-]{20,}/g, mt],
        [/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, `$1 ${mt}`],
        [/\b((?:x-goog-|x-)?api[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, `$1$2${mt}`],
        [/\b((?:access[_-]?)?token|secret|password|authorization)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, `$1$2${mt}`],
        [/([?&]key=)[^&#\s]+/gi, `$1${mt}`],
        [new RegExp("(?<![\\w-])(?=[\\w-]*\\d)(?=[\\w-]*[A-Za-z])[\\w-]{32,}(?![\\w-])", "g"), mt],
    ];
function To(e, t = []) {
    let n = e;
    for (const o of t) o && (n = n.split(o).join(mt));
    for (const [o, r] of bl) n = n.replaceAll(o, r);
    return n;
}
const wl = "ApiKeyMissingError";
function Sn(e, t = []) {
    const n = e instanceof Error ? e : new Error(String(e)),
        o = new Error(To(n.message, t));
    ((o.name = n.name), (o.stack = n.stack === void 0 ? void 0 : To(n.stack, t)));
    const { statusCode: r, lastError: a } = n,
        l = r ?? a?.statusCode;
    return (typeof l == "number" && Object.assign(o, { statusCode: l }), o);
}
class xr {
    constructor() {
        ((this.name = "mock"),
            (this.supportsStreaming = !0),
            (this.supportsTools = !0),
            (this.responses = new Map()),
            (this.defaultResponse = { text: "This is a mock response.", toolCalls: [] }),
            (this.configuredError = null),
            (this.delay = 0),
            (this.callHistory = []));
    }
    configure(t) {}
    setResponse(t, n) {
        this.responses.set(t.toLowerCase(), n);
    }
    setDefaultResponse(t) {
        this.defaultResponse = t;
    }
    setError(t) {
        this.configuredError = t;
    }
    clearError() {
        this.configuredError = null;
    }
    setDelay(t) {
        this.delay = t;
    }
    getCallHistory() {
        return [...this.callHistory];
    }
    clearCallHistory() {
        this.callHistory = [];
    }
    findResponse(t) {
        if (t.at(-1)?.role === "tool") return { text: "", toolCalls: [] };
        const n = [...t].reverse().find((r) => r.role === "user");
        if (!n) return this.defaultResponse;
        const o = n.content.toLowerCase();
        for (const [r, a] of this.responses) if (o.includes(r)) return a;
        return this.defaultResponse;
    }
    async generate(t, n, o) {
        if (
            (this.callHistory.push({ messages: t, tools: n, streaming: !1, timestamp: Date.now() }), o?.signal?.aborted)
        )
            throw new Error("Request was aborted");
        if (this.configuredError) throw this.configuredError;
        if ((this.delay > 0 && (await new Promise((r) => setTimeout(r, this.delay))), o?.signal?.aborted))
            throw new Error("Request was aborted");
        return this.findResponse(t);
    }
    async generateStream(t, n, o, r) {
        if ((this.callHistory.push({ messages: t, tools: n, streaming: !0, timestamp: Date.now() }), r?.aborted))
            throw new Error("Request was aborted");
        if (this.configuredError) throw (o.onError(this.configuredError), this.configuredError);
        const a = this.findResponse(t),
            { text: l } = a;
        for (const i of l) {
            if (r?.aborted) throw new Error("Request was aborted");
            (o.onChunk(i), this.delay > 0 && (await new Promise((d) => setTimeout(d, this.delay / l.length))));
        }
        for (const i of a.toolCalls) {
            if (r?.aborted) throw new Error("Request was aborted");
            o.onToolCall(i.name, i.arguments);
        }
        o.onComplete(a);
    }
    validateApiKey() {
        if (this.configuredError) {
            const t = this.configuredError.message.toLowerCase();
            return t.includes("401") ||
                t.includes("403") ||
                t.includes("unauthorized") ||
                (t.includes("invalid") && t.includes("key")) ||
                t.includes("authentication") ||
                t.includes("api key")
                ? Promise.resolve(!1)
                : Promise.reject(this.configuredError);
        }
        return Promise.resolve(!0);
    }
}
var Tr = "vercel.ai.error",
    xl = Symbol.for(Tr),
    ko,
    Io,
    te = class kr extends ((Io = Error), (ko = xl), Io) {
        constructor({ name: t, message: n, cause: o }) {
            (super(n), (this[ko] = !0), (this.name = t), (this.cause = o));
        }
        static isInstance(t) {
            return kr.hasMarker(t, Tr);
        }
        static hasMarker(t, n) {
            const o = Symbol.for(n);
            return t != null && typeof t == "object" && o in t && typeof t[o] == "boolean" && t[o] === !0;
        }
    },
    Ir = "AI_APICallError",
    Sr = `vercel.ai.error.${Ir}`,
    Tl = Symbol.for(Sr),
    So,
    Co,
    _e = class extends ((Co = te), (So = Tl), Co) {
        constructor({
            message: e,
            url: t,
            requestBodyValues: n,
            statusCode: o,
            responseHeaders: r,
            responseBody: a,
            cause: l,
            isRetryable: i = o != null && (o === 408 || o === 409 || o === 429 || o >= 500),
            data: d,
        }) {
            (super({ name: Ir, message: e, cause: l }),
                (this[So] = !0),
                (this.url = t),
                (this.requestBodyValues = n),
                (this.statusCode = o),
                (this.responseHeaders = r),
                (this.responseBody = a),
                (this.isRetryable = i),
                (this.data = d));
        }
        static isInstance(e) {
            return te.hasMarker(e, Sr);
        }
    },
    Cr = "AI_EmptyResponseBodyError",
    Er = `vercel.ai.error.${Cr}`,
    kl = Symbol.for(Er),
    Eo,
    Ro,
    Il = class extends ((Ro = te), (Eo = kl), Ro) {
        constructor({ message: e = "Empty response body" } = {}) {
            (super({ name: Cr, message: e }), (this[Eo] = !0));
        }
        static isInstance(e) {
            return te.hasMarker(e, Er);
        }
    };
function Qt(e) {
    return e == null ? "unknown error" : typeof e == "string" ? e : e instanceof Error ? e.message : JSON.stringify(e);
}
var Rr = "AI_InvalidArgumentError",
    Or = `vercel.ai.error.${Rr}`,
    Sl = Symbol.for(Or),
    Oo,
    Ao,
    Ar = class extends ((Ao = te), (Oo = Sl), Ao) {
        constructor({ message: t, cause: n, argument: o }) {
            (super({ name: Rr, message: t, cause: n }), (this[Oo] = !0), (this.argument = o));
        }
        static isInstance(t) {
            return te.hasMarker(t, Or);
        }
    },
    Mr = "AI_InvalidPromptError",
    Nr = `vercel.ai.error.${Mr}`,
    Cl = Symbol.for(Nr),
    Mo,
    No,
    ht = class extends ((No = te), (Mo = Cl), No) {
        constructor({ prompt: e, message: t, cause: n }) {
            (super({ name: Mr, message: `Invalid prompt: ${t}`, cause: n }), (this[Mo] = !0), (this.prompt = e));
        }
        static isInstance(e) {
            return te.hasMarker(e, Nr);
        }
    },
    Pr = "AI_InvalidResponseDataError",
    $r = `vercel.ai.error.${Pr}`,
    El = Symbol.for($r),
    Po,
    $o,
    Vt = class extends (($o = te), (Po = El), $o) {
        constructor({ data: e, message: t = `Invalid response data: ${JSON.stringify(e)}.` }) {
            (super({ name: Pr, message: t }), (this[Po] = !0), (this.data = e));
        }
        static isInstance(e) {
            return te.hasMarker(e, $r);
        }
    },
    Dr = "AI_JSONParseError",
    qr = `vercel.ai.error.${Dr}`,
    Rl = Symbol.for(qr),
    Do,
    qo,
    cn = class extends ((qo = te), (Do = Rl), qo) {
        constructor({ text: e, cause: t }) {
            (super({
                name: Dr,
                message: `JSON parsing failed: Text: ${e}.
Error message: ${Qt(t)}`,
                cause: t,
            }),
                (this[Do] = !0),
                (this.text = e));
        }
        static isInstance(e) {
            return te.hasMarker(e, qr);
        }
    },
    Ur = "AI_LoadAPIKeyError",
    Lr = `vercel.ai.error.${Ur}`,
    Ol = Symbol.for(Lr),
    Uo,
    Lo,
    on = class extends ((Lo = te), (Uo = Ol), Lo) {
        constructor({ message: e }) {
            (super({ name: Ur, message: e }), (this[Uo] = !0));
        }
        static isInstance(e) {
            return te.hasMarker(e, Lr);
        }
    },
    jr = "AI_NoSuchModelError",
    Br = `vercel.ai.error.${jr}`,
    Al = Symbol.for(Br),
    jo,
    Bo,
    Go = class extends ((Bo = te), (jo = Al), Bo) {
        constructor({ errorName: e = jr, modelId: t, modelType: n, message: o = `No such ${n}: ${t}` }) {
            (super({ name: e, message: o }), (this[jo] = !0), (this.modelId = t), (this.modelType = n));
        }
        static isInstance(e) {
            return te.hasMarker(e, Br);
        }
    },
    Gr = "AI_TooManyEmbeddingValuesForCallError",
    Fr = `vercel.ai.error.${Gr}`,
    Ml = Symbol.for(Fr),
    Fo,
    Ho,
    Hr = class extends ((Ho = te), (Fo = Ml), Ho) {
        constructor(e) {
            (super({
                name: Gr,
                message: `Too many values for a single embedding call. The ${e.provider} model "${e.modelId}" can only embed up to ${e.maxEmbeddingsPerCall} values per call, but ${e.values.length} values were provided.`,
            }),
                (this[Fo] = !0),
                (this.provider = e.provider),
                (this.modelId = e.modelId),
                (this.maxEmbeddingsPerCall = e.maxEmbeddingsPerCall),
                (this.values = e.values));
        }
        static isInstance(e) {
            return te.hasMarker(e, Fr);
        }
    },
    Vr = "AI_TypeValidationError",
    Jr = `vercel.ai.error.${Vr}`,
    Nl = Symbol.for(Jr),
    Vo,
    Jo,
    Wt = class Fn extends ((Jo = te), (Vo = Nl), Jo) {
        constructor({ value: t, cause: n }) {
            (super({
                name: Vr,
                message: `Type validation failed: Value: ${JSON.stringify(t)}.
Error message: ${Qt(n)}`,
                cause: n,
            }),
                (this[Vo] = !0),
                (this.value = t));
        }
        static isInstance(t) {
            return te.hasMarker(t, Jr);
        }
        static wrap({ value: t, cause: n }) {
            return Fn.isInstance(n) && n.value === t ? n : new Fn({ value: t, cause: n });
        }
    },
    Wr = "AI_UnsupportedFunctionalityError",
    Zr = `vercel.ai.error.${Wr}`,
    Pl = Symbol.for(Zr),
    Wo,
    Zo,
    ye = class extends ((Zo = te), (Wo = Pl), Zo) {
        constructor({ functionality: e, message: t = `'${e}' functionality not supported.` }) {
            (super({ name: Wr, message: t }), (this[Wo] = !0), (this.functionality = e));
        }
        static isInstance(e) {
            return te.hasMarker(e, Zr);
        }
    };
class Cn extends Error {
    constructor(t, n) {
        (super(t),
            (this.name = "ParseError"),
            (this.type = n.type),
            (this.field = n.field),
            (this.value = n.value),
            (this.line = n.line));
    }
}
const zo = 10,
    $l = 13,
    bt = 32;
function En(e) {}
function Dl(e) {
    if (typeof e == "function")
        throw new TypeError(
            "`config` must be an object, got a function instead. Did you mean `createParser({onEvent: fn})`?",
        );
    const { onEvent: t = En, onError: n = En, onRetry: o = En, onComment: r, maxBufferSize: a } = e,
        l = [];
    let i = 0,
        d = !0,
        c,
        p = "",
        w = 0,
        y,
        k = !1;
    function x(h) {
        if (k)
            throw new Error(
                "Cannot feed parser: it was terminated after exceeding the configured max buffer size. Call `reset()` to resume parsing.",
            );
        if (
            (d &&
                ((d = !1),
                h.charCodeAt(0) === 239 && h.charCodeAt(1) === 187 && h.charCodeAt(2) === 191 && (h = h.slice(3))),
            l.length === 0)
        ) {
            const M = S(h);
            (M !== "" && (l.push(M), (i = M.length)), I());
            return;
        }
        if (
            h.indexOf(`
`) === -1 &&
            h.indexOf("\r") === -1
        ) {
            (l.push(h), (i += h.length), I());
            return;
        }
        l.push(h);
        const g = l.join("");
        ((l.length = 0), (i = 0));
        const v = S(g);
        (v !== "" && (l.push(v), (i = v.length)), I());
    }
    function I() {
        a !== void 0 &&
            (i + p.length <= a ||
                ((k = !0),
                (l.length = 0),
                (i = 0),
                (c = void 0),
                (p = ""),
                (w = 0),
                (y = void 0),
                n(
                    new Cn(`Buffered data exceeded max buffer size of ${a} characters`, {
                        type: "max-buffer-size-exceeded",
                    }),
                )));
    }
    function S(h) {
        let g = 0;
        if (h.indexOf("\r") === -1) {
            let v = h.indexOf(
                `
`,
                g,
            );
            for (; v !== -1;) {
                if (g === v) {
                    (w > 0 && t({ id: c, event: y, data: p }),
                        (c = void 0),
                        (p = ""),
                        (w = 0),
                        (y = void 0),
                        (g = v + 1),
                        (v = h.indexOf(
                            `
`,
                            g,
                        )));
                    continue;
                }
                const M = h.charCodeAt(g);
                if (Ko(h, g, M)) {
                    const _ = h.charCodeAt(g + 5) === bt ? g + 6 : g + 5,
                        E = h.slice(_, v);
                    if (w === 0 && h.charCodeAt(v + 1) === zo) {
                        (t({ id: c, event: y, data: E }),
                            (c = void 0),
                            (p = ""),
                            (y = void 0),
                            (g = v + 2),
                            (v = h.indexOf(
                                `
`,
                                g,
                            )));
                        continue;
                    }
                    ((p =
                        w === 0
                            ? E
                            : `${p}
${E}`),
                        w++);
                } else
                    Yo(h, g, M) ? (y = h.slice(h.charCodeAt(g + 6) === bt ? g + 7 : g + 6, v) || void 0) : R(h, g, v);
                ((g = v + 1),
                    (v = h.indexOf(
                        `
`,
                        g,
                    )));
            }
            return h.slice(g);
        }
        for (; g < h.length;) {
            const v = h.indexOf("\r", g),
                M = h.indexOf(
                    `
`,
                    g,
                );
            let _ = -1;
            if (
                (v !== -1 && M !== -1
                    ? (_ = v < M ? v : M)
                    : v !== -1
                      ? v === h.length - 1
                          ? (_ = -1)
                          : (_ = v)
                      : M !== -1 && (_ = M),
                _ === -1)
            )
                break;
            (R(h, g, _), (g = _ + 1), h.charCodeAt(g - 1) === $l && h.charCodeAt(g) === zo && g++);
        }
        return h.slice(g);
    }
    function R(h, g, v) {
        if (g === v) {
            O();
            return;
        }
        const M = h.charCodeAt(g);
        if (Ko(h, g, M)) {
            const L = h.charCodeAt(g + 5) === bt ? g + 6 : g + 5,
                j = h.slice(L, v);
            ((p =
                w === 0
                    ? j
                    : `${p}
${j}`),
                w++);
            return;
        }
        if (Yo(h, g, M)) {
            y = h.slice(h.charCodeAt(g + 6) === bt ? g + 7 : g + 6, v) || void 0;
            return;
        }
        if (M === 105 && h.charCodeAt(g + 1) === 100 && h.charCodeAt(g + 2) === 58) {
            const L = h.slice(h.charCodeAt(g + 3) === bt ? g + 4 : g + 3, v);
            L.includes("\0") || (c = L);
            return;
        }
        if (M === 58) {
            if (r) {
                const L = h.slice(g, v);
                r(L.slice(h.charCodeAt(g + 1) === bt ? 2 : 1));
            }
            return;
        }
        const _ = h.slice(g, v),
            E = _.indexOf(":");
        if (E === -1) {
            P(_, "", _);
            return;
        }
        const b = _.slice(0, E),
            A = _.charCodeAt(E + 1) === bt ? 2 : 1,
            U = _.slice(E + A);
        P(b, U, _);
    }
    function P(h, g, v) {
        switch (h) {
            case "event":
                y = g || void 0;
                break;
            case "data":
                ((p =
                    w === 0
                        ? g
                        : `${p}
${g}`),
                    w++);
                break;
            case "id":
                g.includes("\0") || (c = g);
                break;
            case "retry":
                /^\d+$/.test(g)
                    ? o(parseInt(g, 10))
                    : n(new Cn(`Invalid \`retry\` value: "${g}"`, { type: "invalid-retry", value: g, line: v }));
                break;
            default:
                n(
                    new Cn(`Unknown field "${h.length > 20 ? `${h.slice(0, 20)}…` : h}"`, {
                        type: "unknown-field",
                        field: h,
                        value: g,
                        line: v,
                    }),
                );
                break;
        }
    }
    function O() {
        (w > 0 && t({ id: c, event: y, data: p }), (c = void 0), (p = ""), (w = 0), (y = void 0));
    }
    function C(h = {}) {
        if (h.consume && l.length > 0) {
            const g = l.join("");
            R(g, 0, g.length);
        }
        ((d = !0), (c = void 0), (p = ""), (w = 0), (y = void 0), (l.length = 0), (i = 0), (k = !1));
    }
    return { feed: x, reset: C };
}
function Ko(e, t, n) {
    return (
        n === 100 &&
        e.charCodeAt(t + 1) === 97 &&
        e.charCodeAt(t + 2) === 116 &&
        e.charCodeAt(t + 3) === 97 &&
        e.charCodeAt(t + 4) === 58
    );
}
function Yo(e, t, n) {
    return (
        n === 101 &&
        e.charCodeAt(t + 1) === 118 &&
        e.charCodeAt(t + 2) === 101 &&
        e.charCodeAt(t + 3) === 110 &&
        e.charCodeAt(t + 4) === 116 &&
        e.charCodeAt(t + 5) === 58
    );
}
class ql extends TransformStream {
    constructor({ onError: t, onRetry: n, onComment: o, maxBufferSize: r } = {}) {
        let a;
        super({
            start(l) {
                a = Dl({
                    onEvent: (i) => {
                        l.enqueue(i);
                    },
                    onError(i) {
                        (typeof t == "function" && t(i),
                            (t === "terminate" || i.type === "max-buffer-size-exceeded") && l.error(i));
                    },
                    onRetry: n,
                    onComment: o,
                    maxBufferSize: r,
                });
            },
            transform(l) {
                a.feed(l);
            },
        });
    }
}
var ae;
(function (e) {
    ((e.ZodString = "ZodString"),
        (e.ZodNumber = "ZodNumber"),
        (e.ZodNaN = "ZodNaN"),
        (e.ZodBigInt = "ZodBigInt"),
        (e.ZodBoolean = "ZodBoolean"),
        (e.ZodDate = "ZodDate"),
        (e.ZodSymbol = "ZodSymbol"),
        (e.ZodUndefined = "ZodUndefined"),
        (e.ZodNull = "ZodNull"),
        (e.ZodAny = "ZodAny"),
        (e.ZodUnknown = "ZodUnknown"),
        (e.ZodNever = "ZodNever"),
        (e.ZodVoid = "ZodVoid"),
        (e.ZodArray = "ZodArray"),
        (e.ZodObject = "ZodObject"),
        (e.ZodUnion = "ZodUnion"),
        (e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion"),
        (e.ZodIntersection = "ZodIntersection"),
        (e.ZodTuple = "ZodTuple"),
        (e.ZodRecord = "ZodRecord"),
        (e.ZodMap = "ZodMap"),
        (e.ZodSet = "ZodSet"),
        (e.ZodFunction = "ZodFunction"),
        (e.ZodLazy = "ZodLazy"),
        (e.ZodLiteral = "ZodLiteral"),
        (e.ZodEnum = "ZodEnum"),
        (e.ZodEffects = "ZodEffects"),
        (e.ZodNativeEnum = "ZodNativeEnum"),
        (e.ZodOptional = "ZodOptional"),
        (e.ZodNullable = "ZodNullable"),
        (e.ZodDefault = "ZodDefault"),
        (e.ZodCatch = "ZodCatch"),
        (e.ZodPromise = "ZodPromise"),
        (e.ZodBranded = "ZodBranded"),
        (e.ZodPipeline = "ZodPipeline"),
        (e.ZodReadonly = "ZodReadonly"));
})(ae || (ae = {}));
var zr = {};
function Se(...e) {
    return e.reduce((t, n) => ({ ...t, ...n }), {});
}
async function Ul(e, t) {
    if (e == null) return Promise.resolve();
    const n = t?.abortSignal;
    return new Promise((o, r) => {
        if (n?.aborted) {
            r(Xo());
            return;
        }
        const a = setTimeout(() => {
                (l(), o());
            }, e),
            l = () => {
                (clearTimeout(a), n?.removeEventListener("abort", i));
            },
            i = () => {
                (l(), r(Xo()));
            };
        n?.addEventListener("abort", i);
    });
}
function Xo() {
    return new DOMException("Delay was aborted", "AbortError");
}
var an = class {
    constructor() {
        ((this.status = { type: "pending" }), (this._resolve = void 0), (this._reject = void 0));
    }
    get promise() {
        return this._promise
            ? this._promise
            : ((this._promise = new Promise((e, t) => {
                  (this.status.type === "resolved"
                      ? e(this.status.value)
                      : this.status.type === "rejected" && t(this.status.error),
                      (this._resolve = e),
                      (this._reject = t));
              })),
              this._promise);
    }
    resolve(e) {
        var t;
        ((this.status = { type: "resolved", value: e }),
            this._promise && ((t = this._resolve) == null || t.call(this, e)));
    }
    reject(e) {
        var t;
        ((this.status = { type: "rejected", error: e }),
            this._promise && ((t = this._reject) == null || t.call(this, e)));
    }
    isResolved() {
        return this.status.type === "resolved";
    }
    isRejected() {
        return this.status.type === "rejected";
    }
    isPending() {
        return this.status.type === "pending";
    }
};
function Nt(e) {
    return Object.fromEntries([...e.headers]);
}
var Kr = "AI_DownloadError",
    Yr = `vercel.ai.error.${Kr}`,
    Ll = Symbol.for(Yr),
    Qo,
    ea,
    qe = class extends ((ea = te), (Qo = Ll), ea) {
        constructor({
            url: e,
            statusCode: t,
            statusText: n,
            cause: o,
            message: r = o == null ? `Failed to download ${e}: ${t} ${n}` : `Failed to download ${e}: ${o}`,
        }) {
            (super({ name: Kr, message: r, cause: o }),
                (this[Qo] = !0),
                (this.url = e),
                (this.statusCode = t),
                (this.statusText = n));
        }
        static isInstance(e) {
            return te.hasMarker(e, Yr);
        }
    },
    jl = Symbol.for("vercel.ai.embeddingModel.maxInputBytesPerCall");
async function Xn(e) {
    var t;
    try {
        await ((t = e.body) == null ? void 0 : t.cancel());
    } catch {}
}
function Bl(e = globalThis) {
    return e.window != null;
}
function Gl(e, t) {
    try {
        return new URL(e).origin === new URL(t).origin;
    } catch {
        return !1;
    }
}
function Fl(e) {
    let t;
    try {
        t = new URL(e);
    } catch {
        throw new qe({ url: e, message: `Invalid URL: ${e}` });
    }
    if (t.protocol === "data:") return;
    if (t.protocol !== "http:" && t.protocol !== "https:")
        throw new qe({ url: e, message: `URL scheme must be http, https, or data, got ${t.protocol}` });
    const n = t.hostname.toLowerCase().replace(/\.+$/, "");
    if (!n) throw new qe({ url: e, message: "URL must have a hostname" });
    if (n === "localhost" || n.endsWith(".local") || n.endsWith(".localhost"))
        throw new qe({ url: e, message: `URL with hostname ${n} is not allowed` });
    if (n.startsWith("[") && n.endsWith("]")) {
        const o = n.slice(1, -1);
        if (Xr(o)) throw new qe({ url: e, message: `URL with IPv6 address ${n} is not allowed` });
        return;
    }
    if (Qn(n) && eo(n)) throw new qe({ url: e, message: `URL with IP address ${n} is not allowed` });
}
function Hl({ address: e, family: t, hostname: n }) {
    if (t === 4 ? !Qn(e) || eo(e) : t === 6 ? Xr(e) : !0)
        throw new qe({ url: n, message: `Hostname ${n} resolved to disallowed IP address ${e}` });
}
function Qn(e) {
    const t = e.split(".");
    return t.length !== 4
        ? !1
        : t.every((n) => {
              const o = Number(n);
              return Number.isInteger(o) && o >= 0 && o <= 255 && String(o) === n;
          });
}
function eo(e) {
    const t = e.split(".").map(Number),
        [n, o, r] = t;
    return (
        n === 0 ||
        n === 10 ||
        (n === 100 && o >= 64 && o <= 127) ||
        n === 127 ||
        (n === 169 && o === 254) ||
        (n === 172 && o >= 16 && o <= 31) ||
        (n === 192 && o === 0 && r === 0) ||
        (n === 192 && o === 168) ||
        (n === 198 && (o === 18 || o === 19)) ||
        n >= 240
    );
}
function Vl(e) {
    let t = e.toLowerCase();
    const n = t.indexOf("%");
    n !== -1 && (t = t.slice(0, n));
    const o = t.split("::");
    if (o.length > 2) return null;
    const r = (l) => {
            if (l === "") return [];
            const i = [],
                d = l.split(":");
            for (let c = 0; c < d.length; c++) {
                const p = d[c];
                if (p.includes(".")) {
                    if (c !== d.length - 1 || !Qn(p)) return null;
                    const [w, y, k, x] = p.split(".").map(Number);
                    i.push((w << 8) | y, (k << 8) | x);
                    continue;
                }
                if (!/^[0-9a-f]{1,4}$/.test(p)) return null;
                i.push(parseInt(p, 16));
            }
            return i;
        },
        a = r(o[0]);
    if (a === null) return null;
    if (o.length === 2) {
        const l = r(o[1]);
        if (l === null) return null;
        const i = 8 - a.length - l.length;
        return i < 0 ? null : [...a, ...new Array(i).fill(0), ...l];
    }
    return a.length === 8 ? a : null;
}
function Xr(e) {
    const t = Vl(e);
    if (t === null) return !0;
    const n = (r) => t.slice(0, r).every((a) => a === 0);
    if (
        (n(7) && (t[7] === 0 || t[7] === 1)) ||
        (t[0] & 65024) === 64512 ||
        (t[0] & 65472) === 65152 ||
        (t[0] & 65472) === 65216 ||
        (t[0] & 65280) === 65280
    )
        return !0;
    if (
        n(6) ||
        (n(5) && t[5] === 65535) ||
        (n(4) && t[4] === 65535 && t[5] === 0) ||
        (t[0] === 100 && t[1] === 65435 && t[2] === 0 && t[3] === 0 && t[4] === 0 && t[5] === 0) ||
        (t[0] === 100 && t[1] === 65435 && t[2] === 1)
    ) {
        const r = (t[6] >> 8) & 255,
            a = t[6] & 255,
            l = (t[7] >> 8) & 255,
            i = t[7] & 255;
        return eo(`${r}.${a}.${l}.${i}`);
    }
    return !1;
}
function Jl(e) {
    return (t, n, o) => {
        e(t, { ...n, all: !0 }, (r, a) => {
            if (r) {
                o(r);
                return;
            }
            try {
                const [l] = a;
                if (l == null) throw new Error(`Hostname ${t} did not resolve to an address`);
                for (const { address: i, family: d } of a) Hl({ address: i, family: d, hostname: t });
                n.all === !0 ? o(null, a) : o(null, l.address, l.family);
            } catch (l) {
                o(l instanceof Error ? l : new Error(String(l)));
            }
        });
    };
}
var Rn;
function Wl() {
    var e, t, n;
    const o = globalThis.process;
    return (
        ((e = o?.release) == null ? void 0 : e.name) === "node" &&
        ((t = o.versions) == null ? void 0 : t.bun) == null &&
        ((n = o.versions) == null ? void 0 : n.deno) == null &&
        o.title !== "workerd" &&
        globalThis.EdgeRuntime == null
    );
}
async function Zl() {
    return Wl() ? (Rn ?? (Rn = zl())) : globalThis.fetch;
}
async function zl() {
    const [e, { lookup: t }] = await Promise.all([ta("node:module"), ta("node:dns")]),
        n = e.createRequire(Qr()),
        { Agent: o, fetch: r } = n("undici"),
        a = new o({ connect: { lookup: Jl(t) } });
    return (l, i) => r(l, { ...i, dispatcher: a });
}
async function ta(e) {
    var t;
    const n = globalThis.process,
        o = (t = n?.getBuiltinModule) == null ? void 0 : t.call(n, e);
    return o ?? (await Kl(e));
}
function Kl(e) {
    return import(e);
}
function Qr() {
    const e = Error.prepareStackTrace;
    try {
        Error.prepareStackTrace = (r, a) => a;
        const t = new Error("Capture current module path");
        Error.captureStackTrace(t, Qr);
        const [n] = t.stack,
            o = n?.getFileName();
        if (o == null) throw new Error("Unable to determine the current module path");
        return o;
    } finally {
        Error.prepareStackTrace = e;
    }
}
var Yl = 10;
async function Xl(e) {
    return e == null || e === globalThis.fetch ? await Zl() : e;
}
async function Ql({ url: e, headers: t, abortSignal: n, maxRedirects: o = Yl, fetch: r, trustedOrigin: a }) {
    var l;
    const i = { signal: n };
    t !== void 0 && (i.headers = t);
    let d = e;
    for (let c = 0; c <= o; c++) {
        const p = a !== void 0 && Gl(d, a);
        p || Fl(d);
        const w = p && r != null ? r : p ? globalThis.fetch : await Xl(r),
            y = await w(d, { ...i, redirect: "manual" });
        if (y.type === "opaqueredirect") {
            if (!Bl()) throw new qe({ url: e, message: `Redirect from ${d} could not be validated and was blocked` });
            return await w(d, { ...i, redirect: "follow" });
        }
        const k = (l = y.headers) == null ? void 0 : l.get("location");
        if (y.status >= 300 && y.status < 400 && k) {
            (await Xn(y), (d = new URL(k, d).toString()));
            continue;
        }
        return y;
    }
    throw new qe({ url: e, message: `Too many redirects (max ${o})` });
}
var ei = 2 * 1024 * 1024 * 1024;
async function ti({ response: e, url: t, maxBytes: n = ei }) {
    const o = e.headers.get("content-length");
    if (o != null) {
        const p = parseInt(o, 10);
        if (!isNaN(p) && p > n)
            throw (
                await Xn(e),
                new qe({
                    url: t,
                    message: `Download of ${t} exceeded maximum size of ${n} bytes (Content-Length: ${p}).`,
                })
            );
    }
    const r = e.body;
    if (r == null) return new Uint8Array(0);
    const a = r.getReader(),
        l = [];
    let i = 0;
    try {
        for (;;) {
            const { done: p, value: w } = await a.read();
            if (p) break;
            if (((i += w.length), i > n))
                throw new qe({ url: t, message: `Download of ${t} exceeded maximum size of ${n} bytes.` });
            l.push(w);
        }
    } finally {
        try {
            await a.cancel();
        } catch {
        } finally {
            a.releaseLock();
        }
    }
    const d = new Uint8Array(i);
    let c = 0;
    for (const p of l) (d.set(p, c), (c += p.length));
    return d;
}
var en = ({
        prefix: e,
        size: t = 16,
        alphabet: n = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        separator: o = "-",
    } = {}) => {
        const r = () => {
            const a = n.length,
                l = new Array(t);
            for (let i = 0; i < t; i++) l[i] = n[(Math.random() * a) | 0];
            return l.join("");
        };
        if (e == null) return r;
        if (n.includes(o))
            throw new Ar({
                argument: "separator",
                message: `The separator "${o}" must not be part of the alphabet "${n}".`,
            });
        return () => `${e}${o}${r()}`;
    },
    Ne = en();
function Ye(e) {
    return e == null ? "unknown error" : typeof e == "string" ? e : e instanceof Error ? e.message : JSON.stringify(e);
}
function _t(e) {
    return (
        (e instanceof Error || e instanceof DOMException) &&
        (e.name === "AbortError" || e.name === "ResponseAborted" || e.name === "TimeoutError")
    );
}
var eu = ["fetch failed", "failed to fetch"],
    tu = new Set([
        "ConnectionRefused",
        "ConnectionClosed",
        "FailedToOpenSocket",
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "EPIPE",
        "UND_ERR_SOCKET",
        "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT",
        "UND_ERR_CONNECT_TIMEOUT",
    ]);
function nu(e) {
    const t = new Set();
    let n = e;
    for (; n instanceof Error && !t.has(n);) {
        t.add(n);
        const o = n;
        if (typeof o.code == "string" && tu.has(o.code)) return o;
        n = n.cause;
    }
}
function to({ error: e, url: t, requestBodyValues: n }) {
    if (_t(e)) return e;
    if (e instanceof TypeError && eu.includes(e.message.toLowerCase())) {
        const r = e.cause;
        if (r != null)
            return new _e({
                message: `Cannot connect to API: ${r.message}`,
                cause: r,
                url: t,
                requestBodyValues: n,
                isRetryable: !0,
            });
    }
    const o = nu(e);
    return o != null
        ? _e.isInstance(e)
            ? new _e({
                  message: e.message,
                  cause: e.cause,
                  url: e.url,
                  requestBodyValues: e.requestBodyValues,
                  statusCode: e.statusCode,
                  responseHeaders: e.responseHeaders,
                  responseBody: e.responseBody,
                  data: e.data,
                  isRetryable: !0,
              })
            : new _e({
                  message: `Cannot connect to API: ${e instanceof Error ? e.message : o.message}`,
                  cause: e,
                  url: t,
                  requestBodyValues: n,
                  isRetryable: !0,
              })
        : e;
}
function no(e = globalThis) {
    var t, n, o;
    return e.window
        ? "runtime/browser"
        : (t = e.navigator) != null && t.userAgent
          ? `runtime/${e.navigator.userAgent.toLowerCase()}`
          : (o = (n = e.process) == null ? void 0 : n.versions) != null && o.node
            ? `runtime/node.js/${e.process.version.substring(0)}`
            : e.EdgeRuntime
              ? "runtime/vercel-edge"
              : "runtime/unknown";
}
function ou(e) {
    if (e == null) return {};
    const t = {};
    if (e instanceof Headers)
        e.forEach((n, o) => {
            t[o.toLowerCase()] = n;
        });
    else {
        Array.isArray(e) || (e = Object.entries(e));
        for (const [n, o] of e) o != null && (t[n.toLowerCase()] = o);
    }
    return t;
}
function vt(e, ...t) {
    const n = new Headers(ou(e)),
        o = n.get("user-agent") || "";
    return (n.set("user-agent", [o, ...t].filter(Boolean).join(" ")), Object.fromEntries(n.entries()));
}
var ni = "3.0.41",
    au = () => globalThis.fetch,
    dn = async ({
        url: e,
        headers: t = {},
        successfulResponseHandler: n,
        failedResponseHandler: o,
        abortSignal: r,
        fetch: a = au(),
    }) => {
        try {
            const l = await a(e, { method: "GET", headers: vt(t, `ai-sdk/provider-utils/${ni}`, no()), signal: r }),
                i = Nt(l);
            if (!l.ok) {
                let d;
                try {
                    d = await o({ response: l, url: e, requestBodyValues: {} });
                } catch (c) {
                    throw _t(c) || _e.isInstance(c)
                        ? c
                        : new _e({
                              message: "Failed to process error response",
                              cause: c,
                              statusCode: l.status,
                              url: e,
                              responseHeaders: i,
                              requestBodyValues: {},
                          });
                }
                throw d.value;
            }
            try {
                return await n({ response: l, url: e, requestBodyValues: {} });
            } catch (d) {
                throw d instanceof Error && (_t(d) || _e.isInstance(d))
                    ? d
                    : new _e({
                          message: "Failed to process successful response",
                          cause: d,
                          statusCode: l.status,
                          url: e,
                          responseHeaders: i,
                          requestBodyValues: {},
                      });
            }
        } catch (l) {
            throw to({ error: l, url: e, requestBodyValues: {} });
        }
    };
function ru({ mediaType: e, url: t, supportedUrls: n }) {
    return (
        (t = t.toLowerCase()),
        (e = e.toLowerCase()),
        Object.entries(n)
            .map(([o, r]) => {
                const a = o.toLowerCase();
                return a === "*" || a === "*/*"
                    ? { mediaTypePrefix: "", regexes: r }
                    : { mediaTypePrefix: a.replace(/\*/, ""), regexes: r };
            })
            .filter(({ mediaTypePrefix: o }) => e.startsWith(o))
            .flatMap(({ regexes: o }) => o)
            .some((o) => o.test(t))
    );
}
function oo({ apiKey: e, environmentVariableName: t, apiKeyParameterName: n = "apiKey", description: o }) {
    if (typeof e == "string") return e;
    if (e != null) throw new on({ message: `${o} API key must be a string.` });
    if (typeof process > "u")
        throw new on({
            message: `${o} API key is missing. Pass it using the '${n}' parameter. Environment variables is not supported in this environment.`,
        });
    if (((e = zr[t]), e == null))
        throw new on({
            message: `${o} API key is missing. Pass it using the '${n}' parameter or the ${t} environment variable.`,
        });
    if (typeof e != "string")
        throw new on({
            message: `${o} API key must be a string. The value of the ${t} environment variable is not a string.`,
        });
    return e;
}
function xt({ settingValue: e, environmentVariableName: t }) {
    if (typeof e == "string") return e;
    if (!(e != null || typeof process > "u") && ((e = zr[t]), !(e == null || typeof e != "string"))) return e;
}
function iu(e) {
    var t;
    const [n, o = ""] = e.toLowerCase().split("/");
    return (t = { mpeg: "mp3", "x-wav": "wav", opus: "ogg", mp4: "m4a", "x-m4a": "m4a" }[o]) != null ? t : o;
}
var su =
        /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/,
    lu =
        /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
function na(e) {
    const t = JSON.parse(e);
    return t === null || typeof t != "object" || (su.test(e) === !1 && lu.test(e) === !1) ? t : uu(t);
}
function uu(e) {
    let t = [e];
    for (; t.length;) {
        const n = t;
        t = [];
        for (const o of n) {
            if (Object.prototype.hasOwnProperty.call(o, "__proto__"))
                throw new SyntaxError("Object contains forbidden prototype property");
            if (
                Object.prototype.hasOwnProperty.call(o, "constructor") &&
                o.constructor !== null &&
                typeof o.constructor == "object" &&
                Object.prototype.hasOwnProperty.call(o.constructor, "prototype")
            )
                throw new SyntaxError("Object contains forbidden prototype property");
            for (const r in o) {
                const a = o[r];
                a && typeof a == "object" && t.push(a);
            }
        }
    }
    return e;
}
function oi(e) {
    const { stackTraceLimit: t } = Error;
    try {
        Error.stackTraceLimit = 0;
    } catch {
        return na(e);
    }
    try {
        return na(e);
    } finally {
        Error.stackTraceLimit = t;
    }
}
var pn = Symbol.for("vercel.ai.validator");
function cu(e) {
    return { [pn]: !0, validate: e };
}
function du(e) {
    return typeof e == "object" && e !== null && pn in e && e[pn] === !0 && "validate" in e;
}
function ve(e) {
    let t;
    return () => (t == null && (t = e()), t);
}
function pu(e) {
    return du(e) ? e : "~standard" in e ? fu(e) : e();
}
function fu(e) {
    return cu(async (t) => {
        const n = await e["~standard"].validate(t);
        return n.issues == null
            ? { success: !0, value: n.value }
            : { success: !1, error: new Wt({ value: t, cause: n.issues }) };
    });
}
async function Ce({ value: e, schema: t }) {
    const n = await at({ value: e, schema: t });
    if (!n.success) throw Wt.wrap({ value: e, cause: n.error });
    return n.value;
}
async function at({ value: e, schema: t }) {
    const n = pu(t);
    try {
        if (n.validate == null) return { success: !0, value: e, rawValue: e };
        const o = await n.validate(e);
        return o.success
            ? { success: !0, value: o.value, rawValue: e }
            : { success: !1, error: Wt.wrap({ value: e, cause: o.error }), rawValue: e };
    } catch (o) {
        return { success: !1, error: Wt.wrap({ value: e, cause: o }), rawValue: e };
    }
}
async function mu({ text: e, schema: t }) {
    try {
        const n = oi(e);
        return t == null ? n : Ce({ value: n, schema: t });
    } catch (n) {
        throw cn.isInstance(n) || Wt.isInstance(n) ? n : new cn({ text: e, cause: n });
    }
}
async function yt({ text: e, schema: t }) {
    try {
        const n = oi(e);
        return t == null ? { success: !0, value: n, rawValue: n } : await at({ value: n, schema: t });
    } catch (n) {
        return { success: !1, error: cn.isInstance(n) ? n : new cn({ text: e, cause: n }), rawValue: void 0 };
    }
}
function hu({ stream: e, schema: t }) {
    return e
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new ql())
        .pipeThrough(
            new TransformStream({
                async transform({ data: n }, o) {
                    n !== "[DONE]" && o.enqueue(await yt({ text: n, schema: t }));
                },
            }),
        );
}
async function Ie({ provider: e, providerOptions: t, schema: n }) {
    if (t?.[e] == null) return;
    const o = await at({ value: t[e], schema: n });
    if (!o.success)
        throw new Ar({ argument: "providerOptions", message: `invalid ${e} provider options`, cause: o.error });
    return o.value;
}
var gu = () => globalThis.fetch,
    ke = async ({
        url: e,
        headers: t,
        body: n,
        failedResponseHandler: o,
        successfulResponseHandler: r,
        abortSignal: a,
        fetch: l,
    }) =>
        ai({
            url: e,
            headers: { "Content-Type": "application/json", ...t },
            body: { content: JSON.stringify(n), values: n },
            failedResponseHandler: o,
            successfulResponseHandler: r,
            abortSignal: a,
            fetch: l,
        }),
    _u = async ({
        url: e,
        headers: t,
        formData: n,
        failedResponseHandler: o,
        successfulResponseHandler: r,
        abortSignal: a,
        fetch: l,
    }) =>
        ai({
            url: e,
            headers: t,
            body: { content: n, values: Object.fromEntries(n.entries()) },
            failedResponseHandler: o,
            successfulResponseHandler: r,
            abortSignal: a,
            fetch: l,
        }),
    ai = async ({
        url: e,
        headers: t = {},
        body: n,
        successfulResponseHandler: o,
        failedResponseHandler: r,
        abortSignal: a,
        fetch: l = gu(),
    }) => {
        try {
            const i = await l(e, {
                    method: "POST",
                    headers: vt(t, `ai-sdk/provider-utils/${ni}`, no()),
                    body: n.content,
                    signal: a,
                }),
                d = Nt(i);
            if (!i.ok) {
                let c;
                try {
                    c = await r({ response: i, url: e, requestBodyValues: n.values });
                } catch (p) {
                    throw _t(p) || _e.isInstance(p)
                        ? p
                        : new _e({
                              message: "Failed to process error response",
                              cause: p,
                              statusCode: i.status,
                              url: e,
                              responseHeaders: d,
                              requestBodyValues: n.values,
                          });
                }
                throw c.value;
            }
            try {
                return await o({ response: i, url: e, requestBodyValues: n.values });
            } catch (c) {
                throw c instanceof Error && (_t(c) || _e.isInstance(c))
                    ? c
                    : new _e({
                          message: "Failed to process successful response",
                          cause: c,
                          statusCode: i.status,
                          url: e,
                          responseHeaders: d,
                          requestBodyValues: n.values,
                      });
            }
        } catch (i) {
            throw to({ error: i, url: e, requestBodyValues: n.values });
        }
    };
function Pe({ id: e, name: t, inputSchema: n }) {
    return ({
        execute: o,
        outputSchema: r,
        toModelOutput: a,
        onInputStart: l,
        onInputDelta: i,
        onInputAvailable: d,
        ...c
    }) => ({
        type: "provider-defined",
        id: e,
        name: t,
        args: c,
        inputSchema: n,
        outputSchema: r,
        execute: o,
        toModelOutput: a,
        onInputStart: l,
        onInputDelta: i,
        onInputAvailable: d,
    });
}
function Le({ id: e, name: t, inputSchema: n, outputSchema: o }) {
    return ({ execute: r, toModelOutput: a, onInputStart: l, onInputDelta: i, onInputAvailable: d, ...c }) => ({
        type: "provider-defined",
        id: e,
        name: t,
        args: c,
        inputSchema: n,
        outputSchema: o,
        execute: r,
        toModelOutput: a,
        onInputStart: l,
        onInputDelta: i,
        onInputAvailable: d,
    });
}
async function Ee(e) {
    return (typeof e == "function" && (e = e()), Promise.resolve(e));
}
var yu = new TextDecoder();
function vu({ stream: e, url: t, requestBodyValues: n, statusCode: o, responseHeaders: r }) {
    const a = e.getReader();
    let l = !1;
    const i = () => {
        l || (a.releaseLock(), (l = !0));
    };
    return new ReadableStream({
        async pull(d) {
            try {
                const { done: c, value: p } = await a.read();
                c ? (i(), d.close()) : d.enqueue(p);
            } catch (c) {
                if ((i(), _t(c))) {
                    d.error(c);
                    return;
                }
                d.error(
                    to({
                        error: new _e({
                            message: "Failed to process successful response",
                            cause: c,
                            statusCode: o,
                            url: t,
                            responseHeaders: r,
                            requestBodyValues: n,
                        }),
                        url: t,
                        requestBodyValues: n,
                    }),
                );
            }
        },
        async cancel(d) {
            try {
                await a.cancel(d);
            } finally {
                i();
            }
        },
    });
}
async function ri({ response: e, url: t }) {
    return yu.decode(await ti({ response: e, url: t }));
}
var Xe =
        ({ errorSchema: e, errorToMessage: t, isRetryable: n }) =>
        async ({ response: o, url: r, requestBodyValues: a }) => {
            const l = await ri({ response: o, url: r }),
                i = Nt(o);
            if (l.trim() === "")
                return {
                    responseHeaders: i,
                    value: new _e({
                        message: o.statusText,
                        url: r,
                        requestBodyValues: a,
                        statusCode: o.status,
                        responseHeaders: i,
                        responseBody: l,
                        isRetryable: n?.(o),
                    }),
                };
            try {
                const d = await mu({ text: l, schema: e });
                return {
                    responseHeaders: i,
                    value: new _e({
                        message: t(d),
                        url: r,
                        requestBodyValues: a,
                        statusCode: o.status,
                        responseHeaders: i,
                        responseBody: l,
                        data: d,
                        isRetryable: n?.(o, d),
                    }),
                };
            } catch {
                return {
                    responseHeaders: i,
                    value: new _e({
                        message: o.statusText,
                        url: r,
                        requestBodyValues: a,
                        statusCode: o.status,
                        responseHeaders: i,
                        responseBody: l,
                        isRetryable: n?.(o),
                    }),
                };
            }
        },
    Pt =
        (e) =>
        async ({ response: t, url: n, requestBodyValues: o }) => {
            const r = Nt(t);
            if (t.body == null) throw new Il({});
            return {
                responseHeaders: r,
                value: hu({
                    stream: vu({
                        stream: t.body,
                        url: n,
                        requestBodyValues: o,
                        statusCode: t.status,
                        responseHeaders: r,
                    }),
                    schema: e,
                }),
            };
        },
    Re =
        (e) =>
        async ({ response: t, url: n, requestBodyValues: o }) => {
            const r = await ri({ response: t, url: n }),
                a = await yt({ text: r, schema: e }),
                l = Nt(t);
            if (!a.success)
                throw new _e({
                    message: "Invalid JSON response",
                    cause: a.error,
                    statusCode: t.status,
                    responseHeaders: l,
                    responseBody: r,
                    url: n,
                    requestBodyValues: o,
                });
            return { responseHeaders: l, value: a.value, rawValue: a.rawValue };
        },
    bu =
        () =>
        async ({ response: e, url: t, requestBodyValues: n }) => {
            const o = Nt(e);
            if (!e.body)
                throw new _e({
                    message: "Response body is empty",
                    url: t,
                    requestBodyValues: n,
                    statusCode: e.status,
                    responseHeaders: o,
                    responseBody: void 0,
                });
            try {
                const r = await e.arrayBuffer();
                return { responseHeaders: o, value: new Uint8Array(r) };
            } catch (r) {
                throw new _e({
                    message: "Failed to read response as array buffer",
                    url: t,
                    requestBodyValues: n,
                    statusCode: e.status,
                    responseHeaders: o,
                    responseBody: void 0,
                    cause: r,
                });
            }
        },
    Hn = Symbol.for("vercel.ai.schema");
function K(e) {
    let t;
    return () => (t == null && (t = e()), t);
}
function ao(e, { validate: t } = {}) {
    return {
        [Hn]: !0,
        _type: void 0,
        [pn]: !0,
        get jsonSchema() {
            return (typeof e == "function" && (e = e()), e);
        },
        validate: t,
    };
}
function Ht(e) {
    if (e.type === "object") {
        const { additionalProperties: t } = e;
        e.additionalProperties = t != null && typeof t != "boolean" ? Ht(t) : !1;
        const n = e.properties;
        if (n != null) for (const o in n) n[o] = Ht(n[o]);
    }
    return (
        e.type === "array" &&
            e.items != null &&
            (Array.isArray(e.items) ? (e.items = e.items.map((t) => Ht(t))) : (e.items = Ht(e.items))),
        e
    );
}
var wu = Symbol("Let zodToJsonSchema decide on which parser to use"),
    oa = {
        name: void 0,
        $refStrategy: "root",
        basePath: ["#"],
        effectStrategy: "input",
        pipeStrategy: "all",
        dateStrategy: "format:date-time",
        mapStrategy: "entries",
        removeAdditionalStrategy: "passthrough",
        allowedAdditionalProperties: !0,
        rejectedAdditionalProperties: !1,
        definitionPath: "definitions",
        strictUnions: !1,
        definitions: {},
        errorMessages: !1,
        patternStrategy: "escape",
        applyRegexFlags: !1,
        emailStrategy: "format:email",
        base64Strategy: "contentEncoding:base64",
        nameStrategy: "ref",
    },
    xu = (e) => (typeof e == "string" ? { ...oa, name: e } : { ...oa, ...e });
function Fe() {
    return {};
}
function Tu(e, t) {
    var n, o, r;
    const a = { type: "array" };
    return (
        (n = e.type) != null &&
            n._def &&
            ((r = (o = e.type) == null ? void 0 : o._def) == null ? void 0 : r.typeName) !== ae.ZodAny &&
            (a.items = fe(e.type._def, { ...t, currentPath: [...t.currentPath, "items"] })),
        e.minLength && (a.minItems = e.minLength.value),
        e.maxLength && (a.maxItems = e.maxLength.value),
        e.exactLength && ((a.minItems = e.exactLength.value), (a.maxItems = e.exactLength.value)),
        a
    );
}
function ku(e) {
    const t = { type: "integer", format: "int64" };
    if (!e.checks) return t;
    for (const n of e.checks)
        switch (n.kind) {
            case "min":
                n.inclusive ? (t.minimum = n.value) : (t.exclusiveMinimum = n.value);
                break;
            case "max":
                n.inclusive ? (t.maximum = n.value) : (t.exclusiveMaximum = n.value);
                break;
            case "multipleOf":
                t.multipleOf = n.value;
                break;
        }
    return t;
}
function Iu() {
    return { type: "boolean" };
}
function ii(e, t) {
    return fe(e.type._def, t);
}
var Su = (e, t) => fe(e.innerType._def, t);
function si(e, t, n) {
    const o = n ?? t.dateStrategy;
    if (Array.isArray(o)) return { anyOf: o.map((r, a) => si(e, t, r)) };
    switch (o) {
        case "string":
        case "format:date-time":
            return { type: "string", format: "date-time" };
        case "format:date":
            return { type: "string", format: "date" };
        case "integer":
            return Cu(e);
    }
}
var Cu = (e) => {
    const t = { type: "integer", format: "unix-time" };
    for (const n of e.checks)
        switch (n.kind) {
            case "min":
                t.minimum = n.value;
                break;
            case "max":
                t.maximum = n.value;
                break;
        }
    return t;
};
function Eu(e, t) {
    return { ...fe(e.innerType._def, t), default: e.defaultValue() };
}
function Ru(e, t) {
    return t.effectStrategy === "input" ? fe(e.schema._def, t) : Fe();
}
function Ou(e) {
    return { type: "string", enum: Array.from(e.values) };
}
var Au = (e) => ("type" in e && e.type === "string" ? !1 : "allOf" in e);
function Mu(e, t) {
    const n = [
            fe(e.left._def, { ...t, currentPath: [...t.currentPath, "allOf", "0"] }),
            fe(e.right._def, { ...t, currentPath: [...t.currentPath, "allOf", "1"] }),
        ].filter((r) => !!r),
        o = [];
    return (
        n.forEach((r) => {
            if (Au(r)) o.push(...r.allOf);
            else {
                let a = r;
                if ("additionalProperties" in r && r.additionalProperties === !1) {
                    const { additionalProperties: l, ...i } = r;
                    a = i;
                }
                o.push(a);
            }
        }),
        o.length ? { allOf: o } : void 0
    );
}
function Nu(e) {
    const t = typeof e.value;
    return t !== "bigint" && t !== "number" && t !== "boolean" && t !== "string"
        ? { type: Array.isArray(e.value) ? "array" : "object" }
        : { type: t === "bigint" ? "integer" : t, const: e.value };
}
var On = void 0,
    Ze = {
        cuid: /^[cC][^\s-]{8,}$/,
        cuid2: /^[0-9a-z]+$/,
        ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
        email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/,
        emoji: () => (On === void 0 && (On = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u")), On),
        uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
        ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
        ipv4Cidr:
            /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
        ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
        ipv6Cidr:
            /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
        base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
        base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
        nanoid: /^[a-zA-Z0-9_-]{21}$/,
        jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    };
function li(e, t) {
    const n = { type: "string" };
    if (e.checks)
        for (const o of e.checks)
            switch (o.kind) {
                case "min":
                    n.minLength = typeof n.minLength == "number" ? Math.max(n.minLength, o.value) : o.value;
                    break;
                case "max":
                    n.maxLength = typeof n.maxLength == "number" ? Math.min(n.maxLength, o.value) : o.value;
                    break;
                case "email":
                    switch (t.emailStrategy) {
                        case "format:email":
                            ze(n, "email", o.message, t);
                            break;
                        case "format:idn-email":
                            ze(n, "idn-email", o.message, t);
                            break;
                        case "pattern:zod":
                            De(n, Ze.email, o.message, t);
                            break;
                    }
                    break;
                case "url":
                    ze(n, "uri", o.message, t);
                    break;
                case "uuid":
                    ze(n, "uuid", o.message, t);
                    break;
                case "regex":
                    De(n, o.regex, o.message, t);
                    break;
                case "cuid":
                    De(n, Ze.cuid, o.message, t);
                    break;
                case "cuid2":
                    De(n, Ze.cuid2, o.message, t);
                    break;
                case "startsWith":
                    De(n, RegExp(`^${An(o.value, t)}`), o.message, t);
                    break;
                case "endsWith":
                    De(n, RegExp(`${An(o.value, t)}$`), o.message, t);
                    break;
                case "datetime":
                    ze(n, "date-time", o.message, t);
                    break;
                case "date":
                    ze(n, "date", o.message, t);
                    break;
                case "time":
                    ze(n, "time", o.message, t);
                    break;
                case "duration":
                    ze(n, "duration", o.message, t);
                    break;
                case "length":
                    ((n.minLength = typeof n.minLength == "number" ? Math.max(n.minLength, o.value) : o.value),
                        (n.maxLength = typeof n.maxLength == "number" ? Math.min(n.maxLength, o.value) : o.value));
                    break;
                case "includes": {
                    De(n, RegExp(An(o.value, t)), o.message, t);
                    break;
                }
                case "ip": {
                    (o.version !== "v6" && ze(n, "ipv4", o.message, t),
                        o.version !== "v4" && ze(n, "ipv6", o.message, t));
                    break;
                }
                case "base64url":
                    De(n, Ze.base64url, o.message, t);
                    break;
                case "jwt":
                    De(n, Ze.jwt, o.message, t);
                    break;
                case "cidr": {
                    (o.version !== "v6" && De(n, Ze.ipv4Cidr, o.message, t),
                        o.version !== "v4" && De(n, Ze.ipv6Cidr, o.message, t));
                    break;
                }
                case "emoji":
                    De(n, Ze.emoji(), o.message, t);
                    break;
                case "ulid": {
                    De(n, Ze.ulid, o.message, t);
                    break;
                }
                case "base64": {
                    switch (t.base64Strategy) {
                        case "format:binary": {
                            ze(n, "binary", o.message, t);
                            break;
                        }
                        case "contentEncoding:base64": {
                            n.contentEncoding = "base64";
                            break;
                        }
                        case "pattern:zod": {
                            De(n, Ze.base64, o.message, t);
                            break;
                        }
                    }
                    break;
                }
                case "nanoid":
                    De(n, Ze.nanoid, o.message, t);
            }
    return n;
}
function An(e, t) {
    return t.patternStrategy === "escape" ? $u(e) : e;
}
var Pu = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function $u(e) {
    let t = "";
    for (let n = 0; n < e.length; n++) (Pu.has(e[n]) || (t += "\\"), (t += e[n]));
    return t;
}
function ze(e, t, n, o) {
    var r;
    e.format || ((r = e.anyOf) != null && r.some((a) => a.format))
        ? (e.anyOf || (e.anyOf = []),
          e.format && (e.anyOf.push({ format: e.format }), delete e.format),
          e.anyOf.push({ format: t, ...(n && o.errorMessages && { errorMessage: { format: n } }) }))
        : (e.format = t);
}
function De(e, t, n, o) {
    var r;
    e.pattern || ((r = e.allOf) != null && r.some((a) => a.pattern))
        ? (e.allOf || (e.allOf = []),
          e.pattern && (e.allOf.push({ pattern: e.pattern }), delete e.pattern),
          e.allOf.push({ pattern: aa(t, o), ...(n && o.errorMessages && { errorMessage: { pattern: n } }) }))
        : (e.pattern = aa(t, o));
}
function aa(e, t) {
    var n;
    if (!t.applyRegexFlags || !e.flags) return e.source;
    const o = { i: e.flags.includes("i"), m: e.flags.includes("m"), s: e.flags.includes("s") },
        r = o.i ? e.source.toLowerCase() : e.source;
    let a = "",
        l = !1,
        i = !1,
        d = !1;
    for (let c = 0; c < r.length; c++) {
        if (l) {
            ((a += r[c]), (l = !1));
            continue;
        }
        if (o.i) {
            if (i) {
                if (r[c].match(/[a-z]/)) {
                    d
                        ? ((a += r[c]), (a += `${r[c - 2]}-${r[c]}`.toUpperCase()), (d = !1))
                        : r[c + 1] === "-" && (n = r[c + 2]) != null && n.match(/[a-z]/)
                          ? ((a += r[c]), (d = !0))
                          : (a += `${r[c]}${r[c].toUpperCase()}`);
                    continue;
                }
            } else if (r[c].match(/[a-z]/)) {
                a += `[${r[c]}${r[c].toUpperCase()}]`;
                continue;
            }
        }
        if (o.m) {
            if (r[c] === "^") {
                a += `(^|(?<=[\r
]))`;
                continue;
            } else if (r[c] === "$") {
                a += `($|(?=[\r
]))`;
                continue;
            }
        }
        if (o.s && r[c] === ".") {
            a += i
                ? `${r[c]}\r
`
                : `[${r[c]}\r
]`;
            continue;
        }
        ((a += r[c]), r[c] === "\\" ? (l = !0) : i && r[c] === "]" ? (i = !1) : !i && r[c] === "[" && (i = !0));
    }
    try {
        new RegExp(a);
    } catch {
        return (
            console.warn(
                `Could not convert regex pattern at ${t.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`,
            ),
            e.source
        );
    }
    return a;
}
function ui(e, t) {
    var n, o, r, a, l, i;
    const d = {
        type: "object",
        additionalProperties:
            (n = fe(e.valueType._def, { ...t, currentPath: [...t.currentPath, "additionalProperties"] })) != null
                ? n
                : t.allowedAdditionalProperties,
    };
    if (
        ((o = e.keyType) == null ? void 0 : o._def.typeName) === ae.ZodString &&
        (r = e.keyType._def.checks) != null &&
        r.length
    ) {
        const { type: c, ...p } = li(e.keyType._def, t);
        return { ...d, propertyNames: p };
    } else {
        if (((a = e.keyType) == null ? void 0 : a._def.typeName) === ae.ZodEnum)
            return { ...d, propertyNames: { enum: e.keyType._def.values } };
        if (
            ((l = e.keyType) == null ? void 0 : l._def.typeName) === ae.ZodBranded &&
            e.keyType._def.type._def.typeName === ae.ZodString &&
            (i = e.keyType._def.type._def.checks) != null &&
            i.length
        ) {
            const { type: c, ...p } = ii(e.keyType._def, t);
            return { ...d, propertyNames: p };
        }
    }
    return d;
}
function Du(e, t) {
    if (t.mapStrategy === "record") return ui(e, t);
    const n = fe(e.keyType._def, { ...t, currentPath: [...t.currentPath, "items", "items", "0"] }) || Fe(),
        o = fe(e.valueType._def, { ...t, currentPath: [...t.currentPath, "items", "items", "1"] }) || Fe();
    return { type: "array", maxItems: 125, items: { type: "array", items: [n, o], minItems: 2, maxItems: 2 } };
}
function qu(e) {
    const t = e.values,
        o = Object.keys(e.values)
            .filter((a) => typeof t[t[a]] != "number")
            .map((a) => t[a]),
        r = Array.from(new Set(o.map((a) => typeof a)));
    return { type: r.length === 1 ? (r[0] === "string" ? "string" : "number") : ["string", "number"], enum: o };
}
function Uu() {
    return { not: Fe() };
}
function Lu() {
    return { type: "null" };
}
var Vn = { ZodString: "string", ZodNumber: "number", ZodBigInt: "integer", ZodBoolean: "boolean", ZodNull: "null" };
function ju(e, t) {
    const n = e.options instanceof Map ? Array.from(e.options.values()) : e.options;
    if (n.every((o) => o._def.typeName in Vn && (!o._def.checks || !o._def.checks.length))) {
        const o = n.reduce((r, a) => {
            const l = Vn[a._def.typeName];
            return l && !r.includes(l) ? [...r, l] : r;
        }, []);
        return { type: o.length > 1 ? o : o[0] };
    } else if (n.every((o) => o._def.typeName === "ZodLiteral" && !o.description)) {
        const o = n.reduce((r, a) => {
            const l = typeof a._def.value;
            switch (l) {
                case "string":
                case "number":
                case "boolean":
                    return [...r, l];
                case "bigint":
                    return [...r, "integer"];
                case "object":
                    if (a._def.value === null) return [...r, "null"];
                default:
                    return r;
            }
        }, []);
        if (o.length === n.length) {
            const r = o.filter((a, l, i) => i.indexOf(a) === l);
            return {
                type: r.length > 1 ? r : r[0],
                enum: n.reduce((a, l) => (a.includes(l._def.value) ? a : [...a, l._def.value]), []),
            };
        }
    } else if (n.every((o) => o._def.typeName === "ZodEnum"))
        return { type: "string", enum: n.reduce((o, r) => [...o, ...r._def.values.filter((a) => !o.includes(a))], []) };
    return Bu(e, t);
}
var Bu = (e, t) => {
    const n = (e.options instanceof Map ? Array.from(e.options.values()) : e.options)
        .map((o, r) => fe(o._def, { ...t, currentPath: [...t.currentPath, "anyOf", `${r}`] }))
        .filter((o) => !!o && (!t.strictUnions || (typeof o == "object" && Object.keys(o).length > 0)));
    return n.length ? { anyOf: n } : void 0;
};
function Gu(e, t) {
    if (
        ["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(e.innerType._def.typeName) &&
        (!e.innerType._def.checks || !e.innerType._def.checks.length)
    )
        return { type: [Vn[e.innerType._def.typeName], "null"] };
    const n = fe(e.innerType._def, { ...t, currentPath: [...t.currentPath, "anyOf", "0"] });
    return n && { anyOf: [n, { type: "null" }] };
}
function Fu(e) {
    const t = { type: "number" };
    if (!e.checks) return t;
    for (const n of e.checks)
        switch (n.kind) {
            case "int":
                t.type = "integer";
                break;
            case "min":
                n.inclusive ? (t.minimum = n.value) : (t.exclusiveMinimum = n.value);
                break;
            case "max":
                n.inclusive ? (t.maximum = n.value) : (t.exclusiveMaximum = n.value);
                break;
            case "multipleOf":
                t.multipleOf = n.value;
                break;
        }
    return t;
}
function Hu(e, t) {
    const n = { type: "object", properties: {} },
        o = [],
        r = e.shape();
    for (const l in r) {
        let i = r[l];
        if (i === void 0 || i._def === void 0) continue;
        const d = Ju(i),
            c = fe(i._def, {
                ...t,
                currentPath: [...t.currentPath, "properties", l],
                propertyPath: [...t.currentPath, "properties", l],
            });
        c !== void 0 && ((n.properties[l] = c), d || o.push(l));
    }
    o.length && (n.required = o);
    const a = Vu(e, t);
    return (a !== void 0 && (n.additionalProperties = a), n);
}
function Vu(e, t) {
    if (e.catchall._def.typeName !== "ZodNever")
        return fe(e.catchall._def, { ...t, currentPath: [...t.currentPath, "additionalProperties"] });
    switch (e.unknownKeys) {
        case "passthrough":
            return t.allowedAdditionalProperties;
        case "strict":
            return t.rejectedAdditionalProperties;
        case "strip":
            return t.removeAdditionalStrategy === "strict"
                ? t.allowedAdditionalProperties
                : t.rejectedAdditionalProperties;
    }
}
function Ju(e) {
    try {
        return e.isOptional();
    } catch {
        return !0;
    }
}
var Wu = (e, t) => {
        var n;
        if (t.currentPath.toString() === ((n = t.propertyPath) == null ? void 0 : n.toString()))
            return fe(e.innerType._def, t);
        const o = fe(e.innerType._def, { ...t, currentPath: [...t.currentPath, "anyOf", "1"] });
        return o ? { anyOf: [{ not: Fe() }, o] } : Fe();
    },
    Zu = (e, t) => {
        if (t.pipeStrategy === "input") return fe(e.in._def, t);
        if (t.pipeStrategy === "output") return fe(e.out._def, t);
        const n = fe(e.in._def, { ...t, currentPath: [...t.currentPath, "allOf", "0"] }),
            o = fe(e.out._def, { ...t, currentPath: [...t.currentPath, "allOf", n ? "1" : "0"] });
        return { allOf: [n, o].filter((r) => r !== void 0) };
    };
function zu(e, t) {
    return fe(e.type._def, t);
}
function Ku(e, t) {
    const o = {
        type: "array",
        uniqueItems: !0,
        items: fe(e.valueType._def, { ...t, currentPath: [...t.currentPath, "items"] }),
    };
    return (e.minSize && (o.minItems = e.minSize.value), e.maxSize && (o.maxItems = e.maxSize.value), o);
}
function Yu(e, t) {
    return e.rest
        ? {
              type: "array",
              minItems: e.items.length,
              items: e.items
                  .map((n, o) => fe(n._def, { ...t, currentPath: [...t.currentPath, "items", `${o}`] }))
                  .reduce((n, o) => (o === void 0 ? n : [...n, o]), []),
              additionalItems: fe(e.rest._def, { ...t, currentPath: [...t.currentPath, "additionalItems"] }),
          }
        : {
              type: "array",
              minItems: e.items.length,
              maxItems: e.items.length,
              items: e.items
                  .map((n, o) => fe(n._def, { ...t, currentPath: [...t.currentPath, "items", `${o}`] }))
                  .reduce((n, o) => (o === void 0 ? n : [...n, o]), []),
          };
}
function Xu() {
    return { not: Fe() };
}
function Qu() {
    return Fe();
}
var ec = (e, t) => fe(e.innerType._def, t),
    tc = (e, t, n) => {
        switch (t) {
            case ae.ZodString:
                return li(e, n);
            case ae.ZodNumber:
                return Fu(e);
            case ae.ZodObject:
                return Hu(e, n);
            case ae.ZodBigInt:
                return ku(e);
            case ae.ZodBoolean:
                return Iu();
            case ae.ZodDate:
                return si(e, n);
            case ae.ZodUndefined:
                return Xu();
            case ae.ZodNull:
                return Lu();
            case ae.ZodArray:
                return Tu(e, n);
            case ae.ZodUnion:
            case ae.ZodDiscriminatedUnion:
                return ju(e, n);
            case ae.ZodIntersection:
                return Mu(e, n);
            case ae.ZodTuple:
                return Yu(e, n);
            case ae.ZodRecord:
                return ui(e, n);
            case ae.ZodLiteral:
                return Nu(e);
            case ae.ZodEnum:
                return Ou(e);
            case ae.ZodNativeEnum:
                return qu(e);
            case ae.ZodNullable:
                return Gu(e, n);
            case ae.ZodOptional:
                return Wu(e, n);
            case ae.ZodMap:
                return Du(e, n);
            case ae.ZodSet:
                return Ku(e, n);
            case ae.ZodLazy:
                return () => e.getter()._def;
            case ae.ZodPromise:
                return zu(e, n);
            case ae.ZodNaN:
            case ae.ZodNever:
                return Uu();
            case ae.ZodEffects:
                return Ru(e, n);
            case ae.ZodAny:
                return Fe();
            case ae.ZodUnknown:
                return Qu();
            case ae.ZodDefault:
                return Eu(e, n);
            case ae.ZodBranded:
                return ii(e, n);
            case ae.ZodReadonly:
                return ec(e, n);
            case ae.ZodCatch:
                return Su(e, n);
            case ae.ZodPipeline:
                return Zu(e, n);
            case ae.ZodFunction:
            case ae.ZodVoid:
            case ae.ZodSymbol:
                return;
            default:
                return ((o) => {})();
        }
    },
    nc = (e, t) => {
        let n = 0;
        for (; n < e.length && n < t.length && e[n] === t[n]; n++);
        return [(e.length - n).toString(), ...t.slice(n)].join("/");
    };
function fe(e, t, n = !1) {
    var o;
    const r = t.seen.get(e);
    if (t.override) {
        const d = (o = t.override) == null ? void 0 : o.call(t, e, t, r, n);
        if (d !== wu) return d;
    }
    if (r && !n) {
        const d = oc(r, t);
        if (d !== void 0) return d;
    }
    const a = { def: e, path: t.currentPath, jsonSchema: void 0 };
    t.seen.set(e, a);
    const l = tc(e, e.typeName, t),
        i = typeof l == "function" ? fe(l(), t) : l;
    if ((i && ac(e, t, i), t.postProcess)) {
        const d = t.postProcess(i, e, t);
        return ((a.jsonSchema = i), d);
    }
    return ((a.jsonSchema = i), i);
}
var oc = (e, t) => {
        switch (t.$refStrategy) {
            case "root":
                return { $ref: e.path.join("/") };
            case "relative":
                return { $ref: nc(t.currentPath, e.path) };
            case "none":
            case "seen":
                return e.path.length < t.currentPath.length && e.path.every((n, o) => t.currentPath[o] === n)
                    ? (console.warn(`Recursive reference detected at ${t.currentPath.join("/")}! Defaulting to any`),
                      Fe())
                    : t.$refStrategy === "seen"
                      ? Fe()
                      : void 0;
        }
    },
    ac = (e, t, n) => (e.description && (n.description = e.description), n),
    rc = (e) => {
        const t = xu(e),
            n = t.name !== void 0 ? [...t.basePath, t.definitionPath, t.name] : t.basePath;
        return {
            ...t,
            currentPath: n,
            propertyPath: void 0,
            seen: new Map(
                Object.entries(t.definitions).map(([o, r]) => [
                    r._def,
                    { def: r._def, path: [...t.basePath, t.definitionPath, o], jsonSchema: void 0 },
                ]),
            ),
        };
    },
    ic = (e, t) => {
        var n;
        const o = rc(t);
        let r =
            typeof t == "object" && t.definitions
                ? Object.entries(t.definitions).reduce((c, [p, w]) => {
                      var y;
                      return {
                          ...c,
                          [p]:
                              (y = fe(w._def, { ...o, currentPath: [...o.basePath, o.definitionPath, p] }, !0)) != null
                                  ? y
                                  : Fe(),
                      };
                  }, {})
                : void 0;
        const a = typeof t == "string" ? t : t?.nameStrategy === "title" ? void 0 : t?.name,
            l =
                (n = fe(e._def, a === void 0 ? o : { ...o, currentPath: [...o.basePath, o.definitionPath, a] }, !1)) !=
                null
                    ? n
                    : Fe(),
            i = typeof t == "object" && t.name !== void 0 && t.nameStrategy === "title" ? t.name : void 0;
        i !== void 0 && (l.title = i);
        const d =
            a === void 0
                ? r
                    ? { ...l, [o.definitionPath]: r }
                    : l
                : {
                      $ref: [...(o.$refStrategy === "relative" ? [] : o.basePath), o.definitionPath, a].join("/"),
                      [o.definitionPath]: { ...r, [a]: l },
                  };
        return ((d.$schema = "http://json-schema.org/draft-07/schema#"), d);
    },
    sc = ic;
function lc(e, t) {
    var n;
    const o = (n = void 0) != null ? n : !1;
    return ao(() => sc(e, { $refStrategy: o ? "root" : "none" }), {
        validate: async (r) => {
            const a = await e.safeParseAsync(r);
            return a.success ? { success: !0, value: a.data } : { success: !1, error: a.error };
        },
    });
}
function uc(e, t) {
    var n;
    const o = (n = void 0) != null ? n : !1;
    return ao(() => Ht(ml(e, { target: "draft-7", io: "input", reused: o ? "ref" : "inline" })), {
        validate: async (r) => {
            const a = await fl(e, r);
            return a.success ? { success: !0, value: a.data } : { success: !1, error: a.error };
        },
    });
}
function cc(e) {
    return "_zod" in e;
}
function G(e, t) {
    return cc(e) ? uc(e) : lc(e);
}
function dc(e) {
    return typeof e == "object" && e !== null && Hn in e && e[Hn] === !0 && "jsonSchema" in e && "validate" in e;
}
function vn(e) {
    return e == null
        ? ao({ properties: {}, additionalProperties: !1 })
        : dc(e)
          ? e
          : typeof e == "function"
            ? e()
            : G(e);
}
function pc(e) {
    if (typeof e != "string") return !1;
    const t = e.trimStart()[0];
    return t === "{" || t === "[";
}
var fc = class {
        constructor(e = "") {
            ((this.structure = { kind: "undetermined" }), this.append(e));
        }
        get hasCompleteStructuredValue() {
            return this.structure.kind === "structured" && this.structure.complete === !0;
        }
        append(e) {
            let t = this.structure;
            for (const n of e) {
                if (t.kind === "undetermined") {
                    if (/\s/.test(n)) continue;
                    if (n !== "{" && n !== "[") {
                        t = { kind: "other" };
                        continue;
                    }
                    t = { kind: "structured", stack: [n], inString: !1, escaped: !1, complete: !1 };
                    continue;
                }
                if (!(t.kind !== "structured" || t.complete)) {
                    if (t.inString) {
                        t.escaped ? (t.escaped = !1) : n === "\\" ? (t.escaped = !0) : n === '"' && (t.inString = !1);
                        continue;
                    }
                    if (n === '"') t.inString = !0;
                    else if (n === "{" || n === "[") t.stack.push(n);
                    else if (n === "}" || n === "]") {
                        const o = n === "}" ? "{" : "[";
                        if (t.stack[t.stack.length - 1] !== o) {
                            t = { kind: "other" };
                            continue;
                        }
                        (t.stack.pop(), t.stack.length === 0 && (t.complete = !0));
                    }
                }
            }
            this.structure = t;
        }
    },
    mc = class {
        constructor(e, t = {}) {
            ((this.toolCalls = []),
                (this.toolCallsById = new Map()),
                (this.toolCallsByIndex = new Map()),
                (this.usedToolCallIds = new Set()),
                (this.nextGeneratedIdSuffixes = new Map()));
            var n, o;
            ((this.controller = e),
                (this._generateId = (n = t.generateId) != null ? n : Ne),
                (this.typeValidation = (o = t.typeValidation) != null ? o : "none"),
                (this.extractMetadata = t.extractMetadata),
                (this.buildToolCallProviderMetadata = t.buildToolCallProviderMetadata));
        }
        processDelta(e) {
            var t, n;
            const o = (t = e.function) == null ? void 0 : t.name,
                r = typeof o == "string" && o.trim().length === 0,
                a = this.getNonBlankString(e.id),
                l = this.getNonBlankString(o),
                { index: i } = e,
                d = this.resolveToolCall({
                    wireId: a,
                    index: i,
                    name: l,
                    hasExplicitCallStart: l != null && pc((n = e.function) == null ? void 0 : n.arguments),
                });
            if (d.kind === "ambiguous") return;
            let c;
            if (d.kind === "new") {
                if (r) return;
                c = this.processNewToolCall(e, { wireId: a, index: i, name: l });
            } else ((c = d.toolCall), a != null && this.associateWireId(c, a), this.processExistingToolCall(c, e));
            i != null && this.associateIndex(c, i);
        }
        flush() {
            const e = this.toolCalls.every((t) => t.index != null)
                ? [...this.toolCalls].sort((t, n) => t.index - n.index || t.sequence - n.sequence)
                : this.toolCalls;
            for (const t of e) t.hasFinished || this.finishToolCall(t);
        }
        resolveToolCall({ wireId: e, index: t, name: n, hasExplicitCallStart: o }) {
            const r = t != null ? this.toolCallsByIndex.get(t) : void 0,
                a = this.filterToolCallsByName(r, n);
            if (e != null) {
                const i = this.toolCallsById.get(e);
                if (i != null) {
                    if (t != null) {
                        const d = a.filter((p) => i.has(p)),
                            c = this.resolveMatchingToolCall(d, o);
                        return c.kind !== "new"
                            ? c
                            : n != null
                              ? { kind: "new" }
                              : r != null
                                ? { kind: "ambiguous" }
                                : this.resolveMatchingToolCall([...i], !1);
                    }
                    if (n != null) {
                        const d = [...i].filter((c) => c.function.name === n);
                        return this.resolveMatchingToolCall(d, o);
                    }
                    return this.resolveMatchingToolCall([...i], !1);
                }
                return a.length > 0 ? (o ? { kind: "new" } : this.resolveMatchingToolCall(a, !1)) : { kind: "new" };
            }
            if (r != null) return this.resolveMatchingToolCall(a, o);
            if (n != null) return { kind: "new" };
            const l = this.toolCalls.filter((i) => !i.hasFinished);
            return l.length === 1
                ? { kind: "existing", toolCall: l[0] }
                : l.length > 1
                  ? { kind: "ambiguous" }
                  : { kind: "new" };
        }
        filterToolCallsByName(e, t) {
            return e == null ? [] : [...e].filter((n) => t == null || n.function.name === t);
        }
        resolveMatchingToolCall(e, t) {
            if (e.length === 0) return { kind: "new" };
            if (!t) return e.length === 1 ? { kind: "existing", toolCall: e[0] } : { kind: "ambiguous" };
            const n = e.filter((o) => !o.argumentState.hasCompleteStructuredValue);
            return n.length === 1
                ? { kind: "existing", toolCall: n[0] }
                : n.length > 1
                  ? { kind: "ambiguous" }
                  : { kind: "new" };
        }
        processNewToolCall(e, { wireId: t, index: n, name: o }) {
            var r, a, l, i, d;
            if (this.typeValidation === "required") {
                if (e.type !== "function") throw new Vt({ data: e, message: "Expected 'function' type." });
            } else if (this.typeValidation === "if-present" && e.type != null && e.type !== "function")
                throw new Vt({ data: e, message: "Expected 'function' type." });
            if (o == null) throw new Vt({ data: e, message: "Expected 'function.name' to be a string." });
            const c = this.createToolCallId(t);
            this.controller.enqueue({ type: "tool-input-start", id: c, toolName: o });
            const p = {
                id: c,
                index: n ?? void 0,
                sequence: this.toolCalls.length,
                type: "function",
                function: {
                    name: o,
                    arguments: (a = (r = e.function) == null ? void 0 : r.arguments) != null ? a : "",
                },
                argumentState: new fc((i = (l = e.function) == null ? void 0 : l.arguments) != null ? i : ""),
                hasFinished: !1,
                metadata: (d = this.extractMetadata) == null ? void 0 : d.call(this, e),
            };
            return (
                this.toolCalls.push(p),
                t != null && this.associateWireId(p, t),
                p.function.arguments.length > 0 &&
                    this.controller.enqueue({ type: "tool-input-delta", id: p.id, delta: p.function.arguments }),
                p
            );
        }
        associateWireId(e, t) {
            let n = this.toolCallsById.get(t);
            (n == null && ((n = new Set()), this.toolCallsById.set(t, n)), n.add(e));
        }
        associateIndex(e, t) {
            let n = this.toolCallsByIndex.get(t);
            (n == null && ((n = new Set()), this.toolCallsByIndex.set(t, n)), n.add(e));
        }
        createToolCallId(e) {
            var t, n;
            if (e != null && !this.usedToolCallIds.has(e)) return (this.usedToolCallIds.add(e), e);
            const o = (t = this.getNonBlankString(this._generateId())) != null ? t : "tool-call";
            if (!this.usedToolCallIds.has(o)) return (this.usedToolCallIds.add(o), o);
            const r = (n = this.nextGeneratedIdSuffixes.get(o)) != null ? n : 1,
                a = r + this.usedToolCallIds.size;
            for (let l = r; l <= a; l++) {
                const i = `${o}-${l}`;
                if (!this.usedToolCallIds.has(i))
                    return (this.usedToolCallIds.add(i), this.nextGeneratedIdSuffixes.set(o, l + 1), i);
            }
            throw new Error("Failed to create a unique tool call ID.");
        }
        getNonBlankString(e) {
            return e != null && e.trim().length > 0 ? e : void 0;
        }
        processExistingToolCall(e, t) {
            var n;
            !e.hasFinished &&
                ((n = t.function) == null ? void 0 : n.arguments) != null &&
                (e.argumentState.append(t.function.arguments),
                (e.function.arguments += t.function.arguments),
                this.controller.enqueue({ type: "tool-input-delta", id: e.id, delta: t.function.arguments }));
        }
        finishToolCall(e) {
            var t;
            this.controller.enqueue({ type: "tool-input-end", id: e.id });
            const n = (t = this.buildToolCallProviderMetadata) == null ? void 0 : t.call(this, e.metadata);
            (this.controller.enqueue({
                type: "tool-call",
                toolCallId: e.id,
                toolName: e.function.name,
                input: e.function.arguments,
                ...(n ? { providerMetadata: n } : {}),
            }),
                (e.hasFinished = !0));
        }
    },
    { btoa: hc, atob: gc } = globalThis;
function ro(e) {
    const t = e.replace(/-/g, "+").replace(/_/g, "/"),
        n = gc(t);
    return Uint8Array.from(n, (o) => o.codePointAt(0));
}
function fn(e) {
    const t = [];
    for (let o = 0; o < e.length; o += 4096) t.push(String.fromCodePoint(...e.subarray(o, o + 4096)));
    return hc(t.join(""));
}
function ot(e) {
    return e instanceof Uint8Array ? fn(e) : e;
}
function bn(e) {
    return e?.replace(/\/$/, "");
}
function _c(e) {
    return e != null && typeof e[Symbol.asyncIterator] == "function";
}
async function* ci({ execute: e, input: t, options: n }) {
    const o = e(t, n);
    if (_c(o)) {
        let r;
        for await (const a of o) ((r = a), yield { type: "preliminary", output: a });
        yield { type: "final", output: r };
    } else yield { type: "final", output: await o };
}
var yc = "2.0.108",
    vc = K(() => G(u({ type: m("error"), error: u({ type: s(), message: s() }) }))),
    ra = Xe({ errorSchema: vc, errorToMessage: (e) => e.error.message }),
    di = u({ type: s(), category: s().nullish(), explanation: s().nullish(), recommended_model: s().nullish() }),
    bc = K(() =>
        G(
            u({
                type: m("message"),
                id: s().nullish(),
                model: s().nullish(),
                content: N(
                    ie("type", [
                        u({
                            type: m("text"),
                            text: s(),
                            citations: N(
                                ie("type", [
                                    u({
                                        type: m("web_search_result_location"),
                                        cited_text: s(),
                                        url: s(),
                                        title: s(),
                                        encrypted_index: s(),
                                    }),
                                    u({
                                        type: m("page_location"),
                                        cited_text: s(),
                                        document_index: f(),
                                        document_title: s().nullable(),
                                        start_page_number: f(),
                                        end_page_number: f(),
                                    }),
                                    u({
                                        type: m("char_location"),
                                        cited_text: s(),
                                        document_index: f(),
                                        document_title: s().nullable(),
                                        start_char_index: f(),
                                        end_char_index: f(),
                                    }),
                                ]),
                            ).optional(),
                        }),
                        u({ type: m("thinking"), thinking: s(), signature: s() }),
                        u({ type: m("redacted_thinking"), data: s() }),
                        u({ type: m("compaction"), content: s() }),
                        u({ type: m("tool_use"), id: s(), name: s(), input: Ue(), toolset_name: s().nullish() }),
                        u({ type: m("server_tool_use"), id: s(), name: s(), input: we(s(), Ue()).nullish() }),
                        u({
                            type: m("web_fetch_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                u({
                                    type: m("web_fetch_result"),
                                    url: s(),
                                    retrieved_at: s(),
                                    content: u({
                                        type: m("document"),
                                        title: s().nullable(),
                                        citations: u({ enabled: ne() }).optional(),
                                        source: X([
                                            u({ type: m("base64"), media_type: m("application/pdf"), data: s() }),
                                            u({ type: m("text"), media_type: m("text/plain"), data: s() }),
                                        ]),
                                    }),
                                }),
                                u({ type: m("web_fetch_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("web_search_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                N(
                                    u({
                                        type: m("web_search_result"),
                                        url: s(),
                                        title: s(),
                                        encrypted_content: s(),
                                        page_age: s().nullish(),
                                    }),
                                ),
                                u({ type: m("web_search_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("code_execution_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                u({ type: m("code_execution_result"), stdout: s(), stderr: s(), return_code: f() }),
                                u({ type: m("code_execution_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("bash_code_execution_tool_result"),
                            tool_use_id: s(),
                            content: ie("type", [
                                u({
                                    type: m("bash_code_execution_result"),
                                    content: N(u({ type: m("bash_code_execution_output"), file_id: s() })),
                                    stdout: s(),
                                    stderr: s(),
                                    return_code: f(),
                                }),
                                u({ type: m("bash_code_execution_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("text_editor_code_execution_tool_result"),
                            tool_use_id: s(),
                            content: ie("type", [
                                u({ type: m("text_editor_code_execution_tool_result_error"), error_code: s() }),
                                u({
                                    type: m("text_editor_code_execution_view_result"),
                                    content: s(),
                                    file_type: s(),
                                    num_lines: f().nullable(),
                                    start_line: f().nullable(),
                                    total_lines: f().nullable(),
                                }),
                                u({ type: m("text_editor_code_execution_create_result"), is_file_update: ne() }),
                                u({
                                    type: m("text_editor_code_execution_str_replace_result"),
                                    lines: N(s()).nullable(),
                                    new_lines: f().nullable(),
                                    new_start: f().nullable(),
                                    old_lines: f().nullable(),
                                    old_start: f().nullable(),
                                }),
                            ]),
                        }),
                        u({ type: m("fallback") }),
                    ]),
                ),
                stop_reason: s().nullish(),
                stop_sequence: s().nullish(),
                stop_details: di.nullish(),
                usage: Gn({
                    input_tokens: f(),
                    output_tokens: f(),
                    cache_creation_input_tokens: f().nullish(),
                    cache_read_input_tokens: f().nullish(),
                    iterations: N(
                        u({
                            type: X([m("compaction"), m("message"), m("advisor_message"), m("fallback_message")]),
                            model: s().nullish(),
                            input_tokens: f(),
                            output_tokens: f(),
                            cache_creation_input_tokens: f().nullish(),
                            cache_read_input_tokens: f().nullish(),
                        }),
                    ).nullish(),
                }),
                context_management: u({
                    applied_edits: N(
                        X([
                            u({
                                type: m("clear_tool_uses_20250919"),
                                cleared_tool_uses: f(),
                                cleared_input_tokens: f(),
                            }),
                            u({
                                type: m("clear_thinking_20251015"),
                                cleared_thinking_turns: f(),
                                cleared_input_tokens: f(),
                            }),
                            u({ type: m("compact_20260112") }),
                        ]),
                    ),
                }).nullish(),
                container: u({
                    expires_at: s(),
                    id: s(),
                    skills: N(u({ type: X([m("anthropic"), m("custom")]), skill_id: s(), version: s() })).nullish(),
                }).nullish(),
            }),
        ),
    ),
    wc = K(() =>
        G(
            ie("type", [
                u({
                    type: m("message_start"),
                    message: u({
                        id: s().nullish(),
                        model: s().nullish(),
                        usage: Gn({
                            input_tokens: f(),
                            cache_creation_input_tokens: f().nullish(),
                            cache_read_input_tokens: f().nullish(),
                        }),
                    }),
                }),
                u({
                    type: m("content_block_start"),
                    index: f(),
                    content_block: ie("type", [
                        u({ type: m("text"), text: s() }),
                        u({ type: m("thinking"), thinking: s() }),
                        u({ type: m("tool_use"), id: s(), name: s(), toolset_name: s().nullish() }),
                        u({ type: m("redacted_thinking"), data: s() }),
                        u({ type: m("compaction"), content: s().nullish() }),
                        u({ type: m("server_tool_use"), id: s(), name: s(), input: we(s(), Ue()).nullish() }),
                        u({
                            type: m("web_fetch_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                u({
                                    type: m("web_fetch_result"),
                                    url: s(),
                                    retrieved_at: s(),
                                    content: u({
                                        type: m("document"),
                                        title: s().nullable(),
                                        citations: u({ enabled: ne() }).optional(),
                                        source: X([
                                            u({ type: m("base64"), media_type: m("application/pdf"), data: s() }),
                                            u({ type: m("text"), media_type: m("text/plain"), data: s() }),
                                        ]),
                                    }),
                                }),
                                u({ type: m("web_fetch_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("web_search_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                N(
                                    u({
                                        type: m("web_search_result"),
                                        url: s(),
                                        title: s(),
                                        encrypted_content: s(),
                                        page_age: s().nullish(),
                                    }),
                                ),
                                u({ type: m("web_search_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("code_execution_tool_result"),
                            tool_use_id: s(),
                            content: X([
                                u({ type: m("code_execution_result"), stdout: s(), stderr: s(), return_code: f() }),
                                u({ type: m("code_execution_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("bash_code_execution_tool_result"),
                            tool_use_id: s(),
                            content: ie("type", [
                                u({
                                    type: m("bash_code_execution_result"),
                                    content: N(u({ type: m("bash_code_execution_output"), file_id: s() })),
                                    stdout: s(),
                                    stderr: s(),
                                    return_code: f(),
                                }),
                                u({ type: m("bash_code_execution_tool_result_error"), error_code: s() }),
                            ]),
                        }),
                        u({
                            type: m("text_editor_code_execution_tool_result"),
                            tool_use_id: s(),
                            content: ie("type", [
                                u({ type: m("text_editor_code_execution_tool_result_error"), error_code: s() }),
                                u({
                                    type: m("text_editor_code_execution_view_result"),
                                    content: s(),
                                    file_type: s(),
                                    num_lines: f().nullable(),
                                    start_line: f().nullable(),
                                    total_lines: f().nullable(),
                                }),
                                u({ type: m("text_editor_code_execution_create_result"), is_file_update: ne() }),
                                u({
                                    type: m("text_editor_code_execution_str_replace_result"),
                                    lines: N(s()).nullable(),
                                    new_lines: f().nullable(),
                                    new_start: f().nullable(),
                                    old_lines: f().nullable(),
                                    old_start: f().nullable(),
                                }),
                            ]),
                        }),
                        u({ type: m("fallback") }),
                    ]),
                }),
                u({
                    type: m("content_block_delta"),
                    index: f(),
                    delta: ie("type", [
                        u({ type: m("input_json_delta"), partial_json: s() }),
                        u({ type: m("text_delta"), text: s() }),
                        u({ type: m("thinking_delta"), thinking: s() }),
                        u({ type: m("signature_delta"), signature: s() }),
                        u({ type: m("compaction_delta"), content: s().nullish() }),
                        u({
                            type: m("citations_delta"),
                            citation: ie("type", [
                                u({
                                    type: m("web_search_result_location"),
                                    cited_text: s(),
                                    url: s(),
                                    title: s(),
                                    encrypted_index: s(),
                                }),
                                u({
                                    type: m("page_location"),
                                    cited_text: s(),
                                    document_index: f(),
                                    document_title: s().nullable(),
                                    start_page_number: f(),
                                    end_page_number: f(),
                                }),
                                u({
                                    type: m("char_location"),
                                    cited_text: s(),
                                    document_index: f(),
                                    document_title: s().nullable(),
                                    start_char_index: f(),
                                    end_char_index: f(),
                                }),
                            ]),
                        }),
                    ]),
                }),
                u({ type: m("content_block_stop"), index: f() }),
                u({ type: m("error"), error: u({ type: s(), message: s() }) }),
                u({
                    type: m("message_delta"),
                    delta: u({
                        stop_reason: s().nullish(),
                        stop_sequence: s().nullish(),
                        stop_details: di.nullish(),
                        container: u({
                            expires_at: s(),
                            id: s(),
                            skills: N(
                                u({ type: X([m("anthropic"), m("custom")]), skill_id: s(), version: s() }),
                            ).nullish(),
                        }).nullish(),
                    }),
                    usage: Gn({
                        input_tokens: f().nullish(),
                        output_tokens: f(),
                        cache_creation_input_tokens: f().nullish(),
                        cache_read_input_tokens: f().nullish(),
                        iterations: N(
                            u({
                                type: X([m("compaction"), m("message"), m("advisor_message"), m("fallback_message")]),
                                model: s().nullish(),
                                input_tokens: f(),
                                output_tokens: f(),
                                cache_creation_input_tokens: f().nullish(),
                                cache_read_input_tokens: f().nullish(),
                            }),
                        ).nullish(),
                    }),
                    context_management: u({
                        applied_edits: N(
                            X([
                                u({
                                    type: m("clear_tool_uses_20250919"),
                                    cleared_tool_uses: f(),
                                    cleared_input_tokens: f(),
                                }),
                                u({
                                    type: m("clear_thinking_20251015"),
                                    cleared_thinking_turns: f(),
                                    cleared_input_tokens: f(),
                                }),
                                u({ type: m("compact_20260112") }),
                            ]),
                        ),
                    }).nullish(),
                }),
                u({ type: m("message_stop") }),
                u({ type: m("ping") }),
            ]),
        ),
    ),
    xc = K(() => G(u({ signature: s().optional(), redactedData: s().optional() }))),
    ia = u({ citations: u({ enabled: ne() }).optional(), title: s().optional(), context: s().optional() }),
    Tc = u({
        clearAt: m("next_user_message").optional(),
        effort: J(["low", "medium", "high", "xhigh", "max"]).optional(),
        toolChanges: N(
            ie("type", [u({ type: m("tool_addition"), toolName: s() }), u({ type: m("tool_removal"), toolName: s() })]),
        ).optional(),
    }),
    Mn = u({ prefixMismatchBehavior: m("drop_block") }),
    kc = u({
        sendReasoning: ne().optional(),
        structuredOutputMode: J(["outputFormat", "jsonTool", "auto"]).optional(),
        thinking: X([
            u({
                type: m("adaptive"),
                display: J(["omitted", "summarized", "updates"]).optional(),
                blockBinding: Mn.optional(),
            }),
            u({ type: m("enabled"), budgetTokens: f().optional(), blockBinding: Mn.optional() }),
            u({ type: m("disabled") }),
            u({ type: m("between_tools") }),
            u({ blockBinding: Mn }),
        ]).optional(),
        disableParallelToolUse: ne().optional(),
        cacheControl: u({ type: m("ephemeral"), ttl: X([m("5m"), m("1h")]).optional() }).optional(),
        metadata: u({ userId: s().optional() }).optional(),
        container: u({
            id: s().optional(),
            skills: N(u({ type: X([m("anthropic"), m("custom")]), skillId: s(), version: s().optional() })).optional(),
        }).optional(),
        effort: J(["low", "medium", "high", "xhigh", "max"]).optional(),
        taskBudget: u({
            type: m("tokens"),
            total: f().int().min(2e4),
            remaining: f().int().min(0).optional(),
        }).optional(),
        speed: J(["fast", "standard"]).optional(),
        inferenceGeo: J(["us", "global"]).optional(),
        fallbacks: X([
            m("default"),
            N(
                u({
                    model: s(),
                    max_tokens: f().int().optional(),
                    thinking: we(s(), Ue()).optional(),
                    output_config: we(s(), Ue()).optional(),
                    speed: J(["fast", "standard"]).optional(),
                }),
            ),
        ]).optional(),
        contextManagement: u({
            edits: N(
                ie("type", [
                    u({
                        type: m("clear_tool_uses_20250919"),
                        trigger: ie("type", [
                            u({ type: m("input_tokens"), value: f() }),
                            u({ type: m("tool_uses"), value: f() }),
                        ]).optional(),
                        keep: u({ type: m("tool_uses"), value: f() }).optional(),
                        clearAtLeast: u({ type: m("input_tokens"), value: f() }).optional(),
                        clearToolInputs: ne().optional(),
                        excludeTools: N(s()).optional(),
                    }),
                    u({
                        type: m("clear_thinking_20251015"),
                        keep: X([m("all"), u({ type: m("thinking_turns"), value: f() })]).optional(),
                    }),
                    u({
                        type: m("compact_20260112"),
                        trigger: u({ type: m("input_tokens"), value: f() }).optional(),
                        pauseAfterCompaction: ne().optional(),
                        instructions: s().optional(),
                    }),
                ]),
            ),
        }).optional(),
        anthropicBeta: N(s()).optional(),
    }),
    sa = 4;
function Ic(e) {
    var t;
    const n = e?.anthropic;
    return (t = n?.cacheControl) != null ? t : n?.cache_control;
}
var io = class {
        constructor() {
            ((this.breakpointCount = 0), (this.warnings = []));
        }
        getCacheControl(e, t) {
            const n = Ic(e);
            if (n) {
                if (!t.canCache) {
                    this.warnings.push({
                        type: "unsupported-setting",
                        setting: "cacheControl",
                        details: `cache_control cannot be set on ${t.type}. It will be ignored.`,
                    });
                    return;
                }
                if ((this.breakpointCount++, this.breakpointCount > sa)) {
                    this.warnings.push({
                        type: "unsupported-setting",
                        setting: "cacheControl",
                        details: `Maximum ${sa} cache breakpoints exceeded (found ${this.breakpointCount}). This breakpoint will be ignored.`,
                    });
                    return;
                }
                return n;
            }
        }
        getWarnings() {
            return this.warnings;
        }
    },
    pi = [
        "screenshot",
        "zoom",
        "left_click",
        "right_click",
        "middle_click",
        "double_click",
        "triple_click",
        "left_click_drag",
        "mouse_move",
        "left_mouse_down",
        "left_mouse_up",
        "cursor_position",
        "scroll",
        "type",
        "key",
        "hold_key",
        "wait",
    ],
    Sc = K(() =>
        G(
            u({
                action: J(pi),
                coordinate: Ot([f().int(), f().int()]).optional(),
                duration: f().optional(),
                region: Ot([f().int(), f().int(), f().int(), f().int()]).optional(),
                repeat: f().int().optional(),
                scroll_amount: f().optional(),
                scroll_direction: J(["up", "down", "left", "right"]).optional(),
                start_coordinate: Ot([f().int(), f().int()]).optional(),
                text: s().optional(),
            }),
        ),
    ),
    Cc = K(() =>
        G(u({ configs: hl(J(pi), u({ enabled: ne().optional(), deferLoading: ne().optional() })).optional() })),
    ),
    Ec = Pe({ id: "anthropic.computer_toolset_20260801", name: "computer", inputSchema: Sc }),
    Rc = K(() => G(u({ maxCharacters: f().optional() }))),
    Oc = K(() =>
        G(
            u({
                command: J(["view", "create", "str_replace", "insert"]),
                path: s(),
                file_text: s().optional(),
                insert_line: f().int().optional(),
                new_str: s().optional(),
                old_str: s().optional(),
                view_range: N(f().int()).optional(),
            }),
        ),
    ),
    Ac = Pe({ id: "anthropic.text_editor_20250728", name: "str_replace_based_edit_tool", inputSchema: Oc }),
    Mc = (e = {}) => Ac(e),
    Nc = K(() =>
        G(
            u({
                maxUses: f().optional(),
                allowedDomains: N(s()).optional(),
                blockedDomains: N(s()).optional(),
                userLocation: u({
                    type: m("approximate"),
                    city: s().optional(),
                    region: s().optional(),
                    country: s().optional(),
                    timezone: s().optional(),
                }).optional(),
            }),
        ),
    ),
    fi = K(() =>
        G(
            N(
                u({
                    url: s(),
                    title: s().nullable(),
                    pageAge: s().nullable(),
                    encryptedContent: s(),
                    type: m("web_search_result"),
                }),
            ),
        ),
    ),
    Pc = K(() => G(u({ query: s() }))),
    $c = Le({ id: "anthropic.web_search_20250305", name: "web_search", inputSchema: Pc, outputSchema: fi }),
    Dc = (e = {}) => $c(e),
    qc = K(() =>
        G(
            u({
                maxUses: f().optional(),
                allowedDomains: N(s()).optional(),
                blockedDomains: N(s()).optional(),
                citations: u({ enabled: ne() }).optional(),
                maxContentTokens: f().optional(),
            }),
        ),
    ),
    mi = K(() =>
        G(
            u({
                type: m("web_fetch_result"),
                url: s(),
                content: u({
                    type: m("document"),
                    title: s().nullable(),
                    citations: u({ enabled: ne() }).optional(),
                    source: X([
                        u({ type: m("base64"), mediaType: m("application/pdf"), data: s() }),
                        u({ type: m("text"), mediaType: m("text/plain"), data: s() }),
                    ]),
                }),
                retrievedAt: s().nullable(),
            }),
        ),
    ),
    Uc = K(() => G(u({ url: s() }))),
    Lc = Le({ id: "anthropic.web_fetch_20250910", name: "web_fetch", inputSchema: Uc, outputSchema: mi }),
    jc = (e = {}) => Lc(e);
async function Bc({
    tools: e,
    toolChoice: t,
    disableParallelToolUse: n,
    cacheControlValidator: o,
    rejectsForcedToolUse: r = !1,
}) {
    var a;
    e = e?.length ? e : void 0;
    const l = [],
        i = new Set(),
        d = o || new io();
    if (e == null) return { tools: void 0, toolChoice: void 0, toolWarnings: l, betas: i };
    const c = [];
    for (const w of e)
        switch (w.type) {
            case "function": {
                const y = d.getCacheControl(w.providerOptions, { type: "tool definition", canCache: !0 }),
                    k = (a = w.providerOptions) == null ? void 0 : a.anthropic,
                    x = k?.eagerInputStreaming;
                c.push({
                    name: w.name,
                    description: w.description,
                    input_schema: w.inputSchema,
                    cache_control: y,
                    ...(x ? { eager_input_streaming: !0 } : {}),
                });
                break;
            }
            case "provider-defined": {
                switch (w.id) {
                    case "anthropic.code_execution_20250522": {
                        (i.add("code-execution-2025-05-22"),
                            c.push({ type: "code_execution_20250522", name: "code_execution", cache_control: void 0 }));
                        break;
                    }
                    case "anthropic.code_execution_20250825": {
                        (i.add("code-execution-2025-08-25"),
                            c.push({ type: "code_execution_20250825", name: "code_execution" }));
                        break;
                    }
                    case "anthropic.code_execution_20260120": {
                        c.push({ type: "code_execution_20260120", name: "code_execution" });
                        break;
                    }
                    case "anthropic.computer_toolset_20260801": {
                        const y = await Ce({ value: w.args, schema: Cc }),
                            k =
                                y.configs != null
                                    ? Object.fromEntries(
                                          Object.entries(y.configs).map(([x, I]) => [
                                              x,
                                              {
                                                  ...(I?.enabled != null && { enabled: I.enabled }),
                                                  ...(I?.deferLoading != null && { defer_loading: I.deferLoading }),
                                              },
                                          ]),
                                      )
                                    : void 0;
                        c.push({
                            type: "computer_toolset_20260801",
                            ...(k != null && { configs: k }),
                            cache_control: void 0,
                        });
                        break;
                    }
                    case "anthropic.computer_20250124": {
                        (i.add("computer-use-2025-01-24"),
                            c.push({
                                name: "computer",
                                type: "computer_20250124",
                                display_width_px: w.args.displayWidthPx,
                                display_height_px: w.args.displayHeightPx,
                                display_number: w.args.displayNumber,
                                cache_control: void 0,
                            }));
                        break;
                    }
                    case "anthropic.computer_20241022": {
                        (i.add("computer-use-2024-10-22"),
                            c.push({
                                name: "computer",
                                type: "computer_20241022",
                                display_width_px: w.args.displayWidthPx,
                                display_height_px: w.args.displayHeightPx,
                                display_number: w.args.displayNumber,
                                cache_control: void 0,
                            }));
                        break;
                    }
                    case "anthropic.text_editor_20250124": {
                        (i.add("computer-use-2025-01-24"),
                            c.push({
                                name: "str_replace_editor",
                                type: "text_editor_20250124",
                                cache_control: void 0,
                            }));
                        break;
                    }
                    case "anthropic.text_editor_20241022": {
                        (i.add("computer-use-2024-10-22"),
                            c.push({
                                name: "str_replace_editor",
                                type: "text_editor_20241022",
                                cache_control: void 0,
                            }));
                        break;
                    }
                    case "anthropic.text_editor_20250429": {
                        (i.add("computer-use-2025-01-24"),
                            c.push({
                                name: "str_replace_based_edit_tool",
                                type: "text_editor_20250429",
                                cache_control: void 0,
                            }));
                        break;
                    }
                    case "anthropic.text_editor_20250728": {
                        const y = await Ce({ value: w.args, schema: Rc });
                        c.push({
                            name: "str_replace_based_edit_tool",
                            type: "text_editor_20250728",
                            max_characters: y.maxCharacters,
                            cache_control: void 0,
                        });
                        break;
                    }
                    case "anthropic.bash_20250124": {
                        (i.add("computer-use-2025-01-24"),
                            c.push({ name: "bash", type: "bash_20250124", cache_control: void 0 }));
                        break;
                    }
                    case "anthropic.bash_20241022": {
                        (i.add("computer-use-2024-10-22"),
                            c.push({ name: "bash", type: "bash_20241022", cache_control: void 0 }));
                        break;
                    }
                    case "anthropic.memory_20250818": {
                        (i.add("context-management-2025-06-27"), c.push({ name: "memory", type: "memory_20250818" }));
                        break;
                    }
                    case "anthropic.web_fetch_20250910": {
                        i.add("web-fetch-2025-09-10");
                        const y = await Ce({ value: w.args, schema: qc });
                        c.push({
                            type: "web_fetch_20250910",
                            name: "web_fetch",
                            max_uses: y.maxUses,
                            allowed_domains: y.allowedDomains,
                            blocked_domains: y.blockedDomains,
                            citations: y.citations,
                            max_content_tokens: y.maxContentTokens,
                            cache_control: void 0,
                        });
                        break;
                    }
                    case "anthropic.web_search_20250305": {
                        const y = await Ce({ value: w.args, schema: Nc });
                        c.push({
                            type: "web_search_20250305",
                            name: "web_search",
                            max_uses: y.maxUses,
                            allowed_domains: y.allowedDomains,
                            blocked_domains: y.blockedDomains,
                            user_location: y.userLocation,
                            cache_control: void 0,
                        });
                        break;
                    }
                    default: {
                        l.push({ type: "unsupported-tool", tool: w });
                        break;
                    }
                }
                break;
            }
            default: {
                l.push({ type: "unsupported-tool", tool: w });
                break;
            }
        }
    if (t == null)
        return {
            tools: c,
            toolChoice: n ? { type: "auto", disable_parallel_tool_use: n } : void 0,
            toolWarnings: l,
            betas: i,
        };
    const p = t.type;
    switch (p) {
        case "auto":
            return { tools: c, toolChoice: { type: "auto", disable_parallel_tool_use: n }, toolWarnings: l, betas: i };
        case "required":
            return r
                ? (l.push({
                      type: "unsupported-setting",
                      setting: "toolChoice",
                      details:
                          "toolChoice 'required' is not supported by this model because it rejects forced tool use. Using 'auto' instead. Instruct the model to use a tool in the prompt and verify that a tool call was made.",
                  }),
                  { tools: c, toolChoice: { type: "auto", disable_parallel_tool_use: n }, toolWarnings: l, betas: i })
                : { tools: c, toolChoice: { type: "any", disable_parallel_tool_use: n }, toolWarnings: l, betas: i };
        case "none":
            return { tools: void 0, toolChoice: void 0, toolWarnings: l, betas: i };
        case "tool":
            return r
                ? (l.push({
                      type: "unsupported-setting",
                      setting: "toolChoice",
                      details: `toolChoice 'tool' is not supported by this model because it rejects forced tool use. Only the '${t.toolName}' tool is sent with 'auto' tool choice. Instruct the model to use the tool in the prompt and verify that a tool call was made.`,
                  }),
                  {
                      tools: c.filter((w) => "name" in w && w.name === t.toolName),
                      toolChoice: { type: "auto", disable_parallel_tool_use: n },
                      toolWarnings: l,
                      betas: i,
                  })
                : {
                      tools: c,
                      toolChoice: { type: "tool", name: t.toolName, disable_parallel_tool_use: n },
                      toolWarnings: l,
                      betas: i,
                  };
        default: {
            const w = p;
            throw new ye({ functionality: `tool choice type: ${w}` });
        }
    }
}
var hi = K(() => G(u({ type: m("code_execution_result"), stdout: s(), stderr: s(), return_code: f() }))),
    Gc = K(() => G(u({ code: s() }))),
    Fc = Le({ id: "anthropic.code_execution_20250522", name: "code_execution", inputSchema: Gc, outputSchema: hi }),
    Hc = (e = {}) => Fc(e),
    gi = K(() =>
        G(
            ie("type", [
                u({
                    type: m("bash_code_execution_result"),
                    content: N(u({ type: m("bash_code_execution_output"), file_id: s() })),
                    stdout: s(),
                    stderr: s(),
                    return_code: f(),
                }),
                u({ type: m("bash_code_execution_tool_result_error"), error_code: s() }),
                u({ type: m("text_editor_code_execution_tool_result_error"), error_code: s() }),
                u({
                    type: m("text_editor_code_execution_view_result"),
                    content: s(),
                    file_type: s(),
                    num_lines: f().nullable(),
                    start_line: f().nullable(),
                    total_lines: f().nullable(),
                }),
                u({ type: m("text_editor_code_execution_create_result"), is_file_update: ne() }),
                u({
                    type: m("text_editor_code_execution_str_replace_result"),
                    lines: N(s()).nullable(),
                    new_lines: f().nullable(),
                    new_start: f().nullable(),
                    old_lines: f().nullable(),
                    old_start: f().nullable(),
                }),
            ]),
        ),
    ),
    Vc = K(() =>
        G(
            ie("type", [
                u({ type: m("bash_code_execution"), command: s() }),
                ie("command", [
                    u({ type: m("text_editor_code_execution"), command: m("view"), path: s() }),
                    u({
                        type: m("text_editor_code_execution"),
                        command: m("create"),
                        path: s(),
                        file_text: s().nullish(),
                    }),
                    u({
                        type: m("text_editor_code_execution"),
                        command: m("str_replace"),
                        path: s(),
                        old_str: s(),
                        new_str: s(),
                    }),
                ]),
            ]),
        ),
    ),
    Jc = Le({ id: "anthropic.code_execution_20250825", name: "code_execution", inputSchema: Vc, outputSchema: gi }),
    Wc = (e = {}) => Jc(e);
function Zc(e) {
    if (typeof e == "string") return Buffer.from(e, "base64").toString("utf-8");
    if (e instanceof Uint8Array) return new TextDecoder().decode(e);
    throw e instanceof URL
        ? new ye({ functionality: "URL-based text documents are not supported for citations" })
        : new ye({ functionality: `unsupported data type for text documents: ${typeof e}` });
}
async function zc({ prompt: e, sendReasoning: t, warnings: n, cacheControlValidator: o, toolsetNames: r = {} }) {
    var a, l, i, d, c, p, w;
    const y = new Set(),
        k = Kc(e),
        x = o || new io();
    let I;
    const S = [];
    async function R(O) {
        var C, h;
        const g = await Ie({ provider: "anthropic", providerOptions: O, schema: ia });
        return (h = (C = g?.citations) == null ? void 0 : C.enabled) != null ? h : !1;
    }
    async function P(O) {
        const C = await Ie({ provider: "anthropic", providerOptions: O, schema: ia });
        return { title: C?.title, context: C?.context };
    }
    for (let O = 0; O < k.length; O++) {
        const C = k[O],
            h = O === k.length - 1,
            g = C.type;
        switch (g) {
            case "system": {
                const v = [];
                let M = 0,
                    _ = !1;
                for (const { content: E, providerOptions: b } of C.messages) {
                    const A = await Ie({ provider: "anthropic", providerOptions: b, schema: Tc }),
                        U = (a = A?.toolChanges) != null ? a : [],
                        L = A?.clearAt,
                        j = A?.effort,
                        B = [];
                    (E !== "" || (U.length === 0 && A?.clearAt == null && A?.effort == null)) &&
                        B.push({
                            type: "text",
                            text: E,
                            cache_control: x.getCacheControl(b, { type: "system message", canCache: !0 }),
                        });
                    for (const $ of U)
                        (M++, B.push({ type: $.type, tool: { type: "tool_reference", name: $.toolName } }));
                    (_ || (_ = L != null || j != null),
                        v.push({
                            role: "system",
                            content: B,
                            ...(L != null && { clear_at: L }),
                            ...(j != null && { output_config: { effort: j } }),
                        }));
                }
                if (O === 0 || (I == null && M === 0 && !_)) {
                    M > 0 &&
                        n.push({
                            type: "other",
                            message:
                                "tool changes on the initial system message are not supported by Anthropic. Configure the initial tool set via the tools option instead. The tool changes have been ignored.",
                        });
                    for (const E of v)
                        E.content.length === 0 && E.clear_at == null && E.output_config != null
                            ? (S.push(E), y.add("mid-conversation-output-config-2026-07-01"))
                            : (E.clear_at != null || E.output_config != null) &&
                              n.push({
                                  type: "other",
                                  message:
                                      "clearAt and effort on this initial system message are not supported by Anthropic. Use a separate effort-only system message with empty content to set effort. These options have been ignored.",
                              });
                    I = v.flatMap((E) => E.content.filter((b) => b.type === "text"));
                } else
                    (S.push(...v),
                        y.add("mid-conversation-system-2026-04-07"),
                        M > 0 && y.add("mid-conversation-tool-changes-2026-07-01"),
                        v.some((E) => E.clear_at != null) && y.add("mid-conversation-system-clear-at-2026-08-21"),
                        v.some((E) => E.output_config != null) && y.add("mid-conversation-output-config-2026-07-01"));
                break;
            }
            case "user": {
                const v = [];
                for (const M of C.messages) {
                    const { role: _, content: E } = M;
                    switch (_) {
                        case "user": {
                            for (let b = 0; b < E.length; b++) {
                                const A = E[b],
                                    U = b === E.length - 1,
                                    L =
                                        (l = x.getCacheControl(A.providerOptions, {
                                            type: "user message part",
                                            canCache: !0,
                                        })) != null
                                            ? l
                                            : U
                                              ? x.getCacheControl(M.providerOptions, {
                                                    type: "user message",
                                                    canCache: !0,
                                                })
                                              : void 0;
                                switch (A.type) {
                                    case "text": {
                                        v.push({ type: "text", text: A.text, cache_control: L });
                                        break;
                                    }
                                    case "file": {
                                        if (A.mediaType.startsWith("image/"))
                                            v.push({
                                                type: "image",
                                                source:
                                                    A.data instanceof URL
                                                        ? { type: "url", url: A.data.toString() }
                                                        : {
                                                              type: "base64",
                                                              media_type:
                                                                  A.mediaType === "image/*"
                                                                      ? "image/jpeg"
                                                                      : A.mediaType,
                                                              data: ot(A.data),
                                                          },
                                                cache_control: L,
                                            });
                                        else if (A.mediaType === "application/pdf") {
                                            y.add("pdfs-2024-09-25");
                                            const j = await R(A.providerOptions),
                                                B = await P(A.providerOptions);
                                            v.push({
                                                type: "document",
                                                source:
                                                    A.data instanceof URL
                                                        ? { type: "url", url: A.data.toString() }
                                                        : {
                                                              type: "base64",
                                                              media_type: "application/pdf",
                                                              data: ot(A.data),
                                                          },
                                                title: (i = B.title) != null ? i : A.filename,
                                                ...(B.context && { context: B.context }),
                                                ...(j && { citations: { enabled: !0 } }),
                                                cache_control: L,
                                            });
                                        } else if (A.mediaType === "text/plain") {
                                            const j = await R(A.providerOptions),
                                                B = await P(A.providerOptions);
                                            v.push({
                                                type: "document",
                                                source:
                                                    A.data instanceof URL
                                                        ? { type: "url", url: A.data.toString() }
                                                        : { type: "text", media_type: "text/plain", data: Zc(A.data) },
                                                title: (d = B.title) != null ? d : A.filename,
                                                ...(B.context && { context: B.context }),
                                                ...(j && { citations: { enabled: !0 } }),
                                                cache_control: L,
                                            });
                                        } else throw new ye({ functionality: `media type: ${A.mediaType}` });
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                        case "tool": {
                            for (let b = 0; b < E.length; b++) {
                                const A = E[b],
                                    U = b === E.length - 1,
                                    L =
                                        (c = x.getCacheControl(A.providerOptions, {
                                            type: "tool result part",
                                            canCache: !0,
                                        })) != null
                                            ? c
                                            : U
                                              ? x.getCacheControl(M.providerOptions, {
                                                    type: "tool result message",
                                                    canCache: !0,
                                                })
                                              : void 0,
                                    j = A.output;
                                let B;
                                switch (j.type) {
                                    case "content":
                                        B = j.value.map((H) => {
                                            switch (H.type) {
                                                case "text":
                                                    return { type: "text", text: H.text };
                                                case "media": {
                                                    if (H.mediaType.startsWith("image/"))
                                                        return {
                                                            type: "image",
                                                            source: {
                                                                type: "base64",
                                                                media_type: H.mediaType,
                                                                data: H.data,
                                                            },
                                                        };
                                                    if (H.mediaType === "application/pdf")
                                                        return (
                                                            y.add("pdfs-2024-09-25"),
                                                            {
                                                                type: "document",
                                                                source: {
                                                                    type: "base64",
                                                                    media_type: H.mediaType,
                                                                    data: H.data,
                                                                },
                                                            }
                                                        );
                                                    throw new ye({ functionality: `media type: ${H.mediaType}` });
                                                }
                                            }
                                        });
                                        break;
                                    case "text":
                                    case "error-text":
                                        B = j.value;
                                        break;
                                    default:
                                        B = JSON.stringify(j.value);
                                        break;
                                }
                                const $ = la({
                                    toolName: A.toolName,
                                    providerOptions: A.providerOptions,
                                    toolsetNames: r,
                                });
                                v.push({
                                    type: "tool_result",
                                    tool_use_id: A.toolCallId,
                                    ...($ != null && { toolset_name: $ }),
                                    content: B,
                                    is_error: j.type === "error-text" || j.type === "error-json" ? !0 : void 0,
                                    cache_control: L,
                                });
                            }
                            break;
                        }
                        default: {
                            const b = _;
                            throw new Error(`Unsupported role: ${b}`);
                        }
                    }
                }
                S.push({ role: "user", content: v });
                break;
            }
            case "assistant": {
                const v = [];
                for (let M = 0; M < C.messages.length; M++) {
                    const _ = C.messages[M],
                        E = M === C.messages.length - 1,
                        { content: b } = _;
                    for (let A = 0; A < b.length; A++) {
                        const U = b[A],
                            L = A === b.length - 1,
                            j =
                                (p = x.getCacheControl(U.providerOptions, {
                                    type: "assistant message part",
                                    canCache: !0,
                                })) != null
                                    ? p
                                    : L
                                      ? x.getCacheControl(_.providerOptions, {
                                            type: "assistant message",
                                            canCache: !0,
                                        })
                                      : void 0;
                        switch (U.type) {
                            case "text": {
                                const B = (w = U.providerOptions) == null ? void 0 : w.anthropic;
                                B?.type === "compaction"
                                    ? v.push({ type: "compaction", content: U.text, cache_control: j })
                                    : v.push({
                                          type: "text",
                                          text: h && E && L ? U.text.trim() : U.text,
                                          ...(B?.citations != null && { citations: B.citations }),
                                          cache_control: j,
                                      });
                                break;
                            }
                            case "reasoning": {
                                if (t) {
                                    const B = await Ie({
                                        provider: "anthropic",
                                        providerOptions: U.providerOptions,
                                        schema: xc,
                                    });
                                    B != null
                                        ? B.signature != null
                                            ? (x.getCacheControl(U.providerOptions, {
                                                  type: "thinking block",
                                                  canCache: !1,
                                              }),
                                              v.push({ type: "thinking", thinking: U.text, signature: B.signature }))
                                            : B.redactedData != null
                                              ? (x.getCacheControl(U.providerOptions, {
                                                    type: "redacted thinking block",
                                                    canCache: !1,
                                                }),
                                                v.push({ type: "redacted_thinking", data: B.redactedData }))
                                              : n.push({ type: "other", message: "unsupported reasoning metadata" })
                                        : n.push({ type: "other", message: "unsupported reasoning metadata" });
                                } else
                                    n.push({
                                        type: "other",
                                        message: "sending reasoning content is disabled for this model",
                                    });
                                break;
                            }
                            case "tool-call": {
                                if (U.providerExecuted) {
                                    if (
                                        U.toolName === "code_execution" &&
                                        U.input != null &&
                                        typeof U.input == "object" &&
                                        "type" in U.input &&
                                        typeof U.input.type == "string" &&
                                        (U.input.type === "bash_code_execution" ||
                                            U.input.type === "text_editor_code_execution")
                                    ) {
                                        const { type: $, ...H } = U.input;
                                        v.push({
                                            type: "server_tool_use",
                                            id: U.toolCallId,
                                            name: $,
                                            input: H,
                                            cache_control: j,
                                        });
                                    } else
                                        U.toolName === "code_execution" ||
                                        U.toolName === "web_fetch" ||
                                        U.toolName === "web_search"
                                            ? v.push({
                                                  type: "server_tool_use",
                                                  id: U.toolCallId,
                                                  name: U.toolName,
                                                  input: U.input,
                                                  cache_control: j,
                                              })
                                            : n.push({
                                                  type: "other",
                                                  message: `provider executed tool call for tool ${U.toolName} is not supported`,
                                              });
                                    break;
                                }
                                const B = la({
                                    toolName: U.toolName,
                                    providerOptions: U.providerOptions,
                                    toolsetNames: r,
                                });
                                if (B != null) {
                                    const { action: $, ...H } =
                                        typeof U.input == "object" && U.input !== null && !Array.isArray(U.input)
                                            ? U.input
                                            : {};
                                    if (typeof $ != "string") {
                                        n.push({
                                            type: "other",
                                            message: `toolset tool call for tool ${U.toolName} is missing the action`,
                                        });
                                        break;
                                    }
                                    v.push({
                                        type: "tool_use",
                                        id: U.toolCallId,
                                        name: $,
                                        toolset_name: B,
                                        input: H,
                                        cache_control: j,
                                    });
                                    break;
                                }
                                v.push({
                                    type: "tool_use",
                                    id: U.toolCallId,
                                    name: U.toolName,
                                    input: U.input,
                                    cache_control: j,
                                });
                                break;
                            }
                            case "tool-result": {
                                if (U.toolName === "code_execution") {
                                    const B = U.output;
                                    if (B.type !== "json") {
                                        n.push({
                                            type: "other",
                                            message: `provider executed tool result output type ${B.type} for tool ${U.toolName} is not supported`,
                                        });
                                        break;
                                    }
                                    if (
                                        B.value == null ||
                                        typeof B.value != "object" ||
                                        !("type" in B.value) ||
                                        typeof B.value.type != "string"
                                    ) {
                                        n.push({
                                            type: "other",
                                            message: `provider executed tool result output value is not a valid code execution result for tool ${U.toolName}`,
                                        });
                                        break;
                                    }
                                    if (B.value.type === "code_execution_result") {
                                        const $ = await Ce({ value: B.value, schema: hi });
                                        v.push({
                                            type: "code_execution_tool_result",
                                            tool_use_id: U.toolCallId,
                                            content: {
                                                type: $.type,
                                                stdout: $.stdout,
                                                stderr: $.stderr,
                                                return_code: $.return_code,
                                            },
                                            cache_control: j,
                                        });
                                    } else {
                                        const $ = await Ce({ value: B.value, schema: gi });
                                        v.push(
                                            $.type === "bash_code_execution_result" ||
                                                $.type === "bash_code_execution_tool_result_error"
                                                ? {
                                                      type: "bash_code_execution_tool_result",
                                                      tool_use_id: U.toolCallId,
                                                      cache_control: j,
                                                      content:
                                                          $.type === "bash_code_execution_result"
                                                              ? {
                                                                    type: $.type,
                                                                    stdout: $.stdout,
                                                                    stderr: $.stderr,
                                                                    return_code: $.return_code,
                                                                    content: $.content,
                                                                }
                                                              : $,
                                                  }
                                                : {
                                                      type: "text_editor_code_execution_tool_result",
                                                      tool_use_id: U.toolCallId,
                                                      cache_control: j,
                                                      content: $,
                                                  },
                                        );
                                    }
                                    break;
                                }
                                if (U.toolName === "web_fetch") {
                                    const B = U.output;
                                    if (B.type !== "json") {
                                        n.push({
                                            type: "other",
                                            message: `provider executed tool result output type ${B.type} for tool ${U.toolName} is not supported`,
                                        });
                                        break;
                                    }
                                    const $ = await Ce({ value: B.value, schema: mi });
                                    v.push({
                                        type: "web_fetch_tool_result",
                                        tool_use_id: U.toolCallId,
                                        content: {
                                            type: "web_fetch_result",
                                            url: $.url,
                                            retrieved_at: $.retrievedAt,
                                            content: {
                                                type: "document",
                                                title: $.content.title,
                                                citations: $.content.citations,
                                                source: {
                                                    type: $.content.source.type,
                                                    media_type: $.content.source.mediaType,
                                                    data: $.content.source.data,
                                                },
                                            },
                                        },
                                        cache_control: j,
                                    });
                                    break;
                                }
                                if (U.toolName === "web_search") {
                                    const B = U.output;
                                    if (B.type !== "json") {
                                        n.push({
                                            type: "other",
                                            message: `provider executed tool result output type ${B.type} for tool ${U.toolName} is not supported`,
                                        });
                                        break;
                                    }
                                    const $ = await Ce({ value: B.value, schema: fi });
                                    v.push({
                                        type: "web_search_tool_result",
                                        tool_use_id: U.toolCallId,
                                        content: $.map((H) => ({
                                            url: H.url,
                                            title: H.title,
                                            page_age: H.pageAge,
                                            encrypted_content: H.encryptedContent,
                                            type: H.type,
                                        })),
                                        cache_control: j,
                                    });
                                    break;
                                }
                                n.push({
                                    type: "other",
                                    message: `provider executed tool result for tool ${U.toolName} is not supported`,
                                });
                                break;
                            }
                        }
                    }
                }
                S.push({ role: "assistant", content: Yc(v) });
                break;
            }
            default: {
                const v = g;
                throw new Error(`content type: ${v}`);
            }
        }
    }
    return { prompt: { system: I, messages: S }, betas: y };
}
function Kc(e) {
    const t = [];
    let n;
    for (const o of e) {
        const { role: r } = o;
        switch (r) {
            case "system": {
                (n?.type !== "system" && ((n = { type: "system", messages: [] }), t.push(n)), n.messages.push(o));
                break;
            }
            case "assistant": {
                (n?.type !== "assistant" && ((n = { type: "assistant", messages: [] }), t.push(n)), n.messages.push(o));
                break;
            }
            case "user": {
                (n?.type !== "user" && ((n = { type: "user", messages: [] }), t.push(n)), n.messages.push(o));
                break;
            }
            case "tool": {
                (n?.type !== "user" && ((n = { type: "user", messages: [] }), t.push(n)), n.messages.push(o));
                break;
            }
            default: {
                const a = r;
                throw new Error(`Unsupported role: ${a}`);
            }
        }
    }
    return t;
}
function Yc(e) {
    const t = [];
    let n = [];
    function o() {
        (t.push(...n.filter((r) => r.type !== "tool_use"), ...n.filter((r) => r.type === "tool_use")), (n = []));
    }
    for (const r of e) r.type === "thinking" || r.type === "redacted_thinking" ? (o(), t.push(r)) : n.push(r);
    return (o(), t);
}
function la({ toolName: e, providerOptions: t, toolsetNames: n }) {
    var o;
    const r = n[e];
    if (r != null) return r;
    const a = (o = t?.anthropic) == null ? void 0 : o.toolsetName;
    return typeof a == "string" ? a : void 0;
}
function ua({ finishReason: e, isJsonResponseFromTool: t }) {
    switch (e) {
        case "pause_turn":
        case "end_turn":
        case "stop_sequence":
            return "stop";
        case "refusal":
            return "content-filter";
        case "tool_use":
            return t ? "stop" : "tool-calls";
        case "max_tokens":
            return "length";
        case "compaction":
            return "other";
        default:
            return "unknown";
    }
}
var _i = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]),
    Xc = [
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "multipleOf",
        "minLength",
        "maxLength",
        "pattern",
        "minItems",
        "maxItems",
        "uniqueItems",
        "minProperties",
        "maxProperties",
        "not",
    ];
function Qc(e) {
    return yi(e);
}
function ft(e) {
    return typeof e == "boolean" || !od(e) ? e : yi(e);
}
function yi(e) {
    const t = {},
        n = e;
    if (e.$ref != null) return { $ref: e.$ref };
    if (
        (e.$schema != null && (t.$schema = e.$schema),
        e.$id != null && (t.$id = e.$id),
        e.title != null && (t.title = e.title),
        e.description != null && (t.description = e.description),
        e.default !== void 0 && (t.default = e.default),
        e.const !== void 0 && (t.const = e.const),
        e.enum != null && (t.enum = e.enum),
        e.type != null && (t.type = e.type),
        e.anyOf != null ? (t.anyOf = e.anyOf.map(ft)) : e.oneOf != null && (t.anyOf = e.oneOf.map(ft)),
        e.allOf != null && (t.allOf = e.allOf.map(ft)),
        e.definitions != null &&
            (t.definitions = Object.fromEntries(Object.entries(e.definitions).map(([r, a]) => [r, ft(a)]))),
        n.$defs != null)
    ) {
        const r = t;
        r.$defs = Object.fromEntries(Object.entries(n.$defs).map(([a, l]) => [a, ft(l)]));
    }
    ((e.type === "object" || e.properties != null) &&
        (e.properties != null &&
            (t.properties = Object.fromEntries(Object.entries(e.properties).map(([r, a]) => [r, ft(a)]))),
        (t.additionalProperties = !1),
        e.required != null && (t.required = e.required)),
        e.items != null && (t.items = Array.isArray(e.items) ? e.items.map(ft) : ft(e.items)),
        typeof e.format == "string" && _i.has(e.format) && (t.format = e.format));
    const o = ed(e);
    return (
        o != null &&
            (t.description =
                t.description == null
                    ? o
                    : `${t.description}
${o}`),
        t
    );
}
function ed(e) {
    const t = Xc.flatMap((n) => {
        const o = e[n];
        return o == null || o === !1 ? [] : `${td(n)}: ${nd(o)}`;
    });
    return (
        typeof e.format == "string" && !_i.has(e.format) && t.push(`format: ${e.format}`),
        t.length === 0 ? void 0 : `${t.join("; ")}.`
    );
}
function td(e) {
    return e.replace(/[A-Z]/g, (t) => ` ${t.toLowerCase()}`);
}
function nd(e) {
    return typeof e == "string" ? e : JSON.stringify(e);
}
function od(e) {
    return typeof e == "object" && e !== null && !Array.isArray(e);
}
function ad(e) {
    const t = {};
    for (const n of e ?? [])
        n.type === "provider-defined" && n.id === "anthropic.computer_toolset_20260801" && (t[n.name] = "computer");
    return t;
}
function ca({ memberName: e, input: t }) {
    return { action: e, ...(typeof t == "object" && t !== null && !Array.isArray(t) ? t : {}) };
}
function rd(e) {
    const t = new Set(e?.map((r) => r.name));
    let n = "json",
        o = 1;
    for (; t.has(n);) n = `json_${o++}`;
    return n;
}
function da(e, t, n) {
    var o;
    if (e.type !== "page_location" && e.type !== "char_location") return;
    const r = t[e.document_index];
    if (r)
        return {
            type: "source",
            sourceType: "document",
            id: n(),
            mediaType: r.mediaType,
            title: (o = e.document_title) != null ? o : r.title,
            filename: r.filename,
            providerMetadata: {
                anthropic:
                    e.type === "page_location"
                        ? {
                              citedText: e.cited_text,
                              startPageNumber: e.start_page_number,
                              endPageNumber: e.end_page_number,
                          }
                        : {
                              citedText: e.cited_text,
                              startCharIndex: e.start_char_index,
                              endCharIndex: e.end_char_index,
                          },
            },
        };
}
var id = class {
    constructor(e, t) {
        this.specificationVersion = "v2";
        var n;
        ((this.modelId = e), (this.config = t), (this.generateId = (n = t.generateId) != null ? n : Ne));
    }
    supportsUrl(e) {
        return e.protocol === "https:";
    }
    get provider() {
        return this.config.provider;
    }
    get supportedUrls() {
        var e, t, n;
        return (n = (t = (e = this.config).supportedUrls) == null ? void 0 : t.call(e)) != null ? n : {};
    }
    async getArgs({
        userSuppliedBetas: e,
        prompt: t,
        maxOutputTokens: n,
        temperature: o,
        topP: r,
        topK: a,
        frequencyPenalty: l,
        presencePenalty: i,
        stopSequences: d,
        responseFormat: c,
        seed: p,
        tools: w,
        toolChoice: y,
        providerOptions: k,
    }) {
        var x, I, S, R, P;
        const O = [];
        (l != null && O.push({ type: "unsupported-setting", setting: "frequencyPenalty" }),
            i != null && O.push({ type: "unsupported-setting", setting: "presencePenalty" }),
            p != null && O.push({ type: "unsupported-setting", setting: "seed" }),
            o != null && o > 1
                ? (O.push({
                      type: "unsupported-setting",
                      setting: "temperature",
                      details: `${o} exceeds anthropic maximum of 1.0. clamped to 1.0`,
                  }),
                  (o = 1))
                : o != null &&
                  o < 0 &&
                  (O.push({
                      type: "unsupported-setting",
                      setting: "temperature",
                      details: `${o} is below anthropic minimum of 0. clamped to 0`,
                  }),
                  (o = 0)),
            c?.type === "json" &&
                c.schema == null &&
                O.push({
                    type: "unsupported-setting",
                    setting: "responseFormat",
                    details: "JSON response format requires a schema. The response format is ignored.",
                }));
        const C = await Ie({ provider: "anthropic", providerOptions: k, schema: kc }),
            {
                maxOutputTokens: h,
                supportsStructuredOutput: g,
                rejectsSamplingParameters: v,
                rejectsThinkingDisabledAboveHighEffort: M,
                rejectsThinkingDisabled: _,
                rejectsForcedToolUse: E,
                supportsBetweenToolsThinking: b,
                isKnownModel: A,
            } = sd(this.modelId);
        (!A &&
            n == null &&
            O.push({
                type: "other",
                message: `The model "${this.modelId}" is unknown. The max output tokens have been limited to ${h}. Set maxOutputTokens explicitly to override this limit.`,
            }),
            v &&
                (o != null &&
                    (O.push({
                        type: "unsupported-setting",
                        setting: "temperature",
                        details: `temperature is not supported by ${this.modelId} and will be ignored`,
                    }),
                    (o = void 0)),
                a != null &&
                    (O.push({
                        type: "unsupported-setting",
                        setting: "topK",
                        details: `topK is not supported by ${this.modelId} and will be ignored`,
                    }),
                    (a = void 0)),
                r != null &&
                    (O.push({
                        type: "unsupported-setting",
                        setting: "topP",
                        details: `topP is not supported by ${this.modelId} and will be ignored`,
                    }),
                    (r = void 0))),
            A || this.modelId.includes("claude-"));
        const U =
            (x = C?.structuredOutputMode) != null
                ? x
                : this.modelId.includes("claude-fable-5-1") ||
                    this.modelId.includes("claude-opus-5-5") ||
                    this.modelId.includes("claude-sonnet-5-5")
                  ? "auto"
                  : "jsonTool";
        let L = U === "outputFormat" || (U === "auto" && g);
        !L &&
            E &&
            g &&
            c?.type === "json" &&
            c.schema != null &&
            (O.push({
                type: "unsupported-setting",
                setting: "providerOptions.anthropic.structuredOutputMode",
                details: `structuredOutputMode 'jsonTool' is not supported by ${this.modelId} because it rejects forced tool use. Using 'outputFormat' instead.`,
            }),
            (L = !0));
        const j = rd(w),
            B =
                c?.type === "json" && c.schema != null && !L
                    ? { type: "function", name: j, description: "Respond with a JSON object.", inputSchema: c.schema }
                    : void 0;
        B != null &&
            C?.disableParallelToolUse === !1 &&
            O.push({
                type: "unsupported-setting",
                setting: "providerOptions",
                details:
                    "`disableParallelToolUse: false` is ignored when using the JSON response tool. Parallel tool use is disabled to ensure a single coherent JSON tool call.",
            });
        const $ = new io(),
            H = ad(w),
            { prompt: de, betas: ee } = await zc({
                prompt: t,
                sendReasoning: (I = C?.sendReasoning) != null ? I : !0,
                warnings: O,
                cacheControlValidator: $,
                toolsetNames: H,
            });
        if (_ && C?.thinking != null) {
            const W = C.thinking;
            "type" in W && W.type === "disabled" && b
                ? (O.push({
                      type: "unsupported-setting",
                      setting: "providerOptions.anthropic.thinking",
                      details: `thinking cannot be disabled for ${this.modelId}. Using 'between_tools' thinking, the lowest thinking setting, instead.`,
                  }),
                  (C.thinking = { type: "between_tools" }))
                : "type" in W && W.type === "disabled"
                  ? (O.push({
                        type: "unsupported-setting",
                        setting: "providerOptions.anthropic.thinking",
                        details: `thinking cannot be disabled for ${this.modelId}; it always uses adaptive thinking. The thinking setting has been removed. Lower 'effort' to reduce thinking.`,
                    }),
                    (C.thinking = void 0))
                  : "type" in W &&
                    W.type === "enabled" &&
                    (O.push({
                        type: "unsupported-setting",
                        setting: "providerOptions.anthropic.thinking",
                        details: `budget-based thinking is not supported by ${this.modelId}; it always uses adaptive thinking. Using adaptive thinking instead. Use 'effort' to control how much the model thinks.`,
                    }),
                    (C.thinking = {
                        type: "adaptive",
                        ...(W.blockBinding != null && { blockBinding: W.blockBinding }),
                    }));
        }
        const Q = C?.thinking,
            V = Q != null && "type" in Q ? Q.type : void 0;
        (M &&
            V === "disabled" &&
            C != null &&
            (C.effort === "xhigh" || C.effort === "max") &&
            (O.push({
                type: "unsupported-setting",
                setting: "providerOptions.anthropic.effort",
                details: `effort '${C.effort}' is not supported by ${this.modelId} when thinking is disabled. The effort has been lowered to 'high'.`,
            }),
            (C.effort = "high")),
            V === "between_tools" &&
                C != null &&
                (C.effort === "xhigh" || C.effort === "max") &&
                (O.push({
                    type: "unsupported-setting",
                    setting: "providerOptions.anthropic.effort",
                    details: `effort '${C.effort}' is not supported with 'between_tools' thinking. The effort has been lowered to 'high'.`,
                }),
                (C.effort = "high")));
        const le = V === "enabled" || V === "adaptive" || V === "between_tools";
        let ce = Q != null && "budgetTokens" in Q ? Q.budgetTokens : void 0;
        const pe = Q != null && "display" in Q ? Q.display : void 0,
            he = Q != null && "blockBinding" in Q ? Q.blockBinding : void 0,
            re = n ?? h,
            z = {
                model: this.modelId,
                max_tokens: re,
                temperature: o,
                top_k: a,
                top_p: r,
                stop_sequences: d,
                ...((le || he != null) && {
                    thinking: {
                        ...(V != null && { type: V }),
                        ...(ce != null && { budget_tokens: ce }),
                        ...(pe != null && { display: pe }),
                        ...(he != null && { block_binding: { prefix_mismatch_behavior: he.prefixMismatchBehavior } }),
                    },
                }),
                ...((C?.effort || C?.taskBudget || (L && c?.type === "json" && c.schema != null)) && {
                    output_config: {
                        ...(C?.effort && { effort: C.effort }),
                        ...(C?.taskBudget && {
                            task_budget: {
                                type: C.taskBudget.type,
                                total: C.taskBudget.total,
                                ...(C.taskBudget.remaining != null && { remaining: C.taskBudget.remaining }),
                            },
                        }),
                        ...(L &&
                            c?.type === "json" &&
                            c.schema != null && { format: { type: "json_schema", schema: Qc(c.schema) } }),
                    },
                }),
                ...(C?.speed && { speed: C.speed }),
                ...(C?.inferenceGeo && { inference_geo: C.inferenceGeo }),
                ...(C?.fallbacks != null &&
                    (C.fallbacks === "default" || C.fallbacks.length > 0) && { fallbacks: C.fallbacks }),
                ...(C?.cacheControl && { cache_control: C.cacheControl }),
                ...(((S = C?.metadata) == null ? void 0 : S.userId) != null && {
                    metadata: { user_id: C.metadata.userId },
                }),
                ...(C?.container && {
                    container: {
                        id: C.container.id,
                        skills:
                            (R = C.container.skills) == null
                                ? void 0
                                : R.map((W) => ({ type: W.type, skill_id: W.skillId, version: W.version })),
                    },
                }),
                ...(C?.contextManagement && {
                    context_management: {
                        edits: C.contextManagement.edits
                            .map((W) => {
                                const ue = W.type;
                                switch (ue) {
                                    case "clear_tool_uses_20250919":
                                        return {
                                            type: W.type,
                                            ...(W.trigger !== void 0 && { trigger: W.trigger }),
                                            ...(W.keep !== void 0 && { keep: W.keep }),
                                            ...(W.clearAtLeast !== void 0 && { clear_at_least: W.clearAtLeast }),
                                            ...(W.clearToolInputs !== void 0 && {
                                                clear_tool_inputs: W.clearToolInputs,
                                            }),
                                            ...(W.excludeTools !== void 0 && { exclude_tools: W.excludeTools }),
                                        };
                                    case "clear_thinking_20251015":
                                        return { type: W.type, ...(W.keep !== void 0 && { keep: W.keep }) };
                                    case "compact_20260112":
                                        return {
                                            type: W.type,
                                            ...(W.trigger !== void 0 && { trigger: W.trigger }),
                                            ...(W.pauseAfterCompaction !== void 0 && {
                                                pause_after_compaction: W.pauseAfterCompaction,
                                            }),
                                            ...(W.instructions !== void 0 && { instructions: W.instructions }),
                                        };
                                    default:
                                        O.push({
                                            type: "other",
                                            message: `Unknown context management strategy: ${ue}`,
                                        });
                                        return;
                                }
                            })
                            .filter((W) => W !== void 0),
                    },
                }),
                system: de.system,
                messages: de.messages,
            };
        (le &&
            (V === "enabled" &&
                ce == null &&
                (O.push({
                    type: "other",
                    message:
                        "thinking budget is required when thinking is enabled. using default budget of 1024 tokens.",
                }),
                (z.thinking = { type: "enabled", budget_tokens: 1024 }),
                (ce = 1024)),
            z.temperature != null &&
                ((z.temperature = void 0),
                O.push({
                    type: "unsupported-setting",
                    setting: "temperature",
                    details: "temperature is not supported when thinking is enabled",
                })),
            a != null &&
                ((z.top_k = void 0),
                O.push({
                    type: "unsupported-setting",
                    setting: "topK",
                    details: "topK is not supported when thinking is enabled",
                })),
            r != null &&
                ((z.top_p = void 0),
                O.push({
                    type: "unsupported-setting",
                    setting: "topP",
                    details: "topP is not supported when thinking is enabled",
                })),
            (z.max_tokens = re + (ce ?? 0))),
            A &&
                z.max_tokens > h &&
                (n != null &&
                    O.push({
                        type: "unsupported-setting",
                        setting: "maxOutputTokens",
                        details: `${z.max_tokens} (maxOutputTokens + thinkingBudget) is greater than ${this.modelId} ${h} max output tokens. The max output tokens have been limited to ${h}.`,
                    }),
                (z.max_tokens = h)),
            C?.container &&
                C.container.skills &&
                C.container.skills.length > 0 &&
                (ee.add("code-execution-2025-08-25"),
                ee.add("skills-2025-10-02"),
                ee.add("files-api-2025-04-14"),
                w?.some(
                    (W) =>
                        W.type === "provider-defined" &&
                        (W.id === "anthropic.code_execution_20250825" || W.id === "anthropic.code_execution_20260120"),
                ) || O.push({ type: "other", message: "code execution tool is required when using skills" })),
            C?.effort && ee.add("effort-2025-11-24"),
            pe === "updates" && ee.add("thinking-display-updates-2026-08-18"),
            he != null && ee.add("thinking-binding-controls-2026-08-01"),
            C?.taskBudget && ee.add("task-budgets-2026-03-13"),
            C?.speed === "fast" && ee.add("fast-mode-2026-02-01"),
            C?.fallbacks === "default"
                ? ee.add("server-side-fallback-2026-07-01")
                : C?.fallbacks && C.fallbacks.length > 0 && ee.add("server-side-fallback-2026-06-01"),
            L && c?.type === "json" && c.schema != null && ee.add("structured-outputs-2025-11-13"));
        const D = C?.contextManagement;
        D &&
            (ee.add("context-management-2025-06-27"),
            D.edits.some((W) => W.type === "compact_20260112") && ee.add("compact-2026-01-12"));
        const {
                tools: F,
                toolChoice: q,
                toolWarnings: T,
                betas: Y,
            } = await Bc(
                B != null
                    ? {
                          tools: [...(w ?? []), B],
                          toolChoice:
                              w != null && w.length > 0 ? { type: "required" } : { type: "tool", toolName: B.name },
                          disableParallelToolUse: !0,
                          cacheControlValidator: $,
                          rejectsForcedToolUse: E,
                      }
                    : {
                          tools: w ?? [],
                          toolChoice: y,
                          disableParallelToolUse: C?.disableParallelToolUse,
                          cacheControlValidator: $,
                          rejectsForcedToolUse: E,
                      },
            ),
            xe = $.getWarnings();
        return {
            args: { ...z, tools: F, tool_choice: q },
            warnings: [...O, ...T, ...xe],
            betas: new Set([...ee, ...Y, ...e, ...((P = C?.anthropicBeta) != null ? P : [])]),
            jsonResponseToolName: B != null ? j : void 0,
        };
    }
    async getHeaders({ betas: e, headers: t }) {
        return Se(await Ee(this.config.headers), t, e.size > 0 ? { "anthropic-beta": Array.from(e).join(",") } : {});
    }
    async getBetasFromHeaders(e) {
        var t, n;
        const r = (t = (await Ee(this.config.headers))["anthropic-beta"]) != null ? t : "",
            a = (n = e?.["anthropic-beta"]) != null ? n : "";
        return new Set(
            [...r.toLowerCase().split(","), ...a.toLowerCase().split(",")].map((l) => l.trim()).filter((l) => l !== ""),
        );
    }
    buildRequestUrl(e) {
        var t, n, o;
        return (o = (n = (t = this.config).buildRequestUrl) == null ? void 0 : n.call(t, this.config.baseURL, e)) !=
            null
            ? o
            : `${this.config.baseURL}/messages`;
    }
    transformRequestBody(e, t) {
        var n, o, r;
        return (r = (o = (n = this.config).transformRequestBody) == null ? void 0 : o.call(n, e, t)) != null ? r : e;
    }
    extractCitationDocuments(e) {
        const t = (n) => {
            var o, r;
            if (n.type !== "file" || (n.mediaType !== "application/pdf" && n.mediaType !== "text/plain")) return !1;
            const a = (o = n.providerOptions) == null ? void 0 : o.anthropic,
                l = a?.citations;
            return (r = l?.enabled) != null ? r : !1;
        };
        return e
            .filter((n) => n.role === "user")
            .flatMap((n) => n.content)
            .filter(t)
            .map((n) => {
                var o;
                const r = n;
                return {
                    title: (o = r.filename) != null ? o : "Untitled Document",
                    filename: r.filename,
                    mediaType: r.mediaType,
                };
            });
    }
    async doGenerate(e) {
        var t, n, o, r, a, l, i, d, c, p;
        const {
                args: w,
                warnings: y,
                betas: k,
                jsonResponseToolName: x,
            } = await this.getArgs({ ...e, userSuppliedBetas: await this.getBetasFromHeaders(e.headers) }),
            I = this.extractCitationDocuments(e.prompt),
            {
                responseHeaders: S,
                value: R,
                rawValue: P,
            } = await ke({
                url: this.buildRequestUrl(!1),
                headers: await this.getHeaders({ betas: k, headers: e.headers }),
                body: this.transformRequestBody(w, k),
                failedResponseHandler: ra,
                successfulResponseHandler: Re(bc),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            }),
            O = [];
        let C = !1;
        for (const _ of R.content)
            switch (_.type) {
                case "text": {
                    if (x == null) {
                        const E =
                            (t = _.citations) == null
                                ? void 0
                                : t.filter((b) => b.type === "web_search_result_location");
                        if (
                            (O.push({
                                type: "text",
                                text: _.text,
                                ...(E != null && E.length > 0 && { providerMetadata: { anthropic: { citations: E } } }),
                            }),
                            _.citations)
                        )
                            for (const b of _.citations) {
                                const A = da(b, I, this.generateId);
                                A && O.push(A);
                            }
                    }
                    break;
                }
                case "thinking": {
                    O.push({
                        type: "reasoning",
                        text: _.thinking,
                        providerMetadata: { anthropic: { signature: _.signature } },
                    });
                    break;
                }
                case "redacted_thinking": {
                    O.push({ type: "reasoning", text: "", providerMetadata: { anthropic: { redactedData: _.data } } });
                    break;
                }
                case "compaction": {
                    O.push({ type: "text", text: _.content, providerMetadata: { anthropic: { type: "compaction" } } });
                    break;
                }
                case "tool_use": {
                    _.name === x
                        ? ((C = !0), O.push({ type: "text", text: JSON.stringify(_.input) }))
                        : _.toolset_name != null
                          ? O.push({
                                type: "tool-call",
                                toolCallId: _.id,
                                toolName: _.toolset_name,
                                input: JSON.stringify(ca({ memberName: _.name, input: _.input })),
                                providerMetadata: { anthropic: { toolsetName: _.toolset_name } },
                            })
                          : O.push({
                                type: "tool-call",
                                toolCallId: _.id,
                                toolName: _.name,
                                input: JSON.stringify(_.input),
                            });
                    break;
                }
                case "server_tool_use": {
                    _.name === "text_editor_code_execution" || _.name === "bash_code_execution"
                        ? O.push({
                              type: "tool-call",
                              toolCallId: _.id,
                              toolName: "code_execution",
                              input: JSON.stringify({ type: _.name, ..._.input }),
                              providerExecuted: !0,
                          })
                        : (_.name === "web_search" || _.name === "code_execution" || _.name === "web_fetch") &&
                          O.push({
                              type: "tool-call",
                              toolCallId: _.id,
                              toolName: _.name,
                              input: JSON.stringify(_.input),
                              providerExecuted: !0,
                          });
                    break;
                }
                case "web_fetch_tool_result": {
                    _.content.type === "web_fetch_result"
                        ? O.push({
                              type: "tool-result",
                              toolCallId: _.tool_use_id,
                              toolName: "web_fetch",
                              result: {
                                  type: "web_fetch_result",
                                  url: _.content.url,
                                  retrievedAt: _.content.retrieved_at,
                                  content: {
                                      type: _.content.content.type,
                                      title: _.content.content.title,
                                      citations: _.content.content.citations,
                                      source: {
                                          type: _.content.content.source.type,
                                          mediaType: _.content.content.source.media_type,
                                          data: _.content.content.source.data,
                                      },
                                  },
                              },
                              providerExecuted: !0,
                          })
                        : _.content.type === "web_fetch_tool_result_error" &&
                          O.push({
                              type: "tool-result",
                              toolCallId: _.tool_use_id,
                              toolName: "web_fetch",
                              isError: !0,
                              result: { type: "web_fetch_tool_result_error", errorCode: _.content.error_code },
                              providerExecuted: !0,
                          });
                    break;
                }
                case "web_search_tool_result": {
                    if (Array.isArray(_.content)) {
                        O.push({
                            type: "tool-result",
                            toolCallId: _.tool_use_id,
                            toolName: "web_search",
                            result: _.content.map((E) => {
                                var b;
                                return {
                                    url: E.url,
                                    title: E.title,
                                    pageAge: (b = E.page_age) != null ? b : null,
                                    encryptedContent: E.encrypted_content,
                                    type: E.type,
                                };
                            }),
                            providerExecuted: !0,
                        });
                        for (const E of _.content)
                            O.push({
                                type: "source",
                                sourceType: "url",
                                id: this.generateId(),
                                url: E.url,
                                title: E.title,
                                providerMetadata: { anthropic: { pageAge: (n = E.page_age) != null ? n : null } },
                            });
                    } else
                        O.push({
                            type: "tool-result",
                            toolCallId: _.tool_use_id,
                            toolName: "web_search",
                            isError: !0,
                            result: { type: "web_search_tool_result_error", errorCode: _.content.error_code },
                            providerExecuted: !0,
                        });
                    break;
                }
                case "code_execution_tool_result": {
                    _.content.type === "code_execution_result"
                        ? O.push({
                              type: "tool-result",
                              toolCallId: _.tool_use_id,
                              toolName: "code_execution",
                              result: {
                                  type: _.content.type,
                                  stdout: _.content.stdout,
                                  stderr: _.content.stderr,
                                  return_code: _.content.return_code,
                              },
                              providerExecuted: !0,
                          })
                        : _.content.type === "code_execution_tool_result_error" &&
                          O.push({
                              type: "tool-result",
                              toolCallId: _.tool_use_id,
                              toolName: "code_execution",
                              isError: !0,
                              result: { type: "code_execution_tool_result_error", errorCode: _.content.error_code },
                              providerExecuted: !0,
                          });
                    break;
                }
                case "bash_code_execution_tool_result":
                case "text_editor_code_execution_tool_result": {
                    O.push({
                        type: "tool-result",
                        toolCallId: _.tool_use_id,
                        toolName: "code_execution",
                        result: _.content,
                        providerExecuted: !0,
                    });
                    break;
                }
            }
        let h, g;
        const v = (o = R.usage.iterations) == null ? void 0 : o.some((_) => _.type === "fallback_message");
        if (R.usage.iterations && R.usage.iterations.length > 0 && !v) {
            const _ = R.usage.iterations.reduce(
                (E, b) => ({ input: E.input + b.input_tokens, output: E.output + b.output_tokens }),
                { input: 0, output: 0 },
            );
            ((h = _.input), (g = _.output));
        } else ((h = R.usage.input_tokens), (g = R.usage.output_tokens));
        const M = pa(R.stop_details);
        return {
            content: O,
            finishReason: ua({ finishReason: R.stop_reason, isJsonResponseFromTool: C }),
            usage: {
                inputTokens: h,
                outputTokens: g,
                totalTokens: h + g,
                cachedInputTokens: (r = R.usage.cache_read_input_tokens) != null ? r : void 0,
            },
            request: { body: w },
            response: {
                id: (a = R.id) != null ? a : void 0,
                modelId: (l = R.model) != null ? l : void 0,
                headers: S,
                body: P,
            },
            warnings: y,
            providerMetadata: {
                anthropic: {
                    usage: R.usage,
                    cacheCreationInputTokens: (i = R.usage.cache_creation_input_tokens) != null ? i : null,
                    stopSequence: (d = R.stop_sequence) != null ? d : null,
                    ...(M != null ? { stopDetails: M } : {}),
                    iterations: R.usage.iterations
                        ? R.usage.iterations.map((_) => ({
                              type: _.type,
                              ...(_.model != null ? { model: _.model } : {}),
                              inputTokens: _.input_tokens,
                              outputTokens: _.output_tokens,
                          }))
                        : null,
                    container: R.container
                        ? {
                              expiresAt: R.container.expires_at,
                              id: R.container.id,
                              skills:
                                  (p =
                                      (c = R.container.skills) == null
                                          ? void 0
                                          : c.map((_) => ({
                                                type: _.type,
                                                skillId: _.skill_id,
                                                version: _.version,
                                            }))) != null
                                      ? p
                                      : null,
                          }
                        : null,
                    contextManagement: R.context_management
                        ? {
                              appliedEdits: R.context_management.applied_edits
                                  .map((_) => {
                                      switch (_.type) {
                                          case "clear_tool_uses_20250919":
                                              return {
                                                  type: _.type,
                                                  clearedToolUses: _.cleared_tool_uses,
                                                  clearedInputTokens: _.cleared_input_tokens,
                                              };
                                          case "clear_thinking_20251015":
                                              return {
                                                  type: _.type,
                                                  clearedThinkingTurns: _.cleared_thinking_turns,
                                                  clearedInputTokens: _.cleared_input_tokens,
                                              };
                                          case "compact_20260112":
                                              return { type: _.type };
                                      }
                                  })
                                  .filter((_) => _ !== void 0),
                          }
                        : null,
                },
            },
        };
    }
    async doStream(e) {
        var t, n;
        const {
                args: o,
                warnings: r,
                betas: a,
                jsonResponseToolName: l,
            } = await this.getArgs({ ...e, userSuppliedBetas: await this.getBetasFromHeaders(e.headers) }),
            i = this.extractCitationDocuments(e.prompt),
            d = { ...o, stream: !0 },
            c = this.buildRequestUrl(!0),
            { responseHeaders: p, value: w } = await ke({
                url: c,
                headers: await this.getHeaders({ betas: a, headers: e.headers }),
                body: this.transformRequestBody(d, a),
                failedResponseHandler: ra,
                successfulResponseHandler: Pt(wc),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            });
        let y = "unknown";
        const k = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
            x = {};
        let I,
            S = null,
            R = null,
            P,
            O = null,
            C = null,
            h = null,
            g = !1,
            v = !1,
            M,
            _ = !1,
            E;
        const b = this.generateId,
            A = w.pipeThrough(
                new TransformStream({
                    start(B) {
                        B.enqueue({ type: "stream-start", warnings: r });
                    },
                    transform(B, $) {
                        var H, de, ee, Q, V, le, ce, pe, he, re, z;
                        if (_) return;
                        if ((e.includeRawChunks && $.enqueue({ type: "raw", rawValue: B.rawValue }), !B.success)) {
                            $.enqueue({ type: "error", error: B.error });
                            return;
                        }
                        const D = B.value;
                        switch (D.type) {
                            case "ping":
                                return;
                            case "content_block_start": {
                                const F = D.content_block.type;
                                if (F === "fallback") return;
                                switch (((E = F), F)) {
                                    case "text": {
                                        ((x[D.index] = { type: "text", citations: [] }),
                                            $.enqueue({ type: "text-start", id: String(D.index) }));
                                        return;
                                    }
                                    case "thinking": {
                                        ((x[D.index] = { type: "reasoning" }),
                                            $.enqueue({ type: "reasoning-start", id: String(D.index) }));
                                        return;
                                    }
                                    case "redacted_thinking": {
                                        ((x[D.index] = { type: "reasoning" }),
                                            $.enqueue({
                                                type: "reasoning-start",
                                                id: String(D.index),
                                                providerMetadata: { anthropic: { redactedData: D.content_block.data } },
                                            }));
                                        return;
                                    }
                                    case "compaction": {
                                        ((x[D.index] = { type: "text", citations: [] }),
                                            $.enqueue({
                                                type: "text-start",
                                                id: String(D.index),
                                                providerMetadata: { anthropic: { type: "compaction" } },
                                            }));
                                        return;
                                    }
                                    case "tool_use": {
                                        D.content_block.name === l
                                            ? ((g = !0),
                                              (x[D.index] = { type: "text", citations: [] }),
                                              $.enqueue({ type: "text-start", id: String(D.index) }))
                                            : D.content_block.toolset_name != null
                                              ? ((x[D.index] = {
                                                    type: "tool-call",
                                                    toolCallId: D.content_block.id,
                                                    toolName: D.content_block.toolset_name,
                                                    input: "",
                                                    firstDelta: !0,
                                                    toolset: {
                                                        name: D.content_block.toolset_name,
                                                        memberName: D.content_block.name,
                                                    },
                                                }),
                                                $.enqueue({
                                                    type: "tool-input-start",
                                                    id: D.content_block.id,
                                                    toolName: D.content_block.toolset_name,
                                                }))
                                              : ((x[D.index] = {
                                                    type: "tool-call",
                                                    toolCallId: D.content_block.id,
                                                    toolName: D.content_block.name,
                                                    input: "",
                                                    firstDelta: !0,
                                                }),
                                                $.enqueue({
                                                    type: "tool-input-start",
                                                    id: D.content_block.id,
                                                    toolName: D.content_block.name,
                                                }));
                                        return;
                                    }
                                    case "server_tool_use": {
                                        if (
                                            [
                                                "web_fetch",
                                                "web_search",
                                                "code_execution",
                                                "text_editor_code_execution",
                                                "bash_code_execution",
                                            ].includes(D.content_block.name)
                                        ) {
                                            x[D.index] = {
                                                type: "tool-call",
                                                toolCallId: D.content_block.id,
                                                toolName: D.content_block.name,
                                                input: "",
                                                providerExecuted: !0,
                                                firstDelta: !0,
                                            };
                                            const q =
                                                D.content_block.name === "text_editor_code_execution" ||
                                                D.content_block.name === "bash_code_execution"
                                                    ? "code_execution"
                                                    : D.content_block.name;
                                            $.enqueue({
                                                type: "tool-input-start",
                                                id: D.content_block.id,
                                                toolName: q,
                                                providerExecuted: !0,
                                            });
                                        }
                                        return;
                                    }
                                    case "web_fetch_tool_result": {
                                        const q = D.content_block;
                                        q.content.type === "web_fetch_result"
                                            ? $.enqueue({
                                                  type: "tool-result",
                                                  toolCallId: q.tool_use_id,
                                                  toolName: "web_fetch",
                                                  result: {
                                                      type: "web_fetch_result",
                                                      url: q.content.url,
                                                      retrievedAt: q.content.retrieved_at,
                                                      content: {
                                                          type: q.content.content.type,
                                                          title: q.content.content.title,
                                                          citations: q.content.content.citations,
                                                          source: {
                                                              type: q.content.content.source.type,
                                                              mediaType: q.content.content.source.media_type,
                                                              data: q.content.content.source.data,
                                                          },
                                                      },
                                                  },
                                                  providerExecuted: !0,
                                              })
                                            : q.content.type === "web_fetch_tool_result_error" &&
                                              $.enqueue({
                                                  type: "tool-result",
                                                  toolCallId: q.tool_use_id,
                                                  toolName: "web_fetch",
                                                  isError: !0,
                                                  result: {
                                                      type: "web_fetch_tool_result_error",
                                                      errorCode: q.content.error_code,
                                                  },
                                                  providerExecuted: !0,
                                              });
                                        return;
                                    }
                                    case "web_search_tool_result": {
                                        const q = D.content_block;
                                        if (Array.isArray(q.content)) {
                                            $.enqueue({
                                                type: "tool-result",
                                                toolCallId: q.tool_use_id,
                                                toolName: "web_search",
                                                result: q.content.map((T) => {
                                                    var Y;
                                                    return {
                                                        url: T.url,
                                                        title: T.title,
                                                        pageAge: (Y = T.page_age) != null ? Y : null,
                                                        encryptedContent: T.encrypted_content,
                                                        type: T.type,
                                                    };
                                                }),
                                                providerExecuted: !0,
                                            });
                                            for (const T of q.content)
                                                $.enqueue({
                                                    type: "source",
                                                    sourceType: "url",
                                                    id: b(),
                                                    url: T.url,
                                                    title: T.title,
                                                    providerMetadata: {
                                                        anthropic: { pageAge: (H = T.page_age) != null ? H : null },
                                                    },
                                                });
                                        } else
                                            $.enqueue({
                                                type: "tool-result",
                                                toolCallId: q.tool_use_id,
                                                toolName: "web_search",
                                                isError: !0,
                                                result: {
                                                    type: "web_search_tool_result_error",
                                                    errorCode: q.content.error_code,
                                                },
                                                providerExecuted: !0,
                                            });
                                        return;
                                    }
                                    case "code_execution_tool_result": {
                                        const q = D.content_block;
                                        q.content.type === "code_execution_result"
                                            ? $.enqueue({
                                                  type: "tool-result",
                                                  toolCallId: q.tool_use_id,
                                                  toolName: "code_execution",
                                                  result: {
                                                      type: q.content.type,
                                                      stdout: q.content.stdout,
                                                      stderr: q.content.stderr,
                                                      return_code: q.content.return_code,
                                                  },
                                                  providerExecuted: !0,
                                              })
                                            : q.content.type === "code_execution_tool_result_error" &&
                                              $.enqueue({
                                                  type: "tool-result",
                                                  toolCallId: q.tool_use_id,
                                                  toolName: "code_execution",
                                                  isError: !0,
                                                  result: {
                                                      type: "code_execution_tool_result_error",
                                                      errorCode: q.content.error_code,
                                                  },
                                                  providerExecuted: !0,
                                              });
                                        return;
                                    }
                                    case "bash_code_execution_tool_result":
                                    case "text_editor_code_execution_tool_result": {
                                        const q = D.content_block;
                                        $.enqueue({
                                            type: "tool-result",
                                            toolCallId: q.tool_use_id,
                                            toolName: "code_execution",
                                            result: q.content,
                                            providerExecuted: !0,
                                        });
                                        return;
                                    }
                                    default: {
                                        const q = F;
                                        throw new Error(`Unsupported content block type: ${q}`);
                                    }
                                }
                            }
                            case "content_block_stop": {
                                if (x[D.index] != null) {
                                    const F = x[D.index];
                                    switch (F.type) {
                                        case "text": {
                                            $.enqueue({
                                                type: "text-end",
                                                id: String(D.index),
                                                ...(F.citations.length > 0 && {
                                                    providerMetadata: { anthropic: { citations: F.citations } },
                                                }),
                                            });
                                            break;
                                        }
                                        case "reasoning": {
                                            $.enqueue({ type: "reasoning-end", id: String(D.index) });
                                            break;
                                        }
                                        case "tool-call": {
                                            if (F.toolset != null) {
                                                let T = {};
                                                try {
                                                    T = F.input === "" ? {} : JSON.parse(F.input);
                                                } catch {
                                                    T = void 0;
                                                }
                                                ((F.input =
                                                    T === void 0
                                                        ? F.input
                                                        : JSON.stringify(
                                                              ca({ memberName: F.toolset.memberName, input: T }),
                                                          )),
                                                    $.enqueue({
                                                        type: "tool-input-delta",
                                                        id: F.toolCallId,
                                                        delta: F.input,
                                                    }));
                                            }
                                            $.enqueue({ type: "tool-input-end", id: F.toolCallId });
                                            const q =
                                                F.toolName === "text_editor_code_execution" ||
                                                F.toolName === "bash_code_execution"
                                                    ? "code_execution"
                                                    : F.toolName;
                                            $.enqueue({
                                                type: "tool-call",
                                                toolCallId: F.toolCallId,
                                                toolName: q,
                                                input: F.input === "" ? "{}" : F.input,
                                                providerExecuted: F.providerExecuted,
                                                ...(F.toolset && {
                                                    providerMetadata: { anthropic: { toolsetName: F.toolset.name } },
                                                }),
                                            });
                                            break;
                                        }
                                    }
                                    delete x[D.index];
                                }
                                E = void 0;
                                return;
                            }
                            case "content_block_delta": {
                                const F = D.delta.type;
                                switch (F) {
                                    case "text_delta": {
                                        if (l != null) return;
                                        $.enqueue({ type: "text-delta", id: String(D.index), delta: D.delta.text });
                                        return;
                                    }
                                    case "thinking_delta": {
                                        $.enqueue({
                                            type: "reasoning-delta",
                                            id: String(D.index),
                                            delta: D.delta.thinking,
                                        });
                                        return;
                                    }
                                    case "signature_delta": {
                                        E === "thinking" &&
                                            $.enqueue({
                                                type: "reasoning-delta",
                                                id: String(D.index),
                                                delta: "",
                                                providerMetadata: { anthropic: { signature: D.delta.signature } },
                                            });
                                        return;
                                    }
                                    case "compaction_delta": {
                                        D.delta.content != null &&
                                            $.enqueue({
                                                type: "text-delta",
                                                id: String(D.index),
                                                delta: D.delta.content,
                                            });
                                        return;
                                    }
                                    case "input_json_delta": {
                                        const q = x[D.index];
                                        let T = D.delta.partial_json;
                                        if (T.length === 0) return;
                                        if (q?.type === "text")
                                            $.enqueue({ type: "text-delta", id: String(D.index), delta: T });
                                        else {
                                            if (q?.type !== "tool-call") return;
                                            if (q.toolset != null) {
                                                q.input += T;
                                                return;
                                            }
                                            (q.firstDelta &&
                                                (q.toolName === "bash_code_execution" ||
                                                    q.toolName === "text_editor_code_execution") &&
                                                (T = `{"type": "${q.toolName}",${T.substring(1)}`),
                                                $.enqueue({ type: "tool-input-delta", id: q.toolCallId, delta: T }),
                                                (q.input += T),
                                                (q.firstDelta = !1));
                                        }
                                        return;
                                    }
                                    case "citations_delta": {
                                        const q = D.delta.citation,
                                            T = x[D.index];
                                        T?.type === "text" &&
                                            q.type === "web_search_result_location" &&
                                            T.citations.push(q);
                                        const Y = da(q, i, b);
                                        Y && $.enqueue(Y);
                                        return;
                                    }
                                    default: {
                                        const q = F;
                                        throw new Error(`Unsupported delta type: ${q}`);
                                    }
                                }
                            }
                            case "message_start": {
                                if (v) {
                                    if (M === D.message.id) return;
                                    ((_ = !0),
                                        $.enqueue({
                                            type: "error",
                                            error: new Vt({
                                                data: D,
                                                message: `Received message_start for message ${JSON.stringify(D.message.id)} while message ${JSON.stringify(M)} is still open.`,
                                            }),
                                        }));
                                    return;
                                }
                                ((v = !0),
                                    (M = D.message.id),
                                    (k.inputTokens = D.message.usage.input_tokens),
                                    (k.cachedInputTokens =
                                        (de = D.message.usage.cache_read_input_tokens) != null ? de : void 0),
                                    (I = { ...D.message.usage }),
                                    (S = (ee = D.message.usage.cache_creation_input_tokens) != null ? ee : null),
                                    $.enqueue({
                                        type: "response-metadata",
                                        id: (Q = D.message.id) != null ? Q : void 0,
                                        modelId: (V = D.message.model) != null ? V : void 0,
                                    }));
                                return;
                            }
                            case "message_delta": {
                                (D.usage.cache_read_input_tokens != null &&
                                    (k.cachedInputTokens = D.usage.cache_read_input_tokens),
                                    D.usage.cache_creation_input_tokens != null &&
                                        (S = D.usage.cache_creation_input_tokens),
                                    D.usage.iterations != null && (C = D.usage.iterations));
                                const F =
                                    (le = D.usage.iterations) == null
                                        ? void 0
                                        : le.some((q) => q.type === "fallback_message");
                                if (D.usage.iterations && D.usage.iterations.length > 0 && !F) {
                                    const q = D.usage.iterations.reduce(
                                        (T, Y) => ({
                                            input: T.input + Y.input_tokens,
                                            output: T.output + Y.output_tokens,
                                        }),
                                        { input: 0, output: 0 },
                                    );
                                    ((k.inputTokens = q.input), (k.outputTokens = q.output));
                                } else
                                    (D.usage.input_tokens != null &&
                                        k.inputTokens !== D.usage.input_tokens &&
                                        (k.inputTokens = D.usage.input_tokens),
                                        (k.outputTokens = D.usage.output_tokens));
                                ((k.totalTokens =
                                    ((ce = k.inputTokens) != null ? ce : 0) + ((pe = k.outputTokens) != null ? pe : 0)),
                                    (y = ua({ finishReason: D.delta.stop_reason, isJsonResponseFromTool: g })),
                                    (P = pa(D.delta.stop_details)),
                                    (R = (he = D.delta.stop_sequence) != null ? he : null),
                                    (O =
                                        D.delta.container != null
                                            ? {
                                                  expiresAt: D.delta.container.expires_at,
                                                  id: D.delta.container.id,
                                                  skills:
                                                      (z =
                                                          (re = D.delta.container.skills) == null
                                                              ? void 0
                                                              : re.map((q) => ({
                                                                    type: q.type,
                                                                    skillId: q.skill_id,
                                                                    version: q.version,
                                                                }))) != null
                                                          ? z
                                                          : null,
                                              }
                                            : null),
                                    D.context_management != null &&
                                        (h = {
                                            appliedEdits: D.context_management.applied_edits
                                                .map((q) => {
                                                    switch (q.type) {
                                                        case "clear_tool_uses_20250919":
                                                            return {
                                                                type: q.type,
                                                                clearedToolUses: q.cleared_tool_uses,
                                                                clearedInputTokens: q.cleared_input_tokens,
                                                            };
                                                        case "clear_thinking_20251015":
                                                            return {
                                                                type: q.type,
                                                                clearedThinkingTurns: q.cleared_thinking_turns,
                                                                clearedInputTokens: q.cleared_input_tokens,
                                                            };
                                                        case "compact_20260112":
                                                            return { type: q.type };
                                                    }
                                                })
                                                .filter((q) => q !== void 0),
                                        }),
                                    (I = { ...I, ...D.usage }));
                                return;
                            }
                            case "message_stop": {
                                ((v = !1),
                                    (M = void 0),
                                    $.enqueue({
                                        type: "finish",
                                        finishReason: y,
                                        usage: k,
                                        providerMetadata: {
                                            anthropic: {
                                                usage: I ?? null,
                                                cacheCreationInputTokens: S,
                                                stopSequence: R,
                                                ...(P != null ? { stopDetails: P } : {}),
                                                iterations: C
                                                    ? C.map((F) => ({
                                                          type: F.type,
                                                          ...(F.model != null ? { model: F.model } : {}),
                                                          inputTokens: F.input_tokens,
                                                          outputTokens: F.output_tokens,
                                                      }))
                                                    : null,
                                                container: O,
                                                contextManagement: h,
                                            },
                                        },
                                    }));
                                return;
                            }
                            case "error": {
                                $.enqueue({ type: "error", error: D.error });
                                return;
                            }
                            default: {
                                const F = D;
                                throw new Error(`Unsupported chunk type: ${F}`);
                            }
                        }
                    },
                }),
            ),
            [U, L] = A.tee(),
            j = U.getReader();
        try {
            await j.read();
            let B = await j.read();
            if (
                (((t = B.value) == null ? void 0 : t.type) === "raw" && (B = await j.read()),
                ((n = B.value) == null ? void 0 : n.type) === "error")
            ) {
                const $ = B.value.error;
                throw new _e({
                    message: $.message,
                    url: c,
                    requestBodyValues: d,
                    statusCode: $.type === "overloaded_error" ? 529 : 500,
                    responseHeaders: p,
                    responseBody: JSON.stringify($),
                    isRetryable: $.type === "overloaded_error",
                });
            }
        } finally {
            (j.cancel().catch(() => {}), j.releaseLock());
        }
        return { stream: L, request: { body: d }, response: { headers: p } };
    }
};
function sd(e) {
    return e.includes("claude-sonnet-5-5")
        ? {
              maxOutputTokens: 128e3,
              supportsStructuredOutput: !0,
              rejectsSamplingParameters: !0,
              rejectsThinkingDisabledAboveHighEffort: !0,
              rejectsThinkingDisabled: !0,
              rejectsForcedToolUse: !0,
              supportsBetweenToolsThinking: !0,
              isKnownModel: !0,
          }
        : e.includes("claude-opus-5-5")
          ? {
                maxOutputTokens: 128e3,
                supportsStructuredOutput: !0,
                rejectsSamplingParameters: !0,
                rejectsThinkingDisabledAboveHighEffort: !0,
                rejectsThinkingDisabled: !0,
                rejectsForcedToolUse: !0,
                supportsBetweenToolsThinking: !1,
                isKnownModel: !0,
            }
          : e.includes("claude-opus-5")
            ? {
                  maxOutputTokens: 128e3,
                  supportsStructuredOutput: !0,
                  rejectsSamplingParameters: !0,
                  rejectsThinkingDisabledAboveHighEffort: !0,
                  rejectsThinkingDisabled: !1,
                  rejectsForcedToolUse: !1,
                  supportsBetweenToolsThinking: !1,
                  isKnownModel: !0,
              }
            : e.includes("claude-fable-5-1")
              ? {
                    maxOutputTokens: 128e3,
                    supportsStructuredOutput: !0,
                    rejectsSamplingParameters: !0,
                    rejectsThinkingDisabledAboveHighEffort: !1,
                    rejectsThinkingDisabled: !0,
                    rejectsForcedToolUse: !0,
                    supportsBetweenToolsThinking: !1,
                    isKnownModel: !0,
                }
              : e.includes("claude-fable-5")
                ? {
                      maxOutputTokens: 128e3,
                      supportsStructuredOutput: !0,
                      rejectsSamplingParameters: !0,
                      rejectsThinkingDisabledAboveHighEffort: !1,
                      rejectsThinkingDisabled: !0,
                      rejectsForcedToolUse: !1,
                      supportsBetweenToolsThinking: !1,
                      isKnownModel: !0,
                  }
                : e.includes("claude-opus-4-8") || e.includes("claude-opus-4-7") || e.includes("claude-sonnet-5")
                  ? {
                        maxOutputTokens: 128e3,
                        supportsStructuredOutput: !0,
                        rejectsSamplingParameters: !0,
                        rejectsThinkingDisabledAboveHighEffort: !1,
                        rejectsThinkingDisabled: !1,
                        rejectsForcedToolUse: !1,
                        supportsBetweenToolsThinking: !1,
                        isKnownModel: !0,
                    }
                  : e.includes("claude-sonnet-4-6") || e.includes("claude-opus-4-6")
                    ? {
                          maxOutputTokens: 128e3,
                          supportsStructuredOutput: !0,
                          rejectsSamplingParameters: !1,
                          rejectsThinkingDisabledAboveHighEffort: !1,
                          rejectsThinkingDisabled: !1,
                          rejectsForcedToolUse: !1,
                          supportsBetweenToolsThinking: !1,
                          isKnownModel: !0,
                      }
                    : e.includes("claude-sonnet-4-5") || e.includes("claude-opus-4-5") || e.includes("claude-haiku-4-5")
                      ? {
                            maxOutputTokens: 64e3,
                            supportsStructuredOutput: !0,
                            rejectsSamplingParameters: !1,
                            rejectsThinkingDisabledAboveHighEffort: !1,
                            rejectsThinkingDisabled: !1,
                            rejectsForcedToolUse: !1,
                            supportsBetweenToolsThinking: !1,
                            isKnownModel: !0,
                        }
                      : e.includes("claude-opus-4-1")
                        ? {
                              maxOutputTokens: 32e3,
                              supportsStructuredOutput: !0,
                              rejectsSamplingParameters: !1,
                              rejectsThinkingDisabledAboveHighEffort: !1,
                              rejectsThinkingDisabled: !1,
                              rejectsForcedToolUse: !1,
                              supportsBetweenToolsThinking: !1,
                              isKnownModel: !0,
                          }
                        : e.includes("claude-sonnet-4-") || e.includes("claude-3-7-sonnet")
                          ? {
                                maxOutputTokens: 64e3,
                                supportsStructuredOutput: !1,
                                rejectsSamplingParameters: !1,
                                rejectsThinkingDisabledAboveHighEffort: !1,
                                rejectsThinkingDisabled: !1,
                                rejectsForcedToolUse: !1,
                                supportsBetweenToolsThinking: !1,
                                isKnownModel: !0,
                            }
                          : e.includes("claude-opus-4-")
                            ? {
                                  maxOutputTokens: 32e3,
                                  supportsStructuredOutput: !1,
                                  rejectsSamplingParameters: !1,
                                  rejectsThinkingDisabledAboveHighEffort: !1,
                                  rejectsThinkingDisabled: !1,
                                  rejectsForcedToolUse: !1,
                                  supportsBetweenToolsThinking: !1,
                                  isKnownModel: !0,
                              }
                            : e.includes("claude-3-haiku")
                              ? {
                                    maxOutputTokens: 4096,
                                    supportsStructuredOutput: !1,
                                    rejectsSamplingParameters: !1,
                                    rejectsThinkingDisabledAboveHighEffort: !1,
                                    rejectsThinkingDisabled: !1,
                                    rejectsForcedToolUse: !1,
                                    supportsBetweenToolsThinking: !1,
                                    isKnownModel: !0,
                                }
                              : /claude-(?:instant(?:-|$)|v?2(?=$|[-.:])|3(?=$|[-.]))/.test(e)
                                ? {
                                      maxOutputTokens: 4096,
                                      supportsStructuredOutput: !1,
                                      rejectsSamplingParameters: !1,
                                      rejectsThinkingDisabledAboveHighEffort: !1,
                                      rejectsThinkingDisabled: !1,
                                      rejectsForcedToolUse: !1,
                                      supportsBetweenToolsThinking: !1,
                                      isKnownModel: !1,
                                  }
                                : e.includes("claude-")
                                  ? {
                                        maxOutputTokens: 128e3,
                                        supportsStructuredOutput: !0,
                                        rejectsSamplingParameters: !0,
                                        rejectsThinkingDisabledAboveHighEffort: !0,
                                        rejectsThinkingDisabled: !1,
                                        rejectsForcedToolUse: !1,
                                        supportsBetweenToolsThinking: !1,
                                        isKnownModel: !1,
                                    }
                                  : {
                                        maxOutputTokens: 4096,
                                        supportsStructuredOutput: !1,
                                        rejectsSamplingParameters: !1,
                                        rejectsThinkingDisabledAboveHighEffort: !1,
                                        rejectsThinkingDisabled: !1,
                                        rejectsForcedToolUse: !1,
                                        supportsBetweenToolsThinking: !1,
                                        isKnownModel: !1,
                                    };
}
function pa(e) {
    if (e != null)
        return {
            type: e.type,
            ...(e.category != null ? { category: e.category } : {}),
            ...(e.explanation != null ? { explanation: e.explanation } : {}),
            ...(e.recommended_model != null ? { recommendedModel: e.recommended_model } : {}),
        };
}
var ld = K(() => G(u({ command: s(), restart: ne().optional() }))),
    ud = Pe({ id: "anthropic.bash_20241022", name: "bash", inputSchema: ld }),
    cd = K(() => G(u({ command: s(), restart: ne().optional() }))),
    dd = Pe({ id: "anthropic.bash_20250124", name: "bash", inputSchema: cd }),
    pd = K(() =>
        G(
            ie("type", [
                u({
                    type: m("code_execution_result"),
                    stdout: s(),
                    stderr: s(),
                    return_code: f(),
                    content: N(u({ type: m("code_execution_output"), file_id: s() }))
                        .optional()
                        .default([]),
                }),
                u({
                    type: m("bash_code_execution_result"),
                    content: N(u({ type: m("bash_code_execution_output"), file_id: s() })),
                    stdout: s(),
                    stderr: s(),
                    return_code: f(),
                }),
                u({ type: m("bash_code_execution_tool_result_error"), error_code: s() }),
                u({ type: m("text_editor_code_execution_tool_result_error"), error_code: s() }),
                u({
                    type: m("text_editor_code_execution_view_result"),
                    content: s(),
                    file_type: s(),
                    num_lines: f().nullable(),
                    start_line: f().nullable(),
                    total_lines: f().nullable(),
                }),
                u({ type: m("text_editor_code_execution_create_result"), is_file_update: ne() }),
                u({
                    type: m("text_editor_code_execution_str_replace_result"),
                    lines: N(s()).nullable(),
                    new_lines: f().nullable(),
                    new_start: f().nullable(),
                    old_lines: f().nullable(),
                    old_start: f().nullable(),
                }),
            ]),
        ),
    ),
    fd = K(() =>
        G(
            ie("type", [
                u({ type: m("programmatic-tool-call"), code: s() }),
                u({ type: m("bash_code_execution"), command: s() }),
                ie("command", [
                    u({ type: m("text_editor_code_execution"), command: m("view"), path: s() }),
                    u({
                        type: m("text_editor_code_execution"),
                        command: m("create"),
                        path: s(),
                        file_text: s().nullish(),
                    }),
                    u({
                        type: m("text_editor_code_execution"),
                        command: m("str_replace"),
                        path: s(),
                        old_str: s(),
                        new_str: s(),
                    }),
                ]),
            ]),
        ),
    ),
    md = Le({ id: "anthropic.code_execution_20260120", name: "code_execution", inputSchema: fd, outputSchema: pd }),
    hd = (e = {}) => md(e),
    gd = K(() =>
        G(
            u({
                action: J([
                    "key",
                    "type",
                    "mouse_move",
                    "left_click",
                    "left_click_drag",
                    "right_click",
                    "middle_click",
                    "double_click",
                    "screenshot",
                    "cursor_position",
                ]),
                coordinate: N(f().int()).optional(),
                text: s().optional(),
            }),
        ),
    ),
    _d = Pe({ id: "anthropic.computer_20241022", name: "computer", inputSchema: gd }),
    yd = K(() =>
        G(
            u({
                action: J([
                    "key",
                    "hold_key",
                    "type",
                    "cursor_position",
                    "mouse_move",
                    "left_mouse_down",
                    "left_mouse_up",
                    "left_click",
                    "left_click_drag",
                    "right_click",
                    "middle_click",
                    "double_click",
                    "triple_click",
                    "scroll",
                    "wait",
                    "screenshot",
                ]),
                coordinate: Ot([f().int(), f().int()]).optional(),
                duration: f().optional(),
                scroll_amount: f().optional(),
                scroll_direction: J(["up", "down", "left", "right"]).optional(),
                start_coordinate: Ot([f().int(), f().int()]).optional(),
                text: s().optional(),
            }),
        ),
    ),
    vd = Pe({ id: "anthropic.computer_20250124", name: "computer", inputSchema: yd }),
    bd = K(() =>
        G(
            ie("command", [
                u({ command: m("view"), path: s(), view_range: Ot([f(), f()]).optional() }),
                u({ command: m("create"), path: s(), file_text: s() }),
                u({ command: m("str_replace"), path: s(), old_str: s(), new_str: s() }),
                u({ command: m("insert"), path: s(), insert_line: f(), insert_text: s() }),
                u({ command: m("delete"), path: s() }),
                u({ command: m("rename"), old_path: s(), new_path: s() }),
            ]),
        ),
    ),
    wd = Pe({ id: "anthropic.memory_20250818", name: "memory", inputSchema: bd }),
    xd = K(() =>
        G(
            u({
                command: J(["view", "create", "str_replace", "insert", "undo_edit"]),
                path: s(),
                file_text: s().optional(),
                insert_line: f().int().optional(),
                new_str: s().optional(),
                old_str: s().optional(),
                view_range: N(f().int()).optional(),
            }),
        ),
    ),
    Td = Pe({ id: "anthropic.text_editor_20241022", name: "str_replace_editor", inputSchema: xd }),
    kd = K(() =>
        G(
            u({
                command: J(["view", "create", "str_replace", "insert", "undo_edit"]),
                path: s(),
                file_text: s().optional(),
                insert_line: f().int().optional(),
                new_str: s().optional(),
                old_str: s().optional(),
                view_range: N(f().int()).optional(),
            }),
        ),
    ),
    Id = Pe({ id: "anthropic.text_editor_20250124", name: "str_replace_editor", inputSchema: kd }),
    Sd = K(() =>
        G(
            u({
                command: J(["view", "create", "str_replace", "insert"]),
                path: s(),
                file_text: s().optional(),
                insert_line: f().int().optional(),
                new_str: s().optional(),
                old_str: s().optional(),
                view_range: N(f().int()).optional(),
            }),
        ),
    ),
    Cd = Pe({ id: "anthropic.text_editor_20250429", name: "str_replace_based_edit_tool", inputSchema: Sd }),
    Ed = {
        bash_20241022: ud,
        bash_20250124: dd,
        codeExecution_20250522: Hc,
        codeExecution_20250825: Wc,
        codeExecution_20260120: hd,
        computer_20241022: _d,
        computer_20250124: vd,
        computerToolset_20260801: Ec,
        memory_20250818: wd,
        textEditor_20241022: Td,
        textEditor_20250124: Id,
        textEditor_20250429: Cd,
        textEditor_20250728: Mc,
        webFetch_20250910: jc,
        webSearch_20250305: Dc,
    };
function vi(e = {}) {
    var t, n;
    const o =
            (t = bn(xt({ settingValue: e.baseURL, environmentVariableName: "ANTHROPIC_BASE_URL" }))) != null
                ? t
                : "https://api.anthropic.com/v1",
        r = (n = e.name) != null ? n : "anthropic.messages",
        a = () =>
            vt(
                {
                    "anthropic-version": "2023-06-01",
                    "x-api-key": oo({
                        apiKey: e.apiKey,
                        environmentVariableName: "ANTHROPIC_API_KEY",
                        description: "Anthropic",
                    }),
                    ...e.headers,
                },
                `ai-sdk/anthropic/${yc}`,
            ),
        l = (d) => {
            var c;
            return new id(d, {
                provider: r,
                baseURL: o,
                headers: a,
                fetch: e.fetch,
                generateId: (c = e.generateId) != null ? c : Ne,
                supportedUrls: () => ({ "image/*": [/^https?:\/\/.*$/] }),
            });
        },
        i = function (d) {
            if (new.target) throw new Error("The Anthropic model function cannot be called with the new keyword.");
            return l(d);
        };
    return (
        (i.languageModel = l),
        (i.chat = l),
        (i.messages = l),
        (i.textEmbeddingModel = (d) => {
            throw new Go({ modelId: d, modelType: "textEmbeddingModel" });
        }),
        (i.imageModel = (d) => {
            throw new Go({ modelId: d, modelType: "imageModel" });
        }),
        (i.tools = Ed),
        i
    );
}
vi();
var Rd = "2.0.101",
    Od = K(() => G(u({ error: u({ code: f().nullable(), message: s(), status: s(), details: N(Ue()).nullish() }) }))),
    Zt = Xe({ errorSchema: Od, errorToMessage: (e) => e.error.message }),
    Ad = X([u({ text: s() }), u({ inlineData: u({ mimeType: s(), data: s() }) })]),
    Md = K(() =>
        G(
            u({
                outputDimensionality: f().optional(),
                taskType: J([
                    "SEMANTIC_SIMILARITY",
                    "CLASSIFICATION",
                    "CLUSTERING",
                    "RETRIEVAL_DOCUMENT",
                    "RETRIEVAL_QUERY",
                    "QUESTION_ANSWERING",
                    "FACT_VERIFICATION",
                    "CODE_RETRIEVAL_QUERY",
                ]).optional(),
                content: N(N(Ad).min(1).nullable()).optional(),
            }),
        ),
    ),
    Nd = class {
        constructor(e, t) {
            ((this.specificationVersion = "v2"),
                (this.maxEmbeddingsPerCall = 2048),
                (this.supportsParallelCalls = !0),
                (this.modelId = e),
                (this.config = t));
        }
        get provider() {
            return this.config.provider;
        }
        async doEmbed({ values: e, headers: t, abortSignal: n, providerOptions: o }) {
            const r = await Ie({ provider: "google", providerOptions: o, schema: Md });
            if (e.length > this.maxEmbeddingsPerCall)
                throw new Hr({
                    provider: this.provider,
                    modelId: this.modelId,
                    maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
                    values: e,
                });
            const a = Se(await Ee(this.config.headers), t),
                l = r?.content;
            if (l != null && l.length !== e.length)
                throw new Error(
                    `The number of multimodal content entries (${l.length}) must match the number of values (${e.length}).`,
                );
            if (e.length === 1) {
                const p = l?.[0],
                    w = e[0] ? [{ text: e[0] }] : [],
                    y = p != null ? [...w, ...p] : [{ text: e[0] }],
                    {
                        responseHeaders: k,
                        value: x,
                        rawValue: I,
                    } = await ke({
                        url: `${this.config.baseURL}/models/${this.modelId}:embedContent`,
                        headers: a,
                        body: {
                            model: `models/${this.modelId}`,
                            content: { parts: y },
                            outputDimensionality: r?.outputDimensionality,
                            taskType: r?.taskType,
                        },
                        failedResponseHandler: Zt,
                        successfulResponseHandler: Re($d),
                        abortSignal: n,
                        fetch: this.config.fetch,
                    });
                return { embeddings: [x.embedding.values], usage: void 0, response: { headers: k, body: I } };
            }
            const {
                responseHeaders: i,
                value: d,
                rawValue: c,
            } = await ke({
                url: `${this.config.baseURL}/models/${this.modelId}:batchEmbedContents`,
                headers: a,
                body: {
                    requests: e.map((p, w) => {
                        const y = l?.[w],
                            k = p ? [{ text: p }] : [];
                        return {
                            model: `models/${this.modelId}`,
                            content: { role: "user", parts: y != null ? [...k, ...y] : [{ text: p }] },
                            outputDimensionality: r?.outputDimensionality,
                            taskType: r?.taskType,
                        };
                    }),
                },
                failedResponseHandler: Zt,
                successfulResponseHandler: Re(Pd),
                abortSignal: n,
                fetch: this.config.fetch,
            });
            return { embeddings: d.embeddings.map((p) => p.values), usage: void 0, response: { headers: i, body: c } };
        }
    },
    Pd = K(() => G(u({ embeddings: N(u({ values: N(f()) })) }))),
    $d = K(() => G(u({ embedding: u({ values: N(f()) }) }))),
    bi = "recursive JSON Schema reference:";
function Dd(e) {
    return ye.isInstance(e) && e.functionality.startsWith(bi);
}
function wi(e, t = !0) {
    const n = typeof e == "object" ? e : void 0;
    return tt(e, t, { definitions: n?.definitions, dollarDefinitions: n?.$defs, resolvingReferences: new Set() });
}
function tt(e, t, n) {
    if (e == null) return;
    if (typeof e == "boolean") return { type: "boolean", properties: {} };
    if (e.$ref != null) return Ld({ jsonSchema: e, reference: e.$ref, isRoot: t, referenceContext: n });
    if (Bd(e)) return t ? void 0 : e.description ? { type: "object", description: e.description } : { type: "object" };
    const {
            type: o,
            description: r,
            required: a,
            properties: l,
            items: i,
            allOf: d,
            anyOf: c,
            oneOf: p,
            format: w,
            const: y,
            minLength: k,
            enum: x,
        } = e,
        I = {};
    if ((r && (I.description = r), a && (I.required = a), w && (I.format = w), o))
        if (Array.isArray(o)) {
            const R = o.includes("null"),
                P = o.filter((O) => O !== "null");
            P.length === 0 ? (I.type = "null") : ((I.anyOf = P.map((O) => ({ type: O }))), R && (I.nullable = !0));
        } else I.type = o;
    const S = x ?? (y !== void 0 ? [y] : void 0);
    if (
        (S !== void 0 && qd({ values: S, type: o, result: I }),
        l != null && (I.properties = Object.entries(l).reduce((R, [P, O]) => ((R[P] = tt(O, !1, n)), R), {})),
        i && (I.items = Array.isArray(i) ? i.map((R) => tt(R, !1, n)) : tt(i, !1, n)),
        d && (I.allOf = d.map((R) => tt(R, !1, n))),
        c)
    )
        if (c.some((R) => typeof R == "object" && R?.type === "null")) {
            const R = c.filter((P) => !(typeof P == "object" && P?.type === "null"));
            if (R.length === 1) {
                const P = tt(R[0], !1, n);
                typeof P == "object" && ((I.nullable = !0), Object.assign(I, P));
            } else ((I.anyOf = R.map((P) => tt(P, !1, n))), (I.nullable = !0));
        } else I.anyOf = c.map((R) => tt(R, !1, n));
    return (p && (I.oneOf = p.map((R) => tt(R, !1, n))), k !== void 0 && (I.minLength = k), I);
}
function qd({ values: e, type: t, result: n }) {
    const o = (Array.isArray(t) && t.includes("null")) || (t === void 0 && e.includes(null)),
        r = o ? e.filter((l) => l !== null) : e;
    if (
        e.length > 0 &&
        e.every((l) => l === null) &&
        (t === void 0 || t === "null" || (Array.isArray(t) && t.includes("null")))
    ) {
        ((n.type = "null"), Array.isArray(t) && delete n.anyOf);
        return;
    }
    const a = Ud({ values: r, type: t });
    if (a === void 0)
        throw new ye({
            functionality: "JSON Schema enum with mixed or unsupported values",
            message:
                "Google does not support this JSON Schema enum. Enum values must share one supported primitive type and match the schema type.",
        });
    ((n.type = a),
        Array.isArray(t) && delete n.anyOf,
        o && (n.nullable = !0),
        a === "string" ? (n.enum = r) : ((n.format = "enum"), (n.enum = r.map(String))));
}
function Ud({ values: e, type: t }) {
    if (e.length === 0) return;
    const n = (o) => t === void 0 || t === o || (Array.isArray(t) && t.includes(o));
    if (n("string") && e.every((o) => typeof o == "string")) return "string";
    if ((n("number") || n("integer")) && e.every((o) => typeof o == "number" && Number.isFinite(o))) {
        if (n("number")) return "number";
        if (e.every((o) => Number.isInteger(o))) return "integer";
    }
    if (n("boolean") && e.every((o) => typeof o == "boolean")) return "boolean";
}
function Ld({ jsonSchema: e, reference: t, isRoot: n, referenceContext: o }) {
    const { definition: r, referenceKey: a } = jd(t, o);
    if (o.resolvingReferences.has(a))
        throw new ye({
            functionality: `${bi} ${t}`,
            message: "Google schema conversion does not support recursive JSON Schema references.",
        });
    const l = new Set(o.resolvingReferences);
    l.add(a);
    const { $ref: i, ...d } = e,
        c = typeof r == "boolean" ? (r ? d : !1) : { ...r, ...d };
    return tt(c, n, { ...o, resolvingReferences: l });
}
function jd(e, t) {
    const o = [
            { prefix: "#/$defs/", definitions: t.dollarDefinitions },
            { prefix: "#/definitions/", definitions: t.definitions },
        ].find(({ prefix: i }) => e.startsWith(i)),
        r = o ? e.slice(o.prefix.length) : void 0;
    (o == null || r == null || r.length === 0 || r.includes("/")) && rn(e);
    let a;
    try {
        a = decodeURIComponent(r);
    } catch {
        rn(e);
    }
    (a.includes("/") || /~(?![01])/u.test(a) || o.definitions == null) && rn(e);
    const l = a.replace(/~[01]/g, (i) => (i === "~1" ? "/" : "~"));
    return (
        Object.prototype.hasOwnProperty.call(o.definitions, l) || rn(e),
        { definition: o.definitions[l], referenceKey: `${o.prefix}${l}` }
    );
}
function rn(e) {
    throw new ye({
        functionality: `JSON Schema reference: ${e}`,
        message:
            "Google schema conversion only supports references to direct children of root-level $defs or definitions.",
    });
}
function Bd(e) {
    return (
        e != null &&
        typeof e == "object" &&
        e.type === "object" &&
        (e.properties == null || Object.keys(e.properties).length === 0) &&
        !e.additionalProperties
    );
}
var Gd = "skip_thought_signature_validator";
function Fd(e, t) {
    var n, o, r;
    const a = [],
        l = [];
    let i = !0;
    const d = (n = t?.isGemmaModel) != null ? n : !1,
        c = (o = t?.isGemini3Model) != null ? o : !1,
        p = (r = t?.supportsFunctionResponseParts) != null ? r : !0;
    for (const { role: w, content: y } of e)
        switch (w) {
            case "system": {
                if (!i)
                    throw new ye({
                        functionality: "system messages are only supported at the beginning of the conversation",
                    });
                a.push({ text: y });
                break;
            }
            case "user": {
                i = !1;
                const k = [];
                for (const x of y)
                    switch (x.type) {
                        case "text": {
                            k.push({ text: x.text });
                            break;
                        }
                        case "file": {
                            const I = x.mediaType === "image/*" ? "image/jpeg" : x.mediaType;
                            k.push(
                                x.data instanceof URL
                                    ? {
                                          fileData: {
                                              mimeType: I,
                                              fileUri:
                                                  x.data.protocol === "gs:" && x.originalUrl != null
                                                      ? x.originalUrl
                                                      : x.data.toString(),
                                          },
                                      }
                                    : { inlineData: { mimeType: I, data: ot(x.data) } },
                            );
                            break;
                        }
                    }
                l.push({ role: "user", parts: k });
                break;
            }
            case "assistant": {
                i = !1;
                let k = !1;
                l.push({
                    role: "model",
                    parts: y
                        .map((x) => {
                            var I, S, R;
                            const P =
                                ((S = (I = x.providerOptions) == null ? void 0 : I.google) == null
                                    ? void 0
                                    : S.thoughtSignature) != null
                                    ? String((R = x.providerOptions.google) == null ? void 0 : R.thoughtSignature)
                                    : void 0;
                            switch (x.type) {
                                case "text":
                                    return x.text.length === 0 ? void 0 : { text: x.text, thoughtSignature: P };
                                case "reasoning":
                                    return x.text.length === 0
                                        ? void 0
                                        : { text: x.text, thought: !0, thoughtSignature: P };
                                case "file": {
                                    if (x.mediaType !== "image/png")
                                        throw new ye({
                                            functionality: "Only PNG images are supported in assistant messages",
                                        });
                                    if (x.data instanceof URL)
                                        throw new ye({
                                            functionality: "File data URLs in assistant messages are not supported",
                                        });
                                    return { inlineData: { mimeType: x.mediaType, data: ot(x.data) } };
                                }
                                case "tool-call": {
                                    const O = P ?? (c && !k ? Gd : void 0);
                                    return (
                                        P != null && (k = !0),
                                        {
                                            functionCall: {
                                                ...(x.toolCallId != null ? { id: x.toolCallId } : {}),
                                                name: x.toolName,
                                                args: x.input,
                                            },
                                            thoughtSignature: O,
                                        }
                                    );
                                }
                            }
                        })
                        .filter((x) => x !== void 0),
                });
                break;
            }
            case "tool": {
                i = !1;
                const k = [];
                for (const x of y) {
                    const I = x.output;
                    I.type === "content"
                        ? p
                            ? Hd({ parts: k, part: x, output: I })
                            : Vd({ parts: k, part: x, output: I })
                        : k.push({
                              functionResponse: {
                                  ...(x.toolCallId != null ? { id: x.toolCallId } : {}),
                                  name: x.toolName,
                                  response: { name: x.toolName, content: I.value },
                              },
                          });
                }
                l.push({ role: "user", parts: k });
                break;
            }
        }
    if (d && a.length > 0 && l.length > 0 && l[0].role === "user") {
        const w = a.map((y) => y.text).join(`

`);
        l[0].parts.unshift({
            text:
                w +
                `

`,
        });
    }
    return { systemInstruction: a.length > 0 && !d ? { parts: a } : void 0, contents: l };
}
function Hd({ parts: e, part: t, output: n }) {
    const o = [],
        r = [];
    for (const l of n.value)
        switch (l.type) {
            case "text":
                o.push(l.text);
                break;
            case "media":
                r.push({ inlineData: { mimeType: l.mediaType, data: l.data } });
                break;
        }
    const a =
        o.length > 0
            ? o.join(`
`)
            : "Tool executed successfully.";
    e.push({
        functionResponse: {
            ...(t.toolCallId != null ? { id: t.toolCallId } : {}),
            name: t.toolName,
            response: { name: t.toolName, content: a },
            ...(r.length > 0 ? { parts: r } : {}),
        },
    });
}
function Vd({ parts: e, part: t, output: n }) {
    for (const o of n.value)
        switch (o.type) {
            case "text":
                e.push({
                    functionResponse: {
                        ...(t.toolCallId != null ? { id: t.toolCallId } : {}),
                        name: t.toolName,
                        response: { name: t.toolName, content: o.text },
                    },
                });
                break;
            case "media":
                e.push(
                    { inlineData: { mimeType: o.mediaType, data: o.data } },
                    { text: "Tool executed successfully and returned this image as a response" },
                );
                break;
            default:
                e.push({ text: JSON.stringify(o) });
                break;
        }
}
function fa(e) {
    return e.includes("/") ? e : `models/${e}`;
}
var Jd = K(() =>
        G(
            u({
                responseModalities: N(J(["TEXT", "IMAGE"])).optional(),
                thinkingConfig: u({
                    thinkingBudget: f().optional(),
                    includeThoughts: ne().optional(),
                    thinkingLevel: J(["minimal", "low", "medium", "high"]).optional(),
                }).optional(),
                cachedContent: s().optional(),
                structuredOutputs: ne().optional(),
                safetySettings: N(
                    u({
                        category: J([
                            "HARM_CATEGORY_UNSPECIFIED",
                            "HARM_CATEGORY_HATE_SPEECH",
                            "HARM_CATEGORY_DANGEROUS_CONTENT",
                            "HARM_CATEGORY_HARASSMENT",
                            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            "HARM_CATEGORY_CIVIC_INTEGRITY",
                        ]),
                        threshold: J([
                            "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
                            "BLOCK_LOW_AND_ABOVE",
                            "BLOCK_MEDIUM_AND_ABOVE",
                            "BLOCK_ONLY_HIGH",
                            "BLOCK_NONE",
                            "OFF",
                        ]),
                    }),
                ).optional(),
                threshold: J([
                    "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
                    "BLOCK_LOW_AND_ABOVE",
                    "BLOCK_MEDIUM_AND_ABOVE",
                    "BLOCK_ONLY_HIGH",
                    "BLOCK_NONE",
                    "OFF",
                ]).optional(),
                audioTimestamp: ne().optional(),
                labels: we(s(), s()).optional(),
                mediaResolution: J([
                    "MEDIA_RESOLUTION_UNSPECIFIED",
                    "MEDIA_RESOLUTION_LOW",
                    "MEDIA_RESOLUTION_MEDIUM",
                    "MEDIA_RESOLUTION_HIGH",
                ]).optional(),
                imageConfig: u({
                    aspectRatio: J([
                        "1:1",
                        "2:3",
                        "3:2",
                        "3:4",
                        "4:3",
                        "4:5",
                        "5:4",
                        "9:16",
                        "16:9",
                        "21:9",
                        "1:8",
                        "8:1",
                        "1:4",
                        "4:1",
                    ]).optional(),
                    imageSize: J(["1K", "2K", "4K", "512"]).optional(),
                    personGeneration: J([
                        "PERSON_GENERATION_UNSPECIFIED",
                        "ALLOW_ALL",
                        "ALLOW_ADULT",
                        "ALLOW_NONE",
                    ]).optional(),
                    prominentPeople: J([
                        "PROMINENT_PEOPLE_UNSPECIFIED",
                        "ALLOW_PROMINENT_PEOPLE",
                        "BLOCK_PROMINENT_PEOPLE",
                    ]).optional(),
                    imageOutputOptions: u({
                        mimeType: J(["image/jpeg", "image/png"]).optional(),
                        compressionQuality: f().optional(),
                    }).optional(),
                }).optional(),
                retrievalConfig: u({ latLng: u({ latitude: f(), longitude: f() }).optional() }).optional(),
                serviceTier: J(["standard", "flex", "priority"]).optional(),
            }),
        ),
    ),
    Wd = { standard: "SERVICE_TIER_STANDARD", flex: "SERVICE_TIER_FLEX", priority: "SERVICE_TIER_PRIORITY" },
    Zd = /(^|\/)gemini-1(?:[.-]|$)/i,
    zd = /(^|\/)gemini-2(?:[.-]|$)/i,
    Kd = /(^|\/)gemini-2\.5(?:[.-]|$)/i,
    Yd = /(^|\/)gemini-/i;
function Xd(e) {
    return Zd.test(e) || /(^|\/)gemini-pro(?:-vision)?$/i.test(e) || /(^|\/)gemini-robotics-er-1\.5(?:[.-]|$)/i.test(e);
}
function xi(e) {
    const t = Yd.test(e),
        n = zd.test(e),
        o = Xd(e),
        a = t && !(o || n);
    return {
        supportsGemini2Tools: (t && !o) || e.toLowerCase().includes("nano-banana"),
        supportsFileSearch: Kd.test(e) || a,
        usesGemini3Features: a,
    };
}
function Qd({ tools: e, toolChoice: t, modelId: n, isVertexProvider: o = !1 }) {
    e = e?.length ? e : void 0;
    const r = [],
        { supportsGemini2Tools: a, supportsFileSearch: l, usesGemini3Features: i } = xi(n);
    if (e == null) return { tools: void 0, toolConfig: void 0, toolWarnings: r };
    const d = e.some((k) => k.type === "function"),
        c = e.some((k) => k.type === "provider-defined");
    if (d && c && !i) {
        const k = e.filter((x) => x.type === "function");
        r.push({
            type: "unsupported-tool",
            tool: e.find((x) => x.type === "function"),
            details: `Cannot mix function tools with provider-defined tools in the same request. Falling back to provider-defined tools only. The following function tools will be ignored: ${k.map((x) => x.name).join(", ")}. Please use either function tools or provider-defined tools, but not both.`,
        });
    }
    if (c) {
        const k = [];
        if (
            (e
                .filter((I) => I.type === "provider-defined")
                .forEach((I) => {
                    switch (I.id) {
                        case "google.google_search":
                            a
                                ? k.push({ googleSearch: { ...I.args } })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details: "Google Search requires Gemini 2.0 or newer.",
                                  });
                            break;
                        case "google.enterprise_web_search":
                            a
                                ? k.push({ enterpriseWebSearch: {} })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details: "Enterprise Web Search requires Gemini 2.0 or newer.",
                                  });
                            break;
                        case "google.url_context":
                            a
                                ? k.push({ urlContext: {} })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details:
                                          "The URL context tool is not supported with other Gemini models than Gemini 2.",
                                  });
                            break;
                        case "google.code_execution":
                            a
                                ? k.push({ codeExecution: {} })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details:
                                          "The code execution tools is not supported with other Gemini models than Gemini 2.",
                                  });
                            break;
                        case "google.file_search":
                            l
                                ? k.push({ fileSearch: { ...I.args } })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details: "The file search tool is only supported with Gemini 2.5 models.",
                                  });
                            break;
                        case "google.vertex_rag_store":
                            a
                                ? k.push({
                                      retrieval: {
                                          vertex_rag_store: {
                                              rag_resources: { rag_corpus: I.args.ragCorpus },
                                              similarity_top_k: I.args.topK,
                                          },
                                      },
                                  })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details:
                                          "The RAG store tool is not supported with other Gemini models than Gemini 2.",
                                  });
                            break;
                        case "google.google_maps":
                            a
                                ? k.push({ googleMaps: {} })
                                : r.push({
                                      type: "unsupported-tool",
                                      tool: I,
                                      details:
                                          "The Google Maps grounding tool is not supported with Gemini models other than Gemini 2 or newer.",
                                  });
                            break;
                        default:
                            r.push({ type: "unsupported-tool", tool: I });
                            break;
                    }
                }),
            d && i && k.length > 0)
        ) {
            const I = [];
            for (const R of e) R.type === "function" && I.push(ma(R));
            const S = {
                functionCallingConfig: { mode: "VALIDATED" },
                ...(!o && { includeServerSideToolInvocations: !0 }),
            };
            if (t != null)
                switch (t.type) {
                    case "auto":
                        break;
                    case "none":
                        S.functionCallingConfig = { mode: "NONE" };
                        break;
                    case "required":
                        S.functionCallingConfig = { mode: "ANY" };
                        break;
                    case "tool":
                        S.functionCallingConfig = { mode: "ANY", allowedFunctionNames: [t.toolName] };
                        break;
                }
            return { tools: [...k, { functionDeclarations: I }], toolConfig: S, toolWarnings: r };
        }
        return { tools: k.length > 0 ? k : void 0, toolConfig: void 0, toolWarnings: r };
    }
    const p = [];
    let w = !1;
    for (const k of e)
        k.type === "function"
            ? (p.push(ma(k)), k.strict === !0 && (w = !0))
            : r.push({ type: "unsupported-tool", tool: k });
    if (t == null)
        return {
            tools: [{ functionDeclarations: p }],
            toolConfig: w ? { functionCallingConfig: { mode: "VALIDATED" } } : void 0,
            toolWarnings: r,
        };
    const y = t.type;
    switch (y) {
        case "auto":
            return {
                tools: [{ functionDeclarations: p }],
                toolConfig: { functionCallingConfig: { mode: w ? "VALIDATED" : "AUTO" } },
                toolWarnings: r,
            };
        case "none":
            return {
                tools: [{ functionDeclarations: p }],
                toolConfig: { functionCallingConfig: { mode: "NONE" } },
                toolWarnings: r,
            };
        case "required":
            return {
                tools: [{ functionDeclarations: p }],
                toolConfig: { functionCallingConfig: { mode: w ? "VALIDATED" : "ANY" } },
                toolWarnings: r,
            };
        case "tool":
            return {
                tools: [{ functionDeclarations: p }],
                toolConfig: {
                    functionCallingConfig: { mode: w ? "VALIDATED" : "ANY", allowedFunctionNames: [t.toolName] },
                },
                toolWarnings: r,
            };
        default: {
            const k = y;
            throw new ye({ functionality: `tool choice type: ${k}` });
        }
    }
}
function ma(e) {
    var t;
    const n = { name: e.name, description: (t = e.description) != null ? t : "" };
    try {
        return { ...n, parameters: wi(e.inputSchema) };
    } catch (o) {
        if (!Dd(o)) throw o;
        return { ...n, parametersJsonSchema: e.inputSchema };
    }
}
function ha({ finishReason: e, hasToolCalls: t }) {
    switch (e) {
        case "STOP":
            return t ? "tool-calls" : "stop";
        case "MAX_TOKENS":
            return "length";
        case "IMAGE_SAFETY":
        case "RECITATION":
        case "SAFETY":
        case "BLOCKLIST":
        case "PROHIBITED_CONTENT":
        case "SPII":
            return "content-filter";
        case "FINISH_REASON_UNSPECIFIED":
        case "OTHER":
            return "other";
        case "MALFORMED_FUNCTION_CALL":
            return "error";
        default:
            return "unknown";
    }
}
var ep = [
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    ],
    tp = /(^|\/)gemini-2\.5(?:[.-]|$)/i,
    np = class {
        constructor(e, t) {
            this.specificationVersion = "v2";
            var n;
            ((this.modelId = e), (this.config = t), (this.generateId = (n = t.generateId) != null ? n : Ne));
        }
        get provider() {
            return this.config.provider;
        }
        get supportedUrls() {
            var e, t, n;
            return (n = (t = (e = this.config).supportedUrls) == null ? void 0 : t.call(e)) != null ? n : {};
        }
        async getArgs({
            prompt: e,
            maxOutputTokens: t,
            temperature: n,
            topP: o,
            topK: r,
            frequencyPenalty: a,
            presencePenalty: l,
            stopSequences: i,
            responseFormat: d,
            seed: c,
            tools: p,
            toolChoice: w,
            providerOptions: y,
        }) {
            var k, x;
            const I = [],
                S = await Ie({ provider: "google", providerOptions: y, schema: Jd }),
                R = this.config.provider.startsWith("google.vertex.");
            p?.some((L) => L.type === "provider-defined" && L.id === "google.vertex_rag_store") &&
                !R &&
                I.push({
                    type: "other",
                    message: `The 'vertex_rag_store' tool is only supported with the Google Vertex provider and might not be supported or could behave unexpectedly with the current Google provider (${this.config.provider}).`,
                });
            let P = S?.serviceTier;
            S?.serviceTier && R && (P = Wd[S.serviceTier]);
            let O = S?.imageConfig;
            if (O != null && !R) {
                const { personGeneration: L, prominentPeople: j, imageOutputOptions: B, ...$ } = O,
                    H = Object.entries({ personGeneration: L, prominentPeople: j, imageOutputOptions: B })
                        .filter(([, de]) => de != null)
                        .map(([de]) => `'imageConfig.${de}'`);
                H.length > 0 &&
                    (I.push({
                        type: "other",
                        message: `${H.join(", ")} ${H.length === 1 ? "is a Vertex AI option and is" : "are Vertex AI options and are"} ignored with the current Google provider (${this.config.provider}).`,
                    }),
                    (O = $));
            }
            const C = S?.threshold,
                h =
                    (k = S?.safetySettings) != null
                        ? k
                        : C != null
                          ? ep.map((L) => ({ category: L, threshold: C }))
                          : void 0,
                g = this.modelId.toLowerCase().startsWith("gemma-"),
                v = !R && tp.test(this.modelId);
            (v && a != null && I.push({ type: "unsupported-setting", setting: "frequencyPenalty" }),
                v && l != null && I.push({ type: "unsupported-setting", setting: "presencePenalty" }));
            const { usesGemini3Features: M } = xi(this.modelId),
                { contents: _, systemInstruction: E } = Fd(e, {
                    isGemmaModel: g,
                    isGemini3Model: M,
                    supportsFunctionResponseParts: M,
                }),
                {
                    tools: b,
                    toolConfig: A,
                    toolWarnings: U,
                } = Qd({ tools: p, toolChoice: w, modelId: this.modelId, isVertexProvider: R });
            return {
                args: {
                    generationConfig: {
                        maxOutputTokens: t,
                        temperature: n,
                        topK: r,
                        topP: o,
                        frequencyPenalty: v ? void 0 : a,
                        presencePenalty: v ? void 0 : l,
                        stopSequences: i,
                        seed: c,
                        responseMimeType: d?.type === "json" ? "application/json" : void 0,
                        responseSchema:
                            d?.type === "json" && d.schema != null && ((x = S?.structuredOutputs) == null || x)
                                ? wi(d.schema)
                                : void 0,
                        ...(S?.audioTimestamp && { audioTimestamp: S.audioTimestamp }),
                        responseModalities: S?.responseModalities,
                        thinkingConfig: S?.thinkingConfig,
                        ...(O && { imageConfig: O }),
                        ...(S?.mediaResolution && { mediaResolution: S.mediaResolution }),
                    },
                    contents: _,
                    systemInstruction: g ? void 0 : E,
                    safetySettings: h,
                    tools: b,
                    toolConfig: S?.retrievalConfig ? { ...A, retrievalConfig: S.retrievalConfig } : A,
                    cachedContent: S?.cachedContent,
                    labels: S?.labels,
                    serviceTier: P,
                },
                warnings: [...I, ...U],
            };
        }
        async doGenerate(e) {
            var t, n, o, r, a, l, i, d, c, p, w, y, k, x, I, S, R;
            const { args: P, warnings: O } = await this.getArgs(e),
                C = JSON.stringify(P),
                h = Se(await Ee(this.config.headers), e.headers),
                {
                    responseHeaders: g,
                    value: v,
                    rawValue: M,
                } = await ke({
                    url: `${this.config.baseURL}/${fa(this.modelId)}:generateContent`,
                    headers: h,
                    body: P,
                    failedResponseHandler: Zt,
                    successfulResponseHandler: Re(ap),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                }),
                _ = (t = v.candidates) == null ? void 0 : t[0],
                E = (n = v.promptFeedback) == null ? void 0 : n.blockReason,
                b = _?.finishReason == null && E != null,
                A = [],
                U = (r = (o = _?.content) == null ? void 0 : o.parts) != null ? r : [],
                L = v.usageMetadata;
            let j;
            for (const $ of U)
                if ("executableCode" in $ && (a = $.executableCode) != null && a.code) {
                    const H = this.config.generateId();
                    ((j = H),
                        A.push({
                            type: "tool-call",
                            toolCallId: H,
                            toolName: "code_execution",
                            input: JSON.stringify($.executableCode),
                            providerExecuted: !0,
                        }));
                } else if ("codeExecutionResult" in $ && $.codeExecutionResult)
                    A.push({
                        type: "tool-result",
                        toolCallId: j,
                        toolName: "code_execution",
                        result: { outcome: $.codeExecutionResult.outcome, output: $.codeExecutionResult.output },
                        providerExecuted: !0,
                    });
                else if ("text" in $ && $.text != null) {
                    const H = $.thoughtSignature ? { google: { thoughtSignature: $.thoughtSignature } } : void 0;
                    if ($.text.length === 0) {
                        if (H != null && A.length > 0) {
                            const de = A[A.length - 1];
                            de.type !== "file" && (de.providerMetadata = H);
                        }
                    } else A.push({ type: $.thought === !0 ? "reasoning" : "text", text: $.text, providerMetadata: H });
                } else
                    "functionCall" in $
                        ? A.push({
                              type: "tool-call",
                              toolCallId: (l = $.functionCall.id) != null ? l : this.config.generateId(),
                              toolName: $.functionCall.name,
                              input: JSON.stringify($.functionCall.args),
                              providerMetadata: $.thoughtSignature
                                  ? { google: { thoughtSignature: $.thoughtSignature } }
                                  : void 0,
                          })
                        : "inlineData" in $ &&
                          A.push({ type: "file", data: $.inlineData.data, mediaType: $.inlineData.mimeType });
            const B =
                (i = ga({ groundingMetadata: _?.groundingMetadata, generateId: this.config.generateId })) != null
                    ? i
                    : [];
            for (const $ of B) A.push($);
            return {
                content: A,
                finishReason: b
                    ? "content-filter"
                    : ha({ finishReason: _?.finishReason, hasToolCalls: A.some(($) => $.type === "tool-call") }),
                usage: {
                    inputTokens: (d = L?.promptTokenCount) != null ? d : void 0,
                    outputTokens: (c = L?.candidatesTokenCount) != null ? c : void 0,
                    totalTokens: (p = L?.totalTokenCount) != null ? p : void 0,
                    reasoningTokens: (w = L?.thoughtsTokenCount) != null ? w : void 0,
                    cachedInputTokens: (y = L?.cachedContentTokenCount) != null ? y : void 0,
                },
                warnings: O,
                providerMetadata: {
                    google: {
                        promptFeedback: (k = v.promptFeedback) != null ? k : null,
                        groundingMetadata: (x = _?.groundingMetadata) != null ? x : null,
                        urlContextMetadata: (I = _?.urlContextMetadata) != null ? I : null,
                        safetyRatings: (S = _?.safetyRatings) != null ? S : null,
                        serviceTier: (R = v.serviceTier) != null ? R : null,
                        usageMetadata: L ?? null,
                    },
                },
                request: { body: C },
                response: { headers: g, body: M },
            };
        }
        async doStream(e) {
            const { args: t, warnings: n } = await this.getArgs(e),
                o = JSON.stringify(t),
                r = Se(await Ee(this.config.headers), e.headers),
                { responseHeaders: a, value: l } = await ke({
                    url: `${this.config.baseURL}/${fa(this.modelId)}:streamGenerateContent?alt=sse`,
                    headers: r,
                    body: t,
                    failedResponseHandler: Zt,
                    successfulResponseHandler: Pt(rp),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                });
            let i = "unknown";
            const d = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 };
            let c,
                p = null,
                w = null,
                y = null;
            const k = this.config.generateId;
            let x = !1,
                I = null,
                S = null,
                R = 0;
            const P = new Set();
            let O;
            return {
                stream: l.pipeThrough(
                    new TransformStream({
                        start(C) {
                            C.enqueue({ type: "stream-start", warnings: n });
                        },
                        transform(C, h) {
                            var g, v, M, _, E, b, A, U, L, j, B, $, H, de, ee;
                            if ((e.includeRawChunks && h.enqueue({ type: "raw", rawValue: C.rawValue }), !C.success)) {
                                h.enqueue({ type: "error", error: C.error });
                                return;
                            }
                            const Q = C.value,
                                V = Q.usageMetadata;
                            (V != null &&
                                ((d.inputTokens = (g = V.promptTokenCount) != null ? g : void 0),
                                (d.outputTokens = (v = V.candidatesTokenCount) != null ? v : void 0),
                                (d.totalTokens = (M = V.totalTokenCount) != null ? M : void 0),
                                (d.reasoningTokens = (_ = V.thoughtsTokenCount) != null ? _ : void 0),
                                (d.cachedInputTokens = (E = V.cachedContentTokenCount) != null ? E : void 0)),
                                Q.serviceTier != null && (y = Q.serviceTier));
                            const le = (b = Q.candidates) == null ? void 0 : b[0];
                            if (le == null) {
                                ((A = Q.promptFeedback) == null ? void 0 : A.blockReason) != null &&
                                    ((i = "content-filter"),
                                    (c = {
                                        google: {
                                            promptFeedback: (U = Q.promptFeedback) != null ? U : null,
                                            groundingMetadata: p,
                                            urlContextMetadata: w,
                                            safetyRatings: null,
                                            serviceTier: y,
                                        },
                                    }),
                                    V != null && (c.google.usageMetadata = V));
                                return;
                            }
                            const ce = le.content;
                            (le.groundingMetadata != null && (p = le.groundingMetadata),
                                le.urlContextMetadata != null && (w = le.urlContextMetadata));
                            const pe = ga({ groundingMetadata: le.groundingMetadata, generateId: k });
                            if (pe != null)
                                for (const D of pe)
                                    D.sourceType === "url" && !P.has(D.url) && (P.add(D.url), h.enqueue(D));
                            if (ce != null) {
                                const D = (L = ce.parts) != null ? L : [];
                                for (const q of D)
                                    if ("executableCode" in q && (j = q.executableCode) != null && j.code) {
                                        const T = k();
                                        ((O = T),
                                            h.enqueue({
                                                type: "tool-call",
                                                toolCallId: T,
                                                toolName: "code_execution",
                                                input: JSON.stringify(q.executableCode),
                                                providerExecuted: !0,
                                            }),
                                            (x = !0));
                                    } else if ("codeExecutionResult" in q && q.codeExecutionResult) {
                                        const T = O;
                                        T &&
                                            h.enqueue({
                                                type: "tool-result",
                                                toolCallId: T,
                                                toolName: "code_execution",
                                                result: {
                                                    outcome: q.codeExecutionResult.outcome,
                                                    output: q.codeExecutionResult.output,
                                                },
                                                providerExecuted: !0,
                                            });
                                    } else if ("text" in q && q.text != null) {
                                        const T = q.thoughtSignature
                                            ? { google: { thoughtSignature: q.thoughtSignature } }
                                            : void 0;
                                        q.text.length === 0
                                            ? T != null &&
                                              I !== null &&
                                              h.enqueue({ type: "text-delta", id: I, delta: "", providerMetadata: T })
                                            : q.thought === !0
                                              ? (I !== null && (h.enqueue({ type: "text-end", id: I }), (I = null)),
                                                S === null &&
                                                    ((S = String(R++)),
                                                    h.enqueue({ type: "reasoning-start", id: S, providerMetadata: T })),
                                                h.enqueue({
                                                    type: "reasoning-delta",
                                                    id: S,
                                                    delta: q.text,
                                                    providerMetadata: T,
                                                }))
                                              : (S !== null &&
                                                    (h.enqueue({ type: "reasoning-end", id: S }), (S = null)),
                                                I === null &&
                                                    ((I = String(R++)),
                                                    h.enqueue({ type: "text-start", id: I, providerMetadata: T })),
                                                h.enqueue({
                                                    type: "text-delta",
                                                    id: I,
                                                    delta: q.text,
                                                    providerMetadata: T,
                                                }));
                                    } else
                                        "inlineData" in q &&
                                            h.enqueue({
                                                type: "file",
                                                mediaType: q.inlineData.mimeType,
                                                data: q.inlineData.data,
                                            });
                                const F = op({ parts: ce.parts, generateId: k });
                                if (F != null)
                                    for (const q of F)
                                        (h.enqueue({
                                            type: "tool-input-start",
                                            id: q.toolCallId,
                                            toolName: q.toolName,
                                            providerMetadata: q.providerMetadata,
                                        }),
                                            h.enqueue({
                                                type: "tool-input-delta",
                                                id: q.toolCallId,
                                                delta: q.args,
                                                providerMetadata: q.providerMetadata,
                                            }),
                                            h.enqueue({
                                                type: "tool-input-end",
                                                id: q.toolCallId,
                                                providerMetadata: q.providerMetadata,
                                            }),
                                            h.enqueue({
                                                type: "tool-call",
                                                toolCallId: q.toolCallId,
                                                toolName: q.toolName,
                                                input: q.args,
                                                providerMetadata: q.providerMetadata,
                                            }),
                                            (x = !0));
                            }
                            const he = (B = Q.promptFeedback) == null ? void 0 : B.blockReason,
                                re = le.finishReason == null && he != null,
                                z = (H = ($ = le.finishReason) != null ? $ : he) != null ? H : void 0;
                            z != null &&
                                ((i = re ? "content-filter" : ha({ finishReason: z, hasToolCalls: x })),
                                (c = {
                                    google: {
                                        promptFeedback: (de = Q.promptFeedback) != null ? de : null,
                                        groundingMetadata: p,
                                        urlContextMetadata: w,
                                        safetyRatings: (ee = le.safetyRatings) != null ? ee : null,
                                        serviceTier: y,
                                    },
                                }),
                                V != null && (c.google.usageMetadata = V));
                        },
                        flush(C) {
                            (I !== null && C.enqueue({ type: "text-end", id: I }),
                                S !== null && C.enqueue({ type: "reasoning-end", id: S }),
                                C.enqueue({ type: "finish", finishReason: i, usage: d, providerMetadata: c }));
                        },
                    }),
                ),
                response: { headers: a },
                request: { body: o },
            };
        }
    };
function op({ parts: e, generateId: t }) {
    const n = e?.filter((o) => "functionCall" in o);
    return n == null || n.length === 0
        ? void 0
        : n.map((o) => {
              var r;
              return {
                  type: "tool-call",
                  toolCallId: (r = o.functionCall.id) != null ? r : t(),
                  toolName: o.functionCall.name,
                  args: JSON.stringify(o.functionCall.args),
                  providerMetadata: o.thoughtSignature ? { google: { thoughtSignature: o.thoughtSignature } } : void 0,
              };
          });
}
function ga({ groundingMetadata: e, generateId: t }) {
    var n, o, r, a, l, i;
    if (!e?.groundingChunks) return;
    const d = [];
    for (const c of e.groundingChunks)
        if (c.web != null)
            d.push({
                type: "source",
                sourceType: "url",
                id: t(),
                url: c.web.uri,
                title: (n = c.web.title) != null ? n : void 0,
            });
        else if (c.image != null)
            d.push({
                type: "source",
                sourceType: "url",
                id: t(),
                url: c.image.sourceUri,
                title: (o = c.image.title) != null ? o : void 0,
            });
        else if (c.retrievedContext != null) {
            const p = c.retrievedContext.uri,
                w = c.retrievedContext.fileSearchStore;
            if (p && (p.startsWith("http://") || p.startsWith("https://")))
                d.push({
                    type: "source",
                    sourceType: "url",
                    id: t(),
                    url: p,
                    title: (r = c.retrievedContext.title) != null ? r : void 0,
                });
            else if (p) {
                const y = (a = c.retrievedContext.title) != null ? a : "Unknown Document";
                let k = "application/octet-stream",
                    x;
                (p.endsWith(".pdf")
                    ? ((k = "application/pdf"), (x = p.split("/").pop()))
                    : p.endsWith(".txt")
                      ? ((k = "text/plain"), (x = p.split("/").pop()))
                      : p.endsWith(".docx")
                        ? ((k = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                          (x = p.split("/").pop()))
                        : p.endsWith(".doc")
                          ? ((k = "application/msword"), (x = p.split("/").pop()))
                          : (p.match(/\.(md|markdown)$/) && (k = "text/markdown"), (x = p.split("/").pop())),
                    d.push({ type: "source", sourceType: "document", id: t(), mediaType: k, title: y, filename: x }));
            } else if (w) {
                const y = (l = c.retrievedContext.title) != null ? l : "Unknown Document";
                d.push({
                    type: "source",
                    sourceType: "document",
                    id: t(),
                    mediaType: "application/octet-stream",
                    title: y,
                    filename: w.split("/").pop(),
                });
            }
        } else
            c.maps != null &&
                c.maps.uri &&
                d.push({
                    type: "source",
                    sourceType: "url",
                    id: t(),
                    url: c.maps.uri,
                    title: (i = c.maps.title) != null ? i : void 0,
                });
    return d.length > 0 ? d : void 0;
}
var Ti = () =>
        u({
            webSearchQueries: N(s()).nullish(),
            imageSearchQueries: N(s()).nullish(),
            retrievalQueries: N(s()).nullish(),
            searchEntryPoint: u({ renderedContent: s() }).nullish(),
            groundingChunks: N(
                u({
                    web: u({ uri: s(), title: s().nullish() }).nullish(),
                    image: u({ sourceUri: s(), imageUri: s(), title: s().nullish(), domain: s().nullish() }).nullish(),
                    retrievedContext: u({
                        uri: s().nullish(),
                        title: s().nullish(),
                        text: s().nullish(),
                        fileSearchStore: s().nullish(),
                    }).nullish(),
                    maps: u({
                        uri: s().nullish(),
                        title: s().nullish(),
                        text: s().nullish(),
                        placeId: s().nullish(),
                    }).nullish(),
                }),
            ).nullish(),
            groundingSupports: N(
                u({
                    segment: u({ startIndex: f().nullish(), endIndex: f().nullish(), text: s().nullish() }).nullish(),
                    segment_text: s().nullish(),
                    groundingChunkIndices: N(f()).nullish(),
                    supportChunkIndices: N(f()).nullish(),
                    confidenceScores: N(f()).nullish(),
                    confidenceScore: N(f()).nullish(),
                }),
            ).nullish(),
            retrievalMetadata: X([u({ webDynamicRetrievalScore: f() }), u({})]).nullish(),
        }),
    ki = () =>
        u({
            parts: N(
                X([
                    u({
                        functionCall: u({ id: s().nullish(), name: s(), args: Ue() }),
                        thoughtSignature: s().nullish(),
                    }),
                    u({ inlineData: u({ mimeType: s(), data: s() }) }),
                    u({
                        executableCode: u({ language: s(), code: s() }).nullish(),
                        codeExecutionResult: u({ outcome: s(), output: s() }).nullish(),
                        text: s().nullish(),
                        thought: ne().nullish(),
                        thoughtSignature: s().nullish(),
                    }),
                ]),
            ).nullish(),
        }),
    mn = () =>
        u({
            category: s().nullish(),
            probability: s().nullish(),
            probabilityScore: f().nullish(),
            severity: s().nullish(),
            severityScore: f().nullish(),
            blocked: ne().nullish(),
        }),
    _a = N(u({ modality: s(), tokenCount: f() })).nullish(),
    Ii = u({
        cachedContentTokenCount: f().nullish(),
        thoughtsTokenCount: f().nullish(),
        promptTokenCount: f().nullish(),
        candidatesTokenCount: f().nullish(),
        totalTokenCount: f().nullish(),
        trafficType: s().nullish(),
        promptTokensDetails: _a,
        candidatesTokensDetails: _a,
    }),
    Si = () => u({ urlMetadata: N(u({ retrievedUrl: s(), urlRetrievalStatus: s() })) }),
    ap = K(() =>
        G(
            u({
                candidates: N(
                    u({
                        content: ki().nullish().or(u({}).strict()),
                        finishReason: s().nullish(),
                        safetyRatings: N(mn()).nullish(),
                        groundingMetadata: Ti().nullish(),
                        urlContextMetadata: Si().nullish(),
                    }),
                ).nullish(),
                usageMetadata: Ii.nullish(),
                promptFeedback: u({ blockReason: s().nullish(), safetyRatings: N(mn()).nullish() }).nullish(),
                serviceTier: s().nullish(),
            }),
        ),
    ),
    rp = K(() =>
        G(
            u({
                candidates: N(
                    u({
                        content: ki().nullish(),
                        finishReason: s().nullish(),
                        safetyRatings: N(mn()).nullish(),
                        groundingMetadata: Ti().nullish(),
                        urlContextMetadata: Si().nullish(),
                    }),
                ).nullish(),
                usageMetadata: Ii.nullish(),
                promptFeedback: u({ blockReason: s().nullish(), safetyRatings: N(mn()).nullish() }).nullish(),
                serviceTier: s().nullish(),
            }),
        ),
    ),
    ip = Le({
        id: "google.code_execution",
        name: "code_execution",
        inputSchema: u({
            language: s().describe("The programming language of the code."),
            code: s().describe("The code to be executed."),
        }),
        outputSchema: u({
            outcome: s().describe('The outcome of the execution (e.g., "OUTCOME_OK").'),
            output: s().describe("The output from the code execution."),
        }),
    }),
    sp = Pe({ id: "google.enterprise_web_search", name: "enterprise_web_search", inputSchema: K(() => G(u({}))) }),
    lp = u({
        fileSearchStoreNames: N(s()).describe(
            "The names of the file_search_stores to retrieve from. Example: `fileSearchStores/my-file-search-store-123`",
        ),
        topK: f().int().positive().describe("The number of file search retrieval chunks to retrieve.").optional(),
        metadataFilter: s()
            .describe(
                "Metadata filter to apply to the file search retrieval documents. See https://google.aip.dev/160 for the syntax of the filter expression.",
            )
            .optional(),
    }).passthrough(),
    up = K(() => G(lp)),
    cp = Pe({ id: "google.file_search", name: "file_search", inputSchema: up }),
    dp = Pe({ id: "google.google_maps", name: "google_maps", inputSchema: K(() => G(u({}))) }),
    pp = u({
        searchTypes: u({ webSearch: u({}).optional(), imageSearch: u({}).optional() }).optional(),
        timeRangeFilter: u({ startTime: s(), endTime: s() }).optional(),
    }).passthrough(),
    fp = K(() => G(pp)),
    mp = Pe({ id: "google.google_search", name: "google_search", inputSchema: fp }),
    hp = Pe({ id: "google.url_context", name: "url_context", inputSchema: K(() => G(u({}))) }),
    gp = Pe({
        id: "google.vertex_rag_store",
        name: "vertex_rag_store",
        inputSchema: u({ ragCorpus: s(), topK: f().optional() }),
    }),
    _p = {
        googleSearch: mp,
        enterpriseWebSearch: sp,
        googleMaps: dp,
        urlContext: hp,
        fileSearch: cp,
        codeExecution: ip,
        vertexRagStore: gp,
    },
    yp = class {
        constructor(e, t, n) {
            ((this.modelId = e), (this.settings = t), (this.config = n), (this.specificationVersion = "v2"));
        }
        get maxImagesPerCall() {
            var e;
            return (e = this.settings.maxImagesPerCall) != null ? e : 4;
        }
        get provider() {
            return this.config.provider;
        }
        async doGenerate(e) {
            var t, n, o;
            const {
                    prompt: r,
                    n: a = 1,
                    size: l = "1024x1024",
                    aspectRatio: i = "1:1",
                    seed: d,
                    providerOptions: c,
                    headers: p,
                    abortSignal: w,
                } = e,
                y = [];
            (l != null &&
                y.push({
                    type: "unsupported-setting",
                    setting: "size",
                    details: "This model does not support the `size` option. Use `aspectRatio` instead.",
                }),
                d != null &&
                    y.push({
                        type: "unsupported-setting",
                        setting: "seed",
                        details: "This model does not support the `seed` option through this provider.",
                    }));
            const k = await Ie({ provider: "google", providerOptions: c, schema: bp }),
                x =
                    (o =
                        (n = (t = this.config._internal) == null ? void 0 : t.currentDate) == null
                            ? void 0
                            : n.call(t)) != null
                        ? o
                        : new Date(),
                I = { sampleCount: a };
            (i != null && (I.aspectRatio = i), k && Object.assign(I, k));
            const S = { instances: [{ prompt: r }], parameters: I },
                { responseHeaders: R, value: P } = await ke({
                    url: `${this.config.baseURL}/models/${this.modelId}:predict`,
                    headers: Se(await Ee(this.config.headers), p),
                    body: S,
                    failedResponseHandler: Zt,
                    successfulResponseHandler: Re(vp),
                    abortSignal: w,
                    fetch: this.config.fetch,
                });
            return {
                images: P.predictions.map((O) => O.bytesBase64Encoded),
                warnings: y ?? [],
                providerMetadata: { google: { images: P.predictions.map((O) => ({})) } },
                response: { timestamp: x, modelId: this.modelId, headers: R },
            };
        }
    },
    vp = K(() => G(u({ predictions: N(u({ bytesBase64Encoded: s() })).default([]) }))),
    bp = K(() =>
        G(
            u({
                personGeneration: J(["dont_allow", "allow_adult", "allow_all"]).nullish(),
                aspectRatio: J(["1:1", "3:4", "4:3", "9:16", "16:9"]).nullish(),
            }),
        ),
    );
function Ci(e = {}) {
    var t, n;
    const o = (t = bn(e.baseURL)) != null ? t : "https://generativelanguage.googleapis.com/v1beta",
        r = (n = e.name) != null ? n : "google.generative-ai",
        a = () =>
            vt(
                {
                    "x-goog-api-key": oo({
                        apiKey: e.apiKey,
                        environmentVariableName: "GOOGLE_GENERATIVE_AI_API_KEY",
                        description: "Google Generative AI",
                    }),
                    ...e.headers,
                },
                `ai-sdk/google/${Rd}`,
            ),
        l = (p) => {
            var w;
            return new np(p, {
                provider: r,
                baseURL: o,
                headers: a,
                generateId: (w = e.generateId) != null ? w : Ne,
                supportedUrls: () => ({
                    "*": [
                        new RegExp(`^${o}/files/.*$`),
                        new RegExp("^https://(?:www\\.)?youtube\\.com/watch\\?v=[\\w-]+(?:&[\\w=&.-]*)?$"),
                        new RegExp("^https://youtu\\.be/[\\w-]+(?:\\?[\\w=&.-]*)?$"),
                    ],
                }),
                fetch: e.fetch,
            });
        },
        i = (p) => new Nd(p, { provider: r, baseURL: o, headers: a, fetch: e.fetch }),
        d = (p, w = {}) => new yp(p, w, { provider: r, baseURL: o, headers: a, fetch: e.fetch }),
        c = function (p) {
            if (new.target)
                throw new Error("The Google Generative AI model function cannot be called with the new keyword.");
            return l(p);
        };
    return (
        (c.languageModel = l),
        (c.chat = l),
        (c.generativeAI = l),
        (c.embedding = i),
        (c.textEmbedding = i),
        (c.textEmbeddingModel = i),
        (c.image = d),
        (c.imageModel = d),
        (c.tools = _p),
        c
    );
}
Ci();
var so = u({ error: u({ message: s(), type: s().nullish(), param: Ge().nullish(), code: X([s(), f()]).nullish() }) }),
    rt = Xe({ errorSchema: so, errorToMessage: (e) => e.error.message });
function Ei(e) {
    var t, n, o, r, a;
    const l = wp(e),
        i = xp(e),
        d = i?.minor == null && ((n = (t = i?.variant) == null ? void 0 : t.startsWith("chat")) != null ? n : !1),
        c = (r = (o = i?.variant) == null ? void 0 : o.startsWith("nano")) != null ? r : !1,
        p = i != null && i.major >= 6,
        w = e === "gpt-6-sol" || e === "gpt-6-luna",
        y = (l != null && l >= 3) || (i != null && i.major >= 5 && !d),
        k = e.startsWith("gpt-4") || (i != null && i.major >= 5 && !c && !d) || (l != null && l >= 3),
        x = l != null || (i != null && i.major >= 5 && !d) || e === "codex-mini-latest" || e === "computer-use-preview",
        I = !p && i != null && (i.major > 5 || (i.major === 5 && ((a = i.minor) != null ? a : 0) >= 1));
    return {
        supportsFlexProcessing: y,
        supportsPriorityProcessing: k,
        supportsConfigurationUpdate: p,
        supportsAsyncToolCalling: p,
        supportedReasoningEfforts: w
            ? ["none", "low", "medium", "high", "xhigh", "max"]
            : p
              ? ["low", "medium", "high", "xhigh", "max"]
              : void 0,
        isReasoningModel: x,
        systemMessageMode: x ? "developer" : "system",
        supportsNonReasoningParameters: I,
    };
}
function wp(e) {
    const t = /^o(\d+)(?:-|$)/.exec(e);
    return t == null ? void 0 : Number(t[1]);
}
function xp(e) {
    const t = /^gpt-(\d+)(?:\.(\d+))?(?:-(.+))?$/.exec(e);
    if (t != null) return { major: Number(t[1]), minor: t[2] == null ? void 0 : Number(t[2]), variant: t[3] };
}
function Tp(e) {
    return JSON.stringify(typeof e == "object" && e !== null && !Array.isArray(e) ? e : {});
}
function wt(e) {
    var t;
    return (t = e?.openai) == null ? void 0 : t.promptCacheBreakpoint;
}
function kp({ prompt: e, systemMessageMode: t = "system" }) {
    const n = [],
        o = [];
    for (const { role: r, content: a, providerOptions: l } of e)
        switch (r) {
            case "system": {
                switch (t) {
                    case "system": {
                        const i = wt(l);
                        n.push({
                            role: "system",
                            content: i == null ? a : [{ type: "text", text: a, prompt_cache_breakpoint: i }],
                        });
                        break;
                    }
                    case "developer": {
                        const i = wt(l);
                        n.push({
                            role: "developer",
                            content: i == null ? a : [{ type: "text", text: a, prompt_cache_breakpoint: i }],
                        });
                        break;
                    }
                    case "remove": {
                        o.push({ type: "other", message: "system messages are removed for this model" });
                        break;
                    }
                    default: {
                        const i = t;
                        throw new Error(`Unsupported system message mode: ${i}`);
                    }
                }
                break;
            }
            case "user": {
                if (a.length === 1 && a[0].type === "text" && wt(a[0].providerOptions) == null) {
                    n.push({ role: "user", content: a[0].text });
                    break;
                }
                n.push({
                    role: "user",
                    content: a.map((i, d) => {
                        var c, p, w;
                        switch (i.type) {
                            case "text": {
                                const y = wt(i.providerOptions);
                                return { type: "text", text: i.text, ...(y != null && { prompt_cache_breakpoint: y }) };
                            }
                            case "file": {
                                const y = wt(i.providerOptions);
                                if (i.mediaType.startsWith("image/")) {
                                    const k = i.mediaType === "image/*" ? "image/jpeg" : i.mediaType;
                                    return {
                                        type: "image_url",
                                        image_url: {
                                            url:
                                                i.data instanceof URL
                                                    ? i.data.toString()
                                                    : `data:${k};base64,${ot(i.data)}`,
                                            detail:
                                                (p = (c = i.providerOptions) == null ? void 0 : c.openai) == null
                                                    ? void 0
                                                    : p.imageDetail,
                                        },
                                        ...(y != null && { prompt_cache_breakpoint: y }),
                                    };
                                } else if (i.mediaType.startsWith("audio/")) {
                                    if (i.data instanceof URL)
                                        throw new ye({ functionality: "audio file parts with URLs" });
                                    switch (i.mediaType) {
                                        case "audio/wav":
                                            return {
                                                type: "input_audio",
                                                input_audio: { data: ot(i.data), format: "wav" },
                                                ...(y != null && { prompt_cache_breakpoint: y }),
                                            };
                                        case "audio/mp3":
                                        case "audio/mpeg":
                                            return {
                                                type: "input_audio",
                                                input_audio: { data: ot(i.data), format: "mp3" },
                                                ...(y != null && { prompt_cache_breakpoint: y }),
                                            };
                                        default:
                                            throw new ye({
                                                functionality: `audio content parts with media type ${i.mediaType}`,
                                            });
                                    }
                                } else if (i.mediaType === "application/pdf") {
                                    if (i.data instanceof URL)
                                        throw new ye({ functionality: "PDF file parts with URLs" });
                                    return {
                                        type: "file",
                                        file:
                                            typeof i.data == "string" && i.data.startsWith("file-")
                                                ? { file_id: i.data }
                                                : {
                                                      filename: (w = i.filename) != null ? w : `part-${d}.pdf`,
                                                      file_data: `data:application/pdf;base64,${ot(i.data)}`,
                                                  },
                                        ...(y != null && { prompt_cache_breakpoint: y }),
                                    };
                                } else throw new ye({ functionality: `file part media type ${i.mediaType}` });
                            }
                        }
                    }),
                });
                break;
            }
            case "assistant": {
                let i = "";
                const d = [];
                let c = !1;
                const p = [];
                for (const w of a)
                    switch (w.type) {
                        case "text": {
                            const y = wt(w.providerOptions);
                            ((i += w.text),
                                d.push({
                                    type: "text",
                                    text: w.text,
                                    ...(y != null && { prompt_cache_breakpoint: y }),
                                }),
                                c || (c = y != null));
                            break;
                        }
                        case "tool-call": {
                            p.push({
                                id: w.toolCallId,
                                type: "function",
                                function: { name: w.toolName, arguments: Tp(w.input) },
                            });
                            break;
                        }
                    }
                n.push({
                    role: "assistant",
                    content: c ? d : p.length > 0 ? i || null : i,
                    tool_calls: p.length > 0 ? p : void 0,
                });
                break;
            }
            case "tool": {
                for (const i of a) {
                    const d = i.output,
                        c = wt(i.providerOptions);
                    let p;
                    switch (d.type) {
                        case "text":
                        case "error-text":
                            p = d.value;
                            break;
                        case "content":
                        case "json":
                        case "error-json":
                            p = JSON.stringify(d.value);
                            break;
                    }
                    n.push({
                        role: "tool",
                        tool_call_id: i.toolCallId,
                        content: c == null ? p : [{ type: "text", text: p, prompt_cache_breakpoint: c }],
                    });
                }
                break;
            }
            default: {
                const i = r;
                throw new Error(`Unsupported role: ${i}`);
            }
        }
    return { messages: n, warnings: o };
}
function Nn({ id: e, model: t, created: n }) {
    return { id: e ?? void 0, modelId: t ?? void 0, timestamp: n ? new Date(n * 1e3) : void 0 };
}
function ya(e) {
    switch (e) {
        case "stop":
            return "stop";
        case "length":
            return "length";
        case "content_filter":
            return "content-filter";
        case "function_call":
        case "tool_calls":
            return "tool-calls";
        default:
            return "unknown";
    }
}
var Ip = ve(() =>
        G(
            u({
                id: s().nullish(),
                created: f().nullish(),
                model: s().nullish(),
                choices: N(
                    u({
                        message: u({
                            role: m("assistant").nullish(),
                            content: s().nullish(),
                            audio: u({ transcript: s().nullish() }).nullish(),
                            tool_calls: N(
                                u({
                                    id: s().nullish(),
                                    type: m("function"),
                                    function: u({ name: s(), arguments: s() }),
                                }),
                            ).nullish(),
                            annotations: N(
                                u({
                                    type: m("url_citation"),
                                    url_citation: u({ start_index: f(), end_index: f(), url: s(), title: s() }),
                                }),
                            ).nullish(),
                        }),
                        index: f(),
                        logprobs: u({
                            content: N(
                                u({ token: s(), logprob: f(), top_logprobs: N(u({ token: s(), logprob: f() })) }),
                            ).nullish(),
                        }).nullish(),
                        finish_reason: s().nullish(),
                    }),
                ),
                usage: u({
                    prompt_tokens: f().nullish(),
                    completion_tokens: f().nullish(),
                    total_tokens: f().nullish(),
                    prompt_tokens_details: u({
                        cached_tokens: f().nullish(),
                        cache_write_tokens: f().nullish(),
                    }).nullish(),
                    completion_tokens_details: u({
                        reasoning_tokens: f().nullish(),
                        accepted_prediction_tokens: f().nullish(),
                        rejected_prediction_tokens: f().nullish(),
                    }).nullish(),
                }).nullish(),
            }),
        ),
    ),
    Sp = ve(() =>
        G(
            X([
                u({
                    id: s().nullish(),
                    created: f().nullish(),
                    model: s().nullish(),
                    choices: N(
                        u({
                            delta: u({
                                role: J(["assistant"]).nullish(),
                                content: s().nullish(),
                                tool_calls: N(
                                    u({
                                        index: f(),
                                        id: s().nullish(),
                                        type: m("function").nullish(),
                                        function: u({ name: s().nullish(), arguments: s().nullish() }),
                                    }),
                                ).nullish(),
                                annotations: N(
                                    u({
                                        type: m("url_citation"),
                                        url_citation: u({ start_index: f(), end_index: f(), url: s(), title: s() }),
                                    }),
                                ).nullish(),
                            }).nullish(),
                            logprobs: u({
                                content: N(
                                    u({ token: s(), logprob: f(), top_logprobs: N(u({ token: s(), logprob: f() })) }),
                                ).nullish(),
                            }).nullish(),
                            finish_reason: s().nullish(),
                            index: f(),
                        }),
                    ),
                    usage: u({
                        prompt_tokens: f().nullish(),
                        completion_tokens: f().nullish(),
                        total_tokens: f().nullish(),
                        prompt_tokens_details: u({
                            cached_tokens: f().nullish(),
                            cache_write_tokens: f().nullish(),
                        }).nullish(),
                        completion_tokens_details: u({
                            reasoning_tokens: f().nullish(),
                            accepted_prediction_tokens: f().nullish(),
                            rejected_prediction_tokens: f().nullish(),
                        }).nullish(),
                    }).nullish(),
                }),
                so,
            ]),
        ),
    ),
    Cp = ve(() =>
        G(
            u({
                logitBias: we(yl(), f()).optional(),
                logprobs: X([ne(), f()]).optional(),
                parallelToolCalls: ne().optional(),
                user: s().optional(),
                reasoningEffort: J(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).optional(),
                maxCompletionTokens: f().optional(),
                store: ne().optional(),
                metadata: we(s().max(64), s().max(512)).optional(),
                prediction: we(s(), Ge()).optional(),
                structuredOutputs: ne().optional(),
                serviceTier: J(["auto", "flex", "priority", "default"]).optional(),
                strictJsonSchema: ne().optional(),
                textVerbosity: J(["low", "medium", "high"]).optional(),
                promptCacheKey: s().optional(),
                promptCacheOptions: u({
                    mode: J(["implicit", "explicit"]).optional(),
                    ttl: m("30m").optional(),
                }).optional(),
                promptCacheRetention: J(["in_memory", "24h"]).optional(),
                safetyIdentifier: s().optional(),
            }),
        ),
    );
function Ep({ tools: e, toolChoice: t, structuredOutputs: n, strictJsonSchema: o }) {
    e = e?.length ? e : void 0;
    const r = [];
    if (e == null) return { tools: void 0, toolChoice: void 0, toolWarnings: r };
    const a = [];
    for (const i of e)
        i.type === "function"
            ? a.push({
                  type: "function",
                  function: {
                      name: i.name,
                      description: i.description,
                      parameters: i.inputSchema,
                      strict: n ? o : void 0,
                  },
              })
            : r.push({ type: "unsupported-tool", tool: i });
    if (t == null) return { tools: a, toolChoice: void 0, toolWarnings: r };
    const l = t.type;
    switch (l) {
        case "auto":
        case "none":
        case "required":
            return { tools: a, toolChoice: l, toolWarnings: r };
        case "tool":
            return { tools: a, toolChoice: { type: "function", function: { name: t.toolName } }, toolWarnings: r };
        default: {
            const i = l;
            throw new ye({ functionality: `tool choice type: ${i}` });
        }
    }
}
var Rp = class {
    constructor(e, t) {
        ((this.specificationVersion = "v2"),
            (this.supportedUrls = { "image/*": [/^https?:\/\/.*$/] }),
            (this.modelId = e),
            (this.config = t));
    }
    get provider() {
        return this.config.provider;
    }
    async getArgs({
        prompt: e,
        maxOutputTokens: t,
        temperature: n,
        topP: o,
        topK: r,
        frequencyPenalty: a,
        presencePenalty: l,
        stopSequences: i,
        responseFormat: d,
        seed: c,
        tools: p,
        toolChoice: w,
        providerOptions: y,
    }) {
        var k, x, I, S;
        const R = [],
            P = (k = await Ie({ provider: "openai", providerOptions: y, schema: Cp })) != null ? k : {},
            O = (x = P.structuredOutputs) != null ? x : !0,
            C = Ei(this.modelId);
        (r != null && R.push({ type: "unsupported-setting", setting: "topK" }),
            d?.type === "json" &&
                d.schema != null &&
                !O &&
                R.push({
                    type: "unsupported-setting",
                    setting: "responseFormat",
                    details: "JSON response format schema is only supported with structuredOutputs",
                }));
        const { messages: h, warnings: g } = kp({ prompt: e, systemMessageMode: C.systemMessageMode });
        R.push(...g);
        const v = (I = P.strictJsonSchema) != null ? I : !1;
        let M = P.reasoningEffort;
        M != null &&
            C.supportedReasoningEfforts != null &&
            !C.supportedReasoningEfforts.includes(M) &&
            (R.push({
                type: "unsupported-setting",
                setting: "reasoningEffort",
                details: `${this.modelId} only supports the following reasoning efforts: ${C.supportedReasoningEfforts.join(", ")}`,
            }),
            (M = void 0));
        const _ = {
            model: this.modelId,
            logit_bias: P.logitBias,
            logprobs: P.logprobs === !0 || typeof P.logprobs == "number" ? !0 : void 0,
            top_logprobs:
                typeof P.logprobs == "number" ? P.logprobs : typeof P.logprobs == "boolean" && P.logprobs ? 0 : void 0,
            user: P.user,
            parallel_tool_calls: P.parallelToolCalls,
            max_tokens: t,
            temperature: n,
            top_p: o,
            frequency_penalty: a,
            presence_penalty: l,
            response_format:
                d?.type === "json"
                    ? O && d.schema != null
                        ? {
                              type: "json_schema",
                              json_schema: {
                                  schema: d.schema,
                                  strict: v,
                                  name: (S = d.name) != null ? S : "response",
                                  description: d.description,
                              },
                          }
                        : { type: "json_object" }
                    : void 0,
            stop: i,
            seed: c,
            verbosity: P.textVerbosity,
            max_completion_tokens: P.maxCompletionTokens,
            store: P.store,
            metadata: P.metadata,
            prediction: P.prediction,
            reasoning_effort: M,
            service_tier: P.serviceTier,
            prompt_cache_key: P.promptCacheKey,
            prompt_cache_options: P.promptCacheOptions,
            prompt_cache_retention: P.promptCacheRetention,
            safety_identifier: P.safetyIdentifier,
            messages: h,
        };
        (C.supportedReasoningEfforts != null &&
            _.prompt_cache_retention != null &&
            ((_.prompt_cache_retention = void 0),
            R.push({
                type: "unsupported-setting",
                setting: "promptCacheRetention",
                details:
                    "promptCacheRetention is not supported by GPT-6 and later models; use promptCacheOptions instead",
            })),
            C.isReasoningModel
                ? ((P.reasoningEffort !== "none" || !C.supportsNonReasoningParameters) &&
                      (_.temperature != null &&
                          ((_.temperature = void 0),
                          R.push({
                              type: "unsupported-setting",
                              setting: "temperature",
                              details: "temperature is not supported for reasoning models",
                          })),
                      _.top_p != null &&
                          ((_.top_p = void 0),
                          R.push({
                              type: "unsupported-setting",
                              setting: "topP",
                              details: "topP is not supported for reasoning models",
                          })),
                      _.logprobs != null &&
                          ((_.logprobs = void 0),
                          R.push({ type: "other", message: "logprobs is not supported for reasoning models" }))),
                  _.frequency_penalty != null &&
                      ((_.frequency_penalty = void 0),
                      R.push({
                          type: "unsupported-setting",
                          setting: "frequencyPenalty",
                          details: "frequencyPenalty is not supported for reasoning models",
                      })),
                  _.presence_penalty != null &&
                      ((_.presence_penalty = void 0),
                      R.push({
                          type: "unsupported-setting",
                          setting: "presencePenalty",
                          details: "presencePenalty is not supported for reasoning models",
                      })),
                  _.logit_bias != null &&
                      ((_.logit_bias = void 0),
                      R.push({ type: "other", message: "logitBias is not supported for reasoning models" })),
                  _.top_logprobs != null &&
                      ((_.top_logprobs = void 0),
                      R.push({ type: "other", message: "topLogprobs is not supported for reasoning models" })),
                  _.max_tokens != null &&
                      (_.max_completion_tokens == null && (_.max_completion_tokens = _.max_tokens),
                      (_.max_tokens = void 0)))
                : (this.modelId.startsWith("gpt-4o-search-preview") ||
                      this.modelId.startsWith("gpt-4o-mini-search-preview")) &&
                  _.temperature != null &&
                  ((_.temperature = void 0),
                  R.push({
                      type: "unsupported-setting",
                      setting: "temperature",
                      details: "temperature is not supported for the search preview models and has been removed.",
                  })),
            P.serviceTier === "flex" &&
                !C.supportsFlexProcessing &&
                (R.push({
                    type: "unsupported-setting",
                    setting: "serviceTier",
                    details: "flex processing is only available for o3, o4-mini, and gpt-5 models",
                }),
                (_.service_tier = void 0)),
            P.serviceTier === "priority" &&
                !C.supportsPriorityProcessing &&
                (R.push({
                    type: "unsupported-setting",
                    setting: "serviceTier",
                    details:
                        "priority processing is only available for supported models (gpt-4, gpt-5, gpt-5-mini, o3, o4-mini) and requires Enterprise access. gpt-5-nano is not supported",
                }),
                (_.service_tier = void 0)));
        const {
            tools: E,
            toolChoice: b,
            toolWarnings: A,
        } = Ep({ tools: p, toolChoice: w, structuredOutputs: O, strictJsonSchema: v });
        return { args: { ..._, tools: E, tool_choice: b }, warnings: [...R, ...A] };
    }
    async doGenerate(e) {
        var t, n, o, r, a, l, i, d, c, p, w, y, k, x, I;
        const { args: S, warnings: R } = await this.getArgs(e),
            {
                responseHeaders: P,
                value: O,
                rawValue: C,
            } = await ke({
                url: this.config.url({ path: "/chat/completions", modelId: this.modelId }),
                headers: Se(this.config.headers(), e.headers),
                body: S,
                failedResponseHandler: rt,
                successfulResponseHandler: Re(Ip),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            }),
            h = O.choices[0];
        if (h == null) throw new Vt({ data: C, message: "Response did not contain any choices." });
        const g = [],
            v =
                h.message.content != null && h.message.content.length > 0
                    ? h.message.content
                    : (t = h.message.audio) == null
                      ? void 0
                      : t.transcript;
        v != null && v.length > 0 && g.push({ type: "text", text: v });
        for (const b of (n = h.message.tool_calls) != null ? n : [])
            g.push({
                type: "tool-call",
                toolCallId: (o = b.id) != null ? o : Ne(),
                toolName: b.function.name,
                input: b.function.arguments,
            });
        for (const b of (r = h.message.annotations) != null ? r : [])
            g.push({
                type: "source",
                sourceType: "url",
                id: Ne(),
                url: b.url_citation.url,
                title: b.url_citation.title,
            });
        const M = (a = O.usage) == null ? void 0 : a.completion_tokens_details,
            _ = (l = O.usage) == null ? void 0 : l.prompt_tokens_details,
            E = { openai: {} };
        return (
            M?.accepted_prediction_tokens != null &&
                (E.openai.acceptedPredictionTokens = M?.accepted_prediction_tokens),
            M?.rejected_prediction_tokens != null &&
                (E.openai.rejectedPredictionTokens = M?.rejected_prediction_tokens),
            _?.cache_write_tokens != null && (E.openai.usage = { cacheWriteTokens: _.cache_write_tokens }),
            ((i = h.logprobs) == null ? void 0 : i.content) != null && (E.openai.logprobs = h.logprobs.content),
            {
                content: g,
                finishReason: ya(h.finish_reason),
                usage: {
                    inputTokens: (c = (d = O.usage) == null ? void 0 : d.prompt_tokens) != null ? c : void 0,
                    outputTokens: (w = (p = O.usage) == null ? void 0 : p.completion_tokens) != null ? w : void 0,
                    totalTokens: (k = (y = O.usage) == null ? void 0 : y.total_tokens) != null ? k : void 0,
                    reasoningTokens: (x = M?.reasoning_tokens) != null ? x : void 0,
                    cachedInputTokens: (I = _?.cached_tokens) != null ? I : void 0,
                },
                request: { body: S },
                response: { ...Nn(O), headers: P, body: C },
                warnings: R,
                providerMetadata: E,
            }
        );
    }
    async doStream(e) {
        const { args: t, warnings: n } = await this.getArgs(e),
            o = { ...t, stream: !0, stream_options: { include_usage: !0 } },
            { responseHeaders: r, value: a } = await ke({
                url: this.config.url({ path: "/chat/completions", modelId: this.modelId }),
                headers: Se(this.config.headers(), e.headers),
                body: o,
                failedResponseHandler: rt,
                successfulResponseHandler: Pt(Sp),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            });
        let l,
            i = "unknown";
        const d = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 };
        let c = !1,
            p = !1;
        const w = { openai: {} };
        return {
            stream: a.pipeThrough(
                new TransformStream({
                    start(y) {
                        ((l = new mc(y, { generateId: Ne, typeValidation: "if-present" })),
                            y.enqueue({ type: "stream-start", warnings: n }));
                    },
                    transform(y, k) {
                        var x, I, S, R, P, O, C, h, g, v, M, _, E;
                        if ((e.includeRawChunks && k.enqueue({ type: "raw", rawValue: y.rawValue }), !y.success)) {
                            ((i = "error"), k.enqueue({ type: "error", error: y.error }));
                            return;
                        }
                        const b = y.value;
                        if ("error" in b) {
                            ((i = "error"), k.enqueue({ type: "error", error: b.error }));
                            return;
                        }
                        if (!c) {
                            const L = Nn(b);
                            Object.values(L).some(Boolean) &&
                                ((c = !0), k.enqueue({ type: "response-metadata", ...Nn(b) }));
                        }
                        b.usage != null &&
                            ((d.inputTokens = (x = b.usage.prompt_tokens) != null ? x : void 0),
                            (d.outputTokens = (I = b.usage.completion_tokens) != null ? I : void 0),
                            (d.totalTokens = (S = b.usage.total_tokens) != null ? S : void 0),
                            (d.reasoningTokens =
                                (P = (R = b.usage.completion_tokens_details) == null ? void 0 : R.reasoning_tokens) !=
                                null
                                    ? P
                                    : void 0),
                            (d.cachedInputTokens =
                                (C = (O = b.usage.prompt_tokens_details) == null ? void 0 : O.cached_tokens) != null
                                    ? C
                                    : void 0),
                            ((h = b.usage.prompt_tokens_details) == null ? void 0 : h.cache_write_tokens) != null &&
                                (w.openai.usage = {
                                    cacheWriteTokens: b.usage.prompt_tokens_details.cache_write_tokens,
                                }),
                            ((g = b.usage.completion_tokens_details) == null ? void 0 : g.accepted_prediction_tokens) !=
                                null &&
                                (w.openai.acceptedPredictionTokens =
                                    (v = b.usage.completion_tokens_details) == null
                                        ? void 0
                                        : v.accepted_prediction_tokens),
                            ((M = b.usage.completion_tokens_details) == null ? void 0 : M.rejected_prediction_tokens) !=
                                null &&
                                (w.openai.rejectedPredictionTokens =
                                    (_ = b.usage.completion_tokens_details) == null
                                        ? void 0
                                        : _.rejected_prediction_tokens));
                        const A = b.choices[0];
                        if (
                            (A?.finish_reason != null && (i = ya(A.finish_reason)),
                            ((E = A?.logprobs) == null ? void 0 : E.content) != null &&
                                (w.openai.logprobs = A.logprobs.content),
                            A?.delta == null)
                        )
                            return;
                        const U = A.delta;
                        if (
                            (U.content != null &&
                                (p || (k.enqueue({ type: "text-start", id: "0" }), (p = !0)),
                                k.enqueue({ type: "text-delta", id: "0", delta: U.content })),
                            U.tool_calls != null)
                        )
                            for (const L of U.tool_calls) l.processDelta(L);
                        if (U.annotations != null)
                            for (const L of U.annotations)
                                k.enqueue({
                                    type: "source",
                                    sourceType: "url",
                                    id: Ne(),
                                    url: L.url_citation.url,
                                    title: L.url_citation.title,
                                });
                    },
                    flush(y) {
                        (p && y.enqueue({ type: "text-end", id: "0" }),
                            l.flush(),
                            y.enqueue({
                                type: "finish",
                                finishReason: i,
                                usage: d,
                                ...(w != null ? { providerMetadata: w } : {}),
                            }));
                    },
                }),
            ),
            request: { body: o },
            response: { headers: r },
        };
    }
};
function Op({ prompt: e, user: t = "user", assistant: n = "assistant" }) {
    let o = "";
    e[0].role === "system" &&
        ((o += `${e[0].content}

`),
        (e = e.slice(1)));
    for (const { role: r, content: a } of e)
        switch (r) {
            case "system":
                throw new ht({ message: "Unexpected system message in prompt: ${content}", prompt: e });
            case "user": {
                const l = a
                    .map((i) => {
                        if (i.type === "text") return i.text;
                    })
                    .filter(Boolean)
                    .join("");
                o += `${t}:
${l}

`;
                break;
            }
            case "assistant": {
                const l = a
                    .map((i) => {
                        switch (i.type) {
                            case "text":
                                return i.text;
                            case "tool-call":
                                throw new ye({ functionality: "tool-call messages" });
                        }
                    })
                    .join("");
                o += `${n}:
${l}

`;
                break;
            }
            case "tool":
                throw new ye({ functionality: "tool messages" });
            default: {
                const l = r;
                throw new Error(`Unsupported role: ${l}`);
            }
        }
    return (
        (o += `${n}:
`),
        {
            prompt: o,
            stopSequences: [
                `
${t}:`,
            ],
        }
    );
}
function va({ id: e, model: t, created: n }) {
    return { id: e ?? void 0, modelId: t ?? void 0, timestamp: n != null ? new Date(n * 1e3) : void 0 };
}
function ba(e) {
    switch (e) {
        case "stop":
            return "stop";
        case "length":
            return "length";
        case "content_filter":
            return "content-filter";
        case "function_call":
        case "tool_calls":
            return "tool-calls";
        default:
            return "unknown";
    }
}
var Ap = ve(() =>
        G(
            u({
                id: s().nullish(),
                created: f().nullish(),
                model: s().nullish(),
                choices: N(
                    u({
                        text: s(),
                        finish_reason: s(),
                        logprobs: u({
                            tokens: N(s()),
                            token_logprobs: N(f()),
                            top_logprobs: N(we(s(), f())).nullish(),
                        }).nullish(),
                    }),
                ),
                usage: u({ prompt_tokens: f(), completion_tokens: f(), total_tokens: f() }).nullish(),
            }),
        ),
    ),
    Mp = ve(() =>
        G(
            X([
                u({
                    id: s().nullish(),
                    created: f().nullish(),
                    model: s().nullish(),
                    choices: N(
                        u({
                            text: s(),
                            finish_reason: s().nullish(),
                            index: f(),
                            logprobs: u({
                                tokens: N(s()),
                                token_logprobs: N(f()),
                                top_logprobs: N(we(s(), f())).nullish(),
                            }).nullish(),
                        }),
                    ),
                    usage: u({ prompt_tokens: f(), completion_tokens: f(), total_tokens: f() }).nullish(),
                }),
                so,
            ]),
        ),
    ),
    wa = ve(() =>
        G(
            u({
                echo: ne().optional(),
                logitBias: we(s(), f()).optional(),
                suffix: s().optional(),
                user: s().optional(),
                logprobs: X([ne(), f()]).optional(),
            }),
        ),
    ),
    Np = class {
        constructor(e, t) {
            ((this.specificationVersion = "v2"), (this.supportedUrls = {}), (this.modelId = e), (this.config = t));
        }
        get providerOptionsName() {
            return this.config.provider.split(".")[0].trim();
        }
        get provider() {
            return this.config.provider;
        }
        async getArgs({
            prompt: e,
            maxOutputTokens: t,
            temperature: n,
            topP: o,
            topK: r,
            frequencyPenalty: a,
            presencePenalty: l,
            stopSequences: i,
            responseFormat: d,
            tools: c,
            toolChoice: p,
            seed: w,
            providerOptions: y,
        }) {
            const k = [],
                x = {
                    ...(await Ie({ provider: "openai", providerOptions: y, schema: wa })),
                    ...(await Ie({ provider: this.providerOptionsName, providerOptions: y, schema: wa })),
                };
            (r != null && k.push({ type: "unsupported-setting", setting: "topK" }),
                c?.length && k.push({ type: "unsupported-setting", setting: "tools" }),
                p != null && k.push({ type: "unsupported-setting", setting: "toolChoice" }),
                d != null &&
                    d.type !== "text" &&
                    k.push({
                        type: "unsupported-setting",
                        setting: "responseFormat",
                        details: "JSON response format is not supported.",
                    }));
            const { prompt: I, stopSequences: S } = Op({ prompt: e }),
                R = [...(S ?? []), ...(i ?? [])];
            return {
                args: {
                    model: this.modelId,
                    echo: x.echo,
                    logit_bias: x.logitBias,
                    logprobs: x?.logprobs === !0 ? 0 : x?.logprobs === !1 ? void 0 : x?.logprobs,
                    suffix: x.suffix,
                    user: x.user,
                    max_tokens: t,
                    temperature: n,
                    top_p: o,
                    frequency_penalty: a,
                    presence_penalty: l,
                    seed: w,
                    prompt: I,
                    stop: R.length > 0 ? R : void 0,
                },
                warnings: k,
            };
        }
        async doGenerate(e) {
            var t, n, o;
            const { args: r, warnings: a } = await this.getArgs(e),
                {
                    responseHeaders: l,
                    value: i,
                    rawValue: d,
                } = await ke({
                    url: this.config.url({ path: "/completions", modelId: this.modelId }),
                    headers: Se(this.config.headers(), e.headers),
                    body: r,
                    failedResponseHandler: rt,
                    successfulResponseHandler: Re(Ap),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                }),
                c = i.choices[0],
                p = { openai: {} };
            return (
                c.logprobs != null && (p.openai.logprobs = c.logprobs),
                {
                    content: [{ type: "text", text: c.text }],
                    usage: {
                        inputTokens: (t = i.usage) == null ? void 0 : t.prompt_tokens,
                        outputTokens: (n = i.usage) == null ? void 0 : n.completion_tokens,
                        totalTokens: (o = i.usage) == null ? void 0 : o.total_tokens,
                    },
                    finishReason: ba(c.finish_reason),
                    request: { body: r },
                    response: { ...va(i), headers: l, body: d },
                    providerMetadata: p,
                    warnings: a,
                }
            );
        }
        async doStream(e) {
            const { args: t, warnings: n } = await this.getArgs(e),
                o = { ...t, stream: !0, stream_options: { include_usage: !0 } },
                { responseHeaders: r, value: a } = await ke({
                    url: this.config.url({ path: "/completions", modelId: this.modelId }),
                    headers: Se(this.config.headers(), e.headers),
                    body: o,
                    failedResponseHandler: rt,
                    successfulResponseHandler: Pt(Mp),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                });
            let l = "unknown";
            const i = { openai: {} },
                d = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 };
            let c = !0;
            return {
                stream: a.pipeThrough(
                    new TransformStream({
                        start(p) {
                            p.enqueue({ type: "stream-start", warnings: n });
                        },
                        transform(p, w) {
                            if ((e.includeRawChunks && w.enqueue({ type: "raw", rawValue: p.rawValue }), !p.success)) {
                                ((l = "error"), w.enqueue({ type: "error", error: p.error }));
                                return;
                            }
                            const y = p.value;
                            if ("error" in y) {
                                ((l = "error"), w.enqueue({ type: "error", error: y.error }));
                                return;
                            }
                            (c &&
                                ((c = !1),
                                w.enqueue({ type: "response-metadata", ...va(y) }),
                                w.enqueue({ type: "text-start", id: "0" })),
                                y.usage != null &&
                                    ((d.inputTokens = y.usage.prompt_tokens),
                                    (d.outputTokens = y.usage.completion_tokens),
                                    (d.totalTokens = y.usage.total_tokens)));
                            const k = y.choices[0];
                            (k?.finish_reason != null && (l = ba(k.finish_reason)),
                                k?.logprobs != null && (i.openai.logprobs = k.logprobs),
                                k?.text != null &&
                                    k.text.length > 0 &&
                                    w.enqueue({ type: "text-delta", id: "0", delta: k.text }));
                        },
                        flush(p) {
                            (c || p.enqueue({ type: "text-end", id: "0" }),
                                p.enqueue({ type: "finish", finishReason: l, providerMetadata: i, usage: d }));
                        },
                    }),
                ),
                request: { body: o },
                response: { headers: r },
            };
        }
    },
    Pp = ve(() => G(u({ dimensions: f().optional(), user: s().optional() }))),
    $p = ve(() => G(u({ data: N(u({ embedding: N(f()) })), usage: u({ prompt_tokens: f() }).nullish() }))),
    Ri;
Ri = jl;
var Dp = class {
        constructor(e, t) {
            ((this.specificationVersion = "v2"),
                (this.maxEmbeddingsPerCall = 2048),
                (this[Ri] = 3e5),
                (this.supportsParallelCalls = !0),
                (this.modelId = e),
                (this.config = t));
        }
        get provider() {
            return this.config.provider;
        }
        async doEmbed({ values: e, headers: t, abortSignal: n, providerOptions: o }) {
            var r;
            if (e.length > this.maxEmbeddingsPerCall)
                throw new Hr({
                    provider: this.provider,
                    modelId: this.modelId,
                    maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
                    values: e,
                });
            const a = (r = await Ie({ provider: "openai", providerOptions: o, schema: Pp })) != null ? r : {},
                {
                    responseHeaders: l,
                    value: i,
                    rawValue: d,
                } = await ke({
                    url: this.config.url({ path: "/embeddings", modelId: this.modelId }),
                    headers: Se(this.config.headers(), t),
                    body: {
                        model: this.modelId,
                        input: e,
                        encoding_format: "float",
                        dimensions: a.dimensions,
                        user: a.user,
                    },
                    failedResponseHandler: rt,
                    successfulResponseHandler: Re($p),
                    abortSignal: n,
                    fetch: this.config.fetch,
                });
            return {
                embeddings: i.data.map((c) => c.embedding),
                usage: i.usage ? { tokens: i.usage.prompt_tokens } : void 0,
                response: { headers: l, body: d },
            };
        }
    },
    qp = ve(() =>
        G(
            u({
                created: f().nullish(),
                data: N(u({ b64_json: s(), revised_prompt: s().nullish() })),
                background: s().nullish(),
                output_format: s().nullish(),
                size: s().nullish(),
                quality: s().nullish(),
                usage: u({
                    input_tokens: f().nullish(),
                    output_tokens: f().nullish(),
                    total_tokens: f().nullish(),
                    input_tokens_details: u({ image_tokens: f().nullish(), text_tokens: f().nullish() }).nullish(),
                }).nullish(),
            }),
        ),
    ),
    Up = {
        "dall-e-3": 1,
        "dall-e-2": 10,
        "gpt-image-1": 10,
        "gpt-image-1-mini": 10,
        "gpt-image-1.5": 10,
        "gpt-image-2": 10,
    },
    Lp = ["gpt-image-"];
function jp(e) {
    return Lp.some((t) => e.startsWith(t));
}
function Bp(e) {
    var t;
    return (t = Up[e]) != null ? t : e.startsWith("gpt-image-") ? 10 : 1;
}
var Gp = u({
        quality: J(["standard", "hd", "low", "medium", "high", "auto"]).optional(),
        background: J(["transparent", "opaque", "auto"]).optional(),
        outputFormat: J(["png", "jpeg", "webp"]).optional(),
        outputCompression: f().int().min(0).max(100).optional(),
        user: s().optional(),
    }),
    Fp = ve(() =>
        G(Gp.extend({ style: J(["vivid", "natural"]).optional(), moderation: J(["auto", "low"]).optional() })),
    ),
    Hp = class {
        constructor(e, t) {
            ((this.modelId = e), (this.config = t), (this.specificationVersion = "v2"));
        }
        get maxImagesPerCall() {
            return Bp(this.modelId);
        }
        get provider() {
            return this.config.provider;
        }
        async doGenerate({
            prompt: e,
            n: t,
            size: n,
            aspectRatio: o,
            seed: r,
            providerOptions: a,
            headers: l,
            abortSignal: i,
        }) {
            var d, c, p, w;
            const y = [];
            (o != null &&
                y.push({
                    type: "unsupported-setting",
                    setting: "aspectRatio",
                    details: "This model does not support aspect ratio. Use `size` instead.",
                }),
                r != null && y.push({ type: "unsupported-setting", setting: "seed" }));
            const k =
                    (p =
                        (c = (d = this.config._internal) == null ? void 0 : d.currentDate) == null
                            ? void 0
                            : c.call(d)) != null
                        ? p
                        : new Date(),
                x = (w = await Ie({ provider: "openai", providerOptions: a, schema: Fp })) != null ? w : {},
                { value: I, responseHeaders: S } = await ke({
                    url: this.config.url({ path: "/images/generations", modelId: this.modelId }),
                    headers: Se(this.config.headers(), l),
                    body: {
                        model: this.modelId,
                        prompt: e,
                        n: t,
                        size: n,
                        quality: x.quality,
                        style: x.style,
                        background: x.background,
                        moderation: x.moderation,
                        output_format: x.outputFormat,
                        output_compression: x.outputCompression,
                        user: x.user,
                        ...(jp(this.modelId) ? {} : { response_format: "b64_json" }),
                    },
                    failedResponseHandler: rt,
                    successfulResponseHandler: Re(qp),
                    abortSignal: i,
                    fetch: this.config.fetch,
                });
            return {
                images: I.data.map((R) => R.b64_json),
                warnings: y,
                response: { timestamp: k, modelId: this.modelId, headers: S },
                providerMetadata: {
                    openai: {
                        images: I.data.map((R, P) => ({
                            ...(R.revised_prompt ? { revisedPrompt: R.revised_prompt } : {}),
                            ...(I.created != null ? { created: I.created } : {}),
                            ...(I.size != null ? { size: I.size } : {}),
                            ...(I.quality != null ? { quality: I.quality } : {}),
                            ...(I.background != null ? { background: I.background } : {}),
                            ...(I.output_format != null ? { outputFormat: I.output_format } : {}),
                            ...Vp(I.usage, P, I.data.length),
                        })),
                    },
                },
            };
        }
    };
function Vp(e, t, n) {
    if (e == null) return {};
    const o = {},
        r = e.input_tokens_details;
    if (r?.image_tokens != null) {
        const a = Math.floor(r.image_tokens / n),
            l = r.image_tokens - a * (n - 1);
        o.imageTokens = t === n - 1 ? l : a;
    }
    if (r?.text_tokens != null) {
        const a = Math.floor(r.text_tokens / n),
            l = r.text_tokens - a * (n - 1);
        o.textTokens = t === n - 1 ? l : a;
    }
    if (e.input_tokens != null) {
        const a = Math.floor(e.input_tokens / n),
            l = e.input_tokens - a * (n - 1);
        o.inputTokens = t === n - 1 ? l : a;
    }
    if (e.output_tokens != null) {
        const a = Math.floor(e.output_tokens / n),
            l = e.output_tokens - a * (n - 1);
        o.outputTokens = t === n - 1 ? l : a;
    }
    return o;
}
var Jp = K(() => G(u({ code: s().nullish(), containerId: s() }))),
    Wp = K(() =>
        G(
            u({
                outputs: N(
                    ie("type", [u({ type: m("logs"), logs: s() }), u({ type: m("image"), url: s() })]),
                ).nullish(),
            }),
        ),
    ),
    Zp = K(() => G(u({ container: X([s(), u({ fileIds: N(s()).optional() })]).optional() }))),
    zp = Le({ id: "openai.code_interpreter", name: "code_interpreter", inputSchema: Jp, outputSchema: Wp }),
    Kp = (e = {}) => zp(e),
    Oi = u({
        key: s(),
        type: J(["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin"]),
        value: X([s(), f(), ne(), N(s())]),
    }),
    Ai = u({ type: J(["and", "or"]), filters: N(X([Oi, wr(() => Ai)])) }),
    Yp = K(() =>
        G(
            u({
                vectorStoreIds: N(s()),
                maxNumResults: f().optional(),
                ranking: u({ ranker: s().optional(), scoreThreshold: f().optional() }).optional(),
                filters: X([Oi, Ai]).optional(),
            }),
        ),
    ),
    Xp = K(() =>
        G(
            u({
                queries: N(s()),
                results: N(
                    u({ attributes: we(s(), Ue()), fileId: s(), filename: s(), score: f(), text: s() }),
                ).nullable(),
            }),
        ),
    ),
    Qp = Le({ id: "openai.file_search", name: "file_search", inputSchema: u({}), outputSchema: Xp }),
    ef = K(() =>
        G(
            u({
                background: J(["auto", "opaque", "transparent"]).optional(),
                inputFidelity: J(["low", "high"]).optional(),
                inputImageMask: u({ fileId: s().optional(), imageUrl: s().optional() }).optional(),
                model: s().optional(),
                moderation: J(["auto"]).optional(),
                outputCompression: f().int().min(0).max(100).optional(),
                outputFormat: J(["png", "jpeg", "webp"]).optional(),
                partialImages: f().int().min(0).max(3).optional(),
                quality: J(["auto", "low", "medium", "high"]).optional(),
                size: J(["1024x1024", "1024x1536", "1536x1024", "auto"]).optional(),
            }).strict(),
        ),
    ),
    tf = K(() => G(u({}))),
    nf = K(() => G(u({ result: s() }))),
    of = Le({ id: "openai.image_generation", name: "image_generation", inputSchema: tf, outputSchema: nf }),
    af = (e = {}) => of(e),
    Mi = K(() =>
        G(
            u({
                action: u({
                    type: m("exec"),
                    command: N(s()),
                    timeoutMs: f().optional(),
                    user: s().optional(),
                    workingDirectory: s().optional(),
                    env: we(s(), s()).optional(),
                }),
            }),
        ),
    ),
    Ni = K(() => G(u({ output: s() }))),
    rf = Le({ id: "openai.local_shell", name: "local_shell", inputSchema: Mi, outputSchema: Ni }),
    sf = K(() =>
        G(
            u({
                externalWebAccess: ne().optional(),
                filters: u({ allowedDomains: N(s()).optional(), blockedDomains: N(s()).optional() }).optional(),
                searchContextSize: J(["low", "medium", "high"]).optional(),
                userLocation: u({
                    type: m("approximate"),
                    country: s().optional(),
                    city: s().optional(),
                    region: s().optional(),
                    timezone: s().optional(),
                }).optional(),
            }),
        ),
    ),
    lf = K(() => G(u({}))),
    uf = K(() =>
        G(
            u({
                action: ie("type", [
                    u({ type: m("search"), query: s().optional() }),
                    u({ type: m("openPage"), url: s().nullish() }),
                    u({ type: m("findInPage"), url: s().nullish(), pattern: s().nullish() }),
                ]).optional(),
                sources: N(ie("type", [u({ type: m("url"), url: s() }), u({ type: m("api"), name: s() })])).optional(),
            }),
        ),
    ),
    cf = Le({ id: "openai.web_search", name: "web_search", inputSchema: lf, outputSchema: uf }),
    df = (e = {}) => cf(e),
    pf = K(() =>
        G(
            u({
                searchContextSize: J(["low", "medium", "high"]).optional(),
                userLocation: u({
                    type: m("approximate"),
                    country: s().optional(),
                    city: s().optional(),
                    region: s().optional(),
                    timezone: s().optional(),
                }).optional(),
            }),
        ),
    ),
    ff = K(() => G(u({}))),
    mf = K(() =>
        G(
            u({
                action: ie("type", [
                    u({ type: m("search"), query: s().optional() }),
                    u({ type: m("openPage"), url: s().nullish() }),
                    u({ type: m("findInPage"), url: s().nullish(), pattern: s().nullish() }),
                ]).optional(),
            }),
        ),
    ),
    hf = Le({ id: "openai.web_search_preview", name: "web_search_preview", inputSchema: ff, outputSchema: mf }),
    gf = {
        codeInterpreter: Kp,
        fileSearch: Qp,
        imageGeneration: af,
        localShell: rf,
        webSearchPreview: hf,
        webSearch: df,
    },
    Pi = 20,
    _f = ve(() =>
        G(
            u({
                conversation: s().nullish(),
                include: N(
                    J(["reasoning.encrypted_content", "file_search_call.results", "message.output_text.logprobs"]),
                ).nullish(),
                instructions: s().nullish(),
                logprobs: X([ne(), f().min(1).max(Pi)]).optional(),
                maxToolCalls: f().nullish(),
                metadata: Ge().nullish(),
                parallelToolCalls: ne().nullish(),
                previousResponseId: s().nullish(),
                promptCacheKey: s().nullish(),
                promptCacheOptions: u({
                    mode: J(["implicit", "explicit"]).optional(),
                    ttl: m("30m").optional(),
                }).optional(),
                promptCacheRetention: J(["in_memory", "24h"]).nullish(),
                reasoningEffort: s().nullish(),
                reasoningEffortUpdate: J(["low", "medium", "high", "xhigh", "max"]).optional(),
                reasoningMode: J(["standard", "pro"]).optional(),
                reasoningContext: J(["auto", "current_turn", "all_turns"]).optional(),
                reasoningSummary: s().nullish(),
                safetyIdentifier: s().nullish(),
                serviceTier: J(["auto", "flex", "priority", "default"]).nullish(),
                store: ne().nullish(),
                strictJsonSchema: ne().nullish(),
                textVerbosity: J(["low", "medium", "high"]).nullish(),
                truncation: J(["auto", "disabled"]).nullish(),
                user: s().nullish(),
            }),
        ),
    ),
    xa = ve(() => G(u({ reasoningEffortUpdate: J(["low", "medium", "high", "xhigh", "max"]).optional() })));
function Bt(e) {
    var t;
    return (t = e?.openai) == null ? void 0 : t.promptCacheBreakpoint;
}
function Ta(e, t) {
    return t ? t.some((n) => e.startsWith(n)) : !1;
}
async function yf({
    prompt: e,
    systemMessageMode: t,
    providerOptionsName: n = "openai",
    explicitMessageItemType: o = !1,
    fileIdPrefixes: r,
    store: a,
    configurationUpdateUnsupportedReason: l,
    hasLocalShellTool: i = !1,
}) {
    var d, c, p, w, y, k, x, I;
    let S = [];
    const R = [];
    for (const { role: P, content: O, providerOptions: C } of e)
        switch (P) {
            case "system": {
                let h = await Ie({ provider: n, providerOptions: C, schema: xa });
                h == null && n !== "openai" && (h = await Ie({ provider: "openai", providerOptions: C, schema: xa }));
                const g = h?.reasoningEffortUpdate;
                if (g != null) {
                    const v =
                        O !== "" ? "Message-level reasoningEffortUpdate requires empty system message content." : l;
                    if (v != null) throw new ye({ functionality: "Message-level reasoningEffortUpdate", message: v });
                    S.push({ type: "configuration_update", reasoning: { effort: g } });
                    break;
                }
                switch (t) {
                    case "system": {
                        const v = Bt(C);
                        S.push({
                            ...(o && { type: "message" }),
                            role: "system",
                            content: v == null ? O : [{ type: "input_text", text: O, prompt_cache_breakpoint: v }],
                        });
                        break;
                    }
                    case "developer": {
                        const v = Bt(C);
                        S.push({
                            ...(o && { type: "message" }),
                            role: "developer",
                            content: v == null ? O : [{ type: "input_text", text: O, prompt_cache_breakpoint: v }],
                        });
                        break;
                    }
                    case "remove": {
                        R.push({ type: "other", message: "system messages are removed for this model" });
                        break;
                    }
                    default: {
                        const v = t;
                        throw new Error(`Unsupported system message mode: ${v}`);
                    }
                }
                break;
            }
            case "user": {
                S.push({
                    ...(o && { type: "message" }),
                    role: "user",
                    content: O.map((h, g) => {
                        var v, M, _;
                        switch (h.type) {
                            case "text": {
                                const E = Bt(h.providerOptions);
                                return {
                                    type: "input_text",
                                    text: h.text,
                                    ...(E != null && { prompt_cache_breakpoint: E }),
                                };
                            }
                            case "file": {
                                const E = Bt(h.providerOptions);
                                if (h.mediaType.startsWith("image/")) {
                                    const b = h.mediaType === "image/*" ? "image/jpeg" : h.mediaType;
                                    return {
                                        type: "input_image",
                                        ...(h.data instanceof URL
                                            ? { image_url: h.data.toString() }
                                            : typeof h.data == "string" && Ta(h.data, r)
                                              ? { file_id: h.data }
                                              : { image_url: `data:${b};base64,${ot(h.data)}` }),
                                        detail:
                                            (M = (v = h.providerOptions) == null ? void 0 : v.openai) == null
                                                ? void 0
                                                : M.imageDetail,
                                        ...(E != null && { prompt_cache_breakpoint: E }),
                                    };
                                } else {
                                    if (h.mediaType === "application/pdf")
                                        return h.data instanceof URL
                                            ? {
                                                  type: "input_file",
                                                  file_url: h.data.toString(),
                                                  ...(E != null && { prompt_cache_breakpoint: E }),
                                              }
                                            : {
                                                  type: "input_file",
                                                  ...(typeof h.data == "string" && Ta(h.data, r)
                                                      ? { file_id: h.data }
                                                      : {
                                                            filename: (_ = h.filename) != null ? _ : `part-${g}.pdf`,
                                                            file_data: `data:application/pdf;base64,${ot(h.data)}`,
                                                        }),
                                                  ...(E != null && { prompt_cache_breakpoint: E }),
                                              };
                                    throw new ye({ functionality: `file part media type ${h.mediaType}` });
                                }
                            }
                        }
                    }),
                });
                break;
            }
            case "assistant": {
                const h = {},
                    g = {};
                for (const v of O)
                    switch (v.type) {
                        case "text": {
                            const M =
                                    (c = (d = v.providerOptions) == null ? void 0 : d.openai) == null
                                        ? void 0
                                        : c.itemId,
                                _ =
                                    (w = (p = v.providerOptions) == null ? void 0 : p.openai) == null
                                        ? void 0
                                        : w.phase;
                            if (a && M != null) {
                                S.push({ type: "item_reference", id: M });
                                break;
                            }
                            S.push({
                                ...(o && { type: "message" }),
                                role: "assistant",
                                content: [{ type: "output_text", text: v.text }],
                                id: M,
                                ...(_ != null && { phase: _ }),
                            });
                            break;
                        }
                        case "tool-call": {
                            if (((g[v.toolCallId] = v), v.providerExecuted)) break;
                            const M =
                                    (k = (y = v.providerOptions) == null ? void 0 : y.openai) == null
                                        ? void 0
                                        : k.itemId,
                                _ =
                                    (I = (x = v.providerOptions) == null ? void 0 : x.openai) == null
                                        ? void 0
                                        : I.async;
                            if (a && M != null) {
                                S.push({ type: "item_reference", id: M });
                                break;
                            }
                            if (i && v.toolName === "local_shell") {
                                const E = await Ce({ value: v.input, schema: Mi });
                                S.push({
                                    type: "local_shell_call",
                                    call_id: v.toolCallId,
                                    id: M,
                                    action: {
                                        type: "exec",
                                        command: E.action.command,
                                        timeout_ms: E.action.timeoutMs,
                                        user: E.action.user,
                                        working_directory: E.action.workingDirectory,
                                        env: E.action.env,
                                    },
                                });
                                break;
                            }
                            S.push({
                                type: "function_call",
                                call_id: v.toolCallId,
                                name: v.toolName,
                                arguments: JSON.stringify(v.input),
                                ...(_ != null && { async: _ }),
                                id: M,
                            });
                            break;
                        }
                        case "tool-result": {
                            a
                                ? S.push({ type: "item_reference", id: v.toolCallId })
                                : R.push({
                                      type: "other",
                                      message: `Results for OpenAI tool ${v.toolName} are not sent to the API when store is false`,
                                  });
                            break;
                        }
                        case "reasoning": {
                            const M = await Ie({ provider: "openai", providerOptions: v.providerOptions, schema: vf }),
                                _ = M?.itemId;
                            if (_ != null) {
                                const E = h[_];
                                if (a)
                                    E === void 0 &&
                                        (S.push({ type: "item_reference", id: _ }),
                                        (h[_] = { type: "reasoning", id: _, summary: [] }));
                                else {
                                    const b = [];
                                    (v.text.length > 0
                                        ? b.push({ type: "summary_text", text: v.text })
                                        : E !== void 0 &&
                                          R.push({
                                              type: "other",
                                              message: `Cannot append empty reasoning part to existing reasoning sequence. Skipping reasoning part: ${JSON.stringify(v)}.`,
                                          }),
                                        E === void 0
                                            ? ((h[_] = {
                                                  type: "reasoning",
                                                  id: _,
                                                  encrypted_content: M?.reasoningEncryptedContent,
                                                  summary: b,
                                              }),
                                              S.push(h[_]))
                                            : (E.summary.push(...b),
                                              M?.reasoningEncryptedContent != null &&
                                                  (E.encrypted_content = M.reasoningEncryptedContent)));
                                }
                            } else
                                R.push({
                                    type: "other",
                                    message: `Non-OpenAI reasoning parts are not supported. Skipping reasoning part: ${JSON.stringify(v)}.`,
                                });
                            break;
                        }
                    }
                break;
            }
            case "tool": {
                for (const h of O) {
                    const g = h.output,
                        v = Bt(h.providerOptions);
                    if (i && h.toolName === "local_shell" && g.type === "json") {
                        const _ = await Ce({ value: g.value, schema: Ni });
                        S.push({ type: "local_shell_call_output", call_id: h.toolCallId, output: _.output });
                        break;
                    }
                    let M;
                    switch (g.type) {
                        case "text":
                        case "error-text":
                            M =
                                v == null
                                    ? g.value
                                    : [{ type: "input_text", text: g.value, prompt_cache_breakpoint: v }];
                            break;
                        case "json":
                        case "error-json":
                            M =
                                v == null
                                    ? JSON.stringify(g.value)
                                    : [
                                          {
                                              type: "input_text",
                                              text: JSON.stringify(g.value),
                                              prompt_cache_breakpoint: v,
                                          },
                                      ];
                            break;
                        case "content":
                            M = g.value.map((_, E) => {
                                const b = v != null && E === g.value.length - 1;
                                switch (_.type) {
                                    case "text":
                                        return {
                                            type: "input_text",
                                            text: _.text,
                                            ...(b && { prompt_cache_breakpoint: v }),
                                        };
                                    case "media":
                                        return _.mediaType.startsWith("image/")
                                            ? {
                                                  type: "input_image",
                                                  image_url: `data:${_.mediaType};base64,${_.data}`,
                                                  ...(b && { prompt_cache_breakpoint: v }),
                                              }
                                            : {
                                                  type: "input_file",
                                                  filename: "data",
                                                  file_data: `data:${_.mediaType};base64,${_.data}`,
                                                  ...(b && { prompt_cache_breakpoint: v }),
                                              };
                                }
                            });
                            break;
                    }
                    S.push({ type: "function_call_output", call_id: h.toolCallId, output: M });
                }
                break;
            }
            default: {
                const h = P;
                throw new Error(`Unsupported role: ${h}`);
            }
        }
    return (
        !a &&
            S.some((P) => "type" in P && P.type === "reasoning" && P.encrypted_content == null) &&
            (R.push({
                type: "other",
                message:
                    "Reasoning parts without encrypted content are not supported when store is false. Skipping reasoning parts.",
            }),
            (S = S.filter((P) => !("type" in P) || P.type !== "reasoning" || P.encrypted_content != null))),
        { input: S, warnings: R }
    );
}
var vf = u({ itemId: s().nullish(), reasoningEncryptedContent: s().nullish() });
function ka({ finishReason: e, hasFunctionCall: t }) {
    switch (e) {
        case void 0:
        case null:
            return t ? "tool-calls" : "stop";
        case "max_output_tokens":
            return "length";
        case "content_filter":
            return "content-filter";
        default:
            return t ? "tool-calls" : "unknown";
    }
}
var bf = ve(() =>
        G(
            X([
                u({
                    type: m("response.output_text.delta"),
                    item_id: s(),
                    delta: s(),
                    logprobs: N(
                        u({ token: s(), logprob: f(), top_logprobs: N(u({ token: s(), logprob: f() })) }),
                    ).nullish(),
                }),
                u({
                    type: J(["response.completed", "response.incomplete"]),
                    response: u({
                        incomplete_details: u({ reason: s() }).nullish(),
                        usage: u({
                            input_tokens: f(),
                            input_tokens_details: u({
                                cached_tokens: f().nullish(),
                                cache_write_tokens: f().nullish(),
                                orchestration_input_tokens: f().nullish(),
                                orchestration_input_cached_tokens: f().nullish(),
                            }).nullish(),
                            output_tokens: f(),
                            output_tokens_details: u({
                                reasoning_tokens: f().nullish(),
                                orchestration_output_tokens: f().nullish(),
                            }).nullish(),
                        }),
                        reasoning: u({ context: s().nullish() }).nullish(),
                        service_tier: s().nullish(),
                    }),
                }),
                u({
                    type: m("response.created"),
                    response: u({ id: s(), created_at: f(), model: s(), service_tier: s().nullish() }),
                }),
                u({
                    type: m("response.output_item.added"),
                    output_index: f(),
                    item: ie("type", [
                        u({ type: m("message"), id: s(), phase: J(["commentary", "final_answer"]).nullish() }),
                        u({ type: m("reasoning"), id: s(), encrypted_content: s().nullish() }),
                        u({
                            type: m("function_call"),
                            id: s(),
                            call_id: s(),
                            name: s(),
                            arguments: s(),
                            async: ne().nullish(),
                        }),
                        u({ type: m("web_search_call"), id: s(), status: s() }),
                        u({ type: m("computer_call"), id: s(), status: s() }),
                        u({ type: m("file_search_call"), id: s() }),
                        u({ type: m("image_generation_call"), id: s() }),
                        u({
                            type: m("code_interpreter_call"),
                            id: s(),
                            container_id: s(),
                            code: s().nullable(),
                            outputs: N(
                                ie("type", [u({ type: m("logs"), logs: s() }), u({ type: m("image"), url: s() })]),
                            ).nullable(),
                            status: s(),
                        }),
                    ]),
                }),
                u({
                    type: m("response.output_item.done"),
                    output_index: f(),
                    item: ie("type", [
                        u({ type: m("message"), id: s(), phase: J(["commentary", "final_answer"]).nullish() }),
                        u({ type: m("reasoning"), id: s(), encrypted_content: s().nullish() }),
                        u({
                            type: m("function_call"),
                            id: s(),
                            call_id: s(),
                            name: s(),
                            arguments: s(),
                            async: ne().nullish(),
                            status: J(["in_progress", "completed", "incomplete"]),
                        }),
                        u({
                            type: m("code_interpreter_call"),
                            id: s(),
                            code: s().nullable(),
                            container_id: s(),
                            outputs: N(
                                ie("type", [u({ type: m("logs"), logs: s() }), u({ type: m("image"), url: s() })]),
                            ).nullable(),
                        }),
                        u({ type: m("image_generation_call"), id: s(), result: s() }),
                        u({
                            type: m("web_search_call"),
                            id: s(),
                            status: s(),
                            action: ie("type", [
                                u({
                                    type: m("search"),
                                    query: s().nullish(),
                                    sources: N(
                                        ie("type", [u({ type: m("url"), url: s() }), u({ type: m("api"), name: s() })]),
                                    ).nullish(),
                                }),
                                u({ type: m("open_page"), url: s().nullish() }),
                                u({ type: m("find_in_page"), url: s().nullish(), pattern: s().nullish() }),
                            ]).nullish(),
                        }),
                        u({
                            type: m("file_search_call"),
                            id: s(),
                            queries: N(s()),
                            results: N(
                                u({ attributes: we(s(), Ue()), file_id: s(), filename: s(), score: f(), text: s() }),
                            ).nullish(),
                        }),
                        u({
                            type: m("local_shell_call"),
                            id: s(),
                            call_id: s(),
                            action: u({
                                type: m("exec"),
                                command: N(s()),
                                timeout_ms: f().optional(),
                                user: s().optional(),
                                working_directory: s().optional(),
                                env: we(s(), s()).optional(),
                            }),
                        }),
                        u({ type: m("computer_call"), id: s(), status: m("completed") }),
                    ]),
                }),
                u({ type: m("response.function_call_arguments.delta"), item_id: s(), output_index: f(), delta: s() }),
                u({
                    type: m("response.image_generation_call.partial_image"),
                    item_id: s(),
                    output_index: f(),
                    partial_image_b64: s(),
                }),
                u({
                    type: m("response.code_interpreter_call_code.delta"),
                    item_id: s(),
                    output_index: f(),
                    delta: s(),
                }),
                u({ type: m("response.code_interpreter_call_code.done"), item_id: s(), output_index: f(), code: s() }),
                u({
                    type: m("response.output_text.annotation.added"),
                    annotation: ie("type", [
                        u({ type: m("url_citation"), start_index: f(), end_index: f(), url: s(), title: s() }),
                        u({
                            type: m("file_citation"),
                            file_id: s(),
                            filename: s().nullish(),
                            index: f().nullish(),
                            start_index: f().nullish(),
                            end_index: f().nullish(),
                            quote: s().nullish(),
                        }),
                    ]),
                }),
                u({ type: m("response.reasoning_summary_part.added"), item_id: s(), summary_index: f() }),
                u({ type: m("response.reasoning_summary_text.delta"), item_id: s(), summary_index: f(), delta: s() }),
                u({ type: m("response.reasoning_summary_part.done"), item_id: s(), summary_index: f() }),
                u({
                    type: m("error"),
                    sequence_number: f(),
                    error: u({ type: s(), code: s(), message: s(), param: s().nullish() }),
                }),
                u({ type: s() })
                    .loose()
                    .transform((e) => ({ type: "unknown_chunk", message: e.type })),
            ]),
        ),
    ),
    wf = ve(() =>
        G(
            u({
                id: s().optional(),
                created_at: f().optional(),
                error: u({ message: s(), type: s(), param: s().nullish(), code: s() }).nullish(),
                model: s().optional(),
                output: N(
                    ie("type", [
                        u({
                            type: m("message"),
                            role: m("assistant"),
                            id: s(),
                            phase: J(["commentary", "final_answer"]).nullish(),
                            content: N(
                                u({
                                    type: m("output_text"),
                                    text: s(),
                                    logprobs: N(
                                        u({
                                            token: s(),
                                            logprob: f(),
                                            top_logprobs: N(u({ token: s(), logprob: f() })),
                                        }),
                                    ).nullish(),
                                    annotations: N(
                                        ie("type", [
                                            u({
                                                type: m("url_citation"),
                                                start_index: f(),
                                                end_index: f(),
                                                url: s(),
                                                title: s(),
                                            }),
                                            u({
                                                type: m("file_citation"),
                                                file_id: s(),
                                                filename: s().nullish(),
                                                index: f().nullish(),
                                                start_index: f().nullish(),
                                                end_index: f().nullish(),
                                                quote: s().nullish(),
                                            }),
                                            u({
                                                type: m("container_file_citation"),
                                                container_id: s(),
                                                file_id: s(),
                                                filename: s().nullish(),
                                                start_index: f().nullish(),
                                                end_index: f().nullish(),
                                                index: f().nullish(),
                                            }),
                                            u({ type: m("file_path"), file_id: s(), index: f().nullish() }),
                                        ]),
                                    ),
                                }),
                            ),
                        }),
                        u({
                            type: m("web_search_call"),
                            id: s(),
                            status: s(),
                            action: ie("type", [
                                u({
                                    type: m("search"),
                                    query: s().nullish(),
                                    sources: N(
                                        ie("type", [u({ type: m("url"), url: s() }), u({ type: m("api"), name: s() })]),
                                    ).nullish(),
                                }),
                                u({ type: m("open_page"), url: s().nullish() }),
                                u({ type: m("find_in_page"), url: s().nullish(), pattern: s().nullish() }),
                            ]).nullish(),
                        }),
                        u({
                            type: m("file_search_call"),
                            id: s(),
                            queries: N(s()),
                            results: N(
                                u({
                                    attributes: we(s(), X([s(), f(), ne()])),
                                    file_id: s(),
                                    filename: s(),
                                    score: f(),
                                    text: s(),
                                }),
                            ).nullish(),
                        }),
                        u({
                            type: m("code_interpreter_call"),
                            id: s(),
                            code: s().nullable(),
                            container_id: s(),
                            outputs: N(
                                ie("type", [u({ type: m("logs"), logs: s() }), u({ type: m("image"), url: s() })]),
                            ).nullable(),
                        }),
                        u({ type: m("image_generation_call"), id: s(), result: s() }),
                        u({
                            type: m("local_shell_call"),
                            id: s(),
                            call_id: s(),
                            action: u({
                                type: m("exec"),
                                command: N(s()),
                                timeout_ms: f().optional(),
                                user: s().optional(),
                                working_directory: s().optional(),
                                env: we(s(), s()).optional(),
                            }),
                        }),
                        u({
                            type: m("function_call"),
                            call_id: s(),
                            name: s(),
                            arguments: s(),
                            id: s(),
                            async: ne().nullish(),
                        }),
                        u({ type: m("computer_call"), id: s(), status: s().optional() }),
                        u({
                            type: m("reasoning"),
                            id: s(),
                            encrypted_content: s().nullish(),
                            summary: N(u({ type: m("summary_text"), text: s() })),
                        }),
                    ]),
                ).optional(),
                service_tier: s().nullish(),
                reasoning: u({ context: s().nullish() }).nullish(),
                incomplete_details: u({ reason: s() }).nullish(),
                usage: u({
                    input_tokens: f(),
                    input_tokens_details: u({
                        cached_tokens: f().nullish(),
                        cache_write_tokens: f().nullish(),
                        orchestration_input_tokens: f().nullish(),
                        orchestration_input_cached_tokens: f().nullish(),
                    }).nullish(),
                    output_tokens: f(),
                    output_tokens_details: u({
                        reasoning_tokens: f().nullish(),
                        orchestration_output_tokens: f().nullish(),
                    }).nullish(),
                }).optional(),
            }),
        ),
    );
async function xf({ tools: e, toolChoice: t, strictJsonSchema: n, supportsAsyncToolCalling: o = !0 }) {
    var r;
    e = e?.length ? e : void 0;
    const a = [];
    if (e == null) return { tools: void 0, toolChoice: void 0, toolWarnings: a };
    const l = [];
    for (const d of e)
        switch (d.type) {
            case "function": {
                const c = (r = d.providerOptions) == null ? void 0 : r.openai,
                    p = Tf({ value: c?.async, supportsAsyncToolCalling: o, tool: d, toolWarnings: a });
                l.push({
                    type: "function",
                    name: d.name,
                    description: d.description,
                    parameters: d.inputSchema,
                    strict: n,
                    ...(p != null ? { async: p } : {}),
                });
                break;
            }
            case "provider-defined": {
                switch (d.id) {
                    case "openai.file_search": {
                        const c = await Ce({ value: d.args, schema: Yp });
                        l.push({
                            type: "file_search",
                            vector_store_ids: c.vectorStoreIds,
                            max_num_results: c.maxNumResults,
                            ranking_options: c.ranking
                                ? { ranker: c.ranking.ranker, score_threshold: c.ranking.scoreThreshold }
                                : void 0,
                            filters: c.filters,
                        });
                        break;
                    }
                    case "openai.local_shell": {
                        l.push({ type: "local_shell" });
                        break;
                    }
                    case "openai.web_search_preview": {
                        const c = await Ce({ value: d.args, schema: pf });
                        l.push({
                            type: "web_search_preview",
                            search_context_size: c.searchContextSize,
                            user_location: c.userLocation,
                        });
                        break;
                    }
                    case "openai.web_search": {
                        const c = await Ce({ value: d.args, schema: sf });
                        l.push({
                            type: "web_search",
                            filters:
                                c.filters != null
                                    ? {
                                          allowed_domains: c.filters.allowedDomains,
                                          blocked_domains: c.filters.blockedDomains,
                                      }
                                    : void 0,
                            external_web_access: c.externalWebAccess,
                            search_context_size: c.searchContextSize,
                            user_location: c.userLocation,
                        });
                        break;
                    }
                    case "openai.code_interpreter": {
                        const c = await Ce({ value: d.args, schema: Zp });
                        l.push({
                            type: "code_interpreter",
                            container:
                                c.container == null
                                    ? { type: "auto", file_ids: void 0 }
                                    : typeof c.container == "string"
                                      ? c.container
                                      : { type: "auto", file_ids: c.container.fileIds },
                        });
                        break;
                    }
                    case "openai.image_generation": {
                        const c = await Ce({ value: d.args, schema: ef });
                        l.push({
                            type: "image_generation",
                            background: c.background,
                            input_fidelity: c.inputFidelity,
                            input_image_mask: c.inputImageMask
                                ? { file_id: c.inputImageMask.fileId, image_url: c.inputImageMask.imageUrl }
                                : void 0,
                            model: c.model,
                            size: c.size,
                            quality: c.quality,
                            moderation: c.moderation,
                            output_format: c.outputFormat,
                            output_compression: c.outputCompression,
                        });
                        break;
                    }
                }
                break;
            }
            default:
                a.push({ type: "unsupported-tool", tool: d });
                break;
        }
    if (t == null) return { tools: l, toolChoice: void 0, toolWarnings: a };
    const i = t.type;
    switch (i) {
        case "auto":
        case "none":
        case "required":
            return { tools: l, toolChoice: i, toolWarnings: a };
        case "tool":
            return {
                tools: l,
                toolChoice:
                    t.toolName === "code_interpreter" ||
                    t.toolName === "file_search" ||
                    t.toolName === "image_generation" ||
                    t.toolName === "web_search_preview" ||
                    t.toolName === "web_search"
                        ? { type: t.toolName }
                        : { type: "function", name: t.toolName },
                toolWarnings: a,
            };
        default: {
            const d = i;
            throw new ye({ functionality: `tool choice type: ${d}` });
        }
    }
}
function Tf({ value: e, supportsAsyncToolCalling: t, tool: n, toolWarnings: o }) {
    if (e !== !0 || t) return e;
    o.push({
        type: "unsupported-tool",
        tool: n,
        details: "Async tool calling is only supported by GPT-6 and later models.",
    });
}
function kf({ modelCapabilities: e, options: t }) {
    if (!e.supportsConfigurationUpdate) return "reasoningEffortUpdate is only supported by GPT-6 and later models";
    if (t?.reasoningMode === "pro" || t?.truncation === "auto")
        return "reasoningEffortUpdate requires standard reasoning mode without automatic truncation";
}
var If = class {
    constructor(e, t) {
        ((this.specificationVersion = "v2"),
            (this.supportedUrls = { "image/*": [/^https?:\/\/.*$/], "application/pdf": [/^https?:\/\/.*$/] }),
            (this.modelId = e),
            (this.config = t));
    }
    get provider() {
        return this.config.provider;
    }
    async getArgs({
        maxOutputTokens: e,
        temperature: t,
        stopSequences: n,
        topP: o,
        topK: r,
        presencePenalty: a,
        frequencyPenalty: l,
        seed: i,
        prompt: d,
        providerOptions: c,
        tools: p,
        toolChoice: w,
        responseFormat: y,
    }) {
        var k, x, I, S, R, P;
        const O = [],
            C = Ei(this.modelId);
        (r != null && O.push({ type: "unsupported-setting", setting: "topK" }),
            i != null && O.push({ type: "unsupported-setting", setting: "seed" }),
            a != null && O.push({ type: "unsupported-setting", setting: "presencePenalty" }),
            l != null && O.push({ type: "unsupported-setting", setting: "frequencyPenalty" }),
            n != null && O.push({ type: "unsupported-setting", setting: "stopSequences" }));
        const h = await Ie({ provider: "openai", providerOptions: c, schema: _f });
        h?.conversation &&
            h?.previousResponseId &&
            O.push({
                type: "unsupported-setting",
                setting: "conversation",
                details: "conversation and previousResponseId cannot be used together",
            });
        const g = kf({ modelCapabilities: C, options: h }),
            { input: v, warnings: M } = await yf({
                prompt: d,
                configurationUpdateUnsupportedReason: g,
                providerOptionsName: this.config.provider.includes("azure") ? "azure" : "openai",
                systemMessageMode: C.systemMessageMode,
                explicitMessageItemType: this.config.explicitMessageItemType,
                fileIdPrefixes: this.config.fileIdPrefixes,
                store: (k = h?.store) != null ? k : !0,
                hasLocalShellTool: L("openai.local_shell"),
            });
        O.push(...M);
        let _ = h?.reasoningEffort;
        _ != null &&
            C.supportedReasoningEfforts != null &&
            !C.supportedReasoningEfforts.includes(_) &&
            (O.push({
                type: "unsupported-setting",
                setting: "reasoningEffort",
                details: `${this.modelId} only supports the following reasoning efforts: ${C.supportedReasoningEfforts.join(", ")}`,
            }),
            (_ = void 0));
        const E = h?.reasoningEffortUpdate;
        if (E != null && g != null)
            O.push({ type: "unsupported-setting", setting: "reasoningEffortUpdate", details: g });
        else if (E != null) {
            const V = v[0];
            (V?.type !== "configuration_update" || V.reasoning.effort !== E) &&
                v.unshift({ type: "configuration_update", reasoning: { effort: E } });
        }
        for (let V = 1; V < v.length; V++)
            if (v[V - 1].type === "configuration_update" && v[V].type === "configuration_update")
                throw new ye({ functionality: "Adjacent reasoning effort configuration updates" });
        const b = (x = h?.strictJsonSchema) != null ? x : !1;
        let A = h?.include;
        function U(V) {
            A == null ? (A = [V]) : A.includes(V) || (A = [...A, V]);
        }
        function L(V) {
            return p?.find((le) => le.type === "provider-defined" && le.id === V) != null;
        }
        const j = typeof h?.logprobs == "number" ? h?.logprobs : h?.logprobs === !0 ? Pi : void 0;
        j && U("message.output_text.logprobs");
        const B =
            (I = p?.find(
                (V) =>
                    V.type === "provider-defined" &&
                    (V.id === "openai.web_search" || V.id === "openai.web_search_preview"),
            )) == null
                ? void 0
                : I.name;
        (B && U("web_search_call.action.sources"), L("openai.code_interpreter") && U("code_interpreter_call.outputs"));
        const $ = h?.store;
        $ === !1 && C.isReasoningModel && U("reasoning.encrypted_content");
        const H = {
            model: this.modelId,
            input: v,
            temperature: t,
            top_p: o,
            max_output_tokens: e,
            ...((y?.type === "json" || h?.textVerbosity) && {
                text: {
                    ...(y?.type === "json" && {
                        format:
                            y.schema != null
                                ? {
                                      type: "json_schema",
                                      strict: b,
                                      name: (S = y.name) != null ? S : "response",
                                      description: y.description,
                                      schema: y.schema,
                                  }
                                : { type: "json_object" },
                    }),
                    ...(h?.textVerbosity && { verbosity: h.textVerbosity }),
                },
            }),
            conversation: h?.conversation,
            max_tool_calls: h?.maxToolCalls,
            metadata: h?.metadata,
            parallel_tool_calls: h?.parallelToolCalls,
            previous_response_id: h?.previousResponseId,
            store: $,
            user: h?.user,
            instructions: h?.instructions,
            service_tier: h?.serviceTier,
            include: A,
            prompt_cache_key: h?.promptCacheKey,
            prompt_cache_options: h?.promptCacheOptions,
            prompt_cache_retention: h?.promptCacheRetention,
            safety_identifier: h?.safetyIdentifier,
            top_logprobs: j,
            truncation: h?.truncation,
            ...(C.isReasoningModel &&
                (_ != null ||
                    h?.reasoningSummary != null ||
                    h?.reasoningMode != null ||
                    h?.reasoningContext != null) && {
                    reasoning: {
                        ...(_ != null && { effort: _ }),
                        ...(h?.reasoningSummary != null && { summary: h.reasoningSummary }),
                        ...(h?.reasoningMode != null && { mode: h.reasoningMode }),
                        ...(h?.reasoningContext != null && { context: h.reasoningContext }),
                    },
                }),
        };
        if (
            (C.supportsConfigurationUpdate &&
                H.prompt_cache_retention != null &&
                ((H.prompt_cache_retention = void 0),
                O.push({
                    type: "unsupported-setting",
                    setting: "promptCacheRetention",
                    details:
                        "promptCacheRetention is not supported by GPT-6 and later models; use promptCacheOptions instead",
                })),
            C.isReasoningModel)
        ) {
            if (
                !(h?.reasoningEffort === "none" && C.supportsNonReasoningParameters) &&
                (H.temperature != null &&
                    ((H.temperature = void 0),
                    O.push({
                        type: "unsupported-setting",
                        setting: "temperature",
                        details: "temperature is not supported for reasoning models",
                    })),
                H.top_p != null &&
                    ((H.top_p = void 0),
                    O.push({
                        type: "unsupported-setting",
                        setting: "topP",
                        details: "topP is not supported for reasoning models",
                    })),
                C.supportedReasoningEfforts != null &&
                    (H.top_logprobs != null || ((R = H.include) != null && R.includes("message.output_text.logprobs"))))
            ) {
                H.top_logprobs = void 0;
                const V = (P = H.include) == null ? void 0 : P.filter((le) => le !== "message.output_text.logprobs");
                ((H.include = V != null && V.length > 0 ? V : void 0),
                    O.push({
                        type: "unsupported-setting",
                        setting: "logprobs",
                        details: "logprobs is not supported for reasoning models",
                    }));
            }
        } else
            (h?.reasoningEffort != null &&
                O.push({
                    type: "unsupported-setting",
                    setting: "reasoningEffort",
                    details: "reasoningEffort is not supported for non-reasoning models",
                }),
                h?.reasoningSummary != null &&
                    O.push({
                        type: "unsupported-setting",
                        setting: "reasoningSummary",
                        details: "reasoningSummary is not supported for non-reasoning models",
                    }),
                h?.reasoningMode != null &&
                    O.push({
                        type: "unsupported-setting",
                        setting: "reasoningMode",
                        details: "reasoningMode is not supported for non-reasoning models",
                    }),
                h?.reasoningContext != null &&
                    O.push({
                        type: "unsupported-setting",
                        setting: "reasoningContext",
                        details: "reasoningContext is not supported for non-reasoning models",
                    }));
        (h?.serviceTier === "flex" &&
            !C.supportsFlexProcessing &&
            (O.push({
                type: "unsupported-setting",
                setting: "serviceTier",
                details: "flex processing is only available for o3, o4-mini, and gpt-5 models",
            }),
            delete H.service_tier),
            h?.serviceTier === "priority" &&
                !C.supportsPriorityProcessing &&
                (O.push({
                    type: "unsupported-setting",
                    setting: "serviceTier",
                    details:
                        "priority processing is only available for supported models (gpt-4, gpt-5, gpt-5-mini, o3, o4-mini) and requires Enterprise access. gpt-5-nano is not supported",
                }),
                delete H.service_tier));
        const {
            tools: de,
            toolChoice: ee,
            toolWarnings: Q,
        } = await xf({
            tools: p,
            toolChoice: w,
            strictJsonSchema: b,
            supportsAsyncToolCalling: C.supportsAsyncToolCalling,
        });
        return { webSearchToolName: B, args: { ...H, tools: de, tool_choice: ee }, warnings: [...O, ...Q], store: $ };
    }
    async doGenerate(e) {
        var t, n, o, r, a, l, i, d, c, p, w, y, k, x, I, S, R, P, O, C, h, g, v, M, _, E, b, A, U;
        const { args: L, warnings: j, webSearchToolName: B } = await this.getArgs(e),
            $ = this.config.url({ path: "/responses", modelId: this.modelId }),
            H = this.config.provider.replace(".responses", ""),
            {
                responseHeaders: de,
                value: ee,
                rawValue: Q,
            } = await ke({
                url: $,
                headers: Se(this.config.headers(), e.headers),
                body: L,
                failedResponseHandler: rt,
                successfulResponseHandler: Re(wf),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            });
        if (ee.error)
            throw new _e({
                message: ee.error.message,
                url: $,
                requestBodyValues: L,
                statusCode: 400,
                responseHeaders: de,
                responseBody: Q,
                isRetryable: !1,
            });
        const V = [],
            le = [];
        let ce = !1;
        for (const z of ee.output)
            switch (z.type) {
                case "reasoning": {
                    z.summary.length === 0 && z.summary.push({ type: "summary_text", text: "" });
                    for (const D of z.summary)
                        V.push({
                            type: "reasoning",
                            text: D.text,
                            providerMetadata: {
                                [H]: {
                                    itemId: z.id,
                                    reasoningEncryptedContent: (t = z.encrypted_content) != null ? t : null,
                                },
                            },
                        });
                    break;
                }
                case "image_generation_call": {
                    (V.push({
                        type: "tool-call",
                        toolCallId: z.id,
                        toolName: "image_generation",
                        input: "{}",
                        providerExecuted: !0,
                    }),
                        V.push({
                            type: "tool-result",
                            toolCallId: z.id,
                            toolName: "image_generation",
                            result: { result: z.result },
                            providerExecuted: !0,
                        }));
                    break;
                }
                case "local_shell_call": {
                    V.push({
                        type: "tool-call",
                        toolCallId: z.call_id,
                        toolName: "local_shell",
                        input: JSON.stringify({ action: z.action }),
                        providerMetadata: { [H]: { itemId: z.id } },
                    });
                    break;
                }
                case "message": {
                    for (const D of z.content) {
                        ((o = (n = e.providerOptions) == null ? void 0 : n.openai) != null &&
                            o.logprobs &&
                            D.logprobs &&
                            le.push(D.logprobs),
                            V.push({
                                type: "text",
                                text: D.text,
                                providerMetadata: { [H]: { itemId: z.id, ...(z.phase != null && { phase: z.phase }) } },
                            }));
                        for (const F of D.annotations)
                            F.type === "url_citation"
                                ? V.push({
                                      type: "source",
                                      sourceType: "url",
                                      id:
                                          (l = (a = (r = this.config).generateId) == null ? void 0 : a.call(r)) != null
                                              ? l
                                              : Ne(),
                                      url: F.url,
                                      title: F.title,
                                  })
                                : F.type === "file_citation"
                                  ? V.push({
                                        type: "source",
                                        sourceType: "document",
                                        id:
                                            (c = (d = (i = this.config).generateId) == null ? void 0 : d.call(i)) !=
                                            null
                                                ? c
                                                : Ne(),
                                        mediaType: "text/plain",
                                        title: (w = (p = F.quote) != null ? p : F.filename) != null ? w : "Document",
                                        filename: (y = F.filename) != null ? y : F.file_id,
                                        ...(F.file_id ? { providerMetadata: { [H]: { fileId: F.file_id } } } : {}),
                                    })
                                  : F.type === "container_file_citation"
                                    ? V.push({
                                          type: "source",
                                          sourceType: "document",
                                          id:
                                              (I = (x = (k = this.config).generateId) == null ? void 0 : x.call(k)) !=
                                              null
                                                  ? I
                                                  : Ne(),
                                          mediaType: "text/plain",
                                          title:
                                              (R = (S = F.filename) != null ? S : F.file_id) != null ? R : "Document",
                                          filename: (P = F.filename) != null ? P : F.file_id,
                                          providerMetadata: {
                                              [H]: {
                                                  fileId: F.file_id,
                                                  containerId: F.container_id,
                                                  ...(F.index != null ? { index: F.index } : {}),
                                              },
                                          },
                                      })
                                    : F.type === "file_path" &&
                                      V.push({
                                          type: "source",
                                          sourceType: "document",
                                          id:
                                              (h = (C = (O = this.config).generateId) == null ? void 0 : C.call(O)) !=
                                              null
                                                  ? h
                                                  : Ne(),
                                          mediaType: "application/octet-stream",
                                          title: F.file_id,
                                          filename: F.file_id,
                                          providerMetadata: {
                                              [H]: {
                                                  fileId: F.file_id,
                                                  ...(F.index != null ? { index: F.index } : {}),
                                              },
                                          },
                                      });
                    }
                    break;
                }
                case "function_call": {
                    ((ce = !0),
                        V.push({
                            type: "tool-call",
                            toolCallId: z.call_id,
                            toolName: z.name,
                            input: z.arguments,
                            providerMetadata: { [H]: { itemId: z.id, ...(z.async != null && { async: z.async }) } },
                        }));
                    break;
                }
                case "web_search_call": {
                    (V.push({
                        type: "tool-call",
                        toolCallId: z.id,
                        toolName: B ?? "web_search",
                        input: JSON.stringify({}),
                        providerExecuted: !0,
                    }),
                        V.push({
                            type: "tool-result",
                            toolCallId: z.id,
                            toolName: B ?? "web_search",
                            result: Sa(z.action),
                            providerExecuted: !0,
                        }));
                    break;
                }
                case "computer_call": {
                    (V.push({
                        type: "tool-call",
                        toolCallId: z.id,
                        toolName: "computer_use",
                        input: "",
                        providerExecuted: !0,
                    }),
                        V.push({
                            type: "tool-result",
                            toolCallId: z.id,
                            toolName: "computer_use",
                            result: { type: "computer_use_tool_result", status: z.status || "completed" },
                            providerExecuted: !0,
                        }));
                    break;
                }
                case "file_search_call": {
                    (V.push({
                        type: "tool-call",
                        toolCallId: z.id,
                        toolName: "file_search",
                        input: "{}",
                        providerExecuted: !0,
                    }),
                        V.push({
                            type: "tool-result",
                            toolCallId: z.id,
                            toolName: "file_search",
                            result: {
                                queries: z.queries,
                                results:
                                    (v =
                                        (g = z.results) == null
                                            ? void 0
                                            : g.map((D) => ({
                                                  attributes: D.attributes,
                                                  fileId: D.file_id,
                                                  filename: D.filename,
                                                  score: D.score,
                                                  text: D.text,
                                              }))) != null
                                        ? v
                                        : null,
                            },
                            providerExecuted: !0,
                        }));
                    break;
                }
                case "code_interpreter_call": {
                    (V.push({
                        type: "tool-call",
                        toolCallId: z.id,
                        toolName: "code_interpreter",
                        input: JSON.stringify({ code: z.code, containerId: z.container_id }),
                        providerExecuted: !0,
                    }),
                        V.push({
                            type: "tool-result",
                            toolCallId: z.id,
                            toolName: "code_interpreter",
                            result: { outputs: z.outputs },
                            providerExecuted: !0,
                        }));
                    break;
                }
            }
        const pe = { [H]: { ...(ee.id != null ? { responseId: ee.id } : {}) } };
        (le.length > 0 && (pe[H].logprobs = le),
            typeof ee.service_tier == "string" && (pe[H].serviceTier = ee.service_tier),
            ((M = ee.reasoning) == null ? void 0 : M.context) != null &&
                (pe[H].reasoningContext = ee.reasoning.context));
        const he = ee.usage,
            re = Ca(he);
        return (
            re != null && (pe[H].usage = re),
            {
                content: V,
                finishReason: ka({
                    finishReason: (_ = ee.incomplete_details) == null ? void 0 : _.reason,
                    hasFunctionCall: ce,
                }),
                usage: {
                    inputTokens: he.input_tokens,
                    outputTokens: he.output_tokens,
                    totalTokens: he.input_tokens + he.output_tokens,
                    reasoningTokens:
                        (b = (E = he.output_tokens_details) == null ? void 0 : E.reasoning_tokens) != null ? b : void 0,
                    cachedInputTokens:
                        (U = (A = he.input_tokens_details) == null ? void 0 : A.cached_tokens) != null ? U : void 0,
                },
                request: { body: L },
                response: {
                    id: ee.id,
                    timestamp: new Date(ee.created_at * 1e3),
                    modelId: ee.model,
                    headers: de,
                    body: Q,
                },
                providerMetadata: pe,
                warnings: j,
            }
        );
    }
    async doStream(e) {
        const { args: t, warnings: n, webSearchToolName: o, store: r } = await this.getArgs(e),
            { responseHeaders: a, value: l } = await ke({
                url: this.config.url({ path: "/responses", modelId: this.modelId }),
                headers: Se(this.config.headers(), e.headers),
                body: { ...t, stream: !0 },
                failedResponseHandler: rt,
                successfulResponseHandler: Pt(bf),
                abortSignal: e.abortSignal,
                fetch: this.config.fetch,
            }),
            i = this,
            d = this.config.provider.replace(".responses", "");
        let c = "unknown";
        const p = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
            w = [];
        let y = null;
        const k = {},
            x = [];
        let I,
            S = !1;
        const R = {};
        let P, O, C;
        return {
            stream: l.pipeThrough(
                new TransformStream({
                    start(h) {
                        h.enqueue({ type: "stream-start", warnings: n });
                    },
                    transform(h, g) {
                        var v, M, _, E, b, A, U, L, j, B, $, H, de, ee, Q, V, le, ce, pe, he, re, z, D, F, q;
                        if ((e.includeRawChunks && g.enqueue({ type: "raw", rawValue: h.rawValue }), !h.success)) {
                            ((c = "error"), g.enqueue({ type: "error", error: h.error }));
                            return;
                        }
                        const T = h.value;
                        if (Ia(T))
                            T.item.type === "function_call"
                                ? ((k[T.output_index] = {
                                      toolName: T.item.name,
                                      toolCallId: T.item.call_id,
                                      async: T.item.async,
                                  }),
                                  g.enqueue({ type: "tool-input-start", id: T.item.call_id, toolName: T.item.name }))
                                : T.item.type === "web_search_call"
                                  ? ((k[T.output_index] = { toolName: o ?? "web_search", toolCallId: T.item.id }),
                                    g.enqueue({
                                        type: "tool-input-start",
                                        id: T.item.id,
                                        toolName: o ?? "web_search",
                                        providerExecuted: !0,
                                    }),
                                    g.enqueue({ type: "tool-input-end", id: T.item.id }),
                                    g.enqueue({
                                        type: "tool-call",
                                        toolCallId: T.item.id,
                                        toolName: o ?? "web_search",
                                        input: JSON.stringify({}),
                                        providerExecuted: !0,
                                    }))
                                  : T.item.type === "computer_call"
                                    ? ((k[T.output_index] = { toolName: "computer_use", toolCallId: T.item.id }),
                                      g.enqueue({
                                          type: "tool-input-start",
                                          id: T.item.id,
                                          toolName: "computer_use",
                                          providerExecuted: !0,
                                      }))
                                    : T.item.type === "code_interpreter_call"
                                      ? ((k[T.output_index] = {
                                            toolName: "code_interpreter",
                                            toolCallId: T.item.id,
                                            codeInterpreter: { containerId: T.item.container_id },
                                        }),
                                        g.enqueue({
                                            type: "tool-input-start",
                                            id: T.item.id,
                                            toolName: "code_interpreter",
                                            providerExecuted: !0,
                                        }),
                                        g.enqueue({
                                            type: "tool-input-delta",
                                            id: T.item.id,
                                            delta: `{"containerId":"${T.item.container_id}","code":"`,
                                        }))
                                      : T.item.type === "file_search_call"
                                        ? g.enqueue({
                                              type: "tool-call",
                                              toolCallId: T.item.id,
                                              toolName: "file_search",
                                              input: "{}",
                                              providerExecuted: !0,
                                          })
                                        : T.item.type === "image_generation_call"
                                          ? g.enqueue({
                                                type: "tool-call",
                                                toolCallId: T.item.id,
                                                toolName: "image_generation",
                                                input: "{}",
                                                providerExecuted: !0,
                                            })
                                          : T.item.type === "message"
                                            ? (x.splice(0),
                                              (I = (v = T.item.phase) != null ? v : void 0),
                                              g.enqueue({
                                                  type: "text-start",
                                                  id: T.item.id,
                                                  providerMetadata: {
                                                      [d]: {
                                                          itemId: T.item.id,
                                                          ...(T.item.phase != null && { phase: T.item.phase }),
                                                      },
                                                  },
                                              }))
                                            : Ia(T) &&
                                              T.item.type === "reasoning" &&
                                              ((R[T.item.id] = {
                                                  encryptedContent: T.item.encrypted_content,
                                                  summaryParts: { 0: "active" },
                                              }),
                                              g.enqueue({
                                                  type: "reasoning-start",
                                                  id: `${T.item.id}:0`,
                                                  providerMetadata: {
                                                      [d]: {
                                                          itemId: T.item.id,
                                                          reasoningEncryptedContent:
                                                              (M = T.item.encrypted_content) != null ? M : null,
                                                      },
                                                  },
                                              }));
                        else if (Cf(T)) {
                            if (T.item.type === "message") {
                                const Y = (_ = T.item.phase) != null ? _ : I;
                                ((I = void 0),
                                    g.enqueue({
                                        type: "text-end",
                                        id: T.item.id,
                                        providerMetadata: {
                                            [d]: {
                                                itemId: T.item.id,
                                                ...(Y != null && { phase: Y }),
                                                ...(x.length > 0 && { annotations: x }),
                                            },
                                        },
                                    }));
                            } else if (T.item.type === "function_call") {
                                const Y = k[T.output_index];
                                ((k[T.output_index] = void 0),
                                    (S = !0),
                                    g.enqueue({ type: "tool-input-end", id: T.item.call_id }),
                                    g.enqueue({
                                        type: "tool-call",
                                        toolCallId: T.item.call_id,
                                        toolName: T.item.name,
                                        input: T.item.arguments,
                                        providerMetadata: {
                                            [d]: {
                                                itemId: T.item.id,
                                                ...(T.item.async != null
                                                    ? { async: T.item.async }
                                                    : Y?.async != null
                                                      ? { async: Y.async }
                                                      : {}),
                                            },
                                        },
                                    }));
                            } else if (T.item.type === "web_search_call")
                                ((k[T.output_index] = void 0),
                                    g.enqueue({
                                        type: "tool-result",
                                        toolCallId: T.item.id,
                                        toolName: o ?? "web_search",
                                        result: Sa(T.item.action),
                                        providerExecuted: !0,
                                    }));
                            else if (T.item.type === "computer_call")
                                ((k[T.output_index] = void 0),
                                    g.enqueue({ type: "tool-input-end", id: T.item.id }),
                                    g.enqueue({
                                        type: "tool-call",
                                        toolCallId: T.item.id,
                                        toolName: "computer_use",
                                        input: "",
                                        providerExecuted: !0,
                                    }),
                                    g.enqueue({
                                        type: "tool-result",
                                        toolCallId: T.item.id,
                                        toolName: "computer_use",
                                        result: {
                                            type: "computer_use_tool_result",
                                            status: T.item.status || "completed",
                                        },
                                        providerExecuted: !0,
                                    }));
                            else if (T.item.type === "file_search_call")
                                ((k[T.output_index] = void 0),
                                    g.enqueue({
                                        type: "tool-result",
                                        toolCallId: T.item.id,
                                        toolName: "file_search",
                                        result: {
                                            queries: T.item.queries,
                                            results:
                                                (b =
                                                    (E = T.item.results) == null
                                                        ? void 0
                                                        : E.map((Y) => ({
                                                              attributes: Y.attributes,
                                                              fileId: Y.file_id,
                                                              filename: Y.filename,
                                                              score: Y.score,
                                                              text: Y.text,
                                                          }))) != null
                                                    ? b
                                                    : null,
                                        },
                                        providerExecuted: !0,
                                    }));
                            else if (T.item.type === "code_interpreter_call")
                                ((k[T.output_index] = void 0),
                                    g.enqueue({
                                        type: "tool-result",
                                        toolCallId: T.item.id,
                                        toolName: "code_interpreter",
                                        result: { outputs: T.item.outputs },
                                        providerExecuted: !0,
                                    }));
                            else if (T.item.type === "image_generation_call")
                                g.enqueue({
                                    type: "tool-result",
                                    toolCallId: T.item.id,
                                    toolName: "image_generation",
                                    result: { result: T.item.result },
                                    providerExecuted: !0,
                                });
                            else if (T.item.type === "local_shell_call")
                                ((k[T.output_index] = void 0),
                                    g.enqueue({
                                        type: "tool-call",
                                        toolCallId: T.item.call_id,
                                        toolName: "local_shell",
                                        input: JSON.stringify({
                                            action: {
                                                type: "exec",
                                                command: T.item.action.command,
                                                timeoutMs: T.item.action.timeout_ms,
                                                user: T.item.action.user,
                                                workingDirectory: T.item.action.working_directory,
                                                env: T.item.action.env,
                                            },
                                        }),
                                        providerMetadata: { [d]: { itemId: T.item.id } },
                                    }));
                            else if (T.item.type === "reasoning") {
                                const Y = R[T.item.id],
                                    xe = Object.entries(Y.summaryParts)
                                        .filter(([W, ue]) => ue === "active" || ue === "can-conclude")
                                        .map(([W]) => W);
                                for (const W of xe)
                                    g.enqueue({
                                        type: "reasoning-end",
                                        id: `${T.item.id}:${W}`,
                                        providerMetadata: {
                                            [d]: {
                                                itemId: T.item.id,
                                                reasoningEncryptedContent:
                                                    (A = T.item.encrypted_content) != null ? A : null,
                                            },
                                        },
                                    });
                                delete R[T.item.id];
                            }
                        } else if (Of(T)) {
                            const Y = k[T.output_index];
                            Y != null && g.enqueue({ type: "tool-input-delta", id: Y.toolCallId, delta: T.delta });
                        } else if (Af(T)) {
                            const Y = k[T.output_index];
                            Y != null &&
                                g.enqueue({
                                    type: "tool-input-delta",
                                    id: Y.toolCallId,
                                    delta: JSON.stringify(T.delta).slice(1, -1),
                                });
                        } else if (Mf(T)) {
                            const Y = k[T.output_index];
                            Y != null &&
                                (g.enqueue({ type: "tool-input-delta", id: Y.toolCallId, delta: '"}' }),
                                g.enqueue({ type: "tool-input-end", id: Y.toolCallId }),
                                g.enqueue({
                                    type: "tool-call",
                                    toolCallId: Y.toolCallId,
                                    toolName: "code_interpreter",
                                    input: JSON.stringify({ code: T.code, containerId: Y.codeInterpreter.containerId }),
                                    providerExecuted: !0,
                                }));
                        } else if (Rf(T))
                            ((y = T.response.id),
                                g.enqueue({
                                    type: "response-metadata",
                                    id: T.response.id,
                                    timestamp: new Date(T.response.created_at * 1e3),
                                    modelId: T.response.model,
                                }));
                        else if (Sf(T))
                            (g.enqueue({ type: "text-delta", id: T.item_id, delta: T.delta }),
                                (L = (U = e.providerOptions) == null ? void 0 : U.openai) != null &&
                                    L.logprobs &&
                                    T.logprobs &&
                                    w.push(T.logprobs));
                        else if (T.type === "response.reasoning_summary_part.added") {
                            if (T.summary_index > 0) {
                                const Y = R[T.item_id];
                                Y.summaryParts[T.summary_index] = "active";
                                for (const xe of Object.keys(Y.summaryParts))
                                    Y.summaryParts[xe] === "can-conclude" &&
                                        (g.enqueue({
                                            type: "reasoning-end",
                                            id: `${T.item_id}:${xe}`,
                                            providerMetadata: { [d]: { itemId: T.item_id } },
                                        }),
                                        (Y.summaryParts[xe] = "concluded"));
                                g.enqueue({
                                    type: "reasoning-start",
                                    id: `${T.item_id}:${T.summary_index}`,
                                    providerMetadata: {
                                        [d]: {
                                            itemId: T.item_id,
                                            reasoningEncryptedContent:
                                                (B = (j = R[T.item_id]) == null ? void 0 : j.encryptedContent) != null
                                                    ? B
                                                    : null,
                                        },
                                    },
                                });
                            }
                        } else
                            T.type === "response.reasoning_summary_text.delta"
                                ? g.enqueue({
                                      type: "reasoning-delta",
                                      id: `${T.item_id}:${T.summary_index}`,
                                      delta: T.delta,
                                      providerMetadata: { [d]: { itemId: T.item_id } },
                                  })
                                : T.type === "response.reasoning_summary_part.done"
                                  ? r
                                      ? (g.enqueue({
                                            type: "reasoning-end",
                                            id: `${T.item_id}:${T.summary_index}`,
                                            providerMetadata: { [d]: { itemId: T.item_id } },
                                        }),
                                        (R[T.item_id].summaryParts[T.summary_index] = "concluded"))
                                      : (R[T.item_id].summaryParts[T.summary_index] = "can-conclude")
                                  : Ef(T)
                                    ? ((c = ka({
                                          finishReason: ($ = T.response.incomplete_details) == null ? void 0 : $.reason,
                                          hasFunctionCall: S,
                                      })),
                                      (p.inputTokens = T.response.usage.input_tokens),
                                      (p.outputTokens = T.response.usage.output_tokens),
                                      (p.totalTokens = T.response.usage.input_tokens + T.response.usage.output_tokens),
                                      (p.reasoningTokens =
                                          (de =
                                              (H = T.response.usage.output_tokens_details) == null
                                                  ? void 0
                                                  : H.reasoning_tokens) != null
                                              ? de
                                              : void 0),
                                      (p.cachedInputTokens =
                                          (Q =
                                              (ee = T.response.usage.input_tokens_details) == null
                                                  ? void 0
                                                  : ee.cached_tokens) != null
                                              ? Q
                                              : void 0),
                                      typeof T.response.service_tier == "string" && (P = T.response.service_tier),
                                      ((V = T.response.reasoning) == null ? void 0 : V.context) != null &&
                                          (O = T.response.reasoning.context),
                                      (C = Ca(T.response.usage)))
                                    : Nf(T)
                                      ? (x.push(T.annotation),
                                        T.annotation.type === "url_citation"
                                            ? g.enqueue({
                                                  type: "source",
                                                  sourceType: "url",
                                                  id:
                                                      (pe =
                                                          (ce = (le = i.config).generateId) == null
                                                              ? void 0
                                                              : ce.call(le)) != null
                                                          ? pe
                                                          : Ne(),
                                                  url: T.annotation.url,
                                                  title: T.annotation.title,
                                              })
                                            : T.annotation.type === "file_citation" &&
                                              g.enqueue({
                                                  type: "source",
                                                  sourceType: "document",
                                                  id:
                                                      (z =
                                                          (re = (he = i.config).generateId) == null
                                                              ? void 0
                                                              : re.call(he)) != null
                                                          ? z
                                                          : Ne(),
                                                  mediaType: "text/plain",
                                                  title:
                                                      (F =
                                                          (D = T.annotation.quote) != null
                                                              ? D
                                                              : T.annotation.filename) != null
                                                          ? F
                                                          : "Document",
                                                  filename:
                                                      (q = T.annotation.filename) != null ? q : T.annotation.file_id,
                                                  ...(T.annotation.file_id
                                                      ? { providerMetadata: { [d]: { fileId: T.annotation.file_id } } }
                                                      : {}),
                                              }))
                                      : Pf(T) && g.enqueue({ type: "error", error: T });
                    },
                    flush(h) {
                        const g = { [d]: { responseId: y } };
                        (w.length > 0 && (g[d].logprobs = w),
                            P !== void 0 && (g[d].serviceTier = P),
                            O !== void 0 && (g[d].reasoningContext = O),
                            C != null && (g[d].usage = C),
                            h.enqueue({ type: "finish", finishReason: c, usage: p, providerMetadata: g }));
                    },
                }),
            ),
            request: { body: t },
            response: { headers: a },
        };
    }
};
function Sf(e) {
    return e.type === "response.output_text.delta";
}
function Cf(e) {
    return e.type === "response.output_item.done";
}
function Ef(e) {
    return e.type === "response.completed" || e.type === "response.incomplete";
}
function Rf(e) {
    return e.type === "response.created";
}
function Of(e) {
    return e.type === "response.function_call_arguments.delta";
}
function Af(e) {
    return e.type === "response.code_interpreter_call_code.delta";
}
function Mf(e) {
    return e.type === "response.code_interpreter_call_code.done";
}
function Ia(e) {
    return e.type === "response.output_item.added";
}
function Nf(e) {
    return e.type === "response.output_text.annotation.added";
}
function Pf(e) {
    return e.type === "error";
}
function Sa(e) {
    var t;
    if (e == null) return {};
    switch (e.type) {
        case "search":
            return {
                action: { type: "search", query: (t = e.query) != null ? t : void 0 },
                ...(e.sources != null && { sources: e.sources }),
            };
        case "open_page":
            return { action: { type: "openPage", url: e.url } };
        case "find_in_page":
            return { action: { type: "findInPage", url: e.url, pattern: e.pattern } };
    }
}
function Ca(e) {
    var t, n, o, r;
    const a = (t = e?.input_tokens_details) == null ? void 0 : t.cache_write_tokens,
        l = (n = e?.input_tokens_details) == null ? void 0 : n.orchestration_input_tokens,
        i = (o = e?.input_tokens_details) == null ? void 0 : o.orchestration_input_cached_tokens,
        d = (r = e?.output_tokens_details) == null ? void 0 : r.orchestration_output_tokens;
    if (!(a == null && l == null && i == null && d == null))
        return {
            ...(a != null && { cacheWriteTokens: a }),
            ...(l != null && { orchestrationInputTokens: l }),
            ...(i != null && { orchestrationInputCachedTokens: i }),
            ...(d != null && { orchestrationOutputTokens: d }),
        };
}
var $f = ve(() => G(u({ instructions: s().nullish(), speed: f().min(0.25).max(4).default(1).nullish() }))),
    Df = class {
        constructor(e, t) {
            ((this.modelId = e), (this.config = t), (this.specificationVersion = "v2"));
        }
        get provider() {
            return this.config.provider;
        }
        async getArgs({
            text: e,
            voice: t = "alloy",
            outputFormat: n = "mp3",
            speed: o,
            instructions: r,
            language: a,
            providerOptions: l,
        }) {
            const i = [],
                d = await Ie({ provider: "openai", providerOptions: l, schema: $f }),
                c = { model: this.modelId, input: e, voice: t, response_format: "mp3", speed: o, instructions: r };
            if (
                (n &&
                    (["mp3", "opus", "aac", "flac", "wav", "pcm"].includes(n)
                        ? (c.response_format = n)
                        : i.push({
                              type: "unsupported-setting",
                              setting: "outputFormat",
                              details: `Unsupported output format: ${n}. Using mp3 instead.`,
                          })),
                d)
            ) {
                const p = {};
                for (const w in p) {
                    const y = p[w];
                    y !== void 0 && (c[w] = y);
                }
            }
            return (
                a &&
                    i.push({
                        type: "unsupported-setting",
                        setting: "language",
                        details: `OpenAI speech models do not support language selection. Language parameter "${a}" was ignored.`,
                    }),
                { requestBody: c, warnings: i }
            );
        }
        async doGenerate(e) {
            var t, n, o;
            const r =
                    (o =
                        (n = (t = this.config._internal) == null ? void 0 : t.currentDate) == null
                            ? void 0
                            : n.call(t)) != null
                        ? o
                        : new Date(),
                { requestBody: a, warnings: l } = await this.getArgs(e),
                {
                    value: i,
                    responseHeaders: d,
                    rawValue: c,
                } = await ke({
                    url: this.config.url({ path: "/audio/speech", modelId: this.modelId }),
                    headers: Se(this.config.headers(), e.headers),
                    body: a,
                    failedResponseHandler: rt,
                    successfulResponseHandler: bu(),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                });
            return {
                audio: i,
                warnings: l,
                request: { body: JSON.stringify(a) },
                response: { timestamp: r, modelId: this.modelId, headers: d, body: c },
            };
        }
    },
    qf = ve(() =>
        G(
            u({
                text: s(),
                language: s().nullish(),
                duration: f().nullish(),
                words: N(u({ word: s(), start: f(), end: f() })).nullish(),
                segments: N(
                    u({
                        id: f(),
                        seek: f(),
                        start: f(),
                        end: f(),
                        text: s(),
                        tokens: N(f()),
                        temperature: f(),
                        avg_logprob: f(),
                        compression_ratio: f(),
                        no_speech_prob: f(),
                    }),
                ).nullish(),
            }),
        ),
    ),
    Uf = ve(() =>
        G(
            u({
                include: N(s()).optional(),
                language: s().optional(),
                prompt: s().optional(),
                temperature: f().min(0).max(1).default(0).optional(),
                timestampGranularities: N(J(["word", "segment"]))
                    .default(["segment"])
                    .optional(),
            }),
        ),
    ),
    Ea = {
        afrikaans: "af",
        arabic: "ar",
        armenian: "hy",
        azerbaijani: "az",
        belarusian: "be",
        bosnian: "bs",
        bulgarian: "bg",
        catalan: "ca",
        chinese: "zh",
        croatian: "hr",
        czech: "cs",
        danish: "da",
        dutch: "nl",
        english: "en",
        estonian: "et",
        finnish: "fi",
        french: "fr",
        galician: "gl",
        german: "de",
        greek: "el",
        hebrew: "he",
        hindi: "hi",
        hungarian: "hu",
        icelandic: "is",
        indonesian: "id",
        italian: "it",
        japanese: "ja",
        kannada: "kn",
        kazakh: "kk",
        korean: "ko",
        latvian: "lv",
        lithuanian: "lt",
        macedonian: "mk",
        malay: "ms",
        marathi: "mr",
        maori: "mi",
        nepali: "ne",
        norwegian: "no",
        persian: "fa",
        polish: "pl",
        portuguese: "pt",
        romanian: "ro",
        russian: "ru",
        serbian: "sr",
        slovak: "sk",
        slovenian: "sl",
        spanish: "es",
        swahili: "sw",
        swedish: "sv",
        tagalog: "tl",
        tamil: "ta",
        thai: "th",
        turkish: "tr",
        ukrainian: "uk",
        urdu: "ur",
        vietnamese: "vi",
        welsh: "cy",
    },
    Lf = class {
        constructor(e, t) {
            ((this.modelId = e), (this.config = t), (this.specificationVersion = "v2"));
        }
        get provider() {
            return this.config.provider;
        }
        async getArgs({ audio: e, mediaType: t, providerOptions: n }) {
            const o = [],
                r = await Ie({ provider: "openai", providerOptions: n, schema: Uf }),
                a = new FormData(),
                l = e instanceof Uint8Array ? new Blob([e]) : new Blob([ro(e)]);
            a.append("model", this.modelId);
            const i = iu(t);
            if ((a.append("file", new File([l], "audio", { type: t }), `audio.${i}`), r)) {
                const d = {
                    include: r.include,
                    language: r.language,
                    prompt: r.prompt,
                    response_format: ["gpt-4o-transcribe", "gpt-4o-mini-transcribe"].includes(this.modelId)
                        ? "json"
                        : "verbose_json",
                    temperature: r.temperature,
                    timestamp_granularities: r.timestampGranularities,
                };
                for (const [c, p] of Object.entries(d))
                    if (p != null)
                        if (Array.isArray(p)) for (const w of p) a.append(`${c}[]`, String(w));
                        else a.append(c, String(p));
            }
            return { formData: a, warnings: o };
        }
        async doGenerate(e) {
            var t, n, o, r, a, l, i, d;
            const c =
                    (o =
                        (n = (t = this.config._internal) == null ? void 0 : t.currentDate) == null
                            ? void 0
                            : n.call(t)) != null
                        ? o
                        : new Date(),
                { formData: p, warnings: w } = await this.getArgs(e),
                {
                    value: y,
                    responseHeaders: k,
                    rawValue: x,
                } = await _u({
                    url: this.config.url({ path: "/audio/transcriptions", modelId: this.modelId }),
                    headers: Se(this.config.headers(), e.headers),
                    formData: p,
                    failedResponseHandler: rt,
                    successfulResponseHandler: Re(qf),
                    abortSignal: e.abortSignal,
                    fetch: this.config.fetch,
                }),
                I = y.language != null && y.language in Ea ? Ea[y.language] : void 0;
            return {
                text: y.text,
                segments:
                    (i =
                        (l =
                            (r = y.segments) == null
                                ? void 0
                                : r.map((S) => ({ text: S.text, startSecond: S.start, endSecond: S.end }))) != null
                            ? l
                            : (a = y.words) == null
                              ? void 0
                              : a.map((S) => ({ text: S.word, startSecond: S.start, endSecond: S.end }))) != null
                        ? i
                        : [],
                language: I,
                durationInSeconds: (d = y.duration) != null ? d : void 0,
                warnings: w,
                response: { timestamp: c, modelId: this.modelId, headers: k, body: x },
            };
        }
    },
    jf = "2.0.133";
function $i(e = {}) {
    var t, n;
    const o =
            (t = bn(xt({ settingValue: e.baseURL, environmentVariableName: "OPENAI_BASE_URL" }))) != null
                ? t
                : "https://api.openai.com/v1",
        r = (n = e.name) != null ? n : "openai",
        a = () =>
            vt(
                {
                    Authorization: `Bearer ${oo({ apiKey: e.apiKey, environmentVariableName: "OPENAI_API_KEY", description: "OpenAI" })}`,
                    "OpenAI-Organization": e.organization,
                    "OpenAI-Project": e.project,
                    ...e.headers,
                },
                `ai-sdk/openai/${jf}`,
            ),
        l = (I) => new Rp(I, { provider: `${r}.chat`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        i = (I) =>
            new Np(I, { provider: `${r}.completion`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        d = (I) =>
            new Dp(I, { provider: `${r}.embedding`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        c = (I) => new Hp(I, { provider: `${r}.image`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        p = (I) =>
            new Lf(I, { provider: `${r}.transcription`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        w = (I) => new Df(I, { provider: `${r}.speech`, url: ({ path: S }) => `${o}${S}`, headers: a, fetch: e.fetch }),
        y = (I) => {
            if (new.target) throw new Error("The OpenAI model function cannot be called with the new keyword.");
            return k(I);
        },
        k = (I) =>
            new If(I, {
                provider: `${r}.responses`,
                url: ({ path: S }) => `${o}${S}`,
                headers: a,
                fetch: e.fetch,
                fileIdPrefixes: ["file-"],
            }),
        x = function (I) {
            return y(I);
        };
    return (
        (x.languageModel = y),
        (x.chat = l),
        (x.completion = i),
        (x.responses = k),
        (x.embedding = d),
        (x.textEmbedding = d),
        (x.textEmbeddingModel = d),
        (x.image = c),
        (x.imageModel = c),
        (x.transcription = p),
        (x.transcriptionModel = p),
        (x.speech = w),
        (x.speechModel = w),
        (x.tools = gf),
        x
    );
}
$i();
var Pn, Ra;
function Bf() {
    if (Ra) return Pn;
    Ra = 1;
    var e = Object.defineProperty,
        t = Object.getOwnPropertyDescriptor,
        n = Object.getOwnPropertyNames,
        o = Object.prototype.hasOwnProperty,
        r = (p, w) => {
            for (var y in w) e(p, y, { get: w[y], enumerable: !0 });
        },
        a = (p, w, y, k) => {
            if ((w && typeof w == "object") || typeof w == "function")
                for (let x of n(w))
                    !o.call(p, x) &&
                        x !== y &&
                        e(p, x, { get: () => w[x], enumerable: !(k = t(w, x)) || k.enumerable });
            return p;
        },
        l = (p) => a(e({}, "__esModule", { value: !0 }), p),
        i = {};
    (r(i, { SYMBOL_FOR_REQ_CONTEXT: () => d, getContext: () => c }), (Pn = l(i)));
    const d = Symbol.for("@vercel/request-context");
    function c() {
        return globalThis[d]?.get?.() ?? {};
    }
    return Pn;
}
var $n, Oa;
function Gf() {
    if (Oa) return $n;
    Oa = 1;
    var e = Object.defineProperty,
        t = Object.getOwnPropertyDescriptor,
        n = Object.getOwnPropertyNames,
        o = Object.prototype.hasOwnProperty,
        r = (w, y) => {
            for (var k in y) e(w, k, { get: y[k], enumerable: !0 });
        },
        a = (w, y, k, x) => {
            if ((y && typeof y == "object") || typeof y == "function")
                for (let I of n(y))
                    !o.call(w, I) &&
                        I !== k &&
                        e(w, I, { get: () => y[I], enumerable: !(x = t(y, I)) || x.enumerable });
            return w;
        },
        l = (w) => a(e({}, "__esModule", { value: !0 }), w),
        i = {};
    (r(i, { getContext: () => d.getContext, getVercelOidcToken: () => c, getVercelOidcTokenSync: () => p }),
        ($n = l(i)));
    var d = Bf();
    async function c() {
        return "";
    }
    function p() {
        return "";
    }
    return $n;
}
var Di = Gf(),
    Ff = "vercel.ai.gateway.error",
    Dn = Symbol.for(Ff),
    Aa,
    Ma,
    Oe = class qi extends ((Ma = Error), (Aa = Dn), Ma) {
        constructor({
            message: t,
            statusCode: n = 500,
            cause: o,
            isRetryable: r = n != null && (n === 408 || n === 409 || n === 429 || n >= 500),
        }) {
            (super(t), (this[Aa] = !0), (this.statusCode = n), (this.cause = o), (this.isRetryable = r));
        }
        static isInstance(t) {
            return qi.hasMarker(t);
        }
        static hasMarker(t) {
            return typeof t == "object" && t !== null && Dn in t && t[Dn] === !0;
        }
    },
    Ui = "GatewayAuthenticationError",
    Hf = `vercel.ai.gateway.error.${Ui}`,
    Na = Symbol.for(Hf),
    Pa,
    $a,
    lo = class Li extends (($a = Oe), (Pa = Na), $a) {
        constructor({ message: t = "Authentication failed", statusCode: n = 401, cause: o } = {}) {
            (super({ message: t, statusCode: n, cause: o }),
                (this[Pa] = !0),
                (this.name = Ui),
                (this.type = "authentication_error"));
        }
        static isInstance(t) {
            return Oe.hasMarker(t) && Na in t;
        }
        static createContextualError({
            apiKeyProvided: t,
            oidcTokenProvided: n,
            message: o = "Authentication failed",
            statusCode: r = 401,
            cause: a,
        }) {
            let l;
            return (
                t
                    ? (l = `AI Gateway authentication failed: Invalid API key.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`)
                    : n
                      ? (l = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys`)
                      : (l = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`),
                new Li({ message: l, statusCode: r, cause: a })
            );
        }
    },
    ji = "GatewayForbiddenError",
    Vf = `vercel.ai.gateway.error.${ji}`,
    Da = Symbol.for(Vf),
    Jf = ve(() => G(u({ ruleId: s() }))),
    qa,
    Ua,
    Wf = class extends ((Ua = Oe), (qa = Da), Ua) {
        constructor({ message: e = "Forbidden", statusCode: t = 403, cause: n, ruleId: o } = {}) {
            (super({ message: e, statusCode: t, cause: n }),
                (this[qa] = !0),
                (this.name = ji),
                (this.type = "forbidden"),
                (this.ruleId = o));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && Da in e;
        }
    },
    Bi = "GatewayInvalidRequestError",
    Zf = `vercel.ai.gateway.error.${Bi}`,
    La = Symbol.for(Zf),
    ja,
    Ba,
    zf = class extends ((Ba = Oe), (ja = La), Ba) {
        constructor({ message: e = "Invalid request", statusCode: t = 400, cause: n } = {}) {
            (super({ message: e, statusCode: t, cause: n }),
                (this[ja] = !0),
                (this.name = Bi),
                (this.type = "invalid_request_error"));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && La in e;
        }
    },
    Gi = "GatewayRateLimitError",
    Kf = `vercel.ai.gateway.error.${Gi}`,
    Ga = Symbol.for(Kf),
    Fa,
    Ha,
    Yf = class extends ((Ha = Oe), (Fa = Ga), Ha) {
        constructor({ message: e = "Rate limit exceeded", statusCode: t = 429, cause: n } = {}) {
            (super({ message: e, statusCode: t, cause: n }),
                (this[Fa] = !0),
                (this.name = Gi),
                (this.type = "rate_limit_exceeded"));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && Ga in e;
        }
    },
    Fi = "GatewayModelNotFoundError",
    Xf = `vercel.ai.gateway.error.${Fi}`,
    Va = Symbol.for(Xf),
    Qf = ve(() => G(u({ modelId: s() }))),
    Ja,
    Wa,
    em = class extends ((Wa = Oe), (Ja = Va), Wa) {
        constructor({ message: e = "Model not found", statusCode: t = 404, modelId: n, cause: o } = {}) {
            (super({ message: e, statusCode: t, cause: o }),
                (this[Ja] = !0),
                (this.name = Fi),
                (this.type = "model_not_found"),
                (this.modelId = n));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && Va in e;
        }
    },
    Hi = "GatewayInternalServerError",
    tm = `vercel.ai.gateway.error.${Hi}`,
    Za = Symbol.for(tm),
    za,
    Ka,
    Ya = class extends ((Ka = Oe), (za = Za), Ka) {
        constructor({ message: e = "Internal server error", statusCode: t = 500, cause: n } = {}) {
            (super({ message: e, statusCode: t, cause: n }),
                (this[za] = !0),
                (this.name = Hi),
                (this.type = "internal_server_error"));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && Za in e;
        }
    },
    Vi = "GatewayResponseError",
    nm = `vercel.ai.gateway.error.${Vi}`,
    Xa = Symbol.for(nm),
    Qa,
    er,
    om = class extends ((er = Oe), (Qa = Xa), er) {
        constructor({
            message: e = "Invalid response from Gateway",
            statusCode: t = 502,
            response: n,
            validationError: o,
            cause: r,
            isRetryable: a,
        } = {}) {
            (super({ message: e, statusCode: t, cause: r, isRetryable: a }),
                (this[Qa] = !0),
                (this.name = Vi),
                (this.type = "response_error"),
                (this.response = n),
                (this.validationError = o));
        }
        static isInstance(e) {
            return Oe.hasMarker(e) && Xa in e;
        }
    };
async function tr({
    response: e,
    statusCode: t,
    defaultMessage: n = "Gateway request failed",
    cause: o,
    authMethod: r,
    isRetryable: a,
}) {
    const l = await at({ value: e, schema: am });
    if (!l.success)
        return new om({
            message: `Invalid error response format: ${n}`,
            statusCode: t,
            response: e,
            validationError: l.error,
            cause: o,
            isRetryable: a,
        });
    const i = l.value,
        d = i.error.type,
        c = i.error.message;
    switch (d) {
        case "authentication_error":
            return lo.createContextualError({
                apiKeyProvided: r === "api-key",
                oidcTokenProvided: r === "oidc",
                statusCode: t,
                cause: o,
            });
        case "invalid_request_error":
            return new zf({ message: c, statusCode: t, cause: o });
        case "rate_limit_exceeded":
            return new Yf({ message: c, statusCode: t, cause: o });
        case "model_not_found": {
            const p = await at({ value: i.error.param, schema: Qf });
            return new em({ message: c, statusCode: t, modelId: p.success ? p.value.modelId : void 0, cause: o });
        }
        case "internal_server_error":
            return new Ya({ message: c, statusCode: t, cause: o });
        case "forbidden": {
            const p = await at({ value: i.error.param, schema: Jf });
            return new Wf({ message: c, statusCode: t, cause: o, ruleId: p.success ? p.value.ruleId : void 0 });
        }
        default:
            return new Ya({ message: c, statusCode: t, cause: o });
    }
}
var am = ve(() =>
    G(u({ error: u({ message: s(), type: s().nullish(), param: Ue().nullish(), code: X([s(), f()]).nullish() }) })),
);
function rm(e) {
    if (e.data !== void 0) return e.data;
    if (e.responseBody != null)
        try {
            return JSON.parse(e.responseBody);
        } catch {
            return e.responseBody;
        }
    return {};
}
var Ji = "GatewayTimeoutError",
    im = `vercel.ai.gateway.error.${Ji}`,
    nr = Symbol.for(im),
    or,
    ar,
    rr = class Wi extends ((ar = Oe), (or = nr), ar) {
        constructor({ message: t = "Request timed out", statusCode: n = 408, cause: o } = {}) {
            (super({ message: t, statusCode: n, cause: o }),
                (this[or] = !0),
                (this.name = Ji),
                (this.type = "timeout_error"));
        }
        static isInstance(t) {
            return Oe.hasMarker(t) && nr in t;
        }
        static createTimeoutError({ originalMessage: t, statusCode: n = 408, cause: o }) {
            const r = `Gateway request timed out: ${t}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
            return new Wi({ message: r, statusCode: n, cause: o });
        }
    };
function ir(e) {
    if (!(e instanceof Error)) return !1;
    const t = e.code;
    return typeof t == "string"
        ? ["UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(t)
        : !1;
}
async function Ve(e, t) {
    var n;
    return Oe.isInstance(e)
        ? e
        : ir(e)
          ? rr.createTimeoutError({ originalMessage: e instanceof Error ? e.message : "Unknown error", cause: e })
          : _e.isInstance(e)
            ? e.cause && ir(e.cause)
                ? rr.createTimeoutError({ originalMessage: e.message, cause: e })
                : await tr({
                      response: rm(e),
                      statusCode: (n = e.statusCode) != null ? n : 500,
                      defaultMessage: "Gateway request failed",
                      cause: e,
                      authMethod: t,
                      isRetryable: e.isRetryable && (e.statusCode == null || e.statusCode < 400) ? !0 : void 0,
                  })
            : await tr({
                  response: {},
                  statusCode: 500,
                  defaultMessage: e instanceof Error ? `Gateway request failed: ${e.message}` : "Unknown Gateway error",
                  cause: e,
                  authMethod: t,
              });
}
var Zi = "ai-gateway-auth-method";
async function gt(e) {
    const t = await at({ value: e[Zi], schema: sm });
    return t.success ? t.value : void 0;
}
var sm = ve(() => G(X([m("api-key"), m("oidc")]))),
    lm = ["embedding", "image", "language"],
    sr = class {
        constructor(e) {
            this.config = e;
        }
        async getAvailableModels() {
            try {
                const { value: e } = await dn({
                    url: `${this.config.baseURL}/config`,
                    headers: await Ee(this.config.headers()),
                    successfulResponseHandler: Re(um),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (t) => {
                            var n;
                            return (n = Ye(t)) != null ? n : "unknown error";
                        },
                    }),
                    fetch: this.config.fetch,
                });
                return e;
            } catch (e) {
                throw await Ve(e);
            }
        }
        async getCredits() {
            try {
                const e = new URL(this.config.baseURL),
                    { value: t } = await dn({
                        url: `${e.origin}/v1/credits`,
                        headers: await Ee(this.config.headers()),
                        successfulResponseHandler: Re(cm),
                        failedResponseHandler: Xe({
                            errorSchema: Ge(),
                            errorToMessage: (n) => {
                                var o;
                                return (o = Ye(n)) != null ? o : "unknown error";
                            },
                        }),
                        fetch: this.config.fetch,
                    });
                return t;
            } catch (e) {
                throw await Ve(e);
            }
        }
    },
    um = ve(() =>
        G(
            u({
                models: N(
                    u({
                        id: s(),
                        name: s(),
                        description: s().nullish(),
                        pricing: u({
                            input: s(),
                            output: s(),
                            input_cache_read: s().nullish(),
                            input_cache_write: s().nullish(),
                        })
                            .transform(({ input: e, output: t, input_cache_read: n, input_cache_write: o }) => ({
                                input: e,
                                output: t,
                                ...(n ? { cachedInputTokens: n } : {}),
                                ...(o ? { cacheCreationInputTokens: o } : {}),
                            }))
                            .nullish(),
                        specification: u({ specificationVersion: m("v2"), provider: s(), modelId: s() }),
                        modelType: s().nullish(),
                    }),
                ).transform((e) => e.filter((t) => t.modelType == null || lm.includes(t.modelType))),
            }),
        ),
    ),
    cm = ve(() =>
        G(
            u({ balance: s(), total_used: s() }).transform(({ balance: e, total_used: t }) => ({
                balance: e,
                totalUsed: t,
            })),
        ),
    ),
    dm = class {
        constructor(e) {
            this.config = e;
        }
        async getSpendReport(e) {
            try {
                const t = new URL(this.config.baseURL),
                    n = new URLSearchParams();
                (n.set("start_date", e.startDate),
                    n.set("end_date", e.endDate),
                    e.groupBy && n.set("group_by", e.groupBy),
                    e.datePart && n.set("date_part", e.datePart),
                    e.userId && n.set("user_id", e.userId),
                    e.model && n.set("model", e.model),
                    e.provider && n.set("provider", e.provider),
                    e.credentialType && n.set("credential_type", e.credentialType),
                    e.tags && e.tags.length > 0 && n.set("tags", e.tags.join(",")));
                const { value: o } = await dn({
                    url: `${t.origin}/v1/report?${n.toString()}`,
                    headers: await Ee(this.config.headers()),
                    successfulResponseHandler: Re(pm),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (r) => {
                            var a;
                            return (a = Ye(r)) != null ? a : "unknown error";
                        },
                    }),
                    fetch: this.config.fetch,
                });
                return o;
            } catch (t) {
                throw await Ve(t);
            }
        }
    },
    pm = K(() =>
        G(
            u({
                results: N(
                    u({
                        day: s().optional(),
                        hour: s().optional(),
                        user: s().optional(),
                        model: s().optional(),
                        tag: s().optional(),
                        provider: s().optional(),
                        credential_type: J(["byok", "system"]).optional(),
                        total_cost: f(),
                        market_cost: f().optional(),
                        input_tokens: f().optional(),
                        output_tokens: f().optional(),
                        cached_input_tokens: f().optional(),
                        cache_creation_input_tokens: f().optional(),
                        reasoning_tokens: f().optional(),
                        request_count: f().optional(),
                    }).transform(
                        ({
                            credential_type: e,
                            total_cost: t,
                            market_cost: n,
                            input_tokens: o,
                            output_tokens: r,
                            cached_input_tokens: a,
                            cache_creation_input_tokens: l,
                            reasoning_tokens: i,
                            request_count: d,
                            ...c
                        }) => ({
                            ...c,
                            ...(e !== void 0 ? { credentialType: e } : {}),
                            totalCost: t,
                            ...(n !== void 0 ? { marketCost: n } : {}),
                            ...(o !== void 0 ? { inputTokens: o } : {}),
                            ...(r !== void 0 ? { outputTokens: r } : {}),
                            ...(a !== void 0 ? { cachedInputTokens: a } : {}),
                            ...(l !== void 0 ? { cacheCreationInputTokens: l } : {}),
                            ...(i !== void 0 ? { reasoningTokens: i } : {}),
                            ...(d !== void 0 ? { requestCount: d } : {}),
                        }),
                    ),
                ),
            }),
        ),
    ),
    fm = class {
        constructor(e) {
            this.config = e;
        }
        async getGenerationInfo(e) {
            try {
                const t = new URL(this.config.baseURL),
                    { value: n } = await dn({
                        url: `${t.origin}/v1/generation?id=${encodeURIComponent(e.id)}`,
                        headers: await Ee(this.config.headers()),
                        successfulResponseHandler: Re(mm),
                        failedResponseHandler: Xe({
                            errorSchema: Ge(),
                            errorToMessage: (o) => {
                                var r;
                                return (r = Ye(o)) != null ? r : "unknown error";
                            },
                        }),
                        fetch: this.config.fetch,
                    });
                return n;
            } catch (t) {
                throw await Ve(t);
            }
        }
    },
    mm = K(() =>
        G(
            u({
                data: u({
                    id: s(),
                    total_cost: f(),
                    upstream_inference_cost: f(),
                    usage: f(),
                    created_at: s(),
                    model: s(),
                    is_byok: ne(),
                    provider_name: s(),
                    streamed: ne(),
                    finish_reason: s(),
                    latency: f(),
                    generation_time: f(),
                    native_tokens_prompt: f(),
                    native_tokens_completion: f(),
                    native_tokens_reasoning: f(),
                    native_tokens_cached: f(),
                    native_tokens_cache_creation: f(),
                    billable_web_search_calls: f(),
                }).transform(
                    ({
                        total_cost: e,
                        upstream_inference_cost: t,
                        created_at: n,
                        is_byok: o,
                        provider_name: r,
                        finish_reason: a,
                        generation_time: l,
                        native_tokens_prompt: i,
                        native_tokens_completion: d,
                        native_tokens_reasoning: c,
                        native_tokens_cached: p,
                        native_tokens_cache_creation: w,
                        billable_web_search_calls: y,
                        ...k
                    }) => ({
                        ...k,
                        totalCost: e,
                        upstreamInferenceCost: t,
                        createdAt: n,
                        isByok: o,
                        providerName: r,
                        finishReason: a,
                        generationTime: l,
                        promptTokens: i,
                        completionTokens: d,
                        reasoningTokens: c,
                        cachedTokens: p,
                        cacheCreationTokens: w,
                        billableWebSearchCalls: y,
                    }),
                ),
            }).transform(({ data: e }) => e),
        ),
    ),
    hm = class {
        constructor(e, t) {
            ((this.modelId = e),
                (this.config = t),
                (this.specificationVersion = "v2"),
                (this.supportedUrls = { "*/*": [/.*/] }));
        }
        get provider() {
            return this.config.provider;
        }
        async getArgs(e) {
            const { abortSignal: t, ...n } = e;
            return { args: this.maybeEncodeFileParts(n), warnings: [] };
        }
        async doGenerate(e) {
            var t;
            const { args: n, warnings: o } = await this.getArgs(e),
                { abortSignal: r } = e,
                a = await Ee(this.config.headers());
            try {
                const {
                    responseHeaders: l,
                    value: i,
                    rawValue: d,
                } = await ke({
                    url: this.getUrl(),
                    headers: Se(
                        a,
                        e.headers,
                        this.getModelConfigHeaders(this.modelId, !1),
                        await Ee(this.config.o11yHeaders),
                    ),
                    body: n,
                    successfulResponseHandler: Re(Ge()),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (c) => {
                            var p;
                            return (p = Ye(c)) != null ? p : "unknown error";
                        },
                    }),
                    ...(r && { abortSignal: r }),
                    fetch: this.config.fetch,
                });
                return {
                    ...i,
                    request: { body: n },
                    response: { headers: l, body: d },
                    warnings: [...((t = i.warnings) != null ? t : []), ...o],
                };
            } catch (l) {
                throw await Ve(l, await gt(a));
            }
        }
        async doStream(e) {
            const { args: t, warnings: n } = await this.getArgs(e),
                { abortSignal: o } = e,
                r = await Ee(this.config.headers());
            try {
                const { value: a, responseHeaders: l } = await ke({
                    url: this.getUrl(),
                    headers: Se(
                        r,
                        e.headers,
                        this.getModelConfigHeaders(this.modelId, !0),
                        await Ee(this.config.o11yHeaders),
                    ),
                    body: t,
                    successfulResponseHandler: Pt(Ge()),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (i) => {
                            var d;
                            return (d = Ye(i)) != null ? d : "unknown error";
                        },
                    }),
                    ...(o && { abortSignal: o }),
                    fetch: this.config.fetch,
                });
                return {
                    stream: a.pipeThrough(
                        new TransformStream({
                            start(i) {
                                n.length > 0 && i.enqueue({ type: "stream-start", warnings: n });
                            },
                            transform(i, d) {
                                if (i.success) {
                                    const c = i.value;
                                    if (c.type === "raw" && !e.includeRawChunks) return;
                                    (c.type === "response-metadata" &&
                                        c.timestamp &&
                                        typeof c.timestamp == "string" &&
                                        (c.timestamp = new Date(c.timestamp)),
                                        d.enqueue(c));
                                } else d.error(i.error);
                            },
                        }),
                    ),
                    request: { body: t },
                    response: { headers: l },
                };
            } catch (a) {
                throw await Ve(a, await gt(r));
            }
        }
        isFilePart(e) {
            return e && typeof e == "object" && "type" in e && e.type === "file";
        }
        maybeEncodeFileParts(e) {
            for (const t of e.prompt)
                for (const n of t.content)
                    if (this.isFilePart(n)) {
                        const o = n;
                        if (o.data instanceof Uint8Array) {
                            const r = Uint8Array.from(o.data),
                                a = Buffer.from(r).toString("base64");
                            o.data = new URL(`data:${o.mediaType || "application/octet-stream"};base64,${a}`);
                        }
                    }
            return e;
        }
        getUrl() {
            return `${this.config.baseURL}/language-model`;
        }
        getModelConfigHeaders(e, t) {
            return {
                "ai-language-model-specification-version": "2",
                "ai-language-model-id": e,
                "ai-language-model-streaming": String(t),
            };
        }
    },
    gm = class {
        constructor(e, t) {
            ((this.modelId = e),
                (this.config = t),
                (this.specificationVersion = "v2"),
                (this.maxEmbeddingsPerCall = 2048),
                (this.supportsParallelCalls = !0));
        }
        get provider() {
            return this.config.provider;
        }
        async doEmbed({ values: e, headers: t, abortSignal: n, providerOptions: o }) {
            var r;
            const a = await Ee(this.config.headers());
            try {
                const {
                    responseHeaders: l,
                    value: i,
                    rawValue: d,
                } = await ke({
                    url: this.getUrl(),
                    headers: Se(a, t ?? {}, this.getModelConfigHeaders(), await Ee(this.config.o11yHeaders)),
                    body: { input: e.length === 1 ? e[0] : e, ...(o ? { providerOptions: o } : {}) },
                    successfulResponseHandler: Re(_m),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (c) => {
                            var p;
                            return (p = Ye(c)) != null ? p : "unknown error";
                        },
                    }),
                    ...(n && { abortSignal: n }),
                    fetch: this.config.fetch,
                });
                return {
                    embeddings: i.embeddings,
                    usage: (r = i.usage) != null ? r : void 0,
                    providerMetadata: i.providerMetadata,
                    response: { headers: l, body: d },
                };
            } catch (l) {
                throw await Ve(l, await gt(a));
            }
        }
        getUrl() {
            return `${this.config.baseURL}/embedding-model`;
        }
        getModelConfigHeaders() {
            return { "ai-embedding-model-specification-version": "2", "ai-model-id": this.modelId };
        }
    },
    _m = ve(() =>
        G(
            u({
                embeddings: N(N(f())),
                usage: u({ tokens: f() }).nullish(),
                providerMetadata: we(s(), we(s(), Ue())).optional(),
            }),
        ),
    ),
    ym = class {
        constructor(e, t) {
            ((this.modelId = e),
                (this.config = t),
                (this.specificationVersion = "v2"),
                (this.maxImagesPerCall = Number.MAX_SAFE_INTEGER));
        }
        get provider() {
            return this.config.provider;
        }
        async doGenerate({
            prompt: e,
            n: t,
            size: n,
            aspectRatio: o,
            seed: r,
            providerOptions: a,
            headers: l,
            abortSignal: i,
        }) {
            var d, c, p, w;
            const y = await Ee(this.config.headers());
            try {
                const {
                    responseHeaders: k,
                    value: x,
                    rawValue: I,
                } = await ke({
                    url: this.getUrl(),
                    headers: Se(y, l ?? {}, this.getModelConfigHeaders(), await Ee(this.config.o11yHeaders)),
                    body: {
                        prompt: e,
                        n: t,
                        ...(n && { size: n }),
                        ...(o && { aspectRatio: o }),
                        ...(r && { seed: r }),
                        ...(a && { providerOptions: a }),
                    },
                    successfulResponseHandler: Re(wm),
                    failedResponseHandler: Xe({
                        errorSchema: Ge(),
                        errorToMessage: (S) => {
                            var R;
                            return (R = Ye(S)) != null ? R : "unknown error";
                        },
                    }),
                    ...(i && { abortSignal: i }),
                    fetch: this.config.fetch,
                });
                return {
                    images: x.images,
                    ...(x.isRetryable != null && { isRetryable: x.isRetryable }),
                    warnings: (d = x.warnings) != null ? d : [],
                    providerMetadata: x.providerMetadata,
                    response: { timestamp: new Date(), modelId: this.modelId, headers: k },
                    ...(x.usage != null && {
                        usage: {
                            inputTokens: (c = x.usage.inputTokens) != null ? c : void 0,
                            outputTokens: (p = x.usage.outputTokens) != null ? p : void 0,
                            totalTokens: (w = x.usage.totalTokens) != null ? w : void 0,
                        },
                    }),
                };
            } catch (k) {
                throw await Ve(k, await gt(y));
            }
        }
        getUrl() {
            return `${this.config.baseURL}/image-model`;
        }
        getModelConfigHeaders() {
            return { "ai-image-model-specification-version": "2", "ai-model-id": this.modelId };
        }
    },
    vm = u({ images: N(Ue()).optional() }).catchall(Ue()),
    bm = u({ inputTokens: f().nullish(), outputTokens: f().nullish(), totalTokens: f().nullish() }),
    wm = u({
        images: N(s()),
        isRetryable: ne().optional(),
        warnings: N(u({ type: m("other"), message: s() })).optional(),
        providerMetadata: we(s(), vm).optional(),
        usage: bm.optional(),
    }),
    xm = K(() =>
        G(
            u({
                objective: s().describe(
                    "Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters.",
                ),
                search_queries: N(s())
                    .optional()
                    .describe("Optional search queries to supplement the objective. Maximum 200 characters per query."),
                mode: J(["one-shot", "agentic"])
                    .optional()
                    .describe(
                        'Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.',
                    ),
                max_results: f()
                    .optional()
                    .describe("Maximum number of results to return (1-20). Defaults to 10 if not specified."),
                source_policy: u({
                    include_domains: N(s()).optional().describe("List of domains to include in search results."),
                    exclude_domains: N(s()).optional().describe("List of domains to exclude from search results."),
                    after_date: s()
                        .optional()
                        .describe("Only include results published after this date (ISO 8601 format)."),
                })
                    .optional()
                    .describe("Source policy for controlling which domains to include/exclude and freshness."),
                excerpts: u({
                    max_chars_per_result: f().optional().describe("Maximum characters per result."),
                    max_chars_total: f().optional().describe("Maximum total characters across all results."),
                })
                    .optional()
                    .describe("Excerpt configuration for controlling result length."),
                fetch_policy: u({
                    max_age_seconds: f()
                        .optional()
                        .describe("Maximum age in seconds for cached content. Set to 0 to always fetch fresh content."),
                })
                    .optional()
                    .describe("Fetch policy for controlling content freshness."),
            }),
        ),
    ),
    Tm = K(() =>
        G(
            X([
                u({
                    searchId: s(),
                    results: N(
                        u({
                            url: s(),
                            title: s(),
                            excerpt: s(),
                            publishDate: s().nullable().optional(),
                            relevanceScore: f().optional(),
                        }),
                    ),
                }),
                u({
                    error: J(["api_error", "rate_limit", "timeout", "invalid_input", "configuration_error", "unknown"]),
                    statusCode: f().optional(),
                    message: s(),
                }),
            ]),
        ),
    ),
    km = Le({ id: "gateway.parallel_search", name: "parallel_search", inputSchema: xm, outputSchema: Tm }),
    Im = (e = {}) => km(e),
    Sm = K(() =>
        G(
            u({
                query: X([s(), N(s())]).describe(
                    "Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries.",
                ),
                max_results: f().optional().describe("Maximum number of search results to return (1-20, default: 10)"),
                max_tokens_per_page: f()
                    .optional()
                    .describe("Maximum number of tokens to extract per search result page (256-2048, default: 2048)"),
                max_tokens: f()
                    .optional()
                    .describe("Maximum total tokens across all search results (default: 25000, max: 1000000)"),
                country: s()
                    .optional()
                    .describe(
                        "Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')",
                    ),
                search_domain_filter: N(s())
                    .optional()
                    .describe(
                        "List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']",
                    ),
                search_language_filter: N(s())
                    .optional()
                    .describe(
                        "List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']",
                    ),
                search_after_date: s()
                    .optional()
                    .describe(
                        "Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter.",
                    ),
                search_before_date: s()
                    .optional()
                    .describe(
                        "Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter.",
                    ),
                last_updated_after_filter: s()
                    .optional()
                    .describe(
                        "Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter.",
                    ),
                last_updated_before_filter: s()
                    .optional()
                    .describe(
                        "Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter.",
                    ),
                search_recency_filter: J(["day", "week", "month", "year"])
                    .optional()
                    .describe(
                        "Filter results by relative time period. Cannot be used with search_after_date or search_before_date.",
                    ),
            }),
        ),
    ),
    Cm = K(() =>
        G(
            X([
                u({
                    results: N(
                        u({ title: s(), url: s(), snippet: s(), date: s().optional(), lastUpdated: s().optional() }),
                    ),
                    id: s(),
                }),
                u({
                    error: J(["api_error", "rate_limit", "timeout", "invalid_input", "unknown"]),
                    statusCode: f().optional(),
                    message: s(),
                }),
            ]),
        ),
    ),
    Em = Le({ id: "gateway.perplexity_search", name: "perplexity_search", inputSchema: Sm, outputSchema: Cm }),
    Rm = (e = {}) => Em(e),
    Om = { parallelSearch: Im, perplexitySearch: Rm };
async function Am() {
    var e;
    return (e = Di.getContext().headers) == null ? void 0 : e["x-vercel-id"];
}
var Mm = "2.0.162",
    Nm = "0.0.1";
function Pm(e = {}) {
    var t, n;
    let o = null,
        r = null;
    const a = (t = e.metadataCacheRefreshMillis) != null ? t : 1e3 * 60 * 5;
    let l = 0;
    const i = (n = bn(e.baseURL)) != null ? n : "https://ai-gateway.vercel.sh/v1/ai",
        d = async () => {
            const S = await Dm(e);
            if (S)
                return vt(
                    {
                        Authorization: `Bearer ${S.token}`,
                        "ai-gateway-protocol-version": Nm,
                        [Zi]: S.authMethod,
                        ...e.headers,
                    },
                    `ai-sdk/gateway/${Mm}`,
                );
            throw lo.createContextualError({ apiKeyProvided: !1, oidcTokenProvided: !1, statusCode: 401 });
        },
        c = () => {
            const S = xt({ settingValue: void 0, environmentVariableName: "VERCEL_DEPLOYMENT_ID" }),
                R = xt({ settingValue: void 0, environmentVariableName: "VERCEL_ENV" }),
                P = xt({ settingValue: void 0, environmentVariableName: "VERCEL_REGION" }),
                O = xt({ settingValue: void 0, environmentVariableName: "VERCEL_PROJECT_ID" });
            return async () => {
                const C = await Am();
                return {
                    ...(S && { "ai-o11y-deployment-id": S }),
                    ...(R && { "ai-o11y-environment": R }),
                    ...(P && { "ai-o11y-region": P }),
                    ...(C && { "ai-o11y-request-id": C }),
                    ...(O && { "ai-o11y-project-id": O }),
                };
            };
        },
        p = (S) => new hm(S, { provider: "gateway", baseURL: i, headers: d, fetch: e.fetch, o11yHeaders: c() }),
        w = async () => {
            var S, R, P;
            const O =
                (P = (R = (S = e._internal) == null ? void 0 : S.currentDate) == null ? void 0 : R.call(S).getTime()) !=
                null
                    ? P
                    : Date.now();
            return (
                (!o || O - l > a) &&
                    ((l = O),
                    (o = new sr({ baseURL: i, headers: d, fetch: e.fetch })
                        .getAvailableModels()
                        .then((C) => ((r = C), C))
                        .catch(async (C) => {
                            throw await Ve(C, await gt(await d()));
                        }))),
                r ? Promise.resolve(r) : o
            );
        },
        y = async () =>
            new sr({ baseURL: i, headers: d, fetch: e.fetch }).getCredits().catch(async (S) => {
                throw await Ve(S, await gt(await d()));
            }),
        k = async (S) =>
            new dm({ baseURL: i, headers: d, fetch: e.fetch }).getSpendReport(S).catch(async (R) => {
                throw await Ve(R, await gt(await d()));
            }),
        x = async (S) =>
            new fm({ baseURL: i, headers: d, fetch: e.fetch }).getGenerationInfo(S).catch(async (R) => {
                throw await Ve(R, await gt(await d()));
            }),
        I = function (S) {
            if (new.target)
                throw new Error("The Gateway Provider model function cannot be called with the new keyword.");
            return p(S);
        };
    return (
        (I.getAvailableModels = w),
        (I.getCredits = y),
        (I.getSpendReport = k),
        (I.getGenerationInfo = x),
        (I.imageModel = (S) =>
            new ym(S, { provider: "gateway", baseURL: i, headers: d, fetch: e.fetch, o11yHeaders: c() })),
        (I.languageModel = p),
        (I.textEmbeddingModel = (S) =>
            new gm(S, { provider: "gateway", baseURL: i, headers: d, fetch: e.fetch, o11yHeaders: c() })),
        (I.tools = Om),
        I
    );
}
var $m = Pm();
async function Dm(e) {
    const t = xt({ settingValue: e.apiKey, environmentVariableName: "AI_GATEWAY_API_KEY" });
    if (t) return { token: t, authMethod: "api-key" };
    try {
        return { token: await Di.getVercelOidcToken(), authMethod: "oidc" };
    } catch {
        return null;
    }
}
var qm =
        typeof globalThis == "object"
            ? globalThis
            : typeof self == "object"
              ? self
              : typeof window == "object"
                ? window
                : typeof global == "object"
                  ? global
                  : {},
    Tt = "1.9.0",
    lr = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
function Um(e) {
    var t = new Set([e]),
        n = new Set(),
        o = e.match(lr);
    if (!o)
        return function () {
            return !1;
        };
    var r = { major: +o[1], minor: +o[2], patch: +o[3], prerelease: o[4] };
    if (r.prerelease != null)
        return function (d) {
            return d === e;
        };
    function a(i) {
        return (n.add(i), !1);
    }
    function l(i) {
        return (t.add(i), !0);
    }
    return function (d) {
        if (t.has(d)) return !0;
        if (n.has(d)) return !1;
        var c = d.match(lr);
        if (!c) return a(d);
        var p = { major: +c[1], minor: +c[2], patch: +c[3], prerelease: c[4] };
        return p.prerelease != null || r.major !== p.major
            ? a(d)
            : r.major === 0
              ? r.minor === p.minor && r.patch <= p.patch
                  ? l(d)
                  : a(d)
              : r.minor <= p.minor
                ? l(d)
                : a(d);
    };
}
var Lm = Um(Tt),
    jm = Tt.split(".")[0],
    zt = Symbol.for("opentelemetry.js.api." + jm),
    Kt = qm;
function uo(e, t, n, o) {
    var r;
    o === void 0 && (o = !1);
    var a = (Kt[zt] = (r = Kt[zt]) !== null && r !== void 0 ? r : { version: Tt });
    if (!o && a[e]) {
        var l = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + e);
        return (n.error(l.stack || l.message), !1);
    }
    if (a.version !== Tt) {
        var l = new Error(
            "@opentelemetry/api: Registration of version v" +
                a.version +
                " for " +
                e +
                " does not match previously registered API v" +
                Tt,
        );
        return (n.error(l.stack || l.message), !1);
    }
    return ((a[e] = t), n.debug("@opentelemetry/api: Registered a global for " + e + " v" + Tt + "."), !0);
}
function Yt(e) {
    var t,
        n,
        o = (t = Kt[zt]) === null || t === void 0 ? void 0 : t.version;
    if (!(!o || !Lm(o))) return (n = Kt[zt]) === null || n === void 0 ? void 0 : n[e];
}
function co(e, t) {
    t.debug("@opentelemetry/api: Unregistering a global for " + e + " v" + Tt + ".");
    var n = Kt[zt];
    n && delete n[e];
}
var Bm = function (e, t) {
        var n = typeof Symbol == "function" && e[Symbol.iterator];
        if (!n) return e;
        var o = n.call(e),
            r,
            a = [],
            l;
        try {
            for (; (t === void 0 || t-- > 0) && !(r = o.next()).done;) a.push(r.value);
        } catch (i) {
            l = { error: i };
        } finally {
            try {
                r && !r.done && (n = o.return) && n.call(o);
            } finally {
                if (l) throw l.error;
            }
        }
        return a;
    },
    Gm = function (e, t, n) {
        if (n || arguments.length === 2)
            for (var o = 0, r = t.length, a; o < r; o++)
                (a || !(o in t)) && (a || (a = Array.prototype.slice.call(t, 0, o)), (a[o] = t[o]));
        return e.concat(a || Array.prototype.slice.call(t));
    },
    Fm = (function () {
        function e(t) {
            this._namespace = t.namespace || "DiagComponentLogger";
        }
        return (
            (e.prototype.debug = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return Gt("debug", this._namespace, t);
            }),
            (e.prototype.error = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return Gt("error", this._namespace, t);
            }),
            (e.prototype.info = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return Gt("info", this._namespace, t);
            }),
            (e.prototype.warn = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return Gt("warn", this._namespace, t);
            }),
            (e.prototype.verbose = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return Gt("verbose", this._namespace, t);
            }),
            e
        );
    })();
function Gt(e, t, n) {
    var o = Yt("diag");
    if (o) return (n.unshift(t), o[e].apply(o, Gm([], Bm(n), !1)));
}
var Be;
(function (e) {
    ((e[(e.NONE = 0)] = "NONE"),
        (e[(e.ERROR = 30)] = "ERROR"),
        (e[(e.WARN = 50)] = "WARN"),
        (e[(e.INFO = 60)] = "INFO"),
        (e[(e.DEBUG = 70)] = "DEBUG"),
        (e[(e.VERBOSE = 80)] = "VERBOSE"),
        (e[(e.ALL = 9999)] = "ALL"));
})(Be || (Be = {}));
function Hm(e, t) {
    (e < Be.NONE ? (e = Be.NONE) : e > Be.ALL && (e = Be.ALL), (t = t || {}));
    function n(o, r) {
        var a = t[o];
        return typeof a == "function" && e >= r ? a.bind(t) : function () {};
    }
    return {
        error: n("error", Be.ERROR),
        warn: n("warn", Be.WARN),
        info: n("info", Be.INFO),
        debug: n("debug", Be.DEBUG),
        verbose: n("verbose", Be.VERBOSE),
    };
}
var Vm = function (e, t) {
        var n = typeof Symbol == "function" && e[Symbol.iterator];
        if (!n) return e;
        var o = n.call(e),
            r,
            a = [],
            l;
        try {
            for (; (t === void 0 || t-- > 0) && !(r = o.next()).done;) a.push(r.value);
        } catch (i) {
            l = { error: i };
        } finally {
            try {
                r && !r.done && (n = o.return) && n.call(o);
            } finally {
                if (l) throw l.error;
            }
        }
        return a;
    },
    Jm = function (e, t, n) {
        if (n || arguments.length === 2)
            for (var o = 0, r = t.length, a; o < r; o++)
                (a || !(o in t)) && (a || (a = Array.prototype.slice.call(t, 0, o)), (a[o] = t[o]));
        return e.concat(a || Array.prototype.slice.call(t));
    },
    Wm = "diag",
    hn = (function () {
        function e() {
            function t(r) {
                return function () {
                    for (var a = [], l = 0; l < arguments.length; l++) a[l] = arguments[l];
                    var i = Yt("diag");
                    if (i) return i[r].apply(i, Jm([], Vm(a), !1));
                };
            }
            var n = this,
                o = function (r, a) {
                    var l, i, d;
                    if ((a === void 0 && (a = { logLevel: Be.INFO }), r === n)) {
                        var c = new Error(
                            "Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation",
                        );
                        return (n.error((l = c.stack) !== null && l !== void 0 ? l : c.message), !1);
                    }
                    typeof a == "number" && (a = { logLevel: a });
                    var p = Yt("diag"),
                        w = Hm((i = a.logLevel) !== null && i !== void 0 ? i : Be.INFO, r);
                    if (p && !a.suppressOverrideMessage) {
                        var y =
                            (d = new Error().stack) !== null && d !== void 0 ? d : "<failed to generate stacktrace>";
                        (p.warn("Current logger will be overwritten from " + y),
                            w.warn("Current logger will overwrite one already registered from " + y));
                    }
                    return uo("diag", w, n, !0);
                };
            ((n.setLogger = o),
                (n.disable = function () {
                    co(Wm, n);
                }),
                (n.createComponentLogger = function (r) {
                    return new Fm(r);
                }),
                (n.verbose = t("verbose")),
                (n.debug = t("debug")),
                (n.info = t("info")),
                (n.warn = t("warn")),
                (n.error = t("error")));
        }
        return (
            (e.instance = function () {
                return (this._instance || (this._instance = new e()), this._instance);
            }),
            e
        );
    })();
function Zm(e) {
    return Symbol.for(e);
}
var zm = (function () {
        function e(t) {
            var n = this;
            ((n._currentContext = t ? new Map(t) : new Map()),
                (n.getValue = function (o) {
                    return n._currentContext.get(o);
                }),
                (n.setValue = function (o, r) {
                    var a = new e(n._currentContext);
                    return (a._currentContext.set(o, r), a);
                }),
                (n.deleteValue = function (o) {
                    var r = new e(n._currentContext);
                    return (r._currentContext.delete(o), r);
                }));
        }
        return e;
    })(),
    Km = new zm(),
    Ym = function (e, t) {
        var n = typeof Symbol == "function" && e[Symbol.iterator];
        if (!n) return e;
        var o = n.call(e),
            r,
            a = [],
            l;
        try {
            for (; (t === void 0 || t-- > 0) && !(r = o.next()).done;) a.push(r.value);
        } catch (i) {
            l = { error: i };
        } finally {
            try {
                r && !r.done && (n = o.return) && n.call(o);
            } finally {
                if (l) throw l.error;
            }
        }
        return a;
    },
    Xm = function (e, t, n) {
        if (n || arguments.length === 2)
            for (var o = 0, r = t.length, a; o < r; o++)
                (a || !(o in t)) && (a || (a = Array.prototype.slice.call(t, 0, o)), (a[o] = t[o]));
        return e.concat(a || Array.prototype.slice.call(t));
    },
    Qm = (function () {
        function e() {}
        return (
            (e.prototype.active = function () {
                return Km;
            }),
            (e.prototype.with = function (t, n, o) {
                for (var r = [], a = 3; a < arguments.length; a++) r[a - 3] = arguments[a];
                return n.call.apply(n, Xm([o], Ym(r), !1));
            }),
            (e.prototype.bind = function (t, n) {
                return n;
            }),
            (e.prototype.enable = function () {
                return this;
            }),
            (e.prototype.disable = function () {
                return this;
            }),
            e
        );
    })(),
    eh = function (e, t) {
        var n = typeof Symbol == "function" && e[Symbol.iterator];
        if (!n) return e;
        var o = n.call(e),
            r,
            a = [],
            l;
        try {
            for (; (t === void 0 || t-- > 0) && !(r = o.next()).done;) a.push(r.value);
        } catch (i) {
            l = { error: i };
        } finally {
            try {
                r && !r.done && (n = o.return) && n.call(o);
            } finally {
                if (l) throw l.error;
            }
        }
        return a;
    },
    th = function (e, t, n) {
        if (n || arguments.length === 2)
            for (var o = 0, r = t.length, a; o < r; o++)
                (a || !(o in t)) && (a || (a = Array.prototype.slice.call(t, 0, o)), (a[o] = t[o]));
        return e.concat(a || Array.prototype.slice.call(t));
    },
    qn = "context",
    nh = new Qm(),
    zi = (function () {
        function e() {}
        return (
            (e.getInstance = function () {
                return (this._instance || (this._instance = new e()), this._instance);
            }),
            (e.prototype.setGlobalContextManager = function (t) {
                return uo(qn, t, hn.instance());
            }),
            (e.prototype.active = function () {
                return this._getContextManager().active();
            }),
            (e.prototype.with = function (t, n, o) {
                for (var r, a = [], l = 3; l < arguments.length; l++) a[l - 3] = arguments[l];
                return (r = this._getContextManager()).with.apply(r, th([t, n, o], eh(a), !1));
            }),
            (e.prototype.bind = function (t, n) {
                return this._getContextManager().bind(t, n);
            }),
            (e.prototype._getContextManager = function () {
                return Yt(qn) || nh;
            }),
            (e.prototype.disable = function () {
                (this._getContextManager().disable(), co(qn, hn.instance()));
            }),
            e
        );
    })(),
    Jn;
(function (e) {
    ((e[(e.NONE = 0)] = "NONE"), (e[(e.SAMPLED = 1)] = "SAMPLED"));
})(Jn || (Jn = {}));
var Ki = "0000000000000000",
    Yi = "00000000000000000000000000000000",
    oh = { traceId: Yi, spanId: Ki, traceFlags: Jn.NONE },
    Jt = (function () {
        function e(t) {
            (t === void 0 && (t = oh), (this._spanContext = t));
        }
        return (
            (e.prototype.spanContext = function () {
                return this._spanContext;
            }),
            (e.prototype.setAttribute = function (t, n) {
                return this;
            }),
            (e.prototype.setAttributes = function (t) {
                return this;
            }),
            (e.prototype.addEvent = function (t, n) {
                return this;
            }),
            (e.prototype.addLink = function (t) {
                return this;
            }),
            (e.prototype.addLinks = function (t) {
                return this;
            }),
            (e.prototype.setStatus = function (t) {
                return this;
            }),
            (e.prototype.updateName = function (t) {
                return this;
            }),
            (e.prototype.end = function (t) {}),
            (e.prototype.isRecording = function () {
                return !1;
            }),
            (e.prototype.recordException = function (t, n) {}),
            e
        );
    })(),
    po = Zm("OpenTelemetry Context Key SPAN");
function fo(e) {
    return e.getValue(po) || void 0;
}
function ah() {
    return fo(zi.getInstance().active());
}
function mo(e, t) {
    return e.setValue(po, t);
}
function rh(e) {
    return e.deleteValue(po);
}
function ih(e, t) {
    return mo(e, new Jt(t));
}
function Xi(e) {
    var t;
    return (t = fo(e)) === null || t === void 0 ? void 0 : t.spanContext();
}
var sh = /^([0-9a-f]{32})$/i,
    lh = /^[0-9a-f]{16}$/i;
function uh(e) {
    return sh.test(e) && e !== Yi;
}
function ch(e) {
    return lh.test(e) && e !== Ki;
}
function Qi(e) {
    return uh(e.traceId) && ch(e.spanId);
}
function dh(e) {
    return new Jt(e);
}
var Un = zi.getInstance(),
    es = (function () {
        function e() {}
        return (
            (e.prototype.startSpan = function (t, n, o) {
                o === void 0 && (o = Un.active());
                var r = !!n?.root;
                if (r) return new Jt();
                var a = o && Xi(o);
                return ph(a) && Qi(a) ? new Jt(a) : new Jt();
            }),
            (e.prototype.startActiveSpan = function (t, n, o, r) {
                var a, l, i;
                if (!(arguments.length < 2)) {
                    arguments.length === 2
                        ? (i = n)
                        : arguments.length === 3
                          ? ((a = n), (i = o))
                          : ((a = n), (l = o), (i = r));
                    var d = l ?? Un.active(),
                        c = this.startSpan(t, a, d),
                        p = mo(d, c);
                    return Un.with(p, i, void 0, c);
                }
            }),
            e
        );
    })();
function ph(e) {
    return (
        typeof e == "object" &&
        typeof e.spanId == "string" &&
        typeof e.traceId == "string" &&
        typeof e.traceFlags == "number"
    );
}
var fh = new es(),
    mh = (function () {
        function e(t, n, o, r) {
            ((this._provider = t), (this.name = n), (this.version = o), (this.options = r));
        }
        return (
            (e.prototype.startSpan = function (t, n, o) {
                return this._getTracer().startSpan(t, n, o);
            }),
            (e.prototype.startActiveSpan = function (t, n, o, r) {
                var a = this._getTracer();
                return Reflect.apply(a.startActiveSpan, a, arguments);
            }),
            (e.prototype._getTracer = function () {
                if (this._delegate) return this._delegate;
                var t = this._provider.getDelegateTracer(this.name, this.version, this.options);
                return t ? ((this._delegate = t), this._delegate) : fh;
            }),
            e
        );
    })(),
    hh = (function () {
        function e() {}
        return (
            (e.prototype.getTracer = function (t, n, o) {
                return new es();
            }),
            e
        );
    })(),
    gh = new hh(),
    ur = (function () {
        function e() {}
        return (
            (e.prototype.getTracer = function (t, n, o) {
                var r;
                return (r = this.getDelegateTracer(t, n, o)) !== null && r !== void 0 ? r : new mh(this, t, n, o);
            }),
            (e.prototype.getDelegate = function () {
                var t;
                return (t = this._delegate) !== null && t !== void 0 ? t : gh;
            }),
            (e.prototype.setDelegate = function (t) {
                this._delegate = t;
            }),
            (e.prototype.getDelegateTracer = function (t, n, o) {
                var r;
                return (r = this._delegate) === null || r === void 0 ? void 0 : r.getTracer(t, n, o);
            }),
            e
        );
    })(),
    gn;
(function (e) {
    ((e[(e.UNSET = 0)] = "UNSET"), (e[(e.OK = 1)] = "OK"), (e[(e.ERROR = 2)] = "ERROR"));
})(gn || (gn = {}));
var Ln = "trace",
    _h = (function () {
        function e() {
            ((this._proxyTracerProvider = new ur()),
                (this.wrapSpanContext = dh),
                (this.isSpanContextValid = Qi),
                (this.deleteSpan = rh),
                (this.getSpan = fo),
                (this.getActiveSpan = ah),
                (this.getSpanContext = Xi),
                (this.setSpan = mo),
                (this.setSpanContext = ih));
        }
        return (
            (e.getInstance = function () {
                return (this._instance || (this._instance = new e()), this._instance);
            }),
            (e.prototype.setGlobalTracerProvider = function (t) {
                var n = uo(Ln, this._proxyTracerProvider, hn.instance());
                return (n && this._proxyTracerProvider.setDelegate(t), n);
            }),
            (e.prototype.getTracerProvider = function () {
                return Yt(Ln) || this._proxyTracerProvider;
            }),
            (e.prototype.getTracer = function (t, n) {
                return this.getTracerProvider().getTracer(t, n);
            }),
            (e.prototype.disable = function () {
                (co(Ln, hn.instance()), (this._proxyTracerProvider = new ur()));
            }),
            e
        );
    })(),
    yh = _h.getInstance(),
    vh = Object.defineProperty,
    bh = (e, t) => {
        for (var n in t) vh(e, n, { get: t[n], enumerable: !0 });
    },
    ts = "AI_NoOutputSpecifiedError",
    ns = `vercel.ai.error.${ts}`,
    wh = Symbol.for(ns),
    os,
    as = class extends te {
        constructor({ message: e = "No output specified." } = {}) {
            (super({ name: ts, message: e }), (this[os] = !0));
        }
        static isInstance(e) {
            return te.hasMarker(e, ns);
        }
    };
os = wh;
function xh(e) {
    const t = "AI SDK Warning:";
    switch (e.type) {
        case "unsupported-setting": {
            let n = `${t} The "${e.setting}" setting is not supported by this model`;
            return (e.details && (n += ` - ${e.details}`), n);
        }
        case "unsupported-tool": {
            const n = "name" in e.tool ? e.tool.name : "unknown tool";
            let o = `${t} The tool "${n}" is not supported by this model`;
            return (e.details && (o += ` - ${e.details}`), o);
        }
        case "other":
            return `${t} ${e.message}`;
        default:
            return `${t} ${JSON.stringify(e, null, 2)}`;
    }
}
var Th = "AI SDK Warning System: To turn off warning logging, set the AI_SDK_LOG_WARNINGS global to false.",
    cr = !1;
function dr({ message: e, type: t }) {
    typeof process < "u" && typeof process.emitWarning == "function"
        ? process.emitWarning(e, { type: t })
        : console.warn(e);
}
var rs = (e) => {
        if (e.length === 0) return;
        const t = globalThis.AI_SDK_LOG_WARNINGS;
        if (t !== !1) {
            if (typeof t == "function") {
                t(e);
                return;
            }
            cr || ((cr = !0), dr({ message: Th, type: "Warning" }));
            for (const n of e) dr({ message: xh(n), type: "Warning" });
        }
    },
    is = "AI_InvalidArgumentError",
    ss = `vercel.ai.error.${is}`,
    kh = Symbol.for(ss),
    ls,
    nt = class extends te {
        constructor({ parameter: e, value: t, message: n }) {
            (super({ name: is, message: `Invalid argument for parameter ${e}: ${n}` }),
                (this[ls] = !0),
                (this.parameter = e),
                (this.value = t));
        }
        static isInstance(e) {
            return te.hasMarker(e, ss);
        }
    };
ls = kh;
var us = "AI_InvalidToolInputError",
    cs = `vercel.ai.error.${us}`,
    Ih = Symbol.for(cs),
    ds,
    ho = class extends te {
        constructor({ toolInput: e, toolName: t, cause: n, message: o = `Invalid input for tool ${t}: ${Qt(n)}` }) {
            (super({ name: us, message: o, cause: n }), (this[ds] = !0), (this.toolInput = e), (this.toolName = t));
        }
        static isInstance(e) {
            return te.hasMarker(e, cs);
        }
    };
ds = Ih;
var ps = "AI_NoObjectGeneratedError",
    fs = `vercel.ai.error.${ps}`,
    Sh = Symbol.for(fs),
    ms,
    pr = class extends te {
        constructor({
            message: e = "No object generated.",
            cause: t,
            text: n,
            response: o,
            usage: r,
            finishReason: a,
        }) {
            (super({ name: ps, message: e, cause: t }),
                (this[ms] = !0),
                (this.text = n),
                (this.response = o),
                (this.usage = r),
                (this.finishReason = a));
        }
        static isInstance(e) {
            return te.hasMarker(e, fs);
        }
    };
ms = Sh;
var hs = "AI_NoOutputGeneratedError",
    gs = `vercel.ai.error.${hs}`,
    Ch = Symbol.for(gs),
    _s,
    Eh = class extends te {
        constructor({ message: e = "No output generated.", cause: t } = {}) {
            (super({ name: hs, message: e, cause: t }), (this[_s] = !0));
        }
        static isInstance(e) {
            return te.hasMarker(e, gs);
        }
    };
_s = Ch;
var ys = "AI_NoSuchToolError",
    vs = `vercel.ai.error.${ys}`,
    Rh = Symbol.for(vs),
    bs,
    Wn = class extends te {
        constructor({
            toolName: e,
            availableTools: t = void 0,
            message:
                n = `Model tried to call unavailable tool '${e}'. ${t === void 0 ? "No tools are available." : `Available tools: ${t.join(", ")}.`}`,
        }) {
            (super({ name: ys, message: n }), (this[bs] = !0), (this.toolName = e), (this.availableTools = t));
        }
        static isInstance(e) {
            return te.hasMarker(e, vs);
        }
    };
bs = Rh;
var ws = "AI_ToolCallRepairError",
    xs = `vercel.ai.error.${ws}`,
    Oh = Symbol.for(xs),
    Ts,
    Ah = class extends te {
        constructor({ cause: e, originalError: t, message: n = `Error repairing tool call: ${Qt(e)}` }) {
            (super({ name: ws, message: n, cause: e }), (this[Ts] = !0), (this.originalError = t));
        }
        static isInstance(e) {
            return te.hasMarker(e, xs);
        }
    };
Ts = Oh;
var Mh = class extends te {
        constructor(e) {
            (super({
                name: "AI_UnsupportedModelVersionError",
                message: `Unsupported model version ${e.version} for provider "${e.provider}" and model "${e.modelId}". AI SDK 5 only supports models that implement specification version "v2".`,
            }),
                (this.version = e.version),
                (this.provider = e.provider),
                (this.modelId = e.modelId));
        }
    },
    ks = "AI_InvalidMessageRoleError",
    Is = `vercel.ai.error.${ks}`,
    Nh = Symbol.for(Is),
    Ss,
    Ph = class extends te {
        constructor({
            role: e,
            message: t = `Invalid message role: '${e}'. Must be one of: "system", "user", "assistant", "tool".`,
        }) {
            (super({ name: ks, message: t }), (this[Ss] = !0), (this.role = e));
        }
        static isInstance(e) {
            return te.hasMarker(e, Is);
        }
    };
Ss = Nh;
var Cs = "AI_RetryError",
    Es = `vercel.ai.error.${Cs}`,
    $h = Symbol.for(Es),
    Rs,
    fr = class extends te {
        constructor({ message: e, reason: t, errors: n }) {
            (super({ name: Cs, message: e }),
                (this[Rs] = !0),
                (this.reason = t),
                (this.errors = n),
                (this.lastError = n[n.length - 1]));
        }
        static isInstance(e) {
            return te.hasMarker(e, Es);
        }
    };
Rs = $h;
function _n(e) {
    if (typeof e != "string") {
        if (e.specificationVersion !== "v2")
            throw new Mh({ version: e.specificationVersion, provider: e.provider, modelId: e.modelId });
        return e;
    }
    return Dh().languageModel(e);
}
function Dh() {
    var e;
    return (e = globalThis.AI_SDK_DEFAULT_PROVIDER) != null ? e : $m;
}
var qh = [
        { mediaType: "image/gif", bytesPrefix: [71, 73, 70] },
        { mediaType: "image/png", bytesPrefix: [137, 80, 78, 71] },
        { mediaType: "image/jpeg", bytesPrefix: [255, 216] },
        { mediaType: "image/webp", bytesPrefix: [82, 73, 70, 70, null, null, null, null, 87, 69, 66, 80] },
        { mediaType: "image/bmp", bytesPrefix: [66, 77] },
        { mediaType: "image/tiff", bytesPrefix: [73, 73, 42, 0] },
        { mediaType: "image/tiff", bytesPrefix: [77, 77, 0, 42] },
        { mediaType: "image/avif", bytesPrefix: [0, 0, 0, 32, 102, 116, 121, 112, 97, 118, 105, 102] },
        { mediaType: "image/heic", bytesPrefix: [0, 0, 0, 32, 102, 116, 121, 112, 104, 101, 105, 99] },
    ],
    Uh = 18,
    Lh = 12,
    jh = 128 * 1024,
    Bh = jh + Lh;
function mr(e, t) {
    if (typeof e != "string") return e.length > t ? e.subarray(0, t) : e;
    const n = Math.ceil(t / 3) * 4,
        o = ro(e.substring(0, Math.min(e.length, n)));
    return o.length > t ? o.subarray(0, t) : o;
}
function Gh(e) {
    return e.length > 10 && e[0] === 73 && e[1] === 68 && e[2] === 51;
}
var Fh = (e) => {
    const t = ((e[6] & 127) << 21) | ((e[7] & 127) << 14) | ((e[8] & 127) << 7) | (e[9] & 127);
    return e.subarray(t + 10);
};
function Hh({ data: e, signatures: t }) {
    let n = mr(e, Uh);
    Gh(n) && (n = Fh(mr(e, Bh)));
    for (const o of t)
        if (n.length >= o.bytesPrefix.length && o.bytesPrefix.every((r, a) => r === null || n[a] === r))
            return o.mediaType;
}
var Os = "5.0.271",
    Vh = async ({ url: e, maxBytes: t, abortSignal: n }) => {
        var o;
        const r = e.toString();
        try {
            const a = vt({}, `ai-sdk/${Os}`, no()),
                l = await Ql({ url: r, headers: a, abortSignal: n });
            if (!l.ok) throw (await Xn(l), new qe({ url: r, statusCode: l.status, statusText: l.statusText }));
            return {
                data: await ti({ response: l, url: r, maxBytes: t ?? ei }),
                mediaType: (o = l.headers.get("content-type")) != null ? o : void 0,
            };
        } catch (a) {
            throw qe.isInstance(a) ? a : new qe({ url: r, cause: a });
        }
    },
    Jh =
        (e = Vh) =>
        (t) =>
            Promise.all(t.map(async (n) => (n.isUrlSupportedByModel ? null : e(n))));
function Wh(e) {
    try {
        const [t, n] = e.split(",");
        return { mediaType: t.split(";")[0].split(":")[1], base64Content: n };
    } catch {
        return { mediaType: void 0, base64Content: void 0 };
    }
}
var As = X([
    s(),
    un(Uint8Array),
    un(ArrayBuffer),
    gl(
        (e) => {
            var t, n;
            return (n = (t = globalThis.Buffer) == null ? void 0 : t.isBuffer(e)) != null ? n : !1;
        },
        { message: "Must be a Buffer" },
    ),
]);
function Ms(e) {
    if (e instanceof Uint8Array) return { data: e, mediaType: void 0 };
    if (e instanceof ArrayBuffer) return { data: new Uint8Array(e), mediaType: void 0 };
    if (typeof e == "string")
        try {
            e = new URL(e);
        } catch {}
    if (e instanceof URL && e.protocol === "data:") {
        const { mediaType: t, base64Content: n } = Wh(e.toString());
        if (t == null || n == null)
            throw new te({
                name: "InvalidDataContentError",
                message: `Invalid data URL format in content ${e.toString()}`,
            });
        return { data: n, mediaType: t };
    }
    return { data: e, mediaType: void 0 };
}
function Zh(e) {
    return typeof e == "string" ? e : e instanceof ArrayBuffer ? fn(new Uint8Array(e)) : fn(e);
}
async function Ns({ prompt: e, supportedUrls: t, download: n = Jh() }) {
    const o = await Kh(e.messages, n, t);
    return [
        ...(e.system != null ? [{ role: "system", content: e.system }] : []),
        ...e.messages.map((r) => zh({ message: r, downloadedAssets: o })),
    ];
}
function zh({ message: e, downloadedAssets: t }) {
    const n = e.role;
    switch (n) {
        case "system":
            return { role: "system", content: e.content, providerOptions: e.providerOptions };
        case "user":
            return typeof e.content == "string"
                ? { role: "user", content: [{ type: "text", text: e.content }], providerOptions: e.providerOptions }
                : {
                      role: "user",
                      content: e.content.map((o) => Yh(o, t)).filter((o) => o.type !== "text" || o.text !== ""),
                      providerOptions: e.providerOptions,
                  };
        case "assistant":
            return typeof e.content == "string"
                ? {
                      role: "assistant",
                      content: [{ type: "text", text: e.content }],
                      providerOptions: e.providerOptions,
                  }
                : {
                      role: "assistant",
                      content: e.content
                          .filter((o) => o.type !== "text" || o.text !== "" || o.providerOptions != null)
                          .map((o) => {
                              const r = o.providerOptions;
                              switch (o.type) {
                                  case "file": {
                                      const { data: a, mediaType: l } = Ms(o.data),
                                          i = Ps(o.data, a);
                                      return {
                                          type: "file",
                                          data: a,
                                          filename: o.filename,
                                          mediaType: l ?? o.mediaType,
                                          providerOptions: r,
                                          ...(i != null ? { originalUrl: i } : {}),
                                      };
                                  }
                                  case "reasoning":
                                      return { type: "reasoning", text: o.text, providerOptions: r };
                                  case "text":
                                      return { type: "text", text: o.text, providerOptions: r };
                                  case "tool-call":
                                      return {
                                          type: "tool-call",
                                          toolCallId: o.toolCallId,
                                          toolName: o.toolName,
                                          input: o.input,
                                          providerExecuted: o.providerExecuted,
                                          providerOptions: r,
                                      };
                                  case "tool-result":
                                      return {
                                          type: "tool-result",
                                          toolCallId: o.toolCallId,
                                          toolName: o.toolName,
                                          output: o.output,
                                          providerOptions: r,
                                      };
                              }
                          }),
                      providerOptions: e.providerOptions,
                  };
        case "tool":
            return {
                role: "tool",
                content: e.content.map((o) => ({
                    type: "tool-result",
                    toolCallId: o.toolCallId,
                    toolName: o.toolName,
                    output: o.output,
                    providerOptions: o.providerOptions,
                })),
                providerOptions: e.providerOptions,
            };
        default: {
            const o = n;
            throw new Ph({ role: o });
        }
    }
}
async function Kh(e, t, n) {
    const o = e
            .filter((a) => a.role === "user")
            .map((a) => a.content)
            .filter((a) => Array.isArray(a))
            .flat()
            .filter((a) => a.type === "image" || a.type === "file")
            .map((a) => {
                var l;
                const i = (l = a.mediaType) != null ? l : a.type === "image" ? "image/*" : void 0;
                let d = a.type === "image" ? a.image : a.data;
                if (typeof d == "string")
                    try {
                        d = new URL(d);
                    } catch {}
                return { mediaType: i, data: d };
            })
            .filter((a) => a.data instanceof URL)
            .map((a) => ({
                url: a.data,
                isUrlSupportedByModel:
                    a.mediaType != null && ru({ url: a.data.toString(), mediaType: a.mediaType, supportedUrls: n }),
            })),
        r = await t(o);
    return Object.fromEntries(
        r
            .map((a, l) => (a == null ? null : [o[l].url.toString(), { data: a.data, mediaType: a.mediaType }]))
            .filter((a) => a != null),
    );
}
function Ps(e, t) {
    return typeof e == "string" && t instanceof URL && t.toString() !== e ? e : void 0;
}
function Yh(e, t) {
    var n;
    if (e.type === "text") return { type: "text", text: e.text, providerOptions: e.providerOptions };
    let o;
    const r = e.type;
    switch (r) {
        case "image":
            o = e.image;
            break;
        case "file":
            o = e.data;
            break;
        default:
            throw new Error(`Unsupported part type: ${r}`);
    }
    const { data: a, mediaType: l } = Ms(o);
    let i = l ?? e.mediaType,
        d = a,
        c = Ps(o, a);
    if (d instanceof URL) {
        const p = t[d.toString()];
        p && ((d = p.data), i ?? (i = p.mediaType), (c = void 0));
    }
    switch (r) {
        case "image":
            return (
                (d instanceof Uint8Array || typeof d == "string") &&
                    (i = (n = Hh({ data: d, signatures: qh })) != null ? n : i),
                {
                    type: "file",
                    mediaType: i ?? "image/*",
                    filename: void 0,
                    data: d,
                    providerOptions: e.providerOptions,
                    ...(c != null ? { originalUrl: c } : {}),
                }
            );
        case "file": {
            if (i == null) throw new Error("Media type is missing for file part");
            return {
                type: "file",
                mediaType: i,
                filename: e.filename,
                data: d,
                providerOptions: e.providerOptions,
                ...(c != null ? { originalUrl: c } : {}),
            };
        }
    }
}
function Zn({
    maxOutputTokens: e,
    temperature: t,
    topP: n,
    topK: o,
    presencePenalty: r,
    frequencyPenalty: a,
    seed: l,
    stopSequences: i,
}) {
    if (e != null) {
        if (!Number.isInteger(e))
            throw new nt({ parameter: "maxOutputTokens", value: e, message: "maxOutputTokens must be an integer" });
        if (e < 1) throw new nt({ parameter: "maxOutputTokens", value: e, message: "maxOutputTokens must be >= 1" });
    }
    if (t != null && typeof t != "number")
        throw new nt({ parameter: "temperature", value: t, message: "temperature must be a number" });
    if (n != null && typeof n != "number")
        throw new nt({ parameter: "topP", value: n, message: "topP must be a number" });
    if (o != null && typeof o != "number")
        throw new nt({ parameter: "topK", value: o, message: "topK must be a number" });
    if (r != null && typeof r != "number")
        throw new nt({ parameter: "presencePenalty", value: r, message: "presencePenalty must be a number" });
    if (a != null && typeof a != "number")
        throw new nt({ parameter: "frequencyPenalty", value: a, message: "frequencyPenalty must be a number" });
    if (l != null && !Number.isInteger(l))
        throw new nt({ parameter: "seed", value: l, message: "seed must be an integer" });
    return {
        maxOutputTokens: e,
        temperature: t,
        topP: n,
        topK: o,
        presencePenalty: r,
        frequencyPenalty: a,
        stopSequences: i,
        seed: l,
    };
}
function Xh(e) {
    return e != null && Object.keys(e).length > 0;
}
function $s({ tools: e, toolChoice: t, activeTools: n }) {
    return Xh(e)
        ? {
              tools: (n != null ? Object.entries(e).filter(([r]) => n.includes(r)) : Object.entries(e)).map(
                  ([r, a]) => {
                      const l = a.type;
                      switch (l) {
                          case void 0:
                          case "dynamic":
                          case "function":
                              return {
                                  type: "function",
                                  name: r,
                                  description: a.description,
                                  inputSchema: vn(a.inputSchema).jsonSchema,
                                  providerOptions: a.providerOptions,
                              };
                          case "provider-defined":
                              return { type: "provider-defined", name: r, id: a.id, args: a.args };
                          default: {
                              const i = l;
                              throw new Error(`Unsupported tool type: ${i}`);
                          }
                      }
                  },
              ),
              toolChoice:
                  t == null
                      ? { type: "auto" }
                      : typeof t == "string"
                        ? { type: t }
                        : { type: "tool", toolName: t.toolName },
          }
        : { tools: void 0, toolChoice: void 0 };
}
var Xt = wr(() => X([_l(), s(), f(), ne(), we(s(), Xt.optional()), N(Xt)])),
    it = we(s(), we(s(), Xt)),
    Ds = u({ type: m("text"), text: s(), providerOptions: it.optional() }),
    Qh = u({ type: m("image"), image: X([As, un(URL)]), mediaType: s().optional(), providerOptions: it.optional() }),
    qs = u({
        type: m("file"),
        data: X([As, un(URL)]),
        filename: s().optional(),
        mediaType: s(),
        providerOptions: it.optional(),
    }),
    eg = u({ type: m("reasoning"), text: s(), providerOptions: it.optional() }),
    tg = u({
        type: m("tool-call"),
        toolCallId: s(),
        toolName: s(),
        input: Ue(),
        providerOptions: it.optional(),
        providerExecuted: ne().optional(),
    }),
    ng = ie("type", [
        u({ type: m("text"), value: s() }),
        u({ type: m("json"), value: Xt }),
        u({ type: m("error-text"), value: s() }),
        u({ type: m("error-json"), value: Xt }),
        u({
            type: m("content"),
            value: N(X([u({ type: m("text"), text: s() }), u({ type: m("media"), data: s(), mediaType: s() })])),
        }),
    ]),
    Us = u({ type: m("tool-result"), toolCallId: s(), toolName: s(), output: ng, providerOptions: it.optional() }),
    og = u({ role: m("system"), content: s(), providerOptions: it.optional() }),
    ag = u({ role: m("user"), content: X([s(), N(X([Ds, Qh, qs]))]), providerOptions: it.optional() }),
    rg = u({ role: m("assistant"), content: X([s(), N(X([Ds, qs, eg, tg, Us]))]), providerOptions: it.optional() }),
    ig = u({ role: m("tool"), content: N(Us), providerOptions: it.optional() }),
    sg = X([og, ag, rg, ig]);
async function Ls({ allowSystemInMessages: e, system: t, prompt: n, messages: o }) {
    if (n == null && o == null) throw new ht({ prompt: n, message: "prompt or messages must be defined" });
    if (n != null && o != null)
        throw new ht({ prompt: n, message: "prompt and messages cannot be defined at the same time" });
    if (t != null && typeof t != "string") throw new ht({ prompt: n, message: "system must be a string" });
    if (n != null && typeof n == "string") o = [{ role: "user", content: n }];
    else if (n != null && Array.isArray(n)) o = n;
    else if (o == null) throw new ht({ prompt: n, message: "prompt or messages must be defined" });
    if (o.length === 0) throw new ht({ prompt: n, message: "messages must not be empty" });
    if (o.some((a) => a.role === "system")) {
        if (e === !1)
            throw new ht({
                prompt: n,
                message:
                    "System messages are not allowed in the prompt or messages fields. Use the system option instead.",
            });
        e === void 0 &&
            console.warn(
                "AI SDK Warning: System messages in the prompt or messages fields can be a security risk because they may enable prompt injection attacks. Use the system option instead when possible. Set allowSystemInMessages to true to suppress this warning, or false to throw an error.",
            );
    }
    const r = await at({ value: o, schema: N(sg) });
    if (!r.success)
        throw new ht({
            prompt: n,
            message:
                "The messages must be a ModelMessage[]. If you have passed a UIMessage[], you can use convertToModelMessages to convert them.",
            cause: r.error,
        });
    return { messages: o, system: t };
}
function js(e) {
    if (!lo.isInstance(e)) return e;
    const t = (process == null ? void 0 : "production") === "production",
        n = "https://v5.ai-sdk.dev/unauthenticated-ai-gateway";
    return t
        ? new te({
              name: "GatewayError",
              message: `Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module. Learn more: ${n}`,
          })
        : Object.assign(
              new Error(`\x1B[1m\x1B[31mUnauthenticated request to AI Gateway.\x1B[0m

To authenticate, set the \x1B[33mAI_GATEWAY_API_KEY\x1B[0m environment variable with your API key.

Alternatively, you can use a provider module instead of the AI Gateway.

Learn more: \x1B[34m${n}\x1B[0m

`),
              { name: "GatewayAuthenticationError" },
          );
}
function At({ operationId: e, telemetry: t }) {
    return {
        "operation.name": `${e}${t?.functionId != null ? ` ${t.functionId}` : ""}`,
        "resource.name": t?.functionId,
        "ai.operationId": e,
        "ai.telemetry.functionId": t?.functionId,
    };
}
function go(e) {
    var t;
    return Object.entries((t = e?.metadata) != null ? t : {}).reduce(
        (n, [o, r]) => ((n[`ai.telemetry.metadata.${o}`] = r), n),
        {},
    );
}
function Bs({ model: e, settings: t, telemetry: n, headers: o }) {
    return {
        "ai.model.provider": e.provider,
        "ai.model.id": e.modelId,
        ...Object.entries(t).reduce((r, [a, l]) => ((r[`ai.settings.${a}`] = l), r), {}),
        ...go(n),
        ...Object.entries(o ?? {}).reduce((r, [a, l]) => (l !== void 0 && (r[`ai.request.headers.${a}`] = l), r), {}),
    };
}
var lg = {
        startSpan() {
            return sn;
        },
        startActiveSpan(e, t, n, o) {
            if (typeof t == "function") return t(sn);
            if (typeof n == "function") return n(sn);
            if (typeof o == "function") return o(sn);
        },
    },
    sn = {
        spanContext() {
            return ug;
        },
        setAttribute() {
            return this;
        },
        setAttributes() {
            return this;
        },
        addEvent() {
            return this;
        },
        addLink() {
            return this;
        },
        addLinks() {
            return this;
        },
        setStatus() {
            return this;
        },
        updateName() {
            return this;
        },
        end() {
            return this;
        },
        isRecording() {
            return !1;
        },
        recordException() {
            return this;
        },
    },
    ug = { traceId: "", spanId: "", traceFlags: 0 };
function Gs({ isEnabled: e = !1, tracer: t } = {}) {
    return e ? t || yh.getTracer("ai") : lg;
}
function Mt({ name: e, tracer: t, attributes: n, fn: o, endWhenDone: r = !0, endOnError: a = r }) {
    return t.startActiveSpan(e, { attributes: n }, async (l) => {
        try {
            const i = await o(l);
            return (r && l.end(), i);
        } catch (i) {
            try {
                _o(l, i);
            } finally {
                a && l.end();
            }
            throw i;
        }
    });
}
function _o(e, t) {
    t instanceof Error
        ? (e.recordException({ name: t.name, message: t.message, stack: t.stack }),
          e.setStatus({ code: gn.ERROR, message: t.message }))
        : e.setStatus({ code: gn.ERROR });
}
function Je({ telemetry: e, attributes: t }) {
    return e?.isEnabled !== !0
        ? {}
        : Object.entries(t).reduce((n, [o, r]) => {
              if (r == null) return n;
              if (typeof r == "object" && "input" in r && typeof r.input == "function") {
                  if (e?.recordInputs === !1) return n;
                  const a = r.input();
                  return a == null ? n : { ...n, [o]: a };
              }
              if (typeof r == "object" && "output" in r && typeof r.output == "function") {
                  if (e?.recordOutputs === !1) return n;
                  const a = r.output();
                  return a == null ? n : { ...n, [o]: a };
              }
              return { ...n, [o]: r };
          }, {});
}
function Fs(e) {
    return JSON.stringify(
        e.map((t) => ({
            ...t,
            content:
                typeof t.content == "string"
                    ? t.content
                    : t.content.map((n) =>
                          n.type === "file" ? { ...n, data: n.data instanceof Uint8Array ? Zh(n.data) : n.data } : n,
                      ),
        })),
    );
}
function Hs(e, t) {
    return {
        inputTokens: Ft(e.inputTokens, t.inputTokens),
        outputTokens: Ft(e.outputTokens, t.outputTokens),
        totalTokens: Ft(e.totalTokens, t.totalTokens),
        reasoningTokens: Ft(e.reasoningTokens, t.reasoningTokens),
        cachedInputTokens: Ft(e.cachedInputTokens, t.cachedInputTokens),
    };
}
function Ft(e, t) {
    return e == null && t == null ? void 0 : (e ?? 0) + (t ?? 0);
}
function yn(e) {
    return e === void 0 ? [] : Array.isArray(e) ? e : [e];
}
function cg({ error: e, exponentialBackoffDelay: t }) {
    const n = _e.isInstance(e) ? e.responseHeaders : _e.isInstance(e.cause) ? e.cause.responseHeaders : void 0;
    if (!n) return t;
    let o;
    const r = n["retry-after-ms"];
    if (r) {
        const l = parseFloat(r);
        Number.isNaN(l) || (o = l);
    }
    const a = n["retry-after"];
    if (a && o === void 0) {
        const l = parseFloat(a);
        Number.isNaN(l) ? (o = Date.parse(a) - Date.now()) : (o = l * 1e3);
    }
    return o != null && !Number.isNaN(o) && 0 <= o && (o < 60 * 1e3 || o < t) ? o : t;
}
var dg =
    ({
        maxRetries: e = 2,
        initialDelayInMs: t = 2e3,
        backoffFactor: n = 2,
        abortSignal: o,
        additionalRetryableError: r,
    } = {}) =>
    async (a) =>
        Vs(a, { maxRetries: e, delayInMs: t, backoffFactor: n, abortSignal: o, additionalRetryableError: r });
async function Vs(
    e,
    { maxRetries: t, delayInMs: n, backoffFactor: o, abortSignal: r, additionalRetryableError: a },
    l = [],
) {
    try {
        return await e();
    } catch (i) {
        if (_t(i) || t === 0) throw i;
        const d = Ye(i),
            c = [...l, i],
            p = c.length;
        if (p > t)
            throw new fr({
                message: `Failed after ${p} attempts. Last error: ${d}`,
                reason: "maxRetriesExceeded",
                errors: c,
            });
        if (
            ((i instanceof Error &&
                ((_e.isInstance(i) && i.isRetryable === !0) || (Oe.isInstance(i) && i.isRetryable === !0))) ||
                a?.(i) === !0) &&
            p <= t
        )
            return (
                await Ul(cg({ error: i, exponentialBackoffDelay: n }), { abortSignal: r }),
                Vs(
                    e,
                    { maxRetries: t, delayInMs: o * n, backoffFactor: o, abortSignal: r, additionalRetryableError: a },
                    c,
                )
            );
        throw p === 1
            ? i
            : new fr({
                  message: `Failed after ${p} attempts with non-retryable error: '${d}'`,
                  reason: "errorNotRetryable",
                  errors: c,
              });
    }
}
function Js({ maxRetries: e, abortSignal: t, additionalRetryableError: n }) {
    if (e != null) {
        if (!Number.isInteger(e))
            throw new nt({ parameter: "maxRetries", value: e, message: "maxRetries must be an integer" });
        if (e < 0) throw new nt({ parameter: "maxRetries", value: e, message: "maxRetries must be >= 0" });
    }
    const o = e ?? 2;
    return { maxRetries: o, retry: dg({ maxRetries: o, abortSignal: t, additionalRetryableError: n }) };
}
function hr(e) {
    const t = e.filter((n) => n.type === "text");
    if (t.length !== 0) return t.map((n) => n.text).join("");
}
function Ws({ tools: e, activeTools: t }) {
    return e == null || t == null ? e : Object.fromEntries(Object.entries(e).filter(([n]) => t.includes(n)));
}
var Zs = class {
        constructor({ data: e, mediaType: t }) {
            const n = e instanceof Uint8Array;
            ((this.base64Data = n ? void 0 : e), (this.uint8ArrayData = n ? e : void 0), (this.mediaType = t));
        }
        get base64() {
            return (this.base64Data == null && (this.base64Data = fn(this.uint8ArrayData)), this.base64Data);
        }
        get uint8Array() {
            return (this.uint8ArrayData == null && (this.uint8ArrayData = ro(this.base64Data)), this.uint8ArrayData);
        }
    },
    pg = class extends Zs {
        constructor() {
            (super(...arguments), (this.type = "file"));
        }
    };
function zs(e) {
    return e === "stop" || e === "tool-calls";
}
async function Ks({ toolCall: e, tools: t, repairToolCall: n, system: o, messages: r }) {
    try {
        if (t == null) {
            if (e.providerExecuted) return await Ys(e);
            throw new Wn({ toolName: e.toolName });
        }
        try {
            return await gr({ toolCall: e, tools: t });
        } catch (a) {
            if (n == null || !(Wn.isInstance(a) || ho.isInstance(a))) throw a;
            let l = null;
            try {
                l = await n({
                    toolCall: e,
                    tools: t,
                    inputSchema: ({ toolName: i }) => {
                        const { inputSchema: d } = t[i];
                        return vn(d).jsonSchema;
                    },
                    system: o,
                    messages: r,
                    error: a,
                });
            } catch (i) {
                throw new Ah({ cause: i, originalError: a });
            }
            if (l == null) throw a;
            return await gr({ toolCall: l, tools: t });
        }
    } catch (a) {
        const l = await yt({ text: e.input }),
            i = l.success ? l.value : e.input;
        return {
            type: "tool-call",
            toolCallId: e.toolCallId,
            toolName: e.toolName,
            input: i,
            dynamic: !0,
            invalid: !0,
            error: a,
            providerMetadata: e.providerMetadata,
        };
    }
}
async function Ys(e) {
    const t = e.input.trim() === "" ? { success: !0, value: {} } : await yt({ text: e.input });
    if (t.success === !1) throw new ho({ toolName: e.toolName, toolInput: e.input, cause: t.error });
    return {
        type: "tool-call",
        toolCallId: e.toolCallId,
        toolName: e.toolName,
        input: t.value,
        providerExecuted: !0,
        dynamic: !0,
        providerMetadata: e.providerMetadata,
    };
}
async function gr({ toolCall: e, tools: t }) {
    const n = e.toolName,
        o = t[n];
    if (o == null) {
        if (e.providerExecuted) return await Ys(e);
        throw new Wn({ toolName: e.toolName, availableTools: Object.keys(t) });
    }
    const r = vn(o.inputSchema),
        a = e.input.trim() === "" ? await at({ value: {}, schema: r }) : await yt({ text: e.input, schema: r });
    if (a.success === !1) throw new ho({ toolName: n, toolInput: e.input, cause: a.error });
    return o.type === "dynamic"
        ? {
              type: "tool-call",
              toolCallId: e.toolCallId,
              toolName: e.toolName,
              input: a.value,
              providerExecuted: e.providerExecuted,
              providerMetadata: e.providerMetadata,
              dynamic: !0,
          }
        : {
              type: "tool-call",
              toolCallId: e.toolCallId,
              toolName: n,
              input: a.value,
              providerExecuted: e.providerExecuted,
              providerMetadata: e.providerMetadata,
          };
}
var Xs = class {
    constructor({ content: e, finishReason: t, usage: n, warnings: o, request: r, response: a, providerMetadata: l }) {
        ((this.content = e),
            (this.finishReason = t),
            (this.usage = n),
            (this.warnings = o),
            (this.request = r),
            (this.response = a),
            (this.providerMetadata = l));
    }
    get text() {
        return this.content
            .filter((e) => e.type === "text")
            .map((e) => e.text)
            .join("");
    }
    get reasoning() {
        return this.content.filter((e) => e.type === "reasoning");
    }
    get reasoningText() {
        return this.reasoning.length === 0 ? void 0 : this.reasoning.map((e) => e.text).join("");
    }
    get files() {
        return this.content.filter((e) => e.type === "file").map((e) => e.file);
    }
    get sources() {
        return this.content.filter((e) => e.type === "source");
    }
    get toolCalls() {
        return this.content.filter((e) => e.type === "tool-call");
    }
    get staticToolCalls() {
        return this.toolCalls.filter((e) => e.dynamic !== !0);
    }
    get dynamicToolCalls() {
        return this.toolCalls.filter((e) => e.dynamic === !0);
    }
    get toolResults() {
        return this.content.filter((e) => e.type === "tool-result");
    }
    get staticToolResults() {
        return this.toolResults.filter((e) => e.dynamic !== !0);
    }
    get dynamicToolResults() {
        return this.toolResults.filter((e) => e.dynamic === !0);
    }
};
function Qs(e) {
    return ({ steps: t }) => t.length === e;
}
async function el({ stopConditions: e, steps: t }) {
    return (await Promise.all(e.map((n) => n({ steps: t })))).some((n) => n);
}
function jn({ output: e, tool: t, errorMode: n }) {
    return n === "text"
        ? { type: "error-text", value: Qt(e) }
        : n === "json"
          ? { type: "error-json", value: _r(e) }
          : t?.toModelOutput
            ? t.toModelOutput(e)
            : typeof e == "string"
              ? { type: "text", value: e }
              : { type: "json", value: _r(e) };
}
function _r(e) {
    return e === void 0 ? null : e;
}
function zn({ content: e, tools: t }) {
    const n = [],
        o = e
            .filter((a) => a.type !== "source")
            .filter(
                (a) =>
                    (a.type !== "tool-result" || a.providerExecuted) && (a.type !== "tool-error" || a.providerExecuted),
            )
            .filter((a) => a.type !== "text" || a.text.length > 0)
            .map((a) => {
                switch (a.type) {
                    case "text":
                        return { type: "text", text: a.text, providerOptions: a.providerMetadata };
                    case "reasoning":
                        return { type: "reasoning", text: a.text, providerOptions: a.providerMetadata };
                    case "file":
                        return {
                            type: "file",
                            data: a.file.base64,
                            mediaType: a.file.mediaType,
                            providerOptions: a.providerMetadata,
                        };
                    case "tool-call":
                        return {
                            type: "tool-call",
                            toolCallId: a.toolCallId,
                            toolName: a.toolName,
                            input: a.input,
                            providerExecuted: a.providerExecuted,
                            providerOptions: a.providerMetadata,
                        };
                    case "tool-result":
                        return {
                            type: "tool-result",
                            toolCallId: a.toolCallId,
                            toolName: a.toolName,
                            output: jn({ tool: t?.[a.toolName], output: a.output, errorMode: "none" }),
                            providerExecuted: !0,
                            providerOptions: a.providerMetadata,
                        };
                    case "tool-error":
                        return {
                            type: "tool-result",
                            toolCallId: a.toolCallId,
                            toolName: a.toolName,
                            output: jn({ tool: t?.[a.toolName], output: a.error, errorMode: "json" }),
                            providerOptions: a.providerMetadata,
                        };
                }
            });
    o.length > 0 && n.push({ role: "assistant", content: o });
    const r = e
        .filter((a) => a.type === "tool-result" || a.type === "tool-error")
        .filter((a) => !a.providerExecuted)
        .map((a) => ({
            type: "tool-result",
            toolCallId: a.toolCallId,
            toolName: a.toolName,
            output: jn({
                tool: t?.[a.toolName],
                output: a.type === "tool-result" ? a.output : a.error,
                errorMode: a.type === "tool-error" ? "text" : "none",
            }),
            ...(a.providerMetadata != null ? { providerOptions: a.providerMetadata } : {}),
        }));
    return (r.length > 0 && n.push({ role: "tool", content: r }), n);
}
var fg = en({ prefix: "aitxt", size: 24 });
async function mg({
    model: e,
    tools: t,
    toolChoice: n,
    system: o,
    prompt: r,
    messages: a,
    allowSystemInMessages: l,
    maxRetries: i,
    abortSignal: d,
    headers: c,
    stopWhen: p = Qs(1),
    experimental_output: w,
    experimental_telemetry: y,
    providerOptions: k,
    experimental_activeTools: x,
    activeTools: I = x,
    experimental_prepareStep: S,
    prepareStep: R = S,
    experimental_repairToolCall: P,
    experimental_download: O,
    experimental_context: C,
    _internal: { generateId: h = fg, currentDate: g = () => new Date() } = {},
    onStepFinish: v,
    ...M
}) {
    const _ = _n(e),
        E = yn(p),
        { maxRetries: b, retry: A } = Js({ maxRetries: i, abortSignal: d }),
        U = Zn(M),
        L = vt(c ?? {}, `ai/${Os}`),
        j = Bs({ model: _, telemetry: y, headers: L, settings: { ...U, maxRetries: b } }),
        B = await Ls({ system: o, prompt: r, messages: a, allowSystemInMessages: l }),
        $ = Gs(y);
    try {
        return await Mt({
            name: "ai.generateText",
            attributes: Je({
                telemetry: y,
                attributes: {
                    ...At({ operationId: "ai.generateText", telemetry: y }),
                    ...j,
                    "ai.model.provider": _.provider,
                    "ai.model.id": _.modelId,
                    "ai.prompt": { input: () => JSON.stringify({ system: o, prompt: r, messages: a }) },
                },
            }),
            tracer: $,
            fn: async (H) => {
                var de, ee, Q, V, le, ce, pe;
                const he = Zn(M);
                let re,
                    z = [],
                    D = [];
                const F = [],
                    q = [];
                do {
                    q.length > 0 && d?.throwIfAborted();
                    const xe = [...B.messages, ...F],
                        W = await R?.({ model: _, steps: q, stepNumber: q.length, messages: xe }),
                        ue = _n((de = W?.model) != null ? de : _),
                        be = await Ns({
                            prompt: {
                                system: (ee = W?.system) != null ? ee : B.system,
                                messages: (Q = W?.messages) != null ? Q : xe,
                            },
                            supportedUrls: await ue.supportedUrls,
                            download: O,
                        }),
                        Te = (V = W?.activeTools) != null ? V : I,
                        se = Ws({ tools: t, activeTools: Te }),
                        { toolChoice: $e, tools: st } = $s({
                            tools: t,
                            toolChoice: (le = W?.toolChoice) != null ? le : n,
                            activeTools: Te,
                        });
                    re = await A(() => {
                        var me;
                        return Mt({
                            name: "ai.generateText.doGenerate",
                            attributes: Je({
                                telemetry: y,
                                attributes: {
                                    ...At({ operationId: "ai.generateText.doGenerate", telemetry: y }),
                                    ...j,
                                    "ai.model.provider": ue.provider,
                                    "ai.model.id": ue.modelId,
                                    "ai.prompt.messages": { input: () => Fs(be) },
                                    "ai.prompt.tools": { input: () => st?.map((He) => JSON.stringify(He)) },
                                    "ai.prompt.toolChoice": { input: () => ($e != null ? JSON.stringify($e) : void 0) },
                                    "gen_ai.system": ue.provider,
                                    "gen_ai.request.model": ue.modelId,
                                    "gen_ai.request.frequency_penalty": M.frequencyPenalty,
                                    "gen_ai.request.max_tokens": M.maxOutputTokens,
                                    "gen_ai.request.presence_penalty": M.presencePenalty,
                                    "gen_ai.request.stop_sequences": M.stopSequences,
                                    "gen_ai.request.temperature": (me = M.temperature) != null ? me : void 0,
                                    "gen_ai.request.top_k": M.topK,
                                    "gen_ai.request.top_p": M.topP,
                                },
                            }),
                            tracer: $,
                            fn: async (He) => {
                                var kt, je, lt, Dt, qt, pt, It, St;
                                const Ae = await ue.doGenerate({
                                        ...he,
                                        tools: st,
                                        toolChoice: $e,
                                        responseFormat: w?.responseFormat,
                                        prompt: be,
                                        providerOptions: k,
                                        abortSignal: d,
                                        headers: L,
                                    }),
                                    ut = {
                                        id: (je = (kt = Ae.response) == null ? void 0 : kt.id) != null ? je : h(),
                                        timestamp:
                                            (Dt = (lt = Ae.response) == null ? void 0 : lt.timestamp) != null
                                                ? Dt
                                                : g(),
                                        modelId:
                                            (pt = (qt = Ae.response) == null ? void 0 : qt.modelId) != null
                                                ? pt
                                                : ue.modelId,
                                        headers: (It = Ae.response) == null ? void 0 : It.headers,
                                        body: (St = Ae.response) == null ? void 0 : St.body,
                                    };
                                return (
                                    He.setAttributes(
                                        Je({
                                            telemetry: y,
                                            attributes: {
                                                "ai.response.finishReason": Ae.finishReason,
                                                "ai.response.text": { output: () => hr(Ae.content) },
                                                "ai.response.toolCalls": {
                                                    output: () => {
                                                        const Ut = yr(Ae.content);
                                                        return Ut == null ? void 0 : JSON.stringify(Ut);
                                                    },
                                                },
                                                "ai.response.id": ut.id,
                                                "ai.response.model": ut.modelId,
                                                "ai.response.timestamp": ut.timestamp.toISOString(),
                                                "ai.response.providerMetadata": JSON.stringify(Ae.providerMetadata),
                                                "ai.usage.promptTokens": Ae.usage.inputTokens,
                                                "ai.usage.completionTokens": Ae.usage.outputTokens,
                                                "gen_ai.response.finish_reasons": [Ae.finishReason],
                                                "gen_ai.response.id": ut.id,
                                                "gen_ai.response.model": ut.modelId,
                                                "gen_ai.usage.input_tokens": Ae.usage.inputTokens,
                                                "gen_ai.usage.output_tokens": Ae.usage.outputTokens,
                                            },
                                        }),
                                    ),
                                    { ...Ae, response: ut }
                                );
                            },
                        });
                    });
                    const Z = await Promise.all(
                        re.content
                            .filter((me) => me.type === "tool-call")
                            .map((me) => Ks({ toolCall: me, tools: se, repairToolCall: P, system: o, messages: xe })),
                    );
                    for (const me of Z) {
                        if (me.invalid) continue;
                        const He = se[me.toolName];
                        (He.onInputStart != null &&
                            (await He.onInputStart({
                                toolCallId: me.toolCallId,
                                messages: xe,
                                abortSignal: d,
                                experimental_context: C,
                            })),
                            He?.onInputAvailable != null &&
                                (await He.onInputAvailable({
                                    input: me.input,
                                    toolCallId: me.toolCallId,
                                    messages: xe,
                                    abortSignal: d,
                                    experimental_context: C,
                                })));
                    }
                    const ge = Z.filter((me) => me.invalid && me.dynamic);
                    D = [];
                    for (const me of ge)
                        D.push({
                            type: "tool-error",
                            toolCallId: me.toolCallId,
                            toolName: me.toolName,
                            input: me.input,
                            error: Ye(me.error),
                            dynamic: !0,
                        });
                    ((z = Z.filter((me) => !me.providerExecuted)),
                        se != null &&
                            zs(re.finishReason) &&
                            D.push(
                                ...(await hg({
                                    toolCalls: z.filter((me) => !me.invalid),
                                    tools: se,
                                    tracer: $,
                                    telemetry: y,
                                    messages: xe,
                                    abortSignal: d,
                                    experimental_context: C,
                                })),
                            ));
                    const dt = _g({ content: re.content, toolCalls: Z, toolOutputs: D });
                    F.push(...zn({ content: dt, tools: se }));
                    const $t = new Xs({
                        content: dt,
                        finishReason: re.finishReason,
                        usage: re.usage,
                        warnings: re.warnings,
                        providerMetadata: re.providerMetadata,
                        request: (ce = re.request) != null ? ce : {},
                        response: { ...re.response, messages: structuredClone(F) },
                    });
                    (rs((pe = re.warnings) != null ? pe : []), q.push($t), await v?.($t));
                } while (z.length > 0 && D.length === z.length && !(await el({ stopConditions: E, steps: q })));
                H.setAttributes(
                    Je({
                        telemetry: y,
                        attributes: {
                            "ai.response.finishReason": re.finishReason,
                            "ai.response.text": { output: () => hr(re.content) },
                            "ai.response.toolCalls": {
                                output: () => {
                                    const xe = yr(re.content);
                                    return xe == null ? void 0 : JSON.stringify(xe);
                                },
                            },
                            "ai.response.providerMetadata": JSON.stringify(re.providerMetadata),
                            "ai.usage.promptTokens": re.usage.inputTokens,
                            "ai.usage.completionTokens": re.usage.outputTokens,
                        },
                    }),
                );
                const T = q[q.length - 1];
                let Y;
                return (
                    T.finishReason === "stop" &&
                        (Y = await w?.parseOutput(
                            { text: T.text },
                            { response: T.response, usage: T.usage, finishReason: T.finishReason },
                        )),
                    new gg({ steps: q, resolvedOutput: Y })
                );
            },
        });
    } catch (H) {
        throw js(H);
    }
}
async function hg({
    toolCalls: e,
    tools: t,
    tracer: n,
    telemetry: o,
    messages: r,
    abortSignal: a,
    experimental_context: l,
}) {
    return (
        await Promise.all(
            e.map(async ({ toolCallId: d, toolName: c, input: p }) => {
                const w = t[c];
                if (w?.execute != null)
                    return Mt({
                        name: "ai.toolCall",
                        attributes: Je({
                            telemetry: o,
                            attributes: {
                                ...At({ operationId: "ai.toolCall", telemetry: o }),
                                ...go(o),
                                "ai.toolCall.name": c,
                                "ai.toolCall.id": d,
                                "ai.toolCall.args": { output: () => JSON.stringify(p) },
                            },
                        }),
                        tracer: n,
                        fn: async (y) => {
                            try {
                                const k = ci({
                                    execute: w.execute.bind(w),
                                    input: p,
                                    options: { toolCallId: d, messages: r, abortSignal: a, experimental_context: l },
                                });
                                let x;
                                for await (const I of k) I.type === "final" && (x = I.output);
                                try {
                                    y.setAttributes(
                                        Je({
                                            telemetry: o,
                                            attributes: { "ai.toolCall.result": { output: () => JSON.stringify(x) } },
                                        }),
                                    );
                                } catch {}
                                return {
                                    type: "tool-result",
                                    toolCallId: d,
                                    toolName: c,
                                    input: p,
                                    output: x,
                                    dynamic: w.type === "dynamic",
                                };
                            } catch (k) {
                                return (
                                    _o(y, k),
                                    {
                                        type: "tool-error",
                                        toolCallId: d,
                                        toolName: c,
                                        input: p,
                                        error: k,
                                        dynamic: w.type === "dynamic",
                                    }
                                );
                            }
                        },
                    });
            }),
        )
    ).filter((d) => d != null);
}
var gg = class {
    constructor(e) {
        ((this.steps = e.steps), (this.resolvedOutput = e.resolvedOutput));
    }
    get finalStep() {
        return this.steps[this.steps.length - 1];
    }
    get content() {
        return this.finalStep.content;
    }
    get text() {
        return this.finalStep.text;
    }
    get files() {
        return this.finalStep.files;
    }
    get reasoningText() {
        return this.finalStep.reasoningText;
    }
    get reasoning() {
        return this.finalStep.reasoning;
    }
    get toolCalls() {
        return this.finalStep.toolCalls;
    }
    get staticToolCalls() {
        return this.finalStep.staticToolCalls;
    }
    get dynamicToolCalls() {
        return this.finalStep.dynamicToolCalls;
    }
    get toolResults() {
        return this.finalStep.toolResults;
    }
    get staticToolResults() {
        return this.finalStep.staticToolResults;
    }
    get dynamicToolResults() {
        return this.finalStep.dynamicToolResults;
    }
    get sources() {
        return this.finalStep.sources;
    }
    get finishReason() {
        return this.finalStep.finishReason;
    }
    get warnings() {
        return this.finalStep.warnings;
    }
    get providerMetadata() {
        return this.finalStep.providerMetadata;
    }
    get response() {
        return this.finalStep.response;
    }
    get request() {
        return this.finalStep.request;
    }
    get usage() {
        return this.finalStep.usage;
    }
    get totalUsage() {
        return this.steps.reduce((e, t) => Hs(e, t.usage), {
            inputTokens: void 0,
            outputTokens: void 0,
            totalTokens: void 0,
            reasoningTokens: void 0,
            cachedInputTokens: void 0,
        });
    }
    get experimental_output() {
        if (this.resolvedOutput == null) throw new as();
        return this.resolvedOutput;
    }
};
function yr(e) {
    const t = e.filter((n) => n.type === "tool-call");
    if (t.length !== 0) return t.map((n) => ({ toolCallId: n.toolCallId, toolName: n.toolName, input: n.input }));
}
function _g({ content: e, toolCalls: t, toolOutputs: n }) {
    return [
        ...e.map((o) => {
            switch (o.type) {
                case "text":
                case "reasoning":
                case "source":
                    return o;
                case "file":
                    return { type: "file", file: new Zs(o) };
                case "tool-call":
                    return t.find((r) => r.toolCallId === o.toolCallId);
                case "tool-result": {
                    const r = t.find((a) => a.toolCallId === o.toolCallId);
                    if (r == null) throw new Error(`Tool call ${o.toolCallId} not found.`);
                    return o.isError
                        ? {
                              type: "tool-error",
                              toolCallId: o.toolCallId,
                              toolName: o.toolName,
                              input: r.input,
                              error: o.result,
                              providerExecuted: !0,
                              dynamic: r.dynamic,
                          }
                        : {
                              type: "tool-result",
                              toolCallId: o.toolCallId,
                              toolName: o.toolName,
                              input: r.input,
                              output: o.result,
                              providerExecuted: !0,
                              dynamic: r.dynamic,
                          };
                }
            }
        }),
        ...n,
    ];
}
function wn(e, t) {
    const n = new Headers(e ?? {});
    for (const [o, r] of Object.entries(t)) n.has(o) || n.set(o, r);
    return n;
}
function yg({ status: e, statusText: t, headers: n, textStream: o }) {
    return new Response(o.pipeThrough(new TextEncoderStream()), {
        status: e ?? 200,
        statusText: t,
        headers: wn(n, { "content-type": "text/plain; charset=utf-8" }),
    });
}
function tl({ response: e, status: t, statusText: n, headers: o, stream: r }) {
    const a = t ?? 200;
    n !== void 0 ? e.writeHead(a, n, o) : e.writeHead(a, o);
    const l = r.getReader();
    let i = !1,
        d;
    const c = () => {
        e.writableFinished || ((i = !0), d?.(), l.cancel(new Error("Client disconnected.")).catch(() => {}));
    };
    return (
        e.once("close", c),
        e.destroyed && c(),
        (async () => {
            try {
                for (;;) {
                    const { done: w, value: y } = await l.read();
                    if (w || i || e.destroyed) break;
                    e.write(y) ||
                        (await new Promise((x) => {
                            ((d = x), e.once("drain", x));
                        }),
                        (d = void 0));
                }
            } finally {
                (e.off("close", c), i || e.destroyed ? l.cancel().catch(() => {}) : e.end());
            }
        })()
    );
}
function vg({ response: e, status: t, statusText: n, headers: o, textStream: r }) {
    return tl({
        response: e,
        status: t,
        statusText: n,
        headers: Object.fromEntries(wn(o, { "content-type": "text/plain; charset=utf-8" }).entries()),
        stream: r.pipeThrough(new TextEncoderStream()),
    });
}
var bg = `: stream-open

`,
    wg = `: keep-alive

`;
function nl({ stream: e, keepAliveMs: t }) {
    if (t == null) return e;
    if (!Number.isFinite(t) || t <= 0 || t > 2147483647)
        throw new Error("keepAliveMs must be a positive finite timer duration no greater than 2147483647");
    const n = e.getReader();
    let o,
        r = !1;
    const a = () => {
            (clearTimeout(o), (o = void 0));
        },
        l = (i) => {
            (a(),
                (o = setTimeout(() => {
                    r || (i.desiredSize != null && i.desiredSize > 0 && i.enqueue(wg), l(i));
                }, t)));
        };
    return new ReadableStream({
        start(i) {
            (i.enqueue(bg), l(i));
        },
        pull(i) {
            return n.read().then(
                (d) => {
                    (a(), !r && (d.done ? i.close() : (i.enqueue(d.value), l(i))));
                },
                (d) => {
                    if ((a(), !r)) throw d;
                },
            );
        },
        async cancel(i) {
            ((r = !0), a(), await n.cancel(i));
        },
    });
}
var ol = class extends TransformStream {
        constructor() {
            super({
                transform(e, t) {
                    t.enqueue(`data: ${JSON.stringify(e)}

`);
                },
                flush(e) {
                    e.enqueue(`data: [DONE]

`);
                },
            });
        }
    },
    al = {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
        "x-accel-buffering": "no",
    };
function xg({ status: e, statusText: t, headers: n, stream: o, keepAliveMs: r, consumeSseStream: a }) {
    let l = nl({ stream: o.pipeThrough(new ol()), keepAliveMs: r });
    if (a) {
        const [i, d] = l.tee();
        ((l = i), a({ stream: d }));
    }
    return new Response(l.pipeThrough(new TextEncoderStream()), { status: e, statusText: t, headers: wn(n, al) });
}
function Tg({ originalMessages: e, responseMessageId: t }) {
    if (e == null) return;
    const n = e[e.length - 1];
    return n?.role === "assistant" ? n.id : typeof t == "function" ? t() : t;
}
function kg(e) {
    return e.type.startsWith("data-");
}
function Ke() {
    return Object.create(null);
}
function rl(e, t) {
    if (e === void 0 && t === void 0) return;
    if (e === void 0) return t;
    if (t === void 0) return e;
    const n = { ...e };
    for (const o in t)
        if (
            !(o === "__proto__" || o === "constructor" || o === "prototype") &&
            Object.prototype.hasOwnProperty.call(t, o)
        ) {
            const r = t[o];
            if (r === void 0) continue;
            const a = o in e ? e[o] : void 0,
                l =
                    r !== null &&
                    typeof r == "object" &&
                    !Array.isArray(r) &&
                    !(r instanceof Date) &&
                    !(r instanceof RegExp),
                i =
                    a != null &&
                    typeof a == "object" &&
                    !Array.isArray(a) &&
                    !(a instanceof Date) &&
                    !(a instanceof RegExp);
            l && i ? (n[o] = rl(a, r)) : (n[o] = r);
        }
    return n;
}
function Ig(e) {
    const t = ["ROOT"];
    let n = -1,
        o = null;
    function r(d, c, p) {
        switch (d) {
            case '"': {
                ((n = c), t.pop(), t.push(p), t.push("INSIDE_STRING"));
                break;
            }
            case "f":
            case "t":
            case "n": {
                ((n = c), (o = c), t.pop(), t.push(p), t.push("INSIDE_LITERAL"));
                break;
            }
            case "-": {
                (t.pop(), t.push(p), t.push("INSIDE_NUMBER"));
                break;
            }
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9": {
                ((n = c), t.pop(), t.push(p), t.push("INSIDE_NUMBER"));
                break;
            }
            case "{": {
                ((n = c), t.pop(), t.push(p), t.push("INSIDE_OBJECT_START"));
                break;
            }
            case "[": {
                ((n = c), t.pop(), t.push(p), t.push("INSIDE_ARRAY_START"));
                break;
            }
        }
    }
    function a(d, c) {
        switch (d) {
            case ",": {
                (t.pop(), t.push("INSIDE_OBJECT_AFTER_COMMA"));
                break;
            }
            case "}": {
                ((n = c), t.pop());
                break;
            }
        }
    }
    function l(d, c) {
        switch (d) {
            case ",": {
                (t.pop(), t.push("INSIDE_ARRAY_AFTER_COMMA"));
                break;
            }
            case "]": {
                ((n = c), t.pop());
                break;
            }
        }
    }
    for (let d = 0; d < e.length; d++) {
        const c = e[d];
        switch (t[t.length - 1]) {
            case "ROOT":
                r(c, d, "FINISH");
                break;
            case "INSIDE_OBJECT_START": {
                switch (c) {
                    case '"': {
                        (t.pop(), t.push("INSIDE_OBJECT_KEY"));
                        break;
                    }
                    case "}": {
                        ((n = d), t.pop());
                        break;
                    }
                }
                break;
            }
            case "INSIDE_OBJECT_AFTER_COMMA": {
                c === '"' && (t.pop(), t.push("INSIDE_OBJECT_KEY"));
                break;
            }
            case "INSIDE_OBJECT_KEY": {
                c === '"' && (t.pop(), t.push("INSIDE_OBJECT_AFTER_KEY"));
                break;
            }
            case "INSIDE_OBJECT_AFTER_KEY": {
                c === ":" && (t.pop(), t.push("INSIDE_OBJECT_BEFORE_VALUE"));
                break;
            }
            case "INSIDE_OBJECT_BEFORE_VALUE": {
                r(c, d, "INSIDE_OBJECT_AFTER_VALUE");
                break;
            }
            case "INSIDE_OBJECT_AFTER_VALUE": {
                a(c, d);
                break;
            }
            case "INSIDE_STRING": {
                switch (c) {
                    case '"': {
                        (t.pop(), (n = d));
                        break;
                    }
                    case "\\": {
                        t.push("INSIDE_STRING_ESCAPE");
                        break;
                    }
                    default:
                        n = d;
                }
                break;
            }
            case "INSIDE_ARRAY_START": {
                c === "]" ? ((n = d), t.pop()) : ((n = d), r(c, d, "INSIDE_ARRAY_AFTER_VALUE"));
                break;
            }
            case "INSIDE_ARRAY_AFTER_VALUE": {
                switch (c) {
                    case ",": {
                        (t.pop(), t.push("INSIDE_ARRAY_AFTER_COMMA"));
                        break;
                    }
                    case "]": {
                        ((n = d), t.pop());
                        break;
                    }
                    default: {
                        n = d;
                        break;
                    }
                }
                break;
            }
            case "INSIDE_ARRAY_AFTER_COMMA": {
                r(c, d, "INSIDE_ARRAY_AFTER_VALUE");
                break;
            }
            case "INSIDE_STRING_ESCAPE": {
                (t.pop(), (n = d));
                break;
            }
            case "INSIDE_NUMBER": {
                switch (c) {
                    case "0":
                    case "1":
                    case "2":
                    case "3":
                    case "4":
                    case "5":
                    case "6":
                    case "7":
                    case "8":
                    case "9": {
                        n = d;
                        break;
                    }
                    case "e":
                    case "E":
                    case "-":
                    case ".":
                        break;
                    case ",": {
                        (t.pop(),
                            t[t.length - 1] === "INSIDE_ARRAY_AFTER_VALUE" && l(c, d),
                            t[t.length - 1] === "INSIDE_OBJECT_AFTER_VALUE" && a(c, d));
                        break;
                    }
                    case "}": {
                        (t.pop(), t[t.length - 1] === "INSIDE_OBJECT_AFTER_VALUE" && a(c, d));
                        break;
                    }
                    case "]": {
                        (t.pop(), t[t.length - 1] === "INSIDE_ARRAY_AFTER_VALUE" && l(c, d));
                        break;
                    }
                    default: {
                        t.pop();
                        break;
                    }
                }
                break;
            }
            case "INSIDE_LITERAL": {
                const w = e.substring(o, d + 1);
                !"false".startsWith(w) && !"true".startsWith(w) && !"null".startsWith(w)
                    ? (t.pop(),
                      t[t.length - 1] === "INSIDE_OBJECT_AFTER_VALUE"
                          ? a(c, d)
                          : t[t.length - 1] === "INSIDE_ARRAY_AFTER_VALUE" && l(c, d))
                    : (n = d);
                break;
            }
        }
    }
    let i = e.slice(0, n + 1);
    for (let d = t.length - 1; d >= 0; d--)
        switch (t[d]) {
            case "INSIDE_STRING": {
                i += '"';
                break;
            }
            case "INSIDE_OBJECT_KEY":
            case "INSIDE_OBJECT_AFTER_KEY":
            case "INSIDE_OBJECT_AFTER_COMMA":
            case "INSIDE_OBJECT_START":
            case "INSIDE_OBJECT_BEFORE_VALUE":
            case "INSIDE_OBJECT_AFTER_VALUE": {
                i += "}";
                break;
            }
            case "INSIDE_ARRAY_START":
            case "INSIDE_ARRAY_AFTER_COMMA":
            case "INSIDE_ARRAY_AFTER_VALUE": {
                i += "]";
                break;
            }
            case "INSIDE_LITERAL": {
                const p = e.substring(o, e.length);
                "true".startsWith(p)
                    ? (i += "true".slice(p.length))
                    : "false".startsWith(p)
                      ? (i += "false".slice(p.length))
                      : "null".startsWith(p) && (i += "null".slice(p.length));
            }
        }
    return i;
}
async function il(e) {
    if (e === void 0) return { value: void 0, state: "undefined-input" };
    let t = await yt({ text: e });
    return t.success
        ? { value: t.value, state: "successful-parse" }
        : ((t = await yt({ text: Ig(e) })),
          t.success ? { value: t.value, state: "repaired-parse" } : { value: void 0, state: "failed-parse" });
}
function Rt(e) {
    return e.type.startsWith("tool-");
}
function Kn(e) {
    return e.type === "dynamic-tool";
}
function Sg(e) {
    return Rt(e) || Kn(e);
}
function Yn(e) {
    return e.type.split("-").slice(1).join("-");
}
function Cg({ lastMessage: e, messageId: t }) {
    var n;
    const o = e?.role === "assistant" ? e : { id: t, metadata: void 0, role: "assistant", parts: [] },
        r = Ke(),
        a = o.parts.findLastIndex((i) => i.type === "step-start");
    let l = 0;
    for (const i of o.parts.slice(a + 1)) {
        if (!Sg(i)) continue;
        const d = l;
        (Rt(i) && l++,
            i.state === "input-streaming" &&
                (r[i.toolCallId] = {
                    text: (n = i.rawInput) != null ? n : "",
                    index: d,
                    toolName: Kn(i) ? i.toolName : Yn(i),
                    dynamic: Kn(i),
                }));
    }
    return { message: o, activeTextParts: Ke(), activeReasoningParts: Ke(), partialToolCalls: r };
}
function Eg({
    stream: e,
    messageMetadataSchema: t,
    dataPartSchemas: n,
    runUpdateMessageJob: o,
    onError: r,
    onToolCall: a,
    onData: l,
}) {
    return e.pipeThrough(
        new TransformStream({
            async transform(i, d) {
                await o(async ({ state: c, write: p }) => {
                    var w, y, k, x;
                    function I() {
                        const g = c.message.parts;
                        let v = g.length - 1;
                        for (; v >= 0 && g[v].type !== "step-start";) v--;
                        return g.slice(v + 1);
                    }
                    function S() {
                        return I().filter(Rt);
                    }
                    function R(g) {
                        let M = S().find((_) => _.toolCallId === g);
                        if (M == null) {
                            const _ = c.message.parts;
                            for (let E = _.length - 1; E >= 0; E--) {
                                const b = _[E];
                                if (Rt(b) && b.toolCallId === g) {
                                    M = b;
                                    break;
                                }
                            }
                        }
                        if (M == null) throw new Error("tool-output-error must be preceded by a tool-input-available");
                        return M;
                    }
                    function P(g) {
                        let M = I()
                            .filter((_) => _.type === "dynamic-tool")
                            .find((_) => _.toolCallId === g);
                        if (M == null) {
                            const _ = c.message.parts;
                            for (let E = _.length - 1; E >= 0; E--) {
                                const b = _[E];
                                if (b.type === "dynamic-tool" && b.toolCallId === g) {
                                    M = b;
                                    break;
                                }
                            }
                        }
                        if (M == null) throw new Error("tool-output-error must be preceded by a tool-input-available");
                        return M;
                    }
                    function O(g, v) {
                        var M;
                        const _ = v ?? I().find((A) => Rt(A) && A.toolCallId === g.toolCallId),
                            E = g,
                            b = _;
                        _ != null
                            ? ((_.state = g.state),
                              (b.input = E.input),
                              (b.output = E.output),
                              (b.errorText = E.errorText),
                              (b.rawInput = E.rawInput),
                              (b.preliminary = E.preliminary),
                              (b.providerExecuted = (M = E.providerExecuted) != null ? M : _.providerExecuted),
                              E.providerMetadata != null &&
                                  _.state === "input-available" &&
                                  (_.callProviderMetadata = E.providerMetadata))
                            : c.message.parts.push({
                                  type: `tool-${g.toolName}`,
                                  toolCallId: g.toolCallId,
                                  state: g.state,
                                  input: E.input,
                                  output: E.output,
                                  rawInput: E.rawInput,
                                  errorText: E.errorText,
                                  providerExecuted: E.providerExecuted,
                                  preliminary: E.preliminary,
                                  ...(E.providerMetadata != null ? { callProviderMetadata: E.providerMetadata } : {}),
                              });
                    }
                    function C(g, v) {
                        var M;
                        const _ = v ?? I().find((A) => A.type === "dynamic-tool" && A.toolCallId === g.toolCallId),
                            E = g,
                            b = _;
                        _ != null
                            ? ((_.state = g.state),
                              (b.toolName = g.toolName),
                              (b.input = E.input),
                              (b.output = E.output),
                              (b.errorText = E.errorText),
                              (b.rawInput = E.rawInput),
                              (b.preliminary = E.preliminary),
                              (b.providerExecuted = (M = E.providerExecuted) != null ? M : _.providerExecuted),
                              E.providerMetadata != null &&
                                  _.state === "input-available" &&
                                  (_.callProviderMetadata = E.providerMetadata))
                            : c.message.parts.push({
                                  type: "dynamic-tool",
                                  toolName: g.toolName,
                                  toolCallId: g.toolCallId,
                                  state: g.state,
                                  input: E.input,
                                  output: E.output,
                                  errorText: E.errorText,
                                  preliminary: E.preliminary,
                                  providerExecuted: E.providerExecuted,
                                  ...(E.providerMetadata != null ? { callProviderMetadata: E.providerMetadata } : {}),
                              });
                    }
                    async function h(g) {
                        if (g != null) {
                            const v = c.message.metadata != null ? rl(c.message.metadata, g) : g;
                            (t != null && (await Ce({ value: v, schema: t })), (c.message.metadata = v));
                        }
                    }
                    switch (i.type) {
                        case "text-start": {
                            const g = {
                                type: "text",
                                text: "",
                                providerMetadata: i.providerMetadata,
                                state: "streaming",
                            };
                            ((c.activeTextParts[i.id] = g), c.message.parts.push(g), p());
                            break;
                        }
                        case "text-delta": {
                            const g = c.activeTextParts[i.id];
                            ((g.text += i.delta),
                                (g.providerMetadata = (w = i.providerMetadata) != null ? w : g.providerMetadata),
                                p());
                            break;
                        }
                        case "text-end": {
                            const g = c.activeTextParts[i.id];
                            ((g.state = "done"),
                                (g.providerMetadata = (y = i.providerMetadata) != null ? y : g.providerMetadata),
                                delete c.activeTextParts[i.id],
                                p());
                            break;
                        }
                        case "reasoning-start": {
                            const g = {
                                type: "reasoning",
                                id: i.id,
                                text: "",
                                providerMetadata: i.providerMetadata,
                                state: "streaming",
                            };
                            ((c.activeReasoningParts[i.id] = g), c.message.parts.push(g), p());
                            break;
                        }
                        case "reasoning-delta": {
                            const g = c.activeReasoningParts[i.id];
                            ((g.text += i.delta),
                                (g.providerMetadata = (k = i.providerMetadata) != null ? k : g.providerMetadata),
                                p());
                            break;
                        }
                        case "reasoning-end": {
                            const g = c.activeReasoningParts[i.id];
                            ((g.providerMetadata = (x = i.providerMetadata) != null ? x : g.providerMetadata),
                                (g.state = "done"),
                                delete c.activeReasoningParts[i.id],
                                p());
                            break;
                        }
                        case "file": {
                            (c.message.parts.push({ type: "file", mediaType: i.mediaType, url: i.url }), p());
                            break;
                        }
                        case "source-url": {
                            (c.message.parts.push({
                                type: "source-url",
                                sourceId: i.sourceId,
                                url: i.url,
                                title: i.title,
                                providerMetadata: i.providerMetadata,
                            }),
                                p());
                            break;
                        }
                        case "source-document": {
                            (c.message.parts.push({
                                type: "source-document",
                                sourceId: i.sourceId,
                                mediaType: i.mediaType,
                                title: i.title,
                                filename: i.filename,
                                providerMetadata: i.providerMetadata,
                            }),
                                p());
                            break;
                        }
                        case "tool-input-start": {
                            const g = I().filter(Rt);
                            ((c.partialToolCalls[i.toolCallId] = {
                                text: "",
                                toolName: i.toolName,
                                index: g.length,
                                dynamic: i.dynamic,
                            }),
                                i.dynamic
                                    ? C({
                                          toolCallId: i.toolCallId,
                                          toolName: i.toolName,
                                          state: "input-streaming",
                                          input: void 0,
                                          providerExecuted: i.providerExecuted,
                                      })
                                    : O({
                                          toolCallId: i.toolCallId,
                                          toolName: i.toolName,
                                          state: "input-streaming",
                                          input: void 0,
                                          providerExecuted: i.providerExecuted,
                                      }),
                                p());
                            break;
                        }
                        case "tool-input-delta": {
                            const g = c.partialToolCalls[i.toolCallId];
                            g.text += i.inputTextDelta;
                            const { value: v } = await il(g.text);
                            (g.dynamic
                                ? C({
                                      toolCallId: i.toolCallId,
                                      toolName: g.toolName,
                                      state: "input-streaming",
                                      input: v,
                                      rawInput: g.text,
                                  })
                                : O({
                                      toolCallId: i.toolCallId,
                                      toolName: g.toolName,
                                      state: "input-streaming",
                                      input: v,
                                      rawInput: g.text,
                                  }),
                                p());
                            break;
                        }
                        case "tool-input-available": {
                            (i.dynamic
                                ? C({
                                      toolCallId: i.toolCallId,
                                      toolName: i.toolName,
                                      state: "input-available",
                                      input: i.input,
                                      providerExecuted: i.providerExecuted,
                                      providerMetadata: i.providerMetadata,
                                  })
                                : O({
                                      toolCallId: i.toolCallId,
                                      toolName: i.toolName,
                                      state: "input-available",
                                      input: i.input,
                                      providerExecuted: i.providerExecuted,
                                      providerMetadata: i.providerMetadata,
                                  }),
                                p(),
                                a && !i.providerExecuted && (await a({ toolCall: i })));
                            break;
                        }
                        case "tool-input-error": {
                            (i.dynamic
                                ? C({
                                      toolCallId: i.toolCallId,
                                      toolName: i.toolName,
                                      state: "output-error",
                                      input: i.input,
                                      errorText: i.errorText,
                                      providerExecuted: i.providerExecuted,
                                      providerMetadata: i.providerMetadata,
                                  })
                                : O({
                                      toolCallId: i.toolCallId,
                                      toolName: i.toolName,
                                      state: "output-error",
                                      input: void 0,
                                      rawInput: i.input,
                                      errorText: i.errorText,
                                      providerExecuted: i.providerExecuted,
                                      providerMetadata: i.providerMetadata,
                                  }),
                                p());
                            break;
                        }
                        case "tool-output-available": {
                            if (i.dynamic) {
                                const g = P(i.toolCallId);
                                C(
                                    {
                                        toolCallId: i.toolCallId,
                                        toolName: g.toolName,
                                        state: "output-available",
                                        input: g.input,
                                        output: i.output,
                                        preliminary: i.preliminary,
                                    },
                                    g,
                                );
                            } else {
                                const g = R(i.toolCallId);
                                O(
                                    {
                                        toolCallId: i.toolCallId,
                                        toolName: Yn(g),
                                        state: "output-available",
                                        input: g.input,
                                        output: i.output,
                                        providerExecuted: i.providerExecuted,
                                        preliminary: i.preliminary,
                                    },
                                    g,
                                );
                            }
                            p();
                            break;
                        }
                        case "tool-output-error": {
                            if (i.dynamic) {
                                const g = P(i.toolCallId);
                                C(
                                    {
                                        toolCallId: i.toolCallId,
                                        toolName: g.toolName,
                                        state: "output-error",
                                        input: g.input,
                                        errorText: i.errorText,
                                        providerExecuted: i.providerExecuted,
                                    },
                                    g,
                                );
                            } else {
                                const g = R(i.toolCallId);
                                O(
                                    {
                                        toolCallId: i.toolCallId,
                                        toolName: Yn(g),
                                        state: "output-error",
                                        input: g.input,
                                        rawInput: g.rawInput,
                                        errorText: i.errorText,
                                        providerExecuted: i.providerExecuted,
                                    },
                                    g,
                                );
                            }
                            p();
                            break;
                        }
                        case "start-step": {
                            c.message.parts.push({ type: "step-start" });
                            break;
                        }
                        case "finish-step": {
                            ((c.activeTextParts = Ke()), (c.activeReasoningParts = Ke()));
                            break;
                        }
                        case "start": {
                            (i.messageId != null && (c.message.id = i.messageId),
                                await h(i.messageMetadata),
                                (i.messageId != null || i.messageMetadata != null) && p({ updateStatus: !1 }));
                            break;
                        }
                        case "finish": {
                            (i.finishReason != null && (c.finishReason = i.finishReason),
                                await h(i.messageMetadata),
                                i.messageMetadata != null && p());
                            break;
                        }
                        case "message-metadata": {
                            (await h(i.messageMetadata), i.messageMetadata != null && p());
                            break;
                        }
                        case "error": {
                            r?.(new Error(i.errorText));
                            break;
                        }
                        default:
                            if (kg(i)) {
                                n?.[i.type] != null && (await Ce({ value: i.data, schema: n[i.type] }));
                                const g = i;
                                if (g.transient) {
                                    l?.(g);
                                    break;
                                }
                                const v =
                                    g.id != null
                                        ? c.message.parts.find((M) => g.type === M.type && g.id === M.id)
                                        : void 0;
                                (v != null ? (v.data = g.data) : c.message.parts.push(g), l?.(g), p());
                            }
                    }
                    d.enqueue(i);
                });
            },
        }),
    );
}
function Rg({ messageId: e, originalMessages: t = [], onFinish: n, onError: o, stream: r, getOutcome: a }) {
    let l = t?.[t.length - 1];
    l?.role !== "assistant" ? (l = void 0) : (e = l.id);
    let i = !1,
        d = !1,
        c;
    const p = (S) => {
            ((d = !0), (c = S));
        },
        w = r.pipeThrough(
            new TransformStream({
                transform(S, R) {
                    try {
                        let P = S;
                        if (S.type === "start") {
                            const O = S;
                            O.messageId == null && e != null && (P = { ...O, messageId: e });
                        }
                        (S.type === "abort" && (i = !0), R.enqueue(P));
                    } catch (P) {
                        throw (p(P), P);
                    }
                },
            }),
        );
    if (n == null) return w;
    const y = Cg({ lastMessage: l ? structuredClone(l) : void 0, messageId: e ?? "" }),
        k = async (S) => {
            try {
                await S({ state: y, write: () => {} });
            } catch (R) {
                throw (p(R), R);
            }
        };
    let x = !1;
    const I = async () => {
        var S;
        if (x || !n) return;
        x = !0;
        const R = y.message.id === l?.id,
            P = (S = a?.()) != null ? S : { status: "unknown" },
            O = d ? { status: "failed", error: c } : P.status === "unknown" && i ? { status: "aborted" } : P;
        await n({
            isAborted: i || O.status === "aborted",
            isContinuation: R,
            outcome: O,
            responseMessage: y.message,
            messages: [...(R ? t.slice(0, -1) : t), y.message],
            finishReason: y.finishReason,
        });
    };
    return Eg({ stream: w, runUpdateMessageJob: k, onError: o }).pipeThrough(
        new TransformStream({
            transform(S, R) {
                R.enqueue(S);
            },
            async cancel() {
                await I();
            },
            async flush() {
                await I();
            },
        }),
    );
}
function Og({ response: e, status: t, statusText: n, headers: o, stream: r, keepAliveMs: a, consumeSseStream: l }) {
    let i = nl({ stream: r.pipeThrough(new ol()), keepAliveMs: a });
    if (l) {
        const [d, c] = i.tee();
        ((i = d), l({ stream: c }));
    }
    return tl({
        response: e,
        status: t,
        statusText: n,
        headers: Object.fromEntries(wn(o, al).entries()),
        stream: i.pipeThrough(new TextEncoderStream()),
    });
}
function ln(e) {
    const t = e.pipeThrough(new TransformStream());
    return (
        (t[Symbol.asyncIterator] = function () {
            const n = this.getReader();
            let o = !1;
            async function r(a) {
                var l;
                o = !0;
                try {
                    a && (await ((l = n.cancel) == null ? void 0 : l.call(n)));
                } finally {
                    try {
                        n.releaseLock();
                    } catch {}
                }
            }
            return {
                async next() {
                    if (o) return { done: !0, value: void 0 };
                    const { done: a, value: l } = await n.read();
                    return a ? (await r(!0), { done: !0, value: void 0 }) : { done: !1, value: l };
                },
                async return() {
                    return (await r(!0), { done: !0, value: void 0 });
                },
                async throw(a) {
                    throw (await r(!0), a);
                },
            };
        }),
        t
    );
}
async function Ag({ stream: e, onError: t, abortSignal: n }) {
    const o = e.getReader();
    let r;
    const a = () => {
        r ?? (r = o.cancel().catch(() => {}));
    };
    n?.aborted ? a() : n?.addEventListener("abort", a, { once: !0 });
    try {
        for (;;) {
            const { done: l } = await o.read();
            if (l) break;
        }
    } catch (l) {
        t?.(l);
    } finally {
        (await r, n?.removeEventListener("abort", a), o.releaseLock());
    }
}
function vr() {
    let e, t;
    return {
        promise: new Promise((o, r) => {
            ((e = o), (t = r));
        }),
        resolve: e,
        reject: t,
    };
}
function Mg() {
    let e = [],
        t = null,
        n = !1,
        o = vr();
    const r = () => {
            ((n = !0), o.resolve(), e.forEach(({ reader: l }) => l.cancel()), (e = []), t?.close());
        },
        a = async () => {
            var l, i;
            if (n && e.length === 0) {
                t?.close();
                return;
            }
            if (e.length === 0) return ((o = vr()), await o.promise, a());
            try {
                const { value: d, done: c } = await e[0].reader.read();
                c ? (e.shift(), e.length > 0 ? await a() : n && t?.close()) : t?.enqueue(d);
            } catch (d) {
                ((i = (l = e[0]).onError) == null || i.call(l, d), t?.error(d), e.shift(), r());
            }
        };
    return {
        stream: new ReadableStream({
            start(l) {
                t = l;
            },
            pull: a,
            async cancel() {
                for (const { reader: l } of e) await l.cancel();
                ((e = []), (n = !0));
            },
        }),
        addStream: (l, i) => {
            if (n) throw new Error("Cannot add inner stream: outer stream is closed");
            (e.push({ reader: l.getReader(), ...i }), o.resolve());
        },
        close: () => {
            ((n = !0), o.resolve(), e.length === 0 && t?.close());
        },
        terminate: r,
    };
}
async function br(e) {
    for (const t of yn(e.callbacks))
        try {
            await t(e.event);
        } catch {}
}
function Ng() {
    var e, t;
    return (t = (e = globalThis?.performance) == null ? void 0 : e.now()) != null ? t : Date.now();
}
function Pg({
    tools: e,
    generatorStream: t,
    tracer: n,
    telemetry: o,
    system: r,
    messages: a,
    abortSignal: l,
    repairToolCall: i,
    experimental_context: d,
}) {
    let c = null,
        p = !1;
    const w = new ReadableStream({
        start(v) {
            c = v;
        },
        cancel() {
            p = !0;
        },
    });
    function y(v) {
        if (!p)
            try {
                c.enqueue(v);
            } catch {
                p = !0;
            }
    }
    function k() {
        if (!p) {
            p = !0;
            try {
                c.close();
            } catch {}
        }
    }
    const x = new Set(),
        I = [],
        S = new Map();
    let R = !1,
        P;
    function O() {
        R && x.size === 0 && (P != null && y(P), k());
    }
    function C(v) {
        const M = e[v.toolName],
            _ = Ne();
        (x.add(_),
            Mt({
                name: "ai.toolCall",
                attributes: Je({
                    telemetry: o,
                    attributes: {
                        ...At({ operationId: "ai.toolCall", telemetry: o }),
                        ...go(o),
                        "ai.toolCall.name": v.toolName,
                        "ai.toolCall.id": v.toolCallId,
                        "ai.toolCall.args": { output: () => JSON.stringify(v.input) },
                    },
                }),
                tracer: n,
                fn: async (E) => {
                    let b;
                    try {
                        const A = ci({
                            execute: M.execute.bind(M),
                            input: v.input,
                            options: { toolCallId: v.toolCallId, messages: a, abortSignal: l, experimental_context: d },
                        });
                        for await (const U of A)
                            (y({
                                ...v,
                                type: "tool-result",
                                output: U.output,
                                ...(U.type === "preliminary" && { preliminary: !0 }),
                            }),
                                U.type === "final" && (b = U.output));
                    } catch (A) {
                        (_o(E, A), y({ ...v, type: "tool-error", error: A }), x.delete(_), O());
                        return;
                    }
                    (x.delete(_), O());
                    try {
                        E.setAttributes(
                            Je({
                                telemetry: o,
                                attributes: { "ai.toolCall.result": { output: () => JSON.stringify(b) } },
                            }),
                        );
                    } catch {}
                },
            }));
    }
    const h = new Map(),
        g = new TransformStream({
            async transform(v, M) {
                var _, E, b, A;
                const U = v.type;
                switch (U) {
                    case "stream-start":
                    case "text-start":
                    case "text-delta":
                    case "text-end":
                    case "reasoning-start":
                    case "reasoning-delta":
                    case "reasoning-end":
                    case "source":
                    case "response-metadata":
                    case "error":
                    case "raw": {
                        M.enqueue(v);
                        break;
                    }
                    case "tool-input-start": {
                        (h.set(v.id, v.toolName),
                            await ((E = (_ = e?.[v.toolName]) == null ? void 0 : _.onInputStart) == null
                                ? void 0
                                : E.call(_, {
                                      toolCallId: v.id,
                                      messages: a,
                                      abortSignal: l,
                                      experimental_context: d,
                                  })),
                            M.enqueue(v));
                        break;
                    }
                    case "tool-input-delta": {
                        const L = h.get(v.id);
                        (L != null &&
                            (await ((A = (b = e?.[L]) == null ? void 0 : b.onInputDelta) == null
                                ? void 0
                                : A.call(b, {
                                      inputTextDelta: v.delta,
                                      toolCallId: v.id,
                                      messages: a,
                                      abortSignal: l,
                                      experimental_context: d,
                                  }))),
                            M.enqueue(v));
                        break;
                    }
                    case "tool-input-end": {
                        (h.delete(v.id), M.enqueue(v));
                        break;
                    }
                    case "file": {
                        M.enqueue({ type: "file", file: new pg({ data: v.data, mediaType: v.mediaType }) });
                        break;
                    }
                    case "finish": {
                        if (
                            ((P = {
                                type: "finish",
                                finishReason: v.finishReason,
                                usage: v.usage,
                                providerMetadata: v.providerMetadata,
                            }),
                            zs(v.finishReason))
                        )
                            for (const L of I.splice(0)) C(L);
                        else I.length = 0;
                        break;
                    }
                    case "tool-call": {
                        try {
                            const L = await Ks({ toolCall: v, tools: e, repairToolCall: i, system: r, messages: a });
                            if ((M.enqueue(L), L.invalid)) {
                                y({
                                    type: "tool-error",
                                    toolCallId: L.toolCallId,
                                    toolName: L.toolName,
                                    input: L.input,
                                    error: Ye(L.error),
                                    dynamic: !0,
                                });
                                break;
                            }
                            const j = e[L.toolName];
                            (S.set(L.toolCallId, L.input),
                                j.onInputAvailable != null &&
                                    (await j.onInputAvailable({
                                        input: L.input,
                                        toolCallId: L.toolCallId,
                                        messages: a,
                                        abortSignal: l,
                                        experimental_context: d,
                                    })),
                                j.execute != null && L.providerExecuted !== !0 && I.push({ ...L }));
                        } catch (L) {
                            y({ type: "error", error: L });
                        }
                        break;
                    }
                    case "tool-result": {
                        const L = v.toolName;
                        v.isError
                            ? y({
                                  type: "tool-error",
                                  toolCallId: v.toolCallId,
                                  toolName: L,
                                  input: S.get(v.toolCallId),
                                  providerExecuted: v.providerExecuted,
                                  error: v.result,
                              })
                            : M.enqueue({
                                  type: "tool-result",
                                  toolCallId: v.toolCallId,
                                  toolName: L,
                                  input: S.get(v.toolCallId),
                                  output: v.result,
                                  providerExecuted: v.providerExecuted,
                              });
                        break;
                    }
                    default: {
                        const L = U;
                        throw new Error(`Unhandled chunk type: ${L}`);
                    }
                }
            },
            flush() {
                ((R = !0), O());
            },
        });
    return new ReadableStream({
        async start(v) {
            return Promise.all([
                t.pipeThrough(g).pipeTo(
                    new WritableStream({
                        write(M) {
                            v.enqueue(M);
                        },
                        close() {},
                    }),
                ),
                w.pipeTo(
                    new WritableStream({
                        write(M) {
                            v.enqueue(M);
                        },
                        close() {
                            v.close();
                        },
                    }),
                ),
            ]);
        },
    });
}
var $g = en({ prefix: "aitxt", size: 24 });
function Dg({
    model: e,
    tools: t,
    toolChoice: n,
    system: o,
    prompt: r,
    messages: a,
    allowSystemInMessages: l,
    maxRetries: i,
    abortSignal: d,
    headers: c,
    stopWhen: p = Qs(1),
    experimental_output: w,
    experimental_telemetry: y,
    prepareStep: k,
    providerOptions: x,
    experimental_activeTools: I,
    activeTools: S = I,
    experimental_repairToolCall: R,
    experimental_transform: P,
    experimental_download: O,
    includeRawChunks: C = !1,
    onChunk: h,
    onError: g = ({ error: j }) => {
        console.error(j);
    },
    onFinish: v,
    onAbort: M,
    onStepFinish: _,
    experimental_context: E,
    _internal: { now: b = Ng, generateId: A = $g, currentDate: U = () => new Date() } = {},
    ...L
}) {
    return new Ug({
        model: _n(e),
        telemetry: y,
        headers: c,
        settings: L,
        maxRetries: i,
        abortSignal: d,
        system: o,
        prompt: r,
        messages: a,
        allowSystemInMessages: l,
        tools: t,
        toolChoice: n,
        transforms: yn(P),
        activeTools: S,
        repairToolCall: R,
        stopConditions: yn(p),
        output: w,
        providerOptions: x,
        prepareStep: k,
        includeRawChunks: C,
        onChunk: h,
        onError: g,
        onFinish: v,
        onAbort: M,
        onStepFinish: _,
        now: b,
        currentDate: U,
        generateId: A,
        experimental_context: E,
        download: O,
    });
}
function qg(e) {
    if (!e)
        return new TransformStream({
            transform(l, i) {
                i.enqueue({ part: l, partialOutput: void 0 });
            },
        });
    let t,
        n = "",
        o = "",
        r = "";
    function a({ controller: l, partialOutput: i = void 0 }) {
        (l.enqueue({ part: { type: "text-delta", id: t, text: o }, partialOutput: i }), (o = ""));
    }
    return new TransformStream({
        async transform(l, i) {
            if (
                (l.type === "finish-step" && o.length > 0 && a({ controller: i }),
                l.type !== "text-delta" && l.type !== "text-start" && l.type !== "text-end")
            ) {
                i.enqueue({ part: l, partialOutput: void 0 });
                return;
            }
            if (t == null) t = l.id;
            else if (l.id !== t) {
                i.enqueue({ part: l, partialOutput: void 0 });
                return;
            }
            if (l.type === "text-start") {
                i.enqueue({ part: l, partialOutput: void 0 });
                return;
            }
            if (l.type === "text-end") {
                (o.length > 0 && a({ controller: i }), i.enqueue({ part: l, partialOutput: void 0 }));
                return;
            }
            if (((n += l.text), (o += l.text), l.text.length === 0 && l.providerMetadata != null)) {
                i.enqueue({ part: l, partialOutput: void 0 });
                return;
            }
            const d = await e.parsePartial({ text: n });
            if (d != null) {
                const c = JSON.stringify(d.partial);
                c !== r && (a({ controller: i, partialOutput: d.partial }), (r = c));
            }
        },
    });
}
var Ug = class {
    constructor({
        model: e,
        telemetry: t,
        headers: n,
        settings: o,
        maxRetries: r,
        abortSignal: a,
        system: l,
        prompt: i,
        messages: d,
        allowSystemInMessages: c,
        tools: p,
        toolChoice: w,
        transforms: y,
        activeTools: k,
        repairToolCall: x,
        stopConditions: I,
        output: S,
        providerOptions: R,
        prepareStep: P,
        includeRawChunks: O,
        now: C,
        currentDate: h,
        generateId: g,
        onChunk: v,
        onError: M,
        onFinish: _,
        onAbort: E,
        onStepFinish: b,
        experimental_context: A,
        download: U,
    }) {
        ((this._totalUsage = new an()),
            (this._finishReason = new an()),
            (this._steps = new an()),
            (this.output = S),
            (this.includeRawChunks = O),
            (this.tools = p));
        let L,
            j = [];
        const B = [];
        let $,
            H,
            de = {},
            ee = [];
        const Q = [];
        let V = p,
            le,
            ce = Ke(),
            pe = Ke();
        const he = new TransformStream({
                async transform(ue, be) {
                    var Te, se, $e, st;
                    be.enqueue(ue);
                    const { part: Z } = ue;
                    if (
                        ((Z.type === "text-delta" ||
                            Z.type === "reasoning-delta" ||
                            Z.type === "source" ||
                            Z.type === "tool-call" ||
                            Z.type === "tool-result" ||
                            Z.type === "tool-input-start" ||
                            Z.type === "tool-input-delta" ||
                            Z.type === "raw") &&
                            (await br({ event: { chunk: Z }, callbacks: v })),
                        Z.type === "error" && (await br({ event: { error: js(Z.error) }, callbacks: M })),
                        Z.type === "text-start" &&
                            ((ce[Z.id] = { type: "text", text: "", providerMetadata: Z.providerMetadata }),
                            j.push(ce[Z.id])),
                        Z.type === "text-delta")
                    ) {
                        const ge = ce[Z.id];
                        if (ge == null) {
                            be.enqueue({
                                part: { type: "error", error: `text part ${Z.id} not found` },
                                partialOutput: void 0,
                            });
                            return;
                        }
                        ((ge.text += Z.text),
                            (ge.providerMetadata = (Te = Z.providerMetadata) != null ? Te : ge.providerMetadata));
                    }
                    if (Z.type === "text-end") {
                        const ge = ce[Z.id];
                        if (ge == null) {
                            be.enqueue({
                                part: { type: "error", error: `text part ${Z.id} not found` },
                                partialOutput: void 0,
                            });
                            return;
                        }
                        ((ge.providerMetadata = (se = Z.providerMetadata) != null ? se : ge.providerMetadata),
                            delete ce[Z.id]);
                    }
                    if (
                        (Z.type === "reasoning-start" &&
                            ((pe[Z.id] = { type: "reasoning", text: "", providerMetadata: Z.providerMetadata }),
                            j.push(pe[Z.id])),
                        Z.type === "reasoning-delta")
                    ) {
                        const ge = pe[Z.id];
                        if (ge == null) {
                            be.enqueue({
                                part: { type: "error", error: `reasoning part ${Z.id} not found` },
                                partialOutput: void 0,
                            });
                            return;
                        }
                        ((ge.text += Z.text),
                            (ge.providerMetadata = ($e = Z.providerMetadata) != null ? $e : ge.providerMetadata));
                    }
                    if (Z.type === "reasoning-end") {
                        const ge = pe[Z.id];
                        if (ge == null) {
                            be.enqueue({
                                part: { type: "error", error: `reasoning part ${Z.id} not found` },
                                partialOutput: void 0,
                            });
                            return;
                        }
                        ((ge.providerMetadata = (st = Z.providerMetadata) != null ? st : ge.providerMetadata),
                            delete pe[Z.id]);
                    }
                    if (
                        (Z.type === "file" && j.push({ type: "file", file: Z.file }),
                        Z.type === "source" && j.push(Z),
                        Z.type === "tool-call" && j.push(Z),
                        Z.type === "tool-result" && !Z.preliminary && j.push(Z),
                        Z.type === "tool-error" && j.push(Z),
                        Z.type === "start-step" &&
                            ((j = []), (pe = Ke()), (ce = Ke()), (de = Z.request), (ee = Z.warnings)),
                        Z.type === "finish-step")
                    ) {
                        const ge = zn({ content: j, tools: V }),
                            dt = new Xs({
                                content: j,
                                finishReason: Z.finishReason,
                                usage: Z.usage,
                                warnings: ee,
                                request: de,
                                response: { ...Z.response, messages: [...B, ...ge] },
                                providerMetadata: Z.providerMetadata,
                            });
                        (await b?.(dt),
                            rs(ee),
                            Q.push(dt),
                            (j = []),
                            (pe = Ke()),
                            (ce = Ke()),
                            B.push(...ge),
                            L.resolve());
                    }
                    Z.type === "finish" && ((H = Z.totalUsage), ($ = Z.finishReason));
                },
                async flush(ue) {
                    try {
                        if (Q.length === 0) {
                            const $e = new Eh({ message: "No output generated. Check the stream for errors." });
                            (W._finishReason.reject($e), W._totalUsage.reject($e), W._steps.reject($e));
                            return;
                        }
                        const be = $ ?? "unknown",
                            Te = H ?? { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 };
                        (W._finishReason.resolve(be), W._totalUsage.resolve(Te), W._steps.resolve(Q));
                        const se = Q[Q.length - 1];
                        (await _?.({
                            finishReason: be,
                            totalUsage: Te,
                            usage: se.usage,
                            content: se.content,
                            text: se.text,
                            reasoningText: se.reasoningText,
                            reasoning: se.reasoning,
                            files: se.files,
                            sources: se.sources,
                            toolCalls: se.toolCalls,
                            staticToolCalls: se.staticToolCalls,
                            dynamicToolCalls: se.dynamicToolCalls,
                            toolResults: se.toolResults,
                            staticToolResults: se.staticToolResults,
                            dynamicToolResults: se.dynamicToolResults,
                            request: se.request,
                            response: se.response,
                            warnings: se.warnings,
                            providerMetadata: se.providerMetadata,
                            steps: Q,
                        }),
                            le.setAttributes(
                                Je({
                                    telemetry: t,
                                    attributes: {
                                        "ai.response.finishReason": be,
                                        "ai.response.text": { output: () => se.text },
                                        "ai.response.toolCalls": {
                                            output: () => {
                                                var $e;
                                                return ($e = se.toolCalls) != null && $e.length
                                                    ? JSON.stringify(se.toolCalls)
                                                    : void 0;
                                            },
                                        },
                                        "ai.response.providerMetadata": JSON.stringify(se.providerMetadata),
                                        "ai.usage.inputTokens": Te.inputTokens,
                                        "ai.usage.outputTokens": Te.outputTokens,
                                        "ai.usage.totalTokens": Te.totalTokens,
                                        "ai.usage.reasoningTokens": Te.reasoningTokens,
                                        "ai.usage.cachedInputTokens": Te.cachedInputTokens,
                                    },
                                }),
                            ));
                    } catch (be) {
                        ue.error(be);
                    } finally {
                        le.end();
                    }
                },
            }),
            re = Mg();
        ((this.addStream = re.addStream), (this.closeStream = re.close));
        const z = re.stream.getReader();
        let D = new ReadableStream({
            async start(ue) {
                ue.enqueue({ type: "start" });
            },
            async pull(ue) {
                function be() {
                    (E?.({ steps: Q }), ue.enqueue({ type: "abort" }), ue.close());
                }
                try {
                    const { done: Te, value: se } = await z.read();
                    if (Te) {
                        ue.close();
                        return;
                    }
                    if (a?.aborted) {
                        be();
                        return;
                    }
                    ue.enqueue(se);
                } catch (Te) {
                    _t(Te) && a?.aborted ? be() : ue.error(Te);
                }
            },
            cancel(ue) {
                return re.stream.cancel(ue);
            },
        });
        for (const ue of y)
            D = D.pipeThrough(
                ue({
                    tools: p,
                    stopStream() {
                        re.terminate();
                    },
                }),
            );
        this.baseStream = D.pipeThrough(qg(S)).pipeThrough(he);
        const { maxRetries: F, retry: q } = Js({ maxRetries: r, abortSignal: a }),
            T = Gs(t),
            Y = Zn(o),
            xe = Bs({ model: e, telemetry: t, headers: n, settings: { ...Y, maxRetries: F } }),
            W = this;
        Mt({
            name: "ai.streamText",
            attributes: Je({
                telemetry: t,
                attributes: {
                    ...At({ operationId: "ai.streamText", telemetry: t }),
                    ...xe,
                    "ai.prompt": { input: () => JSON.stringify({ system: l, prompt: i, messages: d }) },
                },
            }),
            tracer: T,
            endWhenDone: !1,
            fn: async (ue) => {
                le = ue;
                async function be({ currentStep: Te, responseMessages: se, usage: $e }) {
                    var st, Z, ge, dt, $t;
                    const me = W.includeRawChunks;
                    L = new an();
                    const He = await Ls({ system: l, prompt: i, messages: d, allowSystemInMessages: c }),
                        kt = [...He.messages, ...se],
                        je = await P?.({ model: e, steps: Q, stepNumber: Q.length, messages: kt }),
                        lt = _n((st = je?.model) != null ? st : e),
                        Dt = await Ns({
                            prompt: {
                                system: (Z = je?.system) != null ? Z : He.system,
                                messages: (ge = je?.messages) != null ? ge : kt,
                            },
                            supportedUrls: await lt.supportedUrls,
                            download: U,
                        }),
                        qt = (dt = je?.activeTools) != null ? dt : k,
                        pt = Ws({ tools: p, activeTools: qt });
                    V = pt;
                    const { toolChoice: It, tools: St } = $s({
                            tools: p,
                            toolChoice: ($t = je?.toolChoice) != null ? $t : w,
                            activeTools: qt,
                        }),
                        {
                            result: { stream: Ae, response: ut, request: Ut },
                            doStreamSpan: Ct,
                            startTimestampMs: yo,
                        } = await q(() =>
                            Mt({
                                name: "ai.streamText.doStream",
                                attributes: Je({
                                    telemetry: t,
                                    attributes: {
                                        ...At({ operationId: "ai.streamText.doStream", telemetry: t }),
                                        ...xe,
                                        "ai.model.provider": lt.provider,
                                        "ai.model.id": lt.modelId,
                                        "ai.prompt.messages": { input: () => Fs(Dt) },
                                        "ai.prompt.tools": { input: () => St?.map((oe) => JSON.stringify(oe)) },
                                        "ai.prompt.toolChoice": {
                                            input: () => (It != null ? JSON.stringify(It) : void 0),
                                        },
                                        "gen_ai.system": lt.provider,
                                        "gen_ai.request.model": lt.modelId,
                                        "gen_ai.request.frequency_penalty": Y.frequencyPenalty,
                                        "gen_ai.request.max_tokens": Y.maxOutputTokens,
                                        "gen_ai.request.presence_penalty": Y.presencePenalty,
                                        "gen_ai.request.stop_sequences": Y.stopSequences,
                                        "gen_ai.request.temperature": Y.temperature,
                                        "gen_ai.request.top_k": Y.topK,
                                        "gen_ai.request.top_p": Y.topP,
                                    },
                                }),
                                tracer: T,
                                endWhenDone: !1,
                                endOnError: !0,
                                fn: async (oe) => ({
                                    startTimestampMs: C(),
                                    doStreamSpan: oe,
                                    result: await lt.doStream({
                                        ...Y,
                                        tools: St,
                                        toolChoice: It,
                                        responseFormat: S?.responseFormat,
                                        prompt: Dt,
                                        providerOptions: R,
                                        abortSignal: a,
                                        headers: n,
                                        includeRawChunks: me,
                                    }),
                                }),
                            }),
                        ),
                        ll = Pg({
                            tools: pt,
                            generatorStream: Ae,
                            tracer: T,
                            telemetry: t,
                            system: l,
                            messages: kt,
                            repairToolCall: x,
                            abortSignal: a,
                            experimental_context: A,
                        }),
                        ul = Ut ?? {},
                        tn = [],
                        xn = [];
                    let Tn,
                        Et = "unknown",
                        We = { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
                        kn,
                        vo = !0,
                        Qe = { id: g(), timestamp: h(), modelId: e.modelId },
                        bo = "";
                    W.addStream(
                        ll.pipeThrough(
                            new TransformStream({
                                async transform(oe, Me) {
                                    var Lt, jt, nn, ct;
                                    if (oe.type === "stream-start") {
                                        Tn = oe.warnings;
                                        return;
                                    }
                                    if (vo) {
                                        const et = C() - yo;
                                        ((vo = !1),
                                            Ct.addEvent("ai.stream.firstChunk", { "ai.response.msToFirstChunk": et }),
                                            Ct.setAttributes({ "ai.response.msToFirstChunk": et }),
                                            Me.enqueue({ type: "start-step", request: ul, warnings: Tn ?? [] }));
                                    }
                                    const wo = oe.type;
                                    switch (wo) {
                                        case "text-start":
                                        case "text-end": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "text-delta": {
                                            (oe.delta.length > 0 || oe.providerMetadata != null) &&
                                                (Me.enqueue({
                                                    type: "text-delta",
                                                    id: oe.id,
                                                    text: oe.delta,
                                                    providerMetadata: oe.providerMetadata,
                                                }),
                                                (bo += oe.delta));
                                            break;
                                        }
                                        case "reasoning-start":
                                        case "reasoning-end": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "reasoning-delta": {
                                            Me.enqueue({
                                                type: "reasoning-delta",
                                                id: oe.id,
                                                text: oe.delta,
                                                providerMetadata: oe.providerMetadata,
                                            });
                                            break;
                                        }
                                        case "tool-call": {
                                            (Me.enqueue(oe), tn.push(oe));
                                            break;
                                        }
                                        case "tool-result": {
                                            (Me.enqueue(oe), oe.preliminary || xn.push(oe));
                                            break;
                                        }
                                        case "tool-error": {
                                            (Me.enqueue(oe), xn.push(oe));
                                            break;
                                        }
                                        case "response-metadata": {
                                            Qe = {
                                                id: (Lt = oe.id) != null ? Lt : Qe.id,
                                                timestamp: (jt = oe.timestamp) != null ? jt : Qe.timestamp,
                                                modelId: (nn = oe.modelId) != null ? nn : Qe.modelId,
                                            };
                                            break;
                                        }
                                        case "finish": {
                                            ((We = oe.usage), (Et = oe.finishReason), (kn = oe.providerMetadata));
                                            const et = C() - yo;
                                            (Ct.addEvent("ai.stream.finish"),
                                                Ct.setAttributes({
                                                    "ai.response.msToFinish": et,
                                                    "ai.response.avgOutputTokensPerSecond":
                                                        (1e3 * ((ct = We.outputTokens) != null ? ct : 0)) / et,
                                                }));
                                            break;
                                        }
                                        case "file": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "source": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "tool-input-start": {
                                            const et = pt?.[oe.toolName];
                                            Me.enqueue({ ...oe, dynamic: et?.type === "dynamic" });
                                            break;
                                        }
                                        case "tool-input-end": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "tool-input-delta": {
                                            Me.enqueue(oe);
                                            break;
                                        }
                                        case "error": {
                                            (Me.enqueue(oe), (Et = "error"));
                                            break;
                                        }
                                        case "raw": {
                                            me && Me.enqueue(oe);
                                            break;
                                        }
                                        default: {
                                            const et = wo;
                                            throw new Error(`Unknown chunk type: ${et}`);
                                        }
                                    }
                                },
                                async flush(oe) {
                                    const Me = tn.length > 0 ? JSON.stringify(tn) : void 0;
                                    try {
                                        Ct.setAttributes(
                                            Je({
                                                telemetry: t,
                                                attributes: {
                                                    "ai.response.finishReason": Et,
                                                    "ai.response.text": { output: () => bo },
                                                    "ai.response.toolCalls": { output: () => Me },
                                                    "ai.response.id": Qe.id,
                                                    "ai.response.model": Qe.modelId,
                                                    "ai.response.timestamp": Qe.timestamp.toISOString(),
                                                    "ai.response.providerMetadata": JSON.stringify(kn),
                                                    "ai.usage.inputTokens": We.inputTokens,
                                                    "ai.usage.outputTokens": We.outputTokens,
                                                    "ai.usage.totalTokens": We.totalTokens,
                                                    "ai.usage.reasoningTokens": We.reasoningTokens,
                                                    "ai.usage.cachedInputTokens": We.cachedInputTokens,
                                                    "gen_ai.response.finish_reasons": [Et],
                                                    "gen_ai.response.id": Qe.id,
                                                    "gen_ai.response.model": Qe.modelId,
                                                    "gen_ai.usage.input_tokens": We.inputTokens,
                                                    "gen_ai.usage.output_tokens": We.outputTokens,
                                                },
                                            }),
                                        );
                                    } catch {
                                    } finally {
                                        Ct.end();
                                    }
                                    oe.enqueue({
                                        type: "finish-step",
                                        finishReason: Et,
                                        usage: We,
                                        providerMetadata: kn,
                                        response: { ...Qe, headers: ut?.headers },
                                    });
                                    const Lt = Hs($e, We);
                                    await L.promise;
                                    const jt = tn.filter((ct) => ct.providerExecuted !== !0),
                                        nn = xn.filter((ct) => ct.providerExecuted !== !0);
                                    if (
                                        jt.length > 0 &&
                                        nn.length === jt.length &&
                                        !(await el({ stopConditions: I, steps: Q }))
                                    ) {
                                        se.push(...zn({ content: Q[Q.length - 1].content, tools: pt }));
                                        try {
                                            await be({ currentStep: Te + 1, responseMessages: se, usage: Lt });
                                        } catch (ct) {
                                            (oe.enqueue({ type: "error", error: ct }), W.closeStream());
                                        }
                                    } else
                                        (oe.enqueue({ type: "finish", finishReason: Et, totalUsage: Lt }),
                                            W.closeStream());
                                },
                            }),
                        ),
                    );
                }
                await be({
                    currentStep: 0,
                    responseMessages: [],
                    usage: { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
                });
            },
        }).catch((ue) => {
            (W.addStream(
                new ReadableStream({
                    start(be) {
                        (be.enqueue({ type: "error", error: ue }), be.close());
                    },
                }),
            ),
                W.closeStream());
        });
    }
    get steps() {
        return (this.consumeStream(), this._steps.promise);
    }
    get finalStep() {
        return this.steps.then((e) => e[e.length - 1]);
    }
    get content() {
        return this.finalStep.then((e) => e.content);
    }
    get warnings() {
        return this.finalStep.then((e) => e.warnings);
    }
    get providerMetadata() {
        return this.finalStep.then((e) => e.providerMetadata);
    }
    get text() {
        return this.finalStep.then((e) => e.text);
    }
    get reasoningText() {
        return this.finalStep.then((e) => e.reasoningText);
    }
    get reasoning() {
        return this.finalStep.then((e) => e.reasoning);
    }
    get sources() {
        return this.finalStep.then((e) => e.sources);
    }
    get files() {
        return this.finalStep.then((e) => e.files);
    }
    get toolCalls() {
        return this.finalStep.then((e) => e.toolCalls);
    }
    get staticToolCalls() {
        return this.finalStep.then((e) => e.staticToolCalls);
    }
    get dynamicToolCalls() {
        return this.finalStep.then((e) => e.dynamicToolCalls);
    }
    get toolResults() {
        return this.finalStep.then((e) => e.toolResults);
    }
    get staticToolResults() {
        return this.finalStep.then((e) => e.staticToolResults);
    }
    get dynamicToolResults() {
        return this.finalStep.then((e) => e.dynamicToolResults);
    }
    get usage() {
        return this.finalStep.then((e) => e.usage);
    }
    get request() {
        return this.finalStep.then((e) => e.request);
    }
    get response() {
        return this.finalStep.then((e) => e.response);
    }
    get totalUsage() {
        return (this.consumeStream(), this._totalUsage.promise);
    }
    get finishReason() {
        return (this.consumeStream(), this._finishReason.promise);
    }
    teeStream() {
        const [e, t] = this.baseStream.tee();
        return ((this.baseStream = t), e);
    }
    get textStream() {
        return ln(
            this.teeStream().pipeThrough(
                new TransformStream({
                    transform({ part: e }, t) {
                        e.type === "text-delta" && t.enqueue(e.text);
                    },
                }),
            ),
        );
    }
    get fullStream() {
        return ln(
            this.teeStream().pipeThrough(
                new TransformStream({
                    transform({ part: e }, t) {
                        t.enqueue(e);
                    },
                }),
            ),
        );
    }
    async consumeStream(e) {
        var t;
        try {
            await Ag({ stream: this.fullStream, onError: e?.onError });
        } catch (n) {
            (t = e?.onError) == null || t.call(e, n);
        }
    }
    get experimental_partialOutputStream() {
        if (this.output == null) throw new as();
        return ln(
            this.teeStream().pipeThrough(
                new TransformStream({
                    transform({ partialOutput: e }, t) {
                        e != null && t.enqueue(e);
                    },
                }),
            ),
        );
    }
    toUIMessageStream({
        originalMessages: e,
        generateMessageId: t,
        onFinish: n,
        messageMetadata: o,
        sendReasoning: r = !0,
        sendSources: a = !1,
        sendStart: l = !0,
        sendFinish: i = !0,
        onError: d = () => "An error occurred.",
    } = {}) {
        let c = { status: "unknown" },
            p = !1;
        const w = (b) => {
                !p &&
                    c.status !== "completed" &&
                    c.status !== "aborted" &&
                    b.status !== "unknown" &&
                    (c.status === "unknown" || b.status !== "failed") &&
                    (c = b);
            },
            y = (b) => {
                ((p = !0), (c = { status: "failed", error: b }));
            },
            k = t != null ? Tg({ originalMessages: e, responseMessageId: t }) : void 0,
            x = {},
            I = (b) => {
                var A, U;
                const L = x[b];
                return ((U = (A = this.tools) == null ? void 0 : A[L]) == null ? void 0 : U.type) === "dynamic"
                    ? !0
                    : void 0;
            },
            S = this.fullStream.getReader();
        let R = !1,
            P = !1;
        const O = () => {
                R || (S.releaseLock(), (R = !0));
            },
            g = new ReadableStream({
                async pull(b) {
                    try {
                        const { done: A, value: U } = await S.read();
                        A ? (O(), P || b.close()) : b.enqueue(U);
                    } catch (A) {
                        (O(), P || (y(A), b.error(A)));
                    }
                },
                async cancel(b) {
                    if (((P = !0), !R))
                        try {
                            await S.cancel(b);
                        } finally {
                            O();
                        }
                },
            })
                .pipeThrough(
                    new TransformStream({
                        transform: async (b, A) => {
                            const U = o?.({ part: b }),
                                L = b.type;
                            switch (L) {
                                case "text-start": {
                                    A.enqueue({
                                        type: "text-start",
                                        id: b.id,
                                        ...(b.providerMetadata != null ? { providerMetadata: b.providerMetadata } : {}),
                                    });
                                    break;
                                }
                                case "text-delta": {
                                    A.enqueue({
                                        type: "text-delta",
                                        id: b.id,
                                        delta: b.text,
                                        ...(b.providerMetadata != null ? { providerMetadata: b.providerMetadata } : {}),
                                    });
                                    break;
                                }
                                case "text-end": {
                                    A.enqueue({
                                        type: "text-end",
                                        id: b.id,
                                        ...(b.providerMetadata != null ? { providerMetadata: b.providerMetadata } : {}),
                                    });
                                    break;
                                }
                                case "reasoning-start": {
                                    A.enqueue({
                                        type: "reasoning-start",
                                        id: b.id,
                                        ...(b.providerMetadata != null ? { providerMetadata: b.providerMetadata } : {}),
                                    });
                                    break;
                                }
                                case "reasoning-delta": {
                                    r &&
                                        A.enqueue({
                                            type: "reasoning-delta",
                                            id: b.id,
                                            delta: b.text,
                                            ...(b.providerMetadata != null
                                                ? { providerMetadata: b.providerMetadata }
                                                : {}),
                                        });
                                    break;
                                }
                                case "reasoning-end": {
                                    A.enqueue({
                                        type: "reasoning-end",
                                        id: b.id,
                                        ...(b.providerMetadata != null ? { providerMetadata: b.providerMetadata } : {}),
                                    });
                                    break;
                                }
                                case "file": {
                                    A.enqueue({
                                        type: "file",
                                        mediaType: b.file.mediaType,
                                        url: `data:${b.file.mediaType};base64,${b.file.base64}`,
                                    });
                                    break;
                                }
                                case "source": {
                                    (a &&
                                        b.sourceType === "url" &&
                                        A.enqueue({
                                            type: "source-url",
                                            sourceId: b.id,
                                            url: b.url,
                                            title: b.title,
                                            ...(b.providerMetadata != null
                                                ? { providerMetadata: b.providerMetadata }
                                                : {}),
                                        }),
                                        a &&
                                            b.sourceType === "document" &&
                                            A.enqueue({
                                                type: "source-document",
                                                sourceId: b.id,
                                                mediaType: b.mediaType,
                                                title: b.title,
                                                filename: b.filename,
                                                ...(b.providerMetadata != null
                                                    ? { providerMetadata: b.providerMetadata }
                                                    : {}),
                                            }));
                                    break;
                                }
                                case "tool-input-start": {
                                    x[b.id] = b.toolName;
                                    const j = I(b.id);
                                    A.enqueue({
                                        type: "tool-input-start",
                                        toolCallId: b.id,
                                        toolName: b.toolName,
                                        ...(b.providerExecuted != null ? { providerExecuted: b.providerExecuted } : {}),
                                        ...(j != null ? { dynamic: j } : {}),
                                    });
                                    break;
                                }
                                case "tool-input-delta": {
                                    A.enqueue({ type: "tool-input-delta", toolCallId: b.id, inputTextDelta: b.delta });
                                    break;
                                }
                                case "tool-call": {
                                    x[b.toolCallId] = b.toolName;
                                    const j = I(b.toolCallId);
                                    b.invalid
                                        ? A.enqueue({
                                              type: "tool-input-error",
                                              toolCallId: b.toolCallId,
                                              toolName: b.toolName,
                                              input: b.input,
                                              ...(b.providerExecuted != null
                                                  ? { providerExecuted: b.providerExecuted }
                                                  : {}),
                                              ...(b.providerMetadata != null
                                                  ? { providerMetadata: b.providerMetadata }
                                                  : {}),
                                              ...(j != null ? { dynamic: j } : {}),
                                              errorText: d(b.error),
                                          })
                                        : A.enqueue({
                                              type: "tool-input-available",
                                              toolCallId: b.toolCallId,
                                              toolName: b.toolName,
                                              input: b.input,
                                              ...(b.providerExecuted != null
                                                  ? { providerExecuted: b.providerExecuted }
                                                  : {}),
                                              ...(b.providerMetadata != null
                                                  ? { providerMetadata: b.providerMetadata }
                                                  : {}),
                                              ...(j != null ? { dynamic: j } : {}),
                                          });
                                    break;
                                }
                                case "tool-result": {
                                    const j = I(b.toolCallId);
                                    A.enqueue({
                                        type: "tool-output-available",
                                        toolCallId: b.toolCallId,
                                        output: b.output,
                                        ...(b.providerExecuted != null ? { providerExecuted: b.providerExecuted } : {}),
                                        ...(b.preliminary != null ? { preliminary: b.preliminary } : {}),
                                        ...(j != null ? { dynamic: j } : {}),
                                    });
                                    break;
                                }
                                case "tool-error": {
                                    const j = I(b.toolCallId);
                                    A.enqueue({
                                        type: "tool-output-error",
                                        toolCallId: b.toolCallId,
                                        errorText: d(b.error),
                                        ...(b.providerExecuted != null ? { providerExecuted: b.providerExecuted } : {}),
                                        ...(j != null ? { dynamic: j } : {}),
                                    });
                                    break;
                                }
                                case "error": {
                                    A.enqueue({ type: "error", errorText: d(b.error) });
                                    break;
                                }
                                case "start-step": {
                                    A.enqueue({ type: "start-step" });
                                    break;
                                }
                                case "finish-step": {
                                    A.enqueue({ type: "finish-step" });
                                    break;
                                }
                                case "start": {
                                    l &&
                                        A.enqueue({
                                            type: "start",
                                            ...(U != null ? { messageMetadata: U } : {}),
                                            ...(k != null ? { messageId: k } : {}),
                                        });
                                    break;
                                }
                                case "finish": {
                                    i &&
                                        A.enqueue({
                                            type: "finish",
                                            finishReason: b.finishReason,
                                            ...(U != null ? { messageMetadata: U } : {}),
                                        });
                                    break;
                                }
                                case "abort": {
                                    A.enqueue(b);
                                    break;
                                }
                                case "tool-input-end":
                                    break;
                                case "raw":
                                    break;
                                default: {
                                    const j = L;
                                    throw new Error(`Unknown chunk type: ${j}`);
                                }
                            }
                            (U != null &&
                                L !== "start" &&
                                L !== "finish" &&
                                A.enqueue({ type: "message-metadata", messageMetadata: U }),
                                b.type === "finish"
                                    ? w({ status: "completed" })
                                    : b.type === "abort"
                                      ? w({ status: "aborted" })
                                      : b.type === "error" && w({ status: "failed", error: b.error }));
                        },
                    }),
                )
                .getReader();
        let v = !1,
            M = !1;
        const _ = () => {
                v || (g.releaseLock(), (v = !0));
            },
            E = new ReadableStream({
                async pull(b) {
                    try {
                        const { done: A, value: U } = await g.read();
                        A ? (_(), M || b.close()) : b.enqueue(U);
                    } catch (A) {
                        (_(), M || (y(A), b.error(A)));
                    }
                },
                async cancel(b) {
                    if (((M = !0), !v))
                        try {
                            await g.cancel(b);
                        } finally {
                            _();
                        }
                },
            });
        return ln(
            Rg({ stream: E, messageId: k ?? t?.(), originalMessages: e, onFinish: n, onError: d, getOutcome: () => c }),
        );
    }
    pipeUIMessageStreamToResponse(
        e,
        {
            originalMessages: t,
            generateMessageId: n,
            onFinish: o,
            messageMetadata: r,
            sendReasoning: a,
            sendSources: l,
            sendFinish: i,
            sendStart: d,
            onError: c,
            ...p
        } = {},
    ) {
        return Og({
            response: e,
            stream: this.toUIMessageStream({
                originalMessages: t,
                generateMessageId: n,
                onFinish: o,
                messageMetadata: r,
                sendReasoning: a,
                sendSources: l,
                sendFinish: i,
                sendStart: d,
                onError: c,
            }),
            ...p,
        });
    }
    pipeTextStreamToResponse(e, t) {
        return vg({ response: e, textStream: this.textStream, ...t });
    }
    toUIMessageStreamResponse({
        originalMessages: e,
        generateMessageId: t,
        onFinish: n,
        messageMetadata: o,
        sendReasoning: r,
        sendSources: a,
        sendFinish: l,
        sendStart: i,
        onError: d,
        ...c
    } = {}) {
        return xg({
            stream: this.toUIMessageStream({
                originalMessages: e,
                generateMessageId: t,
                onFinish: n,
                messageMetadata: o,
                sendReasoning: r,
                sendSources: a,
                sendFinish: l,
                sendStart: i,
                onError: d,
            }),
            ...c,
        });
    }
    toTextStreamResponse(e) {
        return yg({ textStream: this.textStream, ...e });
    }
};
new TextEncoder();
en({ prefix: "aiobj", size: 24 });
en({ prefix: "aiobj", size: 24 });
var Lg = {};
bh(Lg, { object: () => Bg, text: () => jg });
var jg = () => ({
        type: "text",
        responseFormat: { type: "text" },
        async parsePartial({ text: e }) {
            return { partial: e };
        },
        async parseOutput({ text: e }) {
            return e;
        },
    }),
    Bg = ({ schema: e }) => {
        const t = vn(e);
        return {
            type: "object",
            responseFormat: { type: "json", schema: t.jsonSchema },
            async parsePartial({ text: n }) {
                const o = await il(n);
                switch (o.state) {
                    case "failed-parse":
                    case "undefined-input":
                        return;
                    case "repaired-parse":
                    case "successful-parse":
                        return { partial: o.value };
                    default: {
                        const r = o.state;
                        throw new Error(`Unsupported parse state: ${r}`);
                    }
                }
            },
            async parseOutput({ text: n }, o) {
                const r = await yt({ text: n });
                if (!r.success)
                    throw new pr({
                        message: "No object generated: could not parse the response.",
                        cause: r.error,
                        text: n,
                        response: o.response,
                        usage: o.usage,
                        finishReason: o.finishReason,
                    });
                const a = await at({ value: r.value, schema: t });
                if (!a.success)
                    throw new pr({
                        message: "No object generated: response did not match schema.",
                        cause: a.error,
                        text: n,
                        response: o.response,
                        usage: o.usage,
                        finishReason: o.finishReason,
                    });
                return a.value;
            },
        };
    };
const Bn = {
    openai: In("openai").defaultModel,
    anthropic: In("anthropic").defaultModel,
    google: In("google").defaultModel,
};
class sl {
    constructor(t) {
        ((this.supportsStreaming = !0), (this.supportsTools = !0), (this.name = t), (this.providerType = t));
    }
    configure(t) {
        ((this.apiKey = t.apiKey),
            (this.model = t.model),
            (this.baseUrl = t.baseUrl),
            (this.maxTokens = t.maxTokens),
            (this.temperature = t.temperature));
    }
    getModel() {
        if (!this.apiKey) {
            const t = new Error(`API key not configured for ${this.name}`);
            throw ((t.name = wl), t);
        }
        switch (this.providerType) {
            case "openai":
                return $i({ apiKey: this.apiKey, baseURL: this.baseUrl })(this.model ?? Bn.openai);
            case "anthropic":
                return vi({
                    apiKey: this.apiKey,
                    baseURL: this.baseUrl,
                    headers: { "anthropic-dangerous-direct-browser-access": "true" },
                })(this.model ?? Bn.anthropic);
            default:
                return Ci({ apiKey: this.apiKey, baseURL: this.baseUrl })(this.model ?? Bn.google);
        }
    }
    async generate(t, n, o) {
        try {
            return await this.generateUnsafe(t, n, o);
        } catch (r) {
            throw Sn(r, [this.apiKey]);
        }
    }
    async generateUnsafe(t, n, o) {
        const r = this.getModel(),
            a = this.convertMessages(t),
            l = this.convertTools(n),
            i = await mg({
                model: r,
                messages: a,
                tools: l,
                toolChoice: o?.toolChoice,
                maxOutputTokens: this.maxTokens,
                temperature: this.temperature,
                abortSignal: o?.signal,
            }),
            { usage: d } = i;
        return {
            text: i.text,
            toolCalls: this.convertToolCalls(i.toolCalls),
            usage:
                d.inputTokens !== void 0 && d.outputTokens !== void 0
                    ? { promptTokens: d.inputTokens, completionTokens: d.outputTokens }
                    : void 0,
        };
    }
    async generateStream(t, n, o, r) {
        const a = this.getModel(),
            l = this.convertMessages(t),
            i = this.convertTools(n),
            d = Dg({
                model: a,
                messages: l,
                tools: i,
                maxOutputTokens: this.maxTokens,
                temperature: this.temperature,
                abortSignal: r,
                onError: () => {},
            });
        let c = "";
        const p = [];
        try {
            for await (const y of d.fullStream)
                switch (y.type) {
                    case "text-delta":
                        ((c += y.text), o.onChunk(y.text));
                        break;
                    case "tool-call": {
                        let k = {};
                        "input" in y ? ({ input: k } = y) : "args" in y && ({ args: k } = y);
                        const x = { id: y.toolCallId, name: y.toolName, arguments: k };
                        (p.push(x), o.onToolCall(y.toolName, k));
                        break;
                    }
                    case "tool-result": {
                        let k;
                        ("output" in y ? ({ output: k } = y) : "result" in y && ({ result: k } = y),
                            o.onToolResult(y.toolName, k));
                        break;
                    }
                    case "error":
                        o.onError(Sn(y.error, [this.apiKey]));
                        break;
                    default:
                        break;
                }
            const w = await d.usage;
            o.onComplete({
                text: c,
                toolCalls: p,
                usage:
                    w.inputTokens !== void 0 && w.outputTokens !== void 0
                        ? { promptTokens: w.inputTokens, completionTokens: w.outputTokens }
                        : void 0,
            });
        } catch (w) {
            const y = Sn(w, [this.apiKey]);
            throw (o.onError(y), y);
        }
    }
    convertMessages(t) {
        const n = new Map();
        for (const o of t) for (const r of o.toolCalls ?? []) n.set(r.id, r.name);
        return t.map((o) => {
            switch (o.role) {
                case "system":
                    return { role: "system", content: o.content };
                case "user":
                    return { role: "user", content: o.content };
                case "assistant":
                    return o.toolCalls && o.toolCalls.length > 0
                        ? {
                              role: "assistant",
                              content: [
                                  ...(o.content ? [{ type: "text", text: o.content }] : []),
                                  ...o.toolCalls.map((r) => ({
                                      type: "tool-call",
                                      toolCallId: r.id,
                                      toolName: r.name,
                                      input: r.arguments,
                                  })),
                              ],
                          }
                        : { role: "assistant", content: o.content };
                default:
                    return {
                        role: "tool",
                        content: [
                            {
                                type: "tool-result",
                                toolCallId: o.toolCallId ?? "",
                                toolName: n.get(o.toolCallId ?? "") ?? "",
                                output: { type: "text", value: o.content },
                            },
                        ],
                    };
            }
        });
    }
    convertTools(t) {
        const n = {};
        for (const o of t) n[o.name] = { description: o.description, inputSchema: o.parameters };
        return n;
    }
    convertToolCalls(t) {
        return t ? t.map((n) => ({ id: n.toolCallId, name: n.toolName, arguments: n.input ?? n.args ?? {} })) : [];
    }
    async validateApiKey() {
        try {
            return (await this.generate([{ role: "user", content: "hi" }], [], {}), !0);
        } catch (t) {
            const n = t instanceof Error ? t.message.toLowerCase() : String(t).toLowerCase();
            if (
                n.includes("401") ||
                n.includes("403") ||
                n.includes("unauthorized") ||
                (n.includes("invalid") && n.includes("key")) ||
                n.includes("authentication") ||
                n.includes("api key")
            )
                return !1;
            throw t;
        }
    }
}
function Gg(e) {
    if (e === "mock") return new xr();
    if (e === "webllm")
        throw new Error(
            "WebLlmProvider cannot be created synchronously. Use createWebLlmProvider() or getWebLlmProviderClass() instead.",
        );
    return new sl(e);
}
async function Fg(e) {
    const { WebLlmProvider: t, requireWebLlmPackage: n } = await cl(
        async () => {
            const { WebLlmProvider: r, requireWebLlmPackage: a } = await import("./WebLlmProvider-zYPXU5qa.js");
            return { WebLlmProvider: r, requireWebLlmPackage: a };
        },
        __vite__mapDeps([0, 1, 2, 3]),
    );
    await n();
    const o = new t({ initializeOnFirstUse: !0 });
    return (o.configure({ model: e }), o);
}
const Wg = Object.freeze(
    Object.defineProperty(
        { __proto__: null, MockLlmProvider: xr, VercelAiProvider: sl, createProvider: Gg, loadWebLlmProvider: Fg },
        Symbol.toStringTag,
        { value: "Module" },
    ),
);
export { wl as A, vn as a, In as b, Gg as c, Wg as i, Sn as t };
//# sourceMappingURL=index-BceQi37_.js.map
