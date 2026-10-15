// Tests of the story-wait-options lint rule.
//
//   node tools/eslint-rules/story-wait-options.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";

import rule from "./story-wait-options.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: "module" } });
const missing = { messageId: "missing" };
const raw = { messageId: "raw" };

tester.run("story-wait-options", rule, {
    valid: [
        "await waitFor(() => expect(x).toBe(1), storyWaitOptions(1000));",
        "await waitForElementToBeRemoved(() => q(), storyWaitOptions(1000));",
        "await canvas.findByRole('button', {}, storyWaitOptions(1000));",
        "await within(body).findByRole('group', { name: 'x' }, storyWaitOptions(30_000));",
        "await canvas.findAllByText('x', {}, storyWaitOptions(1000));",
        "await findByRole(container, 'button', {}, storyWaitOptions(1000));",
        // Not Testing Library waits.
        "await waitForSettledLayout(root, '.x');",
        "await canvas.getByRole('button');",
        "await untilPasses(() => check());",
        "await canvas[findByRole]('button');",
    ],
    invalid: [
        { code: "await waitFor(() => expect(x).toBe(1));", errors: [missing] },
        { code: "await waitFor(() => expect(x).toBe(1), { timeout: 2000 });", errors: [raw] },
        { code: "await waitForElementToBeRemoved(() => q());", errors: [missing] },
        { code: "await canvas.findByRole('button');", errors: [missing] },
        { code: "await canvas.findByRole('button', { name: 'Go' });", errors: [missing] },
        { code: "await canvas.findByRole('button', {}, { timeout: 5000 });", errors: [raw] },
        // The wait options in the query-options slot are not the wait options.
        { code: "await canvas.findByText('x', storyWaitOptions(1000));", errors: [missing] },
        { code: "await within(body).findAllByTestId('x');", errors: [missing] },
        { code: "await findByRole(container, 'button', {}, timeouts);", errors: [raw] },
    ],
});
