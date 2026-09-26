import { Box } from "@mantine/core";
import type { JSX } from "react";

import type { PopoutContentProps } from "../../types/popout";

/**
 * The padded area inside a pop-out panel.
 *
 * Wrap a panel's content in it for the padding every pop-out shares, or leave
 * it out and lay the panel out yourself when the content has to reach the
 * panel's own edges -- a color picker, a list that scrolls.
 *
 * The padding is Figma's popover body (design/figma-spec.md 8.4): 16px at each
 * side and 12px above and below, so the 24px control of a first 32px row sits
 * 16px under the header's divider, and the last one 16px above the bottom.
 * @param props - Component props
 * @param props.children - What the panel shows, laid out inside the panel's own padding
 * @returns The panel's padded content area
 * @example
 * ```tsx
 * <Popout.Panel width={280} header={{variant: "title", title: "Display settings"}}>
 *     <Popout.Content>{controls}</Popout.Content>
 * </Popout.Panel>
 * ```
 */
export function PopoutContent({ children }: PopoutContentProps): JSX.Element {
    return <Box className="cm-popout-content">{children}</Box>;
}
