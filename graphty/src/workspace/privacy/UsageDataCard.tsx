import { Anchor, Button, Group, Paper, Stack, Text } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { answerUsageData, type UsageAnswer, useUsageAnswer } from "./usageData";
import { UsageDataText } from "./UsageDataText";

/**
 * The usage data card at the foot of the start screen (tier1-design.md section 2.11): shown on
 * every launch until it is answered, never blocking; a sample can be opened first. After an
 * answer, one line says what was chosen and where to change it.
 * @returns The card, the answer line, or nothing once answered on an earlier launch
 */
export function UsageDataCard(): React.JSX.Element | null {
    const { run } = useWorkspace();
    const answer = useUsageAnswer();
    const [answeredNow, setAnsweredNow] = useState(false);
    const choose = (next: UsageAnswer): void => {
        setAnsweredNow(true);
        answerUsageData(next);
    };

    if (answer !== null) {
        return answeredNow ? (
            <Text size="xs" role="status" className="ws-start-answer">
                {answer === "share" ? "Thank you. Usage data is on, with content masked." : "Usage data stays off."}{" "}
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
