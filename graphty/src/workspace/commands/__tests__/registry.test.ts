import { assert, describe, it } from "vitest";

import { REGISTRATIONS } from "../../registrations";
import {
    createRegistry,
    defineRegistration,
    EXPECTED_COMMAND_IDS,
    FILE_LIST,
    stubCommands,
    type WorkspaceRegistration,
} from "../registry";

const noop = (): void => undefined;

describe("the workspace command registry", () => {
    const registry = createRegistry(REGISTRATIONS);

    it("holds every command id the tier 1 design expects, registered by the package that owns it", () => {
        const owners = new Map<string, string>();
        for (const { owner, commands } of REGISTRATIONS) {
            for (const command of commands) {
                owners.set(command.id, owner);
            }
        }
        const missing: string[] = [];
        for (const [owner, ids] of Object.entries(EXPECTED_COMMAND_IDS)) {
            for (const id of ids) {
                if (owners.get(id) !== owner) {
                    missing.push(`${id} (expected from ${owner}, got ${owners.get(id) ?? "nobody"})`);
                }
            }
        }
        assert.deepEqual(missing, []);
    });

    it("registers every package directory once", () => {
        const owners = REGISTRATIONS.map((registration) => registration.owner);
        assert.equal(new Set(owners).size, owners.length);
        for (const owner of Object.keys(EXPECTED_COMMAND_IDS)) {
            assert.include(owners, owner);
        }
    });

    it("draws the File list from three commands that every package agrees on", () => {
        for (const id of FILE_LIST) {
            assert.isDefined(registry.get(id), id);
        }
    });

    it("hides a stub from every door but keeps its id", () => {
        const stub = registry.get("project.save");
        assert.isTrue(stub?.stub);
        assert.isUndefined(registry.built("project.save"));
        assert.notInclude(registry.live, stub);
        assert.isDefined(registry.built("help.about"));
    });

    it("refuses a command id registered twice", () => {
        const one = defineRegistration({ owner: "a", commands: stubCommands([{ id: "x", label: "X", group: "View" }]) });
        const two = defineRegistration({ owner: "b", commands: stubCommands([{ id: "x", label: "X", group: "View" }]) });
        assert.throws(() => createRegistry([one, two]), /registered twice/);
    });

    it("refuses a key two commands share", () => {
        const both: WorkspaceRegistration = {
            owner: "a",
            commands: [
                { id: "x", label: "X", group: "View", keys: ["Mod+K"], run: noop },
                { id: "y", label: "Y", group: "View", keys: ["Mod+K"], run: noop },
            ],
        };
        assert.throws(() => createRegistry([both]), /bound to both/);
    });

    it("refuses a key graphty-element owns on a focused canvas", () => {
        for (const key of ["W", "a", "=", "-", "ArrowLeft", "Shift+ArrowRight"]) {
            const registration: WorkspaceRegistration = {
                owner: "a",
                commands: [{ id: "x", label: "X", group: "View", keys: [key], run: noop }],
            };
            assert.throws(() => createRegistry([registration]), /belongs to graphty-element/, key);
        }
    });

    it("refuses an inspected kind registered twice", () => {
        const kind = { kind: "node", tabs: ["style", "values"] as const };
        const one = defineRegistration({ owner: "a", commands: [], inspectedKinds: [kind] });
        const two = defineRegistration({ owner: "b", commands: [], inspectedKinds: [kind] });
        assert.throws(() => createRegistry([one, two]), /Inspected kind "node"/);
    });

    it("binds no key twice and no element key across every package", () => {
        assert.doesNotThrow(() => createRegistry(REGISTRATIONS));
    });
});
