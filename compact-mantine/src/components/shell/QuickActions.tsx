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
    /**
     * Shown, but cannot be run. The arrow keys still reach it, so its `description` (why it
     * cannot be run) is read; it is never the first highlight.
     */
    disabled?: boolean;
    /**
     * A second, dimmed line under the name: why a disabled action cannot be run ("Holds
     * groups, not amounts"), or what it does. It is the option's accessible description, so its
     * accessible name stays `label` alone, and it survives a search (which drops the section
     * headings).
     */
    description?: string;
    /** `"component"` draws the name in the component tone (`--cm-text-component`, weight 600). */
    tone?: "component";
    /** The option's accessible name, when it is not `label` (a label set off by marks a reader should not hear). */
    "aria-label"?: string;
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
     * edge: Figma's scope tabs (`<Tabs>` with the theme's pill tabs), for example. Scope tabs
     * have no panels of their own: give each `aria-controls={listId}`.
     */
    header?: React.ReactNode;
    /**
     * A trailing action at the right end of the search field, 6px in from its edge and 16px
     * after the text: pass an `<ActionIcon aria-label="...">` (the theme's 24px ghost icon
     * button), as Figma's visual-search button. While there is search text the palette shows its
     * own clear button in this place instead, as Figma does.
     */
    searchAction?: React.ReactNode;
    /**
     * The id of the result list. A control in `header` that changes what the list shows, such as
     * scope tabs, names it in `aria-controls`. Generated when left out.
     */
    listId?: string;
    /** Accessible name of the dialog. Defaults to the "Quick actions" label. */
    "aria-label"?: string;
    /**
     * The panel's role. `"dialog"` (the default) for a palette that stands alone; `"group"` for one
     * placed inside a pop-out, which is already the dialog and names it by its title.
     * @default "dialog"
     */
    role?: "dialog" | "group";
    /** Placeholder of the search field. Defaults to the "Search actions" label. */
    placeholder?: string;
    /**
     * How a name too long for its row is cut. `"end"` (the default) ends it with an ellipsis;
     * `"middle"` keeps its start and its end ("shared_ch...apters"), for names that differ at
     * the end. A middle-cut name carries the full name as its tooltip.
     */
    truncate?: "end" | "middle";
    /**
     * Where each action's `description` goes: `"below"` (the default) on a dimmed second line
     * under the name, `"end"` dimmed at the end of the name's line, so every row stays one line
     * tall (a fact such as "1 to 36" beside a value's name).
     * @default "below"
     */
    descriptions?: "below" | "end";
    /**
     * What the list says when there is nothing to list before any search: why it is empty and
     * where to go instead. Defaults to the "No results" label, which a search with no match
     * always says.
     */
    emptyText?: string;
    /**
     * The action highlighted when the list opens, before anything is searched: the value in force,
     * so Enter keeps it and the arrows start from it. Defaults to the first action that can run.
     * It is the one row read as "selected": the highlight that moves with the arrows is the active
     * row (`aria-activedescendant`), never a choice already made.
     */
    highlight?: string;
    /**
     * Which row is active when the list opens with no `highlight`, and again whenever the search is
     * emptied: `"first"` (the default) the first action that can run, as Figma's palette does;
     * `"none"` no row, as a combobox opens, so Enter runs nothing until the reader types or arrows.
     * Typing always makes the first action that can run active, never a disabled one.
     * @default "first"
     */
    activeOnOpen?: "first" | "none";
    /**
     * Whether Tab, with a search typed and a row active that can run, runs that row before focus
     * moves on, as Tab takes the highlighted option of a list the reader typed toward (a value
     * picker). With nothing typed Tab only moves on. Off by default: a command palette's Tab never
     * runs a command.
     * @default false
     */
    tabTakes?: boolean;
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
function MiddleCut({ label }: Readonly<{ label: string }>): React.JSX.Element {
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
 * @param props.listId - The id of the result list, for a header control to name in `aria-controls`
 * @param props.truncate - Cut a long name at the end or in the middle
 * @param props.descriptions - Each description under the name or at the end of its line
 * @param props.emptyText - What an empty list says before any search
 * @param props.highlight - The action highlighted when the list opens
 * @param props.activeOnOpen - Whether the first action or no row is active before a search
 * @param props.tabTakes - Whether Tab with a search typed runs the active row
 * @param props.placeholder - Placeholder of the search field
 * @param props.width - Panel width
 * @param props.height - Panel height
 * @param props.className - Extra class on the panel
 * @param props.style - Extra style on the panel
 * @param props.role - The panel's role: a dialog alone, a group inside a pop-out
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
    listId: listIdProp,
    truncate = "end",
    descriptions = "below",
    emptyText,
    highlight,
    activeOnOpen = "first",
    tabTakes = false,
    placeholder,
    width = 529,
    height = 354,
    className,
    style,
    role = "dialog",
    ...others
}: QuickActionsProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const id = useId();
    const listId = listIdProp ?? `${id}-list`;
    const input = useRef<HTMLInputElement>(null);
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
    const listed = sections.flatMap(([, list]) => list);
    const emptyWords = search.trim() === "" && emptyText !== undefined ? emptyText : labels.noResults;
    const enabled = listed.filter((a) => !a.disabled);

    // The highlight belongs to the search it was made in, so a new search highlights its first
    // result again.
    const [marked, setMarked] = useState<{ search: string; value?: string }>({ search: "", value: highlight });
    const untouched = search.trim() === "" && activeOnOpen === "none";
    const fallback = untouched ? undefined : enabled[0]?.value;
    const current = marked.search === search && listed.some((a) => a.value === marked.value) ? marked.value : fallback;
    const setHighlight = (value: string): void => {
        setMarked({ search, value });
    };
    useEffect(() => {
        input.current?.focus();
        // Only on open: the reader moves focus from here.
    }, []);

    const optionId = (value: string): string => `${id}-option-${value}`;
    const inName = (action: QuickAction): boolean =>
        Boolean(action.description) && (descriptions === "end" || action.disabled === true);
    const nameOf = (action: QuickAction): string | undefined => {
        if (inName(action)) {
            return `${action.label}, ${String(action.description)}`;
        }
        return action.description || truncate === "middle" ? action.label : undefined;
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        // A disabled row is reached too, so the reason it cannot run is heard; Enter skips it.
        const index = listed.findIndex((a) => a.value === current);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (listed.length === 0) {
                return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            // From no active row, ArrowDown goes to the first and ArrowUp to the last.
            const next =
                listed[index < 0 && step < 0 ? listed.length - 1 : (index + step + listed.length) % listed.length];
            setHighlight(next.value);
            document.getElementById(optionId(next.value))?.scrollIntoView?.({ block: "nearest" });
        } else if (event.key === "Enter" && current !== undefined && enabled.some((a) => a.value === current)) {
            event.preventDefault();
            onRun(current);
        } else if (
            tabTakes &&
            event.key === "Tab" &&
            !event.shiftKey &&
            search.trim() !== "" &&
            current !== undefined &&
            enabled.some((a) => a.value === current)
        ) {
            // Not prevented: the host moves focus on as Tab does.
            onRun(current);
        } else if (event.key === "Escape" && onClose) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    };

    const name = others["aria-label"] ?? labels.quickActions;
    return (
        <div // NOSONAR(S6819): an inline panel the host places in its own popover; a native dialog adds its own top layer, box and Escape handling
            role={role}
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
                    // Inside a Popout, the panel's own focus on open lands here rather than on
                    // the panel, so typing filters at once.
                    data-autofocus
                    className="cm-qa-input"
                    type="text"
                    role="combobox"
                    aria-label={placeholder ?? labels.searchActions}
                    aria-expanded="true"
                    aria-controls={listId}
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
            {header ? <div className="cm-qa-header">{header}</div> : null}
            {/* Above the listbox, not in it: a listbox may hold only options and groups. Always
                mounted, so a search that empties the list is spoken when its words appear. */}
            <output className="cm-qa-empty" aria-live="polite">
                {sections.length === 0 ? emptyWords : null}
            </output>
            <div // NOSONAR(S6819): the popup of an ARIA combobox with grouped rows; a native select cannot be one
                className="cm-qa-list"
                id={listId}
                role="listbox"
                aria-label={name}
            >
                {sections.map(([section, list]) => (
                    <div // NOSONAR(S6819): a group of options inside an ARIA listbox; optgroup works only inside a native select
                        className="cm-qa-group"
                        role="group"
                        aria-label={section || undefined}
                        key={section}
                    >
                        {section ? (
                            <div className="cm-qa-group-title" aria-hidden="true">
                                {section}
                            </div>
                        ) : null}
                        {list.map((action) => (
                            <div // NOSONAR(S6819): an option of an ARIA combobox popup with rich rows; a native option holds text only
                                key={action.value}
                                id={optionId(action.value)}
                                role="option"
                                // Selected is the value in force, not the row the arrows are on.
                                aria-selected={highlight !== undefined && action.value === highlight}
                                aria-disabled={action.disabled || undefined}
                                // A fact at the line's end (a count, a range) and the reason a row
                                // cannot run are part of what the row is, so they join its name:
                                // "degree, 1 to 36". A second line below stays its description.
                                // Never the two halves of a middle cut, which accname would join with a space.
                                aria-label={action["aria-label"] ?? nameOf(action)}
                                aria-describedby={
                                    action.description && !inName(action)
                                        ? `${optionId(action.value)}-description`
                                        : undefined
                                }
                                title={truncate === "middle" ? action.label : undefined}
                                // A reason a row cannot run goes under its name whole, never cut at the line's end.
                                data-two-line={
                                    action.description && (descriptions === "below" || action.disabled) ? "" : undefined
                                }
                                className="cm-qa-row"
                                data-highlighted={action.value === current || undefined}
                                onMouseMove={() => {
                                    setHighlight(action.value);
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
                                <span
                                    className="cm-qa-row-text"
                                    data-descriptions={action.disabled ? "below" : descriptions}
                                >
                                    <span className="cm-qa-row-label" data-truncate={truncate} data-tone={action.tone}>
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
