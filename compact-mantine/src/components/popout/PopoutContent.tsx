import { Box } from "@mantine/core";
import type { JSX } from "react";

import type { PopoutContentProps } from "../../types/popout";

/**
 * The padded area inside a pop-out panel.
 *
 * Wrap a panel's content in it for the padding every pop-out shares, or leave
 * it out and lay the panel out yourself when the content has to reach the
 * panel's own edges -- a colour picker, a list that scrolls.
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
    return <Box p="sm">{children}</Box>;
}
