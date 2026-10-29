// inputs.mjs -- a test group's inputs key (design/ci/channels-pipeline/results-service.md section 3): a content
// hash of everything its result can depend on, so two runs with equal keys are the same experiment and
// disagreeing results on them mean a flaky test.
//
// ponytail: the browser revision and a story test's baseline blob are not in the key yet; the step that runs
// story tests through run-group.mjs adds them (as `extra`).

import { createHash } from "node:crypto";
import { availableParallelism } from "node:os";

/**
 * The runner's environment, one line: image, runner class, CPUs, file parallelism, Node, GPU adapter.
 * @param [env] the environment
 * @returns e.g. `ubuntu24/20261019.1|github-hosted|cpu4|workers-|node22.23.2|gpu-`
 */
export function envString(env = process.env) {
    const image = env.ImageOS ? `${env.ImageOS}/${env.ImageVersion ?? ""}` : "local";
    return [
        image,
        env.RUNNER_ENVIRONMENT ?? "local",
        `cpu${availableParallelism()}`,
        `workers-${env.VITEST_MAX_WORKERS ?? ""}`,
        `node${process.versions.node}`,
        `gpu-${env.GRAPHTY_GPU_ADAPTER ?? ""}`,
    ].join("|");
}

/**
 * The inputs key.
 * @param o the parts
 * @param o.shardKey the shard's input key (tools/prepush-inputs.mjs inputKey()), or "" when it could not be read
 * @param [o.files] the selected test files, for run shape `selected`
 * @param o.env envString()
 * @param o.flags "off" or "on"
 * @param [o.extra] anything else the result depends on
 * @returns the first 16 hex digits of the SHA-256
 */
export function inputsKey({ shardKey, files = [], env, flags, extra = "" }) {
    const h = createHash("sha256");
    for (const part of [shardKey, [...files].sort().join("\n"), env, flags, extra]) h.update(`${part}\0`);
    return h.digest("hex").slice(0, 16);
}
