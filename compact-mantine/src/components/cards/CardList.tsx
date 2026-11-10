import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { TargetTooltip } from "../overlays";
import { InlineRename } from "../tree/InlineRename";

/** One card of a CardList. */
export interface CardListItem {
    /** Stable identity: React's key, and what every callback names. */
    id: string;
    /** The card's title in its header. Truncated with an ellipsis; never overlapped by the header slot. */
    title: string;
    /** The card's identity color: its start border, chit and tint. No color draws a plain card. */
    color?: string;
    /** Drawn dimmed, as a card that is switched off. */
    off?: boolean;
    /** The card's accessible name. Defaults to its title. */
    label?: string;
    /** One line shown in the header in place of the body while the card is folded. */
    summary?: React.ReactNode;
    /** Drawn right after the title, never over it: a short tag or toggle that belongs to the title. */
    aside?: React.ReactNode;
    /** Controls at the end of the header, before the menu: a count, a chip. */
    header?: React.ReactNode;
    /** The card's "..." menu, after the header slot. */
    menu?: React.ReactNode;
    /** The card's body, hidden while folded. */
    children?: React.ReactNode;
    /** Actions along the card's bottom, hidden while folded. */
    footer?: React.ReactNode;
    /** Extra class names on the card's section. */
    className?: string;
    /** Extra `data-*` attributes on the card's section. */
    data?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/** Props for the CardList component. */
export interface CardListProps {
    /** The list's accessible name. */
    label: string;
    /** The cards, drawn in this order. A new card is appended by the caller and so drawn last. */
    items: readonly CardListItem[];
    /** Called with a card's new title. With it, the title is a button that starts a rename. */
    onRename?: (id: string, title: string) => void;
    /** The card being renamed (controlled). */
    renaming?: string | null;
    /** Called when a rename starts or ends. */
    onRenamingChange?: (id: string | null) => void;
    /** Called by a card's x. Focus then moves to the next card, else the previous one. */
    onRemove?: (id: string) => void;
    /**
     * Called while a card's grip is dragged, with its new index. The grip takes no keys: keys that
     * move a card are the caller's, shown beside a menu item that runs them.
     */
    onReorder?: (id: string, toIndex: number) => void;
    /** The folded cards (controlled). */
    folded?: ReadonlySet<string>;
    /** The folded cards at first (uncontrolled). */
    defaultFolded?: ReadonlySet<string>;
    /** Called with the folded cards after a fold button or an auto-fold. */
    onFoldedChange?: (folded: ReadonlySet<string>) => void;
    /** When a card is appended, fold every other card and scroll the new one into view. Default true. */
    autoFold?: boolean;
    /** Drawn after the last card: the "+ Card" control. */
    add?: React.ReactNode;
    /** Drawn above the cards. */
    header?: React.ReactNode;
    /** Drawn below the add slot. */
    footer?: React.ReactNode;
    /** Drawn in place of the cards when there are none. */
    empty?: React.ReactNode;
    /** Titles wrap onto a second line, and the header grows to hold it, before an ellipsis cuts them. Default false. */
    wrapTitle?: boolean;
}

const NO_FOLDS: ReadonlySet<string> = new Set();

/**
 * The grip's six dots, 12px.
 * @returns the glyph
 */
function GripGlyph(): React.JSX.Element {
    return (
        <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            {[2, 6, 10].flatMap((y) =>
                [4, 8].map((x) => <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={1} />),
            )}
        </svg>
    );
}

/**
 * Where a dragged card goes: the number of the other cards whose middle is above the pointer.
 * @param list - the list element.
 * @param id - the dragged card.
 * @param y - the pointer's y.
 * @returns the card's new index.
 */
function dropIndex(list: HTMLElement, id: string, y: number): number {
    const others = [...list.querySelectorAll<HTMLElement>(":scope > [data-card-id]")].filter(
        (card) => card.dataset.cardId !== id,
    );
    return others.filter((card) => {
        const box = card.getBoundingClientRect();
        return box.top + box.height / 2 < y;
    }).length;
}

/**
 * An ordered stack of cards, each with a header (grip, fold, color chit, title, a header slot, a
 * menu and an x), a body and a footer. The caller owns the items and their order; the list owns how
 * they are drawn, folded, renamed, removed and reordered by pointer and keyboard.
 * @param props - Component props
 * @param props.label - See CardListProps.label
 * @param props.items - See CardListProps.items
 * @param props.onRename - See CardListProps.onRename
 * @param props.renaming - See CardListProps.renaming
 * @param props.onRenamingChange - See CardListProps.onRenamingChange
 * @param props.onRemove - See CardListProps.onRemove
 * @param props.onReorder - See CardListProps.onReorder
 * @param props.folded - See CardListProps.folded
 * @param props.defaultFolded - See CardListProps.defaultFolded
 * @param props.onFoldedChange - See CardListProps.onFoldedChange
 * @param props.autoFold - See CardListProps.autoFold
 * @param props.add - See CardListProps.add
 * @param props.header - See CardListProps.header
 * @param props.footer - See CardListProps.footer
 * @param props.empty - See CardListProps.empty
 * @param props.wrapTitle - See CardListProps.wrapTitle
 * @returns The list
 */
export function CardList({
    label,
    items,
    onRename,
    renaming: renamingProp,
    onRenamingChange,
    onRemove,
    onReorder,
    folded: foldedProp,
    defaultFolded,
    onFoldedChange,
    autoFold = true,
    add,
    header,
    footer,
    empty,
    wrapTitle = false,
}: Readonly<CardListProps>): React.JSX.Element {
    useCompactStyles();
    const labels = useLabels();
    const list = useRef<HTMLDivElement>(null);
    const [folded, setFolded] = useUncontrolled<ReadonlySet<string>>({
        value: foldedProp,
        defaultValue: defaultFolded,
        finalValue: NO_FOLDS,
        onChange: onFoldedChange,
    });
    const [renaming, setRenaming] = useUncontrolled<string | null>({
        value: renamingProp,
        finalValue: null,
        onChange: onRenamingChange,
    });
    const [dragging, setDragging] = useState<string | null>(null);
    const reorder = useRef(onReorder);
    reorder.current = onReorder;
    /** What gets focus once the items change: a grip by id, or the card at an index. */
    const focusNext = useRef<{ at: number } | null>(null);

    // A card appended at the end folds the others and comes into view.
    const seen = useRef(items.map((item) => item.id));
    useEffect(() => {
        const before = new Set(seen.current);
        seen.current = items.map((item) => item.id);
        const last = items.at(-1);
        if (!autoFold || before.size === 0 || last === undefined || before.has(last.id)) {
            return;
        }
        setFolded(new Set(items.slice(0, -1).map((item) => item.id)));
        list.current
            ?.querySelector<HTMLElement>(`:scope > [data-card-id="${CSS.escape(last.id)}"]`)
            ?.scrollIntoView?.({ block: "nearest" });
    }, [items, autoFold, setFolded]);

    useLayoutEffect(() => {
        const next = focusNext.current;
        const box = list.current;
        if (next === null || box === null) {
            return;
        }
        focusNext.current = null;
        const cards = [...box.querySelectorAll<HTMLElement>(":scope > [data-card-id]")];
        const card = cards[Math.min(next.at, cards.length - 1)];
        (card ?? box.querySelector<HTMLElement>(":scope > .cm-card-add button, :scope > .cm-card-add"))?.focus();
    }, [items]);

    const grab = (event: React.PointerEvent<HTMLElement>, id: string): void => {
        const box = list.current;
        if (event.button !== 0 || box === null) {
            return;
        }
        event.preventDefault();
        setDragging(id);
        const move = (moved: PointerEvent): void => {
            const at = items.findIndex((item) => item.id === id);
            const to = dropIndex(box, id, moved.clientY);
            if (to !== at) {
                reorder.current?.(id, to);
            }
        };
        const drop = (): void => {
            globalThis.removeEventListener("pointermove", move);
            globalThis.removeEventListener("pointerup", drop);
            globalThis.removeEventListener("pointercancel", drop);
            setDragging(null);
        };
        globalThis.addEventListener("pointermove", move);
        globalThis.addEventListener("pointerup", drop);
        globalThis.addEventListener("pointercancel", drop);
    };
    const fold = (id: string, on: boolean): void => {
        const next = new Set(folded);
        if (on) {
            next.add(id);
        } else {
            next.delete(id);
        }
        setFolded(next);
    };

    const card = (item: CardListItem, at: number): React.JSX.Element => {
        const isFolded = folded.has(item.id);
        const title =
            renaming === item.id && onRename !== undefined ? (
                <InlineRename
                    value={item.title}
                    label={labels.renameCard(item.title)}
                    onCommit={(typed) => {
                        setRenaming(null);
                        if (typed !== item.title) {
                            onRename(item.id, typed);
                        }
                    }}
                    onCancel={() => {
                        setRenaming(null);
                    }}
                />
            ) : (
                <span className="cm-card-title" title={item.title}>
                    {item.title}
                </span>
            );
        return (
            <section
                key={item.id}
                tabIndex={-1}
                className={item.className === undefined ? "cm-list-card" : `cm-list-card ${item.className}`}
                aria-label={item.label ?? item.title}
                data-card-id={item.id}
                data-folded={isFolded ? "" : undefined}
                data-off={item.off === true ? "" : undefined}
                data-dragging={dragging === item.id ? "" : undefined}
                data-colored={item.color === undefined ? undefined : ""}
                style={
                    item.color === undefined ? undefined : ({ "--cm-card-color": item.color } as React.CSSProperties)
                }
                {...item.data}
            >
                <header className="cm-card-head">
                    {onReorder !== undefined && (
                        <TargetTooltip label={labels.reorderCard}>
                            <button
                                type="button"
                                className="cm-card-icon cm-card-grip"
                                data-card-grip={item.id}
                                aria-label={labels.moveCard(item.title)}
                                onPointerDown={(event) => {
                                    grab(event, item.id);
                                }}
                            >
                                <GripGlyph />
                            </button>
                        </TargetTooltip>
                    )}
                    <button
                        type="button"
                        className="cm-card-icon cm-card-fold"
                        aria-label={isFolded ? labels.expandCard(item.title) : labels.collapseCard(item.title)}
                        aria-expanded={!isFolded}
                        onClick={() => {
                            fold(item.id, !isFolded);
                        }}
                    >
                        <UiGlyph name="chevronDown" size={12} aria-hidden />
                    </button>
                    {item.color !== undefined && <span className="cm-card-chit" aria-hidden />}
                    {onRename === undefined || renaming === item.id ? (
                        title
                    ) : (
                        <button
                            type="button"
                            className="cm-card-name"
                            aria-label={labels.renameCard(item.title)}
                            onClick={() => {
                                setRenaming(item.id);
                            }}
                        >
                            {title}
                        </button>
                    )}
                    {item.aside !== undefined && <span className="cm-card-slot">{item.aside}</span>}
                    <span className="cm-card-summary">{isFolded ? item.summary : null}</span>
                    {item.header !== undefined && <span className="cm-card-slot">{item.header}</span>}
                    {item.menu}
                    {onRemove !== undefined && (
                        <TargetTooltip label={labels.deleteCard(item.title)}>
                            <button
                                type="button"
                                className="cm-card-icon"
                                data-card-remove=""
                                aria-label={labels.deleteCard(item.title)}
                                onClick={() => {
                                    focusNext.current = { at };
                                    onRemove(item.id);
                                }}
                            >
                                <UiGlyph name="close" size={12} aria-hidden />
                            </button>
                        </TargetTooltip>
                    )}
                </header>
                {!isFolded && item.children !== undefined && <div className="cm-card-body">{item.children}</div>}
                {!isFolded && item.footer !== undefined && <footer className="cm-card-foot">{item.footer}</footer>}
            </section>
        );
    };

    return (
        <div // NOSONAR(S6819): a named group of card regions; a fieldset would draw a form's border and legend
            ref={list}
            className="cm-card-list"
            data-wrap-title={wrapTitle ? "" : undefined}
            role="group"
            aria-label={label}
        >
            {header}
            {items.length === 0 ? empty : items.map((item, at) => card(item, at))}
            {add !== undefined && <div className="cm-card-add">{add}</div>}
            {footer}
        </div>
    );
}
