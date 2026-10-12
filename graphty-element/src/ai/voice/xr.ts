/**
 * Voice in an immersive session: B or Y (or the wrist orb) held to talk, A and X to approve and
 * deny, the rays' nodes as pointing, and the in-scene cards. Reached only by `import()` with
 * `voice`, when a session starts; the priming on the Enter VR / AR click is `./prime`.
 * @module ai/voice/xr
 */

import type { Scene } from "@babylonjs/core";

import type { XRInputHandler } from "../../cameras/XRInputHandler";
import type { NodeId } from "../../catalog/types";
import type { XRAiConfig } from "../../config/XRConfig";
import type { AiApprovalRequest, AiQuestionRequest, EventType } from "../../events";
import type { ExecutionResult } from "../AiController";
import { approvalCards, panelCards, questionCards, XrCardStack } from "./XrPendingControl";

/** What the assistant gives the bindings. */
export interface XrAssistantHost {
    talk(down: boolean): void;
    pointed(id: NodeId): void;
    approvals(): readonly AiApprovalRequest[];
    questions(): readonly AiQuestionRequest[];
    resolve(id: string, approve: boolean): void;
    answer(id: string, choice: string): void;
    /**
     * Listen for one of the graph's events.
     * @returns Stops listening.
     */
    on(type: EventType, listener: (event: Record<string, unknown>) => void): () => void;
    /**
     * Listen for spoken messages' outcomes.
     * @returns Stops listening.
     */
    onAnswer(listener: (result: ExecutionResult) => void): () => void;
}

/**
 * Bind the assistant to an immersive session.
 * @param input - The session's input handler.
 * @param scene - The scene the cards are drawn in.
 * @param config - `xr.ai`; absent, every default.
 * @param host - The assistant.
 * @returns Unbinds: the cards go, the buttons and the orb stop.
 */
export function bindXrAssistant(
    input: XRInputHandler,
    scene: Scene,
    config: XRAiConfig | undefined,
    host: XrAssistantHost,
): () => void {
    const labels = config?.labels ?? {};
    const answerLast = (approve: boolean): void => {
        const request = host.approvals().at(-1);
        if (request !== undefined) {
            host.resolve(request.id, approve);
        }
    };

    input.setAssistant({
        talkButtons: config?.pushToTalk?.buttons ?? ["b", "y"],
        approveButtons: config?.pendingButtons?.approve ?? ["a"],
        denyButtons: config?.pendingButtons?.deny ?? ["x"],
        wristOrb: config?.pushToTalk?.wristOrb ?? true,
        talk: (down) => {
            host.talk(down);
        },
        approve: () => {
            answerLast(true);
        },
        deny: () => {
            answerLast(false);
        },
        pointed: (id) => {
            host.pointed(id);
        },
    });

    const stops: (() => void)[] = [];
    const stacks: XrCardStack[] = [];

    if (config?.pendingControl !== false) {
        const pending = new XrCardStack(scene, "graphty-xr-ai-pending", -0.15);
        stacks.push(pending);
        const redraw = (): void => {
            const approval = host.approvals().at(-1);
            const question = host.questions().at(-1);
            if (approval !== undefined) {
                pending.show(approvalCards(approval, labels, answerLast));
            } else if (question !== undefined) {
                pending.show(
                    questionCards(question, labels, (choice) => {
                        host.answer(question.id, choice);
                    }),
                );
            } else {
                pending.show([]);
            }
        };

        for (const type of ["ai-approval-requested", "ai-question-asked", "ai-pending-resolved"] as const) {
            stops.push(host.on(type, redraw));
        }

        redraw();
    }

    if (config?.panel !== false) {
        const panel = new XrCardStack(scene, "graphty-xr-ai-panel", 0.25);
        stacks.push(panel);
        let transcript = "";
        stops.push(
            host.on("ai-voice-transcript", (event) => {
                if (event.isFinal === true && typeof event.transcript === "string") {
                    ({ transcript } = event);
                    panel.show(panelCards(transcript, undefined, labels));
                }
            }),
            host.onAnswer((result) => {
                panel.show(
                    panelCards(transcript, { code: result.code ?? "AI_COMPLETED", text: result.llmText ?? "" }, labels),
                );
            }),
        );
    }

    return () => {
        input.setAssistant(null);
        for (const stop of stops) {
            stop();
        }

        for (const stack of stacks) {
            stack.dispose();
        }
    };
}
