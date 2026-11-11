import { afterEach, assert, describe, it } from "vitest";

import { narrowTextBoxes } from "./narrowText";

/** A box under the page's body, removed after each test. */
function add(html: string): HTMLElement {
    const box = document.createElement("div");
    box.style.font = "11px sans-serif";
    box.innerHTML = html;
    document.body.append(box);
    return box;
}

afterEach(() => {
    document.body.replaceChildren();
});

describe("narrowTextBoxes", () => {
    it("names a text field too narrow for four characters", () => {
        const box = add('<input aria-label="Tiny" style="width: 12px; padding: 0" />');
        const found = narrowTextBoxes(box);
        assert.lengthOf(found, 1);
        assert.match(found[0] ?? "", /^input "Tiny" is [\d.]+ px inside, under [\d.]+ px$/);
    });

    it("passes a text field wide enough", () => {
        assert.deepEqual(narrowTextBoxes(add('<textarea style="width: 120px"></textarea>')), []);
    });

    it("names words cut short in a narrow box, and leaves wide or uncut ones", () => {
        const cut = "overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block";
        const box = add(
            `<span style="${cut}; width: 10px">name</span>` +
                `<span style="${cut}; width: 60px">a long name cut short here</span>` +
                `<span style="${cut}; width: 10px"></span>`,
        );
        const found = narrowTextBoxes(box);
        assert.lengthOf(found, 1);
        assert.match(found[0] ?? "", /^span "name"/);
    });

    it("skips fields that are not drawn and inputs that take no words", () => {
        const box = add(
            '<input style="display: none; width: 4px" />' +
                '<input style="visibility: hidden; width: 4px" />' +
                '<input type="checkbox" style="width: 4px" />',
        );
        assert.deepEqual(narrowTextBoxes(box), []);
    });
});
