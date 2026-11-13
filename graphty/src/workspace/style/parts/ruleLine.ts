/**
 * The one line that says which nodes or edges a layer applies to, in plain words: "class is Tool or
 * Input", "degree 5 to 12". Drawn in place of the rule's chips when the panel is folded.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

import { type Card, cardWords, isFinished } from "../cards";
import { valueName } from "../words";

/**
 * One card in words: a category reads "class is Tool or Input"; every other card as its chip does.
 * @param session - the element's session.
 * @param card - the card.
 * @returns the words.
 */
function cardLine(session: GraphSession, card: Card): string {
    if (card.type === "category" && card.match !== "present" && card.match !== "absent" && card.values.length > 0) {
        const named = [
            ...card.values.map((value) => valueName(session, card.field.path, value)),
            ...(card.gaps ? ["no value"] : []),
        ];
        return `${card.field.name} is ${named.join(" or ")}`;
    }
    return cardWords(session, card);
}

/**
 * The rule a layer's cards make, as one line: each finished card in words, joined by "and".
 * @param session - the element's session.
 * @param cards - the layer's cards.
 * @returns the line; empty when no card is finished (the layer applies to every element).
 */
export function ruleLine(session: GraphSession, cards: readonly Card[]): string {
    return cards
        .filter((card) => card.type === "ends" || isFinished(card))
        .map((card) => cardLine(session, card))
        .join(" and ");
}
