/**
 * @file The "gpu-loss" project's setup: every test starts on a fresh GPU process (issue #9731).
 *
 * On SwiftShader the GPU process never hands back the memory a GPU layout's compute work takes (its mappings
 * only grow, a thousand or more for each accelerated graph), and once it holds about 33,000 the process
 * crashes. The page then loses its WebGPU instance part way through whatever test is running ("A valid
 * external Instance reference no longer exists"), and which test that is depends only on how much ran
 * before it in the same browser. Restarting the GPU process before each test gives every test the same
 * process to start from, the same as a test that crashes it on purpose leaves the next one.
 */

import { beforeEach } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Crashes this browser's GPU process. */
        crashGpuProcess: () => Promise<void>;
    }
}

beforeEach(async () => {
    await commands.crashGpuProcess();
    // Chromium starts a new GPU process at once; it is up when it hands this page an adapter and a device again.
    for (;;) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter !== null) {
            (await adapter.requestDevice()).destroy();
            return;
        }

        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }
});
