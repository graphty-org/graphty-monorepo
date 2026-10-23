import { render, RenderOptions, screen, type waitForOptions } from "@testing-library/react";
import { ReactElement } from "react";

import { AllProviders } from "./test-providers";

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): ReturnType<typeof render> {
    return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
/**
 * The value picker open now (the vary list, a label's source): the group its "Find an attribute"
 * search sits in, named by the title of the pop-out it opened in.
 * @param options - how long to wait for it.
 * @returns the picker.
 */
export async function findValuePicker(options?: waitForOptions): Promise<HTMLElement> {
    const search = await screen.findByRole("combobox", { name: "Find an attribute" }, options);
    const picker = search.closest<HTMLElement>(".cm-quick-actions");
    if (picker === null) {
        throw new Error("the search is not in a value picker");
    }
    return picker;
}

/**
 * The value picker, if one is open.
 * @returns the picker, or null.
 */
export function queryValuePicker(): HTMLElement | null {
    return (
        screen.queryByRole("combobox", { name: "Find an attribute" })?.closest<HTMLElement>(".cm-quick-actions") ?? null
    );
}

export * from "@testing-library/react";
export { customRender as render };
