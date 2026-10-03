import { type GpuAccelerator } from "@graphty/webgpu-graph-algorithms";
import {
    acquireAccelerator,
    type AcquireResult,
    type ManagedAccelerator,
} from "@graphty/webgpu-graph-algorithms/acquire";
import { acquireAccelerator as browserAcquire } from "@graphty/webgpu-graph-algorithms/browser";
import { acquireAccelerator as nodeAcquire } from "@graphty/webgpu-graph-algorithms/node";
import { expectTypeOf } from "vitest";

// "./acquire" is typed from the browser build and resolves to the node build under Node: the two must agree
expectTypeOf(nodeAcquire).toEqualTypeOf(browserAcquire);
expectTypeOf(acquireAccelerator).toEqualTypeOf(browserAcquire);

const gpu = acquireAccelerator({ acceptSoftware: false, adapter: "4070" });
expectTypeOf(gpu).toEqualTypeOf<ManagedAccelerator>();
expectTypeOf(gpu.current()).resolves.toEqualTypeOf<AcquireResult>();

/** The simple path a consumer writes: an accelerator, or the reason and the fix. */
export async function sample(): Promise<string> {
    const result = await gpu.current();
    if (result.ok) {
        expectTypeOf(result.accelerator).toEqualTypeOf<GpuAccelerator>();
        return result.accelerator.ctx.caps.vendor;
    }
    expectTypeOf(result.code).toEqualTypeOf<
        "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY" | "E_DEVICE_INCORRECT"
    >();
    return `${result.reason} (${result.fix ?? "no fix"})`;
}
