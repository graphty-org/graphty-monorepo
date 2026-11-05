/**
 * @file The filter conditions guide's first example (docs/guide/filter-conditions.md), compiled
 * against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { FilterConditionCount, FilterEffect } from "@graphty/graphty-element/session";

/** The guide's script, as a function over the page's elements. */
export async function quickStart(): Promise<void> {
    const element = document.querySelector("graphty-element");
    const box = document.querySelector<HTMLInputElement>("#on");
    const label = document.querySelector("#count");
    if (element === null || box === null || label === null) {
        return;
    }

    const v = element.session.visibility;
    const { id } = await v.addCondition({ effect: "keep", rule: { kind: "range", attribute: "data.score", min: 0.7 } });

    box.onchange = () => void v.updateCondition(id, { on: box.checked });
    const show = (): void => {
        const c: FilterConditionCount | undefined = v.conditionCounts().find((x) => x.id === id);
        label.textContent = `${c?.nodes?.matched ?? 0} of ${c?.nodes?.total ?? 0}`;
    };
    element.session.on("history:changed", show);
    show();
}

/** A consumer's switch over the open effect union keeps a default branch. */
export function verb(effect: FilterEffect): string {
    switch (effect) {
        case "keep":
            return "Keep";
        case "exclude":
            return "Hide";
        case "select":
            return "Select";
        default:
            return effect;
    }
}
