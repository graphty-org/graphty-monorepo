import { ColorSwatch } from "@mantine/core";
import React from "react";

import { isLightColor, normalizeHexa } from "../../utils/color-utils";

/** Props for the internal Chit. */
interface ChitProps {
    /** Any hex colour, 3 to 8 digits; an alpha channel below FF shows the checkerboard half. */
    color: string;
    /** `field` is the 14px chit inside a paint field; omit it for the 16px picker chit. */
    variant?: "field";
}

/**
 * Figma's colour chit (design/figma-spec.md 7.1) on Mantine's ColorSwatch: the opaque colour on
 * the inline-start half, the colour over a checkerboard on the other half when it carries alpha,
 * and a ring on near-white colours. Decorative: the control around it carries the name.
 * @param props - Component props
 * @param props.color - the colour
 * @param props.variant - `field` for the in-field form
 * @returns the chit
 */
export function Chit({ color, variant }: ChitProps): React.JSX.Element {
    const hexa = normalizeHexa(color) ?? "#000000FF";
    const opaque = hexa.slice(0, 7);
    const translucent = !hexa.endsWith("FF");

    return (
        <ColorSwatch
            component="span"
            color={opaque}
            variant={variant}
            mod={{ light: isLightColor(opaque) }}
            aria-hidden
        >
            {translucent && (
                <span className="cm-chit-half" style={{ "--cm-chit-color": hexa } as React.CSSProperties} />
            )}
        </ColorSwatch>
    );
}
