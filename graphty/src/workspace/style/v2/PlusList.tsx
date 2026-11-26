/**
 * Style panel v2's one "+" list (design/ui/style-panel-v2/design.md, section 2.3): a titled list whose
 * only button is its "+". At section level it is a `ControlSection` that collapses from its caret alone and
 * remembers that in the reader's own preferences; its title adds nothing and collapses nothing. At group level
 * (a pop-over's sub-group, an item list) it is an always-open `ControlGroup` with the "+" in its legend.
 * Every v2 section, pop-over group and item list that shows a "+" is one of these.
 */

import { ControlGroup, ControlSection } from "@graphty/compact-mantine";
import React, { useState } from "react";

import { readPreference, styleSectionCollapsed, writePreference } from "../../settings/preferences";

/** Props for PlusList. */
interface PlusListProps {
    /** A whole section of the panel, or a group inside a section or a pop-over. */
    readonly level: "section" | "group";
    /** Its title. */
    readonly title: string;
    /** Its "+" (an `AddButton`), or nothing when there is nothing left to add. */
    readonly add: React.ReactNode;
    /** A group's own minus, after its "+" (a pop-over sub-group the reader added). */
    readonly remove?: React.ReactNode;
    /** Whether it holds nothing yet (section level): its header alone. */
    readonly empty?: boolean;
    /** Whether a section's title is a heading; a bar that only adds (Add section) is not one. */
    readonly heading?: boolean;
    /** Where a section's collapsed state is kept (`<kind>:<id>`); without it the section does not collapse. */
    readonly collapseKey?: string;
    /** Its rows. */
    readonly children?: React.ReactNode;
}

/**
 * Stops a pointer click on a section header's title from collapsing it: only its caret does. A click the
 * browser makes from Enter or Space (`detail` 0) still toggles, so the header stays one keyboard control:
 * it keeps the button role, and Enter on it collapses the section.
 *
 * TEMPORARY workaround of a compact-mantine defect (issue #9142): `ControlSection`'s toggle is one button
 * around the caret, the title and the summary, with no caret-only collapse. This handler and the cursor rule
 * in style.css are deleted when compact-mantine gains one (it waits for the owner's Figma approval).
 * @param event - the click, in its capture phase.
 */
function caretOnly(event: React.MouseEvent<HTMLElement>): void {
    const target = event.target as Element;
    const toggle = target.closest('[data-testid="control-section-toggle"]');
    if (
        toggle !== null &&
        event.detail > 0 &&
        target.closest('[data-testid="control-section-chevron-slot"]') === null
    ) {
        event.stopPropagation();
    }
}

/**
 * A section's collapsed state, read from and written to the reader's preferences.
 * @param collapseKey - where it is kept, or undefined for a section that does not collapse.
 * @returns whether it is open and a setter.
 */
function useOpen(collapseKey: string | undefined): [boolean, (open: boolean) => void] {
    const preference =
        collapseKey === undefined
            ? undefined
            : styleSectionCollapsed(collapseKey.split(":")[0], collapseKey.split(":").slice(1).join(":"));
    // on reload: fresh: derived: read from the reader's preference
    const [open, setOpen] = useState(() => preference === undefined || readPreference(preference) === "open");
    return [
        open,
        (next: boolean) => {
            setOpen(next);
            if (preference !== undefined) {
                writePreference(preference, next ? "open" : "collapsed");
            }
        },
    ];
}

/**
 * The list: see the file header.
 * @param props - Component props
 * @param props.level - see PlusListProps
 * @param props.title - see PlusListProps
 * @param props.add - see PlusListProps
 * @param props.remove - see PlusListProps
 * @param props.empty - see PlusListProps
 * @param props.heading - see PlusListProps
 * @param props.collapseKey - see PlusListProps
 * @param props.children - see PlusListProps
 * @returns The list
 */
export function PlusList({
    level,
    title,
    add,
    remove,
    empty = false,
    heading = true,
    collapseKey,
    children,
}: PlusListProps): React.JSX.Element {
    const [open, setOpen] = useOpen(collapseKey);
    if (level === "group") {
        return (
            <div data-plus-list="group">
                <ControlGroup
                    label={title}
                    actions={
                        remove === undefined ? (
                            add
                        ) : (
                            <>
                                {add}
                                {remove}
                            </>
                        )
                    }
                >
                    {children}
                </ControlGroup>
            </div>
        );
    }
    return (
        <div data-plus-list="section" onClickCapture={caretOnly}>
            <ControlSection
                label={title}
                headingLevel={heading ? 3 : undefined}
                collapsible={collapseKey !== undefined}
                opened={open}
                onOpenChange={setOpen}
                hasConfiguredValues={false}
                empty={empty}
                actions={
                    add === null || add === undefined ? undefined : (
                        // A "+" on a collapsed list opens it, then adds.
                        <span
                            className="ws-plus-slot"
                            onClickCapture={() => {
                                if (!open) {
                                    setOpen(true);
                                }
                            }}
                        >
                            {add}
                        </span>
                    )
                }
            >
                {children}
            </ControlSection>
        </div>
    );
}

/**
 * One kind's rows inside a long PlusList section: an always-open legend over them (a divider, never a
 * second collapsible level), as a section of more than 8 rows separates its rows by kind.
 * @param props - Component props
 * @param props.label - the kind's name
 * @param props.children - its rows
 * @returns The legend and its rows
 */
export function PlusListKind({
    label,
    children,
}: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div data-plus-list-kind={label}>
            <ControlGroup label={label}>{children}</ControlGroup>
        </div>
    );
}
