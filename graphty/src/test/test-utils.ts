import type { TooltipProps } from "@mantine/core";
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

import { theme } from "../theme";
import { AllProviders } from "./test-providers";

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): ReturnType<typeof render> {
    return render(ui, { wrapper: AllProviders, ...options });
}

/** Testing Library's default wait for a `findBy` query, in ms. */
const DEFAULT_FIND_TIMEOUT = 1000;

/**
 * The `findBy` options for a tooltip opened by hover. The theme holds a hovered tooltip back
 * for its open delay (1000 ms), as long as the default find window, so a default `findBy`
 * gives up just before the tooltip mounts. This waits for the delay, then the usual window.
 */
export const TOOLTIP_FIND_OPTIONS = {
    timeout:
        ((theme.components?.Tooltip?.defaultProps as TooltipProps | undefined)?.openDelay ?? 0) + DEFAULT_FIND_TIMEOUT,
};

/**
 * Drags with a mouse the way compact-mantine's Tree listens for a row move: press the middle of
 * the source, move past the 4px start, move to a point and release there.
 * @param source - the element pressed.
 * @param x - client x of the drop.
 * @param y - client y of the drop.
 */
export function mouseDrag(source: HTMLElement, x: number, y: number): void {
    const box = source.getBoundingClientRect();
    const startX = box.left + box.width / 2;
    const startY = box.top + box.height / 2;
    const send = (type: string, px: number, py: number): void => {
        (document.elementFromPoint(px, py) ?? source).dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: px,
                clientY: py,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
                button: type === "pointermove" ? -1 : 0,
                buttons: type === "pointerup" ? 0 : 1,
            }),
        );
    };
    send("pointerdown", startX, startY);
    send("pointermove", startX, startY + 6);
    send("pointermove", x, y);
    send("pointerup", x, y);
}

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
