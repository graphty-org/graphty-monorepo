/**
 * The one line that says which nodes or edges a layer applies to, in plain words: "class is Tool or
 * Input", "degree 5 to 12", "Every node from the file". Drawn in place of the rule's chips when the
 * panel is folded.
 */

import { fileStyleOf, type FileStyleOrigin, type GraphSession } from "@graphty/graphty-element/session";

import { rowLayers } from "../../graph-place/rows";
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
 * Which elements a layer made from a file's styles applies to, from its facts: its selector reads
 * a mark the load left on them, which says nothing to a reader.
 * @param session - the element's session.
 * @param origin - the layer's facts.
 * @param side - nodes or edges.
 * @returns the words.
 */
function fileLine(session: GraphSession, origin: FileStyleOrigin, side: "node" | "edge"): string {
    const many = side === "node" ? "Nodes" : "Edges";
    const column = session.data.attributes().find((attribute) => attribute.path === origin.column)?.plainName;
    switch (origin.role) {
        case "defaults":
            return `Every ${side} from the file`;
        case "group":
            return `${many} the file groups together`;
        case "exceptions":
            return `${many} the file styles one by one`;
        case "passthrough":
            return `${many} with their own values in the file`;
        default:
            return column === undefined ? `${many} the file styles` : `${many} the file styles by ${column}`;
    }
}

/**
 * The rule a layer's cards make, as one line: each finished card in words, joined by "and". A layer
 * made from a file's styles says which of the file's elements it styles instead.
 * @param session - the element's session.
 * @param cards - the layer's cards.
 * @param rows - the tree rows the cards are read from.
 * @param side - nodes or edges.
 * @returns the line; empty when no card is finished (the layer applies to every element).
 */
export function ruleLine(
    session: GraphSession,
    cards: readonly Card[],
    rows: readonly string[] = [],
    side: "node" | "edge" = "node",
): string {
    const origins = rows.flatMap((row) =>
        rowLayers(session, row).flatMap((id) => {
            const layer = session.styles.get(id);
            const origin = layer?.target === side ? fileStyleOf(layer) : null;
            return origin === null ? [] : [origin];
        }),
    );
    const [first] = origins;
    if (first !== undefined && origins.length === rows.length) {
        const lines = new Set(origins.map((origin) => fileLine(session, origin, side)));
        return lines.size === 1 ? fileLine(session, first, side) : "";
    }
    return cards
        .filter((card) => card.type === "ends" || isFinished(card))
        .map((card) => cardLine(session, card))
        .join(" and ");
}
