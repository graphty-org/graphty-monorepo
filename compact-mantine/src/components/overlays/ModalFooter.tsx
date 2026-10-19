import { Box, type BoxProps } from "@mantine/core";
import type { ComponentPropsWithoutRef, JSX } from "react";

/**
 * Props for ModalFooter: a Box and any div attribute.
 */
export interface ModalFooterProps extends BoxProps, Omit<ComponentPropsWithoutRef<"div">, keyof BoxProps> {}

/**
 * The button bar at the bottom of a Modal (design/figma-spec.md 8.5): 40 tall
 * across the modal's full width, a 1px divider above it, padding 0 8 0 16, its
 * buttons end-aligned 8px apart. Put it last inside the Modal's children, with
 * the secondary action (Cancel) first and the primary or danger action last.
 * @param props - Box props and div attributes
 * @param props.className - Extra classes, merged with the footer's own
 * @returns The footer
 * @example
 * ```tsx
 * <Modal opened={opened} onClose={close} title="Save to version history">
 *     <TextInput data-autofocus aria-label="Title" />
 *     <ModalFooter>
 *         <Button variant="default" onClick={close}>Cancel</Button>
 *         <Button disabled={!valid}>Save</Button>
 *     </ModalFooter>
 * </Modal>
 * ```
 */
export function ModalFooter({ className, ...props }: ModalFooterProps): JSX.Element {
    return <Box className={className ? `cm-modal-footer ${className}` : "cm-modal-footer"} {...props} />;
}
