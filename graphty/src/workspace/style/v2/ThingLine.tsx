/**
 * Style panel v2's one row shape (design/ui/style-panel-v2/design.md, section 2.4): `[<> name] [main] [...]
 * [-]`. A family thing's row starts with its Switch to glyph (`MemberMenu`); "..." opens the row's own
 * settings; the minus takes the whole thing off. Every thing row is drawn through these; label and shader
 * rows share only `RowSettings`, the one "..." of a row.
 */

import React from "react";

import { GLYPHS } from "../../glyphs";
import { SettingsPopout } from "../../options/SettingsPopout";

/**
 * A row's "..." opening its own settings beside the panel: the only settings button a v2 row has.
 * @param props - Component props
 * @param props.label - its accessible name and tooltip ("Node fill settings")
 * @param props.title - the panel's heading
 * @param props.changed - whether a setting inside is set
 * @param props.opened - whether the panel is open, when the row drives it
 * @param props.onOpenChange - told when it opens or closes
 * @param props.children - the settings
 * @returns The button and its panel
 */
export function RowSettings({
    label,
    title,
    changed,
    opened,
    onOpenChange,
    children,
}: Readonly<{
    label: string;
    title: string;
    changed?: boolean;
    opened?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <SettingsPopout
            label={label}
            title={title}
            changed={changed}
            opened={opened}
            onOpenChange={onOpenChange}
            icon={<GLYPHS.more size={14} aria-hidden />}
            drill
        >
            {children}
        </SettingsPopout>
    );
}
