// Tests of the no-element-to-user-event lint rule: locators pass, elements are reported.
//
//   node tools/eslint-rules/no-element-to-user-event.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "./no-element-to-user-event.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" },
});
const element = { messageId: "element" };
const VITEST = 'import { page, userEvent } from "vitest/browser";\nimport { screen, within } from "./test-utils";\n';
const v = (code) => VITEST + code;

tester.run("no-element-to-user-event", rule, {
    valid: [
        // Locators from page, and queries on them.
        v('await userEvent.click(page.getByRole("button", { name: "Go", exact: true }));'),
        v('const dialog = page.getByRole("dialog"); await userEvent.click(dialog.getByText("Off", { exact: true }));'),
        v('await userEvent.click(page.elementLocator(dialog).getByText("Off", { exact: true }));'),
        v('await userEvent.type(page.getByRole("textbox"), "abc");'),
        v('await userEvent.click(page.getByRole("tab").nth(2));'),
        v('await userEvent.keyboard("{Enter}");'),
        // An element whose origin the rule cannot see.
        v("async function go(el) { await userEvent.click(el); }"),
        v("await userEvent.click(helper());"),
        // Testing Library's own userEvent acts on the element directly.
        'import userEvent from "@testing-library/user-event"; import { screen } from "./x"; await userEvent.click(screen.getByText("Off"));',
        'import { userEvent } from "storybook/test"; import { screen } from "./x"; await userEvent.click(screen.getByText("Off"));',
        // Not vitest's userEvent at all.
        'import { screen } from "./x"; await other.click(screen.getByText("Off"));',
    ],
    invalid: [
        { code: v('await userEvent.click(screen.getByText("Off"));'), errors: [element] },
        { code: v('await userEvent.click(within(dialog).getByText("Off"));'), errors: [element] },
        { code: v('await userEvent.hover(await screen.findByRole("button"));'), errors: [element] },
        { code: v('await userEvent.click(screen.getAllByRole("row")[2]);'), errors: [element] },
        { code: v('await userEvent.click(screen.getAllByRole("row").at(-1)!);'), errors: [element] },
        { code: v('const b = screen.getByRole("button"); await userEvent.click(b);'), errors: [element] },
        {
            code: v('const list = within(screen.getByRole("list")); await userEvent.click(list.getByText("a"));'),
            errors: [element],
        },
        { code: v('await userEvent.type(document.querySelector("#find")!, "jav");'), errors: [element] },
        { code: v('await userEvent.click(document.getElementById("play") as HTMLElement);'), errors: [element] },
        { code: v('await userEvent.click(screen.getByText("x").closest("button")!);'), errors: [element] },
        { code: v('await userEvent.click(page.getByRole("button").element());'), errors: [element] },
        { code: v("await userEvent.click(page.elementLocator(dialog));"), errors: [element] },
        { code: v('const user = userEvent.setup(); await user.click(screen.getByText("Off"));'), errors: [element] },
        {
            code: 'import { userEvent as ue } from "@vitest/browser/context"; import { screen } from "./x"; await ue.click(screen.getByText("Off"));',
            errors: [element],
        },
        {
            code: v('await userEvent.dragAndDrop(screen.getByText("a"), screen.getByText("b"));'),
            errors: [element, element],
        },
    ],
});
