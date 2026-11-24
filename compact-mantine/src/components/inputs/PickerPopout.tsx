import React, { useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { PanelLabelsProvider } from "../../context/PanelLabelsContext";
import { Popout } from "../popout";
import { PanelField } from "../rows/PanelField";

/** Props for PickerPopout. */
export interface PickerPopoutProps {
    /** The field's name: the pop-out's title, and FieldRow's caption above it. */
    label: string;
    /** The field's accessible name when it says more than `label` ("Picture, Forest"). */
    fieldLabel?: string;
    /** What the field shows. */
    value: string;
    placeholder?: string;
    /** What the field's glyph slot draws. */
    glyph?: React.ReactNode;
    /** The pop-out's title. @default label */
    title?: string;
    /** The pop-out's close button name. */
    closeLabel?: string;
    disabled?: boolean;
    disabledReason?: string;
    /** The pop-out's content, given a function that closes it and returns focus to the field. */
    children: (close: () => void) => React.ReactNode;
}

/**
 * The field and pop-out every picker here shares (FontPicker, DataFieldPicker, ImagePicker): a
 * select-like field that opens a 240-wide pop-out titled with its label. Enter, Space and
 * ArrowDown open it. The field never draws its own name beside itself: the caption is FieldRow's,
 * above it.
 * @param props - Component props
 * @param props.label - The field's name
 * @param props.fieldLabel - The field's accessible name, when it says more
 * @param props.value - What the field shows
 * @param props.placeholder - Shown when the value is empty
 * @param props.glyph - What the field's glyph slot draws
 * @param props.title - The pop-out's title
 * @param props.closeLabel - The close button's name
 * @param props.disabled - Whether the field cannot be used
 * @param props.disabledReason - Why it cannot be used
 * @param props.children - The pop-out's content
 * @returns The field and its pop-out
 */
export function PickerPopout({
    label,
    fieldLabel,
    value,
    placeholder,
    glyph,
    title,
    closeLabel,
    disabled = false,
    disabledReason,
    children,
}: Readonly<PickerPopoutProps>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const close = (): void => {
        setOpened(false);
    };
    return (
        <PanelLabelsProvider showLabels={false}>
            <Popout opened={opened} onOpenChange={setOpened}>
                <Popout.Trigger>
                    <PanelField // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a select-only combobox whose popup is a dialog (APG); a text box may not carry the aria-expanded Popout.Trigger adds, and no native element opens a dialog
                        role="combobox"
                        kind="select"
                        width="fill"
                        label={fieldLabel ?? label}
                        value={value}
                        placeholder={placeholder}
                        glyph={glyph}
                        disabled={disabled}
                        disabledReason={disabledReason}
                        onKeyDown={(event) => {
                            // ArrowDown opens it too, as on a select; Enter and Space come with Popout.Trigger.
                            if (event.key === "ArrowDown" && !disabled) {
                                event.preventDefault();
                                setOpened(true);
                            }
                        }}
                    />
                </Popout.Trigger>
                <Popout.Panel
                    width={PANEL_GRID.POPOVER_WIDTH}
                    header={{ variant: "title", title: title ?? label }}
                    closeLabel={closeLabel}
                >
                    {children(close)}
                </Popout.Panel>
            </Popout>
        </PanelLabelsProvider>
    );
}
