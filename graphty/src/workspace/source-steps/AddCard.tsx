import type { GraphSession, SourceKey, SourceOverlapQuestion } from "@graphty/graphty-element/session";
import { Button, Group, Kbd, Radio, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { ariaKey, formatKey } from "../keys/keys";
import { useSessionEvents } from "../sessionEvents";
import { useWorkspace } from "../state/WorkspaceContext";
import { cancelCard, commitCard } from "./actions";
import { CancelButton } from "./CancelButton";
import { spaceLabel } from "./join";
import { Count, GraphAfter } from "./JoinPreview";
import { openDraft } from "./preview";
import {
    endsMeetWords,
    newTypeWords,
    overlapCountWords,
    overlapQuestionWords,
    PREVIEW_WORDS,
    STAGED_WORDS,
} from "./words";

/** The element's events after which the card reads the draft's preview again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** The answers to the key-overlap question, by the source it asks about. */
type Answers = Readonly<Partial<Record<string, "merge" | "separate">>>;

/**
 * The questions the open draft asked when it opened: answering one takes it out of the preview, so
 * the card keeps the list it was opened with.
 * @param session - the element's session.
 * @returns the questions.
 */
function openQuestions(session: GraphSession): readonly SourceOverlapQuestion[] {
    return session.data.currentDraft()?.preview().questions ?? [];
}

/**
 * The Add's preview (design 5.6): the added step's counts, from the draft's `preview()`, as the
 * Join card shows a join's: rows meeting nodes already in the graph by space, new elements by type
 * (or in all when untyped), repeated keys, and the graph's totals before and after.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.source - the staged source the draft adds
 * @returns the preview, or nothing while no draft is open
 */
function AddPreview({
    session,
    source,
}: Readonly<{ session: GraphSession; source: SourceKey }>): React.JSX.Element | null {
    useSessionEvents(session, DRAFT_EVENTS);
    const preview = openDraft(session)?.preview();
    if (preview === undefined) {
        return null;
    }
    const buckets = preview.steps.find((step) => step.source === source && step.state === "new")?.buckets ?? null;
    const newTypes =
        buckets === null ? [] : [...Object.entries(buckets.newNodeTypes), ...Object.entries(buckets.newEdgeTypes)];
    return (
        <section className="ss-preview" aria-label={PREVIEW_WORDS.preview}>
            <Stack gap={6}>
                {buckets === null ? null : (
                    <dl className="ss-counts" aria-label={PREVIEW_WORDS.buckets}>
                        {Object.entries(buckets.endsMeet).map(([space, count]) => (
                            <Count
                                key={`meet:${space}`}
                                label={endsMeetWords(spaceLabel(session, space))}
                                value={count}
                            />
                        ))}
                        {newTypes.map(([type, count]) => (
                            <Count key={`new:${type}`} label={newTypeWords(type)} value={count} />
                        ))}
                        {newTypes.length === 0 ? (
                            <Count label={PREVIEW_WORDS.new} value={buckets.newNodes + buckets.newEdges} />
                        ) : null}
                        <Count label={PREVIEW_WORDS.keysRepeat} value={buckets.repeated2} />
                    </dl>
                )}
                <GraphAfter preview={preview} />
            </Stack>
        </section>
    );
}

/**
 * The Add card (design 5.5, 5.6): for each space the staged source's keys meet nodes in, "Same
 * <type>?" with the count, answered Merge or Keep separate; then the Add's preview, recounted after
 * each answer. Commit (Enter) waits for every answer; Cancel (Esc) discards the draft and leaves the
 * source staged.
 * @param props - Component props
 * @param props.session - the element's session.
 * @param props.source - the staged source the card adds.
 * @returns the card
 */
export function AddCard({
    session,
    source,
}: Readonly<{ session: GraphSession; source: SourceKey }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [questions] = useState(() => openQuestions(session));
    const [answers, setAnswers] = useState<Answers>({});
    const card = useRef<HTMLFormElement>(null);
    useEffect(() => {
        // The first question, else Commit: Enter then commits the Add.
        card.current?.querySelector<HTMLElement>("input, button[type='submit']")?.focus();
    }, []);
    const ready = questions.every((question) => answers[question.params.source] !== undefined);
    const answer = (question: SourceOverlapQuestion, value: string): void => {
        const choice = value === "merge" ? "merge" : "separate";
        session.data.currentDraft()?.answerOverlap(question.params.source, choice);
        setAnswers((now) => ({ ...now, [question.params.source]: choice }));
    };
    const commit = (): void => {
        if (ready) {
            void commitCard(store, session);
        }
    };
    const cancel = (): void => {
        cancelCard(store, session);
    };
    return (
        <form // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- catches Esc bubbling from the card's own controls to cancel it; Enter submits the form
            ref={card}
            className="ss-card"
            aria-label={STAGED_WORDS.add}
            onSubmit={(event) => {
                event.preventDefault();
                commit();
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                }
            }}
        >
            <Stack gap={6}>
                {questions.map((question) => (
                    <Radio.Group
                        key={`${question.params.source}:${question.params.space}`}
                        size="xs"
                        label={
                            <Group gap={6} wrap="nowrap" component="span">
                                <span>{overlapQuestionWords(spaceLabel(session, question.params.space))}</span>
                                <Text component="span" size="xs" c="dimmed">
                                    {overlapCountWords(question)}
                                </Text>
                            </Group>
                        }
                        value={answers[question.params.source] ?? null}
                        onChange={(value) => {
                            answer(question, value);
                        }}
                    >
                        <Group gap="sm" mt={4}>
                            <Radio size="xs" value="merge" label={STAGED_WORDS.merge} />
                            <Radio size="xs" value="separate" label={STAGED_WORDS.separate} />
                        </Group>
                    </Radio.Group>
                ))}
                <AddPreview session={session} source={source} />
                <Group gap={6} justify="flex-end">
                    <CancelButton onClick={cancel} />
                    <Button
                        type="submit"
                        size="compact-xs"
                        disabled={!ready}
                        rightSection={<Kbd size="xs">{formatKey("Enter")}</Kbd>}
                        aria-keyshortcuts={ariaKey("Enter")}
                    >
                        {STAGED_WORDS.commit}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
