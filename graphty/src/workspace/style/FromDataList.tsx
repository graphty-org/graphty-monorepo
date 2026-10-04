import { type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/schema";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { type DataChoice, propose, type Target } from "./row";
import { useStyleVersion } from "./useStyleVersion";
import { matchesWordStart, refusalWords } from "./words";

/** Props for FromDataList. */
interface FromDataListProps {
    /** Whose attributes: nodes' or edges'. @default "node" */
    target?: Target;
    /** The property the pick goes on; the element refuses what it cannot take. Without one, nothing is refused. */
    channel?: Channel;
    /** Paths already in use on this row: listed first, under "In use". */
    inUse?: readonly string[];
    /** Called with the reader's pick. */
    onPick?: (choice: DataChoice) => void;
    /** Called by Escape. */
    onClose?: () => void;
}

/** One entry before it becomes a palette row. */
interface Entry {
    readonly key: string;
    readonly name: string;
    readonly path: string;
    readonly section: string;
    readonly choice: DataChoice;
}

/**
 * The From data list (tier1-design.md section 2.8): the element's attributes, then each run's
 * results under the run's name. What the property cannot take is listed last, disabled, with the
 * element's reason in words; "In use" comes first. The Style tab's bind icon, the label line and
 * the table's Columns chooser open it.
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.channel - the property the pick goes on
 * @param props.inUse - paths in use on this row
 * @param props.onPick - called with the pick
 * @param props.onClose - called by Escape
 * @returns The list, or nothing before the element has come up
 */
export function FromDataList({
    target = "node",
    channel,
    inUse = [],
    onPick,
    onClose,
}: FromDataListProps): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }

    const entries: Entry[] = [];
    for (const column of session.data.attributes()) {
        if (column.kind === target) {
            entries.push({
                key: `column:${column.name}`,
                name: column.name,
                path: column.path,
                section: "Attributes",
                choice: { kind: "column", column: { kind: column.kind, name: column.name } },
            });
        }
    }
    for (const run of session.runs.list()) {
        if (run.status !== "succeeded") {
            continue;
        }
        for (const field of run.fields) {
            if (field.kind === target) {
                entries.push({
                    key: `result:${run.id}:${field.name}`,
                    name: field.name,
                    path: session.results.path(run.id, field.name),
                    section: run.label,
                    choice: { kind: "result", runId: run.id, field: field.name },
                });
            }
        }
    }

    const usable: QuickAction[] = [];
    const refused: QuickAction[] = [];
    for (const entry of entries) {
        const proposal = channel === undefined ? null : propose(session, entry.choice, channel);
        if (proposal !== null && !proposal.ok) {
            refused.push({
                value: entry.key,
                label: `${entry.name} (${refusalWords(proposal.refusal)})`,
                section: "Cannot be used",
                disabled: true,
            });
            continue;
        }
        const action = { value: entry.key, label: entry.name, section: entry.section };
        if (inUse.includes(entry.path)) {
            usable.unshift({ ...action, section: "In use" });
        } else {
            usable.push(action);
        }
    }

    return (
        <QuickActions
            aria-label="From data"
            placeholder="Find an attribute"
            width={240}
            height={320}
            actions={[...usable, ...refused]}
            filter={(action, query) => matchesWordStart(action.label, query)}
            onRun={(key) => {
                const entry = entries.find((e) => e.key === key);
                if (entry !== undefined) {
                    onPick?.(entry.choice);
                }
            }}
            onClose={onClose}
        />
    );
}
