/**
 * @file Every module that calls a Babylon.js method installed by a side-effect import makes that
 * import itself.
 *
 * Babylon.js adds some methods to its classes only when a particular module is loaded:
 * `Mesh.prototype.createInstance` works only after `@babylonjs/core/Meshes/instancedMesh` has run,
 * `Scene.prototype.pick` only after `@babylonjs/core/Culling/ray`, `Scene.prototype.beginAnimation`
 * only after `@babylonjs/core/Animations/animatable`. Without the module the method throws
 * "... needs to be imported before as it contains a side-effect required by your code".
 *
 * Importing the `@babylonjs/core` barrel loads all of them, and the element does that today, so
 * nothing is broken. But that makes the element correct by accident: the day a file switches to
 * deep imports for bundle size, or a consumer's bundler resolves the element from source and
 * reaches a mesh module through a path that skips the file that happened to load the module, the
 * method is gone. The graphty app carried an import of `instancedMesh` in its own `main.tsx` for
 * exactly that fear. The fix is that the module which calls the method loads what the method
 * needs, so every path that reaches the call reaches the registration too.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The side-effect modules the element relies on, and the methods each one installs.
 *
 * `receiver` narrows the match for method names common enough to collide with unrelated code
 * (`pick`, `stopAnimation`): only a call on something named `scene` counts.
 */
const AUGMENTATIONS = [
    { module: "@babylonjs/core/Meshes/instancedMesh", members: ["createInstance"], receiver: /./ },
    {
        module: "@babylonjs/core/Culling/ray",
        members: ["pick", "pickWithRay", "multiPick", "multiPickWithRay", "createPickingRay", "createPickingRayToRef"],
        receiver: /scene$/i,
    },
    {
        module: "@babylonjs/core/Animations/animatable",
        members: ["beginAnimation", "beginDirectAnimation", "beginWeightedAnimation", "stopAnimation"],
        receiver: /scene$/i,
    },
];

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            return sourceFiles(path);
        }
        return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : [];
    });
}

/** Side-effect modules this file needs but does not import. */
function missingImports(path: string, text = readFileSync(path, "utf8")): string[] {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const bareImports = new Set(
        source.statements
            .filter((s): s is ts.ImportDeclaration => ts.isImportDeclaration(s) && !s.importClause)
            .map((s) => (s.moduleSpecifier as ts.StringLiteral).text),
    );
    const needed = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const member = node.expression.name.text;
            const receiver = node.expression.expression.getText(source);
            for (const aug of AUGMENTATIONS) {
                if (aug.members.includes(member) && aug.receiver.test(receiver)) {
                    needed.add(aug.module);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return [...needed].filter((m) => !bareImports.has(m));
}

describe("Babylon.js side-effect imports", () => {
    it("every module calling an augmented method imports the module that installs it", () => {
        const files = sourceFiles(join(PACKAGE_ROOT, "src"));
        assert.isAbove(files.length, 50, "the scan found the element's source");

        const problems = files.flatMap((path) =>
            missingImports(path).map((m) => `${relative(PACKAGE_ROOT, path)} needs: import "${m}";`),
        );
        assert.deepEqual(problems, []);
    });

    it("recognises the calls it is looking for", () => {
        // Guards the scan itself: if it stopped matching, the test above would pass vacuously.
        const meshCache = join(PACKAGE_ROOT, "src/meshes/MeshCache.ts");
        const withoutBareImports = readFileSync(meshCache, "utf8").replace(/^import "[^"]+";$/gm, "");
        assert.deepEqual(missingImports(meshCache, withoutBareImports), ["@babylonjs/core/Meshes/instancedMesh"]);

        const probe = "this.scene.pick(1, 2); scene.beginAnimation(t, 0, 1); items.pick(3);";
        assert.deepEqual(missingImports("probe.ts", probe), [
            "@babylonjs/core/Culling/ray",
            "@babylonjs/core/Animations/animatable",
        ]);
    });
});
