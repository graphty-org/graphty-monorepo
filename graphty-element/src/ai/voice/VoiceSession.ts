/**
 * Push-to-talk for one assistant: each press listens (cutting off any answer being spoken), sends
 * what was heard as the same `aiCommand` a typed message sends, or answers a pending approval or
 * question with it, and speaks the outcome. Reached only by `import()` when `voice` is set.
 * @module ai/voice/VoiceSession
 */

import { AI_VOICE_APPROVABLE_GATES, type AiProviderId, type AiResultCode, type AiResultParams } from "../../catalog/ai";
import type { NodeId } from "../../catalog/types";
import type { AiApprovalRequest, AiQuestionRequest } from "../../events";
import { type AiApprovalAnswer, type AiCommandOptions, type ExecutionResult, LIVE_MESSAGE } from "../AiController";
import type { AiVoiceOptions, AiVoicePath, AiVoiceSupport } from "../AiManager";
import type { AiEngine, LiveConnection, LiveOpened, LiveOptions } from "../engine/types";
import type { AiPointing } from "../tools/prompt";
import {
    chooseInput,
    chooseLive,
    chooseOutput,
    chooseVoice,
    type ProviderVoiceReadiness,
    type VoiceFacts,
} from "./choose";
import type { LiveSession } from "./LiveSession";
import { PointingRecord } from "./pointing";
import { type SpeechInput, type SpeechInputEnd, startSpeechInput } from "./SpeechInput";
import { createSpeechOutput, type SpeechOutput } from "./SpeechOutput";
import { readLiveTransport, readVoiceEnvironment, voiceLanguage } from "./support";

/** The voice events a session emits. */
export type VoiceEventType =
    | "ai-voice-start"
    | "ai-voice-transcript"
    | "ai-voice-end"
    | "ai-voice-level"
    | "ai-speech-start"
    | "ai-speech-end"
    | "ai-voice-support-change";

/** The longest a press listens by default, in seconds: a forgotten toggle does not record for ever. */
export const DEFAULT_MAX_PRESS_SECONDS = 60;

/** The level (0 to 1) a press on the provider route must reach to be sent, by default. */
export const DEFAULT_SPEECH_LEVEL = 0.04;

/** What a session needs of the assistant: the same calls a typed message and an answer use. */
export interface VoiceController {
    execute(input: string, options?: AiCommandOptions): Promise<ExecutionResult>;
    getPendingApprovals(): readonly AiApprovalRequest[];
    getPendingQuestions(): readonly AiQuestionRequest[];
    resolveAiApproval(id: string, answer: AiApprovalAnswer): Promise<ExecutionResult>;
    answerQuestion(id: string, answer: string): Promise<ExecutionResult>;
}

/** A provider's side of one direction of speech. */
export interface ProviderSpeech<K extends "transcribe" | "speak"> {
    readonly readiness: ProviderVoiceReadiness;
    readonly engine?: Pick<AiEngine, K>;
    readonly model?: string;
}

/** The chat provider's live conversations. */
export interface ProviderLiveSpeech {
    /** The chat provider. */
    readonly provider: AiProviderId;
    /** Whether it has a live API (`openLive`), and whether its key is set. */
    readonly readiness: ProviderVoiceReadiness;
    /** A `baseUrl` is configured: live reaches only the provider's own host. */
    readonly customBaseUrl: boolean;
    readonly engine?: Required<Pick<AiEngine, "openLive">>;
    /** The instructions and tools a connection opens with. */
    session(): Promise<Pick<LiveOptions, "instructions" | "tools">>;
    /** What `reader_context` reads: the facts now, with what the reader pointed at. */
    readerContext(pointing?: AiPointing): string;
    /**
     * Hear when an open connection no longer knows the conversation (another one opened, a typed
     * message ran); absent, never.
     * @returns Stops listening.
     */
    watch?(listener: () => void): () => void;
}

/** What the assistant gives a session. */
export interface VoiceHost {
    readonly options: AiVoiceOptions;
    readonly controller: VoiceController;
    emit(type: VoiceEventType, detail: Record<string, unknown>): void;
    /** Provider transcription: the chat provider's, or `voice.transcription`'s. */
    transcriber(): ProviderSpeech<"transcribe">;
    /** Provider speech: the chat provider's. */
    speaker(): ProviderSpeech<"speak">;
    /** Live conversations (`mode: "live"`): the chat provider's; absent, none. */
    liveEngine?(): ProviderLiveSpeech;
    /** Whether an immersive (XR) session runs. */
    immersive(): boolean;
    /** The selected nodes now; absent, none. */
    selected?(): readonly NodeId[];
    /**
     * Listen for the pointer entering a node, while talk is held.
     * @returns A function that stops listening.
     */
    onPointed?(listener: (id: NodeId) => void): () => void;
    /** A spoken message's outcome, before it is spoken. */
    answered?(result: ExecutionResult): void;
}

/**
 * An utterance as replies and choices are compared: case, punctuation and spacing ignored.
 * @param text - The utterance.
 * @returns Its comparable form.
 */
export function comparable(text: string): string {
    return text
        .toLowerCase()
        .replaceAll(/[\p{P}\p{S}]/gu, "")
        .replaceAll(/\s+/g, " ")
        .trim();
}

/** One assistant's push-to-talk. */
export class VoiceSession {
    private readonly language: string;
    /** Talk is held (or toggled on). */
    private listening = false;
    /** Counts presses, so a press that ended before it started does nothing. */
    private press = 0;
    /** Presses up to this number were cancelled: what they hear is never sent. */
    private cancelledThrough = 0;
    /** The press listening now. */
    private input: SpeechInput | undefined;
    /** Every press not yet ended: listening, or still being transcribed. */
    private readonly inputs = new Set<SpeechInput>();
    /** Releases a press that ran past `maxPressSeconds`. */
    private pressTimer: ReturnType<typeof setTimeout> | undefined;
    /** The support last reported, to tell when it changed. */
    private lastSupport: string | undefined;
    /** Stops recording what the pointer enters, while talk is held. */
    private stopPointing: (() => void) | undefined;
    private readonly speakers = new Map<"browser" | "provider", SpeechOutput>();
    /** The live conversation, loaded on the first live press. */
    private live: Promise<LiveSession> | undefined;
    private liveNow: LiveSession | undefined;
    /** The press held now is on the live connection. */
    private livePress = false;
    /** What the reader pointed at in the last live press. */
    private livePointing: PointingRecord | undefined;
    /** Stops hearing that the open connection no longer knows the conversation. */
    private stopWatchingLive: (() => void) | undefined;
    private disposed = false;

    /**
     * A session.
     * @param host - The assistant.
     */
    constructor(private readonly host: VoiceHost) {
        this.language = voiceLanguage(host.options);
    }

    /**
     * Press or release talk. With `push: "toggle"` each press starts or ends listening.
     * @param down - True to press, false to release.
     */
    talk(down: boolean): void {
        if (this.disposed) {
            return;
        }

        if (this.host.options.push === "toggle") {
            if (!down) {
                return;
            }

            down = !this.listening;
        }

        if (down && !this.listening) {
            this.listening = true;
            // Barge-in: talking cuts off the answer being spoken.
            this.stopSpeech();
            // What the reader points at while talking, from a fresh record each press.
            const pointing = new PointingRecord(this.host.selected?.() ?? []);
            this.stopPointing = this.host.onPointed?.((id) => {
                pointing.enter(id);
            });
            const press = ++this.press;
            const seconds = this.host.options.maxPressSeconds ?? DEFAULT_MAX_PRESS_SECONDS;
            if (Number.isFinite(seconds) && seconds > 0) {
                this.pressTimer = setTimeout(() => {
                    if (press === this.press) {
                        this.release();
                    }
                }, seconds * 1000);
            }

            void this.listen(press, pointing);
        } else if (!down && this.listening) {
            this.release();
        }
    }

    /** Talk released (or held too long): the press finishes with what was heard. */
    private release(): void {
        if (!this.listening) {
            return;
        }

        this.listening = false;
        this.clearPressTimer();
        this.endPointing();
        if (this.livePress) {
            this.liveNow?.release();
            this.endLive("AI_COMPLETED", {});
        } else {
            this.input?.stop();
        }
    }

    /** Stop the press's time limit. */
    private clearPressTimer(): void {
        clearTimeout(this.pressTimer);
        this.pressTimer = undefined;
    }

    /** Stop speaking an answer: it ends with `AI_CANCELLED`. A live answer is interrupted. */
    stopSpeech(): void {
        this.liveNow?.interrupt();
        for (const speaker of this.speakers.values()) {
            speaker.cancel();
        }
    }

    /**
     * How speech would be carried in each direction now.
     * @returns Both directions.
     */
    async support(): Promise<AiVoiceSupport> {
        const facts = await this.facts();
        const support = { ...chooseVoice(this.host.options, facts), live: this.livePath(facts) };
        this.lastSupport = JSON.stringify(support);
        return support;
    }

    /**
     * Read the support again and, when it differs from what was last reported, emit
     * `ai-voice-support-change`: a press changed the permission or the recognition memory, a key
     * was set, an immersive session began or ended.
     */
    async checkSupport(): Promise<void> {
        if (this.disposed) {
            return;
        }

        const before = this.lastSupport;
        const support = await this.support();
        if (!this.disposed && before !== undefined && this.lastSupport !== before) {
            this.host.emit("ai-voice-support-change", { support });
        }
    }

    /**
     * End a held talk without sending it: the press ends with `AI_CANCELLED`, the microphone
     * closes, and so does a live connection. Leaving XR does this.
     */
    cancel(): void {
        // A press still choosing its path ends there, and an earlier one still being transcribed
        // sends nothing.
        this.cancelledThrough = ++this.press;
        this.listening = false;
        this.clearPressTimer();
        this.endPointing();
        this.input = undefined;
        for (const input of [...this.inputs]) {
            input.cancel();
        }

        this.liveNow?.close();
    }

    /**
     * End the live conversation: the connection closes (a held press ends with `AI_CANCELLED`),
     * and the next live press opens another with the conversation as saved.
     */
    endLiveConversation(): void {
        this.liveNow?.close();
    }

    /** Close the microphone and stop speaking; later presses do nothing. */
    dispose(): void {
        this.disposed = true;
        this.listening = false;
        this.clearPressTimer();
        this.endPointing();
        for (const input of this.inputs) {
            input.dispose();
        }

        this.inputs.clear();
        this.input = undefined;
        this.stopSpeech();
        this.stopWatchingLive?.();
        this.liveNow?.close();
    }

    /** Stop recording what the pointer enters. */
    private endPointing(): void {
        this.stopPointing?.();
        this.stopPointing = undefined;
    }

    /**
     * What the rules read, now.
     * @returns The facts.
     */
    private async facts(): Promise<VoiceFacts> {
        return {
            ...(await readVoiceEnvironment(this.language)),
            transcription: this.host.transcriber().readiness,
            speech: this.host.speaker().readiness,
            immersive: this.host.immersive(),
        };
    }

    /**
     * A live conversation now: the chat provider's live API and what the page offers it.
     * @param facts - What the page offers for speech.
     * @returns The live path.
     */
    private livePath(facts: VoiceFacts): AiVoicePath {
        const live = this.host.liveEngine?.();
        return chooseLive(this.host.options.output ?? "auto", {
            secureContext: facts.secureContext,
            microphone: facts.microphone,
            permission: facts.permission,
            provider: live?.provider ?? "mock",
            live: live?.readiness ?? "unsupported",
            customBaseUrl: live?.customBaseUrl ?? false,
            ...readLiveTransport(),
        });
    }

    /**
     * One press: live when asked for and it can run with nothing pending, else turn by turn.
     * @param press - The press's number.
     * @param pointing - What the reader points at during it.
     */
    private async listen(press: number, pointing: PointingRecord): Promise<void> {
        const facts = await this.facts();
        if (this.disposed || press !== this.press) {
            return;
        }

        const { mode } = this.host.options;
        let start: Record<string, unknown> = mode === undefined ? {} : { mode: "turns" };
        if (mode === "live") {
            const { controller } = this.host;
            const live = this.livePath(facts);
            if (controller.getPendingApprovals().length > 0 || controller.getPendingQuestions().length > 0) {
                // A pending approval or question is answered turn by turn: the connection hands off.
                this.liveNow?.close();
            } else if (live.path === "provider" && this.liveNow?.busy() === true) {
                // A spoken message still runs its tools: what the provider answered this press
                // could not be told from that message's responses, so it is sent after it.
                start = {
                    mode: "turns",
                    code: "AI_VOICE_UNAVAILABLE",
                    params: { path: "input", reason: "live-busy" },
                };
            } else if (live.path === "provider") {
                await this.listenLive(press, pointing, facts);
                return;
            } else {
                start = { mode: "turns", code: live.code, params: live.params ?? {} };
            }
        }

        this.listenTurns(press, pointing, facts, start);
    }

    /**
     * A live press: open the connection (or reuse it) and send the microphone while talk is held.
     * When it cannot open, the press runs turn by turn and `ai-voice-start` says why.
     * @param press - The press's number.
     * @param pointing - What the reader points at during it.
     * @param facts - What the page offers for speech.
     */
    private async listenLive(press: number, pointing: PointingRecord, facts: VoiceFacts): Promise<void> {
        const live = await this.liveSession();
        if (this.disposed || press !== this.press) {
            return;
        }

        const opened = await live.connect();
        if (this.disposed || press !== this.press) {
            return;
        }

        if (opened.code !== "AI_COMPLETED") {
            this.listenTurns(press, pointing, facts, { mode: "turns", code: opened.code, params: opened.params });
            return;
        }

        this.livePress = true;
        this.livePointing = pointing;
        this.host.emit("ai-voice-start", { mode: "live" });
        if (this.listening) {
            live.hold();
        } else {
            // Released before the connection opened: nothing was sent.
            this.endLive("AI_CANCELLED", {});
        }
    }

    /**
     * The live press ended: released, or the connection closed under it.
     * @param code - `AI_COMPLETED` on release, else why.
     * @param params - The facts behind `code`.
     */
    private endLive(code: AiResultCode, params: AiResultParams): void {
        if (!this.livePress) {
            return;
        }

        this.livePress = false;
        this.listening = false;
        this.clearPressTimer();
        this.endPointing();
        const failed = code !== "AI_COMPLETED" && code !== "AI_CANCELLED";
        this.host.emit("ai-voice-end", { reason: failed ? "error" : "user", code, params });
        void this.checkSupport();
    }

    /**
     * The live conversation, loaded on first use.
     * @returns It.
     */
    private liveSession(): Promise<LiveSession> {
        this.live ??= Promise.all([import("./LiveSession"), import("./liveTurns")]).then(
            ([{ LiveSession: Live }, turns]) => {
                const seconds = this.host.options.liveIdleSeconds;
                const live = new Live({
                    open: (signal) => this.openLive(signal),
                    emit: (type, detail) => {
                        this.host.emit(type, detail);
                    },
                    ended: (code, params) => {
                        this.endLive(code, params);
                    },
                    attach: (connection, touch) => this.liveMessages(connection, turns.LiveTurnEngine, touch),
                    ...(seconds !== undefined && seconds >= 0 ? { idleMs: seconds * 1000 } : {}),
                });
                this.liveNow = live;
                // A connection that no longer knows the conversation closes; the next press opens one that does.
                this.stopWatchingLive = this.host.liveEngine?.().watch?.(() => {
                    live.close();
                });
                return live;
            },
        );
        return this.live;
    }

    /**
     * Run what is said on a connection as messages, through the assistant's own loop.
     * @param connection - The connection.
     * @param Engine - The live engine's class.
     * @param touch - Starts the connection's idle time over.
     * @returns The engine.
     */
    private liveMessages(
        connection: LiveConnection,
        Engine: typeof import("./liveTurns").LiveTurnEngine,
        touch: () => void,
    ): InstanceType<typeof import("./liveTurns").LiveTurnEngine> {
        const live = this.host.liveEngine?.();
        const engine: InstanceType<typeof Engine> = new Engine(connection, live?.provider ?? "mock", {
            run: (text, pointing, words) =>
                this.host.controller.execute(text, {
                    via: "voice",
                    ...(pointing === undefined ? {} : { pointing }),
                    [LIVE_MESSAGE]: { engine, heard: words.heard, saved: words.saved },
                } as AiCommandOptions),
            pointing: () => this.livePointing?.facts(),
            readerContext: (pointing) => live?.readerContext(pointing) ?? "",
            close: () => {
                this.liveNow?.close();
            },
            answered: (result) => {
                this.host.answered?.(result);
            },
            settled: touch,
        });
        return engine;
    }

    /**
     * Open a connection with the chat provider.
     * @param signal - Cancels the opening.
     * @returns The connection, or the code it failed with.
     */
    private async openLive(signal: AbortSignal): Promise<LiveOpened> {
        const live = this.host.liveEngine?.();
        if (live?.engine === undefined) {
            return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "no-provider-live" } };
        }

        const { liveModel, voiceName } = this.host.options;
        return live.engine.openLive(
            {
                ...(liveModel === undefined ? {} : { model: liveModel }),
                ...(voiceName === undefined ? {} : { voice: voiceName }),
                language: this.language,
                ...(await live.session()),
            },
            signal,
        );
    }

    /**
     * A press turn by turn: listen until released, then route what was heard.
     * @param press - The press's number.
     * @param pointing - What the reader points at during it.
     * @param facts - What the page offers for speech.
     * @param start - What `ai-voice-start` reports.
     */
    private listenTurns(
        press: number,
        pointing: PointingRecord,
        facts: VoiceFacts,
        start: Record<string, unknown>,
    ): void {
        const path = chooseInput(this.host.options.input ?? "auto", facts);
        if (path.path !== "browser" && path.path !== "provider") {
            this.listening = false;
            this.clearPressTimer();
            this.endPointing();
            this.host.emit("ai-voice-end", { reason: "error", code: path.code, params: path.params ?? {} });
            return;
        }

        const transcriber = this.host.transcriber();
        this.host.emit("ai-voice-start", start);
        const input = startSpeechInput(
            path.path,
            {
                language: this.language,
                processLocally: facts.onDevice === "process-locally",
                engine: transcriber.engine,
                model: transcriber.model,
                speechLevel: this.host.options.speechLevel ?? DEFAULT_SPEECH_LEVEL,
            },
            {
                onTranscript: (transcript, isFinal) => {
                    this.host.emit("ai-voice-transcript", { transcript, isFinal });
                },
                onLevel: (level) => {
                    this.host.emit("ai-voice-level", { level });
                },
                onEnd: (end) => {
                    this.inputs.delete(input);
                    void this.heard(press, end, pointing);
                },
            },
        );
        this.inputs.add(input);
        this.input = input;
        // Released while the path was being chosen.
        if (!this.listening) {
            input.stop();
        }
    }

    /**
     * A press ended: report it, then send or answer with what was heard and speak the outcome.
     * @param press - The press's number.
     * @param end - How it ended.
     * @param pointing - What the reader pointed at during it.
     */
    private async heard(press: number, end: SpeechInputEnd, pointing: PointingRecord): Promise<void> {
        if (press === this.press) {
            this.listening = false;
            this.input = undefined;
            this.clearPressTimer();
            this.endPointing();
        }

        // A press cancelled while it was still being transcribed sends nothing.
        const cancelled = press <= this.cancelledThrough;
        const code = cancelled && end.code === "AI_COMPLETED" ? "AI_CANCELLED" : end.code;
        const failed = code !== "AI_COMPLETED" && code !== "AI_CANCELLED";
        this.host.emit("ai-voice-end", { reason: failed ? "error" : "user", code, params: end.params });
        // The press may have asked for the microphone or learned whether recognition works.
        void this.checkSupport();
        if (code !== "AI_COMPLETED" || end.text === "" || this.disposed) {
            return;
        }

        const result = await this.route(end.text, pointing);
        this.host.answered?.(result);
        if (!this.disposed) {
            await this.speak(result);
        }
    }

    /**
     * An utterance answers the pending approval or question it matches; anything else is a new
     * message, which ends what is pending, as a typed one does.
     * @param text - What was heard.
     * @param pointing - What the reader pointed at while saying it.
     * @returns The outcome.
     */
    private route(text: string, pointing: PointingRecord): Promise<ExecutionResult> {
        const said = comparable(text);
        const { controller, options } = this.host;
        const approval = controller.getPendingApprovals().at(-1);
        if (approval !== undefined) {
            const matches = (words: readonly string[]): boolean => words.some((word) => comparable(word) === said);
            if (matches(options.replies?.approve ?? ["yes"])) {
                // A hold the reader must look at is approved on screen; it stays pending.
                if (!(options.replies?.gates ?? AI_VOICE_APPROVABLE_GATES).includes(approval.gate)) {
                    return Promise.resolve({
                        success: false,
                        message: "",
                        code: "AI_CONFIRMATION_NEEDED",
                        params: { gate: approval.gate, request: approval.id },
                    });
                }

                return controller.resolveAiApproval(approval.id, { approve: true });
            }

            if (matches(options.replies?.deny ?? ["no"])) {
                return controller.resolveAiApproval(approval.id, { approve: false });
            }
        }

        const question = controller.getPendingQuestions().at(-1);
        const choice = question?.choices.find((value) => comparable(value) === said);
        if (question !== undefined && choice !== undefined) {
            return controller.answerQuestion(question.id, choice);
        }

        return controller.execute(text, { via: "voice", pointing: pointing.facts() });
    }

    /**
     * Speak an outcome: the model's own text, else the host's words for its code, else nothing.
     * @param result - The outcome.
     */
    private async speak(result: ExecutionResult): Promise<void> {
        const fact: { code: AiResultCode; params: AiResultParams } = {
            code: result.code ?? "AI_COMPLETED",
            params: result.params ?? {},
        };
        const text = result.llmText?.trim() || this.host.options.say?.(fact)?.trim();
        if (!text) {
            return;
        }

        const path = chooseOutput(this.host.options.output ?? "auto", await this.facts());
        if (path.path !== "browser" && path.path !== "provider") {
            if (path.code !== undefined) {
                this.host.emit("ai-speech-end", { code: path.code, params: path.params ?? {} });
            }

            return;
        }

        const end = await this.speaker(path.path).speak(text, () => {
            this.host.emit("ai-speech-start", {});
        });
        this.host.emit("ai-speech-end", { code: end.code, params: end.params });
    }

    /**
     * The speaker for a route, made on first use.
     * @param route - Browser synthesis or provider speech.
     * @returns The speaker.
     */
    private speaker(route: "browser" | "provider"): SpeechOutput {
        let speaker = this.speakers.get(route);
        if (speaker === undefined) {
            speaker = createSpeechOutput(route, {
                language: this.language,
                engine: this.host.speaker().engine,
                voiceName: this.host.options.voiceName,
            });
            this.speakers.set(route, speaker);
        }

        return speaker;
    }
}
