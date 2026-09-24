import { PopoutManager } from "@graphty/compact-mantine";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { makeLayer } from "../../../../test/layerFixture";
import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import type { LayerItem } from "../../../layout/LeftSidebar";
import { ShellProvider } from "../../../shell/ShellContext";
import { StyleLayerPropertiesPanel } from "../StyleLayerPropertiesPanel";

/**
 * Renders the panel with the two contexts it needs.
 *
 * `ShellProvider` because every section's open state is persisted through the shell store
 * (design 6.5), and `PopoutManager` because compact-mantine's popout-hosting controls throw
 * without a manager above them.
 * @param ui - the panel element.
 * @returns the render result.
 */
function renderPanel(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <ShellProvider persist={false} initialShellWidth={1440}>
            <PopoutManager>{ui}</PopoutManager>
        </ShellProvider>,
    );
}

/**
 * One `ControlGroup` or `ControlSection` by the name drawn in its header.
 *
 * Filtered by test id, not merely by name: a `CompactColorInput` labelled "Color" publishes
 * its own labelled wrapper, so a bare role query for "Color" finds both the Color group and
 * the picker inside it.
 * @param name - the header text.
 * @returns the group element.
 */
function group(name: string): HTMLElement {
    const groups = screen
        .getAllByRole("group", { name })
        .filter(
            (element) =>
                element.getAttribute("data-testid") === "control-group" ||
                element.getAttribute("data-testid") === "control-section",
        );

    if (groups.length !== 1) {
        throw new Error(`expected exactly one control group named ${name}, found ${String(groups.length)}`);
    }

    return groups[0];
}

/** A node layer painting one fixed colour. */
const NODE_LAYER: LayerItem = makeLayer("layer-1", "Test Layer", {
    selector: { match: "expression", where: "data.group == `1`" },
    set: { "node.color": "#FF0000", "node.size": 2 },
});

/** An edge layer, so the edge half's groups can be asked for. */
const EDGE_LAYER: LayerItem = makeLayer("layer-2", "Edges", { target: "edge" });

/** A node layer whose colour is worked out from a run rather than chosen. */
const BOUND_LAYER: LayerItem = makeLayer("layer-3", "Bridges", {
    selector: { match: "has", path: "results.run-1.value" },
    source: { by: "run", runId: "run-1", algorithm: "betweenness", params: {} },
    encode: { "node.color": { by: "results.run-1.value", scale: "linear", palette: "viridis" } },
});

describe("StyleLayerPropertiesPanel", () => {
    it("draws NO layer-name header of its own", () => {
        /* `InspectorHeader` already draws the layer's name directly above this panel, so the
           `Layer: {name}` line this used to assert was a duplicate costing a row of a 280px
           surface. Asserting its ABSENCE is what stops it coming back. */
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} />);

        expect(screen.queryByText(/Layer:.*Test Layer/)).not.toBeInTheDocument();
    });

    it("draws the selector expression a layer was authored with", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} />);

        expect(screen.getByLabelText("Node Selector")).toHaveValue("data.group == `1`");
    });

    it("commits a changed selector as an expression", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} onUpdate={onUpdate} />);

        const input = screen.getByLabelText("Node Selector");
        fireEvent.change(input, { target: { value: "data.group == `2`" } });
        fireEvent.blur(input);

        expect(onUpdate).toHaveBeenCalledWith("layer-1", {
            selector: { match: "expression", where: "data.group == `2`" },
        });
    });

    it("commits an emptied selector as `everything`, spelled out", () => {
        /* The empty string used to mean "every element", which looks scoped, behaves
           universally and says nothing about the difference. The element refuses it outright
           now, so the panel says what it means. */
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} onUpdate={onUpdate} />);

        const input = screen.getByLabelText("Node Selector");
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.blur(input);

        expect(onUpdate).toHaveBeenCalledWith("layer-1", { selector: { match: "everything" } });
    });

    it("writes nothing when the selector text did not change", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} onUpdate={onUpdate} />);

        fireEvent.blur(screen.getByLabelText("Node Selector"));

        expect(onUpdate).not.toHaveBeenCalled();
    });

    it("describes a selector the element wrote rather than offering it as text to edit", () => {
        /* `encode()` writes `{match:"has"}` and `highlight()` writes `{match:"ids"}`. Neither
           has a text form a reader could edit without losing what it means. */
        renderPanel(<StyleLayerPropertiesPanel layer={BOUND_LAYER} />);

        expect(screen.queryByLabelText("Node Selector")).not.toBeInTheDocument();
        expect(screen.getByText("the elements carrying results.run-1.value")).toBeInTheDocument();
    });

    it("draws the node groups for a node layer and the edge groups for an edge layer", () => {
        const { unmount } = renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} />);

        expect(group("Shape")).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "Arrows" })).not.toBeInTheDocument();

        unmount();
        renderPanel(<StyleLayerPropertiesPanel layer={EDGE_LAYER} />);

        expect(group("Arrows")).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "Shape" })).not.toBeInTheDocument();
    });

    it("carries every other literal across when one channel is written", async () => {
        /* A patch replaces `set` wholesale, because `update` merges one key deep. A handler
           that sent only the channel it owns would delete every other literal on the layer. */
        const user = userEvent.setup();
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} onUpdate={onUpdate} />);

        const size = within(group("Shape")).getByLabelText("Size");
        await user.clear(size);
        await user.type(size, "5");
        fireEvent.blur(size);

        expect(onUpdate).toHaveBeenCalledWith("layer-1", { set: { "node.color": "#FF0000", "node.size": 5 } });
    });

    it("writes `set: undefined` when the last literal is reset", async () => {
        /* Removing the key is how a layer says it no longer sets that channel; a present key
           holding `undefined` is a different fact and the element reads it as one. */
        const user = userEvent.setup();
        const onlyColour = makeLayer("layer-4", "One colour", { set: { "node.color": "#FF0000" } });
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={onlyColour} onUpdate={onUpdate} />);

        await user.click(within(group("Color")).getByTestId("compact-color-input-reset"));

        expect(onUpdate).toHaveBeenCalledWith("layer-4", { set: undefined });
    });

    it("draws a bound channel's control disabled, naming what it reads", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={BOUND_LAYER} />);

        expect(within(group("Color")).getByLabelText("Color hex value")).toBeDisabled();
        expect(screen.getByText(/Color from results\.run-1\.value/)).toBeInTheDocument();
    });

    it("offers exactly one verb for a bound channel, and it converts the rule", async () => {
        const user = userEvent.setup();
        const onResolveToStatic = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={BOUND_LAYER} onResolveToStatic={onResolveToStatic} />);

        await user.click(screen.getByRole("button", { name: /Convert to a fixed value/ }));

        expect(onResolveToStatic).toHaveBeenCalledWith("layer-3", "node.color");
    });

    it("draws a channel the element cannot paint as a stated reason rather than a dead control", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={NODE_LAYER} />);

        expect(screen.getByText(/Marker: The element draws no marker yet/)).toBeInTheDocument();
    });

    it("hands an unset channel no value at all, so the control draws the element's own default", () => {
        /* The third state the compact controls have and Mantine's raw inputs do not: an unset
           channel draws the element's own default with NO reset affordance beside it, which is
           what says "this layer chooses nothing here" rather than telling the reader a lie. */
        renderPanel(<StyleLayerPropertiesPanel layer={makeLayer("layer-5", "Empty")} />);

        expect(within(group("Color")).queryByTestId("compact-color-input-reset")).not.toBeInTheDocument();
    });
});
