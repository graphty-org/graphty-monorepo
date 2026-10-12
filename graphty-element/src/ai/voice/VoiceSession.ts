/**
 * Push-to-talk for one assistant: each press listens (cutting off any answer being spoken), sends
 * what was heard as the same `aiCommand` a typed message sends, or answers a pending approval or
 * question with it, and speaks the outcome. Reached only by `import()` when `voice` is set.
 * @module ai/voice/VoiceSession
 */

import type { AiResultCode, AiResultParams } from "../../catalog/ai";
import type { AiApprovalRequest, AiQuestionRequest } from "../../events";
import type { AiApprovalAnswer, AiCommandOptions, ExecutionResult } from "../AiController";
import type { AiVoiceOptions, AiVoiceSupport } from "../AiManager";
import type { AiEngine } from "../engine/types";
import { chooseInput, chooseOutput, chooseVoice, type ProviderVoiceReadiness, type VoiceFacts } from "./choose";
import { type SpeechInput, type SpeechInputEnd, startSpeechInput } from "./SpeechInput";
import { createSpeechOutput, type SpeechOutput } from "./SpeechOutput";
import { readVoiceEnvironment, voiceLanguage } from "./support";

/** The voice events a session emits. */
export type VoiceEventType =
    "ai-voice-start" | "ai-voice-transcript" | "ai-voice-end" | "ai-voice-level" | "ai-speech-start" | "ai-speech-end";

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

/** What the assistant gives a session. */
export interface VoiceHost {
    readonly options: AiVoiceOptions;
    readonly controller: VoiceController;
    emit(type: VoiceEventType, detail: Record<string, unknown>): void;
    /** Provider transcription: the chat provider's, or `voice.transcription`'s. */
    transcriber(): ProviderSpeech<"transcribe">;
    /** Provider speech: the chat provider's. */
    speaker(): ProviderSpeech<"speak">;
    /** Whether an immersive (XR) session runs. */
    immersive(): boolean;
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
    private input: SpeechInput | undefined;
    private readonly speakers = new Map<"browser" | "provider", SpeechOutput>();
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
            void this.listen(++this.press);
        } else if (!down && this.listening) {
            this.listening = false;
            this.input?.stop();
        }
    }

    /** Stop speaking an answer: it ends with `AI_CANCELLED`. */
    stopSpeech(): void {
        for (const speaker of this.speakers.values()) {
            speaker.cancel();
        }
    }

    /**
     * How speech would be carried in each direction now.
     * @returns Both directions.
     */
    async support(): Promise<AiVoiceSupport> {
        return chooseVoice(this.host.options, await this.facts());
    }

    /** Close the microphone and stop speaking; later presses do nothing. */
    dispose(): void {
        this.disposed = true;
        this.listening = false;
        this.input?.dispose();
        this.input = undefined;
        this.stopSpeech();
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
     * One press: choose the path, listen until released, then route what was heard.
     * @param press - The press's number.
     */
    private async listen(press: number): Promise<void> {
        const facts = await this.facts();
        if (this.disposed || press !== this.press) {
            return;
        }

        const path = chooseInput(this.host.options.input ?? "auto", facts);
        if (path.path !== "browser" && path.path !== "provider") {
            this.listening = false;
            this.host.emit("ai-voice-end", { reason: "error", code: path.code, params: path.params ?? {} });
            return;
        }

        const transcriber = this.host.transcriber();
        this.host.emit("ai-voice-start", {});
        this.input = startSpeechInput(
            path.path,
            {
                language: this.language,
                processLocally: facts.onDevice === "process-locally",
                engine: transcriber.engine,
                model: transcriber.model,
            },
            {
                onTranscript: (transcript, isFinal) => {
                    this.host.emit("ai-voice-transcript", { transcript, isFinal });
                },
                onLevel: (level) => {
                    this.host.emit("ai-voice-level", { level });
                },
                onEnd: (end) => {
                    void this.heard(press, end);
                },
            },
        );
        // Released while the path was being chosen.
        if (!this.listening) {
            this.input.stop();
        }
    }

    /**
     * A press ended: report it, then send or answer with what was heard and speak the outcome.
     * @param press - The press's number.
     * @param end - How it ended.
     */
    private async heard(press: number, end: SpeechInputEnd): Promise<void> {
        if (press === this.press) {
            this.listening = false;
            this.input = undefined;
        }

        const failed = end.code !== "AI_COMPLETED" && end.code !== "AI_CANCELLED";
        this.host.emit("ai-voice-end", { reason: failed ? "error" : "user", code: end.code, params: end.params });
        if (end.code !== "AI_COMPLETED" || end.text === "") {
            return;
        }

        const result = await this.route(end.text);
        if (!this.disposed) {
            await this.speak(result);
        }
    }

    /**
     * An utterance answers the pending approval or question it matches; anything else is a new
     * message, which ends what is pending, as a typed one does.
     * @param text - What was heard.
     * @returns The outcome.
     */
    private route(text: string): Promise<ExecutionResult> {
        const said = comparable(text);
        const { controller, options } = this.host;
        const approval = controller.getPendingApprovals().at(-1);
        if (approval !== undefined) {
            const matches = (words: readonly string[]): boolean => words.some((word) => comparable(word) === said);
            if (matches(options.replies?.approve ?? ["yes"])) {
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

        return controller.execute(text, { via: "voice" });
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
