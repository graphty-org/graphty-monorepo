import type { GraphSession, SourceDraftPreview } from "@graphty/graphty-element/session";
import { Group, Text } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import { nameOf, namingLines, rowNames, type SourceNames } from "./cardWords";
import { isJoin } from "./joinCards";
import { STEP_WORDS, stepChangedWords, stepCountWords, stepRemovedWords } from "./words";

/**
 * A label and its value, on one line.
 * @param props - Component props
 * @param props.label - the label
 * @param props.value - the value
 * @returns the line
 */
export function Line({ label, value }: Readonly<{ label: string; value: string }>): React.JSX.Element {
    return (
        <Group gap={6} justify="space-between" wrap="nowrap">
            <Text size="xs">{label}</Text>
            <Text size="xs" aria-label={`${label} after`}>
                {value}
            </Text>
        </Group>
    );
}

/**
 * What a draft that changes committed steps does to the rest (design 7.13): the other joins it
 * takes away or whose counts it moves, each by its line in the list, the references it leaves unbound and the reader edits that
 * lose their element. The step card and the Join card editing a step both show it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.names - the sources' names
 * @param props.preview - the draft's preview
 * @param props.own - whether a committed step is the card's own (the step it deletes or edits, or
 * a step of the source it removes), which the card names itself rather than as a later step
 * @returns the block
 */
export function DraftEffects({
    session,
    names,
    preview,
    own,
}: Readonly<{
    session: GraphSession;
    names: SourceNames;
    preview: SourceDraftPreview;
    own: (step: { readonly step: number; readonly source: string }) => boolean;
}>): React.JSX.Element {
    const committed = session.data.steps();
    const joins = committed.filter((step) => isJoin(step));
    const lines = rowNames(
        session,
        names,
        joins.map((step) => namingLines(session, committed, { lines: null, step })),
    );
    const named = ({ index, source }: { readonly index: number; readonly source: string }): string =>
        lines[joins.findIndex((step) => step.index === index)] ?? nameOf(names, source);
    const removed = preview.issues.flatMap((issue) =>
        // A source a join added goes with it: the join says so.
        issue.code === "W_STEP_REMOVED" && !own(issue.params) && committed.at(issue.params.step)?.joined !== true
            ? [issue.params]
            : [],
    );
    // The steps the draft keeps whose counts it moves, such as edges onto a removed source's nodes.
    const changed = preview.steps.flatMap((step) => {
        const was = step.committed === null ? undefined : committed[step.committed];
        if (was === undefined || was.joined === true || own({ step: was.index, source: was.source })) {
            return [];
        }
        const before = stepCountWords(was);
        const after = stepCountWords(step);
        return before === after ? [] : [stepChangedWords(named(was), before, after)];
    });
    const unbound = preview.issues.filter((issue) => issue.code === "W_REFERENCE_UNBOUND").length;
    const { edits } = preview;
    const lost = edits.filter((edit) => edit.state === "lost").length;
    return (
        <>
            {removed.length + changed.length === 0 ? null : (
                <fieldset className="ss-field" aria-label={STEP_WORDS.otherJoins}>
                    <Text component="legend" size="xs" fw={600}>
                        {`${STEP_WORDS.otherJoins} ${formatNumber(removed.length + changed.length)}`}
                    </Text>
                    {removed.map((params) => (
                        <Text key={params.step} size="xs">
                            {stepRemovedWords(named({ index: params.step, source: params.source }), params.reason)}
                        </Text>
                    ))}
                    {changed.map((words) => (
                        <Text key={words} size="xs">
                            {words}
                        </Text>
                    ))}
                </fieldset>
            )}
            {unbound === 0 ? null : <Line label={STEP_WORDS.references} value={formatNumber(unbound)} />}
            {edits.length === 0 ? null : (
                <Group gap={6} justify="space-between" wrap="nowrap">
                    <Text size="xs">{STEP_WORDS.readerEdits}</Text>
                    <Text size="xs" aria-label={`${STEP_WORDS.readerEdits} after`}>
                        {`${formatNumber(edits.length - lost)} ${STEP_WORDS.applies}`}
                        {lost > 0 ? `, ${formatNumber(lost)} ${STEP_WORDS.lost}` : ""}
                    </Text>
                </Group>
            )}
        </>
    );
}
