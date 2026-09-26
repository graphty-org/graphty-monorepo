import { Kbd, UnstyledButton } from "@mantine/core";
import { useId, useUncontrolled } from "@mantine/hooks";
import React, { useRef } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import { useShellStyles } from "./roving";

/** One shortcut: what it does and the keys that do it. */
export interface ShortcutEntry {
    /** What the shortcut does, such as "Frame tool". */
    label: React.ReactNode;
    /** The key caps, in order, such as `["Shift", "P"]`. */
    keys: readonly string[];
    /** A glyph before the label. */
    icon?: React.ReactNode;
    /** A 12/16 line under the label saying when to use it (the "essential" tab's rows). */
    description?: React.ReactNode;
    /** Draw the entry lit (#80caff): the shortcut the reader just pressed. */
    highlighted?: boolean;
}

/** A column of shortcuts. */
export interface ShortcutGroup {
    /** The column's heading. */
    title?: React.ReactNode;
    /** The column's rows. */
    shortcuts: readonly ShortcutEntry[];
}

/** One tab of the sheet. */
export interface ShortcutSheetTab {
    /** The tab's identifier. */
    value: string;
    /** The tab's text. */
    label: string;
    /** The tab's columns, laid out side by side and centred. */
    groups: readonly ShortcutGroup[];
    /**
     * `"list"` (the default) draws rows of 12px labels and small key caps. `"essential"` draws
     * Figma's first tab (ma/keyboard-shortcuts-essential): a caption above the columns, each
     * column numbered, 68px rows of 14/24 labels with their description under them, and the
     * 31-tall 14px key caps.
     */
    variant?: "list" | "essential";
    /** The 14/24 line above the columns, such as "Essential keyboard shortcuts". */
    caption?: React.ReactNode;
}

/**
 * Props for the ShortcutSheet component.
 */
export interface ShortcutSheetProps {
    /** The tabs, left to right. */
    tabs: readonly ShortcutSheetTab[];
    /** The open tab (controlled). */
    value?: string;
    /** The tab open at first (uncontrolled). Defaults to the first. */
    defaultValue?: string;
    /** Called with a tab's value when it opens. */
    onChange?: (value: string) => void;
    /** Called by the close button and by Escape. Without it the sheet has no close button. */
    onClose?: () => void;
    /** Accessible name of the sheet. Defaults to the "Keyboard shortcuts" label. */
    "aria-label"?: string;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Figma's keyboard shortcuts sheet: docked full width at the window's foot (the caller positions
 * it), #1e1e1e in both themes, a 38px folder-tab strip and columns of shortcuts with dark key caps.
 * Focus is not moved into it on open; ArrowLeft / ArrowRight / Home / End move between tabs and
 * open them (automatic activation); Escape closes it (Figma's does not).
 * @param props - Component props
 * @param props.tabs - The tabs, left to right
 * @param props.value - The open tab (controlled)
 * @param props.defaultValue - The tab open at first
 * @param props.onChange - Called with a tab's value when it opens
 * @param props.onClose - Called by the close button and by Escape
 * @param props.className - Extra class on the sheet
 * @param props.style - Extra style on the sheet
 * @returns The sheet
 */
export function ShortcutSheet({
    tabs,
    value,
    defaultValue,
    onChange,
    onClose,
    className,
    style,
    ...others
}: ShortcutSheetProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const id = useId();
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [current, setCurrent] = useUncontrolled({
        value,
        defaultValue,
        finalValue: tabs[0]?.value,
        onChange,
    });
    const activeIndex = Math.max(
        0,
        tabs.findIndex((t) => t.value === current),
    );
    const active = tabs[activeIndex] as ShortcutSheetTab | undefined;
    const name = others["aria-label"] ?? labels.keyboardShortcuts;
    const essential = active?.variant === "essential";

    // Escape closes the sheet from anywhere focusable in it: its tabs and its close button
    // (the body holds nothing focusable). Figma's sheet ignores Escape; ours does not.
    const closeOnEscape = (event: React.KeyboardEvent): void => {
        if (event.key === "Escape" && onClose) {
            event.stopPropagation();
            onClose();
        }
    };

    const onTabKeyDown = (event: React.KeyboardEvent): void => {
        closeOnEscape(event);
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const back = rtl ? "ArrowRight" : "ArrowLeft";
        let next: number;
        if (event.key === forward) {
            next = (activeIndex + 1) % tabs.length;
        } else if (event.key === back) {
            next = (activeIndex - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
            next = 0;
        } else if (event.key === "End") {
            next = tabs.length - 1;
        } else {
            return;
        }
        event.preventDefault();
        setCurrent(tabs[next].value);
        tabRefs.current[next]?.focus();
    };

    return (
        <section className={className ? `cm-shortcut-sheet ${className}` : "cm-shortcut-sheet"} style={style} aria-label={name}>
            <div className="cm-sheet-strip">
                <div className="cm-sheet-tablist" role="tablist" aria-label={name}>
                    <span className="cm-sheet-filler" data-left-of-active={activeIndex === 0 || undefined} />
                    {tabs.map((tab, i) => (
                        <UnstyledButton
                            key={tab.value}
                            ref={(el: HTMLButtonElement | null) => {
                                tabRefs.current[i] = el;
                            }}
                            role="tab"
                            id={`${id}-tab-${i}`}
                            aria-selected={i === activeIndex}
                            aria-controls={`${id}-panel`}
                            tabIndex={i === activeIndex ? 0 : -1}
                            className="cm-sheet-tab"
                            onKeyDown={onTabKeyDown}
                            data-left-of-active={i === activeIndex - 1 || undefined}
                            data-right-of-active={i === activeIndex + 1 || undefined}
                            onClick={() => {
                                setCurrent(tab.value);
                            }}
                        >
                            {tab.label}
                        </UnstyledButton>
                    ))}
                    <span className="cm-sheet-filler" data-right-of-active={activeIndex === tabs.length - 1 || undefined} />
                </div>
                {onClose ? (
                    <UnstyledButton className="cm-sheet-close" aria-label={labels.close} onClick={onClose} onKeyDown={closeOnEscape}>
                        <UiGlyph name="close" size={12} />
                    </UnstyledButton>
                ) : null}
            </div>
            <div
                className="cm-sheet-body"
                role="tabpanel"
                id={`${id}-panel`}
                aria-labelledby={`${id}-tab-${activeIndex}`}
                data-variant={essential ? "essential" : undefined}
            >
                <div className="cm-sheet-content">
                    {active?.caption ? <div className="cm-sheet-caption">{active.caption}</div> : null}
                    <div className="cm-sheet-columns">
                        {active?.groups.map((group, g) => (
                            <div className="cm-sheet-column" key={g}>
                                {essential ? (
                                    <span className="cm-sheet-step" aria-hidden="true">
                                        {g + 1}
                                    </span>
                                ) : null}
                                {group.title ? <div className="cm-sheet-column-title">{group.title}</div> : null}
                                {group.shortcuts.map((entry, r) => (
                                    <div className="cm-sheet-row" key={r} data-highlighted={entry.highlighted || undefined}>
                                        {entry.icon ? (
                                            <span className="cm-sheet-row-icon" aria-hidden="true">
                                                {entry.icon}
                                            </span>
                                        ) : null}
                                        <span className="cm-sheet-row-label">
                                            {entry.label}
                                            {entry.description ? (
                                                <span className="cm-sheet-row-description">{entry.description}</span>
                                            ) : null}
                                        </span>
                                        <span className="cm-sheet-keys">
                                            {entry.keys.map((key, k) => (
                                                <Kbd key={k} size={essential ? "md" : undefined} mod={{ active: entry.highlighted }}>
                                                    {key}
                                                </Kbd>
                                            ))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
