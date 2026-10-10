/**
 * node-position-funnel: a node's mesh is moved only through the one method allowed to move it.
 *
 * In a 2D view every node must sit on Z = 0, and each place that writes a node mesh's position
 * directly is a place where that rule has to be applied by hand; a missed one is silent (edges
 * drawn at their 3D length). Keeping the writers down to one method keeps them visible. This rule
 * reports, outside the allowed methods (`allow`, default `Node.setMeshPosition`):
 *
 * - a call of a mutating Vector3 method on a node mesh's position (`set`, `copyFrom`,
 *   `copyFromFloats`, `setAll`, `addInPlace`, ...);
 * - an assignment or `++`/`--` to its `x`, `y` or `z`;
 * - an assignment to a node mesh's `position`, and a call of `setAbsolutePosition` or
 *   `setPositionWithLocalVector` on one.
 *
 * A NODE MESH is `<receiver>.mesh` where the receiver is `node`, `n`, any name ending in `Node`
 * (`srcNode`, `this.node`, `entry.node`), or `this` inside a class named `Node`. A local bound to
 * a node mesh or to its position (`const { position } = node.mesh`) counts the same. Label, edge,
 * arrow, camera and cache meshes have other receivers and are not matched.
 */

const VECTOR_WRITES = new Set([
    "set",
    "setAll",
    "copyFrom",
    "copyFromFloats",
    "addInPlace",
    "addInPlaceFromFloats",
    "subtractInPlace",
    "scaleInPlace",
    "multiplyInPlace",
    "negateInPlace",
    "normalize",
]);
const MESH_WRITES = new Set(["setAbsolutePosition", "setPositionWithLocalVector"]);
const AXES = new Set(["x", "y", "z"]);
const WRAPPERS = new Set(["TSNonNullExpression", "TSAsExpression", "TSTypeAssertion", "TSSatisfiesExpression"]);

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Write a node mesh's position only through the node's position funnel" },
        schema: [
            {
                type: "object",
                properties: { allow: { type: "array", items: { type: "string" } } },
                additionalProperties: false,
            },
        ],
        messages: {
            write: "Do not write a node mesh's position here; call the funnel ({{allow}}) so every writer stays in one place.",
        },
    },
    create(context) {
        const allowList = context.options[0]?.allow ?? ["Node.setMeshPosition"];
        const allow = new Set(allowList);
        const { sourceCode } = context;

        const unwrap = (n) => {
            while (n && WRAPPERS.has(n.type)) {
                n = n.expression;
            }
            return n;
        };
        const propName = (m) => {
            if (m?.type !== "MemberExpression") {
                return undefined;
            }
            if (!m.computed && m.property.type === "Identifier") {
                return m.property.name;
            }
            return m.computed && m.property.type === "Literal" ? String(m.property.value) : undefined;
        };
        const enclosingClassName = (n) => {
            for (let p = n.parent; p; p = p.parent) {
                if (p.type === "ClassDeclaration" || p.type === "ClassExpression") {
                    return p.id?.name;
                }
            }
            return undefined;
        };
        const isNodeName = (name) => name === "node" || name === "n" || /Node$/.test(name);

        // The value a local was initialised from, read through `const x = init` and `const { x } = init`.
        const initOf = (id) => {
            const variable = sourceCode.getScope(id).references.find((r) => r.identifier === id)?.resolved;
            const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
            if (def?.type !== "Variable" || !def.node.init) {
                return undefined;
            }
            if (def.node.id.type === "Identifier") {
                return { init: def.node.init, key: undefined };
            }
            if (def.node.id.type === "ObjectPattern") {
                const prop = def.node.id.properties.find(
                    (p) => p.type === "Property" && p.value.type === "Identifier" && p.value.name === id.name,
                );
                if (prop && !prop.computed && prop.key.type === "Identifier") {
                    return { init: def.node.init, key: prop.key.name };
                }
            }
            return undefined;
        };

        const isNodeReceiver = (n) => {
            n = unwrap(n);
            if (n?.type === "ThisExpression") {
                return enclosingClassName(n) === "Node";
            }
            if (n?.type === "Identifier") {
                return isNodeName(n.name);
            }
            const name = propName(n);
            return name !== undefined && isNodeName(name);
        };
        // `<node>.mesh`, or a local bound to one.
        const isNodeMesh = (n, depth = 0) => {
            n = unwrap(n);
            if (propName(n) === "mesh") {
                return isNodeReceiver(n.object);
            }
            if (n?.type === "Identifier" && depth < 3) {
                const bound = initOf(n);
                if (bound?.key === "mesh") {
                    return isNodeReceiver(bound.init);
                }
                return bound !== undefined && bound.key === undefined && isNodeMesh(bound.init, depth + 1);
            }
            return false;
        };
        // `<node mesh>.position`, or a local bound to one.
        const isNodePosition = (n, depth = 0) => {
            n = unwrap(n);
            if (propName(n) === "position") {
                return isNodeMesh(n.object);
            }
            if (n?.type === "Identifier" && depth < 3) {
                const bound = initOf(n);
                if (bound?.key === "position") {
                    return isNodeMesh(bound.init);
                }
                return bound !== undefined && bound.key === undefined && isNodePosition(bound.init, depth + 1);
            }
            return false;
        };

        const inFunnel = (n) => {
            for (let p = n.parent; p; p = p.parent) {
                if (p.type === "MethodDefinition" || p.type === "PropertyDefinition") {
                    const method = p.key.type === "Identifier" ? p.key.name : undefined;
                    return allow.has(`${enclosingClassName(p)}.${method}`);
                }
            }
            return false;
        };
        const report = (n) => {
            if (!inFunnel(n)) {
                context.report({ node: n, messageId: "write", data: { allow: allowList.join(", ") } });
            }
        };
        const isWriteTarget = (target) => {
            target = unwrap(target);
            const name = propName(target);
            return (
                (name !== undefined && AXES.has(name) && isNodePosition(target.object)) ||
                (name === "position" && isNodeMesh(target.object))
            );
        };

        return {
            CallExpression(node) {
                const callee = unwrap(node.callee);
                const name = propName(callee);
                if (
                    (VECTOR_WRITES.has(name) && isNodePosition(callee.object)) ||
                    (MESH_WRITES.has(name) && isNodeMesh(callee.object))
                ) {
                    report(node);
                }
            },
            AssignmentExpression(node) {
                if (isWriteTarget(node.left)) {
                    report(node);
                }
            },
            UpdateExpression(node) {
                if (isWriteTarget(node.argument)) {
                    report(node);
                }
            },
        };
    },
};

export default rule;
