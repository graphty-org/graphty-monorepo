import React from "react";

import { useLabels } from "../i18n";
import type { ActivationHandler } from "../types/events";

/** What an EntityChip counts or names. */
export type EntityKind = "node" | "edge";

/** Props for EntityChip. */
export interface EntityChipProps {
    /** Node or edge: decides the chip's color and icon, the same everywhere. */
    kind: EntityKind;
    /** The count or the name it shows ("60", "140 of 900", "TP53"). Format numbers first. */
    children: React.ReactNode;
    /** Makes the chip a button (a filter chip that opens its filters). */
    onClick?: ActivationHandler;
    /** Extra class on the chip. */
    className?: string;
    /** Extra style on the chip. */
    style?: React.CSSProperties;
}

/** The icon's box, in px. */
const ICON = 12;

/**
 * The kind's icon: a filled circle for a node, a line segment for an edge.
 * @param props - the kind
 * @param props.kind - node or edge
 * @returns the 12px icon
 */
function EntityIcon({ kind }: Readonly<{ kind: EntityKind }>): React.JSX.Element {
    return (
        <svg className="cm-entity-icon" width={ICON} height={ICON} viewBox="0 0 12 12" aria-hidden="true">
            {kind === "node" ? (
                <circle cx="6" cy="6" r="4" fill="currentColor" />
            ) : (
                <line
                    x1="1.5"
                    y1="10.5"
                    x2="10.5"
                    y2="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}

/**
 * A node or edge chip: the kind's fixed color and icon, then a count or a name. Every place that
 * counts or names nodes or edges draws one, so a node always reads as the same blue circle and an
 * edge as the same orange segment, in both color schemes (tokens `--cm-entity-node` and
 * `--cm-entity-edge`, each at least 3:1 on the panel).
 *
 * The kind is spoken, not drawn: a screen reader hears "Node 60" or "Edge 120" (the `entityNode`
 * and `entityEdge` labels), while the eye reads the icon.
 * @param props - the kind, the content and an optional click handler
 * @param props.kind - node or edge
 * @param props.children - the count or the name
 * @param props.onClick - makes the chip a button
 * @param props.className - extra class
 * @param props.style - extra style
 * @returns the chip, a `span`, or a `button` with `onClick`
 * @example
 * ```tsx
 * <EntityChip kind="node">60</EntityChip>
 * <EntityChip kind="edge">TP53 - MDM2</EntityChip>
 * <EntityChip kind="node" onClick={openFilters}>140 of 900</EntityChip>
 * ```
 */
export function EntityChip({
    kind,
    children,
    onClick,
    className,
    style,
}: Readonly<EntityChipProps>): React.JSX.Element {
    const labels = useLabels();
    const classes = ["cm-entity-chip", className].filter(Boolean).join(" ");
    const body = (
        <>
            <EntityIcon kind={kind} />
            <span className="cm-visually-hidden">{kind === "node" ? labels.entityNode : labels.entityEdge} </span>
            <span className="cm-entity-text">{children}</span>
        </>
    );
    if (onClick === undefined) {
        return (
            <span className={classes} style={style} data-kind={kind}>
                {body}
            </span>
        );
    }
    return (
        <button
            type="button"
            className={`${classes} cm-focus-outside`}
            style={style}
            data-kind={kind}
            onClick={(event) => {
                onClick(event);
            }}
        >
            {body}
        </button>
    );
}
