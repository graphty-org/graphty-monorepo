import type { ColumnRef, GraphSession } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import { labelLine } from "../style/commands";
import { designate } from "../time/timeActions";
import { openFilterDraft } from "./filterCards";
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
 * category attribute, Set in Data (the time), and Show in table once the table dock is built.
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
            // The Text "+" label line, on the inspected layer row or Everything; a refusal is one
            // Problem notice.
            run: () => {
                labelLine(session, store, column).catch(() => {
                    store.set({
                        notice: {
                            message: `Could not add a label line from "${column.name}". Pick another attribute.`,
                        },
                    });
                });
            },
        });
    }
    // A number or a category column can be filtered on: a new filter card opens on it.
    const descriptor = session?.data.attributes().find((a) => a.kind === column.kind && a.name === column.name);
    if (
        descriptor !== undefined &&
        (descriptor.type === "number" || descriptor.type === "integer" || descriptor.measurement === "categorical")
    ) {
        actions.push({
            label: "Filter to...",
            disabledReason: null,
            run: () => {
                openFilterDraft(store, `${descriptor.kind}:${descriptor.path}`);
            },
        });
    }
    // Any column can be the time field; the Time section sets its unit and how the window moves.
    if (descriptor !== undefined && descriptor.origin !== "result" && session !== null) {
        const source = { start: descriptor.name };
        const isTime =
            (column.kind === "edge" ? session.time.field?.edges : session.time.field?.nodes)?.start === descriptor.name;
        actions.push({
            // A door to the time's home, Data > Fields, with the Time entry set to this column (R10).
            label: "Set in Data",
            disabledReason: isTime ? "Already the time field" : null,
            run: () => {
                const side = column.kind === "edge" ? "edges" : "nodes";
                designate(session, store, { [side]: source });
                store.set({ page: "panels", place: "data", fieldsEntry: `${side}:time` });
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
