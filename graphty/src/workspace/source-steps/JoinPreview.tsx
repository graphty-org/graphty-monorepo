import { SegmentedControl, UiGlyph } from "@graphty/compact-mantine";
import type { GraphSession, SourceClashRule, SourceDraftPreviewStep } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Select, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import type { JoinCardState, JoinRepeats } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { DraftEffects, Line } from "./DraftEffects";
import {
    cellId,
    clearSelectedPicks,
    excludeSelected,
    includeKey,
    openDraft,
    openDrill,
    pickSelected,
    previewStep,
    selectedKeys,
    selectedRefs,
    setChoice,
    setRule,
} from "./preview";
import {
    afterWords,
    BUCKET_WORDS,
    cellWords,
    clearPicksWords,
    countsChangeWords,
    DRILL_WORDS,
    excludeWords,
    newTypeWords,
    pickWords,
    PREVIEW_WORDS,
    REPEATS_WORDS,
    RULE_WORDS,
    showCellsWords,
    showRowsWords,
    stepCountWords,
    stepWords,
} from "./words";

/** The Repeats menu's ways, in its order. */
const REPEATS: readonly JoinRepeats[] = ["first", "last", "count", "list"];

/**
 * A count and its words, as a term and its definition, number first. With `onShow`, the number is a
 * button that lists the count's rows in the dock.
 * @param props - Component props
 * @param props.label - the words
 * @param props.value - the count
 * @param props.onShow - lists the rows behind the count
 * @returns the pair
 */
function Count({
    label,
    value,
    onShow,
}: Readonly<{ label: string; value: number; onShow?: () => void }>): React.JSX.Element {
    return (
        <div className="ss-count">
            <Text component="dt" size="xs" c="dimmed">
                {label}
            </Text>
            <Text component="dd" size="xs" fw={600}>
                {onShow === undefined ? (
                    formatNumber(value)
                ) : (
                    <UnstyledButton className="ss-count-show" aria-label={showRowsWords(label)} onClick={onShow}>
                        {formatNumber(value)}
                    </UnstyledButton>
                )}
            </Text>
        </div>
    );
}

/**
 * Values differ: per column, how many cells differ, the rule (from the rules the element says the
 * column takes), and how many the reader decided.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.step - the previewed step
 * @returns the rows
 */
function ValuesDiffer({
    session,
    step,
}: Readonly<{
    session: GraphSession;
    step: SourceDraftPreviewStep;
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    if (step.valuesDiffer.length === 0) {
        return null;
    }
    return (
        <fieldset className="ss-field">
            <Text component="legend" size="xs" fw={600}>
                {PREVIEW_WORDS.valuesDiffer}
            </Text>
            {step.valuesDiffer.map(({ params }) => (
                <Group key={params.column} gap={6} wrap="nowrap">
                    <UnstyledButton
                        className="ss-count-show"
                        style={{ flex: 1, minWidth: 0 }}
                        aria-label={showCellsWords(params.column)}
                        onClick={() => {
                            openDrill(store, { kind: "cells", column: params.column, only: "all", selected: [] });
                        }}
                    >
                        <Text size="xs" truncate>
                            {params.column}
                        </Text>
                    </UnstyledButton>
                    <Text
                        size="xs"
                        fw={600}
                        aria-label={`${params.column} ${PREVIEW_WORDS.valuesDiffer.toLowerCase()}`}
                    >
                        {formatNumber(params.count)}
                    </Text>
                    <Select
                        size="xs"
                        w={90}
                        aria-label={`${params.column} ${PREVIEW_WORDS.rule.toLowerCase()}`}
                        allowDeselect={false}
                        data={params.rules.map((rule) => ({
                            value: rule,
                            label: RULE_WORDS[rule],
                        }))}
                        value={params.rule}
                        onChange={(next) => {
                            if (next !== null && next !== params.rule) {
                                setRule(store, session, params.column, next as SourceClashRule);
                            }
                        }}
                    />
                    <Text size="xs" c="dimmed" aria-label={`${params.column} ${PREVIEW_WORDS.decided}`}>
                        {`${PREVIEW_WORDS.decided} ${formatNumber(params.decided)}`}
                    </Text>
                </Group>
            ))}
        </fieldset>
    );
}

/**
 * The merge's own choices: Repeats (while source 2's rows repeat a key) and Only 2 Keep / Drop.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.step - the previewed step
 * @returns the rows
 */
function MergeChoices({
    session,
    card,
    step,
}: Readonly<{ session: GraphSession; card: JoinCardState; step: SourceDraftPreviewStep }>): React.JSX.Element {
    const { store } = useWorkspace();
    const repeats = step.buckets?.repeated2 ?? 0;
    return (
        <Stack gap={4}>
            {repeats > 0 ? (
                <Group gap={6} wrap="nowrap">
                    <Text size="xs" style={{ flex: 1 }}>
                        {PREVIEW_WORDS.repeats}
                    </Text>
                    <Select
                        size="xs"
                        w={90}
                        aria-label={PREVIEW_WORDS.repeats}
                        allowDeselect={false}
                        data={REPEATS.map((value) => ({ value, label: REPEATS_WORDS[value] }))}
                        value={card.repeated}
                        onChange={(next) => {
                            const repeats = REPEATS.find((value) => value === next);
                            if (repeats !== undefined && repeats !== card.repeated) {
                                setChoice(store, session, { repeated: repeats });
                            }
                        }}
                    />
                </Group>
            ) : null}
            <Group gap={6} wrap="nowrap">
                <Text size="xs" style={{ flex: 1 }}>
                    {PREVIEW_WORDS.only2}
                </Text>
                <SegmentedControl
                    size="xs"
                    aria-label={PREVIEW_WORDS.only2}
                    value={card.unmatchedFrom}
                    data={[
                        { value: "keep", label: PREVIEW_WORDS.keep },
                        { value: "drop", label: PREVIEW_WORDS.drop },
                    ]}
                    onChange={(value) => {
                        setChoice(store, session, { unmatchedFrom: value === "drop" ? "drop" : "keep" });
                    }}
                />
                <Text size="xs" fw={600} aria-label={`${PREVIEW_WORDS.only2} rows`}>
                    {formatNumber(step.buckets?.unmatched ?? 0)}
                </Text>
            </Group>
        </Stack>
    );
}

/**
 * The card's acts on what the dock's Preview tab has selected: Exclude selected (n) for rows; Pick
 * 1 (n), Pick 2 (n) and Clear picks (n) for cells. Then the step's excluded list, each key with
 * Remove.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card, previewing
 * @param props.step - the previewed step
 * @returns the rows
 */
function Selection({
    session,
    card,
    step,
}: Readonly<{ session: GraphSession; card: JoinCardState; step: SourceDraftPreviewStep }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const keys = selectedKeys(card);
    const refs = selectedRefs(card);
    const excluded = step.except?.values ?? [];
    const { drill } = card;
    let picks: React.ReactNode = null;
    if (drill?.kind === "cells" && refs.length > 0) {
        const preview = openDraft(session)?.preview();
        const ids = new Set(drill.selected);
        const decided =
            preview
                ?.cells({ column: drill.column, step: step.index, only: "decided" })
                .cells.filter((cell) => ids.has(cellId(cell))).length ?? 0;
        const two = card.field2?.source;
        const one = card.field1?.source;
        // Field 1 is usually a type built from several sources: in each cell, the one that is not Field 2.
        let side1: { source: string } | { otherThan: string } | undefined;
        if (one !== undefined) {
            side1 = { source: one };
        } else if (two !== undefined) {
            side1 = { otherThan: two };
        }
        picks = (
            <Group gap={6}>
                {side1 === undefined ? null : (
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            pickSelected(store, session, side1);
                        }}
                    >
                        {pickWords(1, refs.length)}
                    </Button>
                )}
                {two === undefined ? null : (
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            pickSelected(store, session, { source: two });
                        }}
                    >
                        {pickWords(2, refs.length)}
                    </Button>
                )}
                <Button
                    size="compact-xs"
                    variant="default"
                    disabled={decided === 0}
                    onClick={() => {
                        clearSelectedPicks(store, session);
                    }}
                >
                    {clearPicksWords(decided)}
                </Button>
            </Group>
        );
    }
    if (keys.length === 0 && picks === null && excluded.length === 0) {
        return null;
    }
    return (
        <Stack gap={4}>
            {keys.length > 0 ? (
                <Group gap={6}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            excludeSelected(store, session);
                        }}
                    >
                        {excludeWords(keys.length)}
                    </Button>
                </Group>
            ) : null}
            {picks}
            {excluded.length > 0 ? (
                <fieldset className="ss-field" aria-label={DRILL_WORDS.excluded}>
                    <Text component="legend" size="xs" fw={600}>
                        {`${DRILL_WORDS.excluded} ${formatNumber(excluded.length)}`}
                    </Text>
                    {excluded.map((key) => (
                        <Group key={`${typeof key}:${String(key)}`} gap={6} wrap="nowrap">
                            <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
                                {cellWords(key)}
                            </Text>
                            <Tooltip label={DRILL_WORDS.remove}>
                                <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    aria-label={`${DRILL_WORDS.remove} ${cellWords(key)}`}
                                    onClick={() => {
                                        includeKey(store, session, key);
                                    }}
                                >
                                    <UiGlyph name="close" />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    ))}
                </fieldset>
            ) : null}
        </Stack>
    );
}

/**
 * The Join card's Preview (design 5.3): the step's buckets and new elements by type, its choices,
 * and the graph's totals before and after, all from the draft's `preview()`.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card, previewing
 * @returns the preview, or nothing while no draft is open
 */
export function JoinPreview({
    session,
    card,
}: Readonly<{ session: GraphSession; card: JoinCardState }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const draft = openDraft(session);
    if (draft === null || card.preview === null || card.field2 === null) {
        return null;
    }
    const preview = draft.preview();
    const step = previewStep(preview, card);
    const buckets = step?.buckets ?? null;
    const kind = card.act === "merge" ? "merge" : "edge";
    // Editing a committed step: its own counts, and what the edit does to later steps and reader edits.
    const edited = card.editing === null ? undefined : session.data.steps()[card.editing];
    const newTypes =
        buckets === null ? [] : Object.entries(kind === "merge" ? buckets.newNodeTypes : buckets.newEdgeTypes);
    return (
        <section className="ss-preview" aria-label={PREVIEW_WORDS.preview}>
            <Stack gap={6}>
                {buckets === null ? null : (
                    <dl className="ss-counts" aria-label={PREVIEW_WORDS.buckets}>
                        {BUCKET_WORDS[kind].map(({ id, label }) => (
                            <Count
                                key={id}
                                label={label}
                                value={buckets[id]}
                                onShow={() => {
                                    openDrill(store, { kind: "rows", bucket: id, changedOnly: true, selected: [] });
                                }}
                            />
                        ))}
                        {buckets.groups.length > 0 ? (
                            <Count label={PREVIEW_WORDS.largestGroup} value={buckets.groups[0] ?? 0} />
                        ) : null}
                        {newTypes.map(([type, count]) => (
                            <Count key={`new:${type}`} label={newTypeWords(type)} value={count} />
                        ))}
                    </dl>
                )}
                {step === null ? null : (
                    <>
                        <ValuesDiffer session={session} step={step} />
                        {kind === "merge" ? <MergeChoices session={session} card={card} step={step} /> : null}
                        <Selection session={session} card={card} step={step} />
                    </>
                )}
                <fieldset className="ss-field">
                    <Text component="legend" size="xs" fw={600}>
                        {PREVIEW_WORDS.graphAfter}
                    </Text>
                    <Group gap={6} justify="space-between">
                        <Text size="xs">{PREVIEW_WORDS.nodes}</Text>
                        <Text size="xs" aria-label={`${PREVIEW_WORDS.nodes} after`}>
                            {afterWords(preview.before.nodes, preview.after.nodes)}
                        </Text>
                    </Group>
                    <Group gap={6} justify="space-between">
                        <Text size="xs">{PREVIEW_WORDS.edges}</Text>
                        <Text size="xs" aria-label={`${PREVIEW_WORDS.edges} after`}>
                            {afterWords(preview.before.edges, preview.after.edges)}
                        </Text>
                    </Group>
                </fieldset>
                {edited === undefined ? null : (
                    <>
                        <Line
                            label={stepWords(edited.index)}
                            value={countsChangeWords(stepCountWords(edited), step === null ? "" : stepCountWords(step))}
                        />
                        <DraftEffects session={session} preview={preview} own={(each) => each.step === edited.index} />
                    </>
                )}
            </Stack>
        </section>
    );
}
