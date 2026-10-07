/**
 * The start package's commands against a bare store: New from data... opens the Data page on a new
 * graph, and each sample has its own Open sample command.
 */
import { assert, describe, it } from "vitest";

import { START_SAMPLES } from "../../../data/sampleManifest";
import { createRegistry } from "../../commands/registry";
import { takeDataPageRequest } from "../../data-page/request";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, newProjectId } from "../../state/store";

describe("the start commands", () => {
    it("opens New from data... as a new graph, so its Cancel returns to the start screen", async () => {
        const store = createWorkspaceStore();
        store.set((state) => ({ project: { name: "Les Miserables", id: newProjectId(state) } }));
        const before = store.get().project?.id;
        await createRegistry(REGISTRATIONS)
            .built("data.new")
            ?.run({ workspace: store, session: null, element: null });
        const { project, page } = store.get();
        assert.equal(page, "data-page");
        assert.deepEqual(project?.name, "Untitled");
        assert.notEqual(project?.id, before);
        assert.equal(takeDataPageRequest(store).intent, "new");
    });

    it("registers one Open sample command per sample, in the Project group", () => {
        const registry = createRegistry(REGISTRATIONS);
        const samples = registry.live.filter((command) => command.label.startsWith("Open sample: "));
        assert.deepEqual(
            samples.map((command) => command.label),
            START_SAMPLES.map((sample) => `Open sample: ${sample.name}`),
        );
        assert.isTrue(samples.every((command) => command.group === "Project"));
    });

    it("opens a sample as a new project named after it", async () => {
        const store = createWorkspaceStore();
        const [first] = START_SAMPLES;
        await createRegistry(REGISTRATIONS)
            .built(`sample.open.${first.id}`)
            ?.run({ workspace: store, session: null, element: null });
        assert.equal(store.get().project?.name, first.name);
        assert.equal(store.get().opening?.name, first.name);
    });
});
