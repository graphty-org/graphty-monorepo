import { type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { GLYPHS, VALUE_GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { type DataChoice, propose, type Target } from "./row";
import { useStyleVersion } from "./useStyleVersion";
import {
    FIND_ATTRIBUTE,
    LAYER_SPOKEN,
    LAYER_TOKEN,
    matchesWordStart,
    prefixFirst,
    readableName,
    refusalWords,
    valueFact,
} from "./words";

/** Props for ValuePicker. */
interface ValuePickerProps {
    /** The title of the pop-out it sits in: the picker's accessible name. */
    title: string;
    /** Whose values: nodes' or edges'. @default "node" */
    target?: Target;
    /** The property the pick goes on; what it cannot take folds into one closing row. Without one, nothing is refused. */
    channel?: Channel;
    /** Paths this line reads, listed first under "In use"; a value other lines read is listed under "Used elsewhere". */
    inUse?: readonly string[];
    /** Called with the reader's pick. */
    onPick?: (choice: DataChoice) => void;
    /** Called by Escape. */
    onClose?: () => void;
    /** A first choice that keeps the field's own value ("Fixed size"), named by this. */
    fixedLabel?: string;
    /** Called when the reader picks `fixedLabel`. */
    onFixed?: () => void;
    /** Whether `fixedLabel` is what the line holds now (typed words): the list opens marking it. */
    fixedInForce?: boolean;
    /**
     * Several layers edited together: a first choice, "Layer", that gives each of them its own
     * value in list order. `count` is how many layers it reaches.
     */
    byLayer?: { readonly count: number; readonly onPick: () => void };
}

/** A run's fields that only reorder its main value. */
const RANK_FIELDS: ReadonlySet<string> = new Set(["rank", "percentile"]);

/** The text channels, which offer a run's rank and percentile; every other channel is a look. */
const TEXT_CHANNEL = /\.(label|tooltip|arrowHeadText|arrowTailText)$/;

/** The key of the `fixedLabel` row; entry keys are the values' paths. */
const FIXED = "fixed";
/** The key of the "Layer" row. */
const LAYER = "layer";
/** The key of the closing row that folds what the property cannot take. */
const FOLD = "fold";

/**
 * Why the list is empty, and where to go: edges that carry no values of their own can still be
 * painted from the node values of a layer that paints both.
 * @param target - nodes or edges.
 * @returns the words.
 */
function emptyWords(target: Target): string {
    return target === "edge"
        ? "The edges carry no values. To paint by a node value, turn on Style nodes in the Node tab."
        : "The nodes carry no values yet. Load data or run an analysis.";
}

/** One value the picker offers, before it becomes a palette row. */
interface Entry {
    readonly key: string;
    readonly name: string;
    readonly section: string;
    readonly choice: DataChoice;
    readonly icon: React.ReactNode;
    /** One fact that tells this value from its neighbors ("1 to 36", "6 values"). */
    readonly fact?: string;
    /** The name a technical reader knows it by; a search finds it too. */
    readonly technicalName: string;
    /** Read by this line. */
    readonly inUse: boolean;
    /** Read by another line or layer, not this one. */
    readonly usedElsewhere: boolean;
}

/**
 * Everything the picker offers, in the element's order (`data.readableValues`): the data's
 * columns, then each finished run's fields under the run's name, named as the rule editor names
 * them (`readableName`). The node id is left out: it drives no property. A data column that only
 * spells each node's id is listed last, as "Node id" under Structure, as Add a condition lists it.
 * Without `ranks`, a run's rank and percentile are left out too.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param inUse - paths this line reads.
 * @param ranks - whether to list a run's rank and percentile (text offers them; a look does not).
 * @returns the entries.
 */
function entriesOf(session: GraphSession, target: Target, inUse: readonly string[], ranks = true): Entry[] {
    const entries: Entry[] = [];
    const ids: Entry[] = [];
    for (const value of session.data.readableValues()) {
        // A node value read at an edge's end waits until the picker words it as the end's.
        if (value.on !== target || value.from === "element" || value.end !== undefined) {
            continue;
        }
        const run = value.runId === undefined ? undefined : session.runs.get(value.runId);
        let choice: DataChoice | undefined;
        if (value.from === "data") {
            choice = { kind: "column", column: { kind: target, name: value.path.slice("data.".length) } };
        } else if (run !== undefined) {
            choice = {
                kind: "result",
                runId: run.id,
                field: value.path.slice(session.results.path(run.id, "").length),
            };
        }
        // A look lists each measure once: its rank and percentile only reorder it, which the Equal
        // counts scale already does, and a rank runs backwards on a ramp.
        if (choice === undefined || (!ranks && choice.kind === "result" && RANK_FIELDS.has(choice.field))) {
            continue;
        }
        const Glyph = VALUE_GLYPHS[value.kind];
        const { name, group } =
            value.holdsNodeIds === true ? { name: "Node id", group: "Structure" } : readableName(session, value);
        (value.holdsNodeIds === true ? ids : entries).push({
            key: value.path,
            name,
            section: group,
            choice,
            icon: <Glyph size={14} aria-hidden />,
            fact: valueFact(value),
            technicalName: value.technicalName,
            inUse: inUse.includes(value.path),
            usedElsewhere: !inUse.includes(value.path) && value.usedBy?.some((use) => use.kind === "layer") === true,
        });
    }
    // Every such column spells the same ids: one row stands for them all.
    return [...entries, ...ids.slice(0, 1)];
}

/**
 * Why the folded rows do not fit, from each row's own reason: "holds groups, not amounts", or with
 * several reasons, how many rows each covers ("holds groups, not amounts (3), has no values (2)").
 * @param refused - the folded rows, each described by its reason.
 * @returns the words.
 */
function foldWhy(refused: readonly QuickAction[]): string {
    const counts = new Map<string, number>();
    for (const row of refused) {
        const why = row.description ?? "";
        counts.set(why, (counts.get(why) ?? 0) + 1);
    }
    const lower = (why: string): string => why.charAt(0).toLowerCase() + why.slice(1);
    if (counts.size === 1) {
        return lower([...counts.keys()][0]);
    }
    return [...counts]
        .sort((a, b) => b[1] - a[1])
        .map(([why, n]) => `${lower(why)} (${String(n)})`)
        .join(", ");
}

/**
 * The value picker (tier3 design, decision 1.5), Figma's "apply variable" list: a search focused on
 * open, then In use (what this line reads), Used elsewhere (what other lines and layers read),
 * Data, and one group per run, one fact per row. What the property cannot take
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
 * @param props.fixedInForce - whether the line holds typed words, so the fixed row is marked
 * @param props.byLayer - several layers: the "Layer" choice
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
    fixedInForce = false,
    byLayer,
}: Readonly<ValuePickerProps>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const [unfolded, setUnfolded] = useState(false);
    const [query, setQuery] = useState("");
    if (session === null) {
        return null;
    }

    const entries = entriesOf(session, target, inUse, channel === undefined || TEXT_CHANNEL.test(channel));
    const fits: QuickAction[] = [];
    const used: QuickAction[] = [];
    const elsewhere: QuickAction[] = [];
    const refused: QuickAction[] = [];
    for (const entry of entries) {
        const proposal = channel === undefined ? null : propose(session, entry.choice, channel);
        const row = {
            value: entry.key,
            label: entry.name,
            icon: entry.icon,
            description: entry.fact,
            keywords: [entry.technicalName],
        };
        if (proposal !== null && !proposal.ok) {
            refused.push({
                ...row,
                section: "Does not fit",
                description: refusalWords(proposal.refusal),
                disabled: true,
            });
        } else if (entry.inUse) {
            used.push({ ...row, section: "In use" });
        } else if (entry.usedElsewhere) {
            elsewhere.push({ ...row, section: "Used elsewhere" });
        } else {
            fits.push({ ...row, section: entry.section });
        }
    }
    // Each folded row is an attribute the property cannot take, so they are counted as attributes.
    const foldedCount = refused.length === 1 ? "1 attribute" : `${String(refused.length)} attributes`;
    const fold: QuickAction[] =
        refused.length === 0 || channel === undefined
            ? []
            : [
                  {
                      value: FOLD,
                      // Under the "Does not fit" heading the count says the rest, and fits the
                      // 240 px list beside "Show why" (the property's name cut it short).
                      label: foldedCount,
                      // A list option cannot carry aria-expanded, so its name says whether the
                      // values it folds are shown, and while they are hidden, why they do not fit.
                      "aria-label": unfolded
                          ? `${foldedCount}, shown, Hide them`
                          : `${foldedCount}, hidden, ${foldWhy(refused)}, Show why`,
                      description: unfolded ? "Hide them" : "Show why",
                      section: "Does not fit",
                  },
              ];

    // The list opens on the value in force (the one this line reads, or its typed words), as a
    // select opens on its value.
    const inForce = inUse.find((path) => used.some((row) => row.value === path)) ?? (fixedInForce ? FIXED : undefined);

    return (
        // Tab leaves the list: it closes, as a select's list does, and focus goes back to what
        // opened it rather than on into the panel behind it.
        <div
            style={{ display: "contents" }}
            onKeyDown={(event) => {
                if (event.key === "Tab" && onClose !== undefined) {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <QuickActions
                role="group"
                aria-label={title}
                placeholder={FIND_ATTRIBUTE}
                width={240}
                height={320}
                descriptions="end"
                emptyText={entries.length === 0 ? emptyWords(target) : undefined}
                highlight={inForce}
                // Nothing is active until the reader types or arrows, so Enter on open picks nothing.
                activeOnOpen="none"
                query={query}
                onQueryChange={setQuery}
                actions={prefixFirst(
                    [
                        ...(fixedLabel === undefined ? [] : [{ value: FIXED, label: fixedLabel }]),
                        ...(byLayer === undefined
                            ? []
                            : [
                                  {
                                      value: LAYER,
                                      // Set off as the bulk field's source is, and named in words, never the marks.
                                      label: LAYER_TOKEN,
                                      "aria-label": `${LAYER_SPOKEN.charAt(0).toUpperCase()}${LAYER_SPOKEN.slice(1)}, ${String(byLayer.count)} layers`,
                                      tone: "component" as const,
                                      icon: <GLYPHS.layer size={14} aria-hidden />,
                                      description: `${String(byLayer.count)} layers`,
                                      keywords: ["layer", "selected layers", "each layer"],
                                      section: "Selected layers",
                                  },
                              ]),
                        ...used,
                        ...elsewhere,
                        ...fits,
                        ...fold,
                        ...refused,
                    ],
                    (action) => action.label,
                    query,
                )}
                filter={(action, query) => {
                    const searching = query.trim() !== "";
                    if (action.value === FOLD) {
                        return !searching;
                    }
                    // Folded until opened; a search finds them anyway, each with its reason.
                    if (action.disabled === true && !searching && !unfolded) {
                        return false;
                    }
                    return [action.label, ...(action.keywords ?? [])].some((words) => matchesWordStart(words, query));
                }}
                onRun={(key) => {
                    if (key === FIXED) {
                        onFixed?.();
                        return;
                    }
                    if (key === LAYER) {
                        byLayer?.onPick();
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
        </div>
    );
}
