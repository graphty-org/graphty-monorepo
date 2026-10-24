import type { GraphSession } from "@graphty/graphty-element/session";
import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { LayoutForm } from "./LayoutForm";
import { layoutChoices, useLayouts } from "./methods";

/** Props for LayoutPopover. */
interface LayoutPopoverProps {
    session: GraphSession;
    /** Closes the popover, returning focus to Layout. */
    onClose: () => void;
    /** A row to open on, for a story: a layout's id, or `<id>:<engine>`. */
    initialPick?: string;
}

/**
 * The toolbar's Layout popover: the list of every layout in the element's catalog, each with its
 * description as a dimmed second line and every engine but its default nested under it, Graphviz's
 * marked so; the current one checked, "Recommended" and "slow" beside a name, and a row that cannot
 * run now dimmed with the reason. A tap opens that layout's form. Esc steps back from the form to the list, and
 * a second Esc closes. Applying closes the popover.
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
    // On the list, focus sits on the checked row, so Esc (back from a form, or a second time)
    // reaches the popover's own handler.
    useEffect(() => {
        if (picked === undefined) {
            listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
        }
    }, [picked]);

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
            >
                {choices.map((choice) => (
                    <UnstyledButton // NOSONAR(S6811): aria-description is the ARIA 1.3 attribute that gives an option its one-line gloss
                        component="div"
                        role="option"
                        key={choice.key}
                        tabIndex={0}
                        className="ws-analyze-entry"
                        data-nested={choice.nested ? "" : undefined}
                        aria-selected={choice.current}
                        aria-disabled={choice.reason !== null}
                        aria-description={choice.reason ?? choice.description}
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
                        <Group gap={8} wrap="nowrap" align="flex-start" pl={choice.nested ? 16 : 0}>
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
        </Stack>
    );
}
