/**
 * The lines the data pop-overs share (tmp/entries-first/spec.md, Part 2): a line with its name above, word segments,
 * a text field that writes once, and a pop-over opened beside the one it sits in (an entry's Format and Calculate).
 */

import { ComboInput, PanelField, Popout, SegmentedControl } from "@graphty/compact-mantine";
import { ActionIcon, Group } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { LineFrame } from "./RubricLine";

/**
 * One line of a pop-over: its name above, its control.
 * @param props - Component props
 * @param props.line - what it edits
 * @param props.name - its name
 * @param props.wide - two inputs on the line: its name above them and they across the line
 * @param props.modifier - its "..." slot
 * @param props.first - a wide line's first control's width in px, when it is a short field beside a wider one
 * @param props.set - whether the spec sets what the line edits (its mark in a group's "..." menu)
 * @param props.children - its control
 * @returns The line
 */
export function PopLine({
    line,
    name,
    wide,
    modifier,
    first,
    set = false,
    children,
}: Readonly<{
    line: string;
    name: string | null;
    wide?: boolean;
    modifier?: React.ReactNode;
    first?: number;
    set?: boolean;
    children: React.ReactNode;
}>): React.JSX.Element {
    // Two inputs side by side across the line, each half of it, as a rubric line's number and its unit sit.
    const parts = React.Children.toArray(children);
    const control =
        wide === true && parts.length > 1 ? (
            <Group gap={8} wrap="nowrap">
                {parts.map((part, at) => (
                    <div
                        // Children.toArray keys every element it returns.
                        key={React.isValidElement(part) ? part.key : null}
                        style={
                            at === 0 && first !== undefined
                                ? { flex: `0 0 ${String(first)}px` }
                                : { flex: 1, minWidth: 0 }
                        }
                    >
                        {part}
                    </div>
                ))}
            </Group>
        ) : (
            children
        );
    return (
        <LineFrame
            line={line}
            name={name}
            set={set}
            rule="R12"
            control={control}
            modifier={modifier ?? null}
            removeName={undefined}
            onRemove={() => undefined}
            wide={wide}
        />
    );
}

/**
 * A row of word segments.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the segment in force
 * @param props.options - each segment's value and words, and why it cannot be picked
 * @param props.onPick - called with the segment picked
 * @returns The control
 */
export function Segments({
    label,
    value,
    options,
    onPick,
}: Readonly<{
    label: string;
    value: string;
    options: readonly (readonly [string, string, string?])[];
    onPick: (value: string) => void;
}>): React.JSX.Element {
    return (
        <SegmentedControl
            label={label}
            fullWidth
            size="xs"
            value={value}
            onChange={onPick}
            data={options.map(([each, words, disabled]) => ({
                value: each,
                label: disabled === undefined ? words : <span title={disabled}>{words}</span>,
                disabled: disabled !== undefined,
            }))}
        />
    );
}

/**
 * A text field that writes once, on Enter or when it loses focus, never per keystroke (one undo step per edit).
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - what it holds
 * @param props.unset - what it shows when it holds nothing
 * @param props.onCommit - called with the words, "" for none
 * @returns The field
 */
export function CommitText({
    label,
    value,
    unset,
    onCommit,
}: Readonly<{
    label: string;
    value: string | undefined;
    unset: string;
    onCommit: (words: string) => void;
}>): React.JSX.Element {
    const [typed, setTyped] = useState<string | null>(null);
    // Unset, the field shows the default as its value (design "Input rules": every input shows a value); words that
    // are still the default write nothing.
    const shown = value ?? unset;
    const commit = (): void => {
        if (typed !== null && typed !== shown) {
            onCommit(typed === unset && value === undefined ? "" : typed);
        }
        setTyped(null);
    };
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- catches Enter and the blur bubbling from the text field inside, to write once; the field is the keyboard's door
        <div
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit();
                }
            }}
        >
            <PanelField
                label={label}
                kind="text"
                width="fill"
                value={typed ?? shown}
                onChange={(next) => {
                    setTyped(String(next));
                }}
            />
        </div>
    );
}

/**
 * A number field that may be unset: it shows its default word ("Auto", "All") as its value while unset, as the
 * rubric's number lines do (design "Input rules": no input is empty); emptied and Enter unsets it.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the number set, if any
 * @param props.unset - the word it shows while unset
 * @param props.min - its least value
 * @param props.onWrite - writes a number, or undefined to unset
 * @returns The field
 */
export function WordNumber({
    label,
    value,
    unset,
    min,
    onWrite,
}: Readonly<{
    label: string;
    value: number | undefined;
    unset: string;
    min?: number;
    onWrite: (value: number | undefined) => void;
}>): React.JSX.Element {
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only hears Enter bubbling from its own field
        <div
            style={{ display: "contents" }}
            onKeyDown={(event) => {
                const input = event.target;
                if (event.key === "Enter" && input instanceof HTMLInputElement && input.value.trim() === "") {
                    onWrite(undefined);
                }
            }}
        >
            <ComboInput
                label={label}
                width="100%"
                numeric
                options={[]}
                glyph={label.charAt(0)}
                value={value ?? unset}
                min={min}
                onChange={(next) => {
                    if (typeof next === "number") {
                        onWrite(next);
                    } else if (next === "") {
                        onWrite(undefined);
                    }
                }}
            />
        </div>
    );
}

/** A beside pop-over's width: the settings pop-over's own. */
const BESIDE_WIDTH = 264;

/**
 * A pop-over opened beside the pop-over it sits in (compact-mantine's `placement="beside"`), as a group's is.
 * @param props - Component props
 * @param props.title - its title
 * @param props.opened - whether it is open
 * @param props.onOpenChange - called when it opens or closes
 * @param props.children - its lines
 * @param props.id - its id, for the `aria-controls` of the button that opens it
 * @returns The pop-over
 */
export function BesidePopover({
    title,
    opened,
    onOpenChange,
    children,
    id,
}: Readonly<{
    title: string;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    id?: string;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Panel
                width={BESIDE_WIDTH}
                placement="beside"
                gap={8}
                header={{ variant: "title", title }}
                closeLabel={`Close ${title}`}
            >
                <Popout.Content>
                    <div id={id} data-thing-popover="" data-beside-pop={title}>
                        {opened ? children : null}
                    </div>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * A line's "..." that opens a pop-over beside: the button, and the pop-over.
 * @param props - Component props
 * @param props.label - the button's name
 * @param props.title - the pop-over's title
 * @param props.opened - whether it is open
 * @param props.onOpenChange - called when it opens or closes
 * @param props.children - its lines
 * @returns The button and its pop-over
 */
export function BesideMore({
    label,
    title,
    opened,
    onOpenChange,
    children,
}: Readonly<{
    label: string;
    title: string;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={label}
                aria-expanded={opened}
                data-open={opened ? "" : undefined}
                onClick={() => {
                    onOpenChange(!opened);
                }}
            >
                <GLYPHS.more size={14} aria-hidden />
            </ActionIcon>
            <BesidePopover title={title} opened={opened} onOpenChange={onOpenChange}>
                {children}
            </BesidePopover>
        </>
    );
}
