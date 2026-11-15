import { SegmentedControl as MantineSegmentedControl, useInputWrapperContext } from "@mantine/core";
import React from "react";

/**
 * Mantine's SegmentedControl, named by the `Input.Wrapper` around it.
 *
 * `Input.Wrapper` names its child with `<label for={id}>`, and only a control
 * that reads the wrapper's context takes that id. Mantine's SegmentedControl
 * does not, so inside a wrapper its radiogroup is announced with no name and
 * no description. This drop-in reads the wrapper's label and description ids
 * and puts them on the radiogroup as `aria-labelledby` and `aria-describedby`.
 * Either attribute passed by the caller wins. Outside a wrapper it is exactly
 * Mantine's control. A theme extension cannot do this, because a component's
 * theme defaults cannot read React context.
 *
 * Mantine's wrapper publishes a label id even when it renders no label, so a
 * wrapper with only a description or an error leaves `aria-labelledby`
 * pointing at no element. Browsers skip a missing id and fall back to any
 * `aria-label`, so give the control one in that case.
 * @param props - Mantine's SegmentedControl props, and its name
 * @param props.label - The control's name, for a `FieldRow` caption and its accessible name
 * @returns The segmented control
 * @example
 * ```tsx
 * <Input.Wrapper label="Mode" description="How the graph is drawn">
 *     <SegmentedControl data={["2D", "3D"]} />
 * </Input.Wrapper>
 * ```
 */
export function SegmentedControl({
    label,
    ...props
}: React.ComponentProps<typeof MantineSegmentedControl> & {
    /**
     * The control's name: its accessible name outside an `Input.Wrapper`, and the caption a
     * `FieldRow` draws for it while labels are shown, as it does for a `PanelField`.
     */
    label?: string;
}): React.JSX.Element {
    const wrapper = useInputWrapperContext();

    return (
        <MantineSegmentedControl
            aria-labelledby={wrapper?.labelId}
            aria-describedby={wrapper?.describedBy}
            {...(label === undefined || wrapper?.labelId !== undefined ? {} : { "aria-label": label })}
            {...props}
        />
    );
}
