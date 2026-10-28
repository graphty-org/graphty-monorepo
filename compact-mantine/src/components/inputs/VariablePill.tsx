import { Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import type { ActivationHandler, ChangeHandler } from "../../types/events";

/** Props for VariablePill. */
export interface VariablePillProps {
    /** The variable's name ("rsu/radius-sm"). */
    name: string;
    /** The variable's resolved value, shown in the pill and in its tooltip ("4"). */
    value?: string;
    /**
     * The tooltip's words, when they are not the name and the value: a name set off by marks in
     * the pill reads without them here. Lines break at "\n". @default the name, then the value
     */
    tooltip?: string;
    /**
     * Called by the Detach (broken link) button, which appears while the field is hovered or
     * focused. Without it there is no Detach button.
     */
    onDetach?: ActivationHandler;
    /** Called when the pill (or the fill row) is clicked: reopen the variable picker here. */
    onClick?: ActivationHandler;
    /**
     * A color: draws the bound FILL row instead of a number field -- one 156 x 24 button with
     * a 14px chit and the variable's name.
     */
    swatch?: string;
    /**
     * The swatch's width in pixels, so a bound color can show its colors at rest: a ramp as a
     * strip, or several category colors side by side. @default 14, a square chit
     */
    swatchWidth?: number;
    /**
     * `"variable"` (default) or `"property"`: a layer property bound to a component property,
     * drawn as a chip on the component tint.
     */
    kind?: "variable" | "property";
    /**
     * A 24px leading slot for the bound number field: the field's glyph or letter. Left out, the
     * pill starts at the field's edge.
     */
    glyph?: React.ReactNode;
    /** The field's width. @default 88 for a number field, 156 for a fill row */
    width?: number | string;
    /** The Detach button's accessible name. @default "Detach variable" */
    detachLabel?: string;
    /**
     * The pill's (or the fill row's) accessible name, when the field it sits in is not named by
     * anything else: "Node size: Degree rank, 1 to 3". Left out, it is the variable and its value.
     */
    "aria-label"?: string;
    /**
     * Makes the rest of a bound number field editable, as in Figma: typing after the pill and
     * pressing Enter (or leaving the field) reports the text, and the caller replaces the binding
     * with that literal (detach, then apply). Escape abandons the text. Without it the field after
     * the pill is empty space.
     */
    onValueCommit?: ChangeHandler<string>;
    /** The accessible name of the input after the pill. @default "Value" */
    valueLabel?: string;
    /**
     * `"component"` draws the name in the component tone (`--cm-text-component`, weight 600), so
     * a name that is not a variable's ("from each layer") stands apart. @default the field's ink
     */
    tone?: "component";
    /** The id of an element that describes the pill (or the fill row) further. */
    "aria-describedby"?: string;
    /** Extra class on the outer element. */
    className?: string;
    /** Extra style on the outer element. */
    style?: React.CSSProperties;
}

/** The fill row's width: the two fields of a pair and the gap between them less the chit gutter. */
const FILL_WIDTH = 156;

/** The Detach glyph, in its 16 (field) or 24 (fill row) button. */
const DETACH_GLYPH = 12;

/**
 * A value bound to a design variable (design/figma-spec.md 6.6).
 *
 * In a number field the value becomes a 20px pill (`--cm-bg`, 1px `--cm-border`, radius 5) after
 * the field's 24px glyph slot; hovering the pill shows the variable's name and value, and
 * hovering the field shows a 16px Detach button at its end. The tooltip opens above the field, so
 * a line under it (the values it reads, a message) stays in view. With `swatch` it is the bound fill
 * row: one 156 x 24 button with a 14px chit and the name, which gains a 24px Detach button on
 * hover. `kind="property"` draws the component-property chip.
 *
 * With `onValueCommit` the rest of a bound number field is an input: typing a literal there and
 * pressing Enter reports it, so the caller can detach and apply it.
 * @param props - the variable, its handlers and the form to draw
 * @returns the bound field, fill row or property chip
 * @example
 * ```tsx
 * <VariablePill glyph="R" name="rsu/radius-sm" value="4" onDetach={detach} onClick={openPicker} />
 * <VariablePill swatch="#0d99ff" name="rsu/brand" onDetach={detach} onClick={openPicker} />
 * ```
 */
export function VariablePill(props: VariablePillProps): React.JSX.Element {
    const {
        name,
        value,
        onDetach,
        onClick,
        swatch,
        swatchWidth,
        kind = "variable",
        glyph,
        width,
        detachLabel = "Detach variable",
        "aria-label": ariaLabel,
        "aria-describedby": describedBy,
        tooltip: tooltipWords,
        tone,
        onValueCommit,
        valueLabel = "Value",
        className,
        style,
    } = props;
    // The chit and the pill draw on plain elements, so no themed component sets the contrast mode
    // of the theme in use before they paint.
    useCompactStyles();
    const [draft, setDraftState] = useState("");
    // Mirrored in a ref: Escape clears the draft and blurs in one handler, and the blur must see
    // the cleared draft, not the render's.
    const draftRef = useRef("");
    const setDraft = (next: string): void => {
        draftRef.current = next;
        setDraftState(next);
    };
    const commitDraft = (event: React.SyntheticEvent): void => {
        const text = draftRef.current.trim();
        setDraft("");
        if (text !== "") {
            onValueCommit?.(text, event);
        }
    };
    const tooltip = tooltipWords ?? (value === undefined ? name : `${name}\n${value}`);

    const detach =
        onDetach === undefined ? null : (
            <button
                type="button"
                className="cm-var-detach cm-focus-outside"
                aria-label={detachLabel}
                onClick={(event) => {
                    onDetach(event);
                }}
            >
                <UiGlyph name="unlink" size={DETACH_GLYPH} />
            </button>
        );

    if (swatch !== undefined || kind === "property") {
        return (
            <div
                className={["cm-var-fill", className].filter(Boolean).join(" ")}
                style={{ width: width ?? FILL_WIDTH, ...style }}
                data-kind={kind}
            >
                {/* The name may be cut to fit the row: the tooltip says it whole. */}
                <Tooltip label={tooltip} style={{ whiteSpace: "pre-line" }}>
                    <button
                        type="button"
                        className="cm-var-fill-button"
                        data-kind={kind}
                        aria-label={ariaLabel ?? (value === undefined ? name : `${name}, ${value}`)}
                        aria-describedby={describedBy}
                        onClick={(event) => {
                            onClick?.(event);
                        }}
                    >
                        {swatch !== undefined && (
                            <span
                                className="cm-var-chit"
                                style={{
                                    background: swatch,
                                    ...(swatchWidth === undefined ? {} : { width: swatchWidth }),
                                }}
                                aria-hidden="true"
                            />
                        )}
                        <span className="cm-var-name" data-tone={tone}>
                            {name}
                        </span>
                    </button>
                </Tooltip>
                {detach}
            </div>
        );
    }

    return (
        <div
            className={["cm-field", "cm-var-field", className].filter(Boolean).join(" ")}
            style={{ width: width ?? PANEL_GRID.FIELD, ...style }}
            data-kind={kind}
        >
            {/* With no glyph there is no slot: an empty one set the pill off from the field's edge. */}
            {glyph !== undefined && (
                <span
                    className="cm-scrub-slot"
                    style={{ width: PANEL_GRID.GLYPH_SLOT, height: PANEL_GRID.CONTROL_HEIGHT, flex: "none" }}
                    aria-hidden="true"
                >
                    {glyph}
                </span>
            )}
            <span className="cm-var-pill-slot">
                <Tooltip label={tooltip} style={{ whiteSpace: "pre-line" }}>
                    <button
                        type="button"
                        className="cm-var-pill cm-focus-outside"
                        aria-label={ariaLabel ?? (value === undefined ? name : `${value}, variable ${name}`)}
                        aria-describedby={describedBy}
                        data-tone={value === undefined ? tone : undefined}
                        onClick={(event) => {
                            onClick?.(event);
                        }}
                    >
                        {value ?? name}
                    </button>
                </Tooltip>
            </span>
            {onValueCommit !== undefined && (
                <input
                    className="cm-var-input"
                    aria-label={valueLabel}
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            commitDraft(event);
                        } else if (event.key === "Escape") {
                            setDraft("");
                            event.currentTarget.blur();
                        }
                    }}
                    onBlur={commitDraft}
                />
            )}
            {detach}
        </div>
    );
}
