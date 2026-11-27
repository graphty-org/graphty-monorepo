import { Tooltip } from "@mantine/core";
import React from "react";

/**
 * A word segment's label: its word, with a hover tooltip of its long words, else of the word itself (figma-spec 5.2,
 * "Tooltip per option").
 * @param name - its word.
 * @param tip - its long words.
 * @returns the label.
 */
export function tippedWord(name: string, tip?: string): React.ReactNode {
    return (
        <Tooltip label={tip ?? name}>
            <span>{name}</span>
        </Tooltip>
    );
}

/**
 * A segmented control's options with each word label tipped.
 * @param data - each option's value and word.
 * @returns the options, labels tipped.
 */
export function tippedSegments<T extends string>(
    data: readonly { value: T; label: string }[],
): { value: T; label: React.ReactNode }[] {
    return data.map((option) => ({ value: option.value, label: tippedWord(option.label) }));
}
