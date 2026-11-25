import React, { forwardRef } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { EllipsizedName } from "../rows/EllipsizedName";

/**
 * A tile's size.
 * - `sm`: one 24px row, a 16px thumbnail beside the name -- a long list of pictures in a narrow pop-out
 *   (ImagePicker's library).
 * - `md`: a 96px square picture above the name, two to a row 16px apart in a 240px pop-over (the model and shader
 *   galleries), as Figma's asset tiles.
 * - `lg`: a 144px square picture above the name, for a gallery with room to show detail (a dialog, a wide panel).
 */
export type TileButtonSize = "sm" | "md" | "lg";

/** Props for TileButton. Every other button attribute (`onClick`, `tabIndex`, `aria-*`, `data-*`) is passed on. */
export interface TileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** The words under (or, at `sm`, beside) the picture, and the button's accessible name. */
    name: string;
    /** The picture's address (an object URL, a data URL, an address). */
    src?: string;
    /** Drawn in the picture's place while there is no `src`. @default the picture glyph */
    glyph?: React.ReactNode;
    /** Whether it is the one picked: drawn chosen and announced pressed. Leave it out for a tile that is never picked. */
    picked?: boolean;
    /** The tile's size; see TileButtonSize. @default "md" */
    size?: TileButtonSize;
    /** Lines under the name (a second line, facts). */
    children?: React.ReactNode;
}

/** The picture glyph's drawn size at each tile size. */
const GLYPH_PX: Record<TileButtonSize, number> = { sm: PANEL_GRID.GLYPH, md: 24, lg: 32 };

/**
 * A picture glyph on the 16px glyph grid: a frame with a mountain and a sun.
 * @param props - Component props
 * @param props.size - Drawn size in pixels
 * @returns The glyph
 */
export function PictureGlyph({ size = PANEL_GRID.GLYPH }: Readonly<{ size?: number }>): React.JSX.Element {
    // The glyph register's grid: a 16-unit box, round 1px strokes in currentColor at any size.
    const grid = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 16 / size };
    return (
        <svg
            {...grid}
            width={size}
            height={size}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            data-glyph="picture"
            className="cm-image-picker-glyph"
        >
            <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
            <path d="M2.5 11 L6 7.5 L9 10.5 L10.5 9 L13.5 12" />
            <circle cx="10.5" cy="6" r="1" />
        </svg>
    );
}

/**
 * A picture tile, for picking one item from a gallery of pictured choices: a picture with its name, lit on
 * hover, its picture ringed on keyboard focus and drawn chosen while picked (Figma's asset tile at md and lg).
 * Lay several out in a grid (or, at `sm`, a list); the keyboard walk between tiles is the caller's. It is not a mode or kind switch: a choice between modes or kinds
 * is a drop-down or a segmented control, and a tile never opens a menu.
 * @param props - Component props
 * @returns The tile
 * @example
 * ```tsx
 * <TileButton name="Sunset" src={sunsetUrl} picked={value === "sunset"} onClick={() => setValue("sunset")} />
 * ```
 */
export const TileButton = forwardRef<HTMLButtonElement, TileButtonProps>(function TileButton(
    { name, src, glyph, picked, size = "md", children, className, ...props },
    ref,
) {
    useCompactStyles();
    return (
        <button
            ref={ref}
            type="button"
            aria-label={name}
            {...props}
            aria-pressed={picked}
            data-size={size}
            className={
                className === undefined
                    ? "cm-tile-button cm-focus-inside"
                    : `cm-tile-button cm-focus-inside ${className}`
            }
        >
            {src === undefined ? (
                <span className="cm-tile-button-picture" aria-hidden="true">
                    {glyph ?? <PictureGlyph size={GLYPH_PX[size]} />}
                </span>
            ) : (
                <img className="cm-tile-button-picture" src={src} alt="" />
            )}
            <EllipsizedName name={name} className="cm-tile-button-name" />
            {children}
        </button>
    );
});
