/**
 * @file The labels guide's long-label and label-field examples (docs/guide/labels.md), compiled
 * against the published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json`
 * checks it against `dist/`.
 */

import { LABEL_STYLE_DESCRIPTORS } from "@graphty/graphty-element/catalog";

/** Both examples, as a function over the page's element. */
export async function longLabels(): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    await element.session.styles.add({
        name: "Short names",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.label": "Department of Health and Human Services",
            "node.labelStyle": { wrapWidth: 4, maxLines: 2 },
        },
    });

    for (const field of LABEL_STYLE_DESCRIPTORS) {
        console.log(field.field, field.accepts, field.default);
    }
}
