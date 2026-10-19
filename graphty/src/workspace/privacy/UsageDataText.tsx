import "./privacy.css";

import { List, Text } from "@mantine/core";
import type React from "react";

/** The owner's words, kept whole (tier1-design.md section 2.11; an owner decision). */
const OWNER_HEADLINE = "Your data is yours, but please help us.";
const OWNER_TEXT =
    "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions.";

const COLLECTED = [
    "A replay of each session, with every node name, attribute value, label and file content masked.",
    "Anonymous task events with their timings: file loaded, first graph drawn, measure run, result read, style added, export, undo.",
    "Errors and performance.",
    "A feedback widget.",
];

/**
 * The owner's request and the "What is collected" disclosure, shared by the start screen's usage
 * data card and Settings > Privacy so both say the same words.
 * @param props - Component props
 * @param props.headline - Whether to draw the first sentence as the card's headline
 * @returns The text
 */
export function UsageDataText({ headline = true }: Readonly<{ headline?: boolean }>): React.JSX.Element {
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
                <Text size="xs" fw={600} mt={4}>
                    No file contents ever leave your computer.
                </Text>
            </details>
        </>
    );
}
