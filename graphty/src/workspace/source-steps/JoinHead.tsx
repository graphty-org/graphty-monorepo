import { SegmentedControl } from "@graphty/compact-mantine";
import type { DraftRing, SourceDraft, SourceDraftMarkCounts } from "@graphty/graphty-element/session";
import { Button, Group, Loader, Text, Tooltip } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import { ariaKey } from "../keys/keys";
import { SIDE_KEY, WORKSPACE_REDO_KEY, WORKSPACE_UNDO_KEY } from "./keys";
import { KeyWords } from "./KeyWords";
import { PREVIEW_WORDS, WORKSPACE_WORDS } from "./words";
import { MERGED_COLOR, NEW_COLOR, REMOVED_COLOR } from "./workspaceCards";

/** One item of the header's key. */
interface KeyItem {
    readonly id: string;
    readonly color: string;
    readonly label: string;
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
    return [
        { id: "merged", color: markColor(MERGED_COLOR), label: WORKSPACE_WORDS.nodesMerged, count: marks.nodes.merged },
        // Each wider ring the preview draws, by its own row.
        ...rings.map((ring) => ({
            id: `ring-${ring.kind}`,
            color: markColor(MERGED_COLOR),
            label: WORKSPACE_WORDS.rings[ring.kind],
            count: ring.nodes,
        })),
        { id: "new", color: markColor(NEW_COLOR), label: WORKSPACE_WORDS.nodesNew, count: marks.nodes.new },
        { id: "edges", color: markColor(NEW_COLOR), label: WORKSPACE_WORDS.edgesNew, count: marks.edges.new },
        ...(
            [
                ["edges-merged", markColor(MERGED_COLOR), WORKSPACE_WORDS.edgesMerged, marks.edges.merged],
                ["nodes-removed", REMOVED_COLOR, WORKSPACE_WORDS.nodesRemoved, marks.nodes.removed],
                ["edges-removed", REMOVED_COLOR, WORKSPACE_WORDS.edgesRemoved, marks.edges.removed],
                ["nodes-changed", "inherit", WORKSPACE_WORDS.nodesChanged, marks.nodes.changed ?? 0],
                ["edges-changed", "inherit", WORKSPACE_WORDS.edgesChanged, marks.edges.changed ?? 0],
                // Named only where a join leaves nodes of the type it reads unreached.
                ["untouched", "inherit", WORKSPACE_WORDS.untouched, marks.nodes.untouched],
            ] as const
        ).flatMap(([id, color, label, count]) => (count === 0 ? [] : [{ id, color, label, count }])),
    ];
}

/**
 * The workspace's header: the preview's look and side, undo and redo, and how it closes.
 * @param props - Component props
 * @param props.titleId - the id the dialog is named by
 * @param props.draft - the open draft
 * @param props.drawing - whether the first drawing is on its way
 * @param props.colors - whether each card has a color
 * @param props.onColors - changes it
 * @param props.onSide - shows Before or After
 * @param props.onUndo - takes back the newest change
 * @param props.onRedo - makes again what Undo took back
 * @param props.onCancel - throws the draft away
 * @param props.onDone - commits it
 * @param props.name - the open card's name, after the workspace's as the selection workspace's title reads
 * @param props.menu - the workspace's "..." menu
 * @param props.children - the key, after the title
 * @returns the header
 */
export function JoinHead({
    titleId,
    draft,
    drawing,
    colors,
    onColors,
    onSide,
    onUndo,
    onRedo,
    onCancel,
    onDone,
    name,
    menu,
    children,
}: Readonly<{
    titleId: string;
    draft: SourceDraft;
    drawing: boolean;
    colors: boolean;
    onColors: (colors: boolean) => void;
    onSide: (side: "before" | "after") => void;
    onUndo: () => void;
    onRedo: () => void;
    onCancel: () => void;
    onDone: () => void;
    name: string | null;
    menu: React.ReactNode;
    children?: React.ReactNode;
}>): React.JSX.Element {
    return (
        <header className="sel-ws-head">
            <Group gap={4} wrap="nowrap" className="sel-ws-title">
                <Text size="sm" fw={600} id={titleId} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                    {WORKSPACE_WORDS.title}
                </Text>
                {name === null ? null : (
                    <Text size="sm" fw={600} truncate title={name}>
                        {`/ ${name}`}
                    </Text>
                )}
            </Group>
            {drawing ? (
                <Group gap={4} wrap="nowrap" data-drawing="">
                    <Loader size={12} aria-hidden />
                    <Text size="sm" c="dimmed" span>
                        {WORKSPACE_WORDS.drawing}
                    </Text>
                </Group>
            ) : null}
            {children}
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
            <Tooltip label={WORKSPACE_WORDS.sideTip} openDelay={500} multiline w={260}>
                <div>
                    <SegmentedControl
                        aria-label={PREVIEW_WORDS.beforeAfter}
                        aria-keyshortcuts={ariaKey(SIDE_KEY)}
                        value={draft.side}
                        data={[
                            { value: "before", label: PREVIEW_WORDS.before },
                            {
                                value: "after",
                                label: (
                                    <Group gap={4} wrap="nowrap" component="span">
                                        {`${PREVIEW_WORDS.after} `}
                                        {/* Its key is shown, and said by the control's aria-keyshortcuts: never part of its name. */}
                                        <span aria-hidden>
                                            <KeyWords combo={SIDE_KEY} />
                                        </span>
                                    </Group>
                                ),
                            },
                        ]}
                        onChange={(value) => {
                            onSide(value === "before" ? "before" : "after");
                        }}
                    />
                </div>
            </Tooltip>
            <Button
                size="compact-xs"
                variant="subtle"
                aria-keyshortcuts={ariaKey(WORKSPACE_UNDO_KEY)}
                rightSection={<KeyWords combo={WORKSPACE_UNDO_KEY} />}
                disabled={!draft.canUndo}
                onClick={onUndo}
            >
                {WORKSPACE_WORDS.undo}
            </Button>
            <Button
                size="compact-xs"
                variant="subtle"
                aria-keyshortcuts={ariaKey(WORKSPACE_REDO_KEY)}
                rightSection={<KeyWords combo={WORKSPACE_REDO_KEY} />}
                disabled={!draft.canRedo}
                onClick={onRedo}
            >
                {WORKSPACE_WORDS.redo}
            </Button>
            {menu}
            <span className="sel-ws-gap" />
            <Button
                size="compact-xs"
                variant="subtle"
                aria-keyshortcuts="Escape"
                rightSection={<KeyWords combo="Escape" />}
                onClick={onCancel}
            >
                {WORKSPACE_WORDS.cancel}
            </Button>
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
            {keyOf(marks, rings, colors).map((each) => (
                <Group key={each.id} gap={4} wrap="nowrap" aria-label={`${each.label} ${String(each.count)}`}>
                    <span className="jw-key-mark" data-mark={each.id} style={{ color: each.color }} aria-hidden />
                    <Text size="sm">{`${each.label} ${formatNumber(each.count)}`}</Text>
                </Group>
            ))}
        </div>
    );
}
