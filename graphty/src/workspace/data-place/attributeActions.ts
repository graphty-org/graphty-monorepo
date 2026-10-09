import type { ColumnRef, GraphSession } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import { addLabelRow } from "../style/row";
import { NEW, openStepEditor } from "./filterSteps";
import { labelRefusalWords } from "./words";

/** One verb on an attribute: its words, why it cannot run now (or null), and what it does. */
export interface AttributeAction {
    readonly label: string;
    readonly disabledReason: string | null;
    readonly run: () => void;
}

/**
 * Why Add label line cannot bind an attribute, in the app's words, or null when it can.
 * @param session - the element's session.
 * @param column - the node attribute.
 * @returns the reason, or null.
 */
function labelRefusalFor(session: GraphSession, column: ColumnRef): string | null {
    try {
        const proposal = session.styles.proposeEncoding({ column, channel: "node.label" });
        return proposal.ok ? null : labelRefusalWords(proposal.refusal);
    } catch {
        // The attribute went away under the open menu.
        return "No longer in the data";
    }
}

/**
 * The verbs on one attribute, the same wherever it is picked (the Data place's row menu and the
 * attribute inspector's "..."): Add label line on a node attribute, Filter to... on a number or
 * category attribute, and Show in table once the table dock is built.
 * @param column - the attribute.
 * @param session - the element's session, or null.
 * @param store - the chrome store.
 * @param tableBuilt - whether the table dock is built.
 * @returns the verbs, possibly none.
 */
function attributeActions(
    column: ColumnRef,
    session: GraphSession | null,
    store: WorkspaceStore,
    tableBuilt: boolean,
): AttributeAction[] {
    const actions: AttributeAction[] = [];
    if (column.kind === "node" && session !== null) {
        actions.push({
            label: "Add label line",
            disabledReason: labelRefusalFor(session, column),
            // A new row on top whose label is bound to the attribute. It lands selected, so the
            // inspector shows it; a refusal is one Problem notice.
            run: () => {
                addLabelRow(session, column).then(
                    (layer) => {
                        store.set({ inspected: { kind: "layer-row", id: layer.id } });
                    },
                    () => {
                        store.set({
                            notice: {
                                message: `Could not add a label line from "${column.name}". Pick another attribute.`,
                            },
                        });
                    },
                );
            },
        });
    }
    // A number or a category column can be filtered on; the editor opens with it filled.
    const descriptor = session?.data.attributes().find((a) => a.kind === column.kind && a.name === column.name);
    if (
        descriptor !== undefined &&
        (descriptor.type === "number" || descriptor.type === "integer" || descriptor.measurement === "categorical")
    ) {
        actions.push({
            label: "Filter to...",
            disabledReason: null,
            run: () => {
                openStepEditor(store, `${NEW}:${descriptor.kind}:${descriptor.path}`);
            },
        });
    }
    if (tableBuilt) {
        actions.push({
            label: "Show in table",
            disabledReason: null,
            run: () => {
                store.set({
                    dockOpen: true,
                    dockTab: column.kind === "node" ? "nodes" : "edges",
                    dockColumn: `a:${column.name}`,
                });
            },
        });
    }
    return actions;
}

/**
 * The verbs on one attribute, for whatever draws its menu.
 * @returns a function of the attribute (or null for none) giving its verbs, possibly none.
 */
export function useAttributeActions(): (column: ColumnRef | null) => AttributeAction[] {
    const { session, store } = useWorkspace();
    const tableBuilt = useCommand("table.toggle") !== null;
    return (column) => (column === null ? [] : attributeActions(column, session, store, tableBuilt));
}
