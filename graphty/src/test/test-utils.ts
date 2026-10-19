import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";

import { AllProviders } from "./test-providers";

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): ReturnType<typeof render> {
    return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
