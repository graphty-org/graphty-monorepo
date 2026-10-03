/**
 * @file The project file on a real `Graph`: a project saved from one renderer opens in another
 * with its layout, positions, runs and their layers; and the guide's canonical example, run in a
 * real `<graphty-element>`. The session half is `test/session/project-file.test.ts`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Per-test budget: each builds two real Babylon scenes. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real, empty `Graph`.
 * @returns The graph.
 */
async function emptyGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

describe("the project file on a renderer", () => {
    it(
        "opens a saved project with its layout, positions, runs and layers",
        async () => {
            const source = await emptyGraph();
            await source.setLayout("circular");
            await source.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
            await source.addEdges([
                { src: "n1", dst: "n2" },
                { src: "n2", dst: "n3" },
            ]);
            const from = source.getSession();
            await from.run({ op: "algo.run", algorithm: "degree", as: "links", applySuggestedStyles: true });
            await operationQueueOf(source).waitForCompletion();
            await from.styles.settled();
            await from.project.rename("Three in a row");
            const { text } = await from.project.save();

            const target = await emptyGraph();
            const to = target.getSession();
            const report = await to.project.open(text);
            await operationQueueOf(target).waitForCompletion();
            await to.styles.settled();

            assert.deepStrictEqual(report.problems, []);
            assert.strictEqual(to.project.name, "Three in a row");
            assert.strictEqual(to.layout.id, "circular");
            assert.deepStrictEqual(
                to.runs.list().map((run) => run.id),
                ["links"],
            );
            assert.strictEqual(to.results.get("links")?.node("n2")?.value, 2);
            assert.deepStrictEqual(to.styles.toDocument(), from.styles.toDocument());

            const before = { x: 0, y: 0, z: 0 };
            const after = { x: 0, y: 0, z: 0 };
            for (let index = 0; index < 3; index++) {
                from.positions.read(index, before);
                to.positions.read(index, after);
                assert.closeTo(after.x, before.x, 1e-3);
                assert.closeTo(after.y, before.y, 1e-3);
            }

            assert.strictEqual(target.getNodes().length, 3, "the renderer draws the opened nodes");
            assert.isFalse(to.project.dirty);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "runs the guide's canonical example: save downloads a file, opening it restores the project",
        async () => {
            const element = document.createElement("graphty-element");
            document.body.append(element);
            const save = Object.assign(document.createElement("button"), { id: "save" });
            const open = Object.assign(document.createElement("input"), { id: "open", type: "file" });
            document.body.append(save, open);
            const confirmed: string[] = [];
            const realConfirm = window.confirm;
            window.confirm = (message?: string) => {
                confirmed.push(String(message));
                return true;
            };
            const downloads: HTMLAnchorElement[] = [];
            const realClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
                downloads.push(this);
            };
            cleanups.push(() => {
                window.confirm = realConfirm;
                HTMLAnchorElement.prototype.click = realClick;
                element.remove();
                save.remove();
                open.remove();
            });

            // --- the guide's example, as written there ---
            const { project } = element.session;
            const saveButton = document.querySelector("#save")!;
            const openInput = document.querySelector<HTMLInputElement>("#open")!;
            saveButton.addEventListener("click", () => {
                void element.downloadProject();
            });
            openInput.addEventListener("change", () => {
                const file = openInput.files?.[0];
                if (!file || (project.dirty && !confirm("Discard unsaved changes?"))) {
                    return;
                }

                void project.open(file, { discard: true }).then((report) => {
                    for (const problem of report.problems) {
                        console.warn(problem.code, problem.params);
                    }
                });
            });
            element.session.on("project:status", ({ name, dirty }) => {
                document.title = `${dirty ? "* " : ""}${name ?? "Untitled"}`;
            });
            // --- end of the example ---

            await element.session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
            await element.session.project.rename("Pioneers");
            assert.strictEqual(document.title, "* Pioneers");

            save.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            assert.strictEqual(downloads.length, 1);
            assert.strictEqual(downloads[0].download, "Pioneers.graphty.json");
            assert.strictEqual(document.title, "Pioneers");
            const { text } = await element.session.project.save();

            await element.session.data.addNodes([{ id: "linus" }]);
            assert.strictEqual(document.title, "* Pioneers");
            const transfer = new DataTransfer();
            transfer.items.add(new File([text], "Pioneers.graphty.json"));
            open.files = transfer.files;
            open.dispatchEvent(new Event("change"));
            await new Promise((resolve) => setTimeout(resolve, 500));

            assert.deepStrictEqual(confirmed, ["Discard unsaved changes?"]);
            assert.deepStrictEqual(
                element.session.data.nodes().map((node) => node.id),
                ["ada", "grace"],
            );
            assert.strictEqual(document.title, "Pioneers");
            assert.isFalse(element.session.project.dirty);
        },
        TEST_TIMEOUT_MS,
    );
});
