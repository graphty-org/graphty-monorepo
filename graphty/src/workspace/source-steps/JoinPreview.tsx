import { SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, SourceClashRule, SourceDraftPreviewStep } from "@graphty/graphty-element/session";
import { Group, Select, Stack, Text } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import type { JoinCardState, JoinRepeats } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { openDraft, previewStep, setChoice, setRule } from "./preview";
import { afterWords, BUCKET_WORDS, newTypeWords, PREVIEW_WORDS, REPEATS_WORDS, RULE_WORDS } from "./words";

/** The Repeats menu's ways, in its order. */
const REPEATS: readonly JoinRepeats[] = ["first", "last", "count", "list"];

/**
 * A count and its words, as a term and its definition, number first.
 * @param props - Component props
 * @param props.label - the words
 * @param props.value - the count
 * @returns the pair
 */
function Count({ label, value }: Readonly<{ label: string; value: number }>): React.JSX.Element {
    return (
        <div className="ss-count">
            <Text component="dt" size="xs" c="dimmed">
                {label}
            </Text>
            <Text component="dd" size="xs" fw={600}>
                {formatNumber(value)}
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
                    <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>
                        {params.column}
                    </Text>
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
    const draft = openDraft(session);
    if (draft === null || card.preview === null || card.field2 === null) {
        return null;
    }
    const preview = draft.preview();
    const step = previewStep(preview, card);
    const buckets = step?.buckets ?? null;
    const kind = card.act === "merge" ? "merge" : "edge";
    const newTypes =
        buckets === null ? [] : Object.entries(kind === "merge" ? buckets.newNodeTypes : buckets.newEdgeTypes);
    return (
        <section className="ss-preview" aria-label={PREVIEW_WORDS.preview}>
            <Stack gap={6}>
                {buckets === null ? null : (
                    <dl className="ss-counts" aria-label={PREVIEW_WORDS.buckets}>
                        {BUCKET_WORDS[kind].map(({ id, label }) => (
                            <Count key={id} label={label} value={buckets[id]} />
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
            </Stack>
        </section>
    );
}
