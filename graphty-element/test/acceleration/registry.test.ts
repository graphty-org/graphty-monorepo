import { afterEach, assert, describe, it, vi } from "vitest";

import { AcceleratorRegistry, acceleratorRegistry, registerAccelerator } from "../../src/acceleration/registry";
import type { AcceleratorFactory, GraphAccelerator } from "../../src/acceleration/types";
import { isGraphtyError } from "../../src/errors";

/**
 * A factory that answers with a named accelerator. Each call to this helper makes a NEW
 * function, which is what the duplicate-registration rules are written in terms of.
 */
function factoryFor(name: string): AcceleratorFactory {
    return (): Promise<GraphAccelerator> =>
        Promise.resolve({
            name,
            backend: "webgpu",
        });
}

afterEach(() => {
    acceleratorRegistry.clear();
    vi.restoreAllMocks();
});

describe("AcceleratorRegistry", () => {
    it("holds a factory under a name and hands it back in registration order", () => {
        const registry = new AcceleratorRegistry();
        const first = factoryFor("first");
        const second = factoryFor("second");

        registry.register({ name: "first", backend: "webgpu", factory: first });
        registry.register({ name: "second", factory: second });

        assert.isTrue(registry.has("first"));
        assert.deepStrictEqual(
            registry.list().map((entry) => entry.name),
            ["first", "second"],
        );
        assert.strictEqual(registry.list()[0]?.factory, first);
    });

    it("holds factories, never accelerators: registering builds nothing", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(factoryFor("counted"));

        registry.register({ name: "counted", factory });
        assert.strictEqual(factory.mock.calls.length, 0);

        await registry.list()[0]?.factory();
        assert.strictEqual(factory.mock.calls.length, 1);
    });

    it("treats re-registering the identical factory as a no-op, because hot reload does it constantly", () => {
        const registry = new AcceleratorRegistry();
        const factory = factoryFor("webgpu");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        registry.register({ name: "webgpu", factory });
        registry.register({ name: "webgpu", factory });

        assert.lengthOf(registry.list(), 1);
        assert.strictEqual(warn.mock.calls.length, 0);
    });

    it("lets a different factory win the name, and warns once about it", () => {
        const registry = new AcceleratorRegistry();
        const replacement = factoryFor("second");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        registry.register({ name: "webgpu", factory: factoryFor("first") });
        registry.register({ name: "webgpu", factory: replacement });
        registry.register({ name: "webgpu", factory: factoryFor("third") });

        assert.lengthOf(registry.list(), 1);
        assert.notStrictEqual(registry.list()[0]?.factory, replacement);
        assert.strictEqual(warn.mock.calls.length, 1);
    });

    it("refuses a collision outright when the caller asked for strict", () => {
        const registry = new AcceleratorRegistry();
        registry.register({ name: "webgpu", factory: factoryFor("first") });

        try {
            registry.register({ name: "webgpu", factory: factoryFor("second") }, { strict: true });
            assert.fail("a strict duplicate registration must throw");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_DUPLICATE_PLUGIN");
                assert.strictEqual(error.source, "registry");
                assert.strictEqual(error.details.name, "webgpu");
            }
        }
    });

    it("refuses a registration with no name and one with no factory", () => {
        const registry = new AcceleratorRegistry();
        const nameless = (): void => {
            registry.register({ name: "", factory: factoryFor("x") });
        };
        const factoryless = (): void => {
            registry.register({ name: "broken" } as unknown as { name: string; factory: AcceleratorFactory });
        };

        assert.throws(nameless, /needs a name/);
        assert.throws(factoryless, /without a factory function/);
        assert.lengthOf(registry.list(), 0);
    });

    it("removes a factory and reports whether there was one", () => {
        const registry = new AcceleratorRegistry();
        registry.register({ name: "webgpu", factory: factoryFor("first") });

        assert.isTrue(registry.remove("webgpu"));
        assert.isFalse(registry.remove("webgpu"));
        assert.isFalse(registry.has("webgpu"));
    });

    it("announces every change, so a controller that gave up can look again", () => {
        const registry = new AcceleratorRegistry();
        const seen: string[] = [];
        const unsubscribe = registry.onChange(() => {
            seen.push(
                registry
                    .list()
                    .map((entry) => entry.name)
                    .join(","),
            );
        });

        registry.register({ name: "webgpu", factory: factoryFor("first") });
        registry.remove("webgpu");
        registry.register({ name: "other", factory: factoryFor("second") });
        registry.clear();
        unsubscribe();
        registry.register({ name: "after", factory: factoryFor("third") });

        assert.deepStrictEqual(seen, ["webgpu", "", "other", ""]);
    });

    it("does not announce a clear that clears nothing", () => {
        const registry = new AcceleratorRegistry();
        const listener = vi.fn();
        registry.onChange(listener);

        registry.clear();

        assert.strictEqual(listener.mock.calls.length, 0);
    });
});

describe("registerAccelerator", () => {
    it("registers into the registry the element reads, which is what an entry point does", () => {
        const factory = factoryFor("webgpu");

        registerAccelerator({ name: "webgpu-graph-algorithms", backend: "webgpu", factory });

        assert.isTrue(acceleratorRegistry.has("webgpu-graph-algorithms"));
        assert.strictEqual(acceleratorRegistry.list()[0]?.backend, "webgpu");
    });
});
