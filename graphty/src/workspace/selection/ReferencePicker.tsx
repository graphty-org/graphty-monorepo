/**
 * The reference picker of a Relative to step (design/ui/selection-groups/spec.md, sections 4.2 and
 * 4.3): one token in a field, and a search-first list that never grows with the graph
 * (`references.ts`).
 */

import { LISTBOX_CLASS_NAMES, TargetTooltip } from "@graphty/compact-mantine";
import type { GraphSession, NodeId, StepReference } from "@graphty/graphty-element/session";
import { ActionIcon, Combobox, Group, Input, InputBase, ScrollArea, useCombobox } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { PICK_NODE_EVENT } from "../table/RecordTable";
import { PICK_ON_CANVAS, referenceSections } from "./references";
import type { Host } from "./values";
import { referenceWords } from "./words";

/**
 * A reference as the list's option value.
 * @param reference - the reference.
 * @returns the value, or null while none is chosen or it holds several nodes.
 */
function referenceValue(reference: StepReference | undefined): string | null {
    if (reference === undefined) {
        return null;
    }
    if (typeof reference === "string") {
        return reference;
    }
    if ("set" in reference) {
        return `set:${reference.set}`;
    }
    if ("nodes" in reference && reference.nodes.length === 1) {
        return `node:${String(reference.nodes[0])}`;
    }
    return null;
}

/**
 * An option value as a reference.
 * @param value - the value.
 * @returns the reference.
 */
function referenceOfValue(value: string): StepReference {
    if (value.startsWith("set:")) {
        return { set: value.slice(4) };
    }
    if (value.startsWith("node:")) {
        return { nodes: [value.slice(5)] };
    }
    return value as StepReference;
}

/**
 * The reference field: its token ("Valjean", "Selected (1,240)", a set's name), and a list that
 * opens searching.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.host - where the selection is edited
 * @param props.reference - the step's reference, or undefined while none is chosen
 * @param props.firstStep - the step is its group's first
 * @param props.onReference - takes the chosen reference
 * @returns The field
 */
export function ReferencePicker({
    session,
    host,
    reference,
    firstStep,
    onReference,
}: Readonly<{
    session: GraphSession;
    host: Host;
    reference: StepReference | undefined;
    firstStep: boolean;
    onReference: (reference: StepReference) => void;
}>): React.JSX.Element {
    const [search, setSearch] = useState("");
    const listId = useId();
    const combobox = useCombobox({
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setSearch("");
        },
        onDropdownOpen: () => {
            combobox.focusSearchInput();
        },
    });
    // Pick on canvas: armed, the next node clicked on the canvas is the reference; Escape disarms.
    const [arming, setArming] = useState(false);
    const take = useRef(onReference);
    take.current = onReference;
    useEffect(() => {
        if (!arming) {
            return undefined;
        }
        document.body.dataset.pickingNode = "";
        const stop = session.on("canvas:element-click", (event) => {
            if ("node" in event) {
                setArming(false);
                take.current({ nodes: [event.node] });
            }
        });
        // A row of the matches strip, or the table, clicked while armed is the pick too.
        const fromTable = (event: Event): void => {
            setArming(false);
            take.current({ nodes: [(event as CustomEvent<NodeId>).detail] });
        };
        window.addEventListener(PICK_NODE_EVENT, fromTable);
        const escape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.stopPropagation();
                setArming(false);
            }
        };
        document.addEventListener("keydown", escape, true);
        return () => {
            delete document.body.dataset.pickingNode;
            stop();
            document.removeEventListener("keydown", escape, true);
            window.removeEventListener(PICK_NODE_EVENT, fromTable);
        };
    }, [arming, session]);
    const typed = search.trim();
    const sections = combobox.dropdownOpened ? referenceSections(session, host, firstStep, typed) : [];
    const chosen = referenceValue(reference);
    const token = reference === undefined ? "" : referenceWords(session, reference);
    return (
        <Combobox
            store={combobox}
            position="bottom-start"
            withinPortal
            classNames={LISTBOX_CLASS_NAMES}
            onOptionSubmit={(value) => {
                combobox.closeDropdown();
                if (value === PICK_ON_CANVAS) {
                    setArming(true);
                    return;
                }
                onReference(referenceOfValue(value));
            }}
        >
            <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <Combobox.Target withAriaAttributes={false}>
                    <InputBase
                        component="button"
                        type="button"
                        pointer
                        data-first-focus
                        aria-label={token === "" ? "Reference" : `Reference: ${token}`}
                        aria-haspopup="listbox"
                        aria-expanded={combobox.dropdownOpened}
                        rightSection={<Combobox.Chevron aria-hidden />}
                        rightSectionPointerEvents="none"
                        style={{ flex: 1, minWidth: 0 }}
                        onClick={() => {
                            combobox.toggleDropdown();
                        }}
                    >
                        <span className="sel-field-text">
                            {token === "" ? <Input.Placeholder>Choose a reference</Input.Placeholder> : token}
                        </span>
                    </InputBase>
                </Combobox.Target>
                <TargetTooltip label="Pick on canvas">
                    <ActionIcon
                        variant={arming ? "light" : "subtle"}
                        size="sm"
                        aria-label="Pick on canvas"
                        aria-pressed={arming}
                        onClick={() => {
                            setArming(!arming);
                        }}
                    >
                        <GLYPHS.pick size={14} aria-hidden />
                    </ActionIcon>
                </TargetTooltip>
            </Group>
            <Combobox.Dropdown data-portal="">
                <Combobox.Search
                    value={search}
                    placeholder="Find a node, a set"
                    aria-label="Find a node, a set"
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                        combobox.selectFirstOption();
                    }}
                />
                <Combobox.Options id={listId} aria-label="References">
                    <ScrollArea.Autosize mah={240} type="scroll" scrollbars="y">
                        {sections.map((section) => (
                            <Combobox.Group key={section.heading.split(" ")[0]} label={section.heading}>
                                {/* Mantine hides a heading alone in its group: the node count is drawn with no rows. */}
                                {section.items.length === 0 && <span aria-hidden />}
                                {section.items.map((each) => (
                                    <Combobox.Option
                                        key={each.value}
                                        value={each.value}
                                        disabled={each.disabled}
                                        active={each.value === chosen}
                                    >
                                        {each.label}
                                    </Combobox.Option>
                                ))}
                            </Combobox.Group>
                        ))}
                    </ScrollArea.Autosize>
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}
