/**
 * Voice on the provider, for real: a committed clip transcribed by the chat model, and a sentence
 * spoken by the provider's speech model, through the provider-API engine (paid; Google by default).
 * @module test/ai/llm-regression/voice
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { AiEngine, TurnEvent } from "../../../src/ai/engine/types";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { VoiceSession } from "../../../src/ai/voice/VoiceSession";
import type { AiEvent } from "../../../src/events";
import { assistantSession, SMALL_GRAPH } from "../../helpers/assistant";
import { FakeRecorder, installFakeSpeech } from "../../helpers/fake-speech";
import {
    getLlmRegressionApiKey,
    getLlmRegressionModel,
    getLlmRegressionProvider,
    skipIfNoApiKey,
} from "../../helpers/llm-regression-env";
import { redNodes } from "./red";

const FIXTURE = new URL("fixtures/voice/make-all-the-nodes-red.json", import.meta.url);
const { clip, expectedWords } = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
    clip: string;
    expectedWords: string[];
};

/** Counts each request, as the harness does, so the run reports what it cost. */
function counted(): void {
    const counter = globalThis as { __LLM_REGRESSION_API_CALLS__?: number };
    counter.__LLM_REGRESSION_API_CALLS__ = (counter.__LLM_REGRESSION_API_CALLS__ ?? 0) + 1;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * The committed clip, as a recorder hands it over.
 * @returns The clip.
 */
function committedClip(): Blob {
    return new Blob([readFileSync(new URL(`fixtures/voice/${clip}`, import.meta.url))], { type: "audio/wav" });
}

/**
 * The provider-API engine on the regression provider and model.
 * @returns The engine.
 */
function engine(): ProviderApiEngine {
    return new ProviderApiEngine(() => ({
        provider: getLlmRegressionProvider(),
        apiKey: getLlmRegressionApiKey(),
        model: getLlmRegressionModel(),
    }));
}

describe.skipIf(skipIfNoApiKey())("voice through the provider", () => {
    const voice = engine();

    it.skipIf(!("transcribe" in voice))(
        "transcribes the committed clip into text holding every expected word",
        async () => {
            const audio = committedClip();
            counted();
            const heard = await voice.transcribe?.(audio, { language: "en-US" }, new AbortController().signal);
            assert.strictEqual(heard?.code, "AI_COMPLETED", JSON.stringify(heard));
            const words = (heard?.code === "AI_COMPLETED" ? heard.text : "").toLowerCase().match(/[a-z]+/g) ?? [];
            for (const word of expectedWords) {
                assert.include(words, word, `"${word}" is in the transcript`);
            }
        },
    );

    it.skipIf(!("speak" in voice))("speaks a fixed sentence as a WAV file with a non-empty data chunk", async () => {
        counted();
        const said = await voice.speak?.("Two hubs hold the network together.", {}, new AbortController().signal);
        assert.strictEqual(said?.code, "AI_COMPLETED", JSON.stringify(said));
        const audio = said?.code === "AI_COMPLETED" ? said.audio : new Blob();
        const bytes = new Uint8Array(await audio.arrayBuffer());
        const view = new DataView(bytes.buffer);
        const ascii = (at: number): string => String.fromCharCode(...bytes.subarray(at, at + 4));
        if (getLlmRegressionProvider() === "google") {
            assert.strictEqual(audio.type, "audio/wav");
            assert.strictEqual(ascii(0), "RIFF");
            assert.strictEqual(ascii(8), "WAVE");
            // The chunks after the header, to the data chunk.
            let at = 12;
            while (at + 8 <= bytes.length && ascii(at) !== "data") {
                at += 8 + view.getUint32(at + 4, true);
            }

            assert.strictEqual(ascii(at), "data", "the file has a data chunk");
            assert.isAbove(view.getUint32(at + 4, true), 0, "the data chunk holds samples");
        } else {
            assert.isAbove(bytes.length, 0);
        }
    });
});

describe.skipIf(skipIfNoApiKey())("a spoken command on a real model", () => {
    it.skipIf(!("transcribe" in engine()))(
        "the committed clip, recorded while talk is held, colors every node of the small graph red",
        async () => {
            // The page: a microphone whose recorder hands over the committed clip, no recognizer.
            installFakeSpeech({ recognition: "absent", language: "en-US" });
            const recording: FakeRecorder[] = [];
            vi.stubGlobal(
                "MediaRecorder",
                class extends FakeRecorder {
                    override mimeType = "audio/wav";
                    override start(): void {
                        super.start();
                        recording.push(this);
                    }

                    override stop(): void {
                        this.state = "inactive";
                        queueMicrotask(() => {
                            this.ondataavailable?.({ data: committedClip() });
                            this.onstop?.();
                        });
                    }
                },
            );

            const session = await assistantSession();
            const real = engine();
            // Counts each request, as the harness does.
            const counting: AiEngine = Object.assign(Object.create(real) as AiEngine, {
                turn: (request: Parameters<AiEngine["turn"]>[0], signal: AbortSignal): AsyncIterable<TurnEvent> => {
                    counted();
                    return real.turn(request, signal);
                },
                transcribe: (...args: Parameters<NonNullable<AiEngine["transcribe"]>>) => {
                    counted();
                    return real.transcribe!(...args);
                },
            });
            const registry = new CommandRegistry();
            installAssistantTools(registry, session);
            let finished: (event: AiEvent) => void = () => undefined;
            const done = new Promise<AiEvent>((resolve) => {
                finished = resolve;
            });
            const controller = new AiController({
                provider: { name: getLlmRegressionProvider() } as never,
                commandRegistry: registry,
                graph: { getSession: () => session } as unknown as CommandContext["graph"],
                model: getLlmRegressionModel(),
                history: "memory",
                emitEvent: (event: AiEvent) => {
                    if (event.type === "ai-command-complete" || event.type === "ai-command-error") {
                        finished(event);
                    }
                },
                [ENGINE_OVERRIDE]: counting,
            } as never);
            const voiceEnds: Record<string, unknown>[] = [];
            const voice = new VoiceSession({
                options: { input: "provider", language: "en-US" },
                controller,
                emit: (type, detail) => {
                    if (type === "ai-voice-end") {
                        voiceEnds.push(detail);
                    }
                },
                transcriber: () => ({ readiness: "ready", engine: counting }),
                speaker: () => ({ readiness: "unsupported" }),
                immersive: () => false,
            });

            voice.talk(true);
            await vi.waitFor(() => {
                assert.lengthOf(recording, 1, "the microphone is recording");
            });
            voice.talk(false);
            const outcome = await done;

            assert.strictEqual(outcome.type, "ai-command-complete", JSON.stringify(outcome));
            assert.deepStrictEqual(voiceEnds, [{ reason: "user", code: "AI_COMPLETED", params: {} }]);
            const reader = controller.getConversation()?.messages.find((message) => message.role === "reader");
            assert.strictEqual(reader?.role === "reader" ? reader.via : undefined, "voice");
            assert.sameMembers(
                redNodes(session, SMALL_GRAPH.nodes as { id: string }[]),
                SMALL_GRAPH.nodes.map((node) => node.id as string),
                "every node is red",
            );
            controller.dispose();
        },
    );
});

describe.skipIf(skipIfNoApiKey())("pointing while talking on a real model", () => {
    it('"make this one red", said while pointing at n3, changes the color of n3 and of no other node', async () => {
        // The page's recognizer hears the sentence; only the chat turn goes to the provider.
        const fake = installFakeSpeech({ language: "en-US" });
        const graph = {
            nodes: SMALL_GRAPH.nodes.map((node, index) => ({ ...node, id: `n${String(index + 1)}` })),
            edges: SMALL_GRAPH.edges.map((edge) => ({
                ...edge,
                source: `n${String("abcde".indexOf(edge.source as string) + 1)}`,
                target: `n${String("abcde".indexOf(edge.target as string) + 1)}`,
            })),
        };
        const ids = graph.nodes.map((node) => node.id);
        const session = await assistantSession(graph);
        const colors = (): string[] =>
            ids.map((id) => JSON.stringify(session.styles.explain({ node: id }).merged["node.color" as never]));
        const before = colors();
        const real = engine();
        const counting: AiEngine = Object.assign(Object.create(real) as AiEngine, {
            turn: (request: Parameters<AiEngine["turn"]>[0], signal: AbortSignal): AsyncIterable<TurnEvent> => {
                counted();
                return real.turn(request, signal);
            },
        });
        const registry = new CommandRegistry();
        installAssistantTools(registry, session);
        let finished: (event: AiEvent) => void = () => undefined;
        const done = new Promise<AiEvent>((resolve) => {
            finished = resolve;
        });
        const controller = new AiController({
            provider: { name: getLlmRegressionProvider() } as never,
            commandRegistry: registry,
            graph: { getSession: () => session } as unknown as CommandContext["graph"],
            model: getLlmRegressionModel(),
            history: "memory",
            emitEvent: (event: AiEvent) => {
                if (event.type === "ai-command-complete" || event.type === "ai-command-error") {
                    finished(event);
                }
            },
            [ENGINE_OVERRIDE]: counting,
        } as never);
        let pointer: ((id: string) => void) | undefined;
        const voice = new VoiceSession({
            options: { input: "browser", language: "en-US" },
            controller,
            emit: () => undefined,
            transcriber: () => ({ readiness: "unsupported" }),
            speaker: () => ({ readiness: "unsupported" }),
            immersive: () => false,
            selected: () => [],
            onPointed: (listener) => {
                pointer = listener;
                return () => {
                    pointer = undefined;
                };
            },
        });

        voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(fake.recognizers, 1, "the recognizer is listening");
        });
        pointer?.("n3");
        fake.recognizers[0].hear("make this one red", true);
        voice.talk(false);
        const outcome = await done;

        assert.strictEqual(outcome.type, "ai-command-complete", JSON.stringify(outcome));
        const after = colors();
        const changed = ids.filter((_, index) => after[index] !== before[index]);
        assert.deepStrictEqual(changed, ["n3"], "only n3 changed color");
        assert.deepStrictEqual(redNodes(session, graph.nodes), ["n3"], "n3 is red");
        controller.dispose();
    });
});
