import { Select, Text } from "@mantine/core";
import React from "react";

/** One choice of a select: what it reads, and the dimmed facts beside it. */
export interface PickChoice {
    readonly value: string;
    readonly label: string;
    readonly hint?: string;
    readonly disabled?: boolean;
}

/** Choices under a heading. */
export interface PickGroup {
    readonly group: string;
    readonly items: readonly PickChoice[];
}

/**
 * Whether a list entry is a group.
 * @param each - the entry
 * @returns true when it is
 */
function isGroup(each: PickChoice | PickGroup): each is PickGroup {
    return "group" in each;
}

/**
 * A select whose picks a join workspace card writes.
 * @param props - Component props
 * @param props.name - its accessible name
 * @param props.placeholder - what it reads with nothing picked; its name by default
 * @param props.data - its choices, in groups or not
 * @param props.value - the choice now, or null
 * @param props.title - what it shows in full on hover
 * @param props.disabled - whether it can be picked from yet
 * @param props.onPick - takes a pick
 * @returns the select
 */
export function Pick({
    name,
    placeholder = name,
    data,
    value,
    title,
    disabled,
    onPick,
}: Readonly<{
    name: string;
    placeholder?: string;
    data: readonly (PickChoice | PickGroup)[];
    value: string | null;
    title?: string;
    disabled?: boolean;
    onPick: (value: string) => void;
}>): React.JSX.Element {
    const hints = new Map(
        data.flatMap((each) => (isGroup(each) ? each.items : [each])).map((each) => [each.value, each.hint]),
    );
    return (
        <Select
            size="xs"
            aria-label={name}
            placeholder={placeholder}
            title={title}
            disabled={disabled}
            allowDeselect={false}
            // The facts beside a choice are never cut to the box's own width.
            comboboxProps={{ width: "max-content", position: "bottom-start" }}
            data={data.map((each) =>
                isGroup(each) ? { group: each.group, items: each.items.map((item) => ({ ...item })) } : { ...each },
            )}
            renderOption={({ option }) => {
                const hint = hints.get(option.value);
                return hint === undefined || hint === "" ? (
                    option.label
                ) : (
                    <span>
                        {`${option.label} `}
                        <Text span size="xs" c="dimmed">
                            {hint}
                        </Text>
                    </span>
                );
            }}
            value={value}
            onChange={(next) => {
                if (next !== null && next !== value) {
                    onPick(next);
                }
            }}
        />
    );
}
