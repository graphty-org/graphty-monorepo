import type { GraphSession, SourceOverlapQuestion } from "@graphty/graphty-element/session";
import { Button, Group, Kbd, Radio, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import { cancelCard, commitCard } from "./actions";
import { overlapCountWords, overlapQuestionWords, STAGED_WORDS } from "./words";

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
 * The Add card (design 5.5): for each space the staged source's keys meet nodes in, "Same <type>?"
 * with the count, answered Merge or Keep separate. Commit (Enter) waits for every answer; Cancel
 * (Esc) discards the draft and leaves the source staged.
 * @param props - Component props
 * @param props.session - the element's session.
 * @returns the card
 */
export function AddCard({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [questions] = useState(() => openQuestions(session));
    const [answers, setAnswers] = useState<Answers>({});
    const card = useRef<HTMLFormElement>(null);
    useEffect(() => {
        card.current?.querySelector<HTMLElement>("input")?.focus();
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
                                <span>{overlapQuestionWords(question)}</span>
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
                <Group gap={6} justify="flex-end">
                    <Button
                        size="compact-xs"
                        variant="default"
                        rightSection={<Kbd size="xs">{formatKey("Escape")}</Kbd>}
                        aria-keyshortcuts={ariaKey("Escape")}
                        onClick={cancel}
                    >
                        {STAGED_WORDS.cancel}
                    </Button>
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
