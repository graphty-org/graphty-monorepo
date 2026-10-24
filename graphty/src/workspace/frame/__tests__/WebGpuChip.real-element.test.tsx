/**
 * The status bar's WebGPU chip on the REAL graphty-element: it says what the element reports in
 * `capabilities.acceleration`, and follows the element when that changes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { acceleratorRegistry, registerAccelerator } from "@graphty/graphty-element/extend";
import { afterEach, assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The name the stand-in accelerator is registered under, so the test can take it away again. */
const FAKE_NAME = "status-bar-fake-gpu";

let unmount: (() => void) | undefined;

afterEach(() => {
    unmount?.();
    unmount = undefined;
    acceleratorRegistry.remove(FAKE_NAME);
});

describe("status bar WebGPU chip", () => {
    it("shows disabled with no GPU, enabled once one attaches, and disabled again when switched off", async () => {
        ({ unmount } = render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />));
        await waitFor(() => {
            assert.isDefined(document.querySelector("graphty-element")?.session);
        });
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the element never came up");
        }
        const bar = screen.getByRole("contentinfo", { name: "Status" });

        // No accelerator is registered in this test, so the element reports no GPU.
        await waitFor(() => {
            assert.notInclude(["active", "idle"], element.session.capabilities.acceleration.state);
            within(bar).getByText("WebGPU: disabled");
        });

        // A registration that arrives later switches acceleration on without the app doing anything.
        registerAccelerator({
            name: FAKE_NAME,
            backend: "webgpu",
            factory: () => Promise.resolve({ name: FAKE_NAME, backend: "webgpu" }),
        });
        await waitFor(() => {
            assert.include(["active", "idle"], element.session.capabilities.acceleration.state);
            within(bar).getByText("WebGPU: enabled");
        });

        element.acceleration = "off";
        await waitFor(() => {
            assert.equal(element.session.capabilities.acceleration.state, "off");
            within(bar).getByText("WebGPU: disabled");
        });
    });
});
