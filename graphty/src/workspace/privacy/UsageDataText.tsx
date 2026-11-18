import "./privacy.css";

import { List, Text } from "@mantine/core";
import type React from "react";

/** The owner's words, kept whole (tier1-design.md section 2.11; an owner decision). */
const OWNER_HEADLINE = "Your data is yours, but please help us.";
const OWNER_TEXT =
    "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions.";

/** What Share usage data adds to the anonymous counts everyone sends. */
const COLLECTED = [
    "A replay of some sessions, with all text, typing, labels, file names and the graph hidden (PostHog).",
    "Which buttons, panels, commands and steps you use, by name only, and how you use the canvas: selecting, dragging, zooming (PostHog).",
    "Page speed.",
    "Your answers to a short survey, if you answer it, including any text you type in its Other box.",
    "Error reports, with a masked replay of the moments before the error (Sentry).",
    "Feedback you send.",
];

/**
 * The owner's request and the "What is collected" disclosure, shared by the first-visit usage
 * data card and Settings > Privacy so both say the same words.
 * @param props - Component props
 * @param props.headline - Whether to draw the first sentence as the card's headline
 * @param props.assistantSends - Whether a saved provider receives graph values, so "ever" is untrue
 * @returns The text
 */
export function UsageDataText({
    headline = true,
    assistantSends = false,
}: Readonly<{ headline?: boolean; assistantSends?: boolean }>): React.JSX.Element {
    return (
        <>
            {headline ? (
                <Text size="sm" fw={600}>
                    {OWNER_HEADLINE}
                </Text>
            ) : null}
            <Text size="xs">{headline ? OWNER_TEXT : `${OWNER_HEADLINE} ${OWNER_TEXT}`}</Text>
            <details className="ws-collected">
                <summary>What is collected</summary>
                <List size="xs" spacing={2} mt={4}>
                    {COLLECTED.map((item) => (
                        <List.Item key={item}>{item}</List.Item>
                    ))}
                </List>
                <Text size="xs" mt={4}>
                    PostHog keeps a random id in this browser while sharing is on.
                </Text>
                <Text size="xs" fw={600} mt={4}>
                    {assistantSends
                        ? "Usage data holds no file contents."
                        : "No file contents ever leave your computer."}
                </Text>
            </details>
        </>
    );
}
