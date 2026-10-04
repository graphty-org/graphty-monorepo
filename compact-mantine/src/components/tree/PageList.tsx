import { useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useRef, useState } from "react";

import { useCompactStyles } from "../../theme/useCompactStyles";
import { InlineRename } from "./InlineRename";

/**
 * Props for the PageRow component.
 */
export interface PageRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
    /** The page's name. Ignored by a divider row. */
    name: string;
    /** This is the page on screen (gray fill, weight 550; `aria-current="page"`). */
    current?: boolean;
    /** `"group"`: a selectable group in a collection list (selected blue, weight 600). */
    tone?: "page" | "group";
    /** For `tone="group"`: whether the group is selected. */
    selected?: boolean;
    /** Draw a divider line instead of a name. */
    divider?: boolean;
    /** Drawn in place of the name, e.g. an InlineRename. */
    nameSlot?: React.ReactNode;
    /** The focusable cell's tab index (PageList manages it). Default 0. */
    tabIndex?: number;
    /** A second line under the name. See PageListItem.description. */
    description?: React.ReactNode;
    /** `"danger"` draws the second line in the danger ink. Default `"default"`. */
    descriptionTone?: "default" | "danger";
    /** A short value at the end of the name's line. See PageListItem.value. */
    value?: React.ReactNode;
    /** The row's own control, in a cell after the row. See PageListItem.menu. */
    menu?: React.ReactNode;
}

/**
 * One row of a page list (design/figma-spec.md 10.2): a 240 x 32 grid cell (padding 4 8) around
 * a 224 x 24 pill, text 16px in at 11/24. Hover fills the pill; the current page is gray and
 * weight 550. The cell carries the focus ring (1px, radius 5, offset 0).
 * @param props - Component props
 * @returns The row
 */
export const PageRow = forwardRef<HTMLDivElement, PageRowProps>(function PageRow(
    {
        name,
        current = false,
        tone = "page",
        selected = false,
        divider = false,
        nameSlot,
        tabIndex = 0,
        description,
        descriptionTone = "default",
        value,
        menu,
        ...rest
    },
    ref,
) {
    useCompactStyles();
    const has = (node: React.ReactNode): boolean =>
        !divider && node !== undefined && node !== null && node !== false && node !== "";
    const hasDescription = has(description);
    const hasValue = has(value);
    const hasMenu = has(menu);
    const nameAndValue = (
        <>
            <span className="cm-page-name">{name}</span>
            {hasValue && <span className="cm-page-value">{value}</span>}
        </>
    );
    let content: React.ReactNode = nameAndValue;
    if (divider) {
        content = <span className="cm-page-divider" />;
    } else if (hasDescription) {
        content = (
            <>
                <span className="cm-page-line">{nameAndValue}</span>
                <span className="cm-page-description" data-tone={descriptionTone}>
                    {description}
                </span>
            </>
        );
    }
    return (
        <div role="row" className={hasMenu ? "cm-page-row" : undefined}>
            <div
                ref={ref}
                role="gridcell"
                tabIndex={tabIndex}
                aria-current={current ? "page" : undefined}
                aria-selected={tone === "group" ? selected : undefined}
                aria-label={divider ? "Divider" : undefined}
                data-tone={tone}
                data-two-line={hasDescription ? "" : undefined}
                className="cm-page-cell"
                {...rest}
            >
                {nameSlot ?? (
                    <div className="cm-page-button" title={divider ? undefined : name}>
                        {content}
                    </div>
                )}
            </div>
            {hasMenu && (
                <div role="gridcell" className="cm-page-menu">
                    {menu}
                </div>
            )}
        </div>
    );
});

/** One entry of a PageList. */
export interface PageListItem {
    id: string;
    name: string;
    /** A divider row: drawn as a line, skipped by the arrow keys. */
    divider?: boolean;
    /**
     * A second line under the name, in the secondary ink: a time, a hint, a status sentence
     * ("This file can no longer be read"). It is part of the row's accessible name, after the
     * name and the value, since the name is built from the row's visible text.
     */
    description?: React.ReactNode;
    /** `"danger"` draws the second line in the danger ink, for an error. Default `"default"`. */
    descriptionTone?: "default" | "danger";
    /** A short value at the end of the name's line, in the secondary ink: a size, a count. */
    value?: React.ReactNode;
    /**
     * The row's own control -- usually a "More" button opening a Menu -- drawn after the row in
     * a cell of its own, so a click on it never switches to the page. Name the button after
     * the row ("More for Les Miserables"). ArrowRight on a row moves into it and ArrowLeft
     * moves back.
     */
    menu?: React.ReactNode;
}

/**
 * Props for the PageList component.
 */
export interface PageListProps {
    /** The pages, in order. */
    items: readonly PageListItem[];
    /** The current page (controlled). */
    current?: string;
    /** The current page to start with (uncontrolled). */
    defaultCurrent?: string;
    /** Called when a page is switched to, by click, Enter or Space. */
    onCurrentChange?: (id: string, event?: React.SyntheticEvent) => void;
    /** `"group"` draws the collection-group look (selected blue, weight 600). Default `"page"`. */
    tone?: "page" | "group";
    /** The list's accessible name. Defaults to "Pages". */
    label?: string;
    /** Called with a new name. Giving it turns on renaming (F2 or a double-click). */
    onRename?: (id: string, name: string) => void;
    /** The accessible name of the rename field. Defaults to "Page name". */
    renameLabel?: string;
}

/**
 * A page list (design/figma-spec.md 10.2): Figma's own accessible model, a one-column grid with
 * one Tab stop. ArrowUp / ArrowDown / Home / End move focus without switching; Enter, Space or a
 * click switches; F2 or a double-click renames when `onRename` is given. A row can carry a second
 * line, a trailing value and a row menu (see PageListItem); ArrowRight moves into the menu.
 * @param props - Component props
 * @param props.items - The items or pages
 * @param props.current - The current page (controlled)
 * @param props.defaultCurrent - The current page to start with
 * @param props.onCurrentChange - Called when a page is switched to
 * @param props.tone - Page or group look
 * @param props.label - The accessible name
 * @param props.onRename - Called with a new name; turns renaming on
 * @param props.renameLabel - The rename field's accessible name
 * @returns The list
 * @example
 * A recent-files list: a size, a time, an error line and a row menu.
 * ```tsx
 * <PageList
 *     label="Recent projects"
 *     items={recent.map((file) => ({
 *         id: file.id,
 *         name: file.name,
 *         value: `${file.nodes} nodes`,
 *         description: file.missing ? "This file can no longer be read" : file.savedAt,
 *         descriptionTone: file.missing ? "danger" : "default",
 *         menu: <RecentMenu file={file} />,
 *     }))}
 *     onCurrentChange={(id) => open(id)}
 * />
 * ```
 */
export function PageList({
    items,
    current,
    defaultCurrent,
    onCurrentChange,
    tone = "page",
    label = "Pages",
    onRename,
    renameLabel = "Page name",
}: PageListProps): React.JSX.Element {
    useCompactStyles();
    const [value, setValue] = useUncontrolled<string | null>({
        value: current,
        defaultValue: defaultCurrent,
        finalValue: null,
        onChange: (id: string | null, event?: React.SyntheticEvent) => {
            if (id !== null) {
                onCurrentChange?.(id, event);
            }
        },
    });
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const cells = useRef(new Map<string, HTMLDivElement>());
    const pages = items.filter((item) => item.divider !== true);
    const tabId =
        (focusedId !== null && pages.some((p) => p.id === focusedId) ? focusedId : null) ??
        (value !== null && pages.some((p) => p.id === value) ? value : null) ??
        pages[0]?.id ??
        null;

    const focus = (id: string | undefined): void => {
        if (id !== undefined) {
            setFocusedId(id);
            cells.current.get(id)?.focus();
        }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        // ArrowLeft from inside a row's menu goes back to the row.
        const menuCell = target.closest(".cm-page-menu");
        if (menuCell !== null) {
            if (event.key === "ArrowLeft") {
                const cell = menuCell.parentElement?.querySelector<HTMLElement>(".cm-page-cell");
                if (cell) {
                    event.preventDefault();
                    cell.focus();
                }
            }
            return;
        }
        if (target.getAttribute("role") !== "gridcell" || tabId === null) {
            return;
        }
        const i = pages.findIndex((p) => p.id === tabId);
        switch (event.key) {
            case "ArrowDown":
                focus(pages[i + 1]?.id);
                break;
            case "ArrowUp":
                focus(pages[i - 1]?.id);
                break;
            case "Home":
                focus(pages[0]?.id);
                break;
            case "End":
                focus(pages[pages.length - 1]?.id);
                break;
            case "ArrowRight": {
                const control = target.parentElement
                    ?.querySelector(".cm-page-menu")
                    ?.querySelector<HTMLElement>("button, a[href], input, select, [tabindex]");
                if (!control) {
                    return;
                }
                control.focus();
                break;
            }
            case "Enter":
            case " ":
                setValue(tabId, event);
                break;
            case "F2":
                if (!onRename) {
                    return;
                }
                setRenaming(tabId);
                break;
            default:
                return;
        }
        event.preventDefault();
    };

    return (
        <div
            role="grid"
            aria-label={label}
            className="cm-page-list"
            // Focusable only so a click between rows lands somewhere; focus is handed on to the
            // row in the tab order at once.
            tabIndex={-1}
            onFocus={(event) => {
                if (event.target === event.currentTarget && tabId !== null) {
                    focus(tabId);
                }
            }}
            onKeyDown={onKeyDown}
        >
            {items.map((item) => {
                const isCurrent = item.id === value;
                return (
                    <PageRow
                        key={item.id}
                        ref={(el) => {
                            if (el) {
                                cells.current.set(item.id, el);
                            } else {
                                cells.current.delete(item.id);
                            }
                        }}
                        data-id={item.id}
                        name={item.name}
                        divider={item.divider}
                        description={item.description}
                        descriptionTone={item.descriptionTone}
                        value={item.value}
                        menu={item.menu}
                        tone={tone}
                        current={tone === "page" && isCurrent}
                        selected={tone === "group" && isCurrent}
                        tabIndex={item.id === tabId ? 0 : -1}
                        nameSlot={
                            renaming === item.id ? (
                                <InlineRename
                                    value={item.name}
                                    label={renameLabel}
                                    onCommit={(name) => {
                                        setRenaming(null);
                                        if (name !== "" && name !== item.name) {
                                            onRename?.(item.id, name);
                                        }
                                    }}
                                    onCancel={() => {
                                        setRenaming(null);
                                    }}
                                />
                            ) : undefined
                        }
                        onFocus={(event) => {
                            if (event.target === event.currentTarget && item.divider !== true) {
                                setFocusedId(item.id);
                            }
                        }}
                        onClick={(event) => {
                            if (item.divider !== true) {
                                setFocusedId(item.id);
                                setValue(item.id, event);
                            }
                        }}
                        onDoubleClick={() => {
                            if (onRename && item.divider !== true) {
                                setRenaming(item.id);
                            }
                        }}
                    />
                );
            })}
        </div>
    );
}
