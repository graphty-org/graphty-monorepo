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

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
