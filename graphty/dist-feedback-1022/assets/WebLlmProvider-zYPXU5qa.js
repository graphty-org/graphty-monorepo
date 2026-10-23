import { _ as w } from "./preload-helper-BXl3LOEh.js";
import { a as y, b as _ } from "./index-BceQi37_.js";
import { E as k } from "./index-hDuyXkBS.js";
const f = "@mlc-ai/web-llm";
async function P() {
    try {
        await w(() => import("./index-CkOA-Tys.js"), []);
    } catch (a) {
        throw new k({
            code: "E_MISSING_PACKAGE",
            message: `The in-browser AI provider needs the optional package ${f}.`,
            source: "config",
            details: { package: f, feature: "webllm" },
            cause: a,
        });
    }
}
const b = _("webllm"),
    g = b.defaultModel,
    T = {
        "Llama-3.2-1B-Instruct-q4f32_1-MLC": "Fast, lightweight model suitable for quick responses",
        "Llama-3.2-3B-Instruct-q4f32_1-MLC": "Better quality responses with reasonable performance",
        "Phi-3.5-mini-instruct-q4f16_1-MLC": "Good balance of quality and performance",
        "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Efficient model with good multilingual support",
        "SmolLM2-360M-Instruct-q4f16_1-MLC": "Very small and fast, basic capabilities",
        "Hermes-3-Llama-3.1-8B-q4f16_1-MLC": "Can call the assistant's tools; large download",
        "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC": "Can call the assistant's tools; large download",
    },
    p = b.models.map((a) => {
        const e = a.downloadMB ?? 0;
        return {
            id: a.id,
            name: a.plainName,
            size: e >= 1e3 ? `~${e / 1e3}GB` : `~${e}MB`,
            description: T[a.id],
            supportsTools: a.supportsTools,
            downloadMB: e,
        };
    });
class M {
    constructor(e = {}) {
        ((this.name = "webllm"),
            (this.supportsStreaming = !0),
            (this.supportsTools = !0),
            (this.supportsSystemPromptWithTools = !1),
            (this.progressCallbacks = new Set()),
            (this.initialized = !1),
            (this.ready = !1),
            (this.mockMode = !1),
            (this.engine = null),
            (this.initializeOnFirstUse = e.initializeOnFirstUse ?? !1));
    }
    static async isWebGPUAvailable() {
        if (typeof navigator > "u") return !1;
        try {
            if (!("gpu" in navigator)) return !1;
            const { gpu: e } = navigator;
            return e ? !!(await e.requestAdapter()) : !1;
        } catch {
            return !1;
        }
    }
    static getAvailableModels() {
        return Array.from(p);
    }
    get modelSupportsTools() {
        const e = this.model ?? g;
        return this.toolCapableModelIds
            ? this.toolCapableModelIds.includes(e)
            : (p.find((t) => t.id === e)?.supportsTools ?? !1);
    }
    configure(e) {
        (e.model && (this.model = e.model),
            e.maxTokens !== void 0 && (this.maxTokens = e.maxTokens),
            e.temperature !== void 0 && (this.temperature = e.temperature));
    }
    get isInitialized() {
        return this.initialized;
    }
    get isReady() {
        return this.ready;
    }
    get isMockMode() {
        return this.mockMode;
    }
    enableMockMode() {
        ((this.mockMode = !0), (this.initialized = !0), (this.ready = !0));
    }
    disableMockMode() {
        ((this.mockMode = !1), (this.initialized = !1), (this.ready = !1), (this.engine = null));
    }
    onProgress(e) {
        this.progressCallbacks.add(e);
    }
    offProgress(e) {
        this.progressCallbacks.delete(e);
    }
    simulateProgress(e, t) {
        this.emitProgress(e, t);
    }
    emitProgress(e, t) {
        for (const o of this.progressCallbacks) o(e, t);
    }
    async initialize() {
        if (this.mockMode) {
            ((this.initialized = !0), (this.ready = !0));
            return;
        }
        if (!(await M.isWebGPUAvailable()))
            throw new Error(
                "WebGPU is not supported in this browser. Please use Chrome 113+ or another WebGPU-enabled browser.",
            );
        try {
            this.emitProgress(0, "Loading WebLLM module...");
            let t;
            try {
                t = await w(() => import("./index-CkOA-Tys.js"), []);
            } catch {
                throw new Error(
                    "Failed to load @mlc-ai/web-llm. This is an optional dependency for in-browser AI. To use WebLLM, install it with: npm install @mlc-ai/web-llm",
                );
            }
            (this.emitProgress(0.1, "Creating engine..."), (this.toolCapableModelIds = t.functionCallingModelIds));
            const o = this.model ?? g;
            ((this.engine = await t.CreateMLCEngine(o, {
                initProgressCallback: (s) => {
                    const i = 0.1 + s.progress * 0.9;
                    this.emitProgress(i, s.text);
                },
            })),
                (this.initialized = !0),
                (this.ready = !0),
                this.emitProgress(1, "Model loaded successfully"));
        } catch (t) {
            throw ((this.initialized = !1), (this.ready = !1), t);
        }
    }
    async ensureInitialized() {
        if (!(this.initialized && this.engine)) {
            if (!this.initializeOnFirstUse) throw new Error("WebLLM not initialized. Call initialize() first.");
            ((this.initializing ??= this.initialize().finally(() => {
                this.initializing = void 0;
            })),
                await this.initializing);
        }
    }
    async generate(e, t, o) {
        if (o?.signal?.aborted) throw new Error("Request was aborted");
        if (this.mockMode) return this.generateMock(e, t);
        await this.ensureInitialized();
        try {
            const s = this.engine,
                i = this.shouldSendTools(t, o?.toolChoice);
            let r = await s.chat.completions.create(this.buildRequest(e, i ? t : [], !1));
            if (i && !r.choices?.[0]?.message?.tool_calls?.length) {
                if (o?.signal?.aborted) throw new Error("Request was aborted");
                r = await s.chat.completions.create(this.buildRequest(e, [], !1));
            }
            if (o?.signal?.aborted) throw new Error("Request was aborted");
            return this.convertResponse(r);
        } catch (s) {
            throw String(s).includes("aborted") ? new Error("Request was aborted") : s;
        }
    }
    async generateStream(e, t, o, s) {
        if (s?.aborted) throw new Error("Request was aborted");
        if (this.mockMode) {
            await this.generateStreamMock(e, t, o, s);
            return;
        }
        await this.ensureInitialized();
        try {
            const i = this.engine,
                r = this.shouldSendTools(t),
                l = await i.chat.completions.create(this.buildRequest(e, r ? t : [], !0));
            let n = "";
            const h = [];
            for await (const C of l) {
                if (s?.aborted) throw new Error("Request was aborted");
                const u = C.choices?.[0]?.delta;
                if (!u) continue;
                u.content && ((n += u.content), o.onChunk(u.content));
                const m = u.tool_calls;
                if (m) {
                    for (const c of m)
                        if (c.function?.name) {
                            const d = {
                                id: c.id ?? `call_${Date.now()}`,
                                name: c.function.name,
                                arguments:
                                    typeof c.function.arguments == "string"
                                        ? JSON.parse(c.function.arguments)
                                        : (c.function.arguments ?? {}),
                            };
                            (h.push(d), o.onToolCall(d.name, d.arguments));
                        }
                }
            }
            o.onComplete({ text: n, toolCalls: h });
        } catch (i) {
            const r = i instanceof Error ? i : new Error(String(i));
            throw (o.onError(r), i);
        }
    }
    validateApiKey() {
        return Promise.resolve(!0);
    }
    async dispose() {
        if (this.engine)
            try {
                const e = this.engine;
                typeof e.unload == "function" && (await e.unload());
            } catch {}
        ((this.engine = null), (this.initialized = !1), (this.ready = !1), (this.mockMode = !1));
    }
    shouldSendTools(e, t) {
        return e.length > 0 && t !== "none" && this.modelSupportsTools;
    }
    buildRequest(e, t, o) {
        const s = {
            messages: this.convertMessages(e),
            temperature: this.temperature ?? 0.7,
            max_tokens: this.maxTokens ?? 1024,
        };
        return (o && (s.stream = !0), t.length > 0 && ((s.tools = this.convertTools(t)), (s.tool_choice = "auto")), s);
    }
    convertMessages(e) {
        return e.map((t) =>
            t.role === "tool"
                ? { role: "tool", tool_call_id: t.toolCallId ?? "", content: t.content }
                : t.role === "assistant" && t.toolCalls?.length
                  ? {
                        role: "assistant",
                        content: JSON.stringify(t.toolCalls.map((o) => ({ name: o.name, arguments: o.arguments }))),
                        tool_calls: t.toolCalls.map((o) => ({
                            id: o.id,
                            type: "function",
                            function: { name: o.name, arguments: JSON.stringify(o.arguments) },
                        })),
                    }
                  : { role: t.role, content: t.content },
        );
    }
    convertTools(e) {
        return e.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: y(t.parameters).jsonSchema },
        }));
    }
    convertResponse(e) {
        const o = e.choices?.[0]?.message ?? {},
            s = [],
            i = o.tool_calls;
        if (i)
            for (const n of i)
                s.push({
                    id: n.id ?? `call_${Date.now()}`,
                    name: n.function?.name ?? "",
                    arguments:
                        typeof n.function?.arguments == "string"
                            ? JSON.parse(n.function.arguments)
                            : (n.function?.arguments ?? {}),
                });
        const r = e.usage?.prompt_tokens,
            l = e.usage?.completion_tokens;
        return {
            text: o.content ?? "",
            toolCalls: s,
            usage: e.usage ? { promptTokens: r ?? 0, completionTokens: l ?? 0 } : void 0,
        };
    }
    generateMock(e, t) {
        const i =
            Array.from(e)
                .reverse()
                .find((n) => n.role === "user")?.content ?? "";
        let r = `I understand you said: "${i.slice(0, 50)}${i.length > 50 ? "..." : ""}"`;
        const l = [];
        return (
            t.length > 0 && i.toLowerCase().includes("help") && (r = "Here are the available commands:"),
            { text: r, toolCalls: l }
        );
    }
    async generateStreamMock(e, t, o, s) {
        const i = this.generateMock(e, t);
        for (const r of i.text) {
            if (s?.aborted) throw new Error("Request was aborted");
            (o.onChunk(r), await new Promise((l) => setTimeout(l, 5)));
        }
        for (const r of i.toolCalls) o.onToolCall(r.name, r.arguments);
        o.onComplete(i);
    }
}
export { M as WebLlmProvider, P as requireWebLlmPackage };
//# sourceMappingURL=WebLlmProvider-zYPXU5qa.js.map
