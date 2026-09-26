import { useId, useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { useShellStyles } from "./roving";

/**
 * Figma's palette search glyph (dt/light-dialog-quick-actions #40, #41): a 15 x 15 lens drawn in
 * the 32 x 32 slot.
 * @returns The glyph
 */
function SearchGlyph(): React.JSX.Element {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false" style={{ display: "block" }}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M18.847 19.555c-1.096.934-2.517 1.498-4.07 1.498-3.467 0-6.277-2.81-6.277-6.276 0-3.467 2.81-6.277 6.277-6.277 3.466 0 6.276 2.81 6.276 6.277 0 1.553-.564 2.975-1.499 4.07l3.945 3.945-.707.708zm1.206-4.778c0 2.914-2.362 5.276-5.276 5.276-2.915 0-5.277-2.362-5.277-5.276 0-2.915 2.362-5.277 5.277-5.277 2.914 0 5.276 2.362 5.276 5.277"
            />
        </svg>
    );
}

/** One action of the palette. */
export interface QuickAction {
    /** The action's identifier, handed to `onRun`. */
    value: string;
    /** The action's name. */
    label: string;
    /** A 24px glyph before the name. */
    icon?: React.ReactNode;
    /** The keyboard shortcut, shown right-aligned. */
    shortcut?: string;
    /** The section heading the action is listed under ("Recents", "Design tools"). */
    section?: string;
    /** Extra words the default filter matches. */
    keywords?: readonly string[];
    /** Shown, but cannot be run or highlighted. */
    disabled?: boolean;
}

/**
 * Props for the QuickActions component.
 */
export interface QuickActionsProps {
    /** Every action. Sections appear in the order their first action does. */
    actions: readonly QuickAction[];
    /** Called with an action's value when it is run (Enter, or a click). */
    onRun: (value: string) => void;
    /** Called by Escape. */
    onClose?: () => void;
    /** The search text (controlled). */
    query?: string;
    /** Called as the search text changes. */
    onQueryChange?: (query: string) => void;
    /** Which actions match the search. Defaults to a case-insensitive substring of the name or a keyword. */
    filter?: (action: QuickAction, query: string) => boolean;
    /** Rendered between the search field and the list: scope tabs, for example. */
    header?: React.ReactNode;
    /** Accessible name of the dialog. Defaults to the "Quick actions" label. */
    "aria-label"?: string;
    /** Placeholder of the search field. Defaults to the "Search actions" label. */
    placeholder?: string;
    /** Panel width. Default 529 (Figma's, the toolbar's width). */
    width?: number;
    /** Panel height. Default 354. */
    height?: number;
    className?: string;
    style?: React.CSSProperties;
}

function defaultFilter(action: QuickAction, query: string): boolean {
    const q = query.trim().toLowerCase();
    return (
        q === "" ||
        action.label.toLowerCase().includes(q) ||
        (action.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    );
}

/**
 * Figma's quick actions palette: a 529 x 354 panel (the caller positions it; Figma puts it 8px
 * above the toolbar) with a 32 tall search field, section headings and 32 tall rows. Typing
 * filters live; ArrowUp / ArrowDown move the highlight while focus stays in the field (a
 * combobox with `aria-activedescendant` on a listbox); Enter runs; Escape closes. The first row
 * is highlighted on open and after every change of the search.
 * @param props - Component props
 * @param props.actions - Every action
 * @param props.onRun - Called with an action's value when it is run
 * @param props.onClose - Called by Escape
 * @param props.query - The search text (controlled)
 * @param props.onQueryChange - Called as the search text changes
 * @param props.filter - Which actions match the search
 * @param props.header - Rendered between the search field and the list
 * @param props.placeholder - Placeholder of the search field
 * @param props.width - Panel width
 * @param props.height - Panel height
 * @param props.className - Extra class on the panel
 * @param props.style - Extra style on the panel
 * @returns The palette
 */
export function QuickActions({
    actions,
    onRun,
    onClose,
    query,
    onQueryChange,
    filter = defaultFilter,
    header,
    placeholder,
    width = 529,
    height = 354,
    className,
    style,
    ...others
}: QuickActionsProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useUncontrolled({ value: query, defaultValue: "", finalValue: "", onChange: onQueryChange });

    const sections = useMemo(() => {
        const bySection = new Map<string, QuickAction[]>();
        for (const action of actions) {
            if (!filter(action, search)) {
                continue;
            }
            const key = action.section ?? "";
            bySection.set(key, [...(bySection.get(key) ?? []), action]);
        }
        return [...bySection.entries()];
    }, [actions, filter, search]);
    const enabled = sections.flatMap(([, list]) => list).filter((a) => !a.disabled);

    // The highlight belongs to the search it was made in, so a new search highlights its first
    // result again.
    const [marked, setMarked] = useState<{ search: string; value?: string }>({ search: "" });
    const current =
        marked.search === search && enabled.some((a) => a.value === marked.value) ? marked.value : enabled[0]?.value;
    const setHighlight = (value: string): void => {
        setMarked({ search, value });
    };
    useEffect(() => {
        input.current?.focus();
    }, []);

    const optionId = (value: string): string => `${id}-option-${value}`;

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const index = enabled.findIndex((a) => a.value === current);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (enabled.length === 0) {
                return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            const next = enabled[(index + step + enabled.length) % enabled.length];
            setHighlight(next.value);
            document.getElementById(optionId(next.value))?.scrollIntoView?.({ block: "nearest" });
        } else if (event.key === "Enter" && current !== undefined) {
            event.preventDefault();
            onRun(current);
        } else if (event.key === "Escape" && onClose) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    };

    const name = others["aria-label"] ?? labels.quickActions;
    return (
        <div
            role="dialog"
            aria-label={name}
            className={className ? `cm-quick-actions ${className}` : "cm-quick-actions"}
            style={{ width, height, ...style }}
        >
            <div className="cm-field cm-qa-search">
                <span className="cm-qa-search-icon" aria-hidden="true">
                    <SearchGlyph />
                </span>
                <input
                    ref={input}
                    className="cm-qa-input"
                    type="text"
                    role="combobox"
                    aria-label={placeholder ?? labels.searchActions}
                    aria-expanded="true"
                    aria-controls={`${id}-list`}
                    aria-autocomplete="list"
                    aria-activedescendant={current === undefined ? undefined : optionId(current)}
                    placeholder={placeholder ?? labels.searchActions}
                    value={search}
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                    }}
                    onKeyDown={onKeyDown}
                />
            </div>
            {header}
            <div className="cm-qa-list" id={`${id}-list`} role="listbox" aria-label={name}>
                {sections.length === 0 ? <div className="cm-qa-empty">{labels.noResults}</div> : null}
                {sections.map(([section, list]) => (
                    <div className="cm-qa-group" role="group" aria-label={section || undefined} key={section}>
                        {section ? (
                            <div className="cm-qa-group-title" aria-hidden="true">
                                {section}
                            </div>
                        ) : null}
                        {list.map((action) => (
                            <div
                                key={action.value}
                                id={optionId(action.value)}
                                role="option"
                                aria-selected={action.value === current}
                                aria-disabled={action.disabled || undefined}
                                className="cm-qa-row"
                                data-highlighted={action.value === current || undefined}
                                onMouseMove={() => {
                                    if (!action.disabled) {
                                        setHighlight(action.value);
                                    }
                                }}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                }}
                                // Focus stays in the search field (aria-activedescendant); the row
                                // takes tabIndex -1 only so a pointer or assistive technology that
                                // does move focus onto it can still run it with Enter.
                                tabIndex={-1}
                                onClick={() => {
                                    if (!action.disabled) {
                                        onRun(action.value);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !action.disabled) {
                                        onRun(action.value);
                                    }
                                }}
                            >
                                <span className="cm-qa-row-icon" aria-hidden="true">
                                    {action.icon}
                                </span>
                                <span className="cm-qa-row-label">{action.label}</span>
                                {action.shortcut ? <span className="cm-qa-row-shortcut">{action.shortcut}</span> : null}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
