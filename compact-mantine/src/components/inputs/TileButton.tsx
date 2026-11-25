import React, { forwardRef } from "react";

import { useCompactStyles } from "../../theme/useCompactStyles";
import { EllipsizedName } from "../rows/EllipsizedName";
import { PictureGlyph } from "./ImagePicker";

/** Props for TileButton. Every other button attribute (`onClick`, `tabIndex`, `aria-*`, `data-*`) is passed on. */
export interface TileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** The words under the picture, and the button's accessible name. */
    name: string;
    /** The picture's address (an object URL, a data URL, an address). */
    src?: string;
    /** Drawn in the picture's place while there is no `src`. @default the picture glyph */
    glyph?: React.ReactNode;
    /** Whether it is the one picked: drawn chosen and announced pressed. Leave it out for a tile that is never picked. */
    picked?: boolean;
    /** Lines under the name (a second line, facts). */
    children?: React.ReactNode;
}

/**
 * A picture tile: a picture with its name under it, lit on hover, ringed on focus and drawn chosen while
 * picked -- ImagePicker's tile, with the picture above the name. Lay several out in a grid; the grid's keyboard
 * walk is the caller's.
 * @param props - Component props
 * @returns The tile
 * @example
 * ```tsx
 * <TileButton name="Sunset" src={sunsetUrl} picked={value === "sunset"} onClick={() => setValue("sunset")} />
 * ```
 */
export const TileButton = forwardRef<HTMLButtonElement, TileButtonProps>(function TileButton(
    { name, src, glyph, picked, children, className, ...props },
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
            className={
                className === undefined
                    ? "cm-tile-button cm-focus-inside"
                    : `cm-tile-button cm-focus-inside ${className}`
            }
        >
            {src === undefined ? (
                <span className="cm-tile-button-picture" aria-hidden="true">
                    {glyph ?? <PictureGlyph size={24} />}
                </span>
            ) : (
                <img className="cm-tile-button-picture" src={src} alt="" />
            )}
            <EllipsizedName name={name} className="cm-tile-button-name" />
            {children}
        </button>
    );
});
