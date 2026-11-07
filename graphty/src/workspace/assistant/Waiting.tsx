import type { AiApprovalRequest, AiQuestionRequest } from "@graphty/graphty-element/ai";
import { Button, Checkbox, Group, Radio, Stack, Text } from "@mantine/core";
import React, { useState } from "react";

import type { AssistantChoice } from "../assistant-door/provider";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { ChipRow } from "./Checks";
import { answerQuestion, decide } from "./connection";
import type { AssistantView } from "./useAssistantView";
import { approvalWords, WORDS } from "./words";

/**
 * One approval: worded from its gate and preview, with verb buttons. Its chips peek at what it would
 * touch. Change this declines and goes to the composer.
 * @param props - Component props
 * @param props.request - the request
 * @param props.choice - the provider and model
 * @param props.place - "1 of 2" while more than one waits
 * @returns The card
 */
function ApprovalCard({
    request,
    choice,
    place,
}: Readonly<{ request: AiApprovalRequest; choice: AssistantChoice; place: string | null }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const { title, line, primary, decline } = approvalWords(request);
    const { target } = request.preview;
    const answer = (approve: boolean): void => {
        if (element !== null) {
            void decide(element, store, choice, request.id, approve);
        }
    };
    return (
        <Stack gap={4}>
            <Group justify="space-between" gap={4} wrap="nowrap">
                <Text size="sm" fw={600}>
                    {title}
                </Text>
                {place === null ? null : (
                    <Text size="xs" c="dimmed">
                        {place}
                    </Text>
                )}
            </Group>
            {line === null ? null : <Text size="sm">{line}</Text>}
            {target === undefined ? null : <ChipRow target={target} kinds={["node", "edge"]} />}
            <Group gap={4}>
                <Button
                    variant="filled"
                    size="compact-xs"
                    onClick={() => {
                        answer(true);
                    }}
                >
                    {primary}
                </Button>
                <Button
                    variant="default"
                    size="compact-xs"
                    onClick={() => {
                        answer(false);
                        store.set((state) => ({ composerCalls: state.composerCalls + 1 }));
                    }}
                >
                    {WORDS["assistant.waiting.change"]}
                </Button>
                <Button
                    variant="default"
                    size="compact-xs"
                    onClick={() => {
                        answer(false);
                    }}
                >
                    {decline}
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * One question: its choices as radios, or checkboxes when several may go, with Answer. Typing in the
 * composer answers it too, so these are never the only way.
 * @param props - Component props
 * @param props.request - the question
 * @param props.choice - the provider and model
 * @returns The card
 */
function QuestionCard({
    request,
    choice,
}: Readonly<{ request: AiQuestionRequest; choice: AssistantChoice }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const refused = useWorkspaceState((state) => state.assistantRefused);
    const [picked, setPicked] = useState<readonly string[]>([]);
    const options = request.choices.map((value) =>
        request.multiple ? (
            <Checkbox key={value} value={value} label={value} />
        ) : (
            <Radio key={value} value={value} label={value} />
        ),
    );
    // The question is the card's title, so it reads as the approval title does, not as a field caption.
    // Sized on the label alone: a size on the group would grow its radios too.
    const label = (
        <Text span size="sm" fw={600} c="var(--cm-text)">
            {request.question}
        </Text>
    );
    return (
        <Stack gap={4}>
            {request.multiple ? (
                <Checkbox.Group label={label} value={[...picked]} onChange={setPicked}>
                    <Stack gap={4}>{options}</Stack>
                </Checkbox.Group>
            ) : (
                <Radio.Group
                    label={label}
                    value={picked[0] ?? null}
                    onChange={(value) => {
                        setPicked([value]);
                    }}
                >
                    <Stack gap={4}>{options}</Stack>
                </Radio.Group>
            )}
            {refused ? <Text size="sm">{WORDS["assistant.waiting.invalid"]}</Text> : null}
            <Group>
                <Button
                    variant="filled"
                    size="compact-xs"
                    aria-disabled={picked.length === 0}
                    onClick={() => {
                        if (element !== null && picked.length > 0) {
                            void answerQuestion(
                                element,
                                store,
                                choice,
                                request.id,
                                request.multiple ? picked : picked[0],
                            );
                        }
                    }}
                >
                    {WORDS["assistant.waiting.answer"]}
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * What waits on the reader, in one hairline section pinned above the composer, so a request cannot
 * scroll away. Focus never jumps here: the status line announces it, and Shift+Tab reaches it.
 * @param props - Component props
 * @param props.view - what the element reports
 * @param props.choice - the provider and model
 * @returns The section, or nothing with nothing waiting
 */
export function Waiting({
    view,
    choice,
}: Readonly<{ view: AssistantView; choice: AssistantChoice }>): React.JSX.Element | null {
    const [approval] = view.approvals;
    const [question] = view.questions;
    if (approval === undefined && question === undefined) {
        return null;
    }
    const total = view.approvals.length + view.questions.length;
    return (
        <section className="ws-assistant-waiting" aria-label={WORDS["assistant.waiting.name"]}>
            {approval === undefined ? (
                <QuestionCard key={question.id} request={question} choice={choice} />
            ) : (
                <ApprovalCard
                    key={approval.id}
                    request={approval}
                    choice={choice}
                    place={total > 1 ? `1 of ${String(total)}` : null}
                />
            )}
        </section>
    );
}
