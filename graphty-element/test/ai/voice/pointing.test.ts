/**
 * @file Pointing while talking: the record keeps the nodes the pointer entered, in order, once per
 * run of the same node and at most its cap, and a spoken message carries it in its facts block;
 * a typed message does not, and the next press starts a fresh record.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { GraphSession } from "../../../session";
import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import type { TurnRequest } from "../../../src/ai/engine/types";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { POINTING_CAP, PointingRecord } from "../../../src/ai/voice/pointing";
import { VoiceSession } from "../../../src/ai/voice/VoiceSession";
import type { NodeId } from "../../../src/catalog/types";
import type { AiEvent } from "../../../src/events";
import { assistantSession, textTurn } from "../../helpers/assistant";
import { flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("the pointing record", () => {
    it("keeps entered nodes in order, once per run of the same node", () => {
        const record = new PointingRecord(["s"]);
        for (const id of ["a", "a", "b", "a", "a", 3]) {
            record.enter(id);
        }

        assert.deepStrictEqual(record.facts(), { pointed: ["a", "b", "a", 3], selected: ["s"] });
    });

    it("keeps at most its cap: the latest pointed at, the first selected", () => {
        const many = Array.from({ length: POINTING_CAP + 5 }, (_, index) => index);
        const record = new PointingRecord(many);
        for (const id of many) {
            record.enter(id);
        }

        assert.deepStrictEqual(record.facts().pointed, many.slice(-POINTING_CAP));
        assert.deepStrictEqual(record.facts().selected, many.slice(0, POINTING_CAP));
    });
});

/**
 * The facts block a request was sent with.
 * @param request - The request.
 * @returns Its graph-data text.
 */
function factsOf(request: TurnRequest | undefined): string {
    const part = request?.messages.at(-1)?.parts.find((p) => p.type === "text" && p.origin === "graph-data");
    return part?.type === "text" ? part.text : "";
}

describe("a spoken message carries what was pointed at", () => {
    /**
     * A controller and a push-to-talk session whose pointer the test moves.
     * @returns The pieces.
     */
    async function harness(): Promise<{
        session: GraphSession;
        engine: FakeEngine;
        controller: AiController;
        voice: VoiceSession;
        point(id: NodeId): void;
        say(text: string, during?: () => void): Promise<void>;
    }> {
        const fake = installFakeSpeech();
        const session = await assistantSession();
        await session.selection.apply({ ids: ["c"] });
        const engine = new FakeEngine();
        const registry = new CommandRegistry();
        installAssistantTools(registry, session);
        let finished = 0;
        const controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: registry,
            graph: { getSession: () => session } as unknown as CommandContext["graph"],
            emitEvent: (event: AiEvent) => {
                if (event.type === "ai-command-complete" || event.type === "ai-command-error") {
                    finished++;
                }
            },
            history: "memory",
            [ENGINE_OVERRIDE]: engine,
        } as never);
        const listeners = new Set<(id: NodeId) => void>();
        const voice = new VoiceSession({
            options: {},
            controller,
            emit: () => undefined,
            transcriber: () => ({ readiness: "unsupported" }),
            speaker: () => ({ readiness: "unsupported" }),
            immersive: () => false,
            selected: () => session.selection.nodes,
            onPointed: (listener) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
        });
        const point = (id: NodeId): void => {
            for (const listener of listeners) {
                listener(id);
            }
        };

        return {
            session,
            engine,
            controller,
            voice,
            point,
            async say(text, during) {
                const done = finished;
                const recognizers = fake.recognizers.length;
                voice.talk(true);
                await vi.waitFor(() => {
                    assert.strictEqual(fake.recognizers.length, recognizers + 1);
                });
                during?.();
                fake.recognizers.at(-1)?.hear(text, true);
                voice.talk(false);
                await vi.waitFor(() => {
                    assert.isAbove(finished, done, "the message ended");
                });
                await flushMicrotasks();
            },
        };
    }

    it("lists three hovered nodes in order, and the selection at the press", async () => {
        const h = await harness();
        h.engine.push(textTurn("Done."));
        await h.say("color these red", () => {
            h.point("b");
            h.point("b");
            h.point("e");
            h.point("a");
        });
        // After release: not recorded.
        h.point("d");

        const lines = factsOf(h.engine.requests[0]).split("\n");
        assert.include(lines, 'Pointed at, in order: "b", "e", "a".');
        assert.include(lines, 'Selected: "c".');
    });

    it("starts a fresh record at the next press, and a typed message gets no pointing lines", async () => {
        const h = await harness();
        h.engine.push(textTurn("Done."), textTurn("Done."), textTurn("Done."));
        await h.say("color this red", () => {
            h.point("a");
        });
        await h.say("and this one", () => {
            h.point("d");
        });
        await h.controller.execute("and that one");

        assert.include(factsOf(h.engine.requests[1]).split("\n"), 'Pointed at, in order: "d".');
        const typed = factsOf(h.engine.requests[2]);
        assert.notInclude(typed, "Pointed at");
        assert.include(typed.split("\n"), "Selected: 1.");
    });

    it("names a long id whole, so the id the model copies from the facts is the node pointed at", async () => {
        const h = await harness();
        const long = "http://purl.obolibrary.org/obo/GO_0008150#biological_process";
        assert.isAbove(long.length, 40);
        await h.session.data.addNodes([{ id: long }]);
        h.engine.push(textTurn("Done."));
        await h.say("make this one red", () => {
            h.point(long);
        });

        const line = factsOf(h.engine.requests[0])
            .split("\n")
            .find((text) => text.startsWith("Pointed at, in order: "));
        assert.isDefined(line);
        const copied = JSON.parse(line.slice("Pointed at, in order: ".length, -1)) as string;
        assert.strictEqual(copied, long);
        assert.exists(h.session.data.node(copied), "the copied id resolves to the node pointed at");
    });
});
