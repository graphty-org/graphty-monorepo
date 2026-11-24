/**
 * The lines the data pop-overs share (tmp/entries-first/spec.md, Part 2): a line with its name above, word segments,
 * a text field that writes once, and a pop-over opened beside the one it sits in (an entry's Format and Calculate).
 */

import { PanelField, Popout, SegmentedControl } from "@graphty/compact-mantine";
import { ActionIcon } from "@mantine/core";
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
 * @param props.children - its control
 * @returns The line
 */
export function PopLine({
    line,
    name,
    wide,
    modifier,
    children,
}: Readonly<{
    line: string;
    name: string | null;
    wide?: boolean;
    modifier?: React.ReactNode;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <LineFrame
            line={line}
            name={name}
            set
            rule="R12"
            control={children}
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
    const commit = (): void => {
        if (typed !== null && typed !== (value ?? "")) {
            onCommit(typed);
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
                value={typed ?? value ?? ""}
                placeholder={unset}
                onChange={(next) => {
                    setTyped(String(next));
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
 * @returns The pop-over
 */
export function BesidePopover({
    title,
    opened,
    onOpenChange,
    children,
}: Readonly<{
    title: string;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
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
                    <div data-thing-popover="" data-beside-pop={title}>
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
