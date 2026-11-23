/**
 * @file The filter steps guide's first example (docs/guide/filter-steps.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks
 * it against `dist/`.
 */

import type { FilterStepCount } from "@graphty/graphty-element/session";

/** The guide's script, as a function over the page's elements. */
export async function quickStart(): Promise<void> {
    const element = document.querySelector("graphty-element");
    const list = document.querySelector("#steps");
    const move = document.querySelector("#move");
    if (element === null || list === null || move === null) {
        return;
    }

    const v = element.session.visibility;
    await v.addCondition({ id: "popular", effect: "keep", rule: { kind: "degree", min: 4 } });
    await v.addCondition({ id: "near-ava", effect: "keep", rule: { kind: "neighborhood", seeds: ["Ava"], depth: 1 } });

    const show = (): void => {
        list.textContent = v
            .stepCounts()
            .map((s: FilterStepCount) => `${s.id}: ${s.before.nodes} -> ${s.after.nodes} (left out ${s.leftOut.nodes})`)
            .join("\n");
    };
    element.session.on("history:changed", show);
    show();
    move.addEventListener("click", () => void v.moveStep("near-ava", 0));
}
