import { ForceAtlas2Simulation } from "./forceatlas2";
import { FruchtermanReingoldSimulation } from "./fruchterman-reingold";
import type {
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    LayoutAccelerator,
    LayoutSimulation,
    SimulationType,
    SpringElectricalOptions,
} from "./types";

/**
 * The layout-side dispatcher (design 9.3): the accelerator's method when it has one, else the CPU simulation;
 * evaluated BEFORE any GPU work and never after it (design 2.4: the only branch that chooses the CPU). A thrown
 * accelerator error propagates.
 * @param type - the simulation type ("spring" is Fruchterman-Reingold)
 * @param options - the type's options
 * @param accelerator - the injected accelerator, or null / undefined for the CPU
 * @returns a simulation ready for load()
 */
export function createSimulation(
    type: SimulationType,
    options?: ForceAtlas2Options | FruchtermanReingoldOptions | SpringElectricalOptions,
    accelerator?: LayoutAccelerator | null,
): LayoutSimulation {
    switch (type) {
        case "forceatlas2":
            return accelerator?.forceAtlas2 !== undefined
                ? accelerator.forceAtlas2(options as ForceAtlas2Options | undefined)
                : new ForceAtlas2Simulation(options as ForceAtlas2Options | undefined);
        case "fruchtermanReingold":
        case "spring":
            return accelerator?.fruchtermanReingold !== undefined
                ? accelerator.fruchtermanReingold(options as FruchtermanReingoldOptions | undefined)
                : new FruchtermanReingoldSimulation(options as FruchtermanReingoldOptions | undefined);
        case "spring-electrical":
            if (accelerator?.springElectrical === undefined) {
                throw new Error(
                    'createSimulation: "spring-electrical" has no CPU simulation; inject an accelerator that implements springElectrical',
                );
            }
            return accelerator.springElectrical(options as SpringElectricalOptions | undefined);
        default: {
            const never: never = type;
            throw new Error(`createSimulation: unknown simulation type ${String(never)}`);
        }
    }
}
