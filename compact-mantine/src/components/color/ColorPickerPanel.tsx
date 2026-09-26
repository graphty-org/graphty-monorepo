import {
    ActionIcon,
    AlphaSlider,
    convertHsvaTo,
    HueSlider,
    isColorValid,
    parseColor,
    SegmentedControl,
    Select,
} from "@mantine/core";
import { clampUseMovePosition, useMove } from "@mantine/hooks";
import React, { type ReactNode, useEffect, useRef, useState } from "react";

import { UiGlyph } from "../../icons";
import { normalizeHexa, opacityToAlphaHex } from "../../utils/color-utils";
import { overTriggerComboboxProps } from "../inputs/listbox";
import { Chit } from "./Chit";
import { isLeavingWithoutCommit, leaveWithoutCommit } from "./escape";
import { OpacityInput } from "./OpacityInput";

/** Mantine's colour model: hue 0-360, saturation and value 0-100, alpha 0-1. */
interface Hsva {
    h: number;
    s: number;
    v: number;
    a: number;
}

/** The value formats the format select offers. */
export type ColorPickerFormat = "hex" | "rgb" | "hsl" | "hsb";

/** The paint types the paint-type bar can offer. */
export type ColorPickerPaintType = "solid" | "gradient";

/** Every string ColorPickerPanel draws or announces, in English by default. */
export interface ColorPickerPanelLabels {
    /** Name of the saturation and brightness field. */
    saturation: string;
    /** Name of the hue slider. */
    hue: string;
    /** Name of the opacity slider and the opacity box. */
    opacity: string;
    /** Name of the eyedropper button. */
    eyedropper: string;
    /** Name of the format select. */
    format: string;
    /** Name of the colour value box (hex, or three numbers). */
    value: string;
    /** Name of the paint-type group. */
    paintType: string;
    /** The solid paint type. */
    solid: string;
    /** The gradient paint type. */
    gradient: string;
    /** Name of the swatch list. */
    swatches: string;
}

const DEFAULT_LABELS: ColorPickerPanelLabels = {
    saturation: "Saturation and brightness",
    hue: "Hue",
    opacity: "Opacity",
    eyedropper: "Sample color",
    format: "Color format",
    value: "Color value",
    paintType: "Paint type",
    solid: "Solid",
    gradient: "Gradient",
    swatches: "Swatches",
};

const FORMATS: { value: ColorPickerFormat; label: string }[] = [
    { value: "hex", label: "Hex" },
    { value: "rgb", label: "RGB" },
    { value: "hsl", label: "HSL" },
    { value: "hsb", label: "HSB" },
];

/** Props for ColorPickerPanel. */
export interface ColorPickerPanelProps {
    /** The colour, `#RRGGBB` or `#RRGGBBAA`. */
    value: string;
    /**
     * Called on every change: live while dragging, once per typed commit, arrow key or swatch.
     * Reports `#RRGGBBAA` (upper case) when `withAlpha`, `#RRGGBB` otherwise.
     */
    onChange: (value: string) => void;
    /** Called once when a drag in the field or a slider settles, with the settled colour. */
    onChangeEnd?: (value: string) => void;
    /**
     * Offer opacity: the opacity slider and box.
     * @default true
     */
    withAlpha?: boolean;
    /** The swatch set under the divider, as hex or hexa strings. Each is named by its string. */
    swatches?: readonly string[];
    /**
     * The format the value row starts in.
     * @default "hex"
     */
    defaultFormat?: ColorPickerFormat;
    /**
     * Gradient content (for instance a GradientEditor). When given, a paint-type bar offers
     * Solid and Gradient, and this is shown instead of the solid controls while Gradient is on.
     */
    gradient?: ReactNode;
    /** The selected paint type, when you drive the bar. */
    paintType?: ColorPickerPaintType;
    /** Called when the reader picks a paint type. */
    onPaintTypeChange?: (paintType: ColorPickerPaintType) => void;
    /** Replace any of the English strings. */
    labels?: Partial<ColorPickerPanelLabels>;
}

/** Browsers with the EyeDropper API (Chromium) expose this constructor. */
interface EyeDropperWindow {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
}

/**
 * Clamp into a range.
 * @param n - the value
 * @param max - the top of the range (the bottom is 0)
 * @returns the clamped value
 */
function clamp(n: number, max: number): number {
    return Math.min(max, Math.max(0, n));
}

/**
 * The colour as `#RRGGBBAA`, upper case.
 * @param hsva - the colour
 * @returns the hexa string
 */
function toHexa(hsva: Hsva): string {
    return convertHsvaTo("hexa", hsva).toUpperCase();
}

/**
 * The value row's text for a format.
 * @param hsva - the colour
 * @param format - the format
 * @returns the text shown in the value box
 */
function formatValue(hsva: Hsva, format: ColorPickerFormat): string {
    if (format === "hex") {
        return toHexa(hsva).slice(1, 7);
    }
    if (format === "hsb") {
        return [hsva.h, hsva.s, hsva.v].map((n) => Math.round(n)).join(", ");
    }
    const css = convertHsvaTo(format, hsva);
    return (css.match(/[\d.]+/g) ?? []).map((n) => Math.round(Number(n))).join(", ");
}

/**
 * Read typed text in a format.
 * @param text - what the reader typed
 * @param format - the format
 * @param alpha - the alpha to keep
 * @returns the colour, or undefined when the text does not read
 */
function parseValue(text: string, format: ColorPickerFormat, alpha: number): Hsva | undefined {
    if (format === "hex") {
        const digits = text.trim().replace("#", "");
        if (digits.length !== 3 && digits.length !== 6) {
            return undefined;
        }
        const hexa = normalizeHexa(digits);
        return hexa === undefined ? undefined : { ...parseColor(hexa.slice(0, 7)), a: alpha };
    }
    const n = text
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
    if (n.length !== 3 || n.some(Number.isNaN)) {
        return undefined;
    }
    if (format === "hsb") {
        return { h: clamp(n[0], 360), s: clamp(n[1], 100), v: clamp(n[2], 100), a: alpha };
    }
    const css =
        format === "rgb"
            ? `rgb(${clamp(n[0], 255)}, ${clamp(n[1], 255)}, ${clamp(n[2], 255)})`
            : `hsl(${clamp(n[0], 360)}, ${clamp(n[1], 100)}%, ${clamp(n[2], 100)}%)`;
    return isColorValid(css) ? { ...parseColor(css), a: alpha } : undefined;
}

/**
 * The fine keyboard Figma's sliders have: arrows 1 unit, Shift 10, Home / End. Mantine's own
 * colour sliders step 5% and know no Home / End, so this runs in the capture phase and stops
 * the event before Mantine's handler sees it.
 * @param max - the slider's range, 0..max
 * @param current - the current value
 * @param apply - sets the new value
 * @returns an onKeyDownCapture handler
 */
function fineKeys(max: number, current: number, apply: (next: number) => void) {
    return (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const unit = max === 1 ? 0.01 : 1;
        const step = unit * (event.shiftKey ? 10 : 1);
        const next: Record<string, number> = {
            ArrowRight: current + step,
            ArrowUp: current + step,
            ArrowLeft: current - step,
            ArrowDown: current - step,
            Home: 0,
            End: max,
        };
        if (!(event.key in next)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        apply(Math.round(clamp(next[event.key], max) / unit) * unit);
    };
}

/**
 * Solid paint glyph, drawn here because the foundation register has none.
 * @returns the glyph
 */
function SolidGlyph(): React.JSX.Element {
    return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden focusable="false">
            <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" />
            <rect x="4.5" y="4.5" width="7" height="7" fill="currentColor" />
        </svg>
    );
}

/**
 * Gradient paint glyph (a square fading from solid to empty).
 * @returns the glyph
 */
function GradientGlyph(): React.JSX.Element {
    return (
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden focusable="false">
            <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" />
            <path d="M4.5 4.5h2v7h-2zM7.5 4.5h1.5v7H7.5zM10 4.5h1v7h-1z" fill="currentColor" opacity="0.8" />
        </svg>
    );
}

/**
 * Figma's colour picker body (design/figma-spec.md 7.3), for a 240-wide light popover: an
 * optional paint-type bar, a 208 x 208 saturation / brightness field with a keyboard-operable
 * reticle, the eyedropper (where the browser has one) beside the hue and opacity sliders, a
 * format select and a joined value / opacity field, and the swatch set under a divider.
 *
 * It holds the colour in HSV so that dragging through grey keeps its hue. Put it inside a
 * `Popout.Panel` (CompactColorInput does), which supplies the header, the close button, Escape
 * and one-popover-at-a-time.
 * @param props - Component props
 * @param props.value - the value
 * @param props.onChange - called on every change
 * @param props.onChangeEnd - called when a drag or step settles
 * @param props.withAlpha - offer opacity
 * @param props.swatches - the swatch set
 * @param props.defaultFormat - the value row's first format
 * @param props.gradient - gradient content for the paint-type bar
 * @param props.paintType - the selected paint type
 * @param props.onPaintTypeChange - called when the reader picks a paint type
 * @param props.labels - English string overrides
 * @returns the picker body
 * @example
 * ```tsx
 * <Popout.Panel width={240} header={{ variant: "title", title: "Fill" }}>
 *     <ColorPickerPanel value={fill} onChange={setFill} swatches={SWATCH_COLORS_HEXA} />
 * </Popout.Panel>
 * ```
 */
export function ColorPickerPanel({
    value,
    onChange,
    onChangeEnd,
    withAlpha = true,
    swatches = [],
    defaultFormat = "hex",
    gradient,
    paintType = "solid",
    onPaintTypeChange,
    labels: labelOverrides,
}: ColorPickerPanelProps): React.JSX.Element {
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };
    const [hsva, setHsva] = useState<Hsva>(() => parseColor(normalizeHexa(value) ?? "#000000FF"));
    const hsvaRef = useRef(hsva);
    hsvaRef.current = hsva;
    const [format, setFormat] = useState<ColorPickerFormat>(defaultFormat);
    const [draft, setDraft] = useState(formatValue(hsva, format));

    // Follow the value from outside, but keep our own HSV (and so the hue) while it still
    // describes the same colour.
    useEffect(() => {
        const incoming = normalizeHexa(value);
        if (incoming !== undefined && incoming !== toHexa(hsvaRef.current)) {
            setHsva(parseColor(incoming));
        }
    }, [value]);

    useEffect(() => {
        setDraft(formatValue(hsva, format));
    }, [hsva, format]);

    /**
     * Report a colour.
     * @param hexa - `#RRGGBBAA`
     * @returns the reported string
     */
    const report = (hexa: string): string => (withAlpha ? hexa : hexa.slice(0, 7));

    const emit = (next: Hsva): void => {
        const clamped = { ...next, a: withAlpha ? next.a : 1 };
        setHsva(clamped);
        hsvaRef.current = clamped;
        onChange(report(toHexa(clamped)));
    };

    /**
     * Report an exact colour string (a swatch or the eyedropper), not rounded through HSV.
     * @param color - a hex or hexa colour
     */
    const emitExact = (color: string): void => {
        const hexa = normalizeHexa(color);
        if (hexa === undefined) {
            return;
        }
        const parsed = parseColor(withAlpha ? hexa : hexa.slice(0, 7));
        setHsva(parsed);
        hsvaRef.current = parsed;
        onChange(report(withAlpha ? hexa : `${hexa.slice(0, 7)}FF`));
    };

    const settle = (): void => {
        onChangeEnd?.(report(toHexa(hsvaRef.current)));
    };

    const { ref: fieldRef } = useMove<HTMLDivElement>(
        ({ x, y }) => {
            emit({ ...hsvaRef.current, s: x * 100, v: (1 - y) * 100 });
        },
        { onScrubEnd: settle },
    );

    const handleFieldKeys = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const step = event.shiftKey ? 10 : 1;
        const delta: Record<string, [number, number]> = {
            ArrowRight: [step, 0],
            ArrowLeft: [-step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
        };
        const d = delta[event.key];
        if (d === undefined) {
            return;
        }
        event.preventDefault();
        const { current } = hsvaRef;
        const moved = clampUseMovePosition({ x: (current.s + d[0]) / 100, y: (current.v + d[1]) / 100 });
        emit({ ...current, s: moved.x * 100, v: moved.y * 100 });
        settle();
    };

    const commitDraft = (): void => {
        const parsed = parseValue(draft, format, hsvaRef.current.a);
        if (parsed === undefined) {
            setDraft(formatValue(hsvaRef.current, format));
            return;
        }
        if (toHexa(parsed) !== toHexa(hsvaRef.current)) {
            emit(parsed);
            settle();
        }
    };

    const eyeDropper = typeof window === "undefined" ? undefined : (window as EyeDropperWindow).EyeDropper;
    const sample = (): void => {
        if (eyeDropper === undefined) {
            return;
        }
        new eyeDropper()
            .open()
            .then((result) => {
                emitExact(`${result.sRGBHex}${opacityToAlphaHex(hsvaRef.current.a * 100)}`);
            })
            .catch(() => {
                // The reader pressed Escape: nothing to do.
            });
    };

    const opaque = toHexa(hsva).slice(0, 7);
    const percent = Math.round(hsva.a * 100);
    const showGradient = gradient !== undefined && paintType === "gradient";

    return (
        <div className="cm-color-picker" data-testid="color-picker-panel">
            {gradient !== undefined && (
                <div className="cm-color-picker-types">
                    <SegmentedControl
                        variant="loose"
                        aria-label={labels.paintType}
                        value={paintType}
                        onChange={(next) => {
                            onPaintTypeChange?.(next as ColorPickerPaintType);
                        }}
                        data={[
                            {
                                value: "solid",
                                label: (
                                    <>
                                        <SolidGlyph />
                                        <span className="cm-visually-hidden">{labels.solid}</span>
                                    </>
                                ),
                            },
                            {
                                value: "gradient",
                                label: (
                                    <>
                                        <GradientGlyph />
                                        <span className="cm-visually-hidden">{labels.gradient}</span>
                                    </>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            {showGradient ? (
                gradient
            ) : (
                <>
                    <div className="cm-color-picker-body">
                        <div
                            ref={fieldRef}
                            className="cm-color-saturation"
                            data-testid="color-picker-saturation"
                            role="slider"
                            tabIndex={0}
                            aria-label={labels.saturation}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(hsva.s)}
                            aria-valuetext={`${Math.round(hsva.s)}%, ${Math.round(hsva.v)}%`}
                            onKeyDown={handleFieldKeys}
                            style={
                                {
                                    "--cm-hue": hsva.h,
                                    "--cm-x": `${hsva.s}%`,
                                    "--cm-y": `${100 - hsva.v}%`,
                                } as React.CSSProperties
                            }
                        >
                            <div className="cm-color-thumb" style={{ background: opaque }} />
                        </div>

                        <div className="cm-color-picker-sliders">
                            <div className="cm-color-picker-eyedropper">
                                {eyeDropper !== undefined && (
                                    <ActionIcon
                                        variant="subtle"
                                        size={24}
                                        aria-label={labels.eyedropper}
                                        onClick={sample}
                                    >
                                        <UiGlyph name="eyedropper" />
                                    </ActionIcon>
                                )}
                            </div>
                            <div className="cm-color-picker-slider-stack">
                                <HueSlider
                                    aria-label={labels.hue}
                                    data-testid="color-picker-hue"
                                    value={Math.round(hsva.h)}
                                    onChange={(h) => {
                                        emit({ ...hsvaRef.current, h });
                                    }}
                                    onChangeEnd={settle}
                                    onKeyDownCapture={fineKeys(360, Math.round(hsva.h), (h) => {
                                        emit({ ...hsvaRef.current, h });
                                        settle();
                                    })}
                                />
                                {withAlpha && (
                                    <AlphaSlider
                                        aria-label={labels.opacity}
                                        data-testid="color-picker-alpha"
                                        color={opaque}
                                        thumbColor={opaque}
                                        value={hsva.a}
                                        onChange={(a) => {
                                            emit({ ...hsvaRef.current, a });
                                        }}
                                        onChangeEnd={settle}
                                        onKeyDownCapture={fineKeys(1, hsva.a, (a) => {
                                            emit({ ...hsvaRef.current, a });
                                            settle();
                                        })}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="cm-color-picker-values">
                            <Select
                                className="cm-color-picker-format"
                                aria-label={labels.format}
                                data={FORMATS}
                                value={format}
                                allowDeselect={false}
                                comboboxProps={{ ...overTriggerComboboxProps(), withinPortal: false }}
                                onChange={(next) => {
                                    if (next !== null) {
                                        setFormat(next as ColorPickerFormat);
                                    }
                                }}
                            />
                            <div className="cm-joined-field">
                                <input
                                    className="cm-paint-input"
                                    type="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-label={labels.value}
                                    data-testid="color-picker-value"
                                    value={draft}
                                    onChange={(event) => {
                                        setDraft(event.currentTarget.value);
                                    }}
                                    onFocus={(event) => {
                                        event.currentTarget.select();
                                    }}
                                    onBlur={(event) => {
                                        if (!isLeavingWithoutCommit(event)) {
                                            commitDraft();
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            commitDraft();
                                        } else if (event.key === "Escape") {
                                            leaveWithoutCommit(event, () => {
                                                setDraft(formatValue(hsvaRef.current, format));
                                            });
                                        }
                                    }}
                                />
                                {withAlpha && (
                                    <OpacityInput
                                        value={percent}
                                        ariaLabel={labels.opacity}
                                        testId="color-picker-opacity"
                                        onCommit={(next) => {
                                            emit({ ...hsvaRef.current, a: next / 100 });
                                            settle();
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {swatches.length > 0 && (
                        <div className="cm-color-swatches" role="group" aria-label={labels.swatches}>
                            {swatches.map((swatch, index) => (
                                <button
                                    key={`${String(index)}-${swatch}`}
                                    type="button"
                                    className="cm-color-swatch-button cm-focus-double"
                                    aria-label={swatch}
                                    onClick={() => {
                                        emitExact(swatch);
                                    }}
                                >
                                    <Chit color={swatch} />
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
