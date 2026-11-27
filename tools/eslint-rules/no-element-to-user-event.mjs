/**
 * no-element-to-user-event: a vitest browser test hands `userEvent` a locator, never an element.
 *
 * vitest's `userEvent.click(element)` (and `type`, `hover`, `fill`, ...) turns the element into a selector at once:
 * the shortest one that is unique at that moment, often case-blind partial text such as `internal:text="Off"i`.
 * Playwright resolves that selector later. If the page changes in between -- a status line turning into "Now: off"
 * -- the selector matches a second element and the action fails with a strict mode violation (#10169, #10194).
 * `page.elementLocator(element)` makes the same eager selector, so it is no fix either. A locator built from
 * `page` (`page.getByRole("button", { name: "Go", exact: true })`) is resolved by Playwright itself, when it acts.
 *
 * The rule reports an argument to a method of vitest's `userEvent` (imported from `vitest/browser` or
 * `@vitest/browser/context`, or made by its `setup()`) that is plainly an element:
 *
 * - a Testing Library query on `screen` or on `within(...)`: `screen.getByText("Off")`,
 *   `await within(dialog).findByRole("tab")`, `screen.getAllByRole("row")[2]`;
 * - `querySelector`, `getElementById`, `closest`, `parentElement` and similar DOM reads, and a locator's `.element()`;
 * - `page.elementLocator(...)` itself, unless a query on it follows;
 * - a variable whose initializer is one of the above.
 *
 * Testing Library's own `userEvent` (`@testing-library/user-event`, `storybook/test`) acts on the element directly
 * and is not checked. An element the rule cannot see the origin of (a function parameter, a helper's result) is
 * not reported.
 */

const VITEST_BROWSER = new Set(["vitest/browser", "@vitest/browser/context"]);
const QUERY = /^(get|query|find)(All)?By[A-Z]/;
const DOM_READ = new Set([
    "querySelector",
    "closest",
    "parentElement",
    "firstElementChild",
    "lastElementChild",
    "nextElementSibling",
    "previousElementSibling",
    "element",
]);
const ELEMENT_CALL = new Set(["querySelector", "getElementById", "closest", "element"]);
// What a getBy*/findBy* query returns, by what it is called on.
const QUERY_RESULT = { queries: "element", locator: "locator", eagerLocator: "locator" };
const GLOBALS = { screen: "queries", page: "locator" };
const LOCATOR_STEP = new Set(["nth", "first", "last", "filter", "locator", "and", "or"]);

/**
 * The expression under `await`, `!`, `as`, `satisfies` and optional chaining.
 * @param node - The expression.
 * @returns The bare expression.
 */
function bare(node) {
    let n = node;
    while (
        n &&
        (n.type === "AwaitExpression" ||
            n.type === "TSNonNullExpression" ||
            n.type === "TSAsExpression" ||
            n.type === "TSSatisfiesExpression" ||
            n.type === "ChainExpression")
    ) {
        n = n.type === "AwaitExpression" ? n.argument : n.expression;
    }
    return n;
}

/**
 * The name of a member expression's property, or null when computed.
 * @param node - The member expression.
 * @returns The name.
 */
function propName(node) {
    return !node.computed && node.property.type === "Identifier" ? node.property.name : null;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
    meta: {
        type: "problem",
        docs: { description: "vitest browser tests pass userEvent a locator Playwright resolves, never an element" },
        schema: [],
        messages: {
            element:
                "userEvent gets an element here, which vitest turns into a selector at once; it can match a second " +
                "element by the time Playwright acts. Pass a locator from page instead, e.g. " +
                'page.getByRole("button", { name: "Go", exact: true }) (#10194).',
        },
    },
    create(context) {
        const userEvents = new Set();
        const seen = new WeakMap();

        /**
         * The variable an identifier names, from the scope it is in.
         * @param id - The identifier.
         * @returns The variable, or undefined.
         */
        function variableOf(id) {
            let scope = context.sourceCode.getScope(id);
            while (scope) {
                const v = scope.set.get(id.name);
                if (v) return v;
                scope = scope.upper;
            }
            return undefined;
        }

        /**
         * What an expression evaluates to: "element", "queries" (screen, within(...)), "locator", or null.
         * @param node - The expression.
         * @param depth - Recursion guard for variables.
         * @returns The kind.
         */
        function kind(node, depth = 0) {
            const n = bare(node);
            if (!n || depth > 8) return null;
            if (seen.has(n)) return seen.get(n);
            seen.set(n, null);
            const k = classify(n, depth);
            seen.set(n, k);
            return k;
        }

        /**
         * What an identifier names: screen, vitest's page, or the kind of a variable's initializer.
         * @param n - The identifier.
         * @param depth - Recursion guard.
         * @returns The kind.
         */
        function identifierKind(n, depth) {
            const v = variableOf(n);
            if (!v) return GLOBALS[n.name] ?? null;
            const def = v.defs[0];
            if (def?.type === "ImportBinding") {
                const imported = def.node.type === "ImportSpecifier" ? def.node.imported.name : null;
                if (imported === "screen") return "queries";
                const fromVitest = VITEST_BROWSER.has(def.parent.source.value);
                return imported === "page" && fromVitest ? "locator" : null;
            }
            const single = v.defs.length === 1 && def.type === "Variable" && def.node.id.type === "Identifier";
            return single && def.node.init ? kind(def.node.init, depth + 1) : null;
        }

        /**
         * What a method call returns, from its name and the kind of what it is called on.
         * @param n - The call.
         * @param depth - Recursion guard.
         * @returns The kind.
         */
        function callKind(n, depth) {
            const callee = bare(n.callee);
            if (callee.type === "Identifier") return callee.name === "within" ? "queries" : null;
            const name = callee.type === "MemberExpression" ? propName(callee) : null;
            if (!name) return null;
            if (ELEMENT_CALL.has(name)) return "element";
            const of = kind(callee.object, depth);
            const onLocator = of === "locator" || of === "eagerLocator";
            if (QUERY.test(name)) return QUERY_RESULT[of] ?? null;
            if (name === "elementLocator" && of === "locator") return "eagerLocator";
            if (name === "at" && of === "element") return "element";
            return LOCATOR_STEP.has(name) && onLocator ? of : null;
        }

        /**
         * Classifies a bare expression.
         * @param n - The expression.
         * @param depth - Recursion guard.
         * @returns The kind.
         */
        function classify(n, depth) {
            if (n.type === "Identifier") return identifierKind(n, depth);
            if (n.type === "CallExpression") return callKind(n, depth);
            if (n.type !== "MemberExpression") return null;
            // getAllBy*(...)[i]; .at(i) is a call
            if (n.computed) return kind(n.object, depth) === "element" ? "element" : null;
            return DOM_READ.has(propName(n)) ? "element" : null;
        }

        return {
            ImportDeclaration(node) {
                if (!VITEST_BROWSER.has(node.source.value)) return;
                for (const s of node.specifiers) {
                    if (s.type === "ImportSpecifier" && s.imported.name === "userEvent") userEvents.add(s.local.name);
                }
            },
            VariableDeclarator(node) {
                // const user = userEvent.setup();
                const init = bare(node.init);
                if (
                    node.id.type === "Identifier" &&
                    init?.type === "CallExpression" &&
                    init.callee.type === "MemberExpression" &&
                    init.callee.object.type === "Identifier" &&
                    userEvents.has(init.callee.object.name) &&
                    propName(init.callee) === "setup"
                ) {
                    userEvents.add(node.id.name);
                }
            },
            CallExpression(node) {
                const callee = node.callee;
                if (
                    callee.type !== "MemberExpression" ||
                    callee.object.type !== "Identifier" ||
                    !userEvents.has(callee.object.name)
                ) {
                    return;
                }
                for (const arg of node.arguments) {
                    const k = kind(arg);
                    if (k === "element" || k === "eagerLocator") context.report({ node: arg, messageId: "element" });
                }
            },
        };
    },
};
