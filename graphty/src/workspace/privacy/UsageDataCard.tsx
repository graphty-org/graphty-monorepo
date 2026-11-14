import { Anchor, Button, CloseButton, Group, Paper, Stack, Text } from "@mantine/core";
import React, { type RefObject, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { answerUsageData, type UsageAnswer, useUsageAnswer } from "./usageData";
import { UsageDataText } from "./UsageDataText";

/** The line after an answer, by the answer. */
const ANSWER_WORDS: Record<UsageAnswer, string> = {
    share: "Thank you. Usage data is on, with content masked.",
    declined: "Usage data stays off.",
};

/**
 * The usage data question (tier1-design.md section 2.11), pinned to the foot of the window on
 * every page -- the start screen or an open project -- until it is answered, so a first visit is
 * asked wherever it lands. It never blocks: a sample can be opened first, and nothing is collected
 * until the reader answers. After an answer, one line says what was chosen and where to change it,
 * until it is closed; an answer from an earlier visit shows nothing.
 * @param props - Component props
 * @param props.returnFocus - Where focus goes when the answer line is closed from inside it, else
 * the drawing
 * @returns The question, the answer line, or nothing
 */
export function UsageDataCard({
    returnFocus,
}: Readonly<{ returnFocus?: RefObject<HTMLElement | null> }>): React.JSX.Element | null {
    const { run, store, element } = useWorkspace();
    const answer = useUsageAnswer();
    const [answeredNow, setAnsweredNow] = useState(false);
    const [closed, setClosed] = useState(false);
    // The button pressed goes with the question: when it held focus, the answer line's close takes it.
    const [focusClose, setFocusClose] = useState(false);
    const card = useRef<HTMLDivElement>(null);
    const choose = (next: UsageAnswer): void => {
        setFocusClose(card.current?.contains(document.activeElement) === true);
        setAnsweredNow(true);
        answerUsageData(next);
        // Spoken by the status line already on the page; the line below arrives with its words.
        store.set({ announcement: `${ANSWER_WORDS[next]} Change this in Settings > Privacy` });
    };

    if (answer !== null) {
        if (!answeredNow || closed) {
            return null;
        }
        return (
            <Paper ref={card} withBorder p="xs" className="ws-usage-notice">
                <Group gap="xs" wrap="nowrap" align="center">
                    <Text size="xs" className="ws-start-answer">
                        {ANSWER_WORDS[answer]}{" "}
                        <Anchor
                            component="button"
                            size="xs"
                            onClick={() => {
                                run("settings.privacy");
                            }}
                        >
                            Change this in Settings &gt; Privacy
                        </Anchor>
                    </Text>
                    <CloseButton
                        autoFocus={focusClose}
                        size="sm"
                        aria-label="Close"
                        onClick={() => {
                            const hadFocus = card.current?.contains(document.activeElement) === true;
                            setClosed(true);
                            if (hadFocus) {
                                (returnFocus?.current ?? element)?.focus();
                            }
                        }}
                    />
                </Group>
            </Paper>
        );
    }

    return (
        <Paper ref={card} component="aside" aria-label="Usage data" withBorder p="sm" className="ws-usage-notice">
            <Stack gap={6}>
                <UsageDataText />
                <Text size="xs" c="dimmed">
                    Nothing is collected until you answer.
                </Text>
                <Group gap="xs">
                    <Button
                        variant="default"
                        onClick={() => {
                            choose("share");
                        }}
                    >
                        Share usage data
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => {
                            choose("declined");
                        }}
                    >
                        No thanks
                    </Button>
                </Group>
            </Stack>
        </Paper>
    );
}
