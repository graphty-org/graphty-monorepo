/**
 * @file Push-to-talk on fakes: the page's speech (test/helpers/fake-speech.ts) and the scripted
 * engine under a real controller. A transcript is sent as the same command a typed message is,
 * marked as spoken; answers are spoken only in the model's own words or the host's; talking cuts
 * off speech; and an utterance answers a pending approval or question it matches.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { GraphSession } from "../../../session";
import { AiController, type AiControllerOptions } from "../../../src/ai/AiController";
import type { AiVoiceOptions } from "../../../src/ai/AiManager";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { comparable, type VoiceEventType, VoiceSession } from "../../../src/ai/voice/VoiceSession";
import type { AiEvent } from "../../../src/events";
import { assistantSession, callsTurn, digest, textTurn } from "../../helpers/assistant";
import { type FakeSpeech, flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.unstubAllGlobals();
});

const STYLE_SERVERS = {
    tool: "style",
    args: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
};

/** A controller and a push-to-talk session over the small graph, with the page's speech faked. */
interface Harness {
    readonly fake: FakeSpeech;
    readonly session: GraphSession;
    readonly engine: FakeEngine;
    readonly controller: AiController;
    readonly voice: VoiceSession;
    /** The controller's events. */
    readonly events: AiEvent[];
    /** The voice events, as `[type, detail]`. */
    readonly heard: [VoiceEventType, Record<string, unknown>][];
    /** Hold talk, have the recognizer hear the text, release, and let the outcome settle. */
    say(text: string): Promise<void>;
}

/**
 * Build the harness.
 * @param options - The assistant's `voice`.
 * @param controllerOptions - Approvals or questions.
 * @returns The harness.
 */
async function harness(
    options: AiVoiceOptions = {},
    controllerOptions: Pick<AiControllerOptions, "approvals" | "questions"> = {},
): Promise<Harness> {
    const fake = installFakeSpeech();
    const session = await assistantSession();
    const engine = new FakeEngine();
    const events: AiEvent[] = [];
    const registry = new CommandRegistry();
    installAssistantTools(registry, session);
    const controller = new AiController({
        provider: { name: "scripted" } as never,
        commandRegistry: registry,
        graph: { getSession: () => session } as unknown as CommandContext["graph"],
        emitEvent: (event: AiEvent) => events.push(event),
        history: "memory",
        ...controllerOptions,
        [ENGINE_OVERRIDE]: engine,
    } as never);
    const heard: Harness["heard"] = [];
    const voice = new VoiceSession({
        options,
        controller,
        emit: (type, detail) => heard.push([type, detail]),
        transcriber: () => ({ readiness: "unsupported" }),
        speaker: () => (engine.speak === undefined ? { readiness: "unsupported" } : { readiness: "ready", engine }),
        immersive: () => false,
    });
    const ends = (): number => heard.filter(([type]) => type === "ai-voice-end").length;
    const finished = (): number =>
        events.filter((event) => event.type === "ai-command-complete" || event.type === "ai-command-error").length;
    return {
        fake,
        session,
        engine,
        controller,
        voice,
        events,
        heard,
        async say(text) {
            const before = ends();
            const done = finished();
            const recognizers = fake.recognizers.length;
            voice.talk(true);
            await vi.waitFor(() => {
                assert.strictEqual(fake.recognizers.length, recognizers + 1, "a recognizer started");
            });
            fake.recognizers.at(-1)?.hear(text, true);
            voice.talk(false);
            await vi.waitFor(() => {
                assert.strictEqual(ends(), before + 1, "the press ended");
            });
            // The message (or the answer) it sent ends.
            await vi.waitFor(() => {
                assert.isAbove(finished(), done, "the message ended");
            });
            await flushMicrotasks();
        },
    };
}

/**
 * The voice events of one type.
 * @param h - The harness.
 * @param type - The type.
 * @returns Their details.
 */
function of(h: Harness, type: VoiceEventType): Record<string, unknown>[] {
    return h.heard.flatMap(([t, detail]) => (t === type ? [detail] : []));
}

describe("comparable", () => {
    it("ignores case, punctuation and spacing", () => {
        assert.strictEqual(comparable("  Yes. "), "yes");
        assert.strictEqual(comparable("Light  BLUE!"), "light blue");
    });
});

describe("a press sends what was heard as a spoken command", () => {
    it("sends exactly one command, saved as said by voice", async () => {
        const h = await harness();
        h.engine.push(textTurn("Five nodes."));

        await h.say("how many nodes are there");

        await vi.waitFor(() => {
            assert.strictEqual(h.engine.requests.length, 1);
        });
        const reader = h.controller.getConversation()?.messages.filter((message) => message.role === "reader");
        assert.deepStrictEqual(
            reader?.map((message) => (message.role === "reader" ? [message.text, message.via] : [])),
            [["how many nodes are there", "voice"]],
        );
        assert.deepStrictEqual(
            h.heard.map(([type]) => type).filter((type) => type !== "ai-voice-level"),
            ["ai-voice-start", "ai-voice-transcript", "ai-voice-transcript", "ai-voice-end"],
        );
        assert.deepStrictEqual(of(h, "ai-voice-end"), [{ reason: "user", code: "AI_COMPLETED", params: {} }]);
        assert.strictEqual(h.fake.liveTracks(), 0, "the microphone closed on release");
    });

    it("sends nothing when nothing was heard", async () => {
        const h = await harness();
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(h.fake.recognizers.length, 1);
        });
        h.voice.talk(false);
        await vi.waitFor(() => {
            assert.strictEqual(of(h, "ai-voice-end").length, 1);
        });
        await flushMicrotasks();
        assert.strictEqual(h.engine.requests.length, 0);
    });

    it('push "toggle": the first press starts listening and the second ends it', async () => {
        const h = await harness({ push: "toggle" });
        h.engine.push(textTurn("Done."));
        h.voice.talk(true);
        h.voice.talk(false);
        await vi.waitFor(() => {
            assert.strictEqual(h.fake.recognizers.length, 1);
        });
        h.fake.recognizers[0].hear("show me the servers", true);
        await flushMicrotasks();
        assert.strictEqual(of(h, "ai-voice-end").length, 0, "a release does not end a toggled press");
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(h.engine.requests.length, 1);
        });
    });
});

describe("spoken answers", () => {
    it("speak exactly the model's text, once, through the provider", async () => {
        const h = await harness({ output: "provider" });
        h.engine.scriptVoice({ speak: new Blob(["RIFF"], { type: "audio/wav" }) });
        h.engine.push(callsTurn([STYLE_SERVERS]), textTurn("I colored the servers red."));

        await h.say("color the servers red");

        await vi.waitFor(() => {
            assert.strictEqual(of(h, "ai-speech-start").length, 1);
        });
        assert.deepStrictEqual(h.engine.voiceCalls, [{ kind: "speak", text: "I colored the servers red." }]);
        h.fake.audios[0].onended?.();
        await vi.waitFor(() => {
            assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_COMPLETED", params: {} }]);
        });
    });

    it("an error with no text speaks nothing without say, and the host's words with it", async () => {
        const failing = (h: Harness): void => {
            h.engine.push([
                {
                    type: "error",
                    code: "AI_PROVIDER_ERROR",
                    params: { provider: "google", status: 500 },
                    cause: new Error("500"),
                },
            ]);
        };

        const silent = await harness({ output: "browser" });
        failing(silent);
        await silent.say("color the servers red");
        await flushMicrotasks();
        assert.lengthOf(silent.fake.utterances, 0);
        assert.lengthOf(of(silent, "ai-speech-start"), 0);
        vi.unstubAllGlobals();

        const facts: unknown[] = [];
        const worded = await harness({
            output: "browser",
            say: (fact) => {
                facts.push(fact);
                return fact.code === "AI_PROVIDER_ERROR" ? "The provider failed." : undefined;
            },
        });
        failing(worded);
        await worded.say("color the servers red");
        await vi.waitFor(() => {
            assert.deepStrictEqual(
                worded.fake.utterances.map((utterance) => utterance.text),
                ["The provider failed."],
            );
        });
        assert.deepStrictEqual(facts, [{ code: "AI_PROVIDER_ERROR", params: { provider: "google", status: 500 } }]);
    });

    it("are off on a flat page by default", async () => {
        const h = await harness();
        h.engine.push(textTurn("Five nodes."));
        await h.say("how many nodes");
        await flushMicrotasks();
        assert.lengthOf(h.fake.utterances, 0);
    });

    it("pressing talk while one is spoken cuts it off", async () => {
        const h = await harness({ output: "browser" });
        h.engine.push(textTurn("A long answer."));
        await h.say("tell me about the graph");
        await vi.waitFor(() => {
            assert.strictEqual(of(h, "ai-speech-start").length, 1);
        });

        h.voice.talk(true);

        await vi.waitFor(() => {
            assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_CANCELLED", params: {} }]);
        });
        h.voice.talk(false);
    });

    it("stopSpeech and dispose stop speaking, and dispose closes the microphone", async () => {
        const h = await harness({ output: "browser" });
        h.engine.push(textTurn("An answer."));
        await h.say("tell me");
        await vi.waitFor(() => {
            assert.strictEqual(of(h, "ai-speech-start").length, 1);
        });
        h.voice.stopSpeech();
        await vi.waitFor(() => {
            assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_CANCELLED", params: {} }]);
        });

        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(h.fake.liveTracks(), 1);
        });
        h.voice.dispose();
        assert.strictEqual(h.fake.liveTracks(), 0);
        h.voice.talk(true);
        await flushMicrotasks();
        assert.strictEqual(h.fake.recognizers.length, 2, "a press after dispose starts nothing");
    });
});

describe("answering by voice", () => {
    /**
     * A harness holding one approval for styling the servers.
     * @param options - The assistant's `voice`.
     * @returns The harness.
     */
    async function holding(options: AiVoiceOptions = {}): Promise<Harness> {
        const h = await harness(options, { approvals: "writes" });
        h.engine.push(callsTurn([STYLE_SERVERS]));
        const result = await h.controller.execute("color the servers red");
        assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
        return h;
    }

    it('"Yes." approves the pending request, and nothing new is sent', async () => {
        const h = await holding();
        const before = await digest(h.session);
        h.engine.push(textTurn("Done."));
        await h.say("Yes.");
        await vi.waitFor(() => {
            assert.lengthOf(h.controller.getPendingApprovals(), 0);
        });
        const resolved = h.events.find((event) => event.type === "ai-pending-resolved");
        assert.strictEqual(resolved?.type === "ai-pending-resolved" ? resolved.code : undefined, "AI_COMPLETED");
        assert.notStrictEqual(await digest(h.session), before, "the held change ran");
        const readers = h.controller.getConversation()?.messages.filter((message) => message.role === "reader");
        assert.lengthOf(readers ?? [], 1, "the answer is no new message");
    });

    it('"no" denies it, and the graph is unchanged', async () => {
        const h = await holding();
        const before = await digest(h.session);
        h.engine.push(textTurn("Left as it was."));
        await h.say("no");
        await vi.waitFor(() => {
            assert.lengthOf(h.controller.getPendingApprovals(), 0);
        });
        const resolved = h.events.find((event) => event.type === "ai-pending-resolved");
        assert.strictEqual(resolved?.type === "ai-pending-resolved" ? resolved.code : undefined, "AI_APPROVAL_DENIED");
        assert.strictEqual(await digest(h.session), before);
    });

    it("replies are replaceable, for any language", async () => {
        const h = await holding({ replies: { approve: ["oui"], deny: ["non"] } });
        h.engine.push(textTurn("Fait."));
        await h.say("Oui !");
        await vi.waitFor(() => {
            assert.lengthOf(h.controller.getPendingApprovals(), 0);
        });
        const resolved = h.events.find((event) => event.type === "ai-pending-resolved");
        assert.strictEqual(resolved?.type === "ai-pending-resolved" ? resolved.code : undefined, "AI_COMPLETED");
    });

    it("anything else is a new spoken message, which supersedes the request", async () => {
        const h = await holding();
        const before = await digest(h.session);
        h.engine.push(textTurn("Five nodes."));
        await h.say("how many nodes are there");
        const resolved = h.events.find((event) => event.type === "ai-pending-resolved");
        assert.deepStrictEqual(
            resolved?.type === "ai-pending-resolved" ? [resolved.code, resolved.params.reason] : [],
            ["AI_APPROVAL_STALE", "superseded"],
        );
        assert.strictEqual(await digest(h.session), before);
        const readers = h.controller
            .getConversation()
            ?.messages.flatMap((message) => (message.role === "reader" ? [message.via] : []));
        assert.deepStrictEqual(readers, ["text", "voice"]);
    });

    it("an utterance equal to a pending question's choice answers it", async () => {
        const h = await harness({}, { questions: true });
        h.engine.push(callsTurn([{ tool: "ask_reader", args: { question: "Which team?", choices: ["red", "Blue"] } }]));
        const asked = await h.controller.execute("color my team");
        assert.strictEqual(asked.code, "AI_QUESTION_ASKED");
        h.engine.push(textTurn("Colored the blue team."));

        await h.say("blue!");

        await vi.waitFor(() => {
            assert.lengthOf(h.controller.getPendingQuestions(), 0);
        });
        const resolved = h.events.find((event) => event.type === "ai-pending-resolved");
        assert.strictEqual(resolved?.type === "ai-pending-resolved" ? resolved.code : undefined, "AI_COMPLETED");
        const answer = h.engine.requests
            .at(-1)
            ?.messages.flatMap((message) => message.parts)
            .find((part) => part.type === "tool-result");
        assert.include(answer?.type === "tool-result" ? answer.content : "", "Blue");
        // The answer reads as the reader's reply to the question, not as a new message.
        const readers = h.controller
            .getConversation()
            ?.messages.flatMap((message) => (message.role === "reader" ? [message.text] : []));
        assert.deepStrictEqual(readers, ["color my team", "Blue"]);
    });
});
