import "./source-steps.css";

import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Kbd, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef } from "react";

import { sourceName } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { useSessionEvents } from "../sessionEvents";
import type { StepCardState } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { cancelCard, commitCard } from "./actions";
import { CancelButton } from "./CancelButton";
import { spaceLabel } from "./join";
import { COMMIT_KEY } from "./keys";
import { openDraft } from "./preview";
import { stepCardSource } from "./steps";
import {
    afterWords,
    PREVIEW_WORDS,
    removeTitleWords,
    STEP_WORDS,
    stepChangedWords,
    stepCountWords,
    stepRemovedWords,
    stepSubjectWords,
} from "./words";

/** The element's events after which the card reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/**
 * A label and its value, on one line.
 * @param props - Component props
 * @param props.label - the label
 * @param props.value - the value
 * @returns the line
 */
function Line({ label, value }: Readonly<{ label: string; value: string }>): React.JSX.Element {
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
 * The step card (design 7.13, the source-steps experiment): what deleting a committed step, or
 * removing a committed source, would change, read from the draft that holds the removal: the
 * graph's totals before and after, the later steps that go with it or whose counts it moves, the
 * references left unbound and the reader edits that lose their element. Commit (Enter) is one undo
 * step; Cancel (Esc) discards.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @returns the card
 */
export function StepCard({
    session,
    card,
}: Readonly<{ session: GraphSession; card: StepCardState }>): React.JSX.Element {
    const { store } = useWorkspace();
    const form = useRef<HTMLFormElement>(null);
    useSessionEvents(session, DRAFT_EVENTS);
    useEffect(() => {
        form.current?.querySelector<HTMLElement>("button[type=submit]")?.focus();
    }, []);
    // A draft gone by any door (a project opened, the graph cleared) leaves nothing to commit.
    useEffect(
        () =>
            session.on("data:draft-changed", () => {
                if (store.get().sourceCard?.kind === "step" && openDraft(session) === null) {
                    store.set({ sourceCard: null });
                }
            }),
        [session, store],
    );
    const draft = openDraft(session);
    const key = stepCardSource(session, card);
    const source = session.data.sources({ staged: true }).find((each) => each.key === key);
    const title = removeTitleWords(card.remove, source === undefined ? "" : sourceName(source));
    const preview = draft?.preview() ?? null;
    const { remove } = card;
    const committed = session.data.steps();
    const row = "step" in remove ? committed[remove.step] : undefined;
    // The element lists every committed step the draft drops, the card's own target too: the step
    // it deletes, or the removed source's own steps. Later steps are only the others.
    const removed =
        preview?.issues.flatMap((issue) =>
            issue.code === "W_STEP_REMOVED" &&
            ("step" in remove ? issue.params.step !== remove.step : issue.params.source !== remove.source)
                ? [issue.params]
                : [],
        ) ?? [];
    // The steps the draft keeps whose counts it moves, such as edges onto a removed source's nodes.
    const changed =
        preview?.steps.flatMap((step) => {
            const was = step.committed === null ? undefined : committed[step.committed];
            if (was === undefined) {
                return [];
            }
            const before = stepCountWords(was);
            const after = stepCountWords(step);
            return before === after ? [] : [stepChangedWords(was.index, was.op, before, after)];
        }) ?? [];
    const unbound = preview?.issues.filter((issue) => issue.code === "W_REFERENCE_UNBOUND").length ?? 0;
    const edits = preview?.edits ?? [];
    const lost = edits.filter((edit) => edit.state === "lost").length;
    const cancel = (): void => {
        cancelCard(store, session);
    };
    return (
        <form // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- catches Esc bubbling from the card's own controls to cancel it; Enter submits the form
            ref={form}
            className="ss-card"
            aria-label={title}
            onSubmit={(event) => {
                event.preventDefault();
                void commitCard(store, session);
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                }
            }}
        >
            <Stack gap={6}>
                <Text size="xs" fw={600}>
                    {title}
                </Text>
                {row === undefined ? null : (
                    <Text size="xs" c="dimmed" aria-label={`${title} subject`}>
                        {stepSubjectWords(
                            row,
                            source === undefined ? row.source : sourceName(source),
                            row.act === null ? "" : spaceLabel(session, row.act.into.space),
                        )}
                    </Text>
                )}
                {preview === null ? null : (
                    <>
                        <fieldset className="ss-field">
                            <Text component="legend" size="xs" fw={600}>
                                {STEP_WORDS.graphAfter}
                            </Text>
                            <Line
                                label={STEP_WORDS.nodes}
                                value={afterWords(preview.before.nodes, preview.after.nodes)}
                            />
                            <Line
                                label={STEP_WORDS.edges}
                                value={afterWords(preview.before.edges, preview.after.edges)}
                            />
                        </fieldset>
                        <fieldset className="ss-field" aria-label={STEP_WORDS.laterSteps}>
                            <Text component="legend" size="xs" fw={600}>
                                {`${STEP_WORDS.laterSteps} ${formatNumber(removed.length + changed.length)}`}
                            </Text>
                            {removed.map((params) => (
                                <Text key={params.step} size="xs">
                                    {stepRemovedWords(params)}
                                </Text>
                            ))}
                            {changed.map((words) => (
                                <Text key={words} size="xs">
                                    {words}
                                </Text>
                            ))}
                        </fieldset>
                        <Line label={STEP_WORDS.references} value={formatNumber(unbound)} />
                        <Group gap={6} justify="space-between" wrap="nowrap">
                            <Text size="xs">{STEP_WORDS.readerEdits}</Text>
                            <Text size="xs" aria-label={`${STEP_WORDS.readerEdits} after`}>
                                {`${formatNumber(edits.length - lost)} ${STEP_WORDS.applies}`}
                                {lost > 0 ? `, ${formatNumber(lost)} ${STEP_WORDS.lost}` : ""}
                            </Text>
                        </Group>
                    </>
                )}
                <Group gap={6} justify="flex-end">
                    <CancelButton onClick={cancel} />
                    <Button
                        type="submit"
                        size="compact-xs"
                        disabled={draft === null}
                        rightSection={<Kbd size="xs">{formatKey(COMMIT_KEY)}</Kbd>}
                        aria-keyshortcuts={ariaKey(COMMIT_KEY)}
                    >
                        {PREVIEW_WORDS.commit}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
