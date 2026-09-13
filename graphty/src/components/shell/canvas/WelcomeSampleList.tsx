/**
 * The Sample datasets block Welcome draws inside its own column (spec 7.1 item 2).
 *
 * `WelcomeState` takes the sample list, the recent files and the recipes as `children`,
 * so the canvas region does not fork the Data activity's own data. This is the first of
 * those three: the list of rows a reader can click to leave the Empty state, built from
 * `src/data/sampleManifest.ts` by the shell and handed here already formatted. This
 * component computes nothing -- not the size string, not the load, not the suggested
 * run -- so there is exactly one manifest behind both this block and the Data panel's
 * "Sample datasets" section (spec 5648: "The same size string ... appears in the panel
 * and the canvas").
 *
 * Geometry is Welcome.dc.html:348-403, read off the board. A row is a content-sized
 * card and is NOT one of the register's ten 32 px row types: it carries two lines and
 * Welcome is exempt from the density rules (6.8 "does not apply at all to: the Empty
 * state").
 *
 * Colour is NOT the board's. CONTRAST-DIVERGENCE section 3 keeps the artboards' dim ink
 * (#7a828e) as a border value only and resolves accent through Mantine, so every ink
 * below is a `PANEL_INK` token: the board's #d5d7da is VALUE, its #a3a8b1 blurb is
 * PROSE, its #7a828e chrome is CHROME, its #5b8ff9 link is ACCENT, its #2a3035 row fill
 * is SURFACE and its #374047 row border is BORDER. The pill fill, which the board also
 * draws as #374047, is RAISED rather than BORDER: a chip standing on the row's surface
 * is a raised surface, not a boundary, and using the border token as a fill is how a
 * token comes to mean two things.
 *
 * NAV-1: clicking the row loads the sample and stops; clicking the closing hint loads it
 * AND runs the manifest's suggested first card, which is one interaction from a cold
 * start to a coloured graph. A row with no suggested card renders its blurb as plain
 * text (spec 5643).
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";

import { SAMPLE_SECTION_HINT, SAMPLE_SECTION_NAME } from "../../../data/sampleManifest";
import { CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE } from "./canvasLayout";

/**
 * The geometry Welcome.dc.html:348-403 draws that no shared module names.
 *
 * `canvasLayout.ts` owns the canvas's shared geometry and is not this slice's to edit,
 * so the four values below carry their citation here instead. Everything the shared
 * modules DO name is read from them: the pill's 16 px height and 6 px padding are
 * `CANVAS_METRICS.PILL_HEIGHT` and `PILL_PAD_X`, and every gap is a `CANVAS_SPACE` step.
 */
const SAMPLE_ROW_METRICS = {
    /** a row card's radius (ART-WEL:353 `border-radius: 4px`). */
    ROW_RADIUS: 4,
    /** a row card's vertical padding (ART-WEL:353 `padding: 6px 10px`). */
    ROW_PAD_Y: 6,
    /** a row card's horizontal padding (ART-WEL:353). */
    ROW_PAD_X: 10,
    /** a tag pill's radius (ART-WEL:368 `border-radius: 8px`). */
    PILL_RADIUS: 8,
    /** the Large badge's height (ART-WEL:418 `height: 14px`). */
    BADGE_HEIGHT: 14,
    /** the Large badge's horizontal padding (ART-WEL:418 `padding: 0 4px`). */
    BADGE_PAD_X: 4,
    /** the Large badge's radius (ART-WEL:418 `border-radius: 7px`). */
    BADGE_RADIUS: 7,
    /** the Large badge's type size (ART-WEL:418 `font-size: 9px`). */
    BADGE_TYPE: 9,
} as const;

/** The Large badge's word, uppercased by the style rather than by the string. */
const LARGE_BADGE_LABEL = "Large";

/**
 * One row of the sample list, already formatted by the caller.
 * @public
 */
export interface WelcomeSample {
    /** The manifest record's stable id. */
    readonly id: string;
    /** The dataset's own name -- the user's data, floor item 7. */
    readonly name: string;
    /** The tag pills, in the order they are drawn. */
    readonly tags: readonly string[];
    /** Whether the row carries the Large badge. */
    readonly large: boolean;
    /** The human credit, e.g. "Zachary 1977". */
    readonly credit: string;
    /** Where the credit link points. */
    readonly creditHref: string;
    /** The one size string both surfaces draw, e.g. "34 nodes, 78 edges". */
    readonly sizeString: string;
    /** The plain half of the blurb. Ends in a space when `hint` is present. */
    readonly blurb: string;
    /** The closing imperative, drawn as a link inside the blurb's own text run. */
    readonly hint?: string;
    /** Loads the sample and stops. */
    readonly onOpen: () => void;
    /** Loads the sample and runs its suggested first card. Absent when `hint` is absent. */
    readonly onOpenAndRun?: () => void;
}

/**
 * Props of the Sample datasets block.
 * @public
 */
export interface WelcomeSampleListProps {
    /** The rows, in the order the manifest gives them. */
    readonly samples: readonly WelcomeSample[];
}

/**
 * Props of one row.
 */
interface SampleRowProps {
    /** The row's own facts and its two routes in. */
    readonly sample: WelcomeSample;
}

/**
 * One tag pill.
 * @param props - the pill's label.
 * @param props.label - the tag word, e.g. "Weighted".
 * @returns the pill element.
 */
function TagPill(props: { readonly label: string }): React.JSX.Element {
    return (
        <span
            data-sample-tag={props.label}
            style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                height: CANVAS_METRICS.PILL_HEIGHT,
                padding: `0 ${String(CANVAS_METRICS.PILL_PAD_X)}px`,
                borderRadius: SAMPLE_ROW_METRICS.PILL_RADIUS,
                background: PANEL_INK.RAISED,
                color: PANEL_INK.VALUE,
                fontSize: CANVAS_TYPE.PILL,
                lineHeight: 1,
                boxSizing: "border-box",
            }}
        >
            {props.label}
        </span>
    );
}

/**
 * The Large badge, drawn only on a row whose size is the decision (DEF-3).
 * @returns the badge element.
 */
function LargeBadge(): React.JSX.Element {
    return (
        <span
            data-sample-large="true"
            style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                height: SAMPLE_ROW_METRICS.BADGE_HEIGHT,
                padding: `0 ${String(SAMPLE_ROW_METRICS.BADGE_PAD_X)}px`,
                borderRadius: SAMPLE_ROW_METRICS.BADGE_RADIUS,
                background: PANEL_INK.RAISED,
                color: PANEL_INK.VALUE,
                fontSize: SAMPLE_ROW_METRICS.BADGE_TYPE,
                fontWeight: 500,
                lineHeight: 1,
                textTransform: "uppercase",
                boxSizing: "border-box",
            }}
        >
            {LARGE_BADGE_LABEL}
        </span>
    );
}

/**
 * One sample row: the whole card is the control.
 *
 * It is a `div` with `role="button"` rather than a `<button>` because it holds two
 * controls of its own -- the credit link and the closing hint -- and a button inside a
 * button is not valid HTML. Enter and Space activate it, as a button would.
 * @param props - the row's facts and its two routes in.
 * @returns the row element.
 */
function SampleRow(props: SampleRowProps): React.JSX.Element {
    const { sample } = props;

    return (
        <div
            data-sample-row={sample.id}
            role="button"
            tabIndex={0}
            onClick={sample.onOpen}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    sample.onOpen();
                }
            }}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: CANVAS_SPACE.XS,
                padding: `${String(SAMPLE_ROW_METRICS.ROW_PAD_Y)}px ${String(SAMPLE_ROW_METRICS.ROW_PAD_X)}px`,
                borderRadius: SAMPLE_ROW_METRICS.ROW_RADIUS,
                background: PANEL_INK.SURFACE,
                border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                boxSizing: "border-box",
                cursor: "pointer",
                textAlign: "left",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: CANVAS_SPACE.MD,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: CANVAS_SPACE.SM, minWidth: 0 }}>
                    <span
                        style={{
                            fontSize: CANVAS_TYPE.BODY,
                            fontWeight: 500,
                            lineHeight: CANVAS_LEADING.TIGHT,
                            color: PANEL_INK.VALUE,
                        }}
                    >
                        {sample.name}
                    </span>
                    {sample.large && <LargeBadge />}
                    {sample.tags.map((tag) => (
                        <TagPill key={tag} label={tag} />
                    ))}
                    <a
                        href={sample.creditHref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                        style={{
                            fontSize: CANVAS_TYPE.SMALL,
                            lineHeight: CANVAS_LEADING.TIGHT,
                            color: PANEL_INK.ACCENT,
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                        }}
                    >
                        {sample.credit}
                    </a>
                </div>
                <span
                    style={{
                        fontSize: CANVAS_TYPE.SMALL,
                        lineHeight: CANVAS_LEADING.TIGHT,
                        color: PANEL_INK.CHROME,
                        whiteSpace: "nowrap",
                        textAlign: "right",
                    }}
                >
                    {sample.sizeString}
                </span>
            </div>

            <span
                style={{
                    fontSize: CANVAS_TYPE.SMALL,
                    lineHeight: CANVAS_LEADING.DENSE,
                    color: PANEL_INK.PROSE,
                }}
            >
                {sample.blurb}
                {sample.hint !== undefined && sample.onOpenAndRun !== undefined && (
                    <span
                        data-sample-hint={sample.id}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                            event.stopPropagation();
                            sample.onOpenAndRun?.();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                sample.onOpenAndRun?.();
                            }
                        }}
                        style={{
                            fontSize: CANVAS_TYPE.SMALL,
                            lineHeight: CANVAS_LEADING.DENSE,
                            color: PANEL_INK.ACCENT,
                            cursor: "pointer",
                        }}
                    >
                        {sample.hint}
                    </span>
                )}
            </span>
        </div>
    );
}

/**
 * Draws the Sample datasets block, or nothing when the manifest is empty.
 * @param props - the rows to draw.
 * @returns the block, or null when there is no sample to offer.
 */
export function WelcomeSampleList(props: WelcomeSampleListProps): React.JSX.Element | null {
    const { samples } = props;

    if (samples.length === 0) {
        return null;
    }

    return (
        <div data-canvas-samples="true" style={{ display: "flex", flexDirection: "column", gap: CANVAS_SPACE.SM }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: CANVAS_SPACE.MD,
                }}
            >
                <span
                    style={{
                        fontSize: CANVAS_TYPE.BODY,
                        fontWeight: 500,
                        lineHeight: CANVAS_LEADING.TIGHT,
                        color: PANEL_INK.VALUE,
                    }}
                >
                    {SAMPLE_SECTION_NAME}
                </span>
                <span
                    style={{
                        fontSize: CANVAS_TYPE.SMALL,
                        lineHeight: CANVAS_LEADING.TIGHT,
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {SAMPLE_SECTION_HINT}
                </span>
            </div>

            {samples.map((sample) => (
                <SampleRow key={sample.id} sample={sample} />
            ))}
        </div>
    );
}
