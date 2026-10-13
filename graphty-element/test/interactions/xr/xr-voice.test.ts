/**
 * Voice in a real immersive session on an emulated Quest 3 (IWER): B held talks, the wrist orb
 * pinched with a tracked hand talks, the controller ray names what it points at, A and X answer a
 * held change, and the microphone is primed on the Enter VR click and closed on leaving.
 *
 * Only the speech paths are fakes: a recognizer that hears one sentence as soon as it starts, and
 * a microphone whose streams come from an audio context, so their tracks can be counted live or
 * ended. Every input -- buttons, trigger, hands, the Enter VR click -- is the emulated headset's or
 * the browser's own.
 */
import "../../../src/graphty-element";

import { type AbstractMesh, Ray, Vector3, WebXRHandJoint, type WebXRHandTracking } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../../index.js";
import type { AiVoiceOptions } from "../../../src/ai/AiManager";
import { FakeEngine, FakeLiveConnection } from "../../../src/ai/engine/FakeEngine";
import { registerProviderApiEngine } from "../../../src/ai/engine/load";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import { XR_ASSISTANT_ORB } from "../../../src/cameras/XRInputHandler";
import type { XRPivotCameraController } from "../../../src/cameras/XRPivotCameraController";
import { operationQueueOf } from "../../../src/Graph";
import { FakeRecognition } from "../../helpers/fake-speech";
import { installIWER, type IWERHandle } from "../helpers/iwer-setup";

const WAIT = { timeout: 10_000, interval: 20 };
const HEARD = "color this red";

let iwer: IWERHandle;
let element: Graphty;
/** Every microphone stream the page opened. */
let streams: MediaStream[];
let audio: AudioContext;
let voiceStarts: number;
let voiceEnds: string[];
let finished: number;

beforeEach(() => {
    streams = [];
    voiceStarts = 0;
    voiceEnds = [];
    finished = 0;
    iwer = installIWER();
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal(
        "webkitSpeechRecognition",
        class extends FakeRecognition {
            constructor() {
                super(false, []);
            }

            override start(): void {
                super.start();
                queueMicrotask(() => {
                    this.hear(HEARD, true);
                });
            }
        },
    );
    audio = new AudioContext();
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(() => {
        const { stream } = audio.createMediaStreamDestination();
        streams.push(stream);
        return Promise.resolve(stream);
    });
});

afterEach(async () => {
    element.disableAiControl();
    element.remove();
    iwer.uninstall();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await audio.close();
});

/**
 * Microphone tracks not yet stopped.
 * @returns How many.
 */
function liveTracks(): number {
    return streams.flatMap((stream) => stream.getTracks()).filter((track) => track.readyState === "live").length;
}

/**
 * Mount an element with XR and the assistant on, with two nodes far from where the controllers
 * point.
 * @param voice - The assistant's `voice`.
 * @param handTracking - Whether the element tracks hands.
 */
async function mount(voice: AiVoiceOptions, handTracking = false): Promise<void> {
    element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.xr = { enabled: true, ui: { enabled: true }, input: { handTracking } };
    document.body.append(element);
    await vi.waitFor(() => {
        assert.isNotNull(element.shadowRoot?.querySelector('[data-xr-mode="immersive-vr"]') ?? null, "no VR button");
    }, WAIT);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -40, y: 40, z: 0 } },
        { id: "b", position: { x: 40, y: 40, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.enableAiControl({ provider: "mock", voice, history: "memory", approvals: "writes" });
    element.addEventListener("ai-voice-start", () => {
        voiceStarts++;
    });
    element.addEventListener("ai-voice-end", (event) => {
        voiceEnds.push(String((event as CustomEvent<{ code?: string }>).detail.code));
    });
    for (const type of ["ai-command-complete", "ai-command-error"]) {
        element.addEventListener(type, () => {
            finished++;
        });
    }
}

/**
 * Let the session render more frames.
 * @param count - How many.
 */
async function frames(count = 5): Promise<void> {
    const session = iwer.sessions.at(-1);
    assert.exists(session, "no XR session");
    const target = session.frames + count;
    await vi.waitFor(() => {
        assert.isAtLeast(session.frames, target, "the session stopped rendering");
    }, WAIT);
}

/** The XR helper of the session running. */
function xrHelper(): NonNullable<
    ReturnType<NonNullable<ReturnType<typeof element.getXRSessionManager>>["getXRHelper"]>
> {
    const helper = element.getXRSessionManager()?.getXRHelper();
    assert.exists(helper, "no XR session");
    return helper;
}

/** Enter VR through the element, and wait until both controllers are tracked. */
async function enterVR(): Promise<void> {
    await element.setViewMode("vr");
    await vi.waitFor(() => {
        const { controllers } = xrHelper().input;
        assert.lengthOf(controllers, 2, "the emulated controllers are not tracked");
    }, WAIT);
    await frames();
}

/**
 * Put a node where the right controller's ray points, three metres out.
 * @param id - The node's id.
 */
async function nodeOnRightRay(id: string): Promise<void> {
    const controller = xrHelper().input.controllers.find((source) => source.inputSource.handedness === "right");
    assert.exists(controller);
    const ray = new Ray(Vector3.Zero(), Vector3.Forward());
    controller.getWorldPointerRayToRef(ray);
    const at = ray.origin.add(ray.direction.scale(3));
    await element.session.data.addNodes([{ id, position: { x: at.x, y: at.y, z: at.z } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await frames();
}

/**
 * Press or release a controller button.
 * @param hand - Which controller.
 * @param button - The button's id in the controller's layout.
 * @param down - Pressed or released.
 */
async function button(hand: "left" | "right", button: string, down: boolean): Promise<void> {
    iwer.device.controllers[hand]?.updateButtonValue(button, down ? 1 : 0);
    await frames(3);
}

/**
 * The facts lines saved with the conversation's messages.
 * @returns Each facts part's lines.
 */
async function savedFacts(): Promise<string[][]> {
    const id = element.getAiConversation()?.id;
    assert.isDefined(id);
    const saved = await element.exportAiConversation(id);
    assert.isNotNull(saved);
    return (JSON.parse(saved) as { messages: { parts?: { origin?: string; text?: string }[] }[] }).messages
        .flatMap((message) => message.parts ?? [])
        .filter((part) => part.origin === "graph-data")
        .map((part) => (part.text ?? "").split("\n"));
}

describe("talking in VR with the controllers", () => {
    test("B held and released sends one voice command; the trigger meanwhile starts nothing", async () => {
        await mount({ input: "browser", output: "off" });
        await enterVR();
        await nodeOnRightRay("p");

        await button("right", "b-button", true);
        await vi.waitFor(() => {
            assert.strictEqual(voiceStarts, 1, "B did not start talking");
        }, WAIT);
        // Pulling the trigger at the node while talking neither starts a second press nor picks it.
        await button("right", "trigger", true);
        await button("right", "trigger", false);
        await button("right", "b-button", false);
        await vi.waitFor(() => {
            assert.strictEqual(finished, 1, "the spoken message did not end");
        }, WAIT);

        assert.strictEqual(voiceStarts, 1);
        assert.deepEqual(voiceEnds, ["AI_COMPLETED"]);
        assert.notInclude([...element.graph.getSession().selection.nodes], "p", "the trigger picked the node");
        // The trigger alone never talks.
        await button("right", "trigger", true);
        await button("right", "trigger", false);
        assert.strictEqual(voiceStarts, 1, "the trigger started talking");
        await element.setViewMode("3d");
    });

    test("the controller ray over a node while B is held names it in the message", async () => {
        await mount({ input: "browser", output: "off" });
        await enterVR();
        await nodeOnRightRay("p");

        await button("right", "b-button", true);
        await vi.waitFor(() => {
            assert.strictEqual(voiceStarts, 1);
        }, WAIT);
        await button("right", "b-button", false);
        await vi.waitFor(() => {
            assert.strictEqual(finished, 1, "the spoken message did not end");
        }, WAIT);

        const facts = await savedFacts();
        assert.lengthOf(facts, 1, "one facts part, on the spoken message");
        assert.include(facts[0], 'Pointed at, in order: "p".');
        await element.setViewMode("3d");
    });

    describe("a held change", () => {
        /**
         * Ask, by typing, for a node the policy holds, and wait for the in-scene control.
         * @returns The node count before.
         */
        async function holdAnAddition(): Promise<number> {
            const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
            provider.setResponse("add a node", {
                text: "",
                toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
            });
            const before = element.graph.getSession().status.counts.nodes;
            const held = await element.graph.aiCommand("add a node");
            assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED");
            await vi.waitFor(() => {
                const names = element.graph.scene.meshes.map((mesh) => mesh.name);
                assert.includeMembers(
                    names,
                    ["graphty-xr-ai-pending-0", "graphty-xr-ai-pending-1", "graphty-xr-ai-pending-2"],
                    "the held change is not shown in the scene",
                );
            }, WAIT);
            return before;
        }

        test("A runs it", async () => {
            await mount({ input: "browser", output: "off" });
            await enterVR();
            const before = await holdAnAddition();

            await button("right", "a-button", true);
            await vi.waitFor(() => {
                assert.strictEqual(element.graph.getSession().status.counts.nodes, before + 1, "A did not run it");
            }, WAIT);
            await button("right", "a-button", false);
            assert.exists(element.graph.getSession().data.node("F"));
            await vi.waitFor(() => {
                assert.isNull(element.graph.scene.getMeshByName("graphty-xr-ai-pending-0"), "the control stayed");
            }, WAIT);
            await element.setViewMode("3d");
        });

        test("with no card on screen, A answers nothing", async () => {
            await mount({ input: "browser", output: "off" });
            element.xr = { ...element.xr, ai: { ...element.xr?.ai, pendingControl: false } };
            await enterVR();
            const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
            provider.setResponse("add a node", {
                text: "",
                toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
            });
            const held = await element.graph.aiCommand("add a node");
            assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED");

            await button("right", "a-button", true);
            await button("right", "a-button", false);
            await frames();
            assert.lengthOf(element.getPendingAiApprovals(), 1, "A approved a change the reader could not see");
            assert.notExists(element.graph.getSession().data.node("F"));
            await element.setViewMode("3d");
        });

        test("X denies it", async () => {
            await mount({ input: "browser", output: "off" });
            await enterVR();
            const before = await holdAnAddition();

            await button("left", "x-button", true);
            await vi.waitFor(() => {
                assert.lengthOf(element.getPendingAiApprovals(), 0, "X did not answer it");
            }, WAIT);
            await button("left", "x-button", false);
            assert.strictEqual(element.graph.getSession().status.counts.nodes, before, "the graph changed");
            await element.setViewMode("3d");
        });
    });
});

describe("the microphone", () => {
    test("the Enter VR click asks for it once and leaves no live track", async () => {
        await mount({ input: "browser" });
        const speak = vi.spyOn(speechSynthesis, "speak").mockImplementation(() => undefined);
        const vr = element.shadowRoot?.querySelector('[data-xr-mode="immersive-vr"]');
        assert.exists(vr);

        await userEvent.click(vr);
        await vi.waitFor(() => {
            assert.strictEqual(element.getXRSessionManager()?.getActiveMode(), "immersive-vr", "VR did not start");
        }, WAIT);
        await vi.waitFor(() => {
            assert.lengthOf(streams, 1, "the microphone was not asked for");
            assert.strictEqual(liveTracks(), 0, "the priming left the microphone open");
        }, WAIT);
        await frames();
        assert.lengthOf(streams, 1, "the microphone was asked for more than once");
        assert.strictEqual(speak.mock.calls.length, 1, "speech was not primed");
        await iwer.sessions[0].session.end();
    });

    test("leaving XR while B is held closes it and sends nothing", async () => {
        await mount({ input: "browser", output: "off" });
        await enterVR();

        await button("right", "b-button", true);
        await vi.waitFor(() => {
            assert.strictEqual(liveTracks(), 1, "B did not open the microphone");
        }, WAIT);
        await element.setViewMode("3d");
        await vi.waitFor(() => {
            assert.strictEqual(liveTracks(), 0, "leaving XR left the microphone open");
            assert.deepEqual(voiceEnds, ["AI_CANCELLED"]);
        }, WAIT);
        assert.strictEqual(finished, 0, "leaving XR sent the utterance");
    });
});

describe("talking live in VR", () => {
    /**
     * Give the assistant's provider a scripted live API whose connections hold the microphone open,
     * as a real one does, until closed.
     * @returns The connections it opens.
     */
    function scriptLive(): FakeLiveConnection[] {
        const provider = element.getAiManager()?.getProvider();
        assert.exists(provider);
        const engine = new FakeEngine();
        const connections: FakeLiveConnection[] = [];
        engine.openLive = async (options) => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const connection = new FakeLiveConnection(options);
            const close = connection.close.bind(connection);
            connection.close = () => {
                for (const track of stream.getTracks()) {
                    track.stop();
                }

                close();
            };
            connections.push(connection);
            return { code: "AI_COMPLETED", params: {}, connection };
        };
        registerProviderApiEngine(provider, () => engine);
        return connections;
    }

    test("B talks on the live connection, the trigger starts nothing, and leaving XR closes it", async () => {
        await mount({ mode: "live", output: "on" });
        const connections = scriptLive();
        await enterVR();
        await nodeOnRightRay("p");

        await button("right", "b-button", true);
        await vi.waitFor(() => {
            assert.deepEqual(connections[0]?.captures, [true], "B did not talk on the live connection");
        }, WAIT);
        await button("right", "trigger", true);
        await button("right", "trigger", false);
        assert.strictEqual(voiceStarts, 1, "the trigger started talking");
        assert.lengthOf(connections, 1);
        assert.notInclude([...element.graph.getSession().selection.nodes], "p", "the trigger picked the node");
        await button("right", "b-button", false);
        await vi.waitFor(() => {
            assert.deepEqual(connections[0].captures, [true, false], "releasing B did not stop sending");
        }, WAIT);
        assert.deepEqual(voiceEnds, ["AI_COMPLETED"]);
        assert.strictEqual(finished, 0, "the press ran turn by turn");
        assert.strictEqual(liveTracks(), 1, "the connection keeps its microphone between presses");

        await element.setViewMode("3d");
        await vi.waitFor(() => {
            assert.isTrue(connections[0].closed, "leaving XR left the connection open");
            assert.strictEqual(liveTracks(), 0, "leaving XR left the microphone open");
        }, WAIT);
    });
});

describe("talking in VR with hands", () => {
    /**
     * Where the right hand pinches now, in the scene.
     * @returns Between its thumb and index tips.
     */
    function rightPinchPoint(): Vector3 {
        const tracking = xrHelper().baseExperience.featuresManager.getEnabledFeature(
            "xr-hand-tracking",
        ) as WebXRHandTracking | null;
        const hand = tracking?.getHandByHandedness("right");
        const thumb = hand?.getJointMesh(WebXRHandJoint.THUMB_TIP);
        const index = hand?.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP);
        assert.exists(thumb, "the right hand is not tracked");
        assert.exists(index);
        return Vector3.Center(thumb.getAbsolutePosition(), index.getAbsolutePosition());
    }

    test("pinching and holding the wrist orb talks, and starts no node drag", async () => {
        iwer.device.primaryInputMode = "hand";
        await mount({ input: "browser", output: "off" }, true);
        await element.setViewMode("vr");
        const orb = await vi.waitFor((): AbstractMesh => {
            const found = element.graph.scene.getMeshByName(XR_ASSISTANT_ORB);
            assert.exists(found, "no wrist orb");
            assert.isTrue(found.isEnabled(), "the orb is hidden");
            return found;
        }, WAIT);
        const hand = iwer.device.hands.right;
        assert.exists(hand);

        // Where this hand's pinch lands, measured with a pinch away from the orb, which talks not.
        hand.updatePinchValue(1);
        await frames();
        const pinched = rightPinchPoint();
        hand.updatePinchValue(0);
        await frames();
        assert.strictEqual(voiceStarts, 0, "a pinch away from the orb talked");

        // Move the hand so that pinch lands on the orb. The scene's z runs opposite to WebXR's.
        const reach = orb.getAbsolutePosition().subtract(pinched);
        hand.position.set(hand.position.x + reach.x, hand.position.y + reach.y, hand.position.z - reach.z);
        await frames();
        const positions = [...element.graph.getNodes()].map((node) => node.mesh.position.clone());
        hand.updatePinchValue(1);
        await vi.waitFor(() => {
            assert.strictEqual(voiceStarts, 1, "pinching the orb did not talk");
        }, WAIT);
        await frames();
        const controller = element.graph.scene.metadata?.xrCameraController as XRPivotCameraController | undefined;
        assert.isFalse(controller?.getInputHandler().isDragging(), "the orb's pinch started a drag");
        hand.updatePinchValue(0);
        await vi.waitFor(() => {
            assert.strictEqual(finished, 1, "the spoken message did not end");
        }, WAIT);

        const after = [...element.graph.getNodes()].map((node) => node.mesh.position);
        positions.forEach((position, index) => {
            assert.isTrue(position.equalsWithEpsilon(after[index], 1e-6), "a node moved");
        });
        await element.setViewMode("3d");
    });
});
