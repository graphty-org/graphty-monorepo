/**
 * @file The shader guide's "Building your own editor" example (docs/guide/shaders.md), compiled
 * against the published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json`
 * checks it against `dist/`.
 */

import type { Graphty } from "@graphty/graphty-element";
import { formatShaderDraft, shaderParamShape, splitShaderText } from "@graphty/graphty-element/catalog";

export async function saveEdited(g: Graphty, text: string): Promise<void> {
    const { draft, body, problems } = splitShaderText(text); // fill your form from draft and body
    if (draft === undefined) {
        console.log(problems); // the header is not a JSON object: show the whole text and these
        return;
    }

    const glow = { name: "glow", type: "number", default: shaderParamShape("number").default };
    const edited = formatShaderDraft({ ...draft, name: "My paint", params: [...(draft.params ?? []), glow] }, body);
    const options = { asNew: true, onTaken: "rename" } as const;
    const checked = await g.session.shaders.check(edited, { ...options, picture: true });
    if (!checked.ok) {
        console.log(checked.problems); // { code, params }: your words, your list
        return;
    }
    await g.session.shaders.add(edited, options);
}
