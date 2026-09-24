/**
 * @file Narrowing the element's accelerator to the seam a CPU package's dispatcher feature-tests.
 *
 * The element attaches ONE {@link GraphAccelerator}, whose accelerated members are open-ended:
 * `webgpu.ts` forwards every callable the peer implements by name, so the object grows a member
 * each time the GPU package ports another layout or algorithm and the element needs no edit.
 * The CPU packages' dispatchers take a narrower thing -- `@graphty/layout`'s `LayoutAccelerator`
 * is three optional layout members plus `release`, and `@graphty/algorithms`'s
 * `AlgorithmAccelerator` is one optional member per algorithm -- and they decide CPU or
 * accelerator by asking whether the member EXISTS (`accelerator?.forceAtlas2 !== undefined` in
 * `createSimulation`, `acc?.pageRank !== undefined` in `accelerated`).
 *
 * That is why this copies only the members that are functions rather than spelling out
 * `forceAtlas2: accelerator.forceAtlas2` for each: an accelerator that implements ForceAtlas2 and
 * nothing else must hand the dispatcher an object with no `fruchtermanReingold` key at all, which
 * is the GPU package's own rule for its accelerator ("an unimplemented member must not exist").
 * A key present and undefined would read as implemented to anything testing with `in`.
 *
 * `dispose` is never copied. The element's controller owns the accelerator's lifetime -- it
 * disposes one it built and leaves an injected one alone -- and a layout that could dispose the
 * device out from under the next run would take that decision away from it.
 */

import type { AlgorithmAccelerator } from "@graphty/algorithms";
import type { LayoutAccelerator } from "@graphty/layout";

import type { GraphAccelerator } from "./types";

/** A member of the layout seam, typed as loosely as the boundary allows. */
type SeamMember = (...args: readonly never[]) => unknown;

/** The members of `LayoutAccelerator` the element forwards, in the order it copies them. */
const LAYOUT_MEMBERS = ["forceAtlas2", "fruchtermanReingold", "springElectrical", "release"] as const;

/**
 * The members of `AlgorithmAccelerator` the element forwards, in the order it copies them.
 *
 * These are exactly the six `accelerated()` dispatches today: a member it does not dispatch can
 * never be reached through the seam, and a member whose CPU port does not exist has nothing to
 * fall back to. When `@graphty/algorithms` adds a dispatcher method, add its name here -- until
 * then an accelerator that implements it is asked for the CPU port instead, which is the honest
 * answer rather than a silent half-route.
 *
 * `release` is the one member of `AlgorithmAccelerator` deliberately left out, and the asymmetry
 * with the layout list is real. A simulation holds device buffers ACROSS frames and releases them
 * when the layout it belongs to is replaced, so the layout seam has to carry the call. An
 * algorithm run holds nothing across calls: `accelerated()` never calls `release`, and what an
 * accelerator keeps between runs is freed from the element's own list, not from inside a run.
 */
const ALGORITHM_MEMBERS = [
    "pageRank",
    "sssp",
    "breadthFirstSearch",
    "connectedComponents",
    "weaklyConnectedComponents",
    "minimumSpanningTree",
] as const;

/**
 * Narrows the attached accelerator to the layout seam `createSimulation` feature-tests.
 *
 * The returned object is fresh on every call and holds only the members the accelerator actually
 * implements, each bound to it, so a simulation built from it keeps working however the caller
 * stores it.
 * @param accelerator - The accelerator the controller has attached.
 * @returns The layout half of it, for `createSimulation`'s third argument.
 * @example
 * ```ts
 * const decision = controller.plan({ capability: "forceAtlas2", nodeCount });
 * const simulation = createSimulation("forceatlas2", options, decision.accelerated ? narrowLayout(decision.accelerator) : null);
 * ```
 */
export function narrowLayout(accelerator: GraphAccelerator): LayoutAccelerator {
    const narrowed: { -readonly [K in keyof LayoutAccelerator]: LayoutAccelerator[K] } = {
        kind: accelerator.backend,
    };

    for (const member of LAYOUT_MEMBERS) {
        const value = accelerator[member];
        if (typeof value === "function") {
            // `never` is the one type assignable to every member of the union the index produces;
            // the feature test above is what makes the assignment sound.
            narrowed[member] = (value as SeamMember).bind(accelerator) as never;
        }
    }

    return narrowed;
}

/**
 * Narrows the attached accelerator to the algorithm seam `accelerated()` feature-tests.
 *
 * The returned object is fresh on every call and holds only the members the accelerator actually
 * implements, each bound to it, so the dispatcher runs the accelerated implementation where one
 * exists and the CPU port everywhere else.
 * @param accelerator - The accelerator the controller has attached.
 * @returns The algorithm half of it, for `accelerated()`.
 * @example
 * ```ts
 * const outcome = await controller.run({ capability: "pageRank", nodeCount }, (acc) =>
 *     accelerated(narrowAlgorithms(acc)).pageRank(snapshot, options),
 * );
 * ```
 */
export function narrowAlgorithms(accelerator: GraphAccelerator): AlgorithmAccelerator {
    const narrowed: { -readonly [K in keyof AlgorithmAccelerator]: AlgorithmAccelerator[K] } = {
        kind: accelerator.backend,
    };

    for (const member of ALGORITHM_MEMBERS) {
        const value = accelerator[member];
        if (typeof value === "function") {
            // `never` is the one type assignable to every member of the union the index produces;
            // the feature test above is what makes the assignment sound.
            narrowed[member] = (value as SeamMember).bind(accelerator) as never;
        }
    }

    return narrowed;
}
