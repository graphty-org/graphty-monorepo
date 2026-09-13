/**
 * The two text buttons a panel draws beside its filled commit button.
 *
 * Neither is a new shape: both are lifted from the boards that draw them, and they
 * live here so the treatment is declared once rather than at each of the nine
 * places that were drawing a bare Mantine `variant="subtle"`.
 *
 * Why they exist at all. `<Button variant="subtle">` with no `color` takes the
 * theme's `primaryColor`, which is the accent -- and the accent is a RESERVED role:
 * `PANEL_INK.ACCENT`'s own definition lists what may wear it ("a checked box, the
 * highlighted bin, a filled micro-bar, the Run button"), and a secondary verb is
 * on none of those lists. Nine buttons across Analyze, AI, Data and Present were
 * drawing themselves accent-blue purely because nobody had named a colour, which
 * put the panel's loudest ink on its quietest verbs and left the reader no way to
 * tell `Run` from `Copy node ids`.
 *
 * The split between the two is the one the boards draw:
 *
 * - `PanelOutlineButton` is the SECONDARY HALF OF A COMMIT PAIR -- `Copy to
 *   clipboard` beside `Export image` (ImageOptionsPopout.dc.html:357), `Cancel`
 *   beside a commit (ColumnRolePopout.dc.html:974, ImportOptions.dc.html:938). It
 *   is outlined and carries the primary ink, because it is one of two things the
 *   reader is choosing between and has to read as an equal choice.
 * - `PanelQuietButton` is a STANDALONE verb that is not being weighed against
 *   anything -- `Open from URL` and `Paste data` under the Data panel's `Open
 *   file` (DataPanelLoaded.dc.html), `Change` on a scope row. It is borderless and
 *   carries the secondary ink.
 *
 * Both are 24 high at radius 4 with the panel's own reading size, which is what
 * every board draws and what `PANEL_GRID` already publishes.
 */

import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Button, type ButtonProps } from "@mantine/core";
import React from "react";

/**
 * Props of the panel's two text buttons: Mantine's own, less the variant and the
 * colour each component fixes, plus the button element's click and labelling.
 * @public
 */
export interface PanelTextButtonProps
    extends Omit<ButtonProps, "color" | "style" | "variant">,
        Pick<React.ComponentPropsWithoutRef<"button">, "aria-label" | "onClick" | "title"> {
    /** The verb, in full. Floor item 4 keeps it whole. */
    readonly children: React.ReactNode;
}

/**
 * The outlined secondary half of a commit pair.
 * @param props - the verb and anything Mantine's button accepts.
 * @returns the outlined button.
 */
export function PanelOutlineButton(props: PanelTextButtonProps): React.JSX.Element {
    const { children, ...rest } = props;

    return (
        <Button
            variant="default"
            h={PANEL_GRID.CONTROL_HEIGHT}
            px={PANEL_GRID.TRAIL_GAP}
            radius="sm"
            c={PANEL_INK.VALUE}
            {...rest}
            style={{
                // `default` gives Mantine's own filled neutral ground; the boards
                // draw the panel through, with only the hairline describing the box.
                background: "transparent",
                borderColor: PANEL_INK.BORDER,
                fontSize: "var(--mantine-font-size-sm)",
            }}
        >
            {children}
        </Button>
    );
}

/**
 * The borderless standalone verb.
 * @param props - the verb and anything Mantine's button accepts.
 * @returns the quiet button.
 */
export function PanelQuietButton(props: PanelTextButtonProps): React.JSX.Element {
    const { children, ...rest } = props;

    return (
        <Button
            variant="subtle"
            h={PANEL_GRID.CONTROL_HEIGHT}
            px={PANEL_GRID.TRAIL_GAP}
            radius="sm"
            c={PANEL_INK.CHROME}
            {...rest}
            style={{ fontSize: "var(--mantine-font-size-sm)" }}
        >
            {children}
        </Button>
    );
}
