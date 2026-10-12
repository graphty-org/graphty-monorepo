/**
 * The assistant's cards in an immersive session: approve and deny a held change, one control per
 * choice of a question, and the reader's words with the answer. A card draws only data -- the
 * catalog's `plainName` of each held call, its arguments as text, the model's question, choices and
 * answer, the reader's transcript -- an icon, and the host's `xr.ai.labels` for its code. The
 * element draws no words of its own. Reached only by `import()` with `voice`.
 * @module ai/voice/XrPendingControl
 */

import {
    DynamicTexture,
    Mesh,
    MeshBuilder,
    type Observer,
    PointerEventTypes,
    type PointerInfo,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";

import type { AiResultCode } from "../../catalog/ai";
import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import type { AiApprovalRequest, AiQuestionRequest } from "../../events";

/** What a card's icon shows. */
export type XrCardIcon = "approval" | "approve" | "deny" | "question" | "choice" | "transcript" | "answer";

/** One card: its code (for its label), its icon, its data lines, and what pressing it does. */
export interface XrCard {
    readonly code: string;
    readonly icon: XrCardIcon;
    /** The lines drawn: the label for `code` when the host gave one, then the data. */
    readonly lines: readonly string[];
    /** Pressing the card (pointing at it and pulling the trigger or pinching); absent, not pressable. */
    readonly act?: () => void;
}

/** The words the host gave, keyed by code. */
export type XrLabels = Readonly<Record<string, string>>;

/**
 * A card's lines: the host's label for its code, if any, then the data.
 * @param labels - The host's words.
 * @param code - The card's code.
 * @param data - The data it shows.
 * @returns The lines.
 */
function lines(labels: XrLabels, code: string, data: readonly string[]): string[] {
    const label = labels[code];
    return [...(label === undefined || label === "" ? [] : [label]), ...data.filter((line) => line !== "")];
}

/**
 * The cards for a held change: what is held (each call's catalog name and its arguments), then
 * approve and deny.
 * @param request - The held change.
 * @param labels - The host's words.
 * @param answer - Answers it.
 * @returns The cards.
 */
export function approvalCards(
    request: AiApprovalRequest,
    labels: XrLabels,
    answer: (approve: boolean) => void,
): XrCard[] {
    const held = request.calls.flatMap((call) => [
        ASSISTANT_TOOLS.find((tool) => tool.name === call.tool)?.plainName ?? call.tool,
        JSON.stringify(call.arguments),
    ]);
    const code: AiResultCode = "AI_CONFIRMATION_NEEDED";
    return [
        { code, icon: "approval", lines: lines(labels, code, held) },
        {
            code: "XR_APPROVE",
            icon: "approve",
            lines: lines(labels, "XR_APPROVE", []),
            act: () => {
                answer(true);
            },
        },
        {
            code: "XR_DENY",
            icon: "deny",
            lines: lines(labels, "XR_DENY", []),
            act: () => {
                answer(false);
            },
        },
    ];
}

/**
 * The cards for a question: the model's question, then one per choice.
 * @param request - The question.
 * @param labels - The host's words.
 * @param answer - Answers it with a choice.
 * @returns The cards.
 */
export function questionCards(
    request: AiQuestionRequest,
    labels: XrLabels,
    answer: (choice: string) => void,
): XrCard[] {
    const code: AiResultCode = "AI_QUESTION_ASKED";
    return [
        { code, icon: "question", lines: lines(labels, code, [request.question]) },
        ...request.choices.map((choice): XrCard => ({
            code: "XR_CHOICE",
            icon: "choice",
            lines: [choice],
            act: () => {
                answer(choice);
            },
        })),
    ];
}

/**
 * The cards for what the reader said and what the model answered.
 * @param transcript - The reader's words, as heard; empty for none yet.
 * @param answer - The answer's code and the model's text, when it came.
 * @param answer.code - Its result code.
 * @param answer.text - The model's text; empty for none.
 * @param labels - The host's words.
 * @returns The cards.
 */
export function panelCards(
    transcript: string,
    answer: { code: string; text: string } | undefined,
    labels: XrLabels,
): XrCard[] {
    const cards: XrCard[] = [];
    if (transcript !== "") {
        cards.push({ code: "XR_TRANSCRIPT", icon: "transcript", lines: lines(labels, "XR_TRANSCRIPT", [transcript]) });
    }

    if (answer !== undefined) {
        cards.push({ code: answer.code, icon: "answer", lines: lines(labels, answer.code, [answer.text]) });
    }

    return cards;
}

/** What a card is painted on: the part of the canvas 2D context it uses. */
export type CardCanvas = Pick<
    CanvasRenderingContext2D,
    | "fillStyle"
    | "strokeStyle"
    | "lineWidth"
    | "font"
    | "textBaseline"
    | "fillRect"
    | "fillText"
    | "beginPath"
    | "moveTo"
    | "lineTo"
    | "arc"
    | "stroke"
    | "fill"
>;

/** Card texture size, in pixels. */
export const CARD_WIDTH = 1024;
export const CARD_LINE_HEIGHT = 44;
const ICON = 64;
const PAD = 16;

/**
 * The card's height for its lines.
 * @param card - The card.
 * @returns Its height in pixels.
 */
export function cardHeight(card: XrCard): number {
    return Math.max(ICON + 2 * PAD, card.lines.length * CARD_LINE_HEIGHT + 2 * PAD);
}

/**
 * Draw an icon as shapes: no text.
 * @param ctx - The canvas.
 * @param icon - Which.
 */
function paintIcon(ctx: CardCanvas, icon: XrCardIcon): void {
    const x = PAD;
    const y = PAD;
    const mid = ICON / 2;
    ctx.lineWidth = 8;
    ctx.beginPath();
    switch (icon) {
        case "approve":
            ctx.strokeStyle = "#2e7d32";
            ctx.moveTo(x + 8, y + mid);
            ctx.lineTo(x + mid - 4, y + ICON - 10);
            ctx.lineTo(x + ICON - 6, y + 10);
            break;
        case "deny":
            ctx.strokeStyle = "#c62828";
            ctx.moveTo(x + 10, y + 10);
            ctx.lineTo(x + ICON - 10, y + ICON - 10);
            ctx.moveTo(x + ICON - 10, y + 10);
            ctx.lineTo(x + 10, y + ICON - 10);
            break;
        case "transcript":
            // A microphone: a capsule and its stand.
            ctx.strokeStyle = "#1565c0";
            ctx.moveTo(x + mid, y + 8);
            ctx.lineTo(x + mid, y + mid);
            ctx.moveTo(x + mid - 16, y + mid);
            ctx.arc(x + mid, y + mid, 16, Math.PI, 0, true);
            ctx.moveTo(x + mid, y + mid + 16);
            ctx.lineTo(x + mid, y + ICON - 6);
            break;
        default:
            // A dot, filled for a choice, ringed for a card that only shows.
            ctx.strokeStyle = "#455a64";
            ctx.fillStyle = "#455a64";
            ctx.arc(x + mid, y + mid, icon === "choice" ? 14 : 22, 0, 2 * Math.PI);
            if (icon === "choice") {
                ctx.fill();
            }
    }

    ctx.stroke();
}

/**
 * Paint a card: its background, its icon and its lines, nothing else.
 * @param ctx - The canvas, `CARD_WIDTH` by `cardHeight(card)`.
 * @param card - The card.
 */
export function paintCard(ctx: CardCanvas, card: XrCard): void {
    ctx.fillStyle = card.act === undefined ? "#eceff1" : "#ffffff";
    ctx.fillRect(0, 0, CARD_WIDTH, cardHeight(card));
    paintIcon(ctx, card.icon);
    ctx.fillStyle = "#212121";
    ctx.font = `${CARD_LINE_HEIGHT - 12}px sans-serif`;
    ctx.textBaseline = "top";
    const left = ICON + 2 * PAD;
    card.lines.forEach((line, row) => {
        // ponytail: a long line is squeezed to the card's width, not wrapped.
        ctx.fillText(line, left, PAD + row * CARD_LINE_HEIGHT + 6, CARD_WIDTH - left - PAD);
    });
}

/** Metres per card pixel. */
const SCALE = 0.4 / CARD_WIDTH;

/** A stack of cards floating in front of the reader, where it was when they were shown. */
export class XrCardStack {
    private meshes: Mesh[] = [];
    private readonly picks: Observer<PointerInfo>;

    /**
     * A stack.
     * @param scene - The scene.
     * @param name - Its meshes' name prefix.
     * @param height - Metres above (positive) or below eye level.
     */
    constructor(
        private readonly scene: Scene,
        private readonly name: string,
        private readonly height: number,
    ) {
        // A card is pressed as any mesh is in XR: pointing at it and pulling the trigger or pinching.
        this.picks = scene.onPointerObservable.add((info) => {
            const act = (info.pickInfo?.pickedMesh?.metadata as { xrAiCard?: () => void } | null)?.xrAiCard;
            if (info.type === PointerEventTypes.POINTERUP && act !== undefined) {
                act();
            }
        });
    }

    /**
     * Show these cards in place of what was shown.
     * @param cards - The cards, top first; none hides the stack.
     */
    show(cards: readonly XrCard[]): void {
        this.clear();
        const camera = this.scene.activeCamera;
        if (cards.length === 0 || camera === null) {
            return;
        }

        const forward = camera.getForwardRay(1).direction;
        forward.y = 0;
        const ahead = forward.lengthSquared() < 1e-6 ? new Vector3(0, 0, 1) : forward.normalize();
        let top = camera.globalPosition.add(ahead.scale(0.9)).addInPlaceFromFloats(0, this.height, 0);
        cards.forEach((card, index) => {
            const height = cardHeight(card);
            const name = `${this.name}-${index}`;
            const plane = MeshBuilder.CreatePlane(
                name,
                { width: CARD_WIDTH * SCALE, height: height * SCALE },
                this.scene,
            );
            const texture = new DynamicTexture(name, { width: CARD_WIDTH, height }, this.scene, false);
            paintCard(texture.getContext() as unknown as CardCanvas, card);
            texture.update();
            const material = new StandardMaterial(name, this.scene);
            material.diffuseTexture = texture;
            material.emissiveTexture = texture;
            material.disableLighting = true;
            material.backFaceCulling = false;
            plane.material = material;
            plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
            plane.position = top.subtract(new Vector3(0, (height * SCALE) / 2, 0));
            plane.isPickable = card.act !== undefined;
            plane.metadata = card.act === undefined ? null : { xrAiCard: card.act };
            top = top.subtract(new Vector3(0, height * SCALE + 0.01, 0));
            this.meshes.push(plane);
        });
    }

    /** Remove every card and stop listening. */
    dispose(): void {
        this.clear();
        this.scene.onPointerObservable.remove(this.picks);
    }

    /** Remove every card. */
    private clear(): void {
        for (const mesh of this.meshes) {
            mesh.material?.dispose(true, true);
            mesh.dispose();
        }

        this.meshes = [];
    }
}
