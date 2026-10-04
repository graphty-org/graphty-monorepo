import { Group, Paper, Progress, Stack, Text } from "@mantine/core";
import React from "react";

/** Props for StateCard. */
interface StateCardProps {
    /** What the state is, in a few words. */
    title: string;
    /** One sentence more, when the title is not enough. */
    sentence?: string;
    /**
     * A progress bar: a fraction from 0 to 1, or null for one that cannot say how far it has got.
     * Absent, no bar.
     */
    progress?: number | null;
    /** At most two buttons. */
    actions?: React.ReactNode;
}

/**
 * The canvas's one state card pattern (tier1-design.md section 2.4): a title, one sentence, an
 * optional bar and at most two buttons, centered on the canvas.
 * @param props - Component props
 * @param props.title - What the state is
 * @param props.sentence - One sentence more
 * @param props.progress - A fraction, or null for an indeterminate bar
 * @param props.actions - At most two buttons
 * @returns The card
 */
export function StateCard({ title, sentence, progress, actions }: StateCardProps): React.JSX.Element {
    return (
        <Paper role="status" aria-label={title} className="ws-state-card" withBorder shadow="sm" p="md">
            <Stack gap="xs">
                <Text fw={500}>{title}</Text>
                {sentence === undefined ? null : <Text size="sm">{sentence}</Text>}
                {progress === undefined ? null : (
                    // An indeterminate bar is a full, moving one: no invented fraction.
                    <Progress
                        value={progress === null ? 100 : progress * 100}
                        animated={progress === null}
                        aria-label={title}
                    />
                )}
                {actions === undefined ? null : <Group gap="xs">{actions}</Group>}
            </Stack>
        </Paper>
    );
}
