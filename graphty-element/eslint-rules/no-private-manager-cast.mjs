/**
 * no-private-manager-cast: a test reaches the graph's data, layout and update managers through
 * `graph.getDataManager()`, `graph.getLayoutManager()` and `graph.getUpdateManager()`, never by casting the graph
 * to a hand-written shape of its private fields, which TypeScript cannot check against a rename (issue #6988).
 *
 * A rule of its own rather than a `no-restricted-syntax` entry: ESLint keeps one setting per rule, so an entry
 * here would replace the layers guard and the AI engine boundary's syntax checks for every test file.
 */

const NAMES = /^(dataManager|layoutManager|updateManager)$/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Reach the graph's managers through their public getters, never through a cast" },
        schema: [],
        messages: {
            cast: "Use graph.getDataManager(), graph.getLayoutManager() or graph.getUpdateManager() instead of a cast to the private field.",
        },
    },
    create(context) {
        const report = (node) => context.report({ node, messageId: "cast" });
        return {
            "TSAsExpression > TSTypeLiteral > TSPropertySignature"(node) {
                if (node.key.type === "Identifier" && NAMES.test(node.key.name)) {
                    report(node);
                }
            },
            "MemberExpression[object.type='TSAsExpression']"(node) {
                if (node.property.type === "Identifier" && NAMES.test(node.property.name)) {
                    report(node);
                }
            },
        };
    },
};

export default rule;
