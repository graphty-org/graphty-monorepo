import { Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { UiGlyph } from "../../icons";
import type { ActivationHandler, ChangeHandler } from "../../types/events";

/** Props for VariablePill. */
export interface VariablePillProps {
    /** The variable's name ("rsu/radius-sm"). */
    name: string;
    /** The variable's resolved value, shown in the pill and in its tooltip ("4"). */
    value?: string;
    /**
     * Called by the Detach (broken link) button, which appears while the field is hovered or
     * focused. Without it there is no Detach button.
     */
    onDetach?: ActivationHandler;
    /** Called when the pill (or the fill row) is clicked: reopen the variable picker here. */
    onClick?: ActivationHandler;
    /**
     * A colour: draws the bound FILL row instead of a number field -- one 156 x 24 button with
     * a 14px chit and the variable's name.
     */
    swatch?: string;
    /**
     * `"variable"` (default) or `"property"`: a layer property bound to a component property,
     * drawn as a chip on the component tint.
     */
    kind?: "variable" | "property";
    /** A 24px leading slot for the bound number field: the field's glyph or letter. */
    glyph?: React.ReactNode;
    /** The field's width. @default 88 for a number field, 156 for a fill row */
    width?: number | string;
    /** The Detach button's accessible name. @default "Detach variable" */
    detachLabel?: string;
    /**
     * Makes the rest of a bound number field editable, as in Figma: typing after the pill and
     * pressing Enter (or leaving the field) reports the text, and the caller replaces the binding
     * with that literal (detach, then apply). Escape abandons the text. Without it the field after
     * the pill is empty space.
     */
    onValueCommit?: ChangeHandler<string>;
    /** The accessible name of the input after the pill. @default "Value" */
    valueLabel?: string;
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
 * hovering the field shows a 16px Detach button at its end. With `swatch` it is the bound fill
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
        kind = "variable",
        glyph,
        width,
        detachLabel = "Detach variable",
        onValueCommit,
        valueLabel = "Value",
        className,
        style,
    } = props;
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
    const tooltip = value === undefined ? name : `${name}\n${value}`;

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
                <button
                    type="button"
                    className="cm-var-fill-button"
                    data-kind={kind}
                    aria-label={value === undefined ? name : `${name}, ${value}`}
                    onClick={(event) => {
                        onClick?.(event);
                    }}
                >
                    {swatch !== undefined && (
                        <span className="cm-var-chit" style={{ background: swatch }} aria-hidden="true" />
                    )}
                    <span className="cm-var-name">{name}</span>
                </button>
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
            <span
                className="cm-scrub-slot"
                style={{ width: PANEL_GRID.GLYPH_SLOT, height: PANEL_GRID.CONTROL_HEIGHT, flex: "none" }}
                aria-hidden="true"
            >
                {glyph}
            </span>
            <span className="cm-var-pill-slot">
                <Tooltip label={tooltip} style={{ whiteSpace: "pre-line" }}>
                    <button
                        type="button"
                        className="cm-var-pill cm-focus-outside"
                        aria-label={value === undefined ? name : `${value}, variable ${name}`}
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
