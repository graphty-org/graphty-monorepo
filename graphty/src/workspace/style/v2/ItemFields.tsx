/**
 * Style panel v2's item fields: a point as an X | Y pair of numbers on one line (design/ui/style-panel-v2/
 * design.md, section 2.2), for a polygon's points, an edge's bends and a field's place; and words typed into
 * a field (R14), for a Record's fields and a table's cells.
 */

import { PanelField } from "@graphty/compact-mantine";
import type { ChannelDescriptor, ChannelPoint } from "@graphty/graphty-element/catalog";
import { Group } from "@mantine/core";
import React from "react";

import { NumberLine } from "./RubricLine";

/** The point an emptied coordinate reads as. */
const ORIGIN: ChannelPoint = { x: 0, y: 0 };

/**
 * A point as an X | Y pair (design 2.2).
 * @param props - Component props
 * @param props.descriptor - a number descriptor for its coordinates
 * @param props.label - its name ("Line 1 point 2")
 * @param props.point - its coordinates
 * @param props.onWrite - writes new coordinates
 * @returns The pair
 */
export function PointPair({
    descriptor,
    label,
    point,
    onWrite,
}: Readonly<{
    descriptor: ChannelDescriptor;
    label: string;
    point: ChannelPoint | undefined;
    onWrite: (point: ChannelPoint | undefined) => void;
}>): React.JSX.Element {
    const write = (at: "x" | "y", next: number | undefined): void => {
        // Both emptied takes the point off; one emptied reads as 0. A length after a fraction stays.
        const other = at === "x" ? point?.y : point?.x;
        onWrite(next === undefined && other === undefined ? undefined : { ...(point ?? ORIGIN), [at]: next ?? 0 });
    };
    return (
        <Group grow gap={4} wrap="nowrap">
            {(["X", "Y"] as const).map((letter, at) => (
                <NumberLine
                    key={letter}
                    descriptor={descriptor}
                    label={`${label} ${letter.toLowerCase()}`}
                    percent={false}
                    value={at === 0 ? point?.x : point?.y}
                    letter={letter}
                    onWrite={(next) => {
                        write(at === 0 ? "x" : "y", next);
                    }}
                />
            ))}
        </Group>
    );
}

/**
 * Words typed into a field, written on Enter or blur (R14).
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.value - its words
 * @param props.onWrite - writes new words
 * @returns The field
 */
export function WordsField({
    label,
    value,
    onWrite,
}: Readonly<{ label: string; value: string; onWrite: (words: string) => void }>): React.JSX.Element {
    return (
        <PanelField
            key={value}
            kind="text"
            width="fill"
            label={label}
            defaultValue={value}
            onBlur={(event) => {
                if (event.currentTarget.value !== value) {
                    onWrite(event.currentTarget.value);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                }
            }}
        />
    );
}
