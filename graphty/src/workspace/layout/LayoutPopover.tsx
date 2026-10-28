import type { GraphSession } from "@graphty/graphty-element/session";
import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { LayoutForm } from "./LayoutForm";
import { LAYOUT_SECTIONS, type LayoutChoice, layoutChoices, sectionOf, useLayouts } from "./methods";

/** Props for LayoutPopover. */
interface LayoutPopoverProps {
    session: GraphSession;
    /** Closes the popover, returning focus to Layout. */
    onClose: () => void;
    /** A row to open on, for a story: a layout's id, or `<id>:<engine>`. */
    initialPick?: string;
}

/**
 * The rows the arrow keys move between: ArrowDown and ArrowUp step across sections (headings are
 * not options), Home and End go to the first and last row.
 * @param key - the key pressed.
 * @param at - the focused row's position.
 * @param count - how many rows there are.
 * @returns the row to focus, or undefined for any other key.
 */
function stepTo(key: string, at: number, count: number): number | undefined {
    switch (key) {
        case "ArrowDown":
            return Math.min(at + 1, count - 1);
        case "ArrowUp":
            return Math.max(at - 1, 0);
        case "Home":
            return 0;
        case "End":
            return count - 1;
        default:
            return undefined;
    }
}

/**
 * The toolbar's Layout popover: the list of every layout in the element's catalog and every engine
 * but a layout's default, under a heading for its catalog family, each with its description as a
 * dimmed second line, Graphviz's marked so; the current one checked, "Recommended" and "slow" beside
 * a name, and a row that cannot run now dimmed with the reason. The list is one Tab stop: focus
 * starts on the checked row, else the first that can run, and the arrow keys, Home and End move it.
 * Enter, Space or a tap opens that layout's form. Esc steps back from the form to the list, and a
 * second Esc closes. Applying closes the popover.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.initialPick - A row to open on: a layout's id, or `<id>:<engine>`
 * @returns The popover's body
 */
export function LayoutPopover({ session, onClose, initialPick }: Readonly<LayoutPopoverProps>): React.JSX.Element {
    const [picked, setPicked] = useState<string | undefined>(initialPick);
    const choices = layoutChoices(session, useLayouts(session));
    const open = choices.find((choice) => choice.key === picked);
    const listRef = useRef<HTMLDivElement>(null);
    const [focusKey, setFocusKey] = useState<string | undefined>(undefined);
    // The list's one Tab stop: the row last focused, else the checked row, else the first that can run.
    const stop =
        choices.find((choice) => choice.key === focusKey) ??
        choices.find((choice) => choice.current) ??
        choices.find((choice) => choice.reason === null) ??
        choices.at(0);
    // On the list, focus sits on that row, so Esc (back from a form, or a second time) reaches the
    // popover's own handler.
    useEffect(() => {
        if (picked === undefined) {
            listRef.current?.querySelector<HTMLElement>('[role="option"][tabindex="0"]')?.focus();
        }
    }, [picked]);
    const sections = LAYOUT_SECTIONS.map(({ title }) => ({
        title,
        rows: choices.filter((choice) => sectionOf(choice.descriptor.family) === title),
    })).filter((section) => section.rows.length > 0);
    const ordered: LayoutChoice[] = sections.flatMap((section) => section.rows);

    const onListKeyDown = (event: React.KeyboardEvent): void => {
        const at = ordered.findIndex((choice) => choice.key === stop?.key);
        const next = stepTo(event.key, at, ordered.length);
        if (next === undefined) {
            return;
        }
        event.preventDefault();
        setFocusKey(ordered[next].key);
        listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (!isPanelEscape(event)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (open === undefined) {
            onClose();
        } else {
            setPicked(undefined);
        }
    };

    if (open !== undefined) {
        return (
            <LayoutForm
                key={open.key}
                session={session}
                descriptor={open.descriptor}
                focusButton
                onApplied={onClose}
                onKeyDown={onKeyDown}
                header={
                    <Group gap={4} wrap="nowrap">
                        <UnstyledButton
                            aria-label="Back to layouts"
                            className="ws-analyze-back"
                            onClick={() => {
                                setPicked(undefined);
                            }}
                        >
                            <GLYPHS.back size={16} />
                        </UnstyledButton>
                        <Text size="sm" fw={600}>
                            {open.name}
                        </Text>
                    </Group>
                }
            />
        );
    }

    return (
        <Stack gap={4} className="ws-analyze" onKeyDown={onKeyDown}>
            <div // NOSONAR(S6819): an ARIA listbox of rich options; a native select cannot draw them
                className="ws-analyze-list"
                role="listbox"
                aria-label="Layouts"
                ref={listRef}
                onKeyDown={onListKeyDown}
            >
                {sections.map(({ title, rows }) => (
                    <div // NOSONAR(S6819): an option group inside an ARIA listbox; optgroup needs a native select
                        role="group"
                        key={title}
                        aria-label={title}
                    >
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            {title}
                        </Text>
                        {rows.map((choice) => (
                            <UnstyledButton // NOSONAR(S6811): aria-description is the ARIA 1.3 attribute that gives an option its one-line gloss
                                component="div"
                                role="option"
                                key={choice.key}
                                tabIndex={choice.key === stop?.key ? 0 : -1}
                                className="ws-analyze-entry"
                                aria-selected={choice.current}
                                aria-disabled={choice.reason !== null}
                                aria-description={choice.reason ?? choice.description}
                                onFocus={() => {
                                    setFocusKey(choice.key);
                                }}
                                onClick={() => {
                                    if (choice.reason === null) {
                                        setPicked(choice.key);
                                    }
                                }}
                                onKeyDown={(event: React.KeyboardEvent) => {
                                    if ((event.key === "Enter" || event.key === " ") && choice.reason === null) {
                                        event.preventDefault();
                                        setPicked(choice.key);
                                    }
                                }}
                            >
                                <Group gap={8} wrap="nowrap" align="flex-start">
                                    <span className="ws-analyze-icon" aria-hidden="true" style={{ width: 16 }}>
                                        {choice.current ? <GLYPHS.check size={16} /> : null}
                                    </span>
                                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                        <Group gap={6} wrap="nowrap">
                                            <Text size="sm" c={choice.reason === null ? undefined : "dimmed"}>
                                                {choice.name}
                                            </Text>
                                            {choice.graphviz ? (
                                                <Text size="xs" c="dimmed">
                                                    Graphviz
                                                </Text>
                                            ) : null}
                                            {choice.recommended ? (
                                                <Badge size="xs" variant="light">
                                                    Recommended
                                                </Badge>
                                            ) : null}
                                            {choice.slow ? (
                                                <Badge size="xs" variant="light" color="gray">
                                                    slow
                                                </Badge>
                                            ) : null}
                                        </Group>
                                        <Text size="xs" c="dimmed" data-testid="layout-description">
                                            {choice.description}
                                        </Text>
                                        {choice.reason === null ? null : (
                                            <Text size="xs" c="dimmed">
                                                {choice.reason}
                                            </Text>
                                        )}
                                    </Stack>
                                </Group>
                            </UnstyledButton>
                        ))}
                    </div>
                ))}
            </div>
        </Stack>
    );
}
