/**
 * @file The shader guide's "Building your own editor" example (docs/guide/shaders.md), compiled
 * against the published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json`
 * checks it against `dist/`.
 */

import { formatShaderDraft, shaderParamShape, splitShaderText } from "@graphty/graphty-element/catalog";

export async function saveEdited(g: HTMLElementTagNameMap["graphty-element"], text: string): Promise<void> {
    const { draft, body } = splitShaderText(text); // fill your form from draft and body
    if (draft === undefined) {
        return;
    }

    const glow = { name: "glow", type: "number", default: shaderParamShape("number").default };
    const edited = formatShaderDraft({ ...draft, name: "My paint", params: [...(draft.params ?? []), glow] }, body);
    const checked = await g.session.shaders.check(edited, { asNew: true, picture: true });
    if (!checked.ok) {
        console.log(checked.problems); // { code, params }: your words, your list
        return;
    }
    await g.session.shaders.add(edited, { asNew: true, onTaken: "rename" });
}
