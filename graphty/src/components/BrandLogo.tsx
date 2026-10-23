import { useComputedColorScheme } from "@mantine/core";
import React from "react";

import lockupDark from "../assets/brand/graphty-lockup-color-on-dark.svg";
import lockupLight from "../assets/brand/graphty-lockup-color-on-light.svg";
import markDark from "../assets/brand/graphty-mark-color-on-dark.svg";
import markLight from "../assets/brand/graphty-mark-color-on-light.svg";

const FILES = {
    lockup: { light: lockupLight, dark: lockupDark },
    mark: { light: markLight, dark: markDark },
};

/**
 * The graphty logo from the brand kit (github.com/graphty-org/brand), in the version for the
 * app's own color scheme (the reader's in-app setting, not the operating system's). One image,
 * so its alt text is read once.
 * @param props - Component props
 * @param props.variant - "lockup" (mark and name, at least 20 px tall) or "mark" (at least 16 px)
 * @param props.height - Height in pixels; the width follows the artwork
 * @returns The logo image
 */
export function BrandLogo({
    variant,
    height,
}: Readonly<{ variant: "lockup" | "mark"; height: number }>): React.JSX.Element {
    const scheme = useComputedColorScheme("dark");
    return (
        <img
            src={FILES[variant][scheme]}
            alt="graphty"
            height={height}
            style={{ display: "block", alignSelf: "flex-start" }}
        />
    );
}
