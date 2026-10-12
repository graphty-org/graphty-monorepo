/**
 * @file The assistant's in-scene cards draw only data and the host's labels: every string painted
 * is a catalog plainName, a held call's arguments as text, the model's question, choices or
 * answer, the reader's transcript, or a value of `xr.ai.labels`. With no labels, the cards that
 * carry no data draw no text at all, only their icons.
 */

import { assert, describe, it } from "vitest";

import {
    approvalCards,
    type CardCanvas,
    paintCard,
    panelCards,
    questionCards,
    type XrCard,
} from "../../../src/ai/voice/XrPendingControl";
import type { AiApprovalRequest, AiQuestionRequest } from "../../../src/events";

const LABELS = {
    AI_CONFIRMATION_NEEDED: "label-held",
    XR_APPROVE: "label-approve",
    XR_DENY: "label-deny",
    AI_QUESTION_ASKED: "label-question",
    XR_TRANSCRIPT: "label-heard",
    AI_COMPLETED: "label-done",
};

const APPROVAL: AiApprovalRequest = {
    id: "approval-1",
    gate: "policy",
    calls: [
        { tool: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } },
        { tool: "app_custom", arguments: { x: 1 } },
    ],
    preview: {},
};

const QUESTION: AiQuestionRequest = {
    id: "question-1",
    question: "Which layout?",
    choices: ["circular", "grid"],
    multiple: false,
};

/** The data a card may show: what the requests, the reader and the model wrote, and catalog names. */
const DATA = [
    "Edit data",
    JSON.stringify(APPROVAL.calls[0].arguments),
    "app_custom",
    JSON.stringify(APPROVAL.calls[1].arguments),
    QUESTION.question,
    ...QUESTION.choices,
    "make it circular",
    "Done: circular.",
];

/**
 * Paint cards on a canvas that records every string drawn.
 * @param cards - The cards.
 * @returns Every string painted.
 */
function painted(cards: readonly XrCard[]): string[] {
    const drawn: string[] = [];
    const ignore = (): void => undefined;
    const canvas = {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textBaseline: "top",
        fillRect: ignore,
        beginPath: ignore,
        moveTo: ignore,
        lineTo: ignore,
        arc: ignore,
        stroke: ignore,
        fill: ignore,
        fillText: (text: string) => {
            drawn.push(text);
        },
    } as unknown as CardCanvas;
    for (const card of cards) {
        paintCard(canvas, card);
    }

    return drawn;
}

/**
 * Every card the assistant can show, for one label map.
 * @param labels - The host's words.
 * @returns The cards.
 */
function everyCard(labels: Record<string, string>): XrCard[] {
    const ignore = (): void => undefined;
    return [
        ...approvalCards(APPROVAL, labels, ignore),
        ...questionCards(QUESTION, labels, ignore),
        ...panelCards("make it circular", { code: "AI_COMPLETED", text: "Done: circular." }, labels),
    ];
}

describe("the in-scene cards", () => {
    it("draw only data and the seeded labels' values", () => {
        const drawn = painted(everyCard(LABELS));
        const allowed = new Set([...DATA, ...Object.values(LABELS)]);
        for (const text of drawn) {
            assert.isTrue(allowed.has(text), `drew ${JSON.stringify(text)}, which is neither data nor a label`);
        }

        // Each label is drawn on its card, and the catalog's name stands for the tool.
        for (const label of Object.values(LABELS)) {
            assert.include(drawn, label);
        }

        assert.include(drawn, "Edit data");
        assert.notInclude(drawn, "edit_data");
    });

    it("draw no words of their own without labels: approve and deny are icons only", () => {
        const drawn = painted(everyCard({}));
        const allowed = new Set(DATA);
        for (const text of drawn) {
            assert.isTrue(allowed.has(text), `drew ${JSON.stringify(text)} with no labels given`);
        }

        const [, approve, deny] = approvalCards(APPROVAL, {}, () => undefined);
        assert.deepEqual(painted([approve, deny]), []);
    });

    it("answer with what was pressed: approve, deny, and one control per choice", () => {
        const answers: unknown[] = [];
        const [, approve, deny] = approvalCards(APPROVAL, {}, (yes) => answers.push(yes));
        approve.act?.();
        deny.act?.();
        const choices = questionCards(QUESTION, {}, (choice) => answers.push(choice)).slice(1);
        assert.lengthOf(choices, QUESTION.choices.length);
        for (const choice of choices) {
            choice.act?.();
        }

        assert.deepEqual(answers, [true, false, "circular", "grid"]);
    });
});
