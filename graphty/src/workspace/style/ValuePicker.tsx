import { type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { ReadableValue } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { runName } from "../runWords";
import { useWorkspace } from "../state/WorkspaceContext";
import { type DataChoice, propose, type Target } from "./row";
import { useStyleVersion } from "./useStyleVersion";
import { channelWord, matchesWordStart, refusalWords, resultWord } from "./words";

/** Props for ValuePicker. */
interface ValuePickerProps {
    /** The title of the pop-out it sits in: the picker's accessible name. */
    title: string;
    /** Whose values: nodes' or edges'. @default "node" */
    target?: Target;
    /** The property the pick goes on; what it cannot take folds into one closing row. Without one, nothing is refused. */
    channel?: Channel;
    /** Paths in use on this row, listed under "In use" beside every value a layer already reads. */
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

/** The key of the `fixedLabel` row; entry keys are the values' paths. */
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
 * One fact about a value, from the element's list (never its values): the range of a number, the
 * count of groups, else how many elements have a value.
 * @param value - the element's entry.
 * @returns the fact, or undefined when there is nothing to say.
 */
function factOf(value: ReadableValue): string | undefined {
    if (value.range !== undefined) {
        return `${formatNumber(value.range.min)} to ${formatNumber(value.range.max)}`;
    }
    if (value.valueCount !== undefined) {
        return value.valueCount === 1 ? "1 value" : `${formatNumber(value.valueCount)} values`;
    }
    if (value.completeness < 1) {
        return `${String(Math.floor(value.completeness * 100))}% have a value`;
    }
    return undefined;
}

/**
 * Everything the picker offers, in the element's order (`data.readableValues`): the data's
 * columns, then each finished run's fields under the run's name. The node id is left out: it
 * drives no property.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param inUse - paths the caller counts as in use.
 * @returns the entries.
 */
function entriesOf(session: GraphSession, target: Target, inUse: readonly string[]): Entry[] {
    const entries: Entry[] = [];
    for (const value of session.data.readableValues()) {
        // A node value read at an edge's end waits until the picker words it as the end's.
        if (value.on !== target || value.from === "element" || value.end !== undefined) {
            continue;
        }
        let Glyph = GLYPHS.category;
        if (value.from === "run") {
            Glyph = GLYPHS.measure;
        } else if (value.kind === "number") {
            Glyph = GLYPHS.number;
        }
        const used = value.usedBy?.some((use) => use.kind === "layer") === true || inUse.includes(value.path);
        const base = { key: value.path, icon: <Glyph size={14} aria-hidden />, fact: factOf(value), inUse: used };
        const run = value.runId === undefined ? undefined : session.runs.get(value.runId);
        if (value.from === "data") {
            const name = value.path.slice("data.".length);
            entries.push({
                ...base,
                name,
                section: "Data",
                choice: { kind: "column", column: { kind: target, name } },
            });
        } else if (run !== undefined) {
            const field = value.path.slice(session.results.path(run.id, "").length);
            const runLabel = runName(session, run);
            entries.push({
                ...base,
                name: resultWord(runLabel, field, value.path === session.results.path(run.id)),
                section: runLabel,
                choice: { kind: "result", runId: run.id, field },
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
 * the binding's Change source open it. It sits inside a pop-out, so it is a group named by that
 * pop-out's title rather than a second dialog.
 * @param props - Component props
 * @param props.title - the pop-out's title
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
    title,
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
            role="group"
            aria-label={title}
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
