import { SegmentedControl, TooltipShortcut } from "@graphty/compact-mantine";
import type { DraftRing, SourceDraft, SourceDraftMarkCounts } from "@graphty/graphty-element/session";
import { Button, Group, Loader, Text, Tooltip } from "@mantine/core";
import React from "react";

import { ariaKey, formatKey } from "../keys/keys";
import { SIDE_KEY } from "./keys";
import { counted, PREVIEW_WORDS, WORKSPACE_WORDS } from "./words";
import { MERGED_COLOR, NEW_COLOR, REMOVED_COLOR } from "./workspaceCards";

/** One item of the header's key. */
interface KeyItem {
    readonly id: string;
    readonly color: string;
    readonly label: { readonly one: string; readonly many: string };
    readonly count: number;
}

/**
 * The header's key: each effect by the mark the preview draws for it (a ring, a dashed border, a dashed
 * line), then the counts of what is not marked.
 * @param marks - the preview's marks
 * @param rings - the rings the preview draws wider than the merged ring
 * @param colors - whether each card has a color
 * @returns the items
 */
function keyOf(marks: SourceDraftMarkCounts, rings: readonly DraftRing[], colors: boolean): readonly KeyItem[] {
    // While each card has a color, an element is drawn in its card's: the key names the marks alone.
    const markColor = (color: string): string => (colors ? "inherit" : color);
    const items: readonly KeyItem[] = [
        { id: "merged", color: markColor(MERGED_COLOR), label: WORKSPACE_WORDS.nodesMerged, count: marks.nodes.merged },
        // Each wider ring the preview draws, by its own row.
        ...rings.map((ring) => ({
            id: `ring-${ring.kind}`,
            color: markColor(MERGED_COLOR),
            label: WORKSPACE_WORDS.rings[ring.kind],
            count: ring.nodes,
        })),
        { id: "new", color: markColor(NEW_COLOR), label: WORKSPACE_WORDS.nodesNew, count: marks.nodes.new },
        ...(
            [
                ["nodes-removed", REMOVED_COLOR, WORKSPACE_WORDS.nodesRemoved, marks.nodes.removed],
                ["nodes-changed", "inherit", WORKSPACE_WORDS.nodesChanged, marks.nodes.changed ?? 0],
                // Named only where a join leaves nodes of the type it reads unreached.
                ["untouched", "inherit", WORKSPACE_WORDS.untouched, marks.nodes.untouched],
                // The edges after the nodes, in the nodes' order: merged, new, removed, changed.
                ["edges-merged", markColor(MERGED_COLOR), WORKSPACE_WORDS.edgesMerged, marks.edges.merged],
                ["edges", markColor(NEW_COLOR), WORKSPACE_WORDS.edgesNew, marks.edges.new],
                ["edges-removed", REMOVED_COLOR, WORKSPACE_WORDS.edgesRemoved, marks.edges.removed],
                ["edges-changed", "inherit", WORKSPACE_WORDS.edgesChanged, marks.edges.changed ?? 0],
            ] as const
        ).map(([id, color, label, count]) => ({ id, color, label, count })),
    ];
    // What the join leaves as it was is not counted.
    return items.filter((each) => each.count > 0);
}

/**
 * The workspace's header: its title, the preview's look and side, its "..." menu, and how it closes. Cards are
 * renamed on the card, as the Filters workspace's are. Keys are said on hover, never drawn.
 * @param props - Component props
 * @param props.titleId - the id the dialog is named by
 * @param props.draft - the open draft
 * @param props.drawing - whether the first drawing is on its way
 * @param props.colors - whether each card has a color
 * @param props.onColors - changes it
 * @param props.onSide - shows Before or After
 * @param props.onCancel - throws the draft away
 * @param props.onDone - commits it
 * @param props.menu - the workspace's "..." menu
 * @returns the header
 */
export function JoinHead({
    titleId,
    draft,
    drawing,
    colors,
    onColors,
    onSide,
    onCancel,
    onDone,
    menu,
}: Readonly<{
    titleId: string;
    draft: SourceDraft;
    drawing: boolean;
    colors: boolean;
    onColors: (colors: boolean) => void;
    onSide: (side: "before" | "after") => void;
    onCancel: () => void;
    onDone: () => void;
    menu: React.ReactNode;
}>): React.JSX.Element {
    return (
        <header className="sel-ws-head">
            <Text size="sm" fw={600} id={titleId} className="sel-ws-title" style={{ whiteSpace: "nowrap" }}>
                {WORKSPACE_WORDS.title}
            </Text>
            {drawing ? (
                <Group gap={4} wrap="nowrap" data-drawing="">
                    <Loader size={12} aria-hidden />
                    <Text size="sm" c="dimmed" span>
                        {WORKSPACE_WORDS.drawing}
                    </Text>
                </Group>
            ) : null}
            <span className="sel-spacer" />
            <Tooltip label={WORKSPACE_WORDS.cardColorsTip} openDelay={500} multiline w={260}>
                <div>
                    <SegmentedControl
                        aria-label={WORKSPACE_WORDS.preview}
                        value={colors ? "colors" : "styled"}
                        data={[
                            { value: "colors", label: WORKSPACE_WORDS.cardColors },
                            { value: "styled", label: WORKSPACE_WORDS.styled },
                        ]}
                        onChange={(value) => {
                            onColors(value === "colors");
                        }}
                    />
                </div>
            </Tooltip>
            <Tooltip
                label={<TooltipShortcut label={WORKSPACE_WORDS.sideTip} shortcut={formatKey(SIDE_KEY)} />}
                openDelay={500}
                multiline
                w={260}
            >
                <div>
                    <SegmentedControl
                        aria-label={PREVIEW_WORDS.beforeAfter}
                        aria-keyshortcuts={ariaKey(SIDE_KEY)}
                        value={draft.side}
                        data={[
                            { value: "before", label: PREVIEW_WORDS.before },
                            { value: "after", label: PREVIEW_WORDS.after },
                        ]}
                        onChange={(value) => {
                            onSide(value === "before" ? "before" : "after");
                        }}
                    />
                </div>
            </Tooltip>
            {menu}
            <span className="sel-ws-gap" />
            <Tooltip
                label={<TooltipShortcut label={WORKSPACE_WORDS.cancel} shortcut={formatKey("Escape")} />}
                openDelay={500}
            >
                <Button size="compact-xs" variant="subtle" aria-keyshortcuts="Escape" onClick={onCancel}>
                    {WORKSPACE_WORDS.cancel}
                </Button>
            </Tooltip>
            <Button size="compact-xs" onClick={onDone}>
                {WORKSPACE_WORDS.done}
            </Button>
        </header>
    );
}

/**
 * The key: what the commit would do, counted, each effect by the mark the preview draws for it.
 * @param props - Component props
 * @param props.marks - the preview's marks
 * @param props.rings - the rings the preview draws wider than the merged ring
 * @param props.colors - whether each card has a color
 * @returns the line
 */
export function JoinKey({
    marks,
    rings,
    colors,
}: Readonly<{ marks: SourceDraftMarkCounts; rings: readonly DraftRing[]; colors: boolean }>): React.JSX.Element {
    return (
        <div className="jw-key sel-count">
            {keyOf(marks, rings, colors).map((each, at, all) => (
                <Group key={each.id} gap={4} wrap="nowrap" aria-label={counted(each.count, each.label)}>
                    <span className="jw-key-mark" data-mark={each.id} style={{ color: each.color }} aria-hidden />
                    {/* One list: "57 merged nodes, 12 new nodes, 1 removed node". */}
                    <Text size="sm">{`${counted(each.count, each.label)}${at < all.length - 1 ? "," : ""}`}</Text>
                </Group>
            ))}
        </div>
    );
}
