import { CloseButton } from "@mantine/core";
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
        <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
            style={{ display: "block" }}
        >
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
    /**
     * A second, dimmed line under the name: why a disabled action cannot be run ("Holds
     * groups, not amounts"), or what it does. It is the option's accessible description, so its
     * accessible name stays `label` alone, and it survives a search (which drops the section
     * headings).
     */
    description?: string;
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
    /**
     * Rendered in a 32 tall row between the search field and the list, 8px in from the panel
     * edge: Figma's scope tabs (`<Tabs>` with the theme's pill tabs), for example.
     */
    header?: React.ReactNode;
    /**
     * A trailing action at the right end of the search field, 6px in from its edge and 16px
     * after the text: pass an `<ActionIcon aria-label="...">` (the theme's 24px ghost icon
     * button), as Figma's visual-search button. While there is search text the palette shows its
     * own clear button in this place instead, as Figma does.
     */
    searchAction?: React.ReactNode;
    /** Accessible name of the dialog. Defaults to the "Quick actions" label. */
    "aria-label"?: string;
    /** Placeholder of the search field. Defaults to the "Search actions" label. */
    placeholder?: string;
    /**
     * Show the search field only when there are more actions than this. At or below it the
     * palette is a plain list: focus goes to the list and the arrows, Enter and Escape work
     * there. Default: the search field always shows.
     */
    searchThreshold?: number;
    /**
     * Where focus goes on open: `"search"` (the default) puts it in the search field;
     * `"first"` puts it on the list with the first action highlighted, so Enter runs it at
     * once. Typing a letter on the list moves to the search field.
     */
    initialFocus?: "search" | "first";
    /**
     * How a name too long for its row is cut. `"end"` (the default) ends it with an ellipsis;
     * `"middle"` keeps its start and its end ("shared_ch...apters"), for names that differ at
     * the end. A middle-cut name carries the full name as its tooltip.
     */
    truncate?: "end" | "middle";
    /** Panel width. Default 529 (Figma's, the toolbar's width). */
    width?: number;
    /** Panel height. Default 354. */
    height?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * A name drawn so a long one is cut in the middle: the head shrinks to an ellipsis, the tail
 * (up to its last eight characters) always shows.
 * @param props - Component props
 * @param props.label - The name
 * @returns The two halves
 */
function MiddleCut({ label }: { label: string }): React.JSX.Element {
    const tail = Math.min(8, Math.ceil(label.length / 3));
    return (
        <>
            <span className="cm-qa-row-head">{label.slice(0, label.length - tail)}</span>
            <span className="cm-qa-row-tail">{label.slice(label.length - tail)}</span>
        </>
    );
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
 * filters live, and the results are listed flat (no headings); ArrowUp / ArrowDown move the highlight while focus stays in the field (a
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
 * @param props.searchAction - A trailing action at the right end of the search field
 * @param props.searchThreshold - Show the search field only past this many actions
 * @param props.initialFocus - Focus the search field, or the list with its first action
 * @param props.truncate - Cut a long name at the end or in the middle
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
    searchAction,
    searchThreshold,
    initialFocus = "search",
    truncate = "end",
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
    const list = useRef<HTMLDivElement>(null);
    const searchShown = searchThreshold === undefined || actions.length > searchThreshold;
    const [search, setSearch] = useUncontrolled({
        value: query,
        defaultValue: "",
        finalValue: "",
        onChange: onQueryChange,
    });

    const sections = useMemo(() => {
        const bySection = new Map<string, QuickAction[]>();
        for (const action of actions) {
            if (!filter(action, search)) {
                continue;
            }
            // A search lists its results flat, without section headings, as Figma does
            // (dt/light-dialog-quick-actions-results: the first row sits at the list's top).
            const key = search.trim() === "" ? (action.section ?? "") : "";
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
    const focusList = !searchShown || initialFocus === "first";
    useEffect(() => {
        (focusList ? list.current : input.current)?.focus();
        // Only on open: the reader moves focus from here.
    }, []);

    const optionId = (value: string): string => `${id}-option-${value}`;

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.target !== event.currentTarget) {
            return;
        }
        // On the list, a letter goes to the search field, where it is typed.
        if (
            event.currentTarget === list.current &&
            searchShown &&
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            input.current?.focus();
            return;
        }
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
            {searchShown ? (
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
                    {search !== "" || searchAction ? (
                        <span className="cm-qa-search-action">
                            {search === "" ? (
                                searchAction
                            ) : (
                                <CloseButton
                                    aria-label={labels.clearSearch}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    onClick={() => {
                                        setSearch("");
                                        input.current?.focus();
                                    }}
                                />
                            )}
                        </span>
                    ) : null}
                </div>
            ) : null}
            {header ? <div className="cm-qa-header">{header}</div> : null}
            <div
                ref={list}
                className="cm-qa-list"
                id={`${id}-list`}
                role="listbox"
                aria-label={name}
                // Focusable when it takes focus on open, or when there is no search field to
                // hold it: the highlight is then this list's aria-activedescendant.
                tabIndex={focusList ? 0 : undefined}
                aria-activedescendant={focusList && current !== undefined ? optionId(current) : undefined}
                onKeyDown={focusList ? onKeyDown : undefined}
            >
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
                                // Named by the label alone: not by the second line, and not by
                                // the two halves of a middle cut, which accname would join with a space.
                                aria-label={action.description || truncate === "middle" ? action.label : undefined}
                                aria-describedby={
                                    action.description ? `${optionId(action.value)}-description` : undefined
                                }
                                title={truncate === "middle" ? action.label : undefined}
                                data-two-line={action.description ? "" : undefined}
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
                                <span className="cm-qa-row-text">
                                    <span className="cm-qa-row-label" data-truncate={truncate}>
                                        {truncate === "middle" ? <MiddleCut label={action.label} /> : action.label}
                                    </span>
                                    {action.description ? (
                                        <span
                                            className="cm-qa-row-description"
                                            id={`${optionId(action.value)}-description`}
                                        >
                                            {action.description}
                                        </span>
                                    ) : null}
                                </span>
                                {action.shortcut ? <span className="cm-qa-row-shortcut">{action.shortcut}</span> : null}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
