import { Group, Paper, Progress, Stack, Text } from "@mantine/core";
import React, { useId } from "react";

/** Props for StateCard. */
interface StateCardProps {
    /** The state's icon, drawn beside the title. */
    icon: React.ReactNode;
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
 * The canvas's one state card pattern (tier1-design.md section 2.4): an icon, a title, one
 * sentence, an optional bar and at most two buttons, centered on the canvas.
 *
 * Only the title is a live region, so a screen reader announces the state once; the sentence and
 * the bar, which change on every chunk of a load, are read when the reader moves to them.
 * @param props - Component props
 * @param props.icon - The state's icon
 * @param props.title - What the state is
 * @param props.sentence - One sentence more
 * @param props.progress - A fraction, or null for an indeterminate bar
 * @param props.actions - At most two buttons
 * @returns The card
 */
export function StateCard({ icon, title, sentence, progress, actions }: StateCardProps): React.JSX.Element {
    const titleId = useId();
    return (
        <Paper component="section" aria-labelledby={titleId} className="ws-state-card" withBorder shadow="sm" p="md">
            <Stack gap="xs">
                <Group gap="xs" wrap="nowrap">
                    <span aria-hidden="true" className="ws-state-card-icon">
                        {icon}
                    </span>
                    <Text id={titleId} role="status" fw={500}>
                        {title}
                    </Text>
                </Group>
                {sentence === undefined ? null : <Text size="sm">{sentence}</Text>}
                {progress === undefined ? null : (
                    // An indeterminate bar is a full, moving one: no invented fraction.
                    <Progress
                        value={progress === null ? 100 : progress * 100}
                        animated={progress === null}
                        aria-label="Progress"
                    />
                )}
                {actions === undefined ? null : <Group gap="xs">{actions}</Group>}
            </Stack>
        </Paper>
    );
}
