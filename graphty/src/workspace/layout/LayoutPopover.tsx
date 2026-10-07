import type { GraphSession } from "@graphty/graphty-element/session";
import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { LayoutForm } from "./LayoutForm";
import { layoutChoices } from "./methods";

/** Props for LayoutPopover. */
interface LayoutPopoverProps {
    session: GraphSession;
    /** Closes the popover, returning focus to Layout. */
    onClose: () => void;
    /** A layout to open on, for a story. */
    initialPick?: string;
}

/**
 * The toolbar's Layout popover: the list of every layout in the element's catalog, the current
 * one checked, "Recommended" and "slow" beside a name, and a layout that cannot run now dimmed
 * with the reason. A tap opens that layout's form. Esc steps back from the form to the list, and
 * a second Esc closes. Applying closes the popover.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.initialPick - A layout to open on
 * @returns The popover's body
 */
export function LayoutPopover({ session, onClose, initialPick }: Readonly<LayoutPopoverProps>): React.JSX.Element {
    const [picked, setPicked] = useState<string | undefined>(initialPick);
    const choices = layoutChoices(session);
    const open = choices.find((choice) => choice.descriptor.id === picked);
    const listRef = useRef<HTMLDivElement>(null);
    // On the list, focus sits on the checked row, so Esc (back from a form, or a second time)
    // reaches the popover's own handler.
    useEffect(() => {
        if (picked === undefined) {
            listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
        }
    }, [picked]);

    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key !== "Escape") {
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
                key={open.descriptor.id}
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
            <div className="ws-analyze-list" role="listbox" aria-label="Layouts" ref={listRef}>
                {choices.map((choice) => (
                    <UnstyledButton
                        component="div"
                        role="option"
                        key={choice.descriptor.id}
                        tabIndex={0}
                        className="ws-analyze-entry"
                        aria-selected={choice.current}
                        aria-disabled={choice.reason !== null}
                        aria-description={choice.reason ?? undefined}
                        onClick={() => {
                            if (choice.reason === null) {
                                setPicked(choice.descriptor.id);
                            }
                        }}
                        onKeyDown={(event: React.KeyboardEvent) => {
                            if ((event.key === "Enter" || event.key === " ") && choice.reason === null) {
                                event.preventDefault();
                                setPicked(choice.descriptor.id);
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
