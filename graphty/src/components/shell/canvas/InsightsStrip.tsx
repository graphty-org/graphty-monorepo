/**
 * The Insights strip: top centre of the canvas, dismissible, max-width 720.
 *
 * It draws itself in normal flow rather than positioning itself: the canvas region
 * puts it into one top-centre column at the 12 px inset, with the Graph / Table
 * control above it and the filter status strip DIRECTLY UNDER it, which is what
 * SPEC:144-148 asks for and what keeps the filter strip rising when the Insights strip
 * is dismissed.
 *
 * Build spec 01 sections 2 and 7 item 8; ART-MAIN:713-757. Each card names a
 * capability plain-then-technical on ONE line, carries one sentence of body and one
 * "Try it" affordance; the whole card is the control. One strip-level X dismisses the
 * strip, and 6.5 remembers that dismissal globally across datasets.
 *
 * Below 1280 the strip narrows to a single row of chips (section 7 item 8).
 *
 * Keyboard: F6 reaches the strip; Left and Right move between cards, Enter activates
 * and Delete dismisses (5.6, scope "insights-strip", owner "region"). Those two rows
 * are the region's own, handled on the strip's own key handler -- no listener is
 * installed anywhere else and nothing here touches the shell dispatcher.
 *
 * The icon rule (6.8) does not apply to the Insights strip by name.
 */

import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import React, { useCallback, useRef, useState } from "react";

import { INSIGHTS_STRIP_MAX_WIDTH, OVERLAY_INSET } from "../constants";
import { CanvasIconButton } from "./CanvasIconButton";
import { CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE } from "./canvasLayout";

/**
 * One insight card. The strip draws what the rule table hands it and invents nothing.
 */
export interface InsightCard {
    /** Stable id, unique within the strip. */
    readonly id: string;
    /** The plain name, e.g. "Find groups". */
    readonly title: string;
    /**
     * The technical half of the 6.3 pair, WITHOUT its parentheses -- e.g.
     * "Communities, Louvain". It is drawn dimmed inside parentheses on the SAME line
     * as the plain name; the technical name never occupies a line of its own.
     */
    readonly technicalName?: string;
    /** One sentence, e.g. "Cluster nodes that interact more with each other than with the rest." */
    readonly body: string;
    /** The visible affordance, e.g. "Try it". */
    readonly actionLabel: string;
    /** Runs the card. The whole card is the control. */
    readonly onActivate: () => void;
}

/**
 * Props of the Insights strip.
 * @public
 */
export interface InsightsStripProps {
    /** The cards, in the order the rule table gives them; Search is always last. */
    readonly cards: readonly InsightCard[];
    /**
     * "cards" is the desktop form; "chips" is the single row of chips the strip
     * narrows to below 1280 (section 7 item 8).
     */
    readonly variant?: "cards" | "chips";
    /** The strip-level X. 6.5 remembers the dismissal globally across datasets. */
    readonly onDismiss: () => void;
    /** Delete on a focused card. Retires that card; the strip stays. */
    readonly onDismissCard?: (id: string) => void;
}

const DISMISS_LABEL = "Hide suggestions";

/**
 * Draws the top-centre Insights strip, or nothing when there is no card to show.
 * @param props - the cards, the form and the dismiss handlers.
 * @returns the strip element, or null when there are no cards.
 */
export function InsightsStrip(props: InsightsStripProps): React.JSX.Element | null {
    const { cards, onDismiss, onDismissCard, variant = "cards" } = props;
    const [focusedIndex, setFocusedIndex] = useState(0);
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const focusCard = useCallback((index: number) => {
        setFocusedIndex(index);
        cardRefs.current[index]?.focus();
    }, []);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (cards.length === 0) {
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                focusCard((focusedIndex + 1) % cards.length);
                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusCard((focusedIndex - 1 + cards.length) % cards.length);
                return;
            }

            if (event.key === "Delete" && onDismissCard !== undefined) {
                const card = cards[focusedIndex];

                if (card !== undefined) {
                    event.preventDefault();
                    onDismissCard(card.id);
                }
            }
        },
        [cards, focusCard, focusedIndex, onDismissCard],
    );

    if (cards.length === 0) {
        return null;
    }

    return (
        <div
            data-canvas-overlay="insights"
            onKeyDown={handleKeyDown}
            style={{
                maxWidth: INSIGHTS_STRIP_MAX_WIDTH,
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: CANVAS_SPACE.MD,
                paddingLeft: OVERLAY_INSET,
                paddingRight: OVERLAY_INSET,
                boxSizing: "border-box",
            }}
        >
            {cards.map((card, index) => (
                <button
                    key={card.id}
                    ref={(element) => {
                        cardRefs.current[index] = element;
                    }}
                    type="button"
                    tabIndex={index === focusedIndex ? 0 : -1}
                    onFocus={() => {
                        setFocusedIndex(index);
                    }}
                    onClick={card.onActivate}
                    style={
                        variant === "chips"
                            ? {
                                  display: "inline-flex",
                                  alignItems: "center",
                                  height: CANVAS_METRICS.CHIP_HEIGHT,
                                  padding: `0 ${String(CANVAS_METRICS.CHIP_PAD_X)}px`,
                                  borderRadius: CANVAS_METRICS.FULLY_ROUND,
                                  background: PANEL_INK.PANEL,
                                  border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                                  color: PANEL_INK.VALUE,
                                  fontSize: CANVAS_TYPE.SMALL,
                                  lineHeight: 1,
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                              }
                            : {
                                  width: CANVAS_METRICS.INSIGHT_CARD_WIDTH,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  textAlign: "start",
                                  gap: CANVAS_SPACE.XS,
                                  padding: `${String(CANVAS_METRICS.INSIGHT_CARD_PAD_Y)}px ${String(CANVAS_METRICS.INSIGHT_CARD_PAD_X)}px`,
                                  borderRadius: "var(--mantine-radius-sm)",
                                  background: PANEL_INK.PANEL,
                                  border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                              }
                    }
                >
                    <span
                        style={{
                            fontSize: CANVAS_TYPE.BODY,
                            fontWeight: 500,
                            lineHeight: CANVAS_LEADING.TIGHT,
                            color: PANEL_INK.VALUE,
                        }}
                    >
                        {card.title}
                        {card.technicalName === undefined ? null : (
                            <span style={{ color: PANEL_INK.CHROME }}> ({card.technicalName})</span>
                        )}
                    </span>
                    {variant === "chips" ? null : (
                        <>
                            <span
                                style={{
                                    flex: "1 1 auto",
                                    fontSize: CANVAS_TYPE.SMALL,
                                    lineHeight: CANVAS_LEADING.DENSE,
                                    color: PANEL_INK.PROSE,
                                }}
                            >
                                {card.body}
                            </span>
                            <span
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: CANVAS_SPACE.XS,
                                    height: CANVAS_METRICS.CHIP_HEIGHT,
                                    color: PANEL_INK.ACCENT,
                                    fontSize: CANVAS_TYPE.SMALL,
                                    fontWeight: 500,
                                    lineHeight: CANVAS_LEADING.TIGHT,
                                }}
                            >
                                {card.actionLabel}
                                <UiGlyph name="chevronRight" size={PANEL_GRID.CHEVRON} />
                            </span>
                        </>
                    )}
                </button>
            ))}

            <div style={{ alignSelf: "flex-start" }}>
                <CanvasIconButton
                    label={DISMISS_LABEL}
                    glyph={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                    onClick={onDismiss}
                />
            </div>
        </div>
    );
}
