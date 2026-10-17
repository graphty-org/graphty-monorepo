/**
 * The graphty app's look for a selected node: its label drawn as a card (a white rounded panel
 * with a shadow, the node's id in bold, then a row of facts per result the session holds, and an
 * x that clears the selection). It is an ordinary style layer the reader can see, reorder, edit
 * and remove in the layer list; graphty-element draws it and builds its text from the template.
 *
 * The rows read the default-named runs: `degree` and `louvain`, the ids graphty-element gives a
 * run of those algorithms with their default options. A row whose value is missing is left out
 * by the element, so the card shows Connections only once a degree run has published and
 * Community only once a Louvain run has.
 */

import type { GraphSession, LayerSpec } from "@graphty/graphty-element/session";

/** The template id the card layer carries, so it is found by id and never by its name. */
export const SELECTED_CARD_TEMPLATE_ID = "graphty.selected-card";

/** The card layer: only the selected node, and only its label. */
export const SELECTED_CARD_LAYER: LayerSpec = {
    name: "Selected card",
    target: "node",
    source: { by: "template", templateId: SELECTED_CARD_TEMPLATE_ID },
    selector: { match: "member", of: "selection" },
    set: {
        "node.labelStyle": {
            enabled: true,
            background: "#ffffff",
            color: "#14161f",
            cornerRadius: 24,
            borderWidth: 2,
            borderColor: "#c5cad6",
            padding: 16,
            textAlign: "left",
            sizeMode: "screen",
            sizePx: 14,
            panelShadow: true,
            keepInView: true,
            closeButton: true,
            location: "right",
        },
    },
    encode: {
        "node.label": {
            template: [
                "<bold>{data.id}</bold>",
                "Connections: {results.degree.value}",
                "Community {results.louvain.group|rank} of {results.louvain.group|count}",
            ],
        },
    },
};

/** Sessions the card was already offered to, so a reader who removes it is not given it back. */
const offered = new WeakSet<GraphSession>();

/**
 * Add the card layer to a session once: not again for the same session, and not when the stack
 * already holds it (a project file that saved it).
 * @param session - The open project's session.
 * @returns Settles once the layer is in, or at once when nothing was added.
 */
export async function addSelectedCard(session: GraphSession): Promise<void> {
    if (offered.has(session)) {
        return;
    }

    offered.add(session);
    const held = session.styles
        .list()
        .some((layer) => layer.source.by === "template" && layer.source.templateId === SELECTED_CARD_TEMPLATE_ID);
    if (!held) {
        await session.styles.add(SELECTED_CARD_LAYER);
    }
}
