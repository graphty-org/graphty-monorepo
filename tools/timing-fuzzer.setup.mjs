/**
 * @file A vitest setup file that runs every test under the timing fuzzer (tools/timing-fuzzer.mjs)
 * when GRAPHTY_TIMING_FUZZ is set, and does nothing when it is not.
 *
 * Works in Node and in browser mode: the seed comes from the config through `inject`, set by
 * `timingFuzzConfig()`. Each test starts its perturbations from the run's seed and its own name,
 * and a failing test prints the seed that replays them.
 */

import { beforeEach, inject } from "vitest";

import { installTimingFuzzer, TIMING_FUZZ_ENV, TIMING_FUZZ_PROVIDE_KEY } from "./timing-fuzzer.mjs";

const provided = inject(TIMING_FUZZ_PROVIDE_KEY);

if (typeof provided === "string" && provided !== "") {
    const fuzzer = installTimingFuzzer(globalThis, Number(provided));
    beforeEach((context) => {
        fuzzer.reseed(context.task.fullName ?? context.task.name);
        context.onTestFailed(() => {
            console.error(
                `[timing fuzzer] this test failed with the clock, animation frames and timers perturbed (seed ${String(fuzzer.seed)}). ` +
                    `Replay: ${TIMING_FUZZ_ENV}=${String(fuzzer.seed)}. If it passes without the fuzzer, it depends on timing: ` +
                    `wait on the condition or count the work instead.`,
            );
        });
    });
}
