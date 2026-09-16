import { PANEL_GRID, PopoutManager } from "@graphty/compact-mantine";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, type Mock, vi } from "vitest";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import type { LayerItem } from "../../../layout/LeftSidebar";
import { DEGREE_INPUT_PATH, topDegreeLabelLayer } from "../../../shell/defaults/styleDescriptors";
import { ShellProvider } from "../../../shell/ShellContext";
import { StyleLayerPropertiesPanel } from "../StyleLayerPropertiesPanel";

/**
 * Renders the panel with the two contexts it now needs.
 *
 * `ShellProvider` because every section's open state is persisted through the shell store
 * (design 6.5), and `PopoutManager` because the rich-text channels open their editor in a
 * library popout rather than drawing 503 lines of editor inline in a 280px panel.
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
 * Both render `role="group"` named by their own visible header text, which is what lets a
 * query scope to "the Shape group" rather than guessing which of the panel's four fields
 * called "Type" it meant.
 * @param name - the header text.
 * @returns the group element.
 */
function group(name: string): HTMLElement {
    /* Filtered by test id, not merely by name: a `CompactColorInput` labelled "Color"
       publishes its own labelled wrapper, so a bare role query for "Color" finds both the
       Color ControlGroup and the picker inside it. */
    const groups = screen
        .getAllByRole("group", { name })
        .filter((element) => element.getAttribute("data-testid") === "control-group" || element.getAttribute("data-testid") === "control-section");

    if (groups.length !== 1) {
        throw new Error(`expected exactly one control group named ${name}, found ${String(groups.length)}`);
    }

    return groups[0];
}

/**
 * Picks an option out of a compact `StyleSelect`.
 *
 * The library control is a Mantine `Select` -- a combobox with a portalled listbox -- not
 * the raw `NativeSelect` the panel used to draw, so a test opens it and clicks the option
 * rather than firing a change event at a `<select>`.
 * @param scope - the group the control lives in.
 * @param label - the control's drawn label.
 * @param option - the option's drawn label.
 */
async function pick(scope: HTMLElement, label: string, option: string): Promise<void> {
    const user = userEvent.setup();

    await user.click(within(scope).getByLabelText(label));
    await user.click(await screen.findByRole("option", { name: option }));
}

/** The node colour hex box, which is the first `CompactColorInput` in the Color group. */
function nodeColorHex(): HTMLElement {
    return within(group("Color")).getByLabelText("Color hex value");
}

describe("StyleLayerPropertiesPanel", () => {
    const mockLayer: LayerItem = {
        id: "layer-1",
        name: "Test Layer",
        styleLayer: {
            node: {
                selector: "id == `1`",
                style: { color: "#ff0000" },
            },
            edge: {
                selector: "",
                style: {},
            },
        },
    };

    it("draws NO layer-name header of its own", () => {
        /* `InspectorHeader` already draws the layer's name directly above this panel, so
           the `Layer: {name}` line this used to assert was a duplicate costing a row of a
           280px surface. Asserting its ABSENCE is what stops it coming back. */
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.queryByText(/Layer:.*Test Layer/)).not.toBeInTheDocument();
    });

    it("renders node selector input", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        expect(selectorInput).toBeInTheDocument();
        expect(selectorInput).toHaveValue("id == `1`");
    });

    it("renders node color input", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(nodeColorHex()).toBeInTheDocument();
    });

    it("calls onUpdate when selector changes", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        fireEvent.change(selectorInput, { target: { value: "id == `2`" } });
        fireEvent.blur(selectorInput);

        expect(onUpdate).toHaveBeenCalledWith(mockLayer.id, {
            selector: "id == `2`",
            style: { color: "#ff0000" },
        });
    });

    it("does NOT write when a selector is blurred without being changed", () => {
        /* The edge half of this was a live defect: `handleEdgeSelectorBlur` fired on ANY
           focus loss and wrote `{selector: "", style: {}}`, and `sameStyleHalf` reads an
           absent half against a present one as a change, so merely tabbing through the
           field gave a node-only layer an every-edge encoding that the legend then
           described. */
        const onUpdate = vi.fn();
        const onEdgeUpdate = vi.fn();
        renderPanel(
            <StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} onEdgeUpdate={onEdgeUpdate} />,
        );

        fireEvent.blur(screen.getByLabelText("Node Selector"));
        fireEvent.blur(screen.getByLabelText("Edge Selector"));

        expect(onUpdate).not.toHaveBeenCalled();
        expect(onEdgeUpdate).not.toHaveBeenCalled();
    });

    it("calls onUpdate when color changes (on blur)", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const hex = nodeColorHex();
        fireEvent.change(hex, { target: { value: "00FF00" } });
        fireEvent.blur(hex);

        expect(onUpdate).toHaveBeenCalledWith(
            mockLayer.id,
            expect.objectContaining({
                selector: "id == `1`",
                style: expect.objectContaining({
                    texture: { color: "#00FF00" },
                }),
            }),
        );
    });

    it("renders shape control", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} />);

        const shape = group("Shape");
        expect(within(shape).getByLabelText("Type")).toBeInTheDocument();
        expect(within(shape).getByLabelText("Size")).toBeInTheDocument();
    });

    it("calls onUpdate when shape changes", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        await pick(group("Shape"), "Type", "Box");

        expect(onUpdate).toHaveBeenCalledWith(
            mockLayer.id,
            expect.objectContaining({
                selector: "id == `1`",
                style: expect.objectContaining({
                    shape: { type: "box", size: 1.0 },
                }),
            }),
        );
    });

    it("renders the three colour fills as one Fill control", async () => {
        /* Three MODES, drawn as a StyleSelect and NOT as an IconGroupRow: an icon group
           needs one glyph per option and compact-mantine's glyph register is CLOSED and
           carries no colour-mode glyph, so drawing three SVGs at this call site would be
           the bespoke substitute for a library control that 6.17 check 1 forbids. */
        renderPanel(<StyleLayerPropertiesPanel layer={mockLayer} />);

        const user = userEvent.setup();
        await user.click(within(group("Color")).getByLabelText("Fill"));

        expect(await screen.findByRole("option", { name: "Solid" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Linear gradient" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Radial gradient" })).toBeInTheDocument();
    });
});

describe("StyleLayerPropertiesPanel writing back to an element-shaped layer", () => {
    /**
     * A label as graphty-element holds one: FLAT, `font` a string, `fontWeight` a string.
     *
     * This is what `StyleManager.getLayers()` hands the panel, and what every handler that
     * does not own the label branch has to hand back untouched. The element's schema is a
     * Zod `strictObject`, so the editor's nested shape does not merely go unread there --
     * the label fails to parse and rebuilds as a blank texture.
     */
    const ELEMENT_LABEL = {
        enabled: true,
        text: "Mr_Whiskers",
        location: "top",
        font: "Verdana",
        fontSize: 48,
        fontWeight: "normal",
        textColor: "#000000",
        attachOffset: 0,
        billboardMode: 7,
    };

    /** A tooltip in the same shape, so the two rich-text branches are both under test. */
    const ELEMENT_TOOLTIP = {
        enabled: true,
        text: "degree: 11",
        location: "top-right",
        font: "Verdana",
        fontSize: 32,
        textColor: "#000000",
        backgroundColor: "#FFFFFF",
    };

    const labelledLayer: LayerItem = {
        id: "layer-2",
        name: "Labelled Layer",
        styleLayer: {
            node: {
                selector: "id == `1`",
                style: {
                    texture: { color: "#FF0000" },
                    label: ELEMENT_LABEL,
                    tooltip: ELEMENT_TOOLTIP,
                    /* `effect` (singular) is the element's own key and the panel has no
                       editor for it, which makes it the plainest test of patching: a
                       handler that restates the style drops it, a handler that patches
                       cannot. */
                    effect: { wireframe: true },
                },
            },
            edge: {
                selector: "",
                style: { label: ELEMENT_LABEL },
            },
        },
    };

    /**
     * The node style the panel wrote on its most recent call.
     * @param onUpdate - the spy passed as `onUpdate`.
     * @returns the style the panel wrote.
     */
    function lastNodeStyle(onUpdate: Mock): Record<string, unknown> {
        expect(onUpdate).toHaveBeenCalled();

        const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1] as [string, { style?: unknown }];

        return (lastCall[1].style ?? {}) as Record<string, unknown>;
    }

    /**
     * Opens one rich-text editor through its own advanced button.
     *
     * The 503-line editor is UNCHANGED by this rebuild and now lives behind a popout,
     * which is the shape spec:3428 fixes for it; step 2 swaps its primitives.
     * @param sectionName - "Node" or "Edge".
     * @param rowLabel - "Label" or "Tooltip".
     * @returns the editor's own subtree.
     */
    async function openRichText(sectionName: string, rowLabel: string): Promise<HTMLElement> {
        const user = userEvent.setup();
        await user.click(
            within(group(sectionName)).getByRole("button", { name: new RegExp(`${rowLabel} settings`) }),
        );

        return screen.getByTestId(`rich-text-editor-${sectionName} ${rowLabel}`);
    }

    it("leaves the label exactly as the element had it when the colour is edited", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const hex = nodeColorHex();
        fireEvent.change(hex, { target: { value: "00FF00" } });
        fireEvent.blur(hex);

        const style = lastNodeStyle(onUpdate);

        // Identical, key for key -- including `fontWeight: "normal"`, which has no number
        // for the editor's weight field to hold and so cannot survive a round trip.
        expect(style.label).toEqual(ELEMENT_LABEL);
        expect(style.tooltip).toEqual(ELEMENT_TOOLTIP);
        expect(typeof (style.label as { font?: unknown }).font).toBe("string");
        expect(style.texture).toEqual({ color: "#00FF00" });
    });

    it("carries the branches it does not own through a shape edit", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        await pick(group("Shape"), "Type", "Box");

        const style = lastNodeStyle(onUpdate);

        expect(style.label).toEqual(ELEMENT_LABEL);
        expect(style.effect).toEqual({ wireframe: true });
        expect(style.shape).toEqual({ type: "box", size: 1.0 });
    });

    it("writes the label branch in ELEMENT shape when the label itself is edited", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const labelEditor = within(await openRichText("Node", "Label"));
        const textInput = labelEditor.getByLabelText("Text");
        fireEvent.change(textInput, { target: { value: "Mrs_Henderson" } });
        fireEvent.blur(textInput);

        expect(lastNodeStyle(onUpdate).label).toEqual({
            ...ELEMENT_LABEL,
            text: "Mrs_Henderson",
            // The editor's weight field is a NUMBER, so "normal" comes back as the default
            // it opened at. That is the one value an edit of this branch cannot preserve.
            fontWeight: "400",
        });
    });

    it("removes the label branch rather than writing a broken one when the label is turned off", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const labelEditor = within(await openRichText("Node", "Label"));
        fireEvent.click(labelEditor.getByLabelText("Enabled"));

        const style = lastNodeStyle(onUpdate);

        /* Absent, not present-and-disabled: graphty-element merges matching layers with
           `defaultsDeep`, where the two are different facts. */
        expect(style).not.toHaveProperty("label");
        expect(style.tooltip).toEqual(ELEMENT_TOOLTIP);
        expect(style.effect).toEqual({ wireframe: true });
    });

    it("removes the label branch from the row's own toggle too", () => {
        /* The row-level toggle is new. It is the control a reader reaches first, and it
           must agree with the editor behind the advanced button: both remove the branch
           rather than writing a disabled one. */
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        fireEvent.click(within(group("Node")).getByRole("checkbox", { name: "Label" }));

        expect(lastNodeStyle(onUpdate)).not.toHaveProperty("label");
    });

    it("writes the edge label branch in ELEMENT shape too", async () => {
        const onEdgeUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={labelledLayer} onEdgeUpdate={onEdgeUpdate} />);

        const labelEditor = within(await openRichText("Edge", "Label"));
        const textInput = labelEditor.getByLabelText("Text");
        fireEvent.change(textInput, { target: { value: "knows" } });
        fireEvent.blur(textInput);

        expect(lastNodeStyle(onEdgeUpdate).label).toEqual({
            ...ELEMENT_LABEL,
            text: "knows",
            fontWeight: "400",
        });
    });
});

describe("StyleLayerPropertiesPanel writing the non-text branches in ELEMENT shape", () => {
    /**
     * A layer carrying BOTH shapes of colour, which is the state the old panel left behind:
     * graphty-element's canonical `texture.color` beside the editor's own `color` object,
     * which `NodeStyle` does not declare at all.
     *
     * That extra key is not inert. graphty-element interns styles by deep value equality
     * (`Styles.styleToId`) and keys its mesh cache on the id it hands back, so a style
     * carrying `color` can never be value-equal to the canonical style for the same
     * colour: one look, two style ids, two meshes -- measured on a live graph as ids 15 and
     * 18. Every assertion below is about the written SHAPE for that reason.
     */
    const leakyLayer: LayerItem = {
        id: "layer-3",
        name: "Leaky Layer",
        styleLayer: {
            node: {
                selector: "",
                style: {
                    color: { mode: "solid", color: "#E11D48", opacity: 1 },
                    texture: { color: "#E11D48" },
                },
            },
            edge: {
                selector: "",
                style: {},
            },
        },
    };

    /**
     * The style the panel wrote on its most recent call.
     * @param spy - the spy passed as `onUpdate` or `onEdgeUpdate`.
     * @returns the style the panel wrote.
     */
    function writtenStyle(spy: Mock): Record<string, unknown> {
        expect(spy).toHaveBeenCalled();

        const lastCall = spy.mock.calls[spy.mock.calls.length - 1] as [string, { style?: unknown }];

        return (lastCall[1].style ?? {}) as Record<string, unknown>;
    }

    /**
     * Edits the node colour to a hex value through the real control.
     * @param hex - the hex digits to type, without the leading "#".
     */
    function editNodeColor(hex: string): void {
        const input = nodeColorHex();
        fireEvent.change(input, { target: { value: hex } });
        fireEvent.blur(input);
    }

    it("writes texture and DROPS the editor's color key", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        editNodeColor("00FF00");

        const style = writtenStyle(onUpdate);

        expect(style.texture).toEqual({ color: "#00FF00" });
        expect(style).not.toHaveProperty("color");
    });

    it("writes a translucent colour in the element's advanced form, opacity in 0-1", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        const opacity = within(group("Color")).getByLabelText("Opacity");
        fireEvent.change(opacity, { target: { value: "50" } });
        fireEvent.blur(opacity);

        expect(writtenStyle(onUpdate).texture).toEqual({
            color: { colorType: "solid", value: "#E11D48", opacity: 0.5 },
        });
    });

    it("keeps the texture keys the colour branch does not own", () => {
        const onUpdate = vi.fn();
        const withImage: LayerItem = {
            ...leakyLayer,
            styleLayer: {
                ...leakyLayer.styleLayer,
                node: { selector: "", style: { texture: { color: "#E11D48", icon: "star" } } },
            },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={withImage} onUpdate={onUpdate} />);

        editNodeColor("00FF00");

        expect(writtenStyle(onUpdate).texture).toEqual({ color: "#00FF00", icon: "star" });
    });

    it("writes the element's shape name, not the editor's", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        await pick(group("Shape"), "Type", "Torus knot");

        expect(writtenStyle(onUpdate).shape).toEqual({ type: "torus-knot", size: 1 });
    });

    it("reads a layer saved with the editor's legacy torusKnot spelling as the element's", () => {
        /* The spelling is still normalised on the way IN, because a layer saved by an
           older build carries it and an unmapped value would reach `NodeMesh` as an
           unknown shape and draw nothing. It is no longer OFFERED: the picker's values are
           the element's own enum members. */
        const legacy: LayerItem = {
            ...leakyLayer,
            styleLayer: {
                ...leakyLayer.styleLayer,
                node: { selector: "", style: { shape: { type: "torusKnot", size: 1 } } },
            },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={legacy} onUpdate={vi.fn()} />);

        expect(within(group("Shape")).getByLabelText("Type")).toHaveValue("Torus knot");
    });

    it("writes effect, singular, with no enabled flag inside it", () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        fireEvent.click(within(group("Effects")).getByLabelText("Glow"));

        const style = writtenStyle(onUpdate);

        /* `effect`, not `effects`, and presence is the enabling: graphty-element's schema
           has no `enabled` field on glow, and it is strict, so one would fail the parse. */
        expect(style.effect).toEqual({ glow: { color: "#FFFFFF", strength: 0.5 } });
        expect(style).not.toHaveProperty("effects");
    });

    it("REMOVES the effect branch when the last effect is turned off", () => {
        const onUpdate = vi.fn();
        const wireframed: LayerItem = {
            ...leakyLayer,
            styleLayer: {
                ...leakyLayer.styleLayer,
                node: { selector: "", style: { texture: { color: "#E11D48" }, effect: { wireframe: true } } },
            },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={wireframed} onUpdate={onUpdate} />);

        fireEvent.click(within(group("Effects")).getByLabelText("Wireframe"));

        const style = writtenStyle(onUpdate);

        /* Absent, never `effect: undefined`: `isEqual` treats a present undefined key as a
           style distinct from one without the key, so writing it would mint an id and a
           mesh for a node that looks exactly like a plain one. */
        expect(style).not.toHaveProperty("effect");
        expect(Object.keys(style)).not.toContain("effect");
        expect(style.texture).toEqual({ color: "#E11D48" });
    });

    it("writes edge line opacity in the element's 0-1 scale", async () => {
        const onEdgeUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onEdgeUpdate={onEdgeUpdate} />);

        await pick(group("Line"), "Type", "Dash");

        /* The editor carries 100; graphty-element's schema bounds opacity at 1, so an
           unconverted 100 fails the parse and takes the whole edge style with it. */
        expect(writtenStyle(onEdgeUpdate).line).toEqual({
            type: "dash",
            width: 8,
            color: "#A9A9A9",
            opacity: 1,
        });
    });

    it("writes arrow opacity in the element's 0-1 scale", async () => {
        const onEdgeUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onEdgeUpdate={onEdgeUpdate} />);

        await pick(group("Arrow head"), "Type", "Vee");

        expect(writtenStyle(onEdgeUpdate).arrowHead).toEqual({
            type: "vee",
            size: 1,
            color: "#A9A9A9",
            opacity: 1,
        });
    });

    it("WRITES an arrow branch set to none, so the reader can turn arrows off", async () => {
        const onEdgeUpdate = vi.fn();
        const arrowed: LayerItem = {
            ...leakyLayer,
            styleLayer: {
                ...leakyLayer.styleLayer,
                edge: {
                    selector: "",
                    style: { arrowHead: { type: "normal", size: 1, color: "#A9A9A9", opacity: 1 } },
                },
            },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={arrowed} onEdgeUpdate={onEdgeUpdate} />);

        await pick(group("Arrow head"), "Type", "None");

        const style = writtenStyle(onEdgeUpdate);

        /* An absent arrowHead and `{type: "none"}` look identical on a lone layer, and
           omitting the branch does save an interned style -- but graphty-element merges
           matching layers with `defaultsDeep`, so an ABSENT arrow lets a LOWER layer's
           arrow through. A reader who picks "none" over a layer that draws arrows must
           stop seeing arrows (2026-09-13). */
        expect(style).toHaveProperty("arrowHead");
        expect((style as { arrowHead?: { type?: string } }).arrowHead?.type).toBe("none");
    });

    it("makes a colour typed over an editor-shaped layer match one typed over a canonical layer", () => {
        /* The claim the performance work rests on: a layer the old panel left carrying
           `color` and a layer written canonically must converge on ONE style once both are
           edited, or the two can never share a mesh again however identical they look. */
        const overLeaky = vi.fn();
        const { unmount } = renderPanel(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={overLeaky} />);
        editNodeColor("16A34A");
        unmount();

        const canonicalLayer: LayerItem = {
            ...leakyLayer,
            styleLayer: {
                ...leakyLayer.styleLayer,
                node: { selector: "", style: { texture: { color: "#6366F1" } } },
            },
        };
        const overCanonical = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={canonicalLayer} onUpdate={overCanonical} />);
        editNodeColor("16A34A");

        expect(writtenStyle(overLeaky)).toEqual(writtenStyle(overCanonical));
        expect(writtenStyle(overLeaky)).toEqual({ texture: { color: "#16A34A" } });
    });
});

describe("StyleLayerPropertiesPanel and the calculated-style blind spot", () => {
    /**
     * The shell's own labelling layer, built by the code the shell ships.
     *
     * Built from `topDegreeLabelLayer` rather than hand-written, so this board cannot pass
     * against a fixture that has drifted from the layer the reader actually meets.
     * @returns the layer, in the shape the layers list hands the inspector.
     */
    function topDegreeLayer(): LayerItem {
        const descriptor = topDegreeLabelLayer({ degreeThreshold: 3 });

        return {
            id: "layer-top-degree",
            name: "Top degree labels",
            styleLayer: {
                node: {
                    selector: descriptor.node.selector,
                    style: { ...descriptor.node.style },
                    calculatedStyle: { ...descriptor.node.calculatedStyle },
                },
            },
        };
    }

    it("shows a Computed section naming the channel and the source", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        const computed = group("Computed");
        expect(within(computed).getByText("This layer draws a label on every node whose degree is 3 or more.")).toBeInTheDocument();
        expect(within(computed).getByText("Channel")).toBeInTheDocument();
        expect(within(computed).getByText("Node label")).toBeInTheDocument();
        expect(within(computed).getByText("From")).toBeInTheDocument();
        expect(within(computed).getByText("degree")).toBeInTheDocument();
    });

    it("shows the Top degree labels layer's Label row as ON, not unchecked", () => {
        /* The product owner's report, asserted directly: "the 'top degree label' doesn't
           show the 'label' as 'enabled'". The panel read only the static half, where this
           layer sets nothing at all, so the one thing the layer does was drawn as off. */
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        const toggle = within(group("Node")).getByRole("checkbox", { name: "Label" });

        expect(toggle).toBeChecked();
    });

    it("disables the calculated channel's control and states its reason", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        const toggle = within(group("Node")).getByRole("checkbox", { name: "Label" });

        expect(toggle).toBeDisabled();
        expect(toggle).toHaveAccessibleDescription(
            expect.stringContaining("Computed from degree. Convert it to a fixed value to edit it") as unknown as string,
        );
    });

    it("marks the calculated channel bound", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        expect(within(group("Node")).getByTestId("toggle-row-bound")).toBeInTheDocument();
    });

    it("keeps the raw expression behind a collapsed Expression sub-group", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        const computed = group("Computed");

        /* The sub-group's own control is there, so the expression is REACHABLE, and it is
           CLOSED, because `expr` is a JavaScript string and putting it in front of a
           reader as an explanation explains nothing. */
        const disclosure = within(computed).getByRole("button", { name: /Expression/ });

        expect(disclosure).toBeInTheDocument();
        expect(disclosure).toHaveAttribute("aria-expanded", "false");
    });

    it("shows the raw output and expression once the sub-group is opened", async () => {
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} />);

        const user = userEvent.setup();
        const computed = group("Computed");
        await user.click(within(computed).getByRole("button", { name: /Expression/ }));

        expect(await within(computed).findByText("style.label.enabled")).toBeInTheDocument();
        expect(within(computed).getByText(/arguments\[0\] >= 3/)).toBeInTheDocument();
    });

    it("asks before converting, because the expression cannot be brought back", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} onUpdate={onUpdate} />);

        const user = userEvent.setup();
        await user.click(within(group("Computed")).getByText("Convert to a fixed value"));

        /* No history entry is written on the onUpdate path, so a single click would
           destroy the rule with no way back. The consequence is stated before the second
           click, including the one a reader could not guess: the layer stops being one the
           next load may replace. */
        expect(onUpdate).not.toHaveBeenCalled();
        expect(within(group("Computed")).getByText(/cannot be brought back/)).toBeInTheDocument();
        expect(within(group("Computed")).getByText(/no longer be replaced when the graph is reloaded/)).toBeInTheDocument();
    });

    it("converts to a fixed value with the rule dropped and the channel written statically", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} onUpdate={onUpdate} />);

        const user = userEvent.setup();
        await user.click(within(group("Computed")).getByText("Convert to a fixed value"));
        await user.click(within(group("Computed")).getByText("Yes, convert to a fixed value"));

        expect(onUpdate).toHaveBeenCalledWith("layer-top-degree", {
            selector: "",
            calculatedStyle: undefined,
            style: { label: { enabled: true } },
        });
    });

    it("cancels without writing anything", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={topDegreeLayer()} onUpdate={onUpdate} />);

        const user = userEvent.setup();
        await user.click(within(group("Computed")).getByText("Convert to a fixed value"));
        await user.click(within(group("Computed")).getByText("Cancel"));

        expect(onUpdate).not.toHaveBeenCalled();
        expect(within(group("Computed")).getByText("Convert to a fixed value")).toBeInTheDocument();
    });

    it("REPORTS an output path it has no row for rather than dropping it", () => {
        /* The blind spot repeating itself for the next algorithm to write a new path is
           the failure mode this section exists to prevent. */
        const unmapped: LayerItem = {
            id: "layer-opacity",
            name: "Fade by degree",
            styleLayer: {
                node: {
                    selector: "",
                    style: {},
                    calculatedStyle: { inputs: [DEGREE_INPUT_PATH], output: "style.opacity", expr: "arguments[0] / 10" },
                },
            },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={unmapped} />);

        const computed = group("Computed");
        expect(
            within(computed).getByText("This layer computes style.opacity for every node from its degree."),
        ).toBeInTheDocument();
        expect(within(computed).getAllByText("style.opacity").length).toBeGreaterThan(0);
    });

    it("draws no Computed section for a layer that computes nothing", () => {
        const plain: LayerItem = {
            id: "plain",
            name: "Plain",
            styleLayer: { node: { selector: "", style: { texture: { color: "#E11D48" } } } },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={plain} />);

        expect(screen.queryByRole("group", { name: "Computed" })).not.toBeInTheDocument();
    });
});

describe("StyleLayerPropertiesPanel draws unset channels as unset", () => {
    /** A layer that sets NOTHING on either half -- the shape most algorithm layers take. */
    const bare: LayerItem = {
        id: "bare",
        name: "Bare",
        styleLayer: { node: { selector: "", style: {} }, edge: { selector: "", style: {} } },
    };

    it("hands every unset channel to its control as a default, not as a value", () => {
        /* Every one of these used to be drawn in ordinary value ink as though the layer
           had chosen it: Icosphere at size 1, #6366F1, an 8-unit #A9A9A9 line. Those are
           DEFAULT_SHAPE, DEFAULT_COLOR and DEFAULT_EDGE_LINE byte for byte, and the
           product owner read them off a layer whose node style is `{}`.

           compact-mantine marks a control showing its default with
           `data-is-default="true"` and draws it in italic chrome ink, which is the
           difference the old raw Mantine inputs could not express. */
        renderPanel(<StyleLayerPropertiesPanel layer={bare} />);

        const defaulted = [
            within(group("Shape")).getByLabelText("Type"),
            within(group("Shape")).getByLabelText("Size"),
            within(group("Line")).getByLabelText("Type"),
            within(group("Line")).getByLabelText("Width"),
        ];

        for (const control of defaulted) {
            expect(control).toHaveAttribute("data-is-default", "true");
        }
    });

    it("offers no reset on a channel the layer never set", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={bare} />);

        expect(within(group("Shape")).queryByTestId("style-select-reset")).not.toBeInTheDocument();
        expect(within(group("Color")).queryByTestId("compact-color-input-reset")).not.toBeInTheDocument();
    });

    it("offers a reset once a channel IS set", () => {
        const shaped: LayerItem = {
            ...bare,
            styleLayer: { ...bare.styleLayer, node: { selector: "", style: { shape: { type: "box" } } } },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={shaped} />);

        expect(within(group("Shape")).getByTestId("style-select-reset")).toBeInTheDocument();
    });

    it("writes a reset by REMOVING the branch, never as a present undefined key", async () => {
        /* The trap the compact controls introduce: they report `undefined` on reset, and
           writing `{shape: {type: undefined}}` would mint a style graphty-element interns
           separately from one with no shape at all. */
        const onUpdate = vi.fn();
        const shaped: LayerItem = {
            ...bare,
            styleLayer: { ...bare.styleLayer, node: { selector: "", style: { shape: { type: "box" } } } },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={shaped} onUpdate={onUpdate} />);

        const user = userEvent.setup();
        await user.click(within(group("Shape")).getByTestId("style-select-reset"));

        const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1] as [string, { style?: unknown }];
        expect(lastCall[1].style).toEqual({});
        expect(Object.keys(lastCall[1].style as object)).not.toContain("shape");
    });
});

describe("StyleLayerPropertiesPanel and a layer with only one half", () => {
    const nodeOnly: LayerItem = {
        id: "node-only",
        name: "Node only",
        styleLayer: { node: { selector: "", style: {} } },
    };

    it("draws an EMPTY Edge section with an add control and no edge fields", () => {
        renderPanel(<StyleLayerPropertiesPanel layer={nodeOnly} />);

        expect(group("Edge")).toBeInTheDocument();
        expect(screen.queryByLabelText("Edge Selector")).not.toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "Line" })).not.toBeInTheDocument();
        expect(within(group("Edge")).getByRole("button", { name: /Add/ })).toBeInTheDocument();
    });

    it("creates the edge half ONLY from that add control", async () => {
        const onEdgeUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={nodeOnly} onEdgeUpdate={onEdgeUpdate} />);

        const user = userEvent.setup();
        await user.click(within(group("Edge")).getByRole("button", { name: /Add/ }));

        expect(onEdgeUpdate).toHaveBeenCalledWith("node-only", { selector: "", style: {} });
    });

    it("draws an EMPTY Node section for an edge-only layer", () => {
        const edgeOnly: LayerItem = {
            id: "edge-only",
            name: "Edge only",
            styleLayer: { edge: { selector: "", style: {} } },
        };
        renderPanel(<StyleLayerPropertiesPanel layer={edgeOnly} />);

        expect(screen.queryByRole("group", { name: "Shape" })).not.toBeInTheDocument();
        expect(within(group("Node")).getByRole("button", { name: /Add/ })).toBeInTheDocument();
    });
});

describe("StyleLayerPropertiesPanel offers only shapes graphty-element can build", () => {
    const layer: LayerItem = {
        id: "shapes",
        name: "Shapes",
        styleLayer: { node: { selector: "", style: {} } },
    };

    it("does not offer Plane or Disc", async () => {
        /* "there is no 'plane' shape, and when selected a box shows up" -- the product
           owner. The option is gone, so the substitution that made the control lie has
           nothing left to fire on. */
        renderPanel(<StyleLayerPropertiesPanel layer={layer} />);

        const user = userEvent.setup();
        await user.click(within(group("Shape")).getByLabelText("Type"));
        await screen.findByRole("option", { name: "Box" });

        expect(screen.queryByRole("option", { name: "Plane" })).not.toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Disc" })).not.toBeInTheDocument();
    });

    it("offers the twelve polyhedra the picker used to hide", async () => {
        renderPanel(<StyleLayerPropertiesPanel layer={layer} />);

        const user = userEvent.setup();
        await user.click(within(group("Shape")).getByLabelText("Type"));

        expect(await screen.findByRole("option", { name: "Goldberg" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Rhombicuboctahedron" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Elongated pentagonal cupola" })).toBeInTheDocument();
    });

    it("writes Torus as a torus, not as a torus-knot", async () => {
        const onUpdate = vi.fn();
        renderPanel(<StyleLayerPropertiesPanel layer={layer} onUpdate={onUpdate} />);

        await pick(group("Shape"), "Type", "Torus");

        const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1] as [string, { style?: unknown }];
        expect((lastCall[1].style as { shape?: { type?: string } }).shape?.type).toBe("torus");
    });
});

describe("StyleLayerPropertiesPanel is built from compact-mantine and is inset like everything else", () => {
    const layer: LayerItem = {
        id: "inset",
        name: "Inset",
        styleLayer: { node: { selector: "", style: {} }, edge: { selector: "", style: {} } },
    };

    it("insets every section header by PANEL_GRID.PAD_LEFT", () => {
        /* The product owner's first report: "there is no left margin on the style
           inspector tab". The panel drew its own unpadded Box and its own unpadded
           ControlSection fork while the Source section directly above it -- drawn with the
           library component -- was inset 16px, so the inconsistency was visible inside one
           surface. */
        renderPanel(<StyleLayerPropertiesPanel layer={layer} />);

        const headers = screen.getAllByTestId("control-section-header");
        expect(headers.length).toBeGreaterThan(0);

        for (const header of headers) {
            expect(window.getComputedStyle(header).paddingInlineStart).toBe(`${String(PANEL_GRID.PAD_LEFT)}px`);
        }
    });

    it("draws every section with the library's ControlSection", () => {
        /* The greppable form of 6.17 check 1 for this surface: no local fork, no bespoke
           Box-with-a-Text standing in for a section. */
        renderPanel(<StyleLayerPropertiesPanel layer={layer} />);

        const sections = screen.getAllByTestId("control-section");
        const names = sections.map((section) => within(section).getAllByTestId("control-section-name")[0].textContent);

        expect(names).toEqual(["Which nodes", "Node", "Edge"]);
    });
});
