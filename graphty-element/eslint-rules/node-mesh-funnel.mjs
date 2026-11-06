/**
 * node-mesh-funnel: nothing outside `Node` reaches through a node to its mesh.
 *
 * The row renderer (design/rendering/row-renderer.md) draws a node with no mesh of its own, so
 * every reader of `Node.mesh` is a place that would stop working, or would pin that node to the
 * slow path. Readers go through the node's `drawn*` accessors instead, which can answer from
 * elsewhere later. This rule reports, wherever it is enabled, an access to the `mesh` property
 * declared by a class named `Node`: `node.mesh`, `nodes[0].mesh`, `entry?.node.mesh` and
 * `const { mesh } = node`. It goes by type, not by the receiver's name, so label, edge, batch and
 * cache meshes are not matched however they are named, and no name hides a node.
 *
 * `allow` names the methods (`Class.method`) that hand the mesh itself to a consumer, which is the
 * one read the accessors cannot stand in for.
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Reach a node's drawing through its drawn* accessors, never through node.mesh" },
        schema: [
            {
                type: "object",
                properties: { allow: { type: "array", items: { type: "string" } } },
                additionalProperties: false,
            },
        ],
        messages: {
            read: "Do not reach through a node to its mesh; use a drawn* accessor on Node, or add one, so the row renderer can answer without a mesh.",
        },
    },
    create(context) {
        const allow = new Set(context.options[0]?.allow);
        const services = context.sourceCode.parserServices;
        const checker = services.program.getTypeChecker();

        const declaredByNode = (tsSymbol) =>
            (tsSymbol?.declarations ?? []).some((declaration) => declaration.parent?.name?.text === "Node");
        const inAllowedMethod = (key) => {
            for (let p = key.parent; p; p = p.parent) {
                if (p.type === "MethodDefinition") {
                    return allow.has(`${p.parent.parent.id?.name}.${p.key.name}`);
                }
            }
            return false;
        };
        const check = (key, symbol) => {
            if (declaredByNode(symbol) && !inAllowedMethod(key)) {
                context.report({ node: key, messageId: "read" });
            }
        };

        return {
            "MemberExpression[computed=false] > Identifier.property[name='mesh']"(key) {
                check(key, checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(key)));
            },
            // `const { mesh } = node`: the name at a shorthand is the local, so ask the pattern's type.
            "ObjectPattern > Property[computed=false] > Identifier.key[name='mesh']"(key) {
                const pattern = services.getTypeAtLocation(key.parent.parent);
                check(key, checker.getNonNullableType(pattern).getProperty("mesh"));
            },
        };
    },
};

export default rule;
