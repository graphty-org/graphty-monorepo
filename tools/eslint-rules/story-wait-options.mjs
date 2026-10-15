/**
 * story-wait-options: a story play function's Testing Library waits pass `storyWaitOptions(...)`.
 *
 * `waitFor`, `waitForElementToBeRemoved`, `findBy*` and `findAllBy*` stop after 1000 ms unless they
 * are given a `timeout`. A stalled machine outlasts that while the work still finishes inside the
 * runner's own test timeout, so the story fails though nothing is wrong (#2864, #2930). A raw
 * `{ timeout: n }` is the same failure on a longer timer. `storyWaitOptions(ms)` gives the wait no
 * deadline of its own under a test runner and keeps `ms` in the interactive Storybook. A global
 * Testing Library `configure` cannot do this: the stories import both `@storybook/test` and
 * `storybook/test`, which are separate module copies.
 *
 * The wait options are the second argument of `waitFor` and `waitForElementToBeRemoved`, and the
 * third of a bound query (`canvas.findByRole(role, options, waitOptions)`), so a query with no
 * options of its own passes `{}` before them.
 */

const WAIT_NAMES = new Set(["waitFor", "waitForElementToBeRemoved"]);
const FIND_NAME = /^find(All)?By[A-Z]/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Require storyWaitOptions(...) on every waitFor and findBy* in a story" },
        schema: [],
        messages: {
            missing:
                "`{{name}}` without storyWaitOptions(...) stops after Testing Library's 1000 ms default. Pass storyWaitOptions(ms) as its {{position}} argument.",
            raw: "`{{name}}` with a hand-set wait option keeps a deadline under the test runner. Pass storyWaitOptions(ms) as its {{position}} argument instead.",
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                const callee = node.callee;
                let name;
                if (callee.type === "Identifier") {
                    name = callee.name;
                } else if (callee.type === "MemberExpression" && !callee.computed) {
                    name = callee.property.name;
                }
                let index;
                if (WAIT_NAMES.has(name)) {
                    index = 1;
                } else if (FIND_NAME.test(name ?? "")) {
                    // An unbound query takes the container first.
                    index = callee.type === "Identifier" ? 3 : 2;
                } else {
                    return;
                }
                const arg = node.arguments[index];
                if (
                    arg?.type === "CallExpression" &&
                    arg.callee.type === "Identifier" &&
                    arg.callee.name === "storyWaitOptions"
                ) {
                    return;
                }
                const position = ["first", "second", "third", "fourth"][index];
                context.report({ node, messageId: arg ? "raw" : "missing", data: { name, position } });
            },
        };
    },
};

export default rule;
