import { Anchor, Button, Group, Paper, Stack, Text } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { answerUsageData, type UsageAnswer, useUsageAnswer } from "./usageData";
import { UsageDataText } from "./UsageDataText";

/** The line after an answer, by the answer. */
const ANSWER_WORDS: Record<UsageAnswer, string> = {
    share: "Thank you. Usage data is on, with content masked.",
    declined: "Usage data stays off.",
};

/**
 * The usage data card at the foot of the start screen (tier1-design.md section 2.11): shown on
 * every launch until it is answered, never blocking; a sample can be opened first. After an
 * answer, one line says what was chosen and where to change it.
 * @param props - Component props
 * @param props.onAnswered - Called after an answer, as the card (and the button holding focus) goes
 * @returns The card, the answer line, or nothing once answered on an earlier launch
 */
export function UsageDataCard({ onAnswered }: Readonly<{ onAnswered?: () => void }>): React.JSX.Element | null {
    const { run, store } = useWorkspace();
    const answer = useUsageAnswer();
    const [answeredNow, setAnsweredNow] = useState(false);
    const choose = (next: UsageAnswer): void => {
        setAnsweredNow(true);
        answerUsageData(next);
        // Spoken by the status line already on the page; the line below arrives with its words.
        store.set({ announcement: `${ANSWER_WORDS[next]} Change this in Settings > Privacy` });
        onAnswered?.();
    };

    if (answer !== null) {
        return answeredNow ? (
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
        ) : null;
    }

    return (
        <Paper component="aside" aria-label="Usage data" withBorder p="sm" className="ws-start-card">
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
