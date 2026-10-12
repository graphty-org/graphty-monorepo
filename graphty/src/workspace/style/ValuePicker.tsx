import { type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { typeOf } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { runName } from "../runWords";
import { useWorkspace } from "../state/WorkspaceContext";
import { type DataChoice, propose, type Target } from "./row";
import { useStyleVersion } from "./useStyleVersion";
import { channelWord, matchesWordStart, refusalWords, resultWord } from "./words";

/** Props for ValuePicker. */
interface ValuePickerProps {
    /** Whose values: nodes' or edges'. @default "node" */
    target?: Target;
    /** The property the pick goes on; what it cannot take folds into one closing row. Without one, nothing is refused. */
    channel?: Channel;
    /** Paths in use on this row, listed under "In use" beside every column a layer already reads. */
    inUse?: readonly string[];
    /** Called with the reader's pick. */
    onPick?: (choice: DataChoice) => void;
    /** Called by Escape. */
    onClose?: () => void;
    /** A first choice that keeps the field's own value ("Fixed size"), named by this. */
    fixedLabel?: string;
    /** Called when the reader picks `fixedLabel`. */
    onFixed?: () => void;
}

/** The key of the `fixedLabel` row; entry keys start "column:" or "result:". */
const FIXED = "fixed";
/** The key of the closing row that folds what the property cannot take. */
const FOLD = "fold";

/** One value the picker offers, before it becomes a palette row. */
interface Entry {
    readonly key: string;
    readonly name: string;
    readonly section: string;
    readonly choice: DataChoice;
    readonly icon: React.ReactNode;
    /** One fact that tells this value from its neighbors ("1 to 36", "6 values"). */
    readonly fact?: string;
    readonly inUse: boolean;
}

/**
 * One fact about a column, from the element's descriptor (never its values): the range of an
 * amount, the count of groups, else how many elements have a value.
 * @param column - the descriptor.
 * @returns the fact, or undefined when there is nothing to say.
 */
function factOf(column: AttributeDescriptor): string | undefined {
    if (column.measurement === "quantitative" && column.min !== undefined && column.max !== undefined) {
        return `${formatNumber(column.min)} to ${formatNumber(column.max)}`;
    }
    if (column.measurement !== undefined && column.uniqueCount !== undefined) {
        return column.uniqueCount === 1 ? "1 value" : `${formatNumber(column.uniqueCount)} values`;
    }
    if (column.completeness < 1) {
        return `${String(Math.floor(column.completeness * 100))}% have a value`;
    }
    return undefined;
}

/**
 * Everything the picker offers, in the element's order: the data's columns, then each finished
 * run's results under the run's name. A run's results are listed under the run, not again as data.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param inUse - paths the caller counts as in use.
 * @returns the entries.
 */
function entriesOf(session: GraphSession, target: Target, inUse: readonly string[]): Entry[] {
    const entries: Entry[] = [];
    for (const column of session.data.attributes()) {
        if (column.kind !== target || column.origin === "result") {
            continue;
        }
        const { glyph } = typeOf(column.measurement);
        const Glyph = glyph === "result" ? GLYPHS.measure : GLYPHS[glyph];
        entries.push({
            key: `column:${column.name}`,
            name: column.name,
            section: "Data",
            choice: { kind: "column", column: { kind: column.kind, name: column.name } },
            icon: <Glyph size={14} aria-hidden />,
            fact: factOf(column),
            inUse: column.usedBy !== undefined || inUse.includes(column.path),
        });
    }
    for (const run of session.runs.list().filter((r) => r.status === "succeeded")) {
        const primary = session.results.path(run.id);
        const runLabel = runName(session, run);
        for (const field of run.fields.filter((f) => f.kind === target)) {
            const path = session.results.path(run.id, field.name);
            entries.push({
                key: `result:${run.id}:${field.name}`,
                name: resultWord(runLabel, field.name, path === primary),
                section: runLabel,
                choice: { kind: "result", runId: run.id, field: field.name },
                icon: <GLYPHS.measure size={14} aria-hidden />,
                inUse: inUse.includes(path),
            });
        }
    }
    return entries;
}

/**
 * The value picker (tier3 design, decision 1.5), Figma's "apply variable" list: a search focused on
 * open, then In use, Data, and one group per run, one fact per row. What the property cannot take
 * (graphty-element's `styles.proposeEncoding`, which reads only the cached column descriptors)
 * folds into one closing row; running it lists each with the element's reason. A search also finds
 * the folded ones, with their reason. The vary glyph, "=" in a number field, the label source and
 * the binding's Change source open it.
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.channel - the property the pick goes on
 * @param props.inUse - paths in use on this row
 * @param props.onPick - called with the pick
 * @param props.onClose - called by Escape
 * @param props.fixedLabel - a first choice that keeps the field's own value
 * @param props.onFixed - called when the reader picks it
 * @returns The picker, or nothing before the element has come up
 */
export function ValuePicker({
    target = "node",
    channel,
    inUse = [],
    onPick,
    onClose,
    fixedLabel,
    onFixed,
}: Readonly<ValuePickerProps>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const [unfolded, setUnfolded] = useState(false);
    if (session === null) {
        return null;
    }

    const entries = entriesOf(session, target, inUse);
    const fits: QuickAction[] = [];
    const used: QuickAction[] = [];
    const refused: QuickAction[] = [];
    for (const entry of entries) {
        const proposal = channel === undefined ? null : propose(session, entry.choice, channel);
        const row = { value: entry.key, label: entry.name, icon: entry.icon, description: entry.fact };
        if (proposal !== null && !proposal.ok) {
            refused.push({
                ...row,
                section: "Does not fit",
                description: refusalWords(proposal.refusal),
                disabled: true,
            });
        } else {
            (entry.inUse ? used : fits).push({ ...row, section: entry.inUse ? "In use" : entry.section });
        }
    }
    const fold: QuickAction[] =
        refused.length === 0 || channel === undefined
            ? []
            : [
                  {
                      value: FOLD,
                      label: `${String(refused.length)} that do not fit ${channelWord(channel).toLowerCase()}`,
                      description: unfolded ? "Hide them" : "Show why",
                      section: "Does not fit",
                  },
              ];

    return (
        <QuickActions
            aria-label="From data"
            placeholder="Find a value"
            width={240}
            height={320}
            actions={[
                ...(fixedLabel === undefined ? [] : [{ value: FIXED, label: fixedLabel }]),
                ...used,
                ...fits,
                ...fold,
                ...refused,
            ]}
            filter={(action, query) => {
                const searching = query.trim() !== "";
                if (action.value === FOLD) {
                    return !searching;
                }
                // Folded until opened; a search finds them anyway, each with its reason.
                if (action.disabled === true && !searching && !unfolded) {
                    return false;
                }
                return matchesWordStart(action.label, query);
            }}
            onRun={(key) => {
                if (key === FIXED) {
                    onFixed?.();
                    return;
                }
                if (key === FOLD) {
                    setUnfolded(!unfolded);
                    return;
                }
                const entry = entries.find((e) => e.key === key);
                if (entry !== undefined) {
                    onPick?.(entry.choice);
                }
            }}
            onClose={onClose}
        />
    );
}
