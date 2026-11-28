// Registers the real <graphty-element>, as main.tsx does.
import { Graphty } from "@graphty/graphty-element";
import type { AiManagerConfig } from "@graphty/graphty-element/ai";
import { vi } from "vitest";

/**
 * Patches every element's enableAiControl so the assistant is enabled with the configuration
 * `edit` returns (a scripted provider in place of the network, say) and is otherwise the real
 * call. `vi.restoreAllMocks()` takes it back.
 * @param edit - what the app's configuration is enabled as; it may record it, or throw to refuse.
 */
export function scriptEnable(edit: (config: AiManagerConfig) => AiManagerConfig): void {
    const real = Graphty.prototype.enableAiControl;
    vi.spyOn(Graphty.prototype, "enableAiControl").mockImplementation(async function enable(
        this: Graphty,
        config: AiManagerConfig,
    ) {
        await real.call(this, edit(config));
    });
}
