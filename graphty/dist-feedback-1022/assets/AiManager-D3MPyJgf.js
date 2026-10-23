import {
    aV as Bu,
    aW as wu,
    J as Iu,
    aX as _u,
    aY as Ft,
    aC as ne,
    aH as he,
    aF as W,
    aK as et,
    aZ as Tu,
    a_ as ls,
    aL as ds,
    aM as fs,
    aG as Mt,
    a$ as Pu,
    b0 as Mu,
    b1 as Nu,
    b2 as xu,
    b3 as yr,
    b4 as Ou,
    b5 as nn,
    b6 as Ru,
} from "./index-hDuyXkBS.js";
import {
    r as $u,
    b as ku,
    d as hs,
    e as ju,
    f as ps,
    g as Lu,
    h as Uu,
    i as Gu,
    j as zu,
    k as qu,
    l as Hu,
    m as Ku,
    n as Vu,
    o as Wu,
    p as Zu,
    q as Yu,
    s as Ju,
} from "./index-B5Ke6Umr.js";
import { t as Xu, A as Qu, c as ei } from "./index-BceQi37_.js";
import { ApiKeyManager as ti } from "./index-14tpf_nj.js";
import "./preload-helper-BXl3LOEh.js";
import "./label-style-DGSNp8RO.js";
import "./babylon-EA5yuCz0.js";
var Wt, sn;
function ri() {
    if (sn) return Wt;
    sn = 1;
    var e = $u(),
        t = function () {
            return e.Date.now();
        };
    return ((Wt = t), Wt);
}
var Zt, an;
function ni() {
    if (an) return Zt;
    an = 1;
    var e = /\s/;
    function t(r) {
        for (var s = r.length; s-- && e.test(r.charAt(s)););
        return s;
    }
    return ((Zt = t), Zt);
}
var Yt, un;
function si() {
    if (un) return Yt;
    un = 1;
    var e = ni(),
        t = /^\s+/;
    function r(s) {
        return s && s.slice(0, e(s) + 1).replace(t, "");
    }
    return ((Yt = r), Yt);
}
var Jt, on;
function ai() {
    if (on) return Jt;
    on = 1;
    var e = si(),
        t = hs(),
        r = ku(),
        s = NaN,
        u = /^[-+]0x[0-9a-f]+$/i,
        a = /^0b[01]+$/i,
        o = /^0o[0-7]+$/i,
        i = parseInt;
    function c(d) {
        if (typeof d == "number") return d;
        if (r(d)) return s;
        if (t(d)) {
            var h = typeof d.valueOf == "function" ? d.valueOf() : d;
            d = t(h) ? h + "" : h;
        }
        if (typeof d != "string") return d === 0 ? d : +d;
        d = e(d);
        var A = a.test(d);
        return A || o.test(d) ? i(d.slice(2), A ? 2 : 8) : u.test(d) ? s : +d;
    }
    return ((Jt = c), Jt);
}
var Xt, cn;
function ui() {
    if (cn) return Xt;
    cn = 1;
    var e = hs(),
        t = ri(),
        r = ai(),
        s = "Expected a function",
        u = Math.max,
        a = Math.min;
    function o(i, c, d) {
        var h,
            A,
            p,
            g,
            F,
            C,
            N = 0,
            b = !1,
            E = !1,
            P = !0;
        if (typeof i != "function") throw new TypeError(s);
        ((c = r(c) || 0),
            e(d) &&
                ((b = !!d.leading),
                (E = "maxWait" in d),
                (p = E ? u(r(d.maxWait) || 0, c) : p),
                (P = "trailing" in d ? !!d.trailing : P)));
        function y(H) {
            var oe = h,
                O = A;
            return ((h = A = void 0), (N = H), (g = i.apply(O, oe)), g);
        }
        function T(H) {
            return ((N = H), (F = setTimeout(se, c)), b ? y(H) : g);
        }
        function $(H) {
            var oe = H - C,
                O = H - N,
                f = c - oe;
            return E ? a(f, p - O) : f;
        }
        function z(H) {
            var oe = H - C,
                O = H - N;
            return C === void 0 || oe >= c || oe < 0 || (E && O >= p);
        }
        function se() {
            var H = t();
            if (z(H)) return pe(H);
            F = setTimeout(se, $(H));
        }
        function pe(H) {
            return ((F = void 0), P && h ? y(H) : ((h = A = void 0), g));
        }
        function ae() {
            (F !== void 0 && clearTimeout(F), (N = 0), (h = C = A = F = void 0));
        }
        function me() {
            return F === void 0 ? g : pe(t());
        }
        function ge() {
            var H = t(),
                oe = z(H);
            if (((h = arguments), (A = this), (C = H), oe)) {
                if (F === void 0) return T(C);
                if (E) return (clearTimeout(F), (F = setTimeout(se, c)), y(C));
            }
            return (F === void 0 && (F = setTimeout(se, c)), g);
        }
        return ((ge.cancel = ae), (ge.flush = me), ge);
    }
    return ((Xt = o), Xt);
}
var ii = ui();
const oi = Bu(ii);
class ms {
    constructor() {
        ((this.listeners = new Set()), (this.status = this.createInitialStatus()));
    }
    get current() {
        return this.status;
    }
    createInitialStatus() {
        return { state: "ready", canCancel: !1 };
    }
    notify() {
        for (const t of this.listeners) t(this.status);
    }
    submit() {
        ((this.status = { state: "submitted", startTime: Date.now(), canCancel: !0 }), this.notify());
    }
    updateElapsed() {
        this.status.startTime !== void 0 &&
            (this.status = { ...this.status, elapsed: Date.now() - this.status.startTime });
    }
    setStage(t, r) {
        ((this.status = { ...this.status, stage: t, stageMessage: r }), this.notify());
    }
    startStreaming() {
        ((this.status = { ...this.status, state: "streaming", streamedText: "", canCancel: !0 }), this.notify());
    }
    appendStreamedText(t) {
        ((this.status = { ...this.status, streamedText: (this.status.streamedText ?? "") + t }), this.notify());
    }
    addToolCall(t) {
        const r = this.status.toolCalls ?? [];
        ((this.status = { ...this.status, toolCalls: [...r, { name: t, status: "pending" }] }), this.notify());
    }
    updateToolCallStatus(t, r, s) {
        const { toolCalls: u } = this.status;
        if (!u) return;
        const a = u.findIndex((i) => i.name === t);
        if (a === -1) return;
        const o = [...u];
        ((o[a] = { ...o[a], status: r, result: s }), (this.status = { ...this.status, toolCalls: o }), this.notify());
    }
    startExecuting() {
        ((this.status = { ...this.status, state: "executing", canCancel: !0 }), this.notify());
    }
    complete() {
        ((this.status = { ...this.status, state: "ready", canCancel: !1 }), this.notify());
    }
    setError(t, r) {
        ((this.status = { ...this.status, state: "error", error: t, canRetry: r, canCancel: !1 }), this.notify());
    }
    reset() {
        ((this.status = this.createInitialStatus()), this.notify());
    }
    getSnapshot() {
        return { ...this.status };
    }
    subscribe(t) {
        return (
            this.listeners.add(t),
            () => {
                this.listeners.delete(t);
            }
        );
    }
}
const Qt = 10,
    ln = 50;
function ci(e) {
    const t = [];
    return (
        t.push(li(e)),
        e.nodeProperties.length > 0
            ? t.push(di(e.nodeProperties))
            : e.nodeCount > 0 &&
              t.push(`### Node Properties
No custom properties on node data.`),
        e.edgeProperties.length > 0
            ? t.push(fi(e.edgeProperties))
            : e.edgeCount > 0 &&
              t.push(`### Edge Properties
No custom properties on edge data.`),
        t.join(`

`)
    );
}
function li(e) {
    return `## Data Schema
- Nodes: ${e.nodeCount}
- Edges: ${e.edgeCount}
- In a selector, read a property below as data.<name>, for example data.type`;
}
function di(e) {
    const t = ["### Node Properties"];
    for (const r of e) t.push(gs(r));
    return t.join(`
`);
}
function fi(e) {
    const t = ["### Edge Properties"];
    for (const r of e) t.push(gs(r));
    return t.join(`
`);
}
function gs(e) {
    const t = gi(e.name),
        r = e.nullable ? "?" : "",
        s = hi(e),
        u = pi(e);
    return `- \`${t}\`: ${s}${r}${u}`;
}
function hi(e) {
    return e.type === "array" && e.itemType ? `${e.itemType}[]` : e.type;
}
function pi(e) {
    const t = [];
    if ((e.format && t.push(`format: ${e.format}`), e.enumValues && e.enumValues.length > 0)) {
        const r = mi(e.enumValues);
        t.push(`values: [${r}]`);
    }
    return (e.range && t.push(`range: ${e.range.min}..${e.range.max}`), t.length === 0 ? "" : ` (${t.join(", ")})`);
}
function mi(e) {
    if (e.length <= Qt) return e.map((s) => `"${s}"`).join(", ");
    const t = e.slice(0, Qt),
        r = e.length - Qt;
    return `${wu(t, ", ")}, ... +${r} more`;
}
function gi(e) {
    return e.length <= ln ? e : `${e.slice(0, ln - 3)}...`;
}
const dn = 5,
    Se = Iu.getLogger(["graphty", "ai"]),
    Di = {
        role: "user",
        content:
            "No more tools can run for this message. Answer me now in plain text: say what you found and what you changed, and if my request was unclear, ask what I want.",
    },
    fn = 8e3;
function yi(e) {
    if (e === void 0)
        return JSON.stringify({ success: !1, message: "Not run: an earlier tool call in this step failed." });
    const t = JSON.stringify({ success: e.success, message: e.message, data: e.data });
    return t.length > fn ? `${t.slice(0, fn)}... (truncated)` : t;
}
function hn(e) {
    return e.length === 0
        ? void 0
        : e.join(`
`);
}
let Ai = 0;
function Ci(e, t) {
    const { steps: r, position: s } = e.history;
    for (let u = s - 1; u >= 0; u--) if (r[u].provenance.message === t) return r[u].id;
}
function Ei(e, t) {
    const { steps: r, position: s } = e.history;
    return r.slice(s).some((u) => u.provenance.message === t);
}
async function bi(e, t) {
    for (;;) {
        const r = e.history.nextUndo;
        if (r?.kind !== "undo" || r.step.provenance.message !== t) return;
        await e.undo();
    }
}
class er extends Error {
    constructor(t) {
        (super("The provider failed."), (this.original = t));
    }
}
class pn extends Error {
    constructor(t) {
        (super(t.message), (this.result = t));
    }
}
class Si {
    constructor(t) {
        ((this.abortController = null),
            (this.disposed = !1),
            (this.currentInput = null),
            (this.startTime = null),
            (this.lastInput = null),
            (this.lastError = null),
            (this.cancelled = null),
            (this.provider = t.provider),
            (this.commandRegistry = t.commandRegistry),
            (this.graph = t.graph),
            (this.statusManager = new ms()),
            (this.schemaManager = t.schemaManager ?? null),
            (this.emitEvent = t.emitEvent),
            this.statusManager.subscribe((r) => {
                this.emitAiEvent({ type: "ai-status-change", status: r });
            }));
    }
    emitAiEvent(t) {
        this.emitEvent && this.emitEvent(t);
    }
    async execute(t) {
        if ((Se.debug("User input", { inputLength: t.length }), this.disposed))
            return { success: !1, message: "Controller has been disposed", code: "AI_DISPOSED", params: {} };
        ((this.currentInput = t), (this.lastInput = t), (this.startTime = Date.now()), (this.lastError = null));
        const r = new AbortController();
        ((this.abortController = r),
            this.emitAiEvent({ type: "ai-command-start", input: t, timestamp: this.startTime }),
            this.statusManager.submit());
        const s = String(++Ai);
        let u;
        try {
            const a = this.graph.getSession();
            u = a.on("history:changed", () => {
                !r.signal.aborted && Ei(a, s) && r.abort(new DOMException("The message was undone.", "AbortError"));
            });
            let o;
            try {
                o = await this.converse(t, a, s, r.signal);
            } catch (i) {
                if ((await bi(a, s), !(i instanceof pn))) throw i;
                (({ result: o } = i), this.cancelled === r && (o = { ...o, code: "AI_CANCELLED", params: {} }));
            }
            return (
                this.statusManager.complete(),
                this.emitAiEvent({ type: "ai-command-complete", result: o, duration: Date.now() - this.startTime }),
                o
            );
        } catch (a) {
            const o = a instanceof er ? a.original : a,
                i = Xu(o),
                c = i.message;
            return (
                (this.lastError = i),
                this.statusManager.setError(i, !0),
                this.emitAiEvent({ type: "ai-command-error", error: i, input: t, canRetry: !0 }),
                { success: !1, message: `Error: ${c}`, ...this.failureOutcome(a, i, r) }
            );
        } finally {
            (u?.(), (this.abortController = null), (this.currentInput = null));
        }
    }
    abortOutcome(t) {
        return { code: this.cancelled === t ? "AI_CANCELLED" : "AI_UNDONE", params: {} };
    }
    failureOutcome(t, r, s) {
        if (s.signal.aborted) return this.abortOutcome(s);
        if (!(t instanceof er)) return { code: "AI_FAILED", params: {} };
        const u = this.provider.name;
        if (r.name === Qu) return { code: "AI_KEY_MISSING", params: { provider: u } };
        const { statusCode: a } = r;
        return a === 401 || a === 403
            ? { code: "AI_KEY_REJECTED", params: { provider: u, status: a } }
            : { code: "AI_PROVIDER_ERROR", params: a === void 0 ? { provider: u } : { provider: u, status: a } };
    }
    getLastInput() {
        return this.lastInput;
    }
    getLastError() {
        return this.lastError;
    }
    clearLastError() {
        this.lastError = null;
    }
    buildMessages(t) {
        const s = this.commandRegistry.getAll().map((o) => `- ${o.name}: ${o.description}`).join(`
`),
            u = this.buildSchemaSection(),
            a = `You are an AI assistant that helps users interact with a graph visualization.

Available commands:
${s}
${u}
When the user asks you to perform an action, use the appropriate tool. If no tool is needed, respond conversationally.`;
        return this.provider.supportsSystemPromptWithTools === !1
            ? [
                  {
                      role: "user",
                      content: `${a}

${t}`,
                  },
              ]
            : [
                  { role: "system", content: a },
                  { role: "user", content: t },
              ];
    }
    buildSchemaSection() {
        if (!this.schemaManager) return "";
        const t = this.schemaManager.getSchema();
        return !t || (t.nodeCount === 0 && t.edgeCount === 0)
            ? ""
            : `
${this.schemaManager.getFormattedSchema()}
`;
    }
    async converse(t, r, s, u) {
        const a = this.buildMessages(t),
            o = this.commandRegistry.toToolDefinitions();
        (Se.debug("Request", {
            messageCount: a.length,
            promptLength: a.reduce((h, A) => h + A.content.length, 0),
            tools: o.map((h) => h.name),
        }),
            this.statusManager.startStreaming());
        const i = [],
            c = [];
        let d;
        for (let h = 1; ; h++) {
            const A = h > dn;
            let p;
            try {
                p = await this.provider.generate(A ? [...a, Di] : a, o, { signal: u, toolChoice: A ? "none" : "auto" });
            } catch (C) {
                throw new er(C);
            }
            if (
                (Se.debug("Response", {
                    turn: h,
                    textLength: p.text.length,
                    toolCalls: p.toolCalls.map((C) => this.knownToolName(C.name)),
                }),
                p.text &&
                    (c.push(p.text),
                    this.statusManager.appendStreamedText(p.text),
                    this.emitAiEvent({
                        type: "ai-stream-chunk",
                        text: p.text,
                        accumulated: c.join(`
`),
                    })),
                A || p.toolCalls.length === 0)
            )
                break;
            this.statusManager.startExecuting();
            const { toolCalls: g } = p,
                F = await r.transaction(
                    t,
                    async (C, N) => {
                        N.addEventListener(
                            "abort",
                            () => {
                                this.abortController?.abort(N.reason);
                            },
                            { once: !0 },
                        );
                        const b = await this.executeToolCalls(g, C, u);
                        if ((i.push(...b.results), (d ??= b.failure), b.threw))
                            throw new pn(this.combineResults(i, hn(c), d));
                        return b;
                    },
                    { provenance: { via: "assistant", message: s }, after: Ci(r, s) },
                );
            (h === dn && Se.debug("Out of tool turns: asking for a text answer only", { turns: h }),
                a.push({ role: "assistant", content: p.text, toolCalls: p.toolCalls }),
                p.toolCalls.forEach((C, N) => {
                    a.push({ role: "tool", toolCallId: C.id, content: yi(F.results.at(N)) });
                }));
        }
        return this.combineResults(i, hn(c), d);
    }
    async executeToolCalls(t, r, s) {
        const u = [];
        let a = !1,
            o;
        for (const i of t) {
            (s.throwIfAborted(),
                this.statusManager.addToolCall(i.name),
                this.statusManager.updateToolCallStatus(i.name, "executing"),
                this.emitAiEvent({ type: "ai-stream-tool-call", name: i.name, params: i.arguments }));
            try {
                const { result: c, code: d } = await this.executeToolCall(i, r);
                if (
                    (u.push(c),
                    this.statusManager.updateToolCallStatus(
                        i.name,
                        c.success ? "complete" : "error",
                        c.data ?? { message: c.message },
                    ),
                    this.emitAiEvent({
                        type: "ai-stream-tool-result",
                        name: i.name,
                        result: c.data ?? { message: c.message },
                        success: c.success,
                    }),
                    !c.success)
                ) {
                    o = { code: d ?? "AI_TOOL_FAILED", params: { tool: i.name } };
                    break;
                }
            } catch (c) {
                const d = c instanceof Error ? c.message : String(c),
                    h = { success: !1, message: `Error executing ${i.name}: ${d}` };
                (u.push(h),
                    this.statusManager.updateToolCallStatus(i.name, "error", { error: d }),
                    this.emitAiEvent({
                        type: "ai-stream-tool-result",
                        name: i.name,
                        result: { error: d },
                        success: !1,
                    }),
                    (a = !0),
                    (o = { code: "AI_TOOL_THREW", params: { tool: i.name } }));
                break;
            }
        }
        return { results: u, threw: a, failure: o };
    }
    knownToolName(t) {
        return this.commandRegistry.get(t) ? t : "(unknown)";
    }
    async executeToolCall(t, r) {
        Se.debug("Executing command", { name: this.knownToolName(t.name) });
        const s = this.commandRegistry.get(t.name);
        if (!s)
            return (
                Se.debug("Command result: FAILED - Unknown command", { nameLength: t.name.length }),
                {
                    result: { success: !1, message: `Unknown command: ${t.name}. Command not found in registry.` },
                    code: "AI_TOOL_UNKNOWN",
                }
            );
        let u;
        try {
            ((u = s.parameters.parse(t.arguments)),
                Se.debug("Validated arguments", { name: s.name, argumentCount: Object.keys(u).length }));
        } catch (i) {
            const c = i instanceof Error ? i.message : String(i);
            return (
                Se.debug("Command result: FAILED - Invalid arguments", {
                    name: s.name,
                    errorType: i instanceof Error ? i.name : typeof i,
                }),
                {
                    result: { success: !1, message: `Invalid arguments for ${t.name}: ${c}` },
                    code: "AI_TOOL_INVALID_ARGUMENTS",
                }
            );
        }
        const a = {
                graph: this.graph,
                tx: r,
                abortSignal: this.abortController?.signal ?? new AbortController().signal,
                emitEvent: (i, c) => {
                    Se.debug("Command emitted event", { name: s.name, type: i });
                },
                updateStatus: (i) => {
                    i.stageMessage && this.statusManager.setStage("executing", i.stageMessage);
                },
            },
            o = await s.execute(this.graph, u, a);
        return (
            Se.debug("Command result", {
                name: s.name,
                success: o.success,
                messageLength: o.message.length,
                hasData: o.data !== void 0,
            }),
            { result: o }
        );
    }
    combineResults(t, r, s) {
        if (t.length === 0)
            return {
                success: !0,
                message: r ?? "No response from AI",
                llmText: r,
                ...(r === void 0
                    ? { code: "AI_NO_RESPONSE", params: {} }
                    : { code: "AI_COMPLETED", params: { toolCalls: 0 } }),
            };
        const u = t.every((d) => d.success),
            a = t.map((d) => d.message);
        r && a.unshift(r);
        const o = [...new Set(t.flatMap((d) => d.affectedNodes ?? []))],
            i = [...new Set(t.flatMap((d) => d.affectedEdges ?? []))],
            c = t.filter((d) => d.success).pop() ?? t[t.length - 1];
        return {
            success: u,
            message: a.join(`
`),
            data: c.data,
            affectedNodes: o.length > 0 ? o : void 0,
            affectedEdges: i.length > 0 ? i : void 0,
            llmText: r,
            ...(u || s === void 0 ? { code: "AI_COMPLETED", params: { toolCalls: t.length } } : s),
        };
    }
    getStatus() {
        return this.statusManager.getSnapshot();
    }
    onStatusChange(t) {
        return this.statusManager.subscribe(t);
    }
    cancel() {
        this.abortController &&
            ((this.cancelled = this.abortController),
            this.abortController.abort(),
            this.currentInput &&
                this.emitAiEvent({ type: "ai-command-cancelled", input: this.currentInput, reason: "user" }));
    }
    dispose() {
        ((this.disposed = !0), this.cancel(), this.statusManager.reset());
    }
}
class Fi {
    constructor() {
        this.commands = new Map();
    }
    register(t) {
        if (this.commands.has(t.name)) throw new Error(`Command "${t.name}" is already registered`);
        this.commands.set(t.name, t);
    }
    get(t) {
        return this.commands.get(t);
    }
    has(t) {
        return this.commands.has(t);
    }
    getAll() {
        return Array.from(this.commands.values());
    }
    getNames() {
        return Array.from(this.commands.keys());
    }
    unregister(t) {
        this.commands.delete(t);
    }
    clear() {
        this.commands.clear();
    }
    toToolDefinitions() {
        return this.getAll().map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
    }
}
var Ie = {},
    Xe = {},
    tr = {},
    le = {},
    mn;
function Ds() {
    return (
        mn ||
            ((mn = 1),
            Object.defineProperty(le, "__esModule", { value: !0 }),
            (le.AnonymousSelectKey = le.Select = le.Not = le.Guard = le.PatternKind = void 0),
            (le.PatternKind = Symbol("@ts-pattern/pattern-kind")),
            (le.Guard = Symbol("@ts-pattern/guard")),
            (le.Not = Symbol("@ts-pattern/not")),
            (le.Select = Symbol("@ts-pattern/select")),
            (le.AnonymousSelectKey = "@ts-pattern/__anonymous-select-key")),
        le
    );
}
var rr = {},
    gn;
function ys() {
    return (
        gn ||
            ((gn = 1),
            (function (e) {
                (Object.defineProperty(e, "__esModule", { value: !0 }),
                    (e.instanceOf = e.select = e.not = e.when = void 0));
                const t = Ds(),
                    r = (i) => ({ [t.PatternKind]: t.Guard, [t.Guard]: i });
                e.when = r;
                const s = (i) => ({ [t.PatternKind]: t.Not, [t.Not]: i });
                e.not = s;
                function u(i) {
                    return i === void 0
                        ? { [t.PatternKind]: t.Select, [t.Select]: t.AnonymousSelectKey }
                        : { [t.PatternKind]: t.Select, [t.Select]: i };
                }
                e.select = u;
                function a(i) {
                    return (c) => c instanceof i;
                }
                const o = (i) => (0, e.when)(a(i));
                e.instanceOf = o;
            })(rr)),
        rr
    );
}
var at = {},
    Dn;
function vi() {
    if (Dn) return at;
    ((Dn = 1), Object.defineProperty(at, "__esModule", { value: !0 }), (at.__ = void 0));
    const e = ys();
    function t(g) {
        return !0;
    }
    function r(g) {
        return typeof g == "number";
    }
    function s(g) {
        return Number.isNaN(g);
    }
    function u(g) {
        return typeof g == "string";
    }
    function a(g) {
        return typeof g == "boolean";
    }
    function o(g) {
        return g == null;
    }
    const i = (0, e.when)(t),
        c = (0, e.when)(u),
        d = (0, e.when)(r),
        h = (0, e.when)(s),
        A = (0, e.when)(a),
        p = (0, e.when)(o);
    return ((at.__ = Object.assign(i, { string: c, number: d, NaN: h, boolean: A, nullish: p })), at);
}
var yn;
function As() {
    return (
        yn ||
            ((yn = 1),
            (function (e) {
                (Object.defineProperty(e, "__esModule", { value: !0 }),
                    (e.isMatching = e.match = e.instanceOf = e.select = e.not = e.when = e.__ = void 0));
                const t = Ds(),
                    r = ys();
                (Object.defineProperty(e, "when", {
                    enumerable: !0,
                    get: function () {
                        return r.when;
                    },
                }),
                    Object.defineProperty(e, "not", {
                        enumerable: !0,
                        get: function () {
                            return r.not;
                        },
                    }),
                    Object.defineProperty(e, "select", {
                        enumerable: !0,
                        get: function () {
                            return r.select;
                        },
                    }),
                    Object.defineProperty(e, "instanceOf", {
                        enumerable: !0,
                        get: function () {
                            return r.instanceOf;
                        },
                    }));
                const s = vi();
                Object.defineProperty(e, "__", {
                    enumerable: !0,
                    get: function () {
                        return s.__;
                    },
                });
                const u = (p) => a(p, []);
                e.match = u;
                const a = (p, g) => {
                        const F = () => {
                            const C = g.find(({ test: N }) => N(p));
                            if (!C) {
                                let N;
                                try {
                                    N = JSON.stringify(p);
                                } catch {
                                    N = p;
                                }
                                throw new Error(`Pattern matching error: no pattern matches value ${N}`);
                            }
                            return C.handler(C.select(p), p);
                        };
                        return {
                            with(...C) {
                                const N = C[C.length - 1],
                                    b = [],
                                    E = [];
                                for (let T = 0; T < C.length - 1; T++) {
                                    const $ = C[T];
                                    typeof $ == "function" ? E.push($) : b.push($);
                                }
                                let P = {};
                                const y = (T) =>
                                    !!(
                                        b.some(($) =>
                                            h($, T, (z, se) => {
                                                P[z] = se;
                                            }),
                                        ) && E.every(($) => $(T))
                                    );
                                return a(
                                    p,
                                    g.concat([
                                        {
                                            test: y,
                                            handler: N,
                                            select: (T) =>
                                                Object.keys(P).length
                                                    ? t.AnonymousSelectKey in P
                                                        ? P[t.AnonymousSelectKey]
                                                        : P
                                                    : T,
                                        },
                                    ]),
                                );
                            },
                            when: (C, N) => a(p, g.concat([{ test: C, handler: N, select: (b) => b }])),
                            otherwise: (C) => a(p, g.concat([{ test: () => !0, handler: C, select: (N) => N }])).run(),
                            exhaustive: () => F(),
                            run: F,
                        };
                    },
                    o = (p) => !!(p && typeof p == "object"),
                    i = (p) => {
                        const g = p;
                        return g && g[t.PatternKind] === t.Guard;
                    },
                    c = (p) => {
                        const g = p;
                        return g && g[t.PatternKind] === t.Not;
                    },
                    d = (p) => {
                        const g = p;
                        return g && g[t.PatternKind] === t.Select;
                    },
                    h = (p, g, F) => {
                        if (o(p)) {
                            if (i(p)) return !!p[t.Guard](g);
                            if (d(p)) return (F(p[t.Select], g), !0);
                            if (c(p)) return !h(p[t.Not], g, F);
                            if (!o(g)) return !1;
                            if (Array.isArray(p)) {
                                if (!Array.isArray(g)) return !1;
                                if (p.length === 1) {
                                    const C = {},
                                        N = (E, P) => {
                                            C[E] = (C[E] || []).concat([P]);
                                        },
                                        b = g.every((E) => h(p[0], E, N));
                                    return (b && Object.keys(C).forEach((E) => F(E, C[E])), b);
                                }
                                return p.length === g.length ? p.every((C, N) => h(C, g[N], F)) : !1;
                            }
                            if (p instanceof Map)
                                return g instanceof Map ? [...p.keys()].every((C) => h(p.get(C), g.get(C), F)) : !1;
                            if (p instanceof Set) {
                                if (!(g instanceof Set)) return !1;
                                if (p.size === 0) return g.size === 0;
                                if (p.size === 1) {
                                    const [C] = [...p.values()];
                                    return Object.values(s.__).includes(C) ? h([C], [...g.values()], F) : g.has(C);
                                }
                                return [...p.values()].every((C) => g.has(C));
                            }
                            return Object.keys(p).every((C) => C in g && h(p[C], g[C], F));
                        }
                        return g === p;
                    };
                function A(...p) {
                    if (p.length === 1) {
                        const [g] = p;
                        return (F) => h(g, F, () => {});
                    }
                    if (p.length === 2) {
                        const [g, F] = p;
                        return h(g, F, () => {});
                    }
                    throw new Error(`isMatching wasn't given enough arguments: expected 1 or 2, received ${p.length}.`);
                }
                e.isMatching = A;
            })(tr)),
        tr
    );
}
var _e = {},
    De = {},
    de = {},
    ut = {},
    An;
function Nt() {
    if (An) return ut;
    ((An = 1), Object.defineProperty(ut, "__esModule", { value: !0 }), (ut.AddressError = void 0));
    class e extends Error {
        constructor(r, s) {
            (super(r), (this.name = "AddressError"), (this.parseMessage = s));
        }
    }
    return ((ut.AddressError = e), ut);
}
var Cn;
function Ar() {
    if (Cn) return de;
    ((Cn = 1),
        Object.defineProperty(de, "__esModule", { value: !0 }),
        (de.isInSubnet = t),
        (de.isHostInSubnet = r),
        (de.isGloballyReachable = s),
        (de.offsetBigInt = u),
        (de.isCorrect = a),
        (de.prefixLengthFromMask = o),
        (de.assertByteArray = i),
        (de.numberToPaddedHex = c),
        (de.stringToPaddedHex = d),
        (de.testBit = h));
    const e = Nt();
    function t(A) {
        return this.subnetMask < A.subnetMask ? !1 : r.call(this, A);
    }
    function r(A) {
        return this.binaryZeroPad().length !== A.binaryZeroPad().length ? !1 : this.mask(A.subnetMask) === A.mask();
    }
    function s(A) {
        let p = null;
        for (let g = 0; g < A.length; g++) {
            const F = A[g];
            F.reachable !== null &&
                r.call(this, F.subnet) &&
                (p === null || F.subnet.subnetMask > p.subnet.subnetMask) &&
                (p = F);
        }
        return p === null ? !0 : p.reachable;
    }
    function u(A, p, g, F) {
        if (typeof p == "number" && !Number.isSafeInteger(p))
            throw new e.AddressError(`${F} offset must be an integer`);
        if (typeof p != "number" && typeof p != "bigint") throw new e.AddressError(`${F} offset must be an integer`);
        const C = A + BigInt(p);
        if (C < BigInt(0) || C > (BigInt(1) << BigInt(g)) - BigInt(1))
            throw new e.AddressError(`${F} offset leaves the address space`);
        return C;
    }
    function a(A) {
        return function () {
            return this.addressMinusSuffix !== this.correctForm()
                ? !1
                : this.subnetMask === A && !this.parsedSubnet
                  ? !0
                  : this.parsedSubnet === String(this.subnetMask);
        };
    }
    function o(A, p) {
        const g = A.toString(2).padStart(p, "0");
        if (g.length > p) throw new e.AddressError("Invalid subnet mask.");
        const F = g.indexOf("0");
        if (F === -1) return p;
        if (g.slice(F).includes("1")) throw new e.AddressError("Invalid subnet mask.");
        return F;
    }
    function i(A, p, g, F) {
        if (A.length !== p) throw new e.AddressError(`${g} addresses require exactly ${p} bytes`);
        for (let C = 0; C < A.length; C++)
            if (!Number.isInteger(A[C]) || A[C] < F || A[C] > 255)
                throw new e.AddressError(`All bytes must be integers between ${F} and 255`);
    }
    function c(A) {
        return A.toString(16).padStart(2, "0");
    }
    function d(A) {
        return c(parseInt(A, 10));
    }
    function h(A, p) {
        const { length: g } = A;
        if (p > g) return !1;
        const F = g - p;
        return A.substring(F, F + 1) === "1";
    }
    return de;
}
var fe = {},
    En;
function Cs() {
    return (
        En ||
            ((En = 1),
            Object.defineProperty(fe, "__esModule", { value: !0 }),
            (fe.SPECIAL_PURPOSE = fe.RE_SUBNET_STRING = fe.RE_ADDRESS = fe.GROUPS = fe.BITS = void 0),
            (fe.BITS = 32),
            (fe.GROUPS = 4),
            (fe.RE_ADDRESS =
                /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/g),
            (fe.RE_SUBNET_STRING = /\/\d{1,2}$/),
            (fe.SPECIAL_PURPOSE = [
                ["0.0.0.0/8", "This network", !1],
                ["0.0.0.0/32", "This host on this network", !1],
                ["10.0.0.0/8", "Private-Use", !1],
                ["100.64.0.0/10", "Shared Address Space", !1],
                ["127.0.0.0/8", "Loopback", !1],
                ["169.254.0.0/16", "Link Local", !1],
                ["172.16.0.0/12", "Private-Use", !1],
                ["192.0.0.0/24", "IETF Protocol Assignments", !1],
                ["192.0.0.0/29", "IPv4 Service Continuity Prefix", !1],
                ["192.0.0.8/32", "IPv4 dummy address", !1],
                ["192.0.0.9/32", "Port Control Protocol Anycast", !0],
                ["192.0.0.10/32", "Traversal Using Relays around NAT Anycast", !0],
                ["192.0.0.170/32", "NAT64/DNS64 Discovery", !1],
                ["192.0.0.171/32", "NAT64/DNS64 Discovery", !1],
                ["192.0.2.0/24", "Documentation (TEST-NET-1)", !1],
                ["192.31.196.0/24", "AS112-v4", !0],
                ["192.52.193.0/24", "AMT", !0],
                ["192.88.99.0/24", "Deprecated (6to4 Relay Anycast)", null],
                ["192.88.99.2/32", "6a44-relay anycast address", !1],
                ["192.168.0.0/16", "Private-Use", !1],
                ["192.175.48.0/24", "Direct Delegation AS112 Service", !0],
                ["198.18.0.0/15", "Benchmarking", !1],
                ["198.51.100.0/24", "Documentation (TEST-NET-2)", !1],
                ["203.0.113.0/24", "Documentation (TEST-NET-3)", !1],
                ["240.0.0.0/4", "Reserved", !1],
                ["255.255.255.255/32", "Limited Broadcast", !1],
            ])),
        fe
    );
}
var bn;
function Es() {
    if (bn) return De;
    bn = 1;
    var e =
            (De && De.__createBinding) ||
            (Object.create
                ? function (P, y, T, $) {
                      $ === void 0 && ($ = T);
                      var z = Object.getOwnPropertyDescriptor(y, T);
                      ((!z || ("get" in z ? !y.__esModule : z.writable || z.configurable)) &&
                          (z = {
                              enumerable: !0,
                              get: function () {
                                  return y[T];
                              },
                          }),
                          Object.defineProperty(P, $, z));
                  }
                : function (P, y, T, $) {
                      ($ === void 0 && ($ = T), (P[$] = y[T]));
                  }),
        t =
            (De && De.__setModuleDefault) ||
            (Object.create
                ? function (P, y) {
                      Object.defineProperty(P, "default", { enumerable: !0, value: y });
                  }
                : function (P, y) {
                      P.default = y;
                  }),
        r =
            (De && De.__importStar) ||
            function (P) {
                if (P && P.__esModule) return P;
                var y = {};
                if (P != null)
                    for (var T in P) T !== "default" && Object.prototype.hasOwnProperty.call(P, T) && e(y, P, T);
                return (t(y, P), y);
            };
    (Object.defineProperty(De, "__esModule", { value: !0 }), (De.Address4 = void 0));
    const s = r(Ar()),
        u = r(Cs()),
        a = Nt(),
        o = s.isCorrect(u.BITS);
    class i {
        constructor(y) {
            ((this.addressMinusSuffix = ""),
                (this.groups = u.GROUPS),
                (this.parsedAddress = []),
                (this.parsedSubnet = ""),
                (this.subnet = "/32"),
                (this.subnetMask = 32),
                (this.v4 = !0),
                (this.isCorrect = o),
                (this.isInSubnet = s.isInSubnet),
                (this.isHostInSubnet = s.isHostInSubnet),
                (this.address = y));
            const T = u.RE_SUBNET_STRING.exec(y);
            if (T) {
                if (
                    ((this.parsedSubnet = T[0].replace("/", "")),
                    (this.subnetMask = parseInt(this.parsedSubnet, 10)),
                    (this.subnet = `/${this.subnetMask}`),
                    this.subnetMask < 0 || this.subnetMask > u.BITS)
                )
                    throw new a.AddressError("Invalid subnet mask.");
                y = y.replace(u.RE_SUBNET_STRING, "");
            }
            const $ = u.GROUPS * 4 - 1;
            if (y.length > $) throw new a.AddressError(`IPv4 addresses are at most ${$} characters.`);
            ((this.addressMinusSuffix = y), (this.parsedAddress = this.parse(y)));
        }
        static isValid(y) {
            try {
                return (new i(y), !0);
            } catch {
                return !1;
            }
        }
        parse(y) {
            const T = y.split(".");
            if (T.some(($) => /^0\d/.test($))) throw new a.AddressError("IPv4 addresses can't have leading zeroes.");
            if (!y.match(u.RE_ADDRESS)) throw new a.AddressError("Invalid IPv4 address.");
            return T;
        }
        correctForm() {
            return this.parsedAddress.map((y) => parseInt(y, 10)).join(".");
        }
        static fromAddressAndMask(y, T) {
            const $ = s.prefixLengthFromMask(new i(T).bigInt(), u.BITS);
            return new i(`${y}/${$}`);
        }
        static fromAddressAndWildcardMask(y, T) {
            const $ = new i(T).bigInt(),
                z = (BigInt(1) << BigInt(u.BITS)) - BigInt(1),
                se = $ ^ z,
                pe = s.prefixLengthFromMask(se, u.BITS);
            return new i(`${y}/${pe}`);
        }
        static fromWildcard(y) {
            const T = y.split(".");
            if (T.length !== u.GROUPS) throw new a.AddressError("Wildcard pattern must have 4 octets");
            let $ = -1;
            for (let ae = 0; ae < T.length; ae++)
                if (T[ae] === "*") $ === -1 && ($ = ae);
                else if ($ !== -1)
                    throw new a.AddressError("Wildcard `*` must only appear in trailing octets (e.g. `192.168.0.*`)");
            const z = $ === -1 ? 0 : T.length - $,
                se = T.map((ae) => (ae === "*" ? "0" : ae)),
                pe = u.BITS - z * 8;
            return new i(`${se.join(".")}/${pe}`);
        }
        static fromHex(y) {
            const T = y.replace(/:/g, "");
            if (!/^[0-9a-fA-F]{8}$/.test(T)) throw new a.AddressError("IPv4 hex must be exactly 8 hex digits");
            const $ = [];
            for (let z = 0; z < 8; z += 2) $.push(parseInt(T.slice(z, z + 2), 16));
            return new i($.join("."));
        }
        static fromInteger(y) {
            if (!Number.isInteger(y) || y < 0 || y > 4294967295)
                throw new a.AddressError("IPv4 integer must be in the range 0 to 2**32 - 1");
            return i.fromHex(y.toString(16).padStart(8, "0"));
        }
        static fromArpa(y) {
            const T = u.GROUPS * 4 - 1 + 3 + 14;
            if (y.length > T) throw new a.AddressError(`in-addr.arpa names are at most ${T} characters.`);
            const z = y
                .replace(/(\.in-addr\.arpa)?\.?$/i, "")
                .split(".")
                .reverse()
                .join(".");
            return new i(z);
        }
        toHex() {
            return this.parsedAddress.map((y) => s.stringToPaddedHex(y)).join(":");
        }
        toArray() {
            return this.parsedAddress.map((y) => parseInt(y, 10));
        }
        toGroup6() {
            const y = [];
            let T;
            for (T = 0; T < u.GROUPS; T += 2)
                y.push(
                    `${s.stringToPaddedHex(this.parsedAddress[T])}${s.stringToPaddedHex(this.parsedAddress[T + 1])}`,
                );
            return y.join(":");
        }
        bigInt() {
            return BigInt(`0x${this.parsedAddress.map((y) => s.stringToPaddedHex(y)).join("")}`);
        }
        _startAddress() {
            return BigInt(`0b${this.mask() + "0".repeat(u.BITS - this.subnetMask)}`);
        }
        startAddress() {
            return i.fromBigInt(this._startAddress());
        }
        startAddressExclusive() {
            const y = BigInt("1");
            return i.fromBigInt(this._startAddress() + y);
        }
        offset(y) {
            return i.fromBigInt(s.offsetBigInt(this.bigInt(), y, u.BITS, "IPv4")).withSubnetMask(this.subnetMask);
        }
        nextNetwork() {
            return i.fromBigInt(s.offsetBigInt(this._endAddress(), 1, u.BITS, "IPv4")).withSubnetMask(this.subnetMask);
        }
        withSubnetMask(y) {
            return new i(`${this.correctForm()}/${y}`);
        }
        _endAddress() {
            return BigInt(`0b${this.mask() + "1".repeat(u.BITS - this.subnetMask)}`);
        }
        endAddress() {
            return i.fromBigInt(this._endAddress());
        }
        endAddressExclusive() {
            const y = BigInt("1");
            return i.fromBigInt(this._endAddress() - y);
        }
        subnetMaskAddress() {
            return i.fromBigInt(BigInt(`0b${"1".repeat(this.subnetMask)}${"0".repeat(u.BITS - this.subnetMask)}`));
        }
        wildcardMask() {
            return i.fromBigInt(BigInt(`0b${"0".repeat(this.subnetMask)}${"1".repeat(u.BITS - this.subnetMask)}`));
        }
        networkForm() {
            return `${this.startAddress().correctForm()}/${this.subnetMask}`;
        }
        static fromBigInt(y) {
            if (y < BigInt(0) || y > BigInt(4294967295))
                throw new a.AddressError("IPv4 BigInt must be in the range 0 to 2**32 - 1");
            return i.fromHex(y.toString(16).padStart(8, "0"));
        }
        static fromByteArray(y) {
            return (s.assertByteArray(y, 4, "IPv4", 0), this.fromUnsignedByteArray(y));
        }
        static fromUnsignedByteArray(y) {
            if (y.length !== 4) throw new a.AddressError("IPv4 addresses require exactly 4 bytes");
            const T = y.join(".");
            return new i(T);
        }
        mask(y) {
            return (y === void 0 && (y = this.subnetMask), this.getBitsBase2(0, y));
        }
        getBitsBase2(y, T) {
            return this.binaryZeroPad().slice(y, T);
        }
        reverseForm(y) {
            y || (y = {});
            const T = this.correctForm().split(".").reverse().join(".");
            return y.omitSuffix ? T : `${T}.in-addr.arpa.`;
        }
        isMulticast() {
            return this.isHostInSubnet(c);
        }
        isPrivate() {
            return d.some((y) => this.isHostInSubnet(y));
        }
        isLoopback() {
            return this.isHostInSubnet(h);
        }
        isLinkLocal() {
            return this.isHostInSubnet(A);
        }
        isUnspecified() {
            return this.isHostInSubnet(p);
        }
        isBroadcast() {
            return this.isHostInSubnet(g);
        }
        isCGNAT() {
            return this.isHostInSubnet(F);
        }
        isDocumentation() {
            return C.some((y) => this.isHostInSubnet(y));
        }
        isBenchmarking() {
            return this.isHostInSubnet(N);
        }
        isReserved() {
            return this.isHostInSubnet(b);
        }
        isGlobal() {
            return !this.isMulticast() && s.isGloballyReachable.call(this, E);
        }
        binaryZeroPad() {
            return (
                this._binaryZeroPad === void 0 &&
                    (this._binaryZeroPad = this.bigInt().toString(2).padStart(u.BITS, "0")),
                this._binaryZeroPad
            );
        }
        groupForV6() {
            const y = this.parsedAddress;
            return this.correctForm().replace(
                u.RE_ADDRESS,
                `<span class="hover-group group-v4 group-6">${y.slice(0, 2).join(".")}</span>.<span class="hover-group group-v4 group-7">${y.slice(2, 4).join(".")}</span>`,
            );
        }
    }
    De.Address4 = i;
    const c = new i("224.0.0.0/4"),
        d = [new i("10.0.0.0/8"), new i("172.16.0.0/12"), new i("192.168.0.0/16")],
        h = new i("127.0.0.0/8"),
        A = new i("169.254.0.0/16"),
        p = new i("0.0.0.0/32"),
        g = new i("255.255.255.255/32"),
        F = new i("100.64.0.0/10"),
        C = [new i("192.0.2.0/24"), new i("198.51.100.0/24"), new i("203.0.113.0/24")],
        N = new i("198.18.0.0/15"),
        b = new i("240.0.0.0/4"),
        E = u.SPECIAL_PURPOSE.map(([P, , y]) => ({ subnet: new i(P), reachable: y }));
    return De;
}
var ye = {},
    Y = {},
    Sn;
function bs() {
    return (
        Sn ||
            ((Sn = 1),
            Object.defineProperty(Y, "__esModule", { value: !0 }),
            (Y.SPECIAL_PURPOSE =
                Y.RE_URL_WITH_PORT =
                Y.RE_URL =
                Y.RE_ZONE_STRING =
                Y.RE_SUBNET_STRING =
                Y.RE_BAD_ADDRESS =
                Y.RE_BAD_CHARACTERS =
                Y.TYPES =
                Y.SCOPES =
                Y.GROUPS =
                Y.BITS =
                    void 0),
            (Y.BITS = 128),
            (Y.GROUPS = 8),
            (Y.SCOPES = {
                0: "Reserved",
                1: "Interface local",
                2: "Link local",
                4: "Admin local",
                5: "Site local",
                8: "Organization local",
                14: "Global",
                15: "Reserved",
            }),
            (Y.TYPES = {
                "ff01::1/128": "Multicast (All nodes on this interface)",
                "ff01::2/128": "Multicast (All routers on this interface)",
                "ff02::1/128": "Multicast (All nodes on this link)",
                "ff02::2/128": "Multicast (All routers on this link)",
                "ff05::2/128": "Multicast (All routers in this site)",
                "ff02::5/128": "Multicast (OSPFv3 AllSPF routers)",
                "ff02::6/128": "Multicast (OSPFv3 AllDR routers)",
                "ff02::9/128": "Multicast (RIP routers)",
                "ff02::a/128": "Multicast (EIGRP routers)",
                "ff02::d/128": "Multicast (PIM routers)",
                "ff02::16/128": "Multicast (MLDv2 reports)",
                "ff01::fb/128": "Multicast (mDNSv6)",
                "ff02::fb/128": "Multicast (mDNSv6)",
                "ff05::fb/128": "Multicast (mDNSv6)",
                "ff02::1:2/128": "Multicast (All DHCP servers and relay agents on this link)",
                "ff05::1:2/128": "Multicast (All DHCP servers and relay agents in this site)",
                "ff02::1:3/128": "Multicast (All DHCP servers on this link)",
                "ff05::1:3/128": "Multicast (All DHCP servers in this site)",
                "::/128": "Unspecified",
                "::1/128": "Loopback",
                "::ffff:0:0/96": "IPv4-mapped",
                "ff00::/8": "Multicast",
                "fe80::/10": "Link-local unicast",
                "fc00::/7": "Unique local",
                "2001::/32": "Teredo",
                "2001:2::/48": "Benchmarking",
                "2002::/16": "6to4",
                "2001:db8::/32": "Documentation",
                "3fff::/20": "Documentation",
                "100::/64": "Discard-only",
                "fec0::/10": "Site-local unicast (deprecated)",
                "::/96": "IPv4-compatible (deprecated)",
                "64:ff9b::/96": "NAT64 (well-known)",
                "64:ff9b:1::/48": "NAT64 (local-use)",
            }),
            (Y.RE_BAD_CHARACTERS = /([^0-9a-f:/%])/gi),
            (Y.RE_BAD_ADDRESS = /([0-9a-f]{5,}|:{3,}|[^:]:$|^:[^:]|\/$)/gi),
            (Y.RE_SUBNET_STRING = /\/\d{1,3}(?=%|$)/),
            (Y.RE_ZONE_STRING = /%.*$/),
            (Y.RE_URL = /^(?:\[([0-9a-f:.]+)\]|([0-9a-f:.]+))(?:[/?#].*)?$/i),
            (Y.RE_URL_WITH_PORT = /^\[([0-9a-f:.]+)\]:([0-9]{1,5})(?:[/?#].*)?$/i),
            (Y.SPECIAL_PURPOSE = [
                ["::1/128", "Loopback Address", !1],
                ["::/128", "Unspecified Address", !1],
                ["::ffff:0:0/96", "IPv4-mapped Address", !1],
                ["64:ff9b::/96", "IPv4-IPv6 Translat.", !0],
                ["64:ff9b:1::/48", "IPv4-IPv6 Translat.", !1],
                ["100::/64", "Discard-Only Address Block", !1],
                ["100:0:0:1::/64", "Dummy IPv6 Prefix", !1],
                ["2001::/23", "IETF Protocol Assignments", !1],
                ["2001::/32", "TEREDO", !1],
                ["2001:1::1/128", "Port Control Protocol Anycast", !0],
                ["2001:1::2/128", "Traversal Using Relays around NAT Anycast", !0],
                ["2001:1::3/128", "DNS-SD Service Registration Protocol Anycast", !0],
                ["2001:2::/48", "Benchmarking", !1],
                ["2001:3::/32", "AMT", !0],
                ["2001:4:112::/48", "AS112-v6", !0],
                ["2001:10::/28", "Deprecated (previously ORCHID)", null],
                ["2001:20::/28", "ORCHIDv2", !0],
                ["2001:30::/28", "Drone Remote ID Protocol Entity Tags (DETs) Prefix", !0],
                ["2001:db8::/32", "Documentation", !1],
                ["2002::/16", "6to4", !1],
                ["2620:4f:8000::/48", "Direct Delegation AS112 Service", !0],
                ["3fff::/20", "Documentation", !1],
                ["5f00::/16", "Segment Routing (SRv6) SIDs", !1],
                ["fc00::/7", "Unique-Local", !1],
                ["fe80::/10", "Link-Local Unicast", !1],
            ])),
        Y
    );
}
var Oe = {},
    Fn;
function Ss() {
    if (Fn) return Oe;
    ((Fn = 1),
        Object.defineProperty(Oe, "__esModule", { value: !0 }),
        (Oe.escapeHtml = e),
        (Oe.spanAllZeroes = t),
        (Oe.spanAll = r),
        (Oe.spanLeadingZeroes = u),
        (Oe.simpleGroup = a));
    function e(o) {
        return o
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    function t(o) {
        return e(o).replace(/(0+)/g, '<span class="zero">$1</span>');
    }
    function r(o, i = 0) {
        return o
            .split("")
            .map((d, h) => `<span class="digit value-${e(d)} position-${h + i}">${t(d)}</span>`)
            .join("");
    }
    function s(o) {
        return e(o).replace(/^(0+)/, '<span class="zero">$1</span>');
    }
    function u(o) {
        return o
            .split(":")
            .map((c) => s(c))
            .join(":");
    }
    function a(o, i = 0) {
        return o
            .split(":")
            .map((d, h) => (/group-v4/.test(d) ? d : `<span class="hover-group group-${h + i}">${s(d)}</span>`));
    }
    return Oe;
}
var ue = {},
    vn;
function Bi() {
    if (vn) return ue;
    vn = 1;
    var e =
            (ue && ue.__createBinding) ||
            (Object.create
                ? function (c, d, h, A) {
                      A === void 0 && (A = h);
                      var p = Object.getOwnPropertyDescriptor(d, h);
                      ((!p || ("get" in p ? !d.__esModule : p.writable || p.configurable)) &&
                          (p = {
                              enumerable: !0,
                              get: function () {
                                  return d[h];
                              },
                          }),
                          Object.defineProperty(c, A, p));
                  }
                : function (c, d, h, A) {
                      (A === void 0 && (A = h), (c[A] = d[h]));
                  }),
        t =
            (ue && ue.__setModuleDefault) ||
            (Object.create
                ? function (c, d) {
                      Object.defineProperty(c, "default", { enumerable: !0, value: d });
                  }
                : function (c, d) {
                      c.default = d;
                  }),
        r =
            (ue && ue.__importStar) ||
            function (c) {
                if (c && c.__esModule) return c;
                var d = {};
                if (c != null)
                    for (var h in c) h !== "default" && Object.prototype.hasOwnProperty.call(c, h) && e(d, c, h);
                return (t(d, c), d);
            };
    (Object.defineProperty(ue, "__esModule", { value: !0 }),
        (ue.ADDRESS_BOUNDARY = void 0),
        (ue.groupPossibilities = u),
        (ue.padGroup = a),
        (ue.simpleRegularExpression = o),
        (ue.possibleElisions = i));
    const s = r(bs());
    function u(c) {
        return `(${c.join("|")})`;
    }
    function a(c) {
        return c.length < 4 ? `0{0,${4 - c.length}}${c}` : c;
    }
    ue.ADDRESS_BOUNDARY = "[^A-Fa-f0-9:]";
    function o(c) {
        const d = [];
        c.forEach((A, p) => {
            parseInt(A, 16) === 0 && d.push(p);
        });
        const h = d.map((A) =>
            c
                .map((p, g) => {
                    if (g === A) {
                        const F = g === 0 || g === s.GROUPS - 1 ? ":" : "";
                        return u([a(p), F]);
                    }
                    return a(p);
                })
                .join(":"),
        );
        return (h.push(c.map(a).join(":")), u(h));
    }
    function i(c, d, h) {
        const A = d ? "" : ":",
            p = h ? "" : ":",
            g = [];
        (!d && !h && g.push("::"),
            d && h && g.push(""),
            ((h && !d) || (!h && d)) && g.push(":"),
            g.push(`${A}(:0{1,4}){1,${c - 1}}`),
            g.push(`(0{1,4}:){1,${c - 1}}${p}`),
            g.push(`(0{1,4}:){${c - 1}}0{1,4}`));
        for (let F = 1; F < c - 1; F++)
            for (let C = 1; C < c - F; C++) g.push(`(0{1,4}:){${C}}:(0{1,4}:){${c - C - F - 1}}0{1,4}`);
        return u(g);
    }
    return ue;
}
var Bn;
function wi() {
    if (Bn) return ye;
    Bn = 1;
    var e =
            (ye && ye.__createBinding) ||
            (Object.create
                ? function (O, f, S, I) {
                      I === void 0 && (I = S);
                      var _ = Object.getOwnPropertyDescriptor(f, S);
                      ((!_ || ("get" in _ ? !f.__esModule : _.writable || _.configurable)) &&
                          (_ = {
                              enumerable: !0,
                              get: function () {
                                  return f[S];
                              },
                          }),
                          Object.defineProperty(O, I, _));
                  }
                : function (O, f, S, I) {
                      (I === void 0 && (I = S), (O[I] = f[S]));
                  }),
        t =
            (ye && ye.__setModuleDefault) ||
            (Object.create
                ? function (O, f) {
                      Object.defineProperty(O, "default", { enumerable: !0, value: f });
                  }
                : function (O, f) {
                      O.default = f;
                  }),
        r =
            (ye && ye.__importStar) ||
            function (O) {
                if (O && O.__esModule) return O;
                var f = {};
                if (O != null)
                    for (var S in O) S !== "default" && Object.prototype.hasOwnProperty.call(O, S) && e(f, O, S);
                return (t(f, O), f);
            };
    (Object.defineProperty(ye, "__esModule", { value: !0 }), (ye.Address6 = void 0));
    const s = r(Ar()),
        u = r(Cs()),
        a = r(bs()),
        o = r(Ss()),
        i = Es(),
        c = Bi(),
        d = Nt(),
        h = Ar(),
        A = s.isCorrect(a.BITS);
    function p(O) {
        if (!O) throw new Error("Assertion failed.");
    }
    function g(O) {
        const f = /(\d+)(\d{3})/;
        for (; f.test(O);) O = O.replace(f, "$1,$2");
        return O;
    }
    function F(O) {
        return (
            (O = O.replace(/^(0{1,})([1-9]+)$/, '<span class="parse-error">$1</span>$2')),
            (O = O.replace(/^(0{1,})(0)$/, '<span class="parse-error">$1</span>$2')),
            O
        );
    }
    function C(O, f) {
        const S = [],
            I = [];
        let _;
        for (_ = 0; _ < O.length; _++) _ < f[0] ? S.push(O[_]) : _ > f[1] && I.push(O[_]);
        return S.concat(["compact"]).concat(I);
    }
    function N(O) {
        return parseInt(O, 16).toString(16).padStart(4, "0");
    }
    function b(O) {
        return O & 255;
    }
    class E {
        constructor(f, S) {
            ((this.addressMinusSuffix = ""),
                (this.parsedSubnet = ""),
                (this.subnet = "/128"),
                (this.subnetMask = 128),
                (this.v4 = !1),
                (this.zone = ""),
                (this.isInSubnet = s.isInSubnet),
                (this.isHostInSubnet = s.isHostInSubnet),
                (this.isCorrect = A),
                S === void 0 ? (this.groups = a.GROUPS) : (this.groups = S),
                (this.address = f));
            const I = a.RE_SUBNET_STRING.exec(f);
            if (I) {
                if (
                    ((this.parsedSubnet = I[0].replace("/", "")),
                    (this.subnetMask = parseInt(this.parsedSubnet, 10)),
                    (this.subnet = `/${this.subnetMask}`),
                    Number.isNaN(this.subnetMask) || this.subnetMask < 0 || this.subnetMask > a.BITS)
                )
                    throw new d.AddressError("Invalid subnet mask.");
                f = f.replace(a.RE_SUBNET_STRING, "");
            }
            if (/\//.test(f)) throw new d.AddressError("Invalid subnet mask.");
            const _ = a.RE_ZONE_STRING.exec(f);
            _ && ((this.zone = _[0]), (f = f.replace(a.RE_ZONE_STRING, "")));
            const D = this.groups * 5 + 5;
            if (f.length > D) throw new d.AddressError(`IPv6 addresses are at most ${D} characters.`);
            ((this.addressMinusSuffix = f), (this.parsedAddress = this.parse(this.addressMinusSuffix)));
        }
        static isValid(f) {
            try {
                return (new E(f), !0);
            } catch {
                return !1;
            }
        }
        static fromBigInt(f) {
            if (f < BigInt(0) || f > (BigInt(1) << BigInt(a.BITS)) - BigInt(1))
                throw new d.AddressError("IPv6 BigInt must be in the range 0 to 2**128 - 1");
            const S = f.toString(16).padStart(32, "0"),
                I = [];
            for (let _ = 0; _ < a.GROUPS; _++) I.push(S.slice(_ * 4, (_ + 1) * 4));
            return new E(I.join(":"));
        }
        static fromURL(f) {
            var S;
            let I,
                _ = null,
                D,
                v;
            const w = f.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
            if (w.indexOf("[") !== -1 && w.indexOf("]:") !== -1) {
                if (((v = "failed to parse address with port"), (D = a.RE_URL_WITH_PORT.exec(w)), D === null))
                    return { error: v, address: null, port: null };
                ((I = D[1]), (_ = D[2]));
            } else {
                if (((v = "failed to parse address from URL"), (D = a.RE_URL.exec(w)), D === null))
                    return { error: v, address: null, port: null };
                I = (S = D[1]) !== null && S !== void 0 ? S : D[2];
            }
            _ ? ((_ = parseInt(_, 10)), (_ < 0 || _ > 65535) && (_ = null)) : (_ = null);
            let R;
            try {
                R = new E(I);
            } catch {
                return { error: v, address: null, port: null };
            }
            return { address: R, port: _ };
        }
        static fromAddressAndMask(f, S) {
            const I = s.prefixLengthFromMask(new E(S).bigInt(), a.BITS);
            return new E(`${f}/${I}`);
        }
        static fromAddressAndWildcardMask(f, S) {
            const I = new E(S).bigInt(),
                _ = (BigInt(1) << BigInt(a.BITS)) - BigInt(1),
                D = I ^ _,
                v = s.prefixLengthFromMask(D, a.BITS);
            return new E(`${f}/${v}`);
        }
        static fromWildcard(f) {
            if (f.includes("%") || f.includes("/"))
                throw new d.AddressError("Wildcard pattern must not include a zone or CIDR suffix");
            const S = f.split("::");
            if (S.length > 2) throw new d.AddressError("Wildcard pattern cannot contain more than one '::'");
            let I;
            if (S.length === 2) {
                const R = S[0] === "" ? [] : S[0].split(":"),
                    j = S[1] === "" ? [] : S[1].split(":"),
                    q = a.GROUPS - R.length - j.length;
                if (q < 1) throw new d.AddressError("Wildcard pattern with '::' has too many groups");
                I = [...R, ...new Array(q).fill("0"), ...j];
            } else I = f.split(":");
            if (I.length !== a.GROUPS) throw new d.AddressError("Wildcard pattern must have 8 groups");
            let _ = -1;
            for (let R = 0; R < I.length; R++)
                if (I[R] === "*") _ === -1 && (_ = R);
                else if (_ !== -1)
                    throw new d.AddressError(
                        "Wildcard `*` must only appear in trailing groups (e.g. `2001:db8:*:*:*:*:*:*`)",
                    );
            const D = _ === -1 ? 0 : I.length - _,
                v = I.map((R) => (R === "*" ? "0" : R)),
                w = a.BITS - D * 16;
            return new E(`${v.join(":")}/${w}`);
        }
        static fromAddress4(f) {
            const S = new i.Address4(f),
                I = a.BITS - (u.BITS - S.subnetMask);
            return new E(`::ffff:${S.correctForm()}/${I}`);
        }
        static fromArpa(f) {
            const S = f.replace(/(\.ip6\.arpa)?\.?$/i, "");
            if (!/^[0-9a-f](\.[0-9a-f]){0,31}$/i.test(S)) throw new d.AddressError("Invalid 'ip6.arpa' form.");
            const I = S.split(".").reverse(),
                _ = I.length * 4,
                D = I.join("").padEnd(32, "0"),
                v = [];
            for (let w = 0; w < a.GROUPS; w++) v.push(D.slice(w * 4, (w + 1) * 4));
            return new E(`${v.join(":")}/${_}`);
        }
        microsoftTranscription() {
            return `${this.correctForm().replace(/:/g, "-")}.ipv6-literal.net`;
        }
        mask(f = this.subnetMask) {
            return this.getBitsBase2(0, f);
        }
        possibleSubnets(f = 128) {
            const S = a.BITS - this.subnetMask,
                I = Math.abs(f - a.BITS),
                _ = S - I;
            return _ < 0 ? "0" : g((BigInt("2") ** BigInt(_)).toString(10));
        }
        _startAddress() {
            return BigInt(`0b${this.mask() + "0".repeat(a.BITS - this.subnetMask)}`);
        }
        startAddress() {
            return E.fromBigInt(this._startAddress());
        }
        startAddressExclusive() {
            const f = BigInt("1");
            return E.fromBigInt(this._startAddress() + f);
        }
        _endAddress() {
            return BigInt(`0b${this.mask() + "1".repeat(a.BITS - this.subnetMask)}`);
        }
        endAddress() {
            return E.fromBigInt(this._endAddress());
        }
        endAddressExclusive() {
            const f = BigInt("1");
            return E.fromBigInt(this._endAddress() - f);
        }
        offset(f) {
            return E.fromBigInt(s.offsetBigInt(this.bigInt(), f, a.BITS, "IPv6")).withSubnetMask(this.subnetMask);
        }
        nextNetwork() {
            return E.fromBigInt(s.offsetBigInt(this._endAddress(), 1, a.BITS, "IPv6")).withSubnetMask(this.subnetMask);
        }
        withSubnetMask(f) {
            return new E(`${this.correctForm()}/${f}`);
        }
        subnetMaskAddress() {
            return E.fromBigInt(BigInt(`0b${"1".repeat(this.subnetMask)}${"0".repeat(a.BITS - this.subnetMask)}`));
        }
        wildcardMask() {
            return E.fromBigInt(BigInt(`0b${"0".repeat(this.subnetMask)}${"1".repeat(a.BITS - this.subnetMask)}`));
        }
        networkForm() {
            return `${this.startAddress().correctForm()}/${this.subnetMask}`;
        }
        getScope() {
            const f = this.getType();
            return f === "Multicast" || f.startsWith("Multicast ")
                ? a.SCOPES[parseInt(this.getBits(12, 16).toString(10), 10)] || "Unknown"
                : f === "Link-local unicast" || f === "Loopback"
                  ? "Link local"
                  : f === "Unspecified"
                    ? "Unknown"
                    : "Global";
        }
        getType() {
            for (let f = 0; f < P.length; f++) {
                const S = P[f];
                if (this.isHostInSubnet(S[0])) return S[1];
            }
            return "Global unicast";
        }
        getBits(f, S) {
            return BigInt(`0b${this.getBitsBase2(f, S)}`);
        }
        getBitsBase2(f, S) {
            return this.binaryZeroPad().slice(f, S);
        }
        getBitsBase16(f, S) {
            const I = S - f;
            if (I % 4 !== 0) throw new Error("Length of bits to retrieve must be divisible by four");
            return this.getBits(f, S)
                .toString(16)
                .padStart(I / 4, "0");
        }
        getBitsPastSubnet() {
            return this.getBitsBase2(this.subnetMask, a.BITS);
        }
        reverseForm(f) {
            f || (f = {});
            const S = Math.floor(this.subnetMask / 4),
                I = this.canonicalForm().replace(/:/g, "").split("").slice(0, S).reverse().join(".");
            return S > 0 ? (f.omitSuffix ? I : `${I}.ip6.arpa.`) : f.omitSuffix ? "" : "ip6.arpa.";
        }
        correctForm() {
            let f,
                S = [],
                I = 0;
            const _ = [];
            for (f = 0; f < this.parsedAddress.length; f++) {
                const w = parseInt(this.parsedAddress[f], 16);
                (w === 0 && I++, w !== 0 && I > 0 && (I > 1 && _.push([f - I, f - 1]), (I = 0)));
            }
            I > 1 && _.push([this.parsedAddress.length - I, this.parsedAddress.length - 1]);
            const D = _.map((w) => w[1] - w[0] + 1);
            if (_.length > 0) {
                const w = D.indexOf(Math.max(...D));
                S = C(this.parsedAddress, _[w]);
            } else S = this.parsedAddress;
            for (f = 0; f < S.length; f++) S[f] !== "compact" && (S[f] = parseInt(S[f], 16).toString(16));
            let v = S.join(":");
            return (
                (v = v.replace(/^compact$/, "::")),
                (v = v.replace(/(^compact)|(compact$)/, ":")),
                (v = v.replace(/compact/, "")),
                v
            );
        }
        binaryZeroPad() {
            return (
                this._binaryZeroPad === void 0 &&
                    (this._binaryZeroPad = this.bigInt().toString(2).padStart(a.BITS, "0")),
                this._binaryZeroPad
            );
        }
        parse4in6(f) {
            if (f.indexOf(".") === -1) return f;
            const S = f.split(":"),
                I = S.slice(-1)[0],
                _ = I.split(".");
            if (_.length === u.GROUPS && _.every((v) => /^\d{1,3}$/.test(v)) && _.some((v) => /^0\d/.test(v))) {
                const v = _.map(F).join("."),
                    w = S.slice(0, -1).map(o.escapeHtml).join(":"),
                    R = S.length > 1 ? ":" : "";
                throw new d.AddressError("IPv4 addresses can't have leading zeroes.", `${w}${R}${v}`);
            }
            const D = I.match(u.RE_ADDRESS);
            if (D) {
                this.parsedAddress4 = D[0];
                const v = this.subnetMask >= 96 ? `/${this.subnetMask - 96}` : "";
                ((this.address4 = new i.Address4(`${this.parsedAddress4}${v}`)),
                    (this.v4 = !0),
                    (S[S.length - 1] = this.address4.toGroup6()),
                    (f = S.join(":")));
            }
            return f;
        }
        parse(f) {
            f = this.parse4in6(f);
            const S = f.match(a.RE_BAD_CHARACTERS);
            if (S)
                throw new d.AddressError(
                    `Bad character${S.length > 1 ? "s" : ""} detected in address: ${S.join("")}`,
                    f.replace(a.RE_BAD_CHARACTERS, '<span class="parse-error">$1</span>'),
                );
            const I = f.match(a.RE_BAD_ADDRESS);
            if (I)
                throw new d.AddressError(
                    `Address failed regex: ${I.join("")}`,
                    f.replace(a.RE_BAD_ADDRESS, '<span class="parse-error">$1</span>'),
                );
            let _ = [];
            const D = f.split("::");
            if (D.length === 2) {
                let v = D[0].split(":"),
                    w = D[1].split(":");
                (v.length === 1 && v[0] === "" && (v = []), w.length === 1 && w[0] === "" && (w = []));
                const R = this.groups - (v.length + w.length);
                if (!R) throw new d.AddressError("Error parsing groups");
                ((this.elidedGroups = R),
                    (this.elisionBegin = v.length),
                    (this.elisionEnd = v.length + this.elidedGroups),
                    (_ = _.concat(v)));
                for (let j = 0; j < R; j++) _.push("0");
                _ = _.concat(w);
            } else if (D.length === 1) ((_ = f.split(":")), (this.elidedGroups = 0));
            else throw new d.AddressError("Too many :: groups found");
            if (((_ = _.map((v) => parseInt(v, 16).toString(16))), _.length !== this.groups))
                throw new d.AddressError("Incorrect number of groups found");
            return _;
        }
        canonicalForm() {
            return this.parsedAddress.map(N).join(":");
        }
        decimal() {
            return this.parsedAddress.map((f) => parseInt(f, 16).toString(10).padStart(5, "0")).join(":");
        }
        bigInt() {
            return BigInt(`0x${this.parsedAddress.map(N).join("")}`);
        }
        to4() {
            const f = this.binaryZeroPad().split(""),
                S = BigInt(`0b${f.slice(96, 128).join("")}`)
                    .toString(16)
                    .padStart(8, "0");
            if (this.subnetMask >= 96) {
                const I = this.subnetMask - 96,
                    _ = [];
                for (let D = 0; D < 8; D += 2) _.push(parseInt(S.slice(D, D + 2), 16));
                return new i.Address4(`${_.join(".")}/${I}`);
            }
            return i.Address4.fromHex(S);
        }
        to4in6() {
            const f = this.to4(),
                I = new E(this.parsedAddress.slice(0, 6).join(":"), 6).correctForm();
            let _ = "";
            return (/:$/.test(I) || (_ = ":"), I + _ + f.correctForm());
        }
        inspectTeredo() {
            const f = this.getBitsBase16(0, 32),
                I = (this.getBits(80, 96) ^ BigInt("0xffff")).toString(),
                _ = i.Address4.fromHex(this.getBitsBase16(32, 64)),
                D = this.getBits(96, 128),
                v = i.Address4.fromHex((D ^ BigInt("0xffffffff")).toString(16).padStart(8, "0")),
                w = this.getBitsBase2(64, 80),
                R = (0, h.testBit)(w, 15),
                j = (0, h.testBit)(w, 14),
                q = (0, h.testBit)(w, 8),
                Q = (0, h.testBit)(w, 9),
                Ce = BigInt(`0b${w.slice(2, 6) + w.slice(8, 16)}`).toString(10);
            return {
                prefix: `${f.slice(0, 4)}:${f.slice(4, 8)}`,
                server4: _.address,
                client4: v.address,
                flags: w,
                coneNat: R,
                microsoft: { reserved: j, universalLocal: Q, groupIndividual: q, nonce: Ce },
                udpPort: I,
            };
        }
        inspect6to4() {
            const f = this.getBitsBase16(0, 16),
                S = i.Address4.fromHex(this.getBitsBase16(16, 48));
            return { prefix: f.slice(0, 4), gateway: S.address };
        }
        to6to4() {
            if (!this.is4()) return null;
            const f = ["2002", this.getBitsBase16(96, 112), this.getBitsBase16(112, 128), "", "/16"].join(":");
            return new E(f);
        }
        static fromAddress4Nat64(f, S = "64:ff9b::/96") {
            const I = new i.Address4(f),
                _ = new E(S),
                D = _.subnetMask;
            if (D !== 32 && D !== 40 && D !== 48 && D !== 56 && D !== 64 && D !== 96)
                throw new d.AddressError("NAT64 prefix length must be 32, 40, 48, 56, 64, or 96");
            const v = _.binaryZeroPad(),
                w = I.binaryZeroPad();
            let R;
            if (D === 96) R = v.slice(0, 96) + w;
            else {
                const Q = 64 - D;
                R = [v.slice(0, D), w.slice(0, Q), "00000000", w.slice(Q), "0".repeat(56 - (32 - Q))].join("");
            }
            const j = BigInt(`0b${R}`).toString(16).padStart(32, "0"),
                q = [];
            for (let Q = 0; Q < 8; Q++) q.push(j.slice(Q * 4, (Q + 1) * 4));
            return new E(q.join(":"));
        }
        toAddress4Nat64(f = "64:ff9b::/96") {
            const S = new E(f),
                I = S.subnetMask;
            if (I !== 32 && I !== 40 && I !== 48 && I !== 56 && I !== 64 && I !== 96)
                throw new d.AddressError("NAT64 prefix length must be 32, 40, 48, 56, 64, or 96");
            if (!this.isHostInSubnet(S)) return null;
            const _ = this.binaryZeroPad();
            let D;
            if (I === 96) D = _.slice(96, 128);
            else {
                const w = 64 - I;
                D = _.slice(I, I + w) + _.slice(72, 72 + (32 - w));
            }
            const v = [];
            for (let w = 0; w < 4; w++) v.push(parseInt(D.slice(w * 8, (w + 1) * 8), 2).toString());
            return new i.Address4(v.join("."));
        }
        toByteArray() {
            const f = this.bigInt()
                    .toString(16)
                    .padStart(a.BITS / 4, "0"),
                S = [];
            for (let I = 0, _ = f.length; I < _; I += 2) S.push(parseInt(f.substring(I, I + 2), 16));
            return S;
        }
        toUnsignedByteArray() {
            return this.toByteArray().map(b);
        }
        static fromByteArray(f) {
            return (s.assertByteArray(f, 16, "IPv6", -128), this.fromUnsignedByteArray(f.map(b)));
        }
        static fromUnsignedByteArray(f) {
            s.assertByteArray(f, 16, "IPv6", 0);
            const S = BigInt("256");
            let I = BigInt("0"),
                _ = BigInt("1");
            for (let D = f.length - 1; D >= 0; D--) ((I += _ * BigInt(f[D].toString(10))), (_ *= S));
            return E.fromBigInt(I);
        }
        isCanonical() {
            return this.addressMinusSuffix === this.canonicalForm();
        }
        isLinkLocal() {
            const f = this.embeddedIPv4();
            return f ? f.isLinkLocal() : this.isHostInSubnet(z);
        }
        isMulticast() {
            const f = this.embeddedIPv4();
            if (f) return f.isMulticast();
            const S = this.getType();
            return S === "Multicast" || S.startsWith("Multicast ");
        }
        is4() {
            return this.v4;
        }
        isMapped4() {
            return this.isHostInSubnet(ge);
        }
        embeddedIPv4() {
            return this.isMapped4() || this.isHostInSubnet(H) ? this.to4() : null;
        }
        isTeredo() {
            return this.isHostInSubnet(y);
        }
        is6to4() {
            return this.isHostInSubnet(T);
        }
        isLoopback() {
            const f = this.embeddedIPv4();
            return f ? f.isLoopback() : this.getType() === "Loopback";
        }
        isULA() {
            return this.isHostInSubnet($);
        }
        isPrivate() {
            const f = this.embeddedIPv4();
            return f ? f.isPrivate() : this.isULA() || this.isHostInSubnet(oe);
        }
        isCGNAT() {
            const f = this.embeddedIPv4();
            return f ? f.isCGNAT() : !1;
        }
        isBroadcast() {
            const f = this.embeddedIPv4();
            return f ? f.isBroadcast() : !1;
        }
        isUnspecified() {
            const f = this.embeddedIPv4();
            return f ? f.isUnspecified() : this.getType() === "Unspecified";
        }
        isDocumentation() {
            return se.some((f) => this.isHostInSubnet(f));
        }
        isBenchmarking() {
            const f = this.embeddedIPv4();
            return f ? f.isBenchmarking() : this.isHostInSubnet(pe);
        }
        isGlobal() {
            const f = this.embeddedIPv4();
            return f ? f.isGlobal() : this.isHostInSubnet(ae) && s.isGloballyReachable.call(this, me);
        }
        href(f) {
            return (f === void 0 ? (f = "") : (f = `:${f}`), `http://[${this.correctForm()}]${f}/`);
        }
        link(f) {
            (f || (f = {}),
                f.className === void 0 && (f.className = ""),
                f.prefix === void 0 && (f.prefix = "/#address="),
                f.v4 === void 0 && (f.v4 = !1));
            let S = this.correctForm;
            f.v4 && (S = this.to4in6);
            const I = S.call(this),
                _ = o.escapeHtml(`${f.prefix}${I}`),
                D = o.escapeHtml(I);
            if (f.className) {
                const v = o.escapeHtml(f.className);
                return `<a href="${_}" class="${v}">${D}</a>`;
            }
            return `<a href="${_}">${D}</a>`;
        }
        group() {
            if (this.elidedGroups === 0) return o.simpleGroup(this.addressMinusSuffix).join(":");
            (p(typeof this.elidedGroups == "number"), p(typeof this.elisionBegin == "number"));
            const f = [],
                [S, I] = this.addressMinusSuffix.split("::");
            S.length ? f.push(...o.simpleGroup(S)) : f.push("");
            const _ = ["hover-group"];
            for (let D = this.elisionBegin; D < this.elisionBegin + this.elidedGroups; D++) _.push(`group-${D}`);
            return (
                f.push(`<span class="${_.join(" ")}"></span>`),
                I.length ? f.push(...o.simpleGroup(I, this.elisionEnd)) : f.push(""),
                this.is4() && (p(this.address4 instanceof i.Address4), f.pop(), f.push(this.address4.groupForV6())),
                f.join(":")
            );
        }
        regularExpressionString(f = !1) {
            let S = [];
            const I = new E(this.correctForm());
            if (I.elidedGroups === 0) S.push((0, c.simpleRegularExpression)(I.parsedAddress));
            else if (I.elidedGroups === a.GROUPS) S.push((0, c.possibleElisions)(a.GROUPS));
            else {
                const _ = I.address.split("::");
                (_[0].length && S.push((0, c.simpleRegularExpression)(_[0].split(":"))),
                    p(typeof I.elidedGroups == "number"),
                    S.push((0, c.possibleElisions)(I.elidedGroups, _[0].length !== 0, _[1].length !== 0)),
                    _[1].length && S.push((0, c.simpleRegularExpression)(_[1].split(":"))),
                    (S = [S.join(":")]));
            }
            return (
                f ||
                    (S = [
                        "(?=^|",
                        c.ADDRESS_BOUNDARY,
                        "|[^\\w\\:])(",
                        ...S,
                        ")(?=[^\\w\\:]|",
                        c.ADDRESS_BOUNDARY,
                        "|$)",
                    ]),
                S.join("")
            );
        }
        regularExpression(f = !1) {
            return new RegExp(this.regularExpressionString(f), "i");
        }
    }
    ye.Address6 = E;
    const P = Object.keys(a.TYPES).map((O) => [new E(O), a.TYPES[O]]),
        y = new E("2001::/32"),
        T = new E("2002::/16"),
        $ = new E("fc00::/7"),
        z = new E("fe80::/10"),
        se = [new E("2001:db8::/32"), new E("3fff::/20")],
        pe = new E("2001:2::/48"),
        ae = new E("2000::/3"),
        me = a.SPECIAL_PURPOSE.map(([O, , f]) => ({ subnet: new E(O), reachable: f })),
        ge = new E("::ffff:0:0/96"),
        H = new E("64:ff9b::/96"),
        oe = new E("64:ff9b:1::/48");
    return ye;
}
var wn;
function Ii() {
    return (
        wn ||
            ((wn = 1),
            (function (e) {
                var t =
                        (_e && _e.__createBinding) ||
                        (Object.create
                            ? function (c, d, h, A) {
                                  A === void 0 && (A = h);
                                  var p = Object.getOwnPropertyDescriptor(d, h);
                                  ((!p || ("get" in p ? !d.__esModule : p.writable || p.configurable)) &&
                                      (p = {
                                          enumerable: !0,
                                          get: function () {
                                              return d[h];
                                          },
                                      }),
                                      Object.defineProperty(c, A, p));
                              }
                            : function (c, d, h, A) {
                                  (A === void 0 && (A = h), (c[A] = d[h]));
                              }),
                    r =
                        (_e && _e.__setModuleDefault) ||
                        (Object.create
                            ? function (c, d) {
                                  Object.defineProperty(c, "default", { enumerable: !0, value: d });
                              }
                            : function (c, d) {
                                  c.default = d;
                              }),
                    s =
                        (_e && _e.__importStar) ||
                        function (c) {
                            if (c && c.__esModule) return c;
                            var d = {};
                            if (c != null)
                                for (var h in c)
                                    h !== "default" && Object.prototype.hasOwnProperty.call(c, h) && t(d, c, h);
                            return (r(d, c), d);
                        };
                (Object.defineProperty(e, "__esModule", { value: !0 }),
                    (e.v6 = e.AddressError = e.Address6 = e.Address4 = void 0));
                var u = Es();
                Object.defineProperty(e, "Address4", {
                    enumerable: !0,
                    get: function () {
                        return u.Address4;
                    },
                });
                var a = wi();
                Object.defineProperty(e, "Address6", {
                    enumerable: !0,
                    get: function () {
                        return a.Address6;
                    },
                });
                var o = Nt();
                Object.defineProperty(e, "AddressError", {
                    enumerable: !0,
                    get: function () {
                        return o.AddressError;
                    },
                });
                const i = s(Ss());
                e.v6 = { helpers: i };
            })(_e)),
        _e
    );
}
var In = Ii();
const _i =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
function Fs(e) {
    return typeof e == "string" && _i.test(e);
}
function Ti(e) {
    if (!Fs(e)) throw TypeError("Invalid UUID");
    return parseInt(e.slice(14, 15), 16);
}
var Pi = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/,
    Mi =
        /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/,
    Ni =
        /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/,
    nr = { Space_Separator: Pi, ID_Start: Mi, ID_Continue: Ni },
    ee = {
        isSpaceSeparator(e) {
            return typeof e == "string" && nr.Space_Separator.test(e);
        },
        isIdStartChar(e) {
            return (
                typeof e == "string" &&
                ((e >= "a" && e <= "z") || (e >= "A" && e <= "Z") || e === "$" || e === "_" || nr.ID_Start.test(e))
            );
        },
        isIdContinueChar(e) {
            return (
                typeof e == "string" &&
                ((e >= "a" && e <= "z") ||
                    (e >= "A" && e <= "Z") ||
                    (e >= "0" && e <= "9") ||
                    e === "$" ||
                    e === "_" ||
                    e === "‌" ||
                    e === "‍" ||
                    nr.ID_Continue.test(e))
            );
        },
        isDigit(e) {
            return typeof e == "string" && /[0-9]/.test(e);
        },
        isHexDigit(e) {
            return typeof e == "string" && /[0-9A-Fa-f]/.test(e);
        },
    };
let Cr, ie, Pe, It, Re, Ae, re, vr, ft;
var xi = function (t, r) {
    ((Cr = String(t)),
        (ie = "start"),
        (Pe = []),
        (It = 0),
        (Re = 1),
        (Ae = 0),
        (re = void 0),
        (vr = void 0),
        (ft = void 0));
    do ((re = Oi()), ki[ie]());
    while (re.type !== "eof");
    return typeof r == "function" ? Er({ "": ft }, "", r) : ft;
};
function Er(e, t, r) {
    const s = e[t];
    if (s != null && typeof s == "object")
        if (Array.isArray(s))
            for (let u = 0; u < s.length; u++) {
                const a = String(u),
                    o = Er(s, a, r);
                o === void 0
                    ? delete s[a]
                    : Object.defineProperty(s, a, { value: o, writable: !0, enumerable: !0, configurable: !0 });
            }
        else
            for (const u in s) {
                const a = Er(s, u, r);
                a === void 0
                    ? delete s[u]
                    : Object.defineProperty(s, u, { value: a, writable: !0, enumerable: !0, configurable: !0 });
            }
    return r.call(e, t, s);
}
let U, k, lt, Te, G;
function Oi() {
    for (U = "default", k = "", lt = !1, Te = 1; ;) {
        G = Me();
        const e = vs[U]();
        if (e) return e;
    }
}
function Me() {
    if (Cr[It]) return String.fromCodePoint(Cr.codePointAt(It));
}
function B() {
    const e = Me();
    return (
        e ===
        `
`
            ? (Re++, (Ae = 0))
            : e
              ? (Ae += e.length)
              : Ae++,
        e && (It += e.length),
        e
    );
}
const vs = {
    default() {
        switch (G) {
            case "	":
            case "\v":
            case "\f":
            case " ":
            case " ":
            case "\uFEFF":
            case `
`:
            case "\r":
            case "\u2028":
            case "\u2029":
                B();
                return;
            case "/":
                (B(), (U = "comment"));
                return;
            case void 0:
                return (B(), J("eof"));
        }
        if (ee.isSpaceSeparator(G)) {
            B();
            return;
        }
        return vs[ie]();
    },
    comment() {
        switch (G) {
            case "*":
                (B(), (U = "multiLineComment"));
                return;
            case "/":
                (B(), (U = "singleLineComment"));
                return;
        }
        throw X(B());
    },
    multiLineComment() {
        switch (G) {
            case "*":
                (B(), (U = "multiLineCommentAsterisk"));
                return;
            case void 0:
                throw X(B());
        }
        B();
    },
    multiLineCommentAsterisk() {
        switch (G) {
            case "*":
                B();
                return;
            case "/":
                (B(), (U = "default"));
                return;
            case void 0:
                throw X(B());
        }
        (B(), (U = "multiLineComment"));
    },
    singleLineComment() {
        switch (G) {
            case `
`:
            case "\r":
            case "\u2028":
            case "\u2029":
                (B(), (U = "default"));
                return;
            case void 0:
                return (B(), J("eof"));
        }
        B();
    },
    value() {
        switch (G) {
            case "{":
            case "[":
                return J("punctuator", B());
            case "n":
                return (B(), Ke("ull"), J("null", null));
            case "t":
                return (B(), Ke("rue"), J("boolean", !0));
            case "f":
                return (B(), Ke("alse"), J("boolean", !1));
            case "-":
            case "+":
                (B() === "-" && (Te = -1), (U = "sign"));
                return;
            case ".":
                ((k = B()), (U = "decimalPointLeading"));
                return;
            case "0":
                ((k = B()), (U = "zero"));
                return;
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                ((k = B()), (U = "decimalInteger"));
                return;
            case "I":
                return (B(), Ke("nfinity"), J("numeric", 1 / 0));
            case "N":
                return (B(), Ke("aN"), J("numeric", NaN));
            case '"':
            case "'":
                ((lt = B() === '"'), (k = ""), (U = "string"));
                return;
        }
        throw X(B());
    },
    identifierNameStartEscape() {
        if (G !== "u") throw X(B());
        B();
        const e = br();
        switch (e) {
            case "$":
            case "_":
                break;
            default:
                if (!ee.isIdStartChar(e)) throw _n();
                break;
        }
        ((k += e), (U = "identifierName"));
    },
    identifierName() {
        switch (G) {
            case "$":
            case "_":
            case "‌":
            case "‍":
                k += B();
                return;
            case "\\":
                (B(), (U = "identifierNameEscape"));
                return;
        }
        if (ee.isIdContinueChar(G)) {
            k += B();
            return;
        }
        return J("identifier", k);
    },
    identifierNameEscape() {
        if (G !== "u") throw X(B());
        B();
        const e = br();
        switch (e) {
            case "$":
            case "_":
            case "‌":
            case "‍":
                break;
            default:
                if (!ee.isIdContinueChar(e)) throw _n();
                break;
        }
        ((k += e), (U = "identifierName"));
    },
    sign() {
        switch (G) {
            case ".":
                ((k = B()), (U = "decimalPointLeading"));
                return;
            case "0":
                ((k = B()), (U = "zero"));
                return;
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                ((k = B()), (U = "decimalInteger"));
                return;
            case "I":
                return (B(), Ke("nfinity"), J("numeric", Te * (1 / 0)));
            case "N":
                return (B(), Ke("aN"), J("numeric", NaN));
        }
        throw X(B());
    },
    zero() {
        switch (G) {
            case ".":
                ((k += B()), (U = "decimalPoint"));
                return;
            case "e":
            case "E":
                ((k += B()), (U = "decimalExponent"));
                return;
            case "x":
            case "X":
                ((k += B()), (U = "hexadecimal"));
                return;
        }
        return J("numeric", Te * 0);
    },
    decimalInteger() {
        switch (G) {
            case ".":
                ((k += B()), (U = "decimalPoint"));
                return;
            case "e":
            case "E":
                ((k += B()), (U = "decimalExponent"));
                return;
        }
        if (ee.isDigit(G)) {
            k += B();
            return;
        }
        return J("numeric", Te * Number(k));
    },
    decimalPointLeading() {
        if (ee.isDigit(G)) {
            ((k += B()), (U = "decimalFraction"));
            return;
        }
        throw X(B());
    },
    decimalPoint() {
        switch (G) {
            case "e":
            case "E":
                ((k += B()), (U = "decimalExponent"));
                return;
        }
        if (ee.isDigit(G)) {
            ((k += B()), (U = "decimalFraction"));
            return;
        }
        return J("numeric", Te * Number(k));
    },
    decimalFraction() {
        switch (G) {
            case "e":
            case "E":
                ((k += B()), (U = "decimalExponent"));
                return;
        }
        if (ee.isDigit(G)) {
            k += B();
            return;
        }
        return J("numeric", Te * Number(k));
    },
    decimalExponent() {
        switch (G) {
            case "+":
            case "-":
                ((k += B()), (U = "decimalExponentSign"));
                return;
        }
        if (ee.isDigit(G)) {
            ((k += B()), (U = "decimalExponentInteger"));
            return;
        }
        throw X(B());
    },
    decimalExponentSign() {
        if (ee.isDigit(G)) {
            ((k += B()), (U = "decimalExponentInteger"));
            return;
        }
        throw X(B());
    },
    decimalExponentInteger() {
        if (ee.isDigit(G)) {
            k += B();
            return;
        }
        return J("numeric", Te * Number(k));
    },
    hexadecimal() {
        if (ee.isHexDigit(G)) {
            ((k += B()), (U = "hexadecimalInteger"));
            return;
        }
        throw X(B());
    },
    hexadecimalInteger() {
        if (ee.isHexDigit(G)) {
            k += B();
            return;
        }
        return J("numeric", Te * Number(k));
    },
    string() {
        switch (G) {
            case "\\":
                (B(), (k += Ri()));
                return;
            case '"':
                if (lt) return (B(), J("string", k));
                k += B();
                return;
            case "'":
                if (!lt) return (B(), J("string", k));
                k += B();
                return;
            case `
`:
            case "\r":
                throw X(B());
            case "\u2028":
            case "\u2029":
                ji(G);
                break;
            case void 0:
                throw X(B());
        }
        k += B();
    },
    start() {
        switch (G) {
            case "{":
            case "[":
                return J("punctuator", B());
        }
        U = "value";
    },
    beforePropertyName() {
        switch (G) {
            case "$":
            case "_":
                ((k = B()), (U = "identifierName"));
                return;
            case "\\":
                (B(), (U = "identifierNameStartEscape"));
                return;
            case "}":
                return J("punctuator", B());
            case '"':
            case "'":
                ((lt = B() === '"'), (U = "string"));
                return;
        }
        if (ee.isIdStartChar(G)) {
            ((k += B()), (U = "identifierName"));
            return;
        }
        throw X(B());
    },
    afterPropertyName() {
        if (G === ":") return J("punctuator", B());
        throw X(B());
    },
    beforePropertyValue() {
        U = "value";
    },
    afterPropertyValue() {
        switch (G) {
            case ",":
            case "}":
                return J("punctuator", B());
        }
        throw X(B());
    },
    beforeArrayValue() {
        if (G === "]") return J("punctuator", B());
        U = "value";
    },
    afterArrayValue() {
        switch (G) {
            case ",":
            case "]":
                return J("punctuator", B());
        }
        throw X(B());
    },
    end() {
        throw X(B());
    },
};
function J(e, t) {
    return { type: e, value: t, line: Re, column: Ae };
}
function Ke(e) {
    for (const t of e) {
        if (Me() !== t) throw X(B());
        B();
    }
}
function Ri() {
    switch (Me()) {
        case "b":
            return (B(), "\b");
        case "f":
            return (B(), "\f");
        case "n":
            return (
                B(),
                `
`
            );
        case "r":
            return (B(), "\r");
        case "t":
            return (B(), "	");
        case "v":
            return (B(), "\v");
        case "0":
            if ((B(), ee.isDigit(Me()))) throw X(B());
            return "\0";
        case "x":
            return (B(), $i());
        case "u":
            return (B(), br());
        case `
`:
        case "\u2028":
        case "\u2029":
            return (B(), "");
        case "\r":
            return (
                B(),
                Me() ===
                    `
` && B(),
                ""
            );
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
            throw X(B());
        case void 0:
            throw X(B());
    }
    return B();
}
function $i() {
    let e = "",
        t = Me();
    if (!ee.isHexDigit(t) || ((e += B()), (t = Me()), !ee.isHexDigit(t))) throw X(B());
    return ((e += B()), String.fromCodePoint(parseInt(e, 16)));
}
function br() {
    let e = "",
        t = 4;
    for (; t-- > 0;) {
        const r = Me();
        if (!ee.isHexDigit(r)) throw X(B());
        e += B();
    }
    return String.fromCodePoint(parseInt(e, 16));
}
const ki = {
    start() {
        if (re.type === "eof") throw Ve();
        sr();
    },
    beforePropertyName() {
        switch (re.type) {
            case "identifier":
            case "string":
                ((vr = re.value), (ie = "afterPropertyName"));
                return;
            case "punctuator":
                vt();
                return;
            case "eof":
                throw Ve();
        }
    },
    afterPropertyName() {
        if (re.type === "eof") throw Ve();
        ie = "beforePropertyValue";
    },
    beforePropertyValue() {
        if (re.type === "eof") throw Ve();
        sr();
    },
    beforeArrayValue() {
        if (re.type === "eof") throw Ve();
        if (re.type === "punctuator" && re.value === "]") {
            vt();
            return;
        }
        sr();
    },
    afterPropertyValue() {
        if (re.type === "eof") throw Ve();
        switch (re.value) {
            case ",":
                ie = "beforePropertyName";
                return;
            case "}":
                vt();
        }
    },
    afterArrayValue() {
        if (re.type === "eof") throw Ve();
        switch (re.value) {
            case ",":
                ie = "beforeArrayValue";
                return;
            case "]":
                vt();
        }
    },
    end() {},
};
function sr() {
    let e;
    switch (re.type) {
        case "punctuator":
            switch (re.value) {
                case "{":
                    e = {};
                    break;
                case "[":
                    e = [];
                    break;
            }
            break;
        case "null":
        case "boolean":
        case "numeric":
        case "string":
            e = re.value;
            break;
    }
    if (ft === void 0) ft = e;
    else {
        const t = Pe[Pe.length - 1];
        Array.isArray(t)
            ? t.push(e)
            : Object.defineProperty(t, vr, { value: e, writable: !0, enumerable: !0, configurable: !0 });
    }
    if (e !== null && typeof e == "object")
        (Pe.push(e), Array.isArray(e) ? (ie = "beforeArrayValue") : (ie = "beforePropertyName"));
    else {
        const t = Pe[Pe.length - 1];
        t == null ? (ie = "end") : Array.isArray(t) ? (ie = "afterArrayValue") : (ie = "afterPropertyValue");
    }
}
function vt() {
    Pe.pop();
    const e = Pe[Pe.length - 1];
    e == null ? (ie = "end") : Array.isArray(e) ? (ie = "afterArrayValue") : (ie = "afterPropertyValue");
}
function X(e) {
    return _t(
        e === void 0
            ? `JSON5: invalid end of input at ${Re}:${Ae}`
            : `JSON5: invalid character '${Bs(e)}' at ${Re}:${Ae}`,
    );
}
function Ve() {
    return _t(`JSON5: invalid end of input at ${Re}:${Ae}`);
}
function _n() {
    return ((Ae -= 5), _t(`JSON5: invalid identifier character at ${Re}:${Ae}`));
}
function ji(e) {
    console.warn(`JSON5: '${Bs(e)}' in strings is not valid ECMAScript; consider escaping`);
}
function Bs(e) {
    const t = {
        "'": "\\'",
        '"': '\\"',
        "\\": "\\\\",
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "	": "\\t",
        "\v": "\\v",
        "\0": "\\0",
        "\u2028": "\\u2028",
        "\u2029": "\\u2029",
    };
    if (t[e]) return t[e];
    if (e < " ") {
        const r = e.charCodeAt(0).toString(16);
        return "\\x" + ("00" + r).substring(r.length);
    }
    return e;
}
function _t(e) {
    const t = new SyntaxError(e);
    return ((t.lineNumber = Re), (t.columnNumber = Ae), t);
}
var Li = function (t, r, s) {
    const u = [];
    let a = "",
        o,
        i,
        c = "",
        d;
    if (
        (r != null && typeof r == "object" && !Array.isArray(r) && ((s = r.space), (d = r.quote), (r = r.replacer)),
        typeof r == "function")
    )
        i = r;
    else if (Array.isArray(r)) {
        o = [];
        for (const C of r) {
            let N;
            (typeof C == "string"
                ? (N = C)
                : (typeof C == "number" || C instanceof String || C instanceof Number) && (N = String(C)),
                N !== void 0 && o.indexOf(N) < 0 && o.push(N));
        }
    }
    return (
        s instanceof Number ? (s = Number(s)) : s instanceof String && (s = String(s)),
        typeof s == "number"
            ? s > 0 && ((s = Math.min(10, Math.floor(s))), (c = "          ".substr(0, s)))
            : typeof s == "string" && (c = s.substr(0, 10)),
        h("", { "": t })
    );
    function h(C, N) {
        let b = N[C];
        switch (
            (b != null &&
                (typeof b.toJSON5 == "function"
                    ? (b = b.toJSON5(C))
                    : typeof b.toJSON == "function" && (b = b.toJSON(C))),
            i && (b = i.call(N, C, b)),
            b instanceof Number
                ? (b = Number(b))
                : b instanceof String
                  ? (b = String(b))
                  : b instanceof Boolean && (b = b.valueOf()),
            b)
        ) {
            case null:
                return "null";
            case !0:
                return "true";
            case !1:
                return "false";
        }
        if (typeof b == "string") return A(b);
        if (typeof b == "number") return String(b);
        if (typeof b == "object") return Array.isArray(b) ? F(b) : p(b);
    }
    function A(C) {
        const N = { "'": 0.1, '"': 0.2 },
            b = {
                "'": "\\'",
                '"': '\\"',
                "\\": "\\\\",
                "\b": "\\b",
                "\f": "\\f",
                "\n": "\\n",
                "\r": "\\r",
                "	": "\\t",
                "\v": "\\v",
                "\0": "\\0",
                "\u2028": "\\u2028",
                "\u2029": "\\u2029",
            };
        let E = "";
        for (let y = 0; y < C.length; y++) {
            const T = C[y];
            switch (T) {
                case "'":
                case '"':
                    (N[T]++, (E += T));
                    continue;
                case "\0":
                    if (ee.isDigit(C[y + 1])) {
                        E += "\\x00";
                        continue;
                    }
            }
            if (b[T]) {
                E += b[T];
                continue;
            }
            if (T < " ") {
                let $ = T.charCodeAt(0).toString(16);
                E += "\\x" + ("00" + $).substring($.length);
                continue;
            }
            E += T;
        }
        const P = d || Object.keys(N).reduce((y, T) => (N[y] < N[T] ? y : T));
        return ((E = E.replace(new RegExp(P, "g"), b[P])), P + E + P);
    }
    function p(C) {
        if (u.indexOf(C) >= 0) throw TypeError("Converting circular structure to JSON5");
        u.push(C);
        let N = a;
        a = a + c;
        let b = o || Object.keys(C),
            E = [];
        for (const y of b) {
            const T = h(y, C);
            if (T !== void 0) {
                let $ = g(y) + ":";
                (c !== "" && ($ += " "), ($ += T), E.push($));
            }
        }
        let P;
        if (E.length === 0) P = "{}";
        else {
            let y;
            if (c === "") ((y = E.join(",")), (P = "{" + y + "}"));
            else {
                let T =
                    `,
` + a;
                ((y = E.join(T)),
                    (P =
                        `{
` +
                        a +
                        y +
                        `,
` +
                        N +
                        "}"));
            }
        }
        return (u.pop(), (a = N), P);
    }
    function g(C) {
        if (C.length === 0) return A(C);
        const N = String.fromCodePoint(C.codePointAt(0));
        if (!ee.isIdStartChar(N)) return A(C);
        for (let b = N.length; b < C.length; b++)
            if (!ee.isIdContinueChar(String.fromCodePoint(C.codePointAt(b)))) return A(C);
        return C;
    }
    function F(C) {
        if (u.indexOf(C) >= 0) throw TypeError("Converting circular structure to JSON5");
        u.push(C);
        let N = a;
        a = a + c;
        let b = [];
        for (let P = 0; P < C.length; P++) {
            const y = h(String(P), C);
            b.push(y !== void 0 ? y : "null");
        }
        let E;
        if (b.length === 0) E = "[]";
        else if (c === "") E = "[" + b.join(",") + "]";
        else {
            let P =
                    `,
` + a,
                y = b.join(P);
            E =
                `[
` +
                a +
                y +
                `,
` +
                N +
                "]";
        }
        return (u.pop(), (a = N), E);
    }
};
const Ui = { parse: xi, stringify: Li };
var Gi = Ui;
function Sr(e) {
    this.message = e;
}
((Sr.prototype = new Error()), (Sr.prototype.name = "InvalidCharacterError"));
var Tn =
    (typeof window < "u" && window.atob && window.atob.bind(window)) ||
    function (e) {
        var t = String(e).replace(/=+$/, "");
        if (t.length % 4 == 1) throw new Sr("'atob' failed: The string to be decoded is not correctly encoded.");
        for (
            var r, s, u = 0, a = 0, o = "";
            (s = t.charAt(a++));
            ~s && ((r = u % 4 ? 64 * r + s : s), u++ % 4) ? (o += String.fromCharCode(255 & (r >> ((-2 * u) & 6)))) : 0
        )
            s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s);
        return o;
    };
function zi(e) {
    var t = e.replace(/-/g, "+").replace(/_/g, "/");
    switch (t.length % 4) {
        case 0:
            break;
        case 2:
            t += "==";
            break;
        case 3:
            t += "=";
            break;
        default:
            throw "Illegal base64url string!";
    }
    try {
        return (function (r) {
            return decodeURIComponent(
                Tn(r).replace(/(.)/g, function (s, u) {
                    var a = u.charCodeAt(0).toString(16).toUpperCase();
                    return (a.length < 2 && (a = "0" + a), "%" + a);
                }),
            );
        })(t);
    } catch {
        return Tn(t);
    }
}
function Tt(e) {
    this.message = e;
}
function qi(e, t) {
    if (typeof e != "string") throw new Tt("Invalid token specified");
    var r = (t = t || {}).header === !0 ? 0 : 1;
    try {
        return JSON.parse(zi(e.split(".")[r]));
    } catch (s) {
        throw new Tt("Invalid token specified: " + s.message);
    }
}
((Tt.prototype = new Error()), (Tt.prototype.name = "InvalidTokenError"));
function Hi(e) {
    const t = Xi(e);
    if (t) return t;
    const r = to(e);
    if (r) return r;
}
const Ki =
        /^([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?(?:[T\s](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?(?:(Z?)|([+-]\d\d)(?::?(\d\d))?))?(?:\[([A-Za-z/_-]+)\])?(?:\[(u-ca=(?:buddhist|chinese|coptic|dangi|ethioaa|ethiopic|gregory|hebrew|indian|islamic|islamic-umalqura|islamic-tbla|islamic-civil|islamic-rgsa|islamicc|iso8601|japanese|persian|roc))\])?$/,
    Vi =
        /^(\d{4})-?W(\d\d)(?:-?(\d))?(?:[T\s](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?(?:(Z?)|([+-]\d\d)(?::?(\d\d))?))?(?:\[([A-Za-z/_-]+)\])?(?:\[(u-ca=(?:buddhist|chinese|coptic|dangi|ethioaa|ethiopic|gregory|hebrew|indian|islamic|islamic-umalqura|islamic-tbla|islamic-civil|islamic-rgsa|islamicc|iso8601|japanese|persian|roc))\])?$/,
    Wi =
        /^(\d{4})-?(\d{3})?(?:[T\s](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?(?:(Z?)|([+-]\d\d)(?::?(\d\d))?))?(?:\[([A-Za-z/_-]+)\])?(?:\[(u-ca=(?:buddhist|chinese|coptic|dangi|ethioaa|ethiopic|gregory|hebrew|indian|islamic|islamic-umalqura|islamic-tbla|islamic-civil|islamic-rgsa|islamicc|iso8601|japanese|persian|roc))\])?$/,
    Zi =
        /^(?:(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?(?:(Z?)|([+-]\d\d)(?::?(\d\d))?))?(?:\[([A-Za-z/_-]+)\])?(?:\[(u-ca=(?:buddhist|chinese|coptic|dangi|ethioaa|ethiopic|gregory|hebrew|indian|islamic|islamic-umalqura|islamic-tbla|islamic-civil|islamic-rgsa|islamicc|iso8601|japanese|persian|roc))\])?$/,
    Yi = [
        { matches: Ki, parts: Pn, extensions: Bt(11, 12) },
        { matches: Vi, parts: Pn, extensions: Bt(11, 12) },
        { matches: Wi, parts: Qi, extensions: Bt(10, 11) },
        { matches: Zi, parts: () => "time", extensions: Bt(8, 9) },
    ];
function Ji(e) {
    return e ? e.filter((r) => !!r).length > 2 : !1;
}
function Xi(e) {
    const r = Yi.map((s) => ({ matches: s.matches.exec(e), parts: s.parts, extensions: s.extensions }))
        .filter((s) => Ji(s.matches))
        .sort((s, u) => u.matches.length - s.matches.length)[0];
    if (r)
        return { name: "datetime", parts: r.parts(r.matches), variant: "rfc3339", extensions: r.extensions(r.matches) };
}
function Pn(e) {
    const t = [1, 2, 3],
        r = [4, 5, 6, 7],
        s = t.some((a) => e[a] !== void 0),
        u = r.some((a) => e[a] !== void 0);
    return s && u ? "datetime" : "date";
}
function Bt(e = 11, t = 12) {
    return (r) => {
        const s = [];
        return (
            r[e] !== void 0 && s.push("timezone"),
            r[t] !== void 0 && s.push("calendar"),
            s.length > 0 ? s : void 0
        );
    };
}
function Qi(e) {
    const t = [1, 2],
        r = [3, 4, 5, 6],
        s = t.some((a) => e[a] !== void 0),
        u = r.some((a) => e[a] !== void 0);
    return s && u ? "datetime" : "date";
}
const eo =
    /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;
function to(e) {
    if (eo.exec(e)) return { name: "datetime", parts: "datetime", variant: "rfc2822" };
}
const ro = /^\d{10}$/,
    no = /^\d{13}$/,
    so = /^\d{19}$/;
function ar(e) {
    const t = new Date().getTime(),
        r = 2 * 365 * 24 * 60 * 60 * 1e3,
        s = e - r,
        u = e + r;
    return t >= s && t <= u;
}
function Br(e) {
    if (typeof e == "number") return Br(`${e}`);
    if (ro.test(e)) {
        const t = parseInt(e);
        if (ar(t * 1e3)) return { name: "timestamp", variant: "secondsSinceEpoch" };
    }
    if (no.test(e)) {
        const t = parseInt(e);
        if (ar(t)) return { name: "timestamp", variant: "millisecondsSinceEpoch" };
    }
    if (so.test(e)) {
        const t = parseInt(e);
        if (ar(t / 1e6)) return { name: "timestamp", variant: "nanosecondsSinceEpoch" };
    }
}
const ws =
        /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i,
    ao = new RegExp(`^${ws.source}$`),
    uo = new RegExp(`^[^"]+<${ws.source}>$`);
function io(e) {
    if (ao.exec(e)) return { name: "email", variant: "rfc5321" };
    if (uo.exec(e)) return { name: "email", variant: "rfc5322" };
}
const oo =
        /^(?:(AED|AFN|ALL|AMD|ANG|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BGN|BHD|BIF|BMD|BND|BOB|BOV|BRL|BSD|BTC|BTN|BWP|BYN|BZD|CAD|CDF|CHE|CHF|CHW|CLF|CLP|CNY|COP|COU|CRC|CUC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HRK|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MXV|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLL|SOS|SRD|SSP|STN|SVC|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|USN|UYI|UYU|UYW|UZS|VED|VES|VND|VUV|WST|XAF|XAG|XAU|XBA|XBB|XBC|XBD|XCD|XDR|XOF|XPD|XPF|XPT|XSU|XTS|XUA|XXX|YER|ZAR|ZMW|ZWL))$/i,
    co =
        /^(?:(XBT|XDG|XLM|XMR|XRP|XZC|ETH|LTC|BNB|USDT|SOL|ADA|USDC|LUNA|AVAX|DOT|DOGE|SHIB|MATIC|CRO|BUSD|WBTC|UNI|LINK|UST|DAI|ALGO|BCH))$/,
    lo =
        /^(?:(U.?S.?\sDollar|Euro|United\sStates\sdollar|Japanese\sYen|Swiss\sFranc|Australian\sDollar|British\sPound|Canadian\sDollar|South\sAfrican\sRand))$/,
    fo = /^(?:(\$|£|€|¥|R\$|₿))$/;
function ho(e) {
    if (oo.exec(e)) return { name: "currency", variant: "iso4217" };
    if (co.exec(e)) return { name: "currency", variant: "crypto" };
    if (lo.exec(e)) return { name: "currency", variant: "english" };
    if (fo.exec(e)) return { name: "currency", variant: "symbol" };
}
const po =
        /^(?:(AFG|ALB|DZA|ASM|AND|AGO|AIA|ATA|ATG|ARG|ARM|ABW|AUS|AUT|AZE|BHS|BHR|BGD|BRB|BLR|BEL|BLZ|BEN|BMU|BTN|BOL|BES|BIH|BWA|BVT|BRA|IOT|BRN|BGR|BFA|BDI|CPV|KHM|CMR|CAN|CYM|CAF|TCD|CHL|CHN|CXR|CCK|COL|COM|COD|COG|COK|CRI|HRV|CUB|CUW|CYP|CZE|CIV|DNK|DJI|DMA|DOM|ECU|EGY|SLV|GNQ|ERI|EST|SWZ|ETH|FLK|FRO|FJI|FIN|FRA|GUF|PYF|ATF|GAB|GMB|GEO|DEU|GHA|GIB|GRC|GRL|GRD|GLP|GUM|GTM|GGY|GIN|GNB|GUY|HTI|HMD|VAT|HND|HKG|HUN|ISL|IND|IDN|IRN|IRQ|IRL|IMN|ISR|ITA|JAM|JPN|JEY|JOR|KAZ|KEN|KIR|PRK|KOR|KWT|KGZ|LAO|LVA|LBN|LSO|LBR|LBY|LIE|LTU|LUX|MAC|MDG|MWI|MYS|MDV|MLI|MLT|MHL|MTQ|MRT|MUS|MYT|MEX|FSM|MDA|MCO|MNG|MNE|MSR|MAR|MOZ|MMR|NAM|NRU|NPL|NLD|NCL|NZL|NIC|NER|NGA|NIU|NFK|MNP|NOR|OMN|PAK|PLW|PSE|PAN|PNG|PRY|PER|PHL|PCN|POL|PRT|PRI|QAT|MKD|ROU|RUS|RWA|REU|BLM|SHN|KNA|LCA|MAF|SPM|VCT|WSM|SMR|STP|SAU|SEN|SRB|SYC|SLE|SGP|SXM|SVK|SVN|SLB|SOM|ZAF|SGS|SSD|ESP|LKA|SDN|SUR|SJM|SWE|CHE|SYR|TWN|TJK|TZA|THA|TLS|TGO|TKL|TON|TTO|TUN|TUR|TKM|TCA|TUV|UGA|UKR|ARE|GBR|UMI|USA|URY|UZB|VUT|VEN|VNM|VGB|VIR|WLF|ESH|YEM|ZMB|ZWE|ALA))$/,
    mo =
        /^(?:(AF|AL|DZ|AS|AD|AO|AI|AQ|AG|AR|AM|AW|AU|AT|AZ|BS|BH|BD|BB|BY|BE|BZ|BJ|BM|BT|BO|BQ|BA|BW|BV|BR|IO|BN|BG|BF|BI|CV|KH|CM|CA|KY|CF|TD|CL|CN|CX|CC|CO|KM|CD|CG|CK|CR|HR|CU|CW|CY|CZ|CI|DK|DJ|DM|DO|EC|EG|SV|GQ|ER|EE|SZ|ET|FK|FO|FJ|FI|FR|GF|PF|TF|GA|GM|GE|DE|GH|GI|GR|GL|GD|GP|GU|GT|GG|GN|GW|GY|HT|HM|VA|HN|HK|HU|IS|IN|ID|IR|IQ|IE|IM|IL|IT|JM|JP|JE|JO|KZ|KE|KI|KP|KR|KW|KG|LA|LV|LB|LS|LR|LY|LI|LT|LU|MO|MG|MW|MY|MV|ML|MT|MH|MQ|MR|MU|YT|MX|FM|MD|MC|MN|ME|MS|MA|MZ|MM|NA|NR|NP|NL|NC|NZ|NI|NE|NG|NU|NF|MP|NO|OM|PK|PW|PS|PA|PG|PY|PE|PH|PN|PL|PT|PR|QA|MK|RO|RU|RW|RE|BL|SH|KN|LC|MF|PM|VC|WS|SM|ST|SA|SN|RS|SC|SL|SG|SX|SK|SI|SB|SO|ZA|GS|SS|ES|LK|SD|SR|SJ|SE|CH|SY|TW|TJ|TZ|TH|TL|TG|TK|TO|TT|TN|TR|TM|TC|TV|UG|UA|AE|GB|UM|US|UY|UZ|VU|VE|VN|VG|VI|WF|EH|YE|ZM|ZW|AX))$/;
function go(e) {
    if (po.exec(e)) return { name: "country", variant: "iso3166-3" };
    if (mo.exec(e)) return { name: "country", variant: "iso3166-2" };
}
function Do(e) {
    if (/^\.\w{2,14}(\.\w{2,14})*$/i.test(e)) return { name: "tld" };
}
function yo(e) {
    try {
        if (new In.Address6(e)) return { name: "ip", variant: "v6" };
    } catch {}
    try {
        if (new In.Address4(e)) return { name: "ip", variant: "v4" };
    } catch {}
}
const Ao =
        /^(?:(aa|ab|ae|af|ak|am|an|ar|as|av|ay|az|ba|be|bg|bi|bm|bn|bo|br|bs|ca|ce|ch|co|cr|cs|cu|cv|cy|da|de|dv|dz|ee|el|en|eo|es|et|eu|fa|ff|fi|fj|fo|fr|fy|ga|gd|gl|gn|gu|gv|ha|he|hi|ho|hr|ht|hu|hy|hz|ia|id|ie|ig|ii|ik|io|is|it|iu|ja|jv|ka|kg|ki|kj|kk|kl|km|kn|ko|kr|ks|ku|kv|kw|ky|la|lb|lg|li|ln|lo|lt|lu|lv|mg|mh|mi|mk|ml|mn|mr|ms|mt|my|na|nb|nd|ne|ng|nl|nn|no|nr|nv|ny|oc|oj|om|or|os|pa|pi|pl|ps|pt|qu|rm|rn|ro|ru|rw|sa|sc|sd|se|sg|si|sk|sl|sm|sn|so|sq|sr|ss|st|su|sv|sw|ta|te|tg|th|ti|tk|tl|tn|to|tr|ts|tt|tw|ty|ug|uk|ur|uz|ve|vi|vo|wa|wo|xh|yi|yo|za|zh|zu))$/,
    Co =
        /^(?:(aar|abk|ave|afr|aka|amh|arg|ara|asm|ava|aym|aze|bak|bel|bul|bis|bam|ben|bod|bre|bos|cat|che|cha|cos|cre|ces|chu|chv|cym|dan|deu|div|dzo|ewe|ell|eng|epo|spa|est|eus|fas|ful|fin|fij|fao|fra|fry|gle|gla|glg|grn|guj|glv|hau|heb|hin|hmo|hrv|hat|hun|hye|her|ina|ind|ile|ibo|iii|ipk|ido|isl|ita|iku|jpn|jav|kat|kon|kik|kua|kaz|kal|khm|kan|kor|kau|kas|kur|kom|cor|kir|lat|ltz|lug|lim|lin|lao|lit|lub|lav|mlg|mah|mri|mkd|mal|mon|mar|msa|mlt|mya|nau|nob|nde|nep|ndo|nld|nno|nor|nbl|nav|nya|oci|oji|orm|ori|oss|pan|pli|pol|pus|por|que|roh|run|ron|rus|kin|san|srd|snd|sme|sag|sin|slk|slv|smo|sna|som|sqi|srp|ssw|sot|sun|swe|swa|tam|tel|tgk|tha|tir|tuk|tgl|tsn|ton|tur|tso|tat|twi|tah|uig|ukr|urd|uzb|ven|vie|vol|wln|wol|xho|yid|yor|zha|zho|zul))$/,
    Eo = [
        "Catalan, Valencian",
        "Chichewa, Chewa, Nyanja",
        "Church Slavic, Old Slavonic, Church Slavonic, Old Bulgarian, Old Church Slavonic",
        "Divehi, Dhivehi, Maldivian",
        "Dutch, Flemish",
        "Gaelic, Scottish Gaelic",
        "Greek, Modern (1453–)",
        "Haitian, Haitian Creole",
        "Interlingue, Occidental",
        "Kalaallisut, Greenlandic",
        "Kikuyu, Gikuyu",
        "Kirghiz, Kyrgyz",
        "Kuanyama, Kwanyama",
        "Limburgan, Limburger, Limburgish",
        "Luxembourgish, Letzeburgesch",
        "Navajo, Navaho",
        "Ossetian, Ossetic",
        "Pashto, Pushto",
        "Punjabi, Panjabi",
        "Romanian, Moldavian, Moldovan",
        "Sichuan Yi, Nuosu",
        "Sinhala, Sinhalese",
        "Spanish, Castilian",
        "Uighur, Uyghur",
        "Zhuang, Chuang",
        "Abkhazian",
        "Afar",
        "Afrikaans",
        "Akan",
        "Albanian",
        "Amharic",
        "Arabic",
        "Aragonese",
        "Armenian",
        "Assamese",
        "Avaric",
        "Avestan",
        "Aymara",
        "Azerbaijani",
        "Bambara",
        "Bashkir",
        "Basque",
        "Belarusian",
        "Bengali",
        "Bislama",
        "Bosnian",
        "Breton",
        "Bulgarian",
        "Burmese",
        "Central Khmer",
        "Chamorro",
        "Chechen",
        "Chinese",
        "Chuvash",
        "Cornish",
        "Corsican",
        "Cree",
        "Croatian",
        "Czech",
        "Danish",
        "Dzongkha",
        "English",
        "Esperanto",
        "Estonian",
        "Ewe",
        "Faroese",
        "Fijian",
        "Finnish",
        "French",
        "Fulah",
        "Galician",
        "Ganda",
        "Georgian",
        "German",
        "Guarani",
        "Gujarati",
        "Hausa",
        "Hebrew",
        "Herero",
        "Hindi",
        "Hiri Motu",
        "Hungarian",
        "Icelandic",
        "Ido",
        "Igbo",
        "Indonesian",
        "Interlingua (International Auxiliary Language Association)",
        "Inuktitut",
        "Inupiaq",
        "Irish",
        "ISO language name",
        "Italian",
        "Japanese",
        "Javanese",
        "Kannada",
        "Kanuri",
        "Kashmiri",
        "Kazakh",
        "Kinyarwanda",
        "Komi",
        "Kongo",
        "Korean",
        "Kurdish",
        "Lao",
        "Latin",
        "Latvian",
        "Lingala",
        "Lithuanian",
        "Luba-Katanga",
        "Macedonian",
        "Malagasy",
        "Malay",
        "Malayalam",
        "Maltese",
        "Manx",
        "Maori",
        "Marathi",
        "Marshallese",
        "Mongolian",
        "Nauru",
        "Ndonga",
        "Nepali",
        "North Ndebele",
        "Northern Sami",
        "Norwegian",
        "Norwegian Bokmål",
        "Norwegian Nynorsk",
        "Occitan",
        "Ojibwa",
        "Oriya",
        "Oromo",
        "Pali",
        "Persian",
        "Polish",
        "Portuguese",
        "Quechua",
        "Romansh",
        "Rundi",
        "Russian",
        "Samoan",
        "Sango",
        "Sanskrit",
        "Sardinian",
        "Serbian",
        "Shona",
        "Sindhi",
        "Slovak",
        "Slovenian",
        "Somali",
        "South Ndebele",
        "Southern Sotho",
        "Sundanese",
        "Swahili",
        "Swati",
        "Swedish",
        "Tagalog",
        "Tahitian",
        "Tajik",
        "Tamil",
        "Tatar",
        "Telugu",
        "Thai",
        "Tibetan",
        "Tigrinya",
        "Tonga (Tonga Islands)",
        "Tsonga",
        "Tswana",
        "Turkish",
        "Turkmen",
        "Twi",
        "Ukrainian",
        "Urdu",
        "Uzbek",
        "Venda",
        "Vietnamese",
        "Volapük",
        "Walloon",
        "Welsh",
        "Western Frisian",
        "Wolof",
        "Xhosa",
        "Yiddish",
        "Yoruba",
        "Zulu",
    ],
    bo = [
        "(originally:) Occidental, (after WWII:) Interlingue",
        "azərbaycan dili, تۆرکجه",
        "Bahasa Melayu, بهاس ملايو‎",
        "català, valencià",
        "čeština, český jazyk",
        "chiCheŵa, chinyanja",
        "corsu, lingua corsa",
        "eesti, eesti keel",
        "euskara, euskera",
        "Fulfulde, Pulaar, Pular",
        "Gaelg, Gailck",
        "Iñupiaq, Iñupiatun",
        "język polski, polszczyzna",
        "kalaallisut, kalaallit oqaasii",
        "Kurdî, کوردی‎",
        "latine, lingua latina",
        "Nederlands, Vlaams",
        "occitan, lenga d'òc",
        "Oʻzbek, Ўзбек, أۇزبېك‎",
        "Română, Moldovenească",
        "Runa Simi, Kichwa",
        "Saɯ cueŋƅ, Saw cuengh",
        "slovenčina, slovenský jazyk",
        "Slovenski jezik, Slovenščina",
        "Soomaaliga, af Soomaali",
        "suomi, suomen kieli",
        "Türkmençe, Türkmen dili",
        "авар мацӀ, магӀарул мацӀ",
        "аҧсуа бызшәа, аҧсшәа",
        "Кыргызча, Кыргыз тили",
        "татар теле, tatar tele",
        "тоҷикӣ, toçikī, تاجیکی‎",
        "ئۇيغۇرچە‎, Uyghurche",
        "कॉशुर, کٲشُر‎",
        "पालि, पाळि",
        "संस्कृतम्, 𑌸𑌂𑌸𑍍𑌕𑍃𑌤𑌮𑍍",
        "सिंधी, سنڌي‎",
        "हिन्दी, हिंदी",
        "ਪੰਜਾਬੀ, پنجابی‎",
        "ខ្មែរ, ខេមរភាសា, ភាសាខ្មែរ",
        "ꦧꦱꦗꦮ, Basa Jawa",
        "中文 (Zhōngwén), 汉语, 漢語",
        "(Hausa) هَوُسَ",
        "Afaan Oromoo",
        "Afaraf",
        "Afrikaans",
        "Akan",
        "aragonés",
        "Asụsụ Igbo",
        "Avañe'ẽ",
        "avesta",
        "aymar aru",
        "Bahasa Indonesia",
        "bamanankan",
        "Basa Sunda",
        "Bislama",
        "bosanski jezik",
        "brezhoneg",
        "Chamoru",
        "chiShona",
        "Cymraeg",
        "dansk",
        "Davvisámegiella",
        "Deutsch",
        "Diné bizaad",
        "Dorerin Naoero",
        "English",
        "Español",
        "Esperanto",
        "Eʋegbe",
        "Faka Tonga",
        "fiteny malagasy",
        "føroyskt",
        "français",
        "Frysk",
        "Gaeilge",
        "gagana fa'a Samoa",
        "Gàidhlig",
        "Galego",
        "Gĩkũyũ",
        "Hiri Motu",
        "hrvatski jezik",
        "Ido",
        "Ikinyarwanda",
        "Ikirundi",
        "Interlingua",
        "isiNdebele",
        "isiNdebele",
        "isiXhosa",
        "isiZulu",
        "Íslenska",
        "Italiano",
        "Kajin M̧ajeļ",
        "Kanuri",
        "Kernewek",
        "Kikongo",
        "Kiluba",
        "Kiswahili",
        "Kreyòl ayisyen",
        "Kuanyama",
        "latviešu valoda",
        "Lëtzebuergesch",
        "lietuvių kalba",
        "Limburgs",
        "Lingála",
        "Luganda",
        "magyar",
        "Malti",
        "Norsk",
        "Norsk Bokmål",
        "Norsk Nynorsk",
        "Otjiherero",
        "Owambo",
        "Português",
        "Reo Tahiti",
        "Rumantsch Grischun",
        "sardu",
        "Sesotho",
        "Setswana",
        "Shqip",
        "SiSwati",
        "Svenska",
        "te reo Māori",
        "Tiếng Việt",
        "Tshivenḓa",
        "Türkçe",
        "Twi",
        "Volapük",
        "vosa Vakaviti",
        "Walon",
        "Wikang Tagalog",
        "Wollof",
        "Xitsonga",
        "yângâ tî sängö",
        "Yorùbá",
        "Ελληνικά",
        "башҡорт теле",
        "беларуская мова",
        "български език",
        "ирон ӕвзаг",
        "коми кыв",
        "қазақ тілі",
        "македонски јазик",
        "Монгол хэл",
        "нохчийн мотт",
        "русский",
        "српски језик",
        "Українська",
        "чӑваш чӗлхи",
        "ѩзыкъ словѣньскъ",
        "ქართული",
        "Հայերեն",
        "ትግርኛ",
        "አማርኛ",
        "नेपाली",
        "मराठी",
        "অসমীয়া",
        "বাংলা",
        "ગુજરાતી",
        "ଓଡ଼ିଆ",
        "தமிழ்",
        "తెలుగు",
        "ಕನ್ನಡ",
        "മലയാളം",
        "සිංහල",
        "ไทย",
        "ພາສາລາວ",
        "བོད་ཡིག",
        "རྫོང་ཁ",
        "ဗမာစာ",
        "ᐃᓄᒃᑎᑐᑦ",
        "ᐊᓂᔑᓈᐯᒧᐎᓐ",
        "ᓀᐦᐃᔭᐍᐏᐣ",
        "한국어",
        "ꆈꌠ꒿ Nuosuhxop",
        "日本語 (にほんご)",
    ];
function So(e) {
    if (Ao.test(e)) return { name: "language", variant: "iso693-1" };
    if (Co.test(e)) return { name: "language", variant: "iso693-2" };
    if (Eo.includes(e)) return { name: "language", variant: "english" };
    if (bo.includes(e)) return { name: "language", variant: "native" };
}
const Fo = /^\+[0-9]{6,15}$/;
function vo(e) {
    const t = e.replace(/[\s-()]/g, "");
    if (Fo.test(t)) return { name: "phoneNumber", variant: "e.164" };
}
function Bo(e) {
    return e === void 0
        ? void 0
        : {
              json: "application/json",
              js: "application/javascript",
              html: "text/html",
              css: "text/css",
              txt: "text/plain",
              ts: "text/typescript",
              tsx: "text/typescript",
              aac: "audio/aac",
              abw: "application/x-abiword",
              arc: "application/x-freearc",
              avi: "video/x-msvideo",
              azw: "application/vnd.amazon.ebook",
              bin: "application/octet-stream",
              bmp: "image/bmp",
              bz: "application/x-bzip",
              bz2: "application/x-bzip2",
              cda: "application/x-cdf",
              csh: "application/x-csh",
              csv: "text/csv",
              doc: "application/msword",
              docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              eot: "application/vnd.ms-fontobject",
              epub: "application/epub+zip",
              gz: "application/gzip",
              gif: "image/gif",
              htm: "text/html",
              ico: "image/vnd.microsoft.icon",
              ics: "text/calendar",
              jar: "application/java-archive",
              jpeg: "image/jpeg",
              jpg: "image/jpeg",
              jsonld: "application/ld+json",
              mid: "audio/midi",
              midi: "audio/midi",
              mjs: "text/javascript",
              mp3: "audio/mpeg",
              mp4: "video/mp4",
              mpeg: "video/mpeg",
              mpkg: "application/vnd.apple.installer+xml",
              odp: "application/vnd.oasis.opendocument.presentation",
              ods: "application/vnd.oasis.opendocument.spreadsheet",
              odt: "application/vnd.oasis.opendocument.text",
              oga: "audio/ogg",
              ogv: "video/ogg",
              ogx: "application/ogg",
              opus: "audio/opus",
              otf: "font/otf",
              png: "image/png",
              pdf: "application/pdf",
              php: "application/x-httpd-php",
              ppt: "application/vnd.ms-powerpoint",
              pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              rar: "application/vnd.rar",
              rtf: "application/rtf",
              sh: "application/x-sh",
              svg: "image/svg+xml",
              swf: "application/x-shockwave-flash",
              tar: "application/x-tar",
              tif: "image/tiff",
              tiff: "image/tiff",
              ttf: "font/ttf",
              vsd: "application/vnd.visio",
              wav: "audio/wav",
              weba: "audio/webm",
              webm: "video/webm",
              webp: "image/webp",
              woff: "font/woff",
              woff2: "font/woff2",
              xhtml: "application/xhtml+xml",
              xls: "application/vnd.ms-excel",
              xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              xml: "application/xml",
              xul: "application/vnd.mozilla.xul+xml",
              zip: "application/zip",
              "3gp": "video/3gpp",
              "3g2": "video/3gpp2",
              "7z": "application/x-7z-compressed",
              md: "text/markdown",
          }[e];
}
const wo = [
    "http:",
    "https:",
    "ftp:",
    "ftps:",
    "mailto:",
    "tel:",
    "sms:",
    "geo:",
    "file:",
    "ipfs:",
    "data:",
    "blob:",
    "chrome:",
    "chrome-extension:",
    "magnet:",
    "bitcoin:",
    "callto:",
    "dict:",
    "dns:",
    "feed:",
    "git:",
    "gtalk:",
    "imap:",
    "im:",
    "info:",
    "irc:",
    "ircs:",
    "irc6:",
    "itms:",
    "jabber:",
    "ldap:",
    "ldaps:",
    "maps:",
    "nfs:",
    "payto:",
    "proxy:",
    "redis:",
    "s3:",
    "ssh:",
    "udp:",
    "view-source:",
    "ws:",
    "wss:",
    "xmpp:",
];
function Io(e) {
    try {
        const t = new URL(e);
        if (t.hostname === "" && !wo.includes(t.protocol)) return;
        const r = t.pathname.split(".").pop(),
            s = Bo(r);
        return { name: "uri", contentType: s || void 0 };
    } catch {}
}
function ur(e, t) {
    return Fs(e) && Ti(e) === t;
}
function _o(e) {
    if (ur(e, 1)) return { name: "uuid", variant: "v1" };
    if (ur(e, 4)) return { name: "uuid", variant: "v4" };
    if (ur(e, 5)) return { name: "uuid", variant: "v5" };
}
function To(e) {
    if (e.match(/^[0-9.]+\s?(?:(B|MB|K|GB|TB|PB|MiB|KB|kB))$/)) return { name: "filesize", variant: "human" };
}
const Po = [
    "com",
    "org",
    "net",
    "edu",
    "gov",
    "mil",
    "co",
    "io",
    "ac",
    "dev",
    "info",
    "biz",
    "name",
    "uk",
    "me",
    "ca",
    "tv",
    "ir",
    "au",
];
function Mo(e) {
    const t = e.split(".").pop();
    return t ? Po.includes(t) : !1;
}
function Mn(e, t = !1) {
    return e.length === 0
        ? !1
        : e === "localhost"
          ? !0
          : !e.includes(".") || !new RegExp(`^[a-zA-Z0-9-.${t ? "_" : ""}]{1,253}.?$`, "g").test(e)
            ? !1
            : (e.endsWith(".") && (e = e.slice(0, e.length - 1)),
              e.split(".").every(function (a) {
                  return (
                      new RegExp(`^([a-zA-Z0-9-${t ? "_" : ""}]+)$`, "g").test(a) &&
                      a.length < 64 &&
                      !a.startsWith("-") &&
                      !a.endsWith("-")
                  );
              }) && Mo(e));
}
function No(e) {
    if (Mn(e)) return { name: "hostname", variant: "rfc1123" };
    if (Mn(e, !0)) return { name: "hostname", variant: "rfc5890" };
}
function xo(e) {
    try {
        if (typeof JSON.parse(e) == "object") return { name: "json", variant: "ecma262" };
    } catch {}
    try {
        if (typeof Gi.parse(e) == "object") return { name: "json", variant: "json5" };
    } catch {}
}
const Oo = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
function Ro(e) {
    if (Oo.exec(e)) return { name: "jsonPointer", variant: "rfc6901" };
}
const $o = new RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Modifier}|\\p{Emoji_Modifier_Base})*$", "u");
function ko(e) {
    if ($o.test(e)) return { name: "emoji" };
}
const jo =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function Lo(e) {
    if (jo.test(e)) return { name: "semver" };
}
function Uo(e) {
    return typeof e == "object" && e !== null && typeof e._seconds == "number" && typeof e._nanoseconds == "number";
}
function Go(e) {
    if (Uo(e)) return { name: "firestoreTimestamp" };
}
function zo(e) {
    try {
        if (qi(e)) return { name: "jwt" };
    } catch {}
}
const qo = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
    Ho = /^rgba?\((\d{1,3})(,|\s+)\s*(\d{1,3})(,|\s+)\s*(\d{1,3})(,\s*0?.\d{1,3})?(\s+\/\s+0?.\d{1,3})?\)$/,
    Ko = /^hsla?\((\d{1,3})(,|\s+)\s*(\d{1,3}%)(,|\s+)\s*(\d{1,3}%)(,\s*0?.\d{1,3})?(\s+\/\s+0?.\d{1,3})?\)$/;
function Vo(e) {
    if (qo.test(e)) return { name: "color", variant: "hex" };
    if (Ho.test(e)) return { name: "color", variant: "rgb" };
    if (Ko.test(e)) return { name: "color", variant: "hsl" };
}
const Wo = /^4[0-9]{12}(?:[0-9]{3})?$/,
    Zo = /^3[47][0-9]{13}$/,
    Yo = /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    Jo = /^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/,
    Xo = /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/;
function Qo(e) {
    const t = e.replace(/\s/g, "");
    if (Wo.test(t)) return { name: "creditcard", variant: "visa" };
    if (Zo.test(t)) return { name: "creditcard", variant: "amex" };
    if (Yo.test(t)) return { name: "creditcard", variant: "discover" };
    if (Jo.test(t)) return { name: "creditcard", variant: "mastercard" };
    if (Xo.test(t)) return { name: "creditcard", variant: "dinersclub" };
}
const ec = [Io, Do, No, io, Hi, yo, vo, ho, go, So, _o, To, Br, xo, Ro, ko, Lo, zo, Vo, Qo];
function tc(e) {
    if (e.trim() !== "")
        for (const [, t] of Object.entries(ec)) {
            const r = t(e);
            if (r) return r;
        }
}
const rc = [Go];
function nc(e) {
    for (const [, t] of Object.entries(rc)) {
        const r = t(e);
        if (r) return r;
    }
}
const sc = [Br];
function ac(e) {
    for (const [, t] of Object.entries(sc)) {
        const r = t(e);
        if (r) return r;
    }
}
function uc(e) {
    return e == null
        ? { name: "null", value: null }
        : typeof e == "boolean"
          ? { name: "bool", value: e }
          : typeof e == "number"
            ? Number.isInteger(e)
                ? { name: "int", value: e, format: ac(e) }
                : { name: "float", value: e }
            : typeof e == "object"
              ? Array.isArray(e)
                  ? { name: "array", value: e }
                  : { name: "object", format: nc(e), value: e }
              : typeof e == "string"
                ? { name: "string", value: e, format: tc(e) }
                : { name: "null", value: null };
}
const ic = Object.freeze(
        Object.defineProperty({ __proto__: null, inferType: uc }, Symbol.toStringTag, { value: "Module" }),
    ),
    oc = _u(ic);
var it = {},
    Nn;
function cc() {
    if (Nn) return it;
    ((Nn = 1), Object.defineProperty(it, "__esModule", { value: !0 }), (it.inferRange = void 0));
    function e(t, r = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER }) {
        return { min: Math.min(r.min, t), max: Math.max(r.max, t) };
    }
    return ((it.inferRange = e), it);
}
var ot = {},
    ct = {},
    ir,
    xn;
function lc() {
    if (xn) return ir;
    xn = 1;
    var e = function (E) {
        return t(E) && !r(E);
    };
    function t(b) {
        return !!b && typeof b == "object";
    }
    function r(b) {
        var E = Object.prototype.toString.call(b);
        return E === "[object RegExp]" || E === "[object Date]" || a(b);
    }
    var s = typeof Symbol == "function" && Symbol.for,
        u = s ? Symbol.for("react.element") : 60103;
    function a(b) {
        return b.$$typeof === u;
    }
    function o(b) {
        return Array.isArray(b) ? [] : {};
    }
    function i(b, E) {
        return E.clone !== !1 && E.isMergeableObject(b) ? C(o(b), b, E) : b;
    }
    function c(b, E, P) {
        return b.concat(E).map(function (y) {
            return i(y, P);
        });
    }
    function d(b, E) {
        if (!E.customMerge) return C;
        var P = E.customMerge(b);
        return typeof P == "function" ? P : C;
    }
    function h(b) {
        return Object.getOwnPropertySymbols
            ? Object.getOwnPropertySymbols(b).filter(function (E) {
                  return Object.propertyIsEnumerable.call(b, E);
              })
            : [];
    }
    function A(b) {
        return Object.keys(b).concat(h(b));
    }
    function p(b, E) {
        try {
            return E in b;
        } catch {
            return !1;
        }
    }
    function g(b, E) {
        return p(b, E) && !(Object.hasOwnProperty.call(b, E) && Object.propertyIsEnumerable.call(b, E));
    }
    function F(b, E, P) {
        var y = {};
        return (
            P.isMergeableObject(b) &&
                A(b).forEach(function (T) {
                    y[T] = i(b[T], P);
                }),
            A(E).forEach(function (T) {
                g(b, T) ||
                    (p(b, T) && P.isMergeableObject(E[T]) ? (y[T] = d(T, P)(b[T], E[T], P)) : (y[T] = i(E[T], P)));
            }),
            y
        );
    }
    function C(b, E, P) {
        ((P = P || {}),
            (P.arrayMerge = P.arrayMerge || c),
            (P.isMergeableObject = P.isMergeableObject || e),
            (P.cloneUnlessOtherwiseSpecified = i));
        var y = Array.isArray(E),
            T = Array.isArray(b),
            $ = y === T;
        return $ ? (y ? P.arrayMerge(b, E, P) : F(b, E, P)) : i(E, P);
    }
    C.all = function (E, P) {
        if (!Array.isArray(E)) throw new Error("first argument should be an array");
        return E.reduce(function (y, T) {
            return C(y, T, P);
        }, {});
    };
    var N = C;
    return ((ir = N), ir);
}
var or, On;
function dc() {
    if (On) return or;
    On = 1;
    function e(t) {
        var r = t == null ? 0 : t.length;
        return r ? t[r - 1] : void 0;
    }
    return ((or = e), or);
}
var cr, Rn;
function fc() {
    if (Rn) return cr;
    Rn = 1;
    function e(t, r, s) {
        var u = -1,
            a = t.length;
        (r < 0 && (r = -r > a ? 0 : a + r),
            (s = s > a ? a : s),
            s < 0 && (s += a),
            (a = r > s ? 0 : (s - r) >>> 0),
            (r >>>= 0));
        for (var o = Array(a); ++u < a;) o[u] = t[u + r];
        return o;
    }
    return ((cr = e), cr);
}
var lr, $n;
function hc() {
    if ($n) return lr;
    $n = 1;
    var e = ju(),
        t = fc();
    function r(s, u) {
        return u.length < 2 ? s : e(s, t(u, 0, -1));
    }
    return ((lr = r), lr);
}
var dr, kn;
function pc() {
    if (kn) return dr;
    kn = 1;
    var e = ps(),
        t = dc(),
        r = hc(),
        s = Lu(),
        u = Object.prototype,
        a = u.hasOwnProperty;
    function o(i, c) {
        c = e(c, i);
        var d = -1,
            h = c.length;
        if (!h) return !0;
        for (; ++d < h;) {
            var A = s(c[d]);
            if (
                (A === "__proto__" && !a.call(i, "__proto__")) ||
                ((A === "constructor" || A === "prototype") && d < h - 1)
            )
                return !1;
        }
        var p = r(i, c);
        return p == null || delete p[s(t(c))];
    }
    return ((dr = o), dr);
}
var fr, jn;
function mc() {
    if (jn) return fr;
    jn = 1;
    var e = Uu();
    function t(r) {
        return e(r) ? void 0 : r;
    }
    return ((fr = t), fr);
}
var hr, Ln;
function gc() {
    if (Ln) return hr;
    Ln = 1;
    var e = Gu(),
        t = zu(),
        r = qu(),
        s = e ? e.isConcatSpreadable : void 0;
    function u(a) {
        return r(a) || t(a) || !!(s && a && a[s]);
    }
    return ((hr = u), hr);
}
var pr, Un;
function Dc() {
    if (Un) return pr;
    Un = 1;
    var e = Hu(),
        t = gc();
    function r(s, u, a, o, i) {
        var c = -1,
            d = s.length;
        for (a || (a = t), i || (i = []); ++c < d;) {
            var h = s[c];
            u > 0 && a(h) ? (u > 1 ? r(h, u - 1, a, o, i) : e(i, h)) : o || (i[i.length] = h);
        }
        return i;
    }
    return ((pr = r), pr);
}
var mr, Gn;
function yc() {
    if (Gn) return mr;
    Gn = 1;
    var e = Dc();
    function t(r) {
        var s = r == null ? 0 : r.length;
        return s ? e(r, 1) : [];
    }
    return ((mr = t), mr);
}
var gr, zn;
function Ac() {
    if (zn) return gr;
    zn = 1;
    var e = yc(),
        t = Ku(),
        r = Vu();
    function s(u) {
        return r(t(u, void 0, e), u + "");
    }
    return ((gr = s), gr);
}
var Dr, qn;
function Cc() {
    if (qn) return Dr;
    qn = 1;
    var e = Ju(),
        t = Wu(),
        r = pc(),
        s = ps(),
        u = Zu(),
        a = mc(),
        o = Ac(),
        i = Yu(),
        c = 1,
        d = 2,
        h = 4,
        A = o(function (p, g) {
            var F = {};
            if (p == null) return F;
            var C = !1;
            ((g = e(g, function (b) {
                return ((b = s(b, p)), C || (C = b.length > 1), b);
            })),
                u(p, i(p), F),
                C && (F = t(F, c | d | h, a)));
            for (var N = g.length; N--;) r(F, g[N]);
            return F;
        });
    return ((Dr = A), Dr);
}
var Hn;
function Ec() {
    if (Hn) return ct;
    ((Hn = 1), Object.defineProperty(ct, "__esModule", { value: !0 }));
    var e = lc(),
        t = Cc();
    function r(D) {
        return D && typeof D == "object" && "default" in D ? D : { default: D };
    }
    var s = r(e),
        u = r(t);
    var a = function () {
            return (
                (a =
                    Object.assign ||
                    function (v) {
                        for (var w, R = 1, j = arguments.length; R < j; R++) {
                            w = arguments[R];
                            for (var q in w) Object.prototype.hasOwnProperty.call(w, q) && (v[q] = w[q]);
                        }
                        return v;
                    }),
                a.apply(this, arguments)
            );
        },
        o = "https://json-schema.org/draft/2020-12/schema",
        i = (function () {
            function D(v) {
                this.schema = v;
            }
            return (
                (D.prototype.apply = function (v) {
                    this.schema = s.default(this.schema, v.schema);
                }),
                (D.prototype.toSchema = function () {
                    return this.schema;
                }),
                (D.prototype.toSchemaDocument = function () {
                    return typeof this.schema == "boolean" ? this.schema : a({ $schema: o }, this.schema);
                }),
                D
            );
        })(),
        c = function (D) {
            return new i(a({}, D));
        };
    function d(D) {
        for (
            var v,
                w = D?.properties || [],
                R = u.default(D, ["properties", "propertyNames", "additionalProperties", "defs"]),
                j = new i(a({ type: "object" }, R)),
                q = 0,
                Q = w;
            q < Q.length;
            q++
        ) {
            var Ce = Q[q];
            j.apply(Ce);
        }
        if (
            (D?.propertyNames && j.apply(c({ propertyNames: { pattern: D.propertyNames } })),
            D?.additionalProperties &&
                j.apply(
                    c({
                        additionalProperties:
                            (v = D.additionalProperties) === null || v === void 0 ? void 0 : v.toSchema(),
                    }),
                ),
            D?.defs)
        )
            for (var Fe = 0, $e = D.defs; Fe < $e.length; Fe++) {
                var tt = $e[Fe];
                j.apply(tt);
            }
        return j;
    }
    function h() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        for (var w = new i({}), R = 0, j = D; R < j.length; R++) {
            var q = j[R];
            w.apply(q);
        }
        return w;
    }
    function A(D, v, w) {
        var R, j, q;
        return c(
            Object.assign(
                { properties: ((R = {}), (R[D] = v.toSchema()), R), required: [D] },
                w?.dependentSchema
                    ? {
                          dependentSchemas:
                              ((j = {}),
                              (j[D] = (q = w.dependentSchema) === null || q === void 0 ? void 0 : q.toSchema()),
                              j),
                      }
                    : {},
            ),
        );
    }
    function p(D, v, w) {
        var R, j, q, Q;
        return c(
            Object.assign(
                { properties: ((R = {}), (R[D] = v.toSchema()), R) },
                w?.dependsOn ? { dependentRequired: ((j = {}), (j[D] = w.dependsOn), j) } : {},
                w?.dependentSchema
                    ? {
                          dependentSchemas:
                              ((q = {}),
                              (q[D] = (Q = w.dependentSchema) === null || Q === void 0 ? void 0 : Q.toSchema()),
                              q),
                      }
                    : {},
            ),
        );
    }
    function g(D, v) {
        var w;
        return c({ patternProperties: ((w = {}), (w[D] = v.toSchema()), w) });
    }
    var F = function (D) {
        return new i(a({}, D));
    };
    function C(D) {
        var v = u.default(D, ["items", "prefixItems", "unevaluatedItems", "contains", "defs"]),
            w = new i(a({ type: "array" }, v)),
            R = D?.items;
        if (
            (typeof R < "u" && (typeof R == "boolean" ? w.apply(F({ items: R })) : w.apply(F({ items: R.toSchema() }))),
            D?.prefixItems)
        )
            for (var j = 0, q = D.prefixItems; j < q.length; j++) {
                var Q = q[j];
                w.apply(F({ prefixItems: [Q.toSchema()] }));
            }
        var Ce = D?.unevaluatedItems;
        if (
            (typeof Ce < "u" &&
                (typeof Ce == "boolean"
                    ? w.apply(F({ unevaluatedItems: Ce }))
                    : w.apply(F({ unevaluatedItems: Ce.toSchema() }))),
            D?.contains &&
                w.apply(
                    F({
                        contains: D.contains.schema.toSchema(),
                        minContains: D.contains.min,
                        maxContains: D.contains.max,
                    }),
                ),
            D?.defs)
        )
            for (var Fe = 0, $e = D.defs; Fe < $e.length; Fe++) {
                var tt = $e[Fe];
                w.apply(tt);
            }
        return w;
    }
    function N(D) {
        return new i(a({ type: "string" }, D));
    }
    function b(D) {
        return new i(a({ type: "integer" }, D));
    }
    function E(D) {
        return new i(a({ type: "number" }, D));
    }
    function P(D) {
        return new i(a({ type: "null" }, D));
    }
    function y(D) {
        return new i(a({ type: "boolean" }, D));
    }
    function T(D) {
        var v = D.toSchema();
        if (typeof v == "boolean" || v.type === "null" || typeof v.type > "u") return D;
        var w = Array.isArray(v.type) ? v.type.concat("null") : [v.type, "null"];
        return new i(a(a({}, v), { type: w }));
    }
    function $() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        return new i({
            anyOf: D.map(function (w) {
                return w.toSchema();
            }),
        });
    }
    function z() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        return new i({
            allOf: D.map(function (w) {
                return w.toSchema();
            }),
        });
    }
    function se() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        return new i({
            oneOf: D.map(function (w) {
                return w.toSchema();
            }),
        });
    }
    function pe(D) {
        return new i({ not: D.toSchema() });
    }
    function ae() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        return new i(
            D.reduce(function (w, R) {
                var j = R.toSchema();
                return typeof w == "boolean"
                    ? (typeof j == "boolean" && w) || j
                    : typeof j == "boolean"
                      ? w
                      : a(a({}, w), j);
            }, {}),
        );
    }
    function me(D, v, w) {
        return new i({ if: D.toSchema(), then: v.toSchema(), else: w.toSchema() });
    }
    function ge(D, v) {
        return new i({ if: D.toSchema(), then: v.toSchema() });
    }
    function H(D, v) {
        var w;
        return new i({ $defs: ((w = {}), (w[D] = v.toSchema()), w) });
    }
    function oe(D) {
        return new i({ $ref: "#/$defs/".concat(D) });
    }
    function O(D) {
        return new i({ const: D });
    }
    function f() {
        for (var D = [], v = 0; v < arguments.length; v++) D[v] = arguments[v];
        return new i({ enum: D });
    }
    function S() {
        return new i(!1);
    }
    function I() {
        return new i(!0);
    }
    var _ = {
        object: d,
        properties: h,
        requiredProperty: A,
        property: p,
        patternProperty: g,
        array: C,
        string: N,
        integer: b,
        number: E,
        nil: P,
        boolean: y,
        nullable: T,
        anyOf: $,
        allOf: z,
        oneOf: se,
        not: pe,
        concat: ae,
        ifThenElse: me,
        ifThen: ge,
        def: H,
        ref: oe,
        constant: O,
        enumerator: f,
        $false: S,
        $true: I,
    };
    return ((ct.$schema = o), (ct.s = _), ct);
}
var Kn;
function bc() {
    if (Kn) return ot;
    ((Kn = 1), Object.defineProperty(ot, "__esModule", { value: !0 }), (ot.toJSONSchema = void 0));
    const e = As(),
        t = Ec();
    function r(u) {
        return (0, e.match)(u)
            .with({ type: "unknown" }, () => t.s.$false())
            .with({ type: "boolean" }, () => t.s.boolean())
            .with({ type: "nullable" }, ({ schema: a }) =>
                a.type == "unknown" ? t.s.nil() : a.type === "nullable" ? r(a) : t.s.nullable(r(a)),
            )
            .with({ type: "int" }, () => t.s.integer())
            .with({ type: "float" }, () => t.s.number())
            .with({ type: "string" }, ({ format: a }) => {
                const o = s(a);
                return t.s.string(o ? { format: o } : {});
            })
            .with({ type: "array" }, (a) => {
                const o = r(a.items);
                return t.s.array({ items: o });
            })
            .with({ type: "object" }, (a) => {
                const o = Object.entries(a.properties.required).map(([c, d]) => t.s.requiredProperty(c, r(d))),
                    i = Object.entries(a.properties.optional).map(([c, d]) => t.s.property(c, r(d)));
                return t.s.object({ properties: o.concat(i) });
            })
            .with({ type: "any" }, ({ schemas: a }) => t.s.anyOf(...Array.from(a).map(r)))
            .exhaustive();
    }
    ot.toJSONSchema = r;
    function s(u) {
        if (u)
            switch (u.name) {
                case "hostname":
                    return "hostname";
                case "ip":
                    return u.variant == "v4" ? "ipv4" : "ipv6";
                case "uri":
                    return "uri";
                case "email":
                    return "email";
                case "datetime":
                    switch (u.parts) {
                        case "datetime":
                            return "date-time";
                        case "date":
                            return "date";
                        case "time":
                            return "time";
                        default:
                            return;
                    }
                case "uuid":
                    return "uuid";
            }
    }
    return ot;
}
var dt = { exports: {} };
dt.exports;
var Vn;
function Sc() {
    return (
        Vn ||
            ((Vn = 1),
            (function (e, t) {
                var r = 200,
                    s = "Expected a function",
                    u = "__lodash_hash_undefined__",
                    a = 500,
                    o = 1,
                    i = 2,
                    c = 4,
                    d = 800,
                    h = 16,
                    A = 9007199254740991,
                    p = "[object Arguments]",
                    g = "[object Array]",
                    F = "[object AsyncFunction]",
                    C = "[object Boolean]",
                    N = "[object Date]",
                    b = "[object Error]",
                    E = "[object Function]",
                    P = "[object GeneratorFunction]",
                    y = "[object Map]",
                    T = "[object Number]",
                    $ = "[object Null]",
                    z = "[object Object]",
                    se = "[object Promise]",
                    pe = "[object Proxy]",
                    ae = "[object RegExp]",
                    me = "[object Set]",
                    ge = "[object String]",
                    H = "[object Symbol]",
                    oe = "[object Undefined]",
                    O = "[object WeakMap]",
                    f = "[object ArrayBuffer]",
                    S = "[object DataView]",
                    I = "[object Float32Array]",
                    _ = "[object Float64Array]",
                    D = "[object Int8Array]",
                    v = "[object Int16Array]",
                    w = "[object Int32Array]",
                    R = "[object Uint8Array]",
                    j = "[object Uint8ClampedArray]",
                    q = "[object Uint16Array]",
                    Q = "[object Uint32Array]",
                    Ce = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
                    Fe = /^\w*$/,
                    $e =
                        /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
                    tt = /[\\^$.*+?()[\]{}|]/g,
                    ks = /\\(\\)?/g,
                    js = /\w*$/,
                    Ls = /^\[object .+?Constructor\]$/,
                    Us = /^(?:0|[1-9]\d*)$/,
                    Z = {};
                ((Z[I] = Z[_] = Z[D] = Z[v] = Z[w] = Z[R] = Z[j] = Z[q] = Z[Q] = !0),
                    (Z[p] =
                        Z[g] =
                        Z[f] =
                        Z[C] =
                        Z[S] =
                        Z[N] =
                        Z[b] =
                        Z[E] =
                        Z[y] =
                        Z[T] =
                        Z[z] =
                        Z[ae] =
                        Z[me] =
                        Z[ge] =
                        Z[O] =
                            !1));
                var V = {};
                ((V[p] =
                    V[g] =
                    V[f] =
                    V[S] =
                    V[C] =
                    V[N] =
                    V[I] =
                    V[_] =
                    V[D] =
                    V[v] =
                    V[w] =
                    V[y] =
                    V[T] =
                    V[z] =
                    V[ae] =
                    V[me] =
                    V[ge] =
                    V[H] =
                    V[R] =
                    V[j] =
                    V[q] =
                    V[Q] =
                        !0),
                    (V[b] = V[E] = V[O] = !1));
                var Ir = typeof Ft == "object" && Ft && Ft.Object === Object && Ft,
                    Gs = typeof self == "object" && self && self.Object === Object && self,
                    ve = Ir || Gs || Function("return this")(),
                    _r = t && !t.nodeType && t,
                    rt = _r && !0 && e && !e.nodeType && e,
                    Tr = rt && rt.exports === _r,
                    xt = Tr && Ir.process,
                    Ze = (function () {
                        try {
                            var n = rt && rt.require && rt.require("util").types;
                            return n || (xt && xt.binding && xt.binding("util"));
                        } catch {}
                    })(),
                    Pr = Ze && Ze.isMap,
                    Mr = Ze && Ze.isSet,
                    Nr = Ze && Ze.isTypedArray;
                function zs(n, l, m) {
                    switch (m.length) {
                        case 0:
                            return n.call(l);
                        case 1:
                            return n.call(l, m[0]);
                        case 2:
                            return n.call(l, m[0], m[1]);
                        case 3:
                            return n.call(l, m[0], m[1], m[2]);
                    }
                    return n.apply(l, m);
                }
                function qs(n, l) {
                    for (var m = -1, M = n == null ? 0 : n.length; ++m < M && l(n[m], m, n) !== !1;);
                    return n;
                }
                function Hs(n, l) {
                    for (var m = -1, M = n == null ? 0 : n.length, x = 0, L = []; ++m < M;) {
                        var K = n[m];
                        l(K, m, n) && (L[x++] = K);
                    }
                    return L;
                }
                function xr(n, l) {
                    for (var m = -1, M = n == null ? 0 : n.length, x = Array(M); ++m < M;) x[m] = l(n[m], m, n);
                    return x;
                }
                function Ot(n, l) {
                    for (var m = -1, M = l.length, x = n.length; ++m < M;) n[x + m] = l[m];
                    return n;
                }
                function Ks(n, l) {
                    for (var m = -1, M = Array(n); ++m < n;) M[m] = l(m);
                    return M;
                }
                function Rt(n) {
                    return function (l) {
                        return n(l);
                    };
                }
                function Vs(n, l) {
                    return n?.[l];
                }
                function Ws(n, l) {
                    return function (m) {
                        return n(l(m));
                    };
                }
                var Zs = Array.prototype,
                    Ys = Function.prototype,
                    mt = Object.prototype,
                    $t = ve["__core-js_shared__"],
                    gt = Ys.toString,
                    Ee = mt.hasOwnProperty,
                    Or = (function () {
                        var n = /[^.]+$/.exec(($t && $t.keys && $t.keys.IE_PROTO) || "");
                        return n ? "Symbol(src)_1." + n : "";
                    })(),
                    Rr = mt.toString,
                    Js = gt.call(Object),
                    Xs = RegExp(
                        "^" +
                            gt
                                .call(Ee)
                                .replace(tt, "\\$&")
                                .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") +
                            "$",
                    ),
                    Dt = Tr ? ve.Buffer : void 0,
                    Ye = ve.Symbol,
                    $r = ve.Uint8Array;
                Dt && Dt.allocUnsafe;
                var kr = Ws(Object.getPrototypeOf, Object),
                    jr = mt.propertyIsEnumerable,
                    Qs = Zs.splice,
                    Lr = Ye ? Ye.isConcatSpreadable : void 0,
                    ke = Ye ? Ye.toStringTag : void 0,
                    yt = (function () {
                        try {
                            var n = Ue(Object, "defineProperty");
                            return (n({}, "", {}), n);
                        } catch {}
                    })(),
                    kt = Object.getOwnPropertySymbols,
                    ea = Dt ? Dt.isBuffer : void 0,
                    Ur = Math.max,
                    ta = Date.now,
                    jt = Ue(ve, "DataView"),
                    nt = Ue(ve, "Map"),
                    Lt = Ue(ve, "Promise"),
                    Ut = Ue(ve, "Set"),
                    Gt = Ue(ve, "WeakMap"),
                    st = Ue(Object, "create"),
                    ra = Ge(jt),
                    na = Ge(nt),
                    sa = Ge(Lt),
                    aa = Ge(Ut),
                    ua = Ge(Gt),
                    At = Ye ? Ye.prototype : void 0,
                    Gr = At ? At.valueOf : void 0,
                    zr = At ? At.toString : void 0;
                function je(n) {
                    var l = -1,
                        m = n == null ? 0 : n.length;
                    for (this.clear(); ++l < m;) {
                        var M = n[l];
                        this.set(M[0], M[1]);
                    }
                }
                function ia() {
                    ((this.__data__ = st ? st(null) : {}), (this.size = 0));
                }
                function oa(n) {
                    var l = this.has(n) && delete this.__data__[n];
                    return ((this.size -= l ? 1 : 0), l);
                }
                function ca(n) {
                    var l = this.__data__;
                    if (st) {
                        var m = l[n];
                        return m === u ? void 0 : m;
                    }
                    return Ee.call(l, n) ? l[n] : void 0;
                }
                function la(n) {
                    var l = this.__data__;
                    return st ? l[n] !== void 0 : Ee.call(l, n);
                }
                function da(n, l) {
                    var m = this.__data__;
                    return ((this.size += this.has(n) ? 0 : 1), (m[n] = st && l === void 0 ? u : l), this);
                }
                ((je.prototype.clear = ia),
                    (je.prototype.delete = oa),
                    (je.prototype.get = ca),
                    (je.prototype.has = la),
                    (je.prototype.set = da));
                function Be(n) {
                    var l = -1,
                        m = n == null ? 0 : n.length;
                    for (this.clear(); ++l < m;) {
                        var M = n[l];
                        this.set(M[0], M[1]);
                    }
                }
                function fa() {
                    ((this.__data__ = []), (this.size = 0));
                }
                function ha(n) {
                    var l = this.__data__,
                        m = Ct(l, n);
                    if (m < 0) return !1;
                    var M = l.length - 1;
                    return (m == M ? l.pop() : Qs.call(l, m, 1), --this.size, !0);
                }
                function pa(n) {
                    var l = this.__data__,
                        m = Ct(l, n);
                    return m < 0 ? void 0 : l[m][1];
                }
                function ma(n) {
                    return Ct(this.__data__, n) > -1;
                }
                function ga(n, l) {
                    var m = this.__data__,
                        M = Ct(m, n);
                    return (M < 0 ? (++this.size, m.push([n, l])) : (m[M][1] = l), this);
                }
                ((Be.prototype.clear = fa),
                    (Be.prototype.delete = ha),
                    (Be.prototype.get = pa),
                    (Be.prototype.has = ma),
                    (Be.prototype.set = ga));
                function Ne(n) {
                    var l = -1,
                        m = n == null ? 0 : n.length;
                    for (this.clear(); ++l < m;) {
                        var M = n[l];
                        this.set(M[0], M[1]);
                    }
                }
                function Da() {
                    ((this.size = 0), (this.__data__ = { hash: new je(), map: new (nt || Be)(), string: new je() }));
                }
                function ya(n) {
                    var l = bt(this, n).delete(n);
                    return ((this.size -= l ? 1 : 0), l);
                }
                function Aa(n) {
                    return bt(this, n).get(n);
                }
                function Ca(n) {
                    return bt(this, n).has(n);
                }
                function Ea(n, l) {
                    var m = bt(this, n),
                        M = m.size;
                    return (m.set(n, l), (this.size += m.size == M ? 0 : 1), this);
                }
                ((Ne.prototype.clear = Da),
                    (Ne.prototype.delete = ya),
                    (Ne.prototype.get = Aa),
                    (Ne.prototype.has = Ca),
                    (Ne.prototype.set = Ea));
                function Je(n) {
                    var l = (this.__data__ = new Be(n));
                    this.size = l.size;
                }
                function ba() {
                    ((this.__data__ = new Be()), (this.size = 0));
                }
                function Sa(n) {
                    var l = this.__data__,
                        m = l.delete(n);
                    return ((this.size = l.size), m);
                }
                function Fa(n) {
                    return this.__data__.get(n);
                }
                function va(n) {
                    return this.__data__.has(n);
                }
                function Ba(n, l) {
                    var m = this.__data__;
                    if (m instanceof Be) {
                        var M = m.__data__;
                        if (!nt || M.length < r - 1) return (M.push([n, l]), (this.size = ++m.size), this);
                        m = this.__data__ = new Ne(M);
                    }
                    return (m.set(n, l), (this.size = m.size), this);
                }
                ((Je.prototype.clear = ba),
                    (Je.prototype.delete = Sa),
                    (Je.prototype.get = Fa),
                    (Je.prototype.has = va),
                    (Je.prototype.set = Ba));
                function wa(n, l) {
                    var m = ze(n),
                        M = !m && Yr(n),
                        x = !m && !M && Jr(n),
                        L = !m && !M && !x && yu(n),
                        K = m || M || x || L,
                        te = K ? Ks(n.length, String) : [],
                        ce = te.length;
                    for (var be in n)
                        (K &&
                            (be == "length" ||
                                (x && (be == "offset" || be == "parent")) ||
                                (L && (be == "buffer" || be == "byteLength" || be == "byteOffset")) ||
                                Qa(be, ce))) ||
                            te.push(be);
                    return te;
                }
                function qr(n, l, m) {
                    var M = n[l];
                    (!(Ee.call(n, l) && Zr(M, m)) || (m === void 0 && !(l in n))) && Hr(n, l, m);
                }
                function Ct(n, l) {
                    for (var m = n.length; m--;) if (Zr(n[m][0], l)) return m;
                    return -1;
                }
                function Hr(n, l, m) {
                    l == "__proto__" && yt
                        ? yt(n, l, { configurable: !0, enumerable: !0, value: m, writable: !0 })
                        : (n[l] = m);
                }
                function Et(n, l, m, M, x, L) {
                    var K;
                    if ((m && (K = x ? m(n, M, x, L) : m(n)), K !== void 0)) return K;
                    if (!St(n)) return n;
                    var te = ze(n);
                    if (te) K = Ya(n);
                    else {
                        var ce = we(n),
                            be = ce == E || ce == P;
                        if (Jr(n)) return ja(n);
                        if (ce == z || ce == p || (be && !x)) K = {};
                        else {
                            if (!V[ce]) return x ? n : {};
                            K = Ja(n, ce);
                        }
                    }
                    L || (L = new Je());
                    var tn = L.get(n);
                    if (tn) return tn;
                    (L.set(n, K),
                        Du(n)
                            ? n.forEach(function (xe) {
                                  K.add(Et(xe, l, m, xe, n, L));
                              })
                            : mu(n) &&
                              n.forEach(function (xe, He) {
                                  K.set(He, Et(xe, l, m, He, n, L));
                              }));
                    var vu = Wr,
                        rn = te ? void 0 : vu(n);
                    return (
                        qs(rn || n, function (xe, He) {
                            (rn && ((He = xe), (xe = n[He])), qr(K, He, Et(xe, l, m, He, n, L)));
                        }),
                        K
                    );
                }
                function Ia(n, l, m, M, x) {
                    var L = -1,
                        K = n.length;
                    for (m || (m = Xa), x || (x = []); ++L < K;) {
                        var te = n[L];
                        m(te) ? Ot(x, te) : (x[x.length] = te);
                    }
                    return x;
                }
                function _a(n, l) {
                    l = zt(l, n);
                    for (var m = 0, M = l.length; n != null && m < M;) n = n[Ht(l[m++])];
                    return m && m == M ? n : void 0;
                }
                function Ta(n, l, m) {
                    var M = l(n);
                    return ze(n) ? M : Ot(M, m(n));
                }
                function Le(n) {
                    return n == null ? (n === void 0 ? oe : $) : ke && ke in Object(n) ? Va(n) : uu(n);
                }
                function Kr(n) {
                    return qe(n) && Le(n) == p;
                }
                function Pa(n) {
                    return qe(n) && we(n) == y;
                }
                function Ma(n) {
                    if (!St(n) || ru(n)) return !1;
                    var l = Xr(n) ? Xs : Ls;
                    return l.test(Ge(n));
                }
                function Na(n) {
                    return qe(n) && we(n) == me;
                }
                function xa(n) {
                    return qe(n) && Qr(n.length) && !!Z[Le(n)];
                }
                function Oa(n) {
                    if (!St(n)) return au(n);
                    var l = nu(n),
                        m = [];
                    for (var M in n) (M == "constructor" && (l || !Ee.call(n, M))) || m.push(M);
                    return m;
                }
                var Ra = yt
                    ? function (n, l) {
                          return yt(n, "toString", { configurable: !0, enumerable: !1, value: bu(l), writable: !0 });
                      }
                    : Su;
                function $a(n, l, m) {
                    var M = -1,
                        x = n.length;
                    (l < 0 && (l = -l > x ? 0 : x + l),
                        (m = m > x ? x : m),
                        m < 0 && (m += x),
                        (x = l > m ? 0 : (m - l) >>> 0),
                        (l >>>= 0));
                    for (var L = Array(x); ++M < x;) L[M] = n[M + l];
                    return L;
                }
                function Vr(n) {
                    if (typeof n == "string") return n;
                    if (ze(n)) return xr(n, Vr) + "";
                    if (Vt(n)) return zr ? zr.call(n) : "";
                    var l = n + "";
                    return l == "0" && 1 / n == -1 / 0 ? "-0" : l;
                }
                function ka(n, l) {
                    l = zt(l, n);
                    var m = -1,
                        M = l.length;
                    if (!M) return !0;
                    for (; ++m < M;) {
                        var x = Ht(l[m]);
                        if (
                            (x === "__proto__" && !Ee.call(n, "__proto__")) ||
                            ((x === "constructor" || x === "prototype") && m < M - 1)
                        )
                            return !1;
                    }
                    var L = ou(n, l);
                    return L == null || delete L[Ht(hu(l))];
                }
                function zt(n, l) {
                    return ze(n) ? n : eu(n, l) ? [n] : du(Au(n));
                }
                function ja(n, l) {
                    return n.slice();
                }
                function qt(n) {
                    var l = new n.constructor(n.byteLength);
                    return (new $r(l).set(new $r(n)), l);
                }
                function La(n, l) {
                    var m = qt(n.buffer);
                    return new n.constructor(m, n.byteOffset, n.byteLength);
                }
                function Ua(n) {
                    var l = new n.constructor(n.source, js.exec(n));
                    return ((l.lastIndex = n.lastIndex), l);
                }
                function Ga(n) {
                    return Gr ? Object(Gr.call(n)) : {};
                }
                function za(n, l) {
                    var m = qt(n.buffer);
                    return new n.constructor(m, n.byteOffset, n.length);
                }
                function qa(n, l, m, M) {
                    var x = !m;
                    m || (m = {});
                    for (var L = -1, K = l.length; ++L < K;) {
                        var te = l[L],
                            ce = void 0;
                        (ce === void 0 && (ce = n[te]), x ? Hr(m, te, ce) : qr(m, te, ce));
                    }
                    return m;
                }
                function Ha(n) {
                    return gu(n) ? void 0 : n;
                }
                function Ka(n) {
                    return cu(iu(n, void 0, fu), n + "");
                }
                function Wr(n) {
                    return Ta(n, Cu, Za);
                }
                function bt(n, l) {
                    var m = n.__data__;
                    return tu(l) ? m[typeof l == "string" ? "string" : "hash"] : m.map;
                }
                function Ue(n, l) {
                    var m = Vs(n, l);
                    return Ma(m) ? m : void 0;
                }
                function Va(n) {
                    var l = Ee.call(n, ke),
                        m = n[ke];
                    try {
                        n[ke] = void 0;
                        var M = !0;
                    } catch {}
                    var x = Rr.call(n);
                    return (M && (l ? (n[ke] = m) : delete n[ke]), x);
                }
                var Wa = kt
                        ? function (n) {
                              return n == null
                                  ? []
                                  : ((n = Object(n)),
                                    Hs(kt(n), function (l) {
                                        return jr.call(n, l);
                                    }));
                          }
                        : en,
                    Za = kt
                        ? function (n) {
                              for (var l = []; n;) (Ot(l, Wa(n)), (n = kr(n)));
                              return l;
                          }
                        : en,
                    we = Le;
                ((jt && we(new jt(new ArrayBuffer(1))) != S) ||
                    (nt && we(new nt()) != y) ||
                    (Lt && we(Lt.resolve()) != se) ||
                    (Ut && we(new Ut()) != me) ||
                    (Gt && we(new Gt()) != O)) &&
                    (we = function (n) {
                        var l = Le(n),
                            m = l == z ? n.constructor : void 0,
                            M = m ? Ge(m) : "";
                        if (M)
                            switch (M) {
                                case ra:
                                    return S;
                                case na:
                                    return y;
                                case sa:
                                    return se;
                                case aa:
                                    return me;
                                case ua:
                                    return O;
                            }
                        return l;
                    });
                function Ya(n) {
                    var l = n.length,
                        m = new n.constructor(l);
                    return (
                        l &&
                            typeof n[0] == "string" &&
                            Ee.call(n, "index") &&
                            ((m.index = n.index), (m.input = n.input)),
                        m
                    );
                }
                function Ja(n, l, m) {
                    var M = n.constructor;
                    switch (l) {
                        case f:
                            return qt(n);
                        case C:
                        case N:
                            return new M(+n);
                        case S:
                            return La(n);
                        case I:
                        case _:
                        case D:
                        case v:
                        case w:
                        case R:
                        case j:
                        case q:
                        case Q:
                            return za(n);
                        case y:
                            return new M();
                        case T:
                        case ge:
                            return new M(n);
                        case ae:
                            return Ua(n);
                        case me:
                            return new M();
                        case H:
                            return Ga(n);
                    }
                }
                function Xa(n) {
                    return ze(n) || Yr(n) || !!(Lr && n && n[Lr]);
                }
                function Qa(n, l) {
                    var m = typeof n;
                    return (
                        (l = l ?? A),
                        !!l && (m == "number" || (m != "symbol" && Us.test(n))) && n > -1 && n % 1 == 0 && n < l
                    );
                }
                function eu(n, l) {
                    if (ze(n)) return !1;
                    var m = typeof n;
                    return m == "number" || m == "symbol" || m == "boolean" || n == null || Vt(n)
                        ? !0
                        : Fe.test(n) || !Ce.test(n) || (l != null && n in Object(l));
                }
                function tu(n) {
                    var l = typeof n;
                    return l == "string" || l == "number" || l == "symbol" || l == "boolean"
                        ? n !== "__proto__"
                        : n === null;
                }
                function ru(n) {
                    return !!Or && Or in n;
                }
                function nu(n) {
                    var l = n && n.constructor,
                        m = (typeof l == "function" && l.prototype) || mt;
                    return n === m;
                }
                function su(n) {
                    var l = Kt(n, function (M) {
                            return (m.size === a && m.clear(), M);
                        }),
                        m = l.cache;
                    return l;
                }
                function au(n) {
                    var l = [];
                    if (n != null) for (var m in Object(n)) l.push(m);
                    return l;
                }
                function uu(n) {
                    return Rr.call(n);
                }
                function iu(n, l, m) {
                    return (
                        (l = Ur(l === void 0 ? n.length - 1 : l, 0)),
                        function () {
                            for (var M = arguments, x = -1, L = Ur(M.length - l, 0), K = Array(L); ++x < L;)
                                K[x] = M[l + x];
                            x = -1;
                            for (var te = Array(l + 1); ++x < l;) te[x] = M[x];
                            return ((te[l] = m(K)), zs(n, this, te));
                        }
                    );
                }
                function ou(n, l) {
                    return l.length < 2 ? n : _a(n, $a(l, 0, -1));
                }
                var cu = lu(Ra);
                function lu(n) {
                    var l = 0,
                        m = 0;
                    return function () {
                        var M = ta(),
                            x = h - (M - m);
                        if (((m = M), x > 0)) {
                            if (++l >= d) return arguments[0];
                        } else l = 0;
                        return n.apply(void 0, arguments);
                    };
                }
                var du = su(function (n) {
                    var l = [];
                    return (
                        n.charCodeAt(0) === 46 && l.push(""),
                        n.replace($e, function (m, M, x, L) {
                            l.push(x ? L.replace(ks, "$1") : M || m);
                        }),
                        l
                    );
                });
                function Ht(n) {
                    if (typeof n == "string" || Vt(n)) return n;
                    var l = n + "";
                    return l == "0" && 1 / n == -1 / 0 ? "-0" : l;
                }
                function Ge(n) {
                    if (n != null) {
                        try {
                            return gt.call(n);
                        } catch {}
                        try {
                            return n + "";
                        } catch {}
                    }
                    return "";
                }
                function fu(n) {
                    var l = n == null ? 0 : n.length;
                    return l ? Ia(n) : [];
                }
                function hu(n) {
                    var l = n == null ? 0 : n.length;
                    return l ? n[l - 1] : void 0;
                }
                function Kt(n, l) {
                    if (typeof n != "function" || (l != null && typeof l != "function")) throw new TypeError(s);
                    var m = function () {
                        var M = arguments,
                            x = l ? l.apply(this, M) : M[0],
                            L = m.cache;
                        if (L.has(x)) return L.get(x);
                        var K = n.apply(this, M);
                        return ((m.cache = L.set(x, K) || L), K);
                    };
                    return ((m.cache = new (Kt.Cache || Ne)()), m);
                }
                Kt.Cache = Ne;
                function Zr(n, l) {
                    return n === l || (n !== n && l !== l);
                }
                var Yr = Kr(
                        (function () {
                            return arguments;
                        })(),
                    )
                        ? Kr
                        : function (n) {
                              return qe(n) && Ee.call(n, "callee") && !jr.call(n, "callee");
                          },
                    ze = Array.isArray;
                function pu(n) {
                    return n != null && Qr(n.length) && !Xr(n);
                }
                var Jr = ea || Fu;
                function Xr(n) {
                    if (!St(n)) return !1;
                    var l = Le(n);
                    return l == E || l == P || l == F || l == pe;
                }
                function Qr(n) {
                    return typeof n == "number" && n > -1 && n % 1 == 0 && n <= A;
                }
                function St(n) {
                    var l = typeof n;
                    return n != null && (l == "object" || l == "function");
                }
                function qe(n) {
                    return n != null && typeof n == "object";
                }
                var mu = Pr ? Rt(Pr) : Pa;
                function gu(n) {
                    if (!qe(n) || Le(n) != z) return !1;
                    var l = kr(n);
                    if (l === null) return !0;
                    var m = Ee.call(l, "constructor") && l.constructor;
                    return typeof m == "function" && m instanceof m && gt.call(m) == Js;
                }
                var Du = Mr ? Rt(Mr) : Na;
                function Vt(n) {
                    return typeof n == "symbol" || (qe(n) && Le(n) == H);
                }
                var yu = Nr ? Rt(Nr) : xa;
                function Au(n) {
                    return n == null ? "" : Vr(n);
                }
                function Cu(n) {
                    return pu(n) ? wa(n) : Oa(n);
                }
                var Eu = Ka(function (n, l) {
                    var m = {};
                    if (n == null) return m;
                    var M = !1;
                    ((l = xr(l, function (L) {
                        return ((L = zt(L, n)), M || (M = L.length > 1), L);
                    })),
                        qa(n, Wr(n), m),
                        M && (m = Et(m, o | i | c, Ha)));
                    for (var x = l.length; x--;) ka(m, l[x]);
                    return m;
                });
                function bu(n) {
                    return function () {
                        return n;
                    };
                }
                function Su(n) {
                    return n;
                }
                function en() {
                    return [];
                }
                function Fu() {
                    return !1;
                }
                e.exports = Eu;
            })(dt, dt.exports)),
        dt.exports
    );
}
var Wn;
function Fc() {
    if (Wn) return Xe;
    Wn = 1;
    var e =
        (Xe && Xe.__importDefault) ||
        function (d) {
            return d && d.__esModule ? d : { default: d };
        };
    Object.defineProperty(Xe, "__esModule", { value: !0 });
    const t = As(),
        r = oc,
        s = cc(),
        u = bc(),
        a = e(Sc());
    function o(d, h) {
        const A = new Set([d]);
        return (A.add(i({ type: "unknown" }, h)), { type: "any", schemas: A });
    }
    function i(d, h) {
        const A = (0, r.inferType)(h);
        return (0, t.match)([d, A])
            .with([t.__, { name: "null" }], ([g]) => ({ type: "nullable", schema: g }))
            .with([{ type: "nullable" }, t.__], ([g, { value: F }]) => ({ type: "nullable", schema: i(g.schema, F) }))
            .with([{ type: "unknown" }, { name: "bool" }], () => ({ type: "boolean" }))
            .with([{ type: "unknown" }, { name: "int" }], ([, g]) => ({
                type: "int",
                range: (0, s.inferRange)(g.value),
            }))
            .with([{ type: "unknown" }, { name: "float" }], ([, g]) => ({
                type: "float",
                range: (0, s.inferRange)(g.value),
            }))
            .with([{ type: "unknown" }, { name: "string" }], ([, { format: g }]) => ({ type: "string", format: g }))
            .with([{ type: "unknown" }, { name: "array" }], ([, g]) => {
                let F = { type: "unknown" };
                for (const C of g.value) F = i(F, C);
                return { type: "array", items: F };
            })
            .with([{ type: "array" }, { name: "array" }], ([g, F]) => {
                let C = g.items;
                for (const N of F.value) C = i(C, N);
                return { type: "array", items: C };
            })
            .with([{ type: "array" }, t.__], ([g]) => o(g, h))
            .with([{ type: "unknown" }, { name: "object" }], ([, g]) => ({
                type: "object",
                properties: {
                    required: Object.entries(g.value).reduce(
                        (C, [N, b]) => ({ ...C, [N]: i({ type: "unknown" }, b) }),
                        {},
                    ),
                    optional: {},
                },
            }))
            .with([{ type: "object" }, { name: "object" }], ([{ properties: g }, { value: F }]) => {
                const { required: C, optional: N } = g,
                    b = Object.keys(C).filter((P) => !Object.prototype.hasOwnProperty.call(F, P));
                for (const P of b) N[P] = C[P];
                const E = (0, a.default)(C, b);
                for (const [P, y] of Object.entries(F))
                    Object.prototype.hasOwnProperty.call(E, P)
                        ? (E[P] = i(C[P], y))
                        : Object.prototype.hasOwnProperty.call(N, P)
                          ? (N[P] = i(N[P], y))
                          : (N[P] = i({ type: "unknown" }, y));
                return { type: "object", properties: { required: E, optional: N } };
            })
            .with([{ type: "object" }, t.__], ([g]) => o(g, h))
            .with([{ type: "any" }, t.__], ([g]) => {
                const F = new Set(g.schemas);
                return (F.add(i({ type: "unknown" }, h)), { type: "any", schemas: F });
            })
            .with([{ type: "boolean" }, { name: "bool" }], () => ({ type: "boolean" }))
            .with([{ type: "boolean" }, t.__], ([g]) => o(g, h))
            .with([{ type: "int" }, { name: "int" }], ([g, F]) => ({
                type: "int",
                range: (0, s.inferRange)(F.value, g.range),
            }))
            .with([{ type: "int" }, { name: "float" }], ([g, F]) => ({
                type: "float",
                range: (0, s.inferRange)(F.value, g.range),
            }))
            .with([{ type: "int" }, t.__], ([g]) => o(g, h))
            .with([{ type: "float" }, { name: "float" }], ([g, F]) => ({
                type: "float",
                range: (0, s.inferRange)(F.value, g.range),
            }))
            .with([{ type: "float" }, { name: "int" }], ([g, F]) => ({
                type: "float",
                range: (0, s.inferRange)(F.value, g.range),
            }))
            .with([{ type: "float" }, t.__], ([g]) => o(g, h))
            .with(
                [
                    { type: "string", format: t.__.nullish },
                    { name: "string", format: t.__.nullish },
                ],
                () => ({ type: "string" }),
            )
            .with(
                [
                    { type: "string", format: t.__.nullish },
                    { name: "string", format: { name: t.__.string } },
                ],
                () => ({ type: "string" }),
            )
            .with(
                [
                    { type: "string", format: { name: t.__.string } },
                    { name: "string", format: t.__.nullish },
                ],
                () => ({ type: "string" }),
            )
            .with(
                [
                    { type: "string", format: { name: t.__.string } },
                    { name: "string", format: { name: t.__.string } },
                ],
                ([{ format: g }, { format: F }]) =>
                    g.name !== F.name ? { type: "string" } : { type: "string", format: F },
            )
            .with([{ type: "string" }, { name: "string" }], () => ({ type: "string" }))
            .with([{ type: "string" }, t.__], ([g]) => o(g, h))
            .exhaustive();
    }
    class c {
        constructor(h) {
            ((this.inferredSchema = { type: "unknown" }), h && (this.inferredSchema = h));
        }
        infer(h, A) {
            this.inferredSchema = i(A ? A.inferredSchema : this.inferredSchema, h);
        }
        toJSONSchema(h) {
            return h?.includeSchema
                ? (0, u.toJSONSchema)(this.inferredSchema).toSchemaDocument()
                : (0, u.toJSONSchema)(this.inferredSchema).toSchema();
        }
        toSnapshot() {
            return this.inferredSchema;
        }
    }
    return ((Xe.default = c), Xe);
}
var Zn;
function vc() {
    if (Zn) return Ie;
    Zn = 1;
    var e =
        (Ie && Ie.__importDefault) ||
        function (u) {
            return u && u.__esModule ? u : { default: u };
        };
    (Object.defineProperty(Ie, "__esModule", { value: !0 }), (Ie.restoreSnapshot = Ie.inferSchema = void 0));
    const t = e(Fc());
    function r(u, a) {
        const o = new t.default();
        return (o.infer(u, a), o);
    }
    Ie.inferSchema = r;
    function s(u) {
        return new t.default(u);
    }
    return ((Ie.restoreSnapshot = s), Ie);
}
var Yn = vc();
const Bc = {
    maxSampleSize: 1e3,
    maxDepth: 3,
    enumMaxAbsoluteUnique: 10,
    enumMaxUniqueRatio: 0.2,
    enumMaxStringLength: 64,
    enumMinSampleSize: 25,
};
class wc {
    constructor(t) {
        ((this.values = new Map()), (this.options = t));
    }
    trackValue(t, r) {
        this.values.has(t) || this.values.set(t, []);
        const s = this.values.get(t);
        s && s.push(r);
    }
    trackObject(t, r = "", s = 0) {
        if (!(s >= this.options.maxDepth))
            for (const [u, a] of Object.entries(t)) {
                if (r === "" && u === "id") continue;
                const o = r ? `${r}.${u}` : u;
                typeof a == "string"
                    ? this.trackValue(o, a)
                    : a !== null && typeof a == "object" && !Array.isArray(a) && this.trackObject(a, o, s + 1);
            }
    }
    getEnumAnalysis(t) {
        const r = this.values.get(t);
        if (!r || r.length < this.options.enumMinSampleSize) return { isEnum: !1 };
        const s = [...new Set(r)],
            u = s.length / r.length,
            a = s.length <= this.options.enumMaxAbsoluteUnique || u <= this.options.enumMaxUniqueRatio,
            o = s.every((i) => i.length <= this.options.enumMaxStringLength);
        return a && o ? (s.sort((i, c) => (i < c ? -1 : +(i > c))), { isEnum: !0, values: s }) : { isEnum: !1 };
    }
}
class Is {
    constructor(t, r = {}) {
        ((this.graph = t), (this.options = { ...Bc, ...r }));
    }
    extract() {
        const t = this.graph.getDataManager(),
            r = this.graph.getNodeCount(),
            s = this.graph.getEdgeCount(),
            u = Array.from(t.nodes.values())
                .map((o) => o.data)
                .filter((o) => o !== void 0),
            a = Array.from(t.edges.values())
                .map((o) => o.data)
                .filter((o) => o !== void 0);
        return {
            nodeProperties: this.extractFromCollection(u),
            edgeProperties: this.extractFromCollection(a),
            nodeCount: r,
            edgeCount: s,
        };
    }
    extractFromCollection(t) {
        if (t.length === 0) return [];
        const r = t.length <= this.options.maxSampleSize ? t : this.sampleEvenly(t, this.options.maxSampleSize),
            [s, ...u] = r;
        let a = Yn.inferSchema(s);
        for (const c of u) a = Yn.inferSchema(c, a);
        const o = a.toSnapshot(),
            i = new wc(this.options);
        for (const c of r) i.trackObject(c, "", 0);
        return this.mergeResults(o, i);
    }
    mergeResults(t, r) {
        const s = [];
        if (t.type === "object" && t.properties) {
            for (const [u, a] of Object.entries(t.properties.required)) this.extractProperties(u, a, r, "", !1, s);
            for (const [u, a] of Object.entries(t.properties.optional)) this.extractProperties(u, a, r, "", !0, s);
        }
        return s.sort((u, a) => u.name.localeCompare(a.name));
    }
    extractProperties(t, r, s, u, a, o, i = 0) {
        const c = u ? `${u}.${t}` : t;
        if ((u === "" && t === "id") || i >= this.options.maxDepth) return;
        let d = a,
            h = r;
        if ((r.type === "nullable" && r.schema && ((d = !0), (h = r.schema)), h.type === "object" && h.properties)) {
            for (const [p, g] of Object.entries(h.properties.required))
                this.extractProperties(p, g, s, c, !1, o, i + 1);
            for (const [p, g] of Object.entries(h.properties.optional))
                this.extractProperties(p, g, s, c, !0, o, i + 1);
            return;
        }
        const A = this.schemaToSummary(c, h, s, d);
        A && o.push(A);
    }
    schemaToSummary(t, r, s, u) {
        const a = { name: t, type: this.inferredTypeToPropertyType(r), nullable: u };
        switch (r.type) {
            case "string": {
                r.format?.name && (a.format = r.format.name);
                const o = s.getEnumAnalysis(t);
                o.isEnum && o.values && (a.enumValues = o.values);
                break;
            }
            case "int":
            case "float": {
                r.range && (a.range = r.range);
                break;
            }
            case "array": {
                r.items && (a.itemType = this.inferredTypeToPropertyType(r.items));
                break;
            }
        }
        return a;
    }
    inferredTypeToPropertyType(t) {
        switch (t.type) {
            case "string":
                return "string";
            case "int":
                return "integer";
            case "float":
                return "number";
            case "boolean":
                return "boolean";
            case "array":
                return "array";
            case "object":
                return "object";
            case "any":
                return "mixed";
            case "nullable":
                return t.schema ? this.inferredTypeToPropertyType(t.schema) : "unknown";
            default:
                return "unknown";
        }
    }
    sampleEvenly(t, r) {
        const s = [],
            u = t.length / r;
        for (let a = 0; a < r; a++) {
            const o = Math.floor(a * u);
            s.push(t[o]);
        }
        return s;
    }
}
const ht =
        "A node's or edge's own fields are under 'data.', so write data.type == 'server' or data.weight > `0.5` (numbers in backticks); a bare name such as id or type matches nothing. An empty string matches everything.",
    wr =
        "Optional. An expression matching edges, in the same language: only nodes at an end of a matching edge are selected, so data.weight > `0.7` picks the nodes with heavy connections. Combined with selector, a node must match both; with an empty selector, every such node.",
    Ic = new Set(["", "*", "all", "*.*", "true"]);
function pt(e) {
    return !e || Ic.has(e.toLowerCase().trim());
}
function wt(e) {
    return e.replaceAll('"', "'");
}
async function _s(e, t, r) {
    if (r === void 0 && (t === void 0 || pt(t))) return Array.from(e.getDataManager().nodes.keys(), String);
    const s = await e.getSession().scope.resolve(Ts(t, r));
    return Array.from(s.nodes, String);
}
function Ts(e, t) {
    if (t === void 0) return { where: wt(e ?? "") };
    const r = {
        kind: "member",
        of: { define: { kind: "rule", where: { kind: "edges", where: wt(t) }, reading: "listed" } },
    };
    return {
        define: {
            kind: "rule",
            where: e === void 0 || pt(e) ? r : { kind: "all", of: [{ kind: "expression", where: wt(e) }, r] },
            reading: "clipped",
        },
    };
}
function Ps(e) {
    return `No nodes matched the selector "${e}". ${ht}`;
}
const _c = et(["nodeCount", "edgeCount", "currentLayout", "all", "summary"]).describe(
        "Type of information to query about the graph",
    ),
    Tc = {
        name: "queryGraph",
        description:
            "Query information about the graph structure, including node count, edge count, current layout, and overall statistics.",
        parameters: ne({ query: _c }),
        examples: [
            { input: "How many nodes are there?", params: { query: "nodeCount" } },
            { input: "How many edges?", params: { query: "edgeCount" } },
            { input: "What layout is being used?", params: { query: "currentLayout" } },
            { input: "Show me the graph summary", params: { query: "summary" } },
            { input: "Give me all the graph stats", params: { query: "all" } },
        ],
        execute(e, t) {
            const { query: r } = t;
            try {
                switch (r) {
                    case "nodeCount": {
                        const s = e.getNodeCount();
                        return Promise.resolve({
                            success: !0,
                            message: `The graph has ${s} node${s !== 1 ? "s" : ""}.`,
                            data: { nodeCount: s },
                        });
                    }
                    case "edgeCount": {
                        const s = e.getEdgeCount();
                        return Promise.resolve({
                            success: !0,
                            message: `The graph has ${s} edge${s !== 1 ? "s" : ""}.`,
                            data: { edgeCount: s },
                        });
                    }
                    case "currentLayout": {
                        const u = e.getLayoutManager().layoutEngine?.type ?? "unknown";
                        return Promise.resolve({
                            success: !0,
                            message: `The current layout is "${u}".`,
                            data: { layout: u },
                        });
                    }
                    case "all":
                    case "summary": {
                        const s = e.getNodeCount(),
                            u = e.getEdgeCount(),
                            o = e.getLayoutManager().layoutEngine?.type ?? "unknown",
                            i = e.getViewMode() === "2d";
                        return Promise.resolve({
                            success: !0,
                            message: `Graph Summary:
- Nodes: ${s}
- Edges: ${u}
- Layout: ${o}
- Mode: ${i ? "2D" : "3D"}`,
                            data: { nodeCount: s, edgeCount: u, layout: o, is2D: i },
                        });
                    }
                    default: {
                        const s = e.getNodeCount(),
                            u = e.getEdgeCount();
                        return Promise.resolve({
                            success: !0,
                            message: `Unknown query type "${String(r)}". The graph has ${s} nodes and ${u} edges.`,
                            data: { nodeCount: s, edgeCount: u },
                        });
                    }
                }
            } catch (s) {
                return Promise.resolve({ success: !1, message: `Failed to query graph: ${s.message}` });
            }
        },
    },
    Pc = 50,
    Mc = {
        name: "findNodes",
        description:
            "Find nodes in the graph that match a selector. Returns the total number of matches and at most `limit` matching node IDs (50 when no limit is given), with `truncated` true when the list was cut. Takes the same selector and connectedBy as findAndStyleNodes and zoomToNodes.",
        parameters: ne({
            selector: W().describe(`Expression matching nodes. ${ht}`),
            connectedBy: W().optional().describe(wr),
            limit: he().optional().describe("Maximum number of node IDs to return (default 50)"),
        }),
        examples: [
            { input: "Find all server nodes", params: { selector: "data.type == 'server'" } },
            { input: "Find nodes older than 30", params: { selector: "data.age > `30`" } },
            { input: "Get first 10 nodes", params: { selector: "", limit: 10 } },
        ],
        async execute(e, t) {
            const { selector: r, connectedBy: s, limit: u } = t;
            try {
                const a = await _s(e, r, s),
                    o = a.length,
                    i = a.slice(0, u !== void 0 && u > 0 ? u : Pc),
                    c = i.length,
                    d = o > c,
                    h = o === 1 ? "" : "s",
                    A = d ? ` (showing ${c})` : "",
                    p = `Found ${o} matching node${h}${A}.`;
                return {
                    success: !0,
                    message: o === 0 && (s !== void 0 || !pt(r)) ? Ps(r) : p,
                    data: { total: o, returned: c, count: c, truncated: d, nodeIds: i },
                    affectedNodes: i,
                };
            } catch (a) {
                return { success: !1, message: `Failed to find nodes: ${a.message}` };
            }
        },
    },
    Nc = et(["nodeTypes", "edgeTypes", "nodeProperties", "edgeProperties", "all"]).describe(
        "Type of schema information to retrieve",
    ),
    xc = {
        name: "getSchema",
        description:
            "Get schema information about the graph data including node types, edge types, and available properties. Use this to discover what types of nodes exist or what properties are available for filtering.",
        parameters: ne({ query: Nc }),
        examples: [
            { input: "What types of nodes are there?", params: { query: "nodeTypes" } },
            { input: "What node types exist in the graph?", params: { query: "nodeTypes" } },
            { input: "What properties do nodes have?", params: { query: "nodeProperties" } },
            { input: "What edge properties are available?", params: { query: "edgeProperties" } },
            { input: "Show me the data schema", params: { query: "all" } },
        ],
        execute(e, t) {
            const { query: r } = t;
            try {
                const u = new Is(e).extract(),
                    a = e.getDataManager(),
                    o = (i, c, d = 20) => {
                        const h = new Set();
                        for (const A of i) {
                            const p = A.data?.[c];
                            if (typeof p == "string" && (h.add(p), h.size > d)) return [];
                        }
                        return Array.from(h).sort();
                    };
                switch (r) {
                    case "nodeTypes": {
                        let c = u.nodeProperties.find((d) => d.name === "type")?.enumValues ?? [];
                        return (
                            c.length === 0 && (c = o(a.nodes.values(), "type")),
                            c.length === 0
                                ? Promise.resolve({
                                      success: !0,
                                      message:
                                          "No distinct node types found. Nodes may not have a 'type' property, or there are too many unique values to categorize.",
                                      data: { nodeTypes: [] },
                                  })
                                : Promise.resolve({
                                      success: !0,
                                      message: `Found ${c.length} node type${c.length !== 1 ? "s" : ""}: ${c.join(", ")}`,
                                      data: { nodeTypes: c },
                                  })
                        );
                    }
                    case "edgeTypes": {
                        let c = u.edgeProperties.find((d) => d.name === "type")?.enumValues ?? [];
                        return (
                            c.length === 0 && (c = o(a.edges.values(), "type")),
                            c.length === 0
                                ? Promise.resolve({
                                      success: !0,
                                      message:
                                          "No distinct edge types found. Edges may not have a 'type' property, or there are too many unique values to categorize.",
                                      data: { edgeTypes: [] },
                                  })
                                : Promise.resolve({
                                      success: !0,
                                      message: `Found ${c.length} edge type${c.length !== 1 ? "s" : ""}: ${c.join(", ")}`,
                                      data: { edgeTypes: c },
                                  })
                        );
                    }
                    case "nodeProperties": {
                        const c = u.nodeProperties
                            .map((d) => {
                                let h = `${d.name}: ${d.type}`;
                                return (
                                    d.enumValues &&
                                        d.enumValues.length > 0 &&
                                        (h += ` (values: ${d.enumValues.join(", ")})`),
                                    d.range && (h += ` (range: ${d.range.min}-${d.range.max})`),
                                    h
                                );
                            })
                            .map((d) => `- ${d}`).join(`
`);
                        return Promise.resolve({
                            success: !0,
                            message: `Node properties:
${c}`,
                            data: { nodeProperties: u.nodeProperties },
                        });
                    }
                    case "edgeProperties": {
                        const i = u.edgeProperties.map((d) => {
                            let h = `${d.name}: ${d.type}`;
                            return (
                                d.enumValues &&
                                    d.enumValues.length > 0 &&
                                    (h += ` (values: ${d.enumValues.join(", ")})`),
                                d.range && (h += ` (range: ${d.range.min}-${d.range.max})`),
                                h
                            );
                        });
                        if (i.length === 0)
                            return Promise.resolve({
                                success: !0,
                                message: "No edge properties found.",
                                data: { edgeProperties: [] },
                            });
                        const c = i.map((d) => `- ${d}`).join(`
`);
                        return Promise.resolve({
                            success: !0,
                            message: `Edge properties:
${c}`,
                            data: { edgeProperties: u.edgeProperties },
                        });
                    }
                    case "all": {
                        let c = u.nodeProperties.find((F) => F.name === "type")?.enumValues ?? [];
                        c.length === 0 && (c = o(a.nodes.values(), "type"));
                        let h = u.edgeProperties.find((F) => F.name === "type")?.enumValues ?? [];
                        h.length === 0 && (h = o(a.edges.values(), "type"));
                        const A = u.nodeProperties.map((F) => F.name),
                            p = u.edgeProperties.map((F) => F.name);
                        let g = `Graph Schema Summary:
- ${u.nodeCount} nodes with ${u.nodeProperties.length} properties
- ${u.edgeCount} edges with ${u.edgeProperties.length} properties`;
                        return (
                            c.length > 0 &&
                                (g += `

Node types: ${c.join(", ")}`),
                            h.length > 0 &&
                                (g += `

Edge types: ${h.join(", ")}`),
                            A.length > 0 &&
                                (g += `

Node properties: ${A.join(", ")}`),
                            p.length > 0 &&
                                (g += `

Edge properties: ${p.join(", ")}`),
                            Promise.resolve({
                                success: !0,
                                message: g,
                                data: {
                                    nodeCount: u.nodeCount,
                                    edgeCount: u.edgeCount,
                                    nodeTypes: c,
                                    edgeTypes: h,
                                    nodeProperties: u.nodeProperties,
                                    edgeProperties: u.edgeProperties,
                                },
                            })
                        );
                    }
                    default:
                        return Promise.resolve({ success: !1, message: `Unknown schema query type: ${String(r)}` });
                }
            } catch (s) {
                return Promise.resolve({ success: !1, message: `Failed to get schema: ${s.message}` });
            }
        },
    };
function We(e, t) {
    return t?.tx ?? e.getSession();
}
const Oc = W().describe("Layout algorithm type (e.g., 'circular', 'ngraph', 'random', 'spiral', 'd3')"),
    Rc = et(["2d", "3d"]).describe("Dimension mode: '2d' or '3d'"),
    $c = {
        name: "setLayout",
        description:
            "Change the graph layout algorithm. Common layouts include 'circular' (nodes in a circle), 'ngraph' (force-directed physics), 'random', 'spiral', 'shell', 'd3' (D3 force simulation), 'spring', 'planar', 'spectral', and 'forceatlas2'.",
        parameters: ne({ type: Oc, options: ds(W(), fs()).optional().describe("Additional layout-specific options") }),
        examples: [
            { input: "Use circular layout", params: { type: "circular" } },
            { input: "Switch to force-directed layout", params: { type: "ngraph" } },
            { input: "Arrange nodes randomly", params: { type: "random" } },
            { input: "Spiral layout", params: { type: "spiral" } },
            { input: "Use D3 force layout", params: { type: "d3" } },
            { input: "Shell layout", params: { type: "shell" } },
        ],
        async execute(e, t, r) {
            const { type: s, options: u = {} } = t;
            try {
                return (
                    await We(e, r).layout.set(Tu(s) ?? s, { engine: s, options: u }),
                    {
                        success: !0,
                        message: `Layout changed to "${s}". The graph is now being rearranged.`,
                        data: { layoutType: s },
                    }
                );
            } catch (a) {
                const o = a.message;
                return (ls(a) && a.code === "E_UNKNOWN_LAYOUT") ||
                    o.includes("not found") ||
                    o.includes("unknown") ||
                    o.includes("invalid")
                    ? {
                          success: !1,
                          message: `Invalid layout type "${s}". Try 'circular', 'ngraph', 'random', 'spiral', 'shell', or 'd3'.`,
                      }
                    : { success: !1, message: `Failed to set layout to "${s}": ${o}` };
            }
        },
    },
    kc = {
        name: "setDimension",
        description:
            "Switch between 2D and 3D graph visualization modes. In 2D mode, nodes are arranged on a flat plane. In 3D mode, nodes can be positioned in three-dimensional space.",
        parameters: ne({ dimension: Rc }),
        examples: [
            { input: "Switch to 2D view", params: { dimension: "2d" } },
            { input: "Show in 3D", params: { dimension: "3d" } },
            { input: "Make it flat", params: { dimension: "2d" } },
            { input: "Enable 3D mode", params: { dimension: "3d" } },
        ],
        async execute(e, t, r) {
            const { dimension: s } = t;
            try {
                const u = s === "2d",
                    a = u ? "2D" : "3D";
                return (
                    await We(e, r).layout.setDimension(u ? "2d" : "3d"),
                    {
                        success: !0,
                        message: `Switched to ${a} mode. The graph will now be displayed ${u ? "on a flat plane" : "in three-dimensional space"}.`,
                        data: { dimension: a, is2D: u },
                    }
                );
            } catch (u) {
                return { success: !1, message: `Failed to change dimension: ${u.message}` };
            }
        },
    },
    jc = et(["vr", "ar", "exit"]).describe(
        "VR for virtual reality, AR for augmented reality, exit to return to normal view",
    ),
    Lc = {
        name: "setImmersiveMode",
        description:
            "Enter or exit VR/AR immersive modes using WebXR. Use 'vr' for virtual reality (headset), 'ar' for augmented reality (pass-through or mobile AR), or 'exit' to return to normal desktop view.",
        parameters: ne({ mode: jc }),
        examples: [
            { input: "Enter VR mode", params: { mode: "vr" } },
            { input: "Switch to AR", params: { mode: "ar" } },
            { input: "Exit immersive mode", params: { mode: "exit" } },
            { input: "Leave VR", params: { mode: "exit" } },
            { input: "Put me in virtual reality", params: { mode: "vr" } },
            { input: "Show augmented reality view", params: { mode: "ar" } },
            { input: "Go back to normal view", params: { mode: "exit" } },
        ],
        async execute(e, t) {
            const { mode: r } = t;
            try {
                if (r === "exit") {
                    const o = e.exitImmersiveMode;
                    return (
                        o && (await o.call(e)),
                        { success: !0, message: "Exited immersive mode, returned to normal view." }
                    );
                }
                const { getXRHelper: s } = e,
                    u = s?.call(e);
                if (!u)
                    return {
                        success: !1,
                        message: `WebXR is not available. ${r.toUpperCase()} mode requires a WebXR-capable browser and device.`,
                    };
                if (r === "vr") {
                    const { enterVR: o } = u;
                    return o
                        ? (await o.call(u),
                          {
                              success: !0,
                              message: "Entering VR mode. Put on your headset to view the graph in virtual reality.",
                          })
                        : { success: !1, message: "VR mode is not supported on this device or browser." };
                }
                const { enterAR: a } = u;
                return a
                    ? (await a.call(u),
                      {
                          success: !0,
                          message: "Entering AR mode. Point your device to see the graph in augmented reality.",
                      })
                    : { success: !1, message: "AR mode is not supported on this device or browser." };
            } catch (s) {
                return { success: !1, message: `Failed to enter ${r.toUpperCase()} mode: ${s.message}` };
            }
        },
    },
    Uc = ne({
        color: W().optional().describe("Color for the node (e.g., '#ff0000', 'red')"),
        size: he().positive().optional().describe("Size of the node (default is 1)"),
        shape: W().optional().describe("Shape type (e.g., 'sphere', 'box', 'cylinder')"),
        glowColor: W().optional().describe("Glow effect color"),
        glowStrength: he()
            .positive()
            .optional()
            .describe(
                "Glow effect strength (default 1), per style. It scales a glow color and draws nothing without one",
            ),
        outlineColor: W().optional().describe("Outline color"),
        outlineWidth: he()
            .positive()
            .optional()
            .describe(
                "Outline width. Not drawn: every outline in the scene is stroked at one width, so asking for this is answered with the reason rather than applied",
            ),
        enabled: Mt().optional().describe("Whether the node is visible"),
    }).describe("Style properties for nodes"),
    Gc = ne({
        color: W().optional().describe("Color for the edge line (e.g., '#00ff00', 'green')"),
        width: he().positive().optional().describe("Width of the edge line"),
        lineType: W().optional().describe("Line pattern (e.g., 'solid', 'dash', 'dot')"),
        arrowColor: W().optional().describe("Color for the arrow head"),
        arrowSize: he().positive().optional().describe("Size of the arrow head"),
        arrowOpacity: he().min(0).max(1).optional().describe("Opacity of the arrow head, 0 to 1"),
        enabled: Mt().optional().describe("Whether the edge is visible"),
    }).describe("Style properties for edges"),
    zc = { by: "plugin", name: "graphty-ai" };
function qc(e) {
    const t = {},
        r = [];
    return (
        e.color !== void 0 && (t["node.color"] = e.color),
        e.size !== void 0 && (t["node.size"] = e.size),
        e.shape !== void 0 && (t["node.shape"] = e.shape),
        e.glowColor !== void 0 && (t["node.glow"] = e.glowColor),
        e.glowStrength !== void 0 && (t["node.glowStrength"] = e.glowStrength),
        e.outlineColor !== void 0 && (t["node.outline"] = e.outlineColor),
        e.enabled === !1 && (t["node.opacity"] = 0),
        e.outlineWidth !== void 0 && r.push({ property: "outlineWidth", reason: Pu }),
        { set: t, unsupported: r }
    );
}
function Hc(e) {
    const t = {};
    return (
        e.color !== void 0 && (t["edge.color"] = e.color),
        e.width !== void 0 && (t["edge.width"] = e.width),
        e.lineType !== void 0 && (t["edge.style"] = e.lineType),
        e.enabled === !1 && (t["edge.opacity"] = 0),
        e.arrowColor !== void 0 && (t["edge.arrowHeadColor"] = e.arrowColor),
        e.arrowSize !== void 0 && (t["edge.arrowHeadSize"] = e.arrowSize),
        e.arrowOpacity !== void 0 && (t["edge.arrowHeadOpacity"] = e.arrowOpacity),
        { set: t, unsupported: [] }
    );
}
function Ms(e, t, r, s, u) {
    let a;
    return (
        u !== void 0
            ? (a = { match: "member", of: Ts(r, u) })
            : pt(r)
              ? (a = { match: "everything" })
              : (a = { match: "expression", where: wt(r) }),
        { name: e, target: t, kind: "custom", source: zc, selector: a, set: s }
    );
}
function Ns(e) {
    return ls(e) ? `${e.message} (${e.code})` : e instanceof Error ? e.message : String(e);
}
async function xs(e, t, r, s) {
    const { styles: u } = e,
        a = u.validate(t);
    if (!a.ok)
        return {
            success: !1,
            message: `That ${s} style could not be applied: ${a.errors.map((o) => o.message).join(" ")}`,
        };
    try {
        const o = await u.add(t),
            i = r.map(({ property: d, reason: h }) => ` ${d} was not applied: ${h}`).join(""),
            c =
                a.unresolvedPaths.length === 0
                    ? ""
                    : ` Nothing in this graph answers ${a.unresolvedPaths.join(", ")} yet, so the layer may paint nothing until it does.`;
        return {
            success: !0,
            message: `Added the ${s} style layer "${o.name}".${i}${c}`,
            data: { layerId: o.id, layerName: o.name },
        };
    } catch (o) {
        return { success: !1, message: `That ${s} style could not be applied: ${Ns(o)}` };
    }
}
const Kc = {
        name: "findAndStyleNodes",
        description:
            "Style the nodes matching a selector by adding a style layer. Takes the same selector and connectedBy as findNodes and zoomToNodes; connectedBy picks nodes by their edges' fields. Styles include color, size, shape, glow color and outline color.",
        parameters: ne({
            selector: W().describe(`Expression matching nodes. ${ht}`),
            connectedBy: W().optional().describe(wr),
            style: Uc,
            layerName: W().optional().describe("Name for this style layer (for later removal)"),
        }),
        examples: [
            {
                input: "Make all nodes red",
                params: { selector: "", style: { color: "#ff0000" }, layerName: "red-nodes" },
            },
            {
                input: "Highlight server nodes in blue",
                params: {
                    selector: "data.type == 'server'",
                    style: { color: "#0000ff", glowColor: "#0000ff" },
                    layerName: "servers",
                },
            },
            {
                input: "Highlight the servers that have a slow link",
                params: {
                    selector: "data.type == 'server'",
                    connectedBy: "data.latency > `50`",
                    style: { color: "#ff9900", glowColor: "#ff9900" },
                    layerName: "servers-with-slow-links",
                },
            },
            { input: "Make nodes larger", params: { selector: "", style: { size: 2 }, layerName: "large-nodes" } },
            {
                input: "Change nodes to boxes",
                params: { selector: "", style: { shape: "box" }, layerName: "box-shapes" },
            },
        ],
        async execute(e, t, r) {
            const { selector: s, connectedBy: u, style: a, layerName: o = `ai-node-style-${Date.now()}` } = t,
                { set: i, unsupported: c } = qc(a);
            return xs(We(e, r), Ms(o, "node", s, i, u), c, "node");
        },
    },
    Vc = {
        name: "findAndStyleEdges",
        description:
            "Style the edges matching a selector by adding a style layer. Takes the same selector as findAndStyleNodes. Styles include color, width and line pattern.",
        parameters: ne({
            selector: W().describe(`Expression matching edges. ${ht}`),
            style: Gc,
            layerName: W().optional().describe("Name for this style layer (for later removal)"),
        }),
        examples: [
            {
                input: "Make all edges green",
                params: { selector: "", style: { color: "#00ff00" }, layerName: "green-edges" },
            },
            {
                input: "Highlight heavy edges",
                params: {
                    selector: "data.weight > `0.7`",
                    style: { color: "#ff0000", width: 3 },
                    layerName: "heavy-edges",
                },
            },
            { input: "Make edges dashed", params: { selector: "", style: { lineType: "dash" }, layerName: "dashed" } },
        ],
        async execute(e, t, r) {
            const { selector: s, style: u, layerName: a = `ai-edge-style-${Date.now()}` } = t,
                { set: o, unsupported: i } = Hc(u);
            return xs(We(e, r), Ms(a, "edge", s, o), i, "edge");
        },
    },
    Wc = {
        name: "clearStyles",
        description:
            "Clear styles added by AI commands. Specify a layerName to clear a specific style, or leave empty to clear all AI-added styles.",
        parameters: ne({
            layerName: W().optional().describe("Name of the style layer to clear (clears all if not specified)"),
        }),
        examples: [
            { input: "Clear all styling", params: {} },
            { input: "Remove red node styling", params: { layerName: "red-nodes" } },
        ],
        async execute(e, t, r) {
            const { layerName: s } = t,
                { styles: u } = We(e, r);
            try {
                if (s === void 0) {
                    const o = await u.removeBySource((i) => i.by === "plugin" && i.name === "graphty-ai");
                    return {
                        success: !0,
                        message: `Cleared ${String(o.length)} AI-added style layer(s).`,
                        data: { clearedCount: o.length },
                    };
                }
                const a = u
                    .list()
                    .filter((o) => o.name === s && o.source.by === "plugin" && o.source.name === "graphty-ai");
                if (a.length === 0)
                    return { success: !0, message: `Style layer "${s}" not found (may already be cleared).` };
                for (const o of a) await u.remove(o.id);
                return { success: !0, message: `Cleared style layer "${s}".`, data: { clearedCount: a.length } };
            } catch (a) {
                return { success: !1, message: `Failed to clear styles: ${Ns(a)}` };
            }
        },
    };
function Jn() {
    return [...Nu.map((e) => e.id), ...xu().map((e) => e.id)];
}
const Zc = W().describe(
        "Named camera view. The element ships 'fitToGraph', 'topView', 'sideView', 'frontView' and 'isometric'; an application may have registered others.",
    ),
    Xn = ne({ x: he(), y: he(), z: he() }).describe("3D position coordinates"),
    Yc = {
        name: "setCameraPosition",
        get description() {
            return `Set the camera position using a preset (${Jn().join(", ")}) or specific coordinates. Presets automatically calculate the best view for the current graph. Animation can be enabled for smooth transitions.`;
        },
        parameters: ne({
            preset: Zc.optional().describe("Named camera preset to apply"),
            position: Xn.optional().describe("Custom camera position (3D only)"),
            target: Xn.optional().describe("Point the camera should look at (3D only)"),
            animate: Mt().optional().describe("Whether to animate the camera transition (default: true)"),
        }),
        examples: [
            { input: "Show from top", params: { preset: "topView", animate: !0 } },
            { input: "View from the side", params: { preset: "sideView" } },
            { input: "Show front view", params: { preset: "frontView" } },
            { input: "Isometric view", params: { preset: "isometric" } },
            { input: "Fit all nodes in view", params: { preset: "fitToGraph" } },
            {
                input: "Move camera to position",
                params: { position: { x: 10, y: 20, z: 30 }, target: { x: 0, y: 0, z: 0 } },
            },
        ],
        async execute(e, t) {
            const { preset: r, position: s, target: u, animate: a = !0 } = t;
            try {
                if (!r && !s) return { success: !1, message: "Either 'preset' or 'position' must be provided." };
                if (r)
                    return Mu(r)
                        ? (await e.setCameraState(
                              { preset: r },
                              { animate: a, description: `Setting camera to ${r} view` },
                          ),
                          {
                              success: !0,
                              message: `Camera moved to ${r} view${a ? " (animated)" : ""}.`,
                              data: { preset: r, animated: a },
                          })
                        : { success: !1, message: `Unknown camera view "${r}". Available views: ${Jn().join(", ")}.` };
                if (s) {
                    const o = { position: s };
                    return (
                        u && (o.target = u),
                        await e.setCameraState(o, { animate: a, description: "Moving camera to specified position" }),
                        {
                            success: !0,
                            message: `Camera moved to position (${s.x}, ${s.y}, ${s.z})${a ? " (animated)" : ""}.`,
                            data: { position: s, target: u, animated: a },
                        }
                    );
                }
                return { success: !1, message: "No camera state specified." };
            } catch (o) {
                return { success: !1, message: `Failed to set camera position: ${o.message}` };
            }
        },
    },
    Jc = {
        name: "zoomToNodes",
        description:
            "Zoom the camera to fit specific nodes in view. Takes the same selector and connectedBy as findNodes and findAndStyleNodes; leave both empty to fit all nodes. Optionally add padding around the nodes.",
        parameters: ne({
            selector: W().optional().describe(`Expression matching nodes. ${ht}`),
            connectedBy: W().optional().describe(wr),
            animate: Mt().optional().describe("Whether to animate the zoom (default: true)"),
            padding: he().optional().describe("Extra padding around nodes (default: 1.2 = 20% padding)"),
        }),
        examples: [
            { input: "Zoom to fit all nodes", params: { selector: "" } },
            { input: "Zoom to server nodes", params: { selector: "data.type == 'server'" } },
            { input: "Fit graph with more padding", params: { selector: "", padding: 1.5 } },
        ],
        async execute(e, t) {
            const { selector: r = "", connectedBy: s, animate: u = !0 } = t;
            try {
                const a = await _s(e, r, s),
                    o = s !== void 0 || !pt(r);
                if (a.length === 0 && o) return { success: !0, message: Ps(r), affectedNodes: [] };
                await e.applyCameraView("fitToGraph", {
                    ...(o ? { scope: { nodes: a } } : {}),
                    animate: u,
                    description: `Zooming to fit ${o ? "matching nodes" : "all nodes"}`,
                });
                const i = o ? a.length : e.getNodeCount(),
                    c = o ? ` matching "${r}"` : "";
                return {
                    success: !0,
                    message: `Zoomed to fit ${i} node(s)${c}.`,
                    affectedNodes: a,
                    data: { nodeCount: i, animated: u },
                };
            } catch (a) {
                return { success: !1, message: `Failed to zoom to nodes: ${a.message}` };
            }
        },
    },
    Qn = ne({
        namespace: W().describe("The namespace of the algorithm (e.g., 'graphty')"),
        type: W().describe("The type of algorithm to run (e.g., 'degree', 'pagerank')"),
        options: ds(W(), fs())
            .optional()
            .describe(
                "The algorithm's options, by name (e.g., { source: 'a', target: 'b' } for dijkstra, { dampingFactor: 0.9 } for pagerank). An unknown name or an out-of-range value is refused.",
            ),
    }),
    es = 50,
    ts = ne({ namespace: W().optional().describe("Optional namespace to filter algorithms by") }),
    Xc = {
        name: "runAlgorithm",
        description:
            "Run a graph algorithm to analyze the graph structure, optionally with options such as a source and target. Returns a bounded summary: the top 10 elements and the value range for a metric, the group sizes for a partition, the route for a path, plus any graph-level values.",
        parameters: Qn,
        examples: [
            { input: "Calculate the degree of each node", params: { namespace: "graphty", type: "degree" } },
            { input: "Run pagerank algorithm", params: { namespace: "graphty", type: "pagerank" } },
            { input: "Compute centrality metrics", params: { namespace: "graphty", type: "degree" } },
            {
                input: "Find the shortest path from node A to node B",
                params: { namespace: "graphty", type: "dijkstra", options: { source: "A", target: "B" } },
            },
        ],
        async execute(e, t, r) {
            const s = Qn.safeParse(t);
            if (!s.success) return { success: !1, message: `Invalid parameters: ${s.error.message}` };
            const { namespace: u, type: a, options: o } = s.data;
            try {
                if (!yr.get(e, u, a)) {
                    const g = yr.getRegisteredAlgorithms(u),
                        F =
                            g.length > 0
                                ? `Available in namespace '${u}': ${g.map((C) => C.split(":")[1]).join(", ")}`
                                : `No algorithms found in namespace '${u}'. Use listAlgorithms to see available options.`;
                    return { success: !1, message: `Algorithm not found: ${u}:${a}. ${F}` };
                }
                const c = (u === "graphty" ? Ou(a) : void 0) ?? nn(`${u}:${a}`) ?? nn(a);
                if (c === void 0)
                    return (
                        await We(e, r).execute({
                            op: "algo.legacy",
                            namespace: u,
                            type: a,
                            ...(o === void 0 ? {} : { options: o }),
                        }),
                        {
                            success: !0,
                            message: `Successfully ran ${u}:${a} algorithm. Results are now available in node data.`,
                            data: { namespace: u, type: a, nodeCount: e.getNodeCount() },
                        }
                    );
                const d = "params" in c ? c.params : {},
                    h = await We(e, r).run({ op: "algo.run", algorithm: c.descriptor.key, params: { ...d, ...o } }),
                    A = {
                        namespace: u,
                        type: a,
                        algorithm: c.descriptor.key,
                        shape: h.shape,
                        summary: h.summary(),
                        graph: h.graph,
                    };
                let p;
                if (h.shape === "path") {
                    const g = h
                        .ranking("order")
                        .map((F) => String(F.id))
                        .reverse();
                    ((p = g.slice(0, es)), (A.path = { nodeIds: p, total: g.length, truncated: g.length > es }));
                }
                return {
                    success: !0,
                    message: `Successfully ran ${u}:${a} algorithm. ${Ru(h, {})}`,
                    data: A,
                    ...(p === void 0 ? {} : { affectedNodes: p }),
                };
            } catch (i) {
                return {
                    success: !1,
                    message: `Failed to run algorithm ${u}:${a}: ${i instanceof Error ? i.message : String(i)}`,
                };
            }
        },
    },
    Qc = {
        name: "listAlgorithms",
        description:
            "List all available graph algorithms that can be run on the graph. Optionally filter by namespace.",
        parameters: ts,
        examples: [
            { input: "What algorithms are available?", params: {} },
            { input: "List graphty algorithms", params: { namespace: "graphty" } },
            { input: "Show me the available analysis tools", params: {} },
        ],
        async execute(e, t) {
            const r = ts.safeParse(t);
            if (!r.success) return { success: !1, message: `Invalid parameters: ${r.error.message}` };
            const { namespace: s } = r.data;
            try {
                const u = yr.getRegisteredAlgorithms(s);
                return u.length === 0
                    ? {
                          success: !0,
                          message: s
                              ? `No algorithms found in namespace '${s}'.`
                              : "No algorithms are currently registered.",
                          data: { algorithms: [], count: 0 },
                      }
                    : {
                          success: !0,
                          message: s
                              ? `Found ${u.length} algorithm(s) in namespace '${s}': ${u.join(", ")}`
                              : `Found ${u.length} available algorithm(s): ${u.join(", ")}`,
                          data: { algorithms: u, count: u.length },
                      };
            } catch (u) {
                return {
                    success: !1,
                    message: `Failed to list algorithms: ${u instanceof Error ? u.message : String(u)}`,
                };
            }
        },
    };
function el(e, t = 100) {
    return e.length <= t ? e : `${e.slice(0, t)}...`;
}
function rs(e, t) {
    if (e == null) return;
    const r = t.split(".");
    let s = e;
    for (const u of r) {
        if (s == null || typeof s != "object") return;
        s = s[u];
    }
    return s;
}
function Fr(e, t) {
    const r = rs(e, t);
    return r === void 0 && t.startsWith("data.") ? rs(e, t.slice(5)) : r;
}
function Pt(e, t = 100) {
    if (e == null) return e;
    if (typeof e == "string") return el(e, t);
    if (Array.isArray(e)) return e.map((r) => Pt(r, t));
    if (typeof e == "object") {
        const r = {};
        for (const [s, u] of Object.entries(e)) r[s] = Pt(u, t);
        return r;
    }
    return e;
}
function Os(e) {
    if (e.length === 0) return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    const t = [...e].sort((c, d) => c - d),
        r = e.reduce((c, d) => c + d, 0),
        s = t[0],
        u = t[t.length - 1],
        a = r / e.length,
        o = Math.floor(t.length / 2),
        i = t.length % 2 === 0 ? (t[o - 1] + t[o]) / 2 : t[o];
    return { min: s, max: u, avg: a, median: i, count: e.length };
}
function tl(e, t = 5) {
    if (e.length === 0) return [];
    const r = Math.min(...e),
        s = Math.max(...e);
    if (r === s) return [{ range: ns(r, s), count: e.length, min: r, max: s }];
    const u = (s - r) / t,
        a = [];
    for (let o = 0; o < t; o++) {
        const i = r + o * u,
            c = o === t - 1 ? s : r + (o + 1) * u;
        a.push({ range: ns(i, c), count: 0, min: i, max: c });
    }
    for (const o of e) {
        let i = Math.floor((o - r) / u);
        (i >= t && (i = t - 1), a[i].count++);
    }
    return a;
}
function ns(e, t) {
    const r = (s) => (Number.isInteger(s) ? s.toString() : s.toFixed(2));
    return `${r(e)} - ${r(t)}`;
}
function rl(e) {
    if (e == null) return "null";
    if (Array.isArray(e)) return "array";
    const t = typeof e;
    return t === "string" || t === "number" || t === "boolean" ? t : t === "object" ? "object" : "null";
}
function nl(e, t) {
    const r = [];
    let s = 0;
    for (const u of e) {
        const a = Fr(u.data, t);
        a == null ? s++ : r.push(a);
    }
    return { values: r, nullCount: s };
}
function Rs(e) {
    if (e.length === 0) return "null";
    const t = new Map();
    for (const r of e) {
        const s = rl(r);
        t.set(s, (t.get(s) ?? 0) + 1);
    }
    return (t.delete("null"), t.size === 0 ? "null" : t.size > 1 ? "mixed" : t.keys().next().value);
}
function sl(e, t = 3) {
    const r = new Set();
    for (const s of e) $s(s.data, "", r, 0, t);
    return Array.from(r).sort();
}
function $s(e, t, r, s, u) {
    if (!(s >= u || e === null || e === void 0 || typeof e != "object" || Array.isArray(e)))
        for (const a of Object.keys(e)) {
            const o = t ? `${t}.${a}` : a;
            r.add(o);
            const i = e[a];
            i !== null && typeof i == "object" && !Array.isArray(i) && $s(i, o, r, s + 1, u);
        }
}
const al = et(["nodes", "edges", "both"]).optional().describe("What to sample: 'nodes', 'edges', or 'both' (default)"),
    ss = 3,
    as = 10,
    us = 100;
function Qe(e, t) {
    if (e.length <= t) return [...e];
    const r = [...e];
    for (let s = 0; s < t; s++) {
        const u = s + Math.floor(Math.random() * (r.length - s));
        [r[s], r[u]] = [r[u], r[s]];
    }
    return r.slice(0, t);
}
function is(e, t, r) {
    if (e.length <= t) return [...e];
    const s = new Map(),
        u = [];
    for (const c of e) {
        const d = r(c);
        if (d === void 0) u.push(c);
        else {
            const h = s.get(d) ?? [];
            (h.push(c), s.set(d, h));
        }
    }
    const a = s.size + (u.length > 0 ? 1 : 0);
    if (a === 0) return Qe(e, t);
    const o = Math.max(1, Math.floor(t / a)),
        i = [];
    for (const c of s.values()) {
        const d = Qe(c, o);
        i.push(...d);
    }
    if (u.length > 0) {
        const c = Qe(u, o);
        i.push(...c);
    }
    if (i.length < t) {
        const c = e.filter((h) => !i.includes(h)),
            d = Qe(c, t - i.length);
        i.push(...d);
    }
    return i.slice(0, t);
}
const ul = {
        name: "sampleData",
        description:
            "Get sample nodes and/or edges from the graph to inspect actual data structures. Useful for understanding what properties exist and what values they contain before writing selectors.",
        parameters: ne({
            target: al,
            count: he()
                .min(1)
                .max(as)
                .optional()
                .describe(`Number of samples to return per type (1-${as}, default ${ss})`),
            stratifyBy: W()
                .optional()
                .describe("Property path to stratify sampling by (e.g., 'data.type' to sample from each type)"),
        }),
        examples: [
            { input: "Show me some example nodes", params: { target: "nodes" } },
            { input: "Show me 5 sample edges", params: { target: "edges", count: 5 } },
            { input: "Get sample data from the graph", params: {} },
            {
                input: "Show me node samples from each type",
                params: { target: "nodes", count: 6, stratifyBy: "data.type" },
            },
        ],
        execute(e, t) {
            const { target: r = "both", count: s = ss, stratifyBy: u } = t;
            try {
                const a = e.getDataManager(),
                    o = {};
                if (r === "nodes" || r === "both") {
                    const c = Array.from(a.nodes.values());
                    let d;
                    (u
                        ? (d = is(c, s, (h) => {
                              const A = Fr(h.data, u);
                              return typeof A == "string" ? A : void 0;
                          }))
                        : (d = Qe(c, s)),
                        (o.nodes = d.map((h) => ({ id: String(h.id), data: Pt(h.data, us) }))));
                }
                if (r === "edges" || r === "both") {
                    const c = Array.from(a.edges.values());
                    let d;
                    (u
                        ? (d = is(c, s, (h) => {
                              const A = Fr(h.data, u);
                              return typeof A == "string" ? A : void 0;
                          }))
                        : (d = Qe(c, s)),
                        (o.edges = d.map((h) => ({
                            id: h.id,
                            source: String(h.srcId),
                            target: String(h.dstId),
                            data: Pt(h.data, us),
                        }))));
                }
                const i = [];
                return (
                    o.nodes && i.push(`${o.nodes.length} node sample${o.nodes.length !== 1 ? "s" : ""}`),
                    o.edges && i.push(`${o.edges.length} edge sample${o.edges.length !== 1 ? "s" : ""}`),
                    Promise.resolve({ success: !0, message: `Returned ${i.join(" and ")}.`, data: o })
                );
            } catch (a) {
                return Promise.resolve({ success: !1, message: `Failed to sample data: ${a.message}` });
            }
        },
    },
    os = 20,
    cs = 50,
    il = 5;
function ol(e, t, r, s, u) {
    const a = r.filter((A) => typeof A == "string"),
        o = new Map();
    for (const A of a) o.set(A, (o.get(A) ?? 0) + 1);
    const i = Array.from(o.entries()).sort((A, p) => p[1] - A[1]),
        c = i.length > u,
        d = i.slice(0, u),
        h = {};
    for (const [A, p] of d) h[A] = { count: p, percentage: (p / a.length) * 100 };
    return {
        property: e,
        target: t,
        type: "string",
        totalCount: a.length + s,
        nullCount: s,
        uniqueCount: o.size,
        distribution: h,
        truncated: c,
    };
}
function cl(e, t, r, s) {
    const u = r.filter((i) => typeof i == "number"),
        a = Os(u),
        o = tl(u, il);
    return {
        property: e,
        target: t,
        type: "number",
        totalCount: u.length + s,
        nullCount: s,
        statistics: { min: a.min, max: a.max, avg: a.avg, median: a.median },
        histogram: o.map((i) => ({ range: i.range, count: i.count })),
    };
}
function ll(e, t, r, s) {
    const u = r.filter((i) => typeof i == "boolean"),
        a = u.filter(Boolean).length,
        o = u.length - a;
    return {
        property: e,
        target: t,
        type: "boolean",
        totalCount: u.length + s,
        nullCount: s,
        distribution: {
            true: { count: a, percentage: u.length > 0 ? (a / u.length) * 100 : 0 },
            false: { count: o, percentage: u.length > 0 ? (o / u.length) * 100 : 0 },
        },
    };
}
function dl(e, t, r, s, u) {
    const a = r.filter((g) => Array.isArray(g)),
        o = [],
        i = [];
    for (const g of a) (i.push(g.length), o.push(...g));
    const c = Rs(o),
        d = new Set();
    for (const g of o)
        typeof g == "string"
            ? d.add(g)
            : typeof g == "number" || typeof g == "boolean"
              ? d.add(String(g))
              : g != null && d.add(JSON.stringify(g));
    const h = Array.from(d),
        A = h.length > u,
        p = Os(i);
    return {
        property: e,
        target: t,
        type: "array",
        totalCount: a.length + s,
        nullCount: s,
        itemType: c,
        uniqueItems: h.slice(0, u),
        uniqueItemCount: h.length,
        lengthStatistics: { min: p.min, max: p.max, avg: p.avg },
        truncated: A,
    };
}
function fl(e, t, r, s) {
    const u = {};
    for (const a of r) {
        const o = typeof a;
        Array.isArray(a)
            ? (u.array = (u.array || 0) + 1)
            : o === "object" && a !== null
              ? (u.object = (u.object || 0) + 1)
              : (o === "string" || o === "number" || o === "boolean") && (u[o] = (u[o] || 0) + 1);
    }
    return { property: e, target: t, type: "mixed", totalCount: r.length + s, nullCount: s, typeCounts: u };
}
const hl = {
        name: "describeProperty",
        description:
            "Get detailed information about a specific property in node or edge data. Returns value distributions for strings, statistics for numbers, counts for booleans, and unique items for arrays.",
        parameters: ne({
            property: W().describe("Property path to analyze (e.g., 'type', 'data.category', 'weight')"),
            target: et(["nodes", "edges"])
                .optional()
                .describe("Whether to analyze node or edge properties (default: 'nodes')"),
            limit: he()
                .min(1)
                .max(cs)
                .optional()
                .describe(`Maximum number of unique values to show (1-${cs}, default ${os})`),
        }),
        examples: [
            { input: "Describe the type property on nodes", params: { property: "type", target: "nodes" } },
            {
                input: "What values does the weight property have on edges?",
                params: { property: "weight", target: "edges" },
            },
            { input: "Show me the distribution of data.category", params: { property: "data.category" } },
            { input: "Analyze the tags property", params: { property: "tags", limit: 10 } },
        ],
        execute(e, t) {
            const { property: r, target: s = "nodes", limit: u = os } = t;
            try {
                const a = e.getDataManager(),
                    o = Array.from(s === "nodes" ? a.nodes.values() : a.edges.values());
                if (o.length === 0) return Promise.resolve({ success: !1, message: `No ${s} found in the graph.` });
                const { values: i, nullCount: c } = nl(o, r);
                if (i.length === 0 && c === o.length) {
                    const p = sl(o);
                    return Promise.resolve({
                        success: !1,
                        message: `Property "${r}" not found on ${s}. Available properties: ${p.slice(0, 10).join(", ")}${p.length > 10 ? "..." : ""}`,
                        data: { availableProperties: p.slice(0, 20) },
                    });
                }
                const d = Rs(i);
                let h;
                switch (d) {
                    case "string":
                        h = ol(r, s, i, c, u);
                        break;
                    case "number":
                        h = cl(r, s, i, c);
                        break;
                    case "boolean":
                        h = ll(r, s, i, c);
                        break;
                    case "array":
                        h = dl(r, s, i, c, u);
                        break;
                    case "mixed":
                        h = fl(r, s, i, c);
                        break;
                    default:
                        return Promise.resolve({
                            success: !1,
                            message: `Could not analyze property "${r}" - no valid values found.`,
                        });
                }
                let A;
                switch (d) {
                    case "string": {
                        const p = h;
                        A = `Property "${r}" is a string with ${p.uniqueCount} unique value${p.uniqueCount !== 1 ? "s" : ""}.`;
                        break;
                    }
                    case "number": {
                        const p = h;
                        A = `Property "${r}" is a number (min: ${p.statistics.min.toFixed(2)}, max: ${p.statistics.max.toFixed(2)}, avg: ${p.statistics.avg.toFixed(2)}).`;
                        break;
                    }
                    case "boolean": {
                        const p = h;
                        A = `Property "${r}" is a boolean (true: ${p.distribution.true.percentage.toFixed(1)}%, false: ${p.distribution.false.percentage.toFixed(1)}%).`;
                        break;
                    }
                    case "array": {
                        const p = h;
                        A = `Property "${r}" is an array of ${p.itemType} values with ${p.uniqueItemCount} unique item${p.uniqueItemCount !== 1 ? "s" : ""}.`;
                        break;
                    }
                    case "mixed": {
                        const g = Object.keys(h.typeCounts).join(", ");
                        A = `Property "${r}" has mixed types: ${g}.`;
                        break;
                    }
                    default:
                        A = `Property "${r}" analyzed successfully.`;
                }
                return Promise.resolve({ success: !0, message: A, data: h });
            } catch (a) {
                return Promise.resolve({ success: !1, message: `Failed to describe property: ${a.message}` });
            }
        },
    },
    pl = [Tc, Mc, xc, ul, hl, Qc, Xc, $c, kc, Lc, Kc, Vc, Wc, Yc, Jc];
class ml {
    constructor(t, r = {}) {
        ((this.cachedSchema = null), (this.cachedFormattedSchema = null), (this.graph = t), (this.options = r));
    }
    extract() {
        if (this.cachedSchema === null) {
            const t = new Is(this.graph, this.options);
            this.cachedSchema = t.extract();
        }
        return this.cachedSchema;
    }
    getSchema() {
        return this.cachedSchema;
    }
    getFormattedSchema() {
        if (this.cachedFormattedSchema === null) {
            const t = this.extract();
            this.cachedFormattedSchema = ci(t);
        }
        return this.cachedFormattedSchema;
    }
    invalidateCache() {
        ((this.cachedSchema = null), (this.cachedFormattedSchema = null));
    }
}
const gl = 300;
class Fl {
    constructor() {
        ((this.graph = null),
            (this.controller = null),
            (this.provider = null),
            (this.schemaManager = null),
            (this.dataAddedListenerId = null),
            (this.debouncedSchemaUpdate = null),
            (this.disposed = !1),
            (this.initialized = !1),
            (this.commandRegistry = new Fi()),
            (this.apiKeyManager = new ti()),
            (this.statusManager = new ms()));
    }
    init(t, r) {
        this.initialized ||
            ((this.graph = t),
            (this.disposed = !1),
            r.keyPersistence?.enabled &&
                this.apiKeyManager.enablePersistence({
                    encryptionKey: r.keyPersistence.encryptionKey,
                    storage: r.keyPersistence.storage ?? "localStorage",
                    prefix: r.keyPersistence.prefix,
                }),
            r.providerInstance
                ? (this.provider = r.providerInstance)
                : ((this.provider = ei(r.provider)),
                  r.apiKey &&
                      (this.apiKeyManager.setKey(r.provider, r.apiKey),
                      this.provider.configure({ apiKey: r.apiKey, model: r.model }))),
            r.registerBuiltinCommands !== !1 && this.registerBuiltinCommands(),
            this.initializeSchemaManager(),
            (this.controller = new Si({
                provider: this.provider,
                commandRegistry: this.commandRegistry,
                graph: this.graph,
                schemaManager: this.schemaManager,
                emitEvent: (s) => {
                    t.eventManager.emit(s.type, { ...s });
                },
            })),
            (this.initialized = !0));
    }
    initializeSchemaManager() {
        if (this.graph) {
            ((this.schemaManager = new ml(this.graph)),
                this.schemaManager.extract(),
                (this.debouncedSchemaUpdate = oi(() => {
                    this.schemaManager && this.schemaManager.invalidateCache();
                }, gl)));
            try {
                const { eventManager: t } = this.graph;
                this.dataAddedListenerId = t.addListener("data-added", () => {
                    this.debouncedSchemaUpdate?.();
                });
            } catch {}
        }
    }
    registerBuiltinCommands() {
        for (const t of pl) this.registerCommand(t);
    }
    registerCommand(t) {
        this.commandRegistry.has(t.name) || this.commandRegistry.register(t);
    }
    getRegisteredCommands() {
        return this.commandRegistry.getNames();
    }
    async execute(t) {
        return this.disposed
            ? {
                  success: !1,
                  message: "AI Manager has been disposed. Please re-initialize before using.",
                  code: "AI_DISPOSED",
                  params: {},
              }
            : this.controller
              ? this.controller.execute(t)
              : {
                    success: !1,
                    message: "AI Manager not initialized. Call init() first.",
                    code: "AI_NOT_ENABLED",
                    params: {},
                };
    }
    setApiKey(t, r) {
        (this.apiKeyManager.setKey(t, r), this.provider?.name === t && this.provider.configure({ apiKey: r }));
    }
    getStatus() {
        return this.controller?.getStatus() ?? this.statusManager.getSnapshot();
    }
    onStatusChange(t) {
        return this.controller ? this.controller.onStatusChange(t) : this.statusManager.subscribe(t);
    }
    cancel() {
        this.controller?.cancel();
    }
    async retry() {
        if (this.disposed) throw new Error("AI Manager has been disposed.");
        if (!this.controller) throw new Error("AI not enabled. Call enableAiControl() first.");
        const t = this.controller.getLastInput();
        if (!t) throw new Error("No previous command to retry.");
        return this.controller.execute(t);
    }
    getCommandRegistry() {
        return this.commandRegistry;
    }
    getController() {
        return this.controller;
    }
    getProvider() {
        return this.provider;
    }
    getSchemaManager() {
        return this.schemaManager;
    }
    getApiKeyManager() {
        return this.apiKeyManager;
    }
    dispose() {
        if (!this.disposed) {
            if (
                ((this.disposed = !0),
                (this.initialized = !1),
                this.debouncedSchemaUpdate &&
                    (this.debouncedSchemaUpdate.cancel(), (this.debouncedSchemaUpdate = null)),
                this.dataAddedListenerId && this.graph)
            ) {
                try {
                    const { eventManager: t } = this.graph;
                    t.removeListener(this.dataAddedListenerId);
                } catch {}
                this.dataAddedListenerId = null;
            }
            ((this.schemaManager = null),
                this.controller && (this.controller.dispose(), (this.controller = null)),
                (this.provider = null),
                (this.graph = null),
                this.commandRegistry.clear(),
                this.statusManager.reset());
        }
    }
}
export { Fl as AiManager };
//# sourceMappingURL=AiManager-D3MPyJgf.js.map
