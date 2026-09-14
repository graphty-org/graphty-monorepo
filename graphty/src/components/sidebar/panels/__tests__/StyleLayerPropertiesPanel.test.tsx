import { describe, expect, it, type Mock, vi } from "vitest";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import type { LayerItem } from "../../../layout/LeftSidebar";
import { StyleLayerPropertiesPanel } from "../StyleLayerPropertiesPanel";

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

    it("renders layer name in header", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByText(/Layer:.*Test Layer/)).toBeInTheDocument();
    });

    it("renders node selector input", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        expect(selectorInput).toBeInTheDocument();
        expect(selectorInput).toHaveValue("id == `1`");
    });

    it("renders node color input", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        // Color control now has swatch + hex input (multiple on page due to edge controls)
        const colorInputs = screen.getAllByLabelText("Color hex value");
        expect(colorInputs.length).toBeGreaterThan(0);
    });

    it("calls onUpdate when selector changes", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        fireEvent.change(selectorInput, { target: { value: "id == `2`" } });
        fireEvent.blur(selectorInput);

        expect(onUpdate).toHaveBeenCalledWith(mockLayer.id, {
            selector: "id == `2`",
            style: { color: "#ff0000" },
        });
    });

    it("calls onUpdate when color changes (on blur)", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        // First color hex input is for node color
        const colorInputs = screen.getAllByLabelText("Color hex value");
        fireEvent.change(colorInputs[0], { target: { value: "00FF00" } });
        fireEvent.blur(colorInputs[0]);

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
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByLabelText("Shape Type")).toBeInTheDocument();
        expect(screen.getByLabelText("Size")).toBeInTheDocument();
    });

    it("calls onUpdate when shape changes", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const shapeSelect = screen.getByLabelText("Shape Type");
        fireEvent.change(shapeSelect, { target: { value: "box" } });

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

    it("renders color mode options", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByRole("radio", { name: "Solid" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Gradient" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Radial" })).toBeInTheDocument();
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

    it("leaves the label exactly as the element had it when the colour is edited", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const colorInputs = screen.getAllByLabelText("Color hex value");
        fireEvent.change(colorInputs[0], { target: { value: "00FF00" } });
        fireEvent.blur(colorInputs[0]);

        const style = lastNodeStyle(onUpdate);

        // Identical, key for key -- including `fontWeight: "normal"`, which has no number
        // for the editor's weight field to hold and so cannot survive a round trip.
        expect(style.label).toEqual(ELEMENT_LABEL);
        expect(style.tooltip).toEqual(ELEMENT_TOOLTIP);
        expect(typeof (style.label as { font?: unknown }).font).toBe("string");
        expect(style.texture).toEqual({ color: "#00FF00" });
    });

    it("carries the branches it does not own through a shape edit", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        fireEvent.change(screen.getByLabelText("Shape Type"), { target: { value: "box" } });

        const style = lastNodeStyle(onUpdate);

        expect(style.label).toEqual(ELEMENT_LABEL);
        expect(style.effect).toEqual({ wireframe: true });
        expect(style.shape).toEqual({ type: "box", size: 1.0 });
    });

    it("writes the label branch in ELEMENT shape when the label itself is edited", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const labelEditor = within(screen.getByTestId("rich-text-editor-Node Label"));
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

    it("removes the label branch rather than writing a broken one when the label is turned off", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={labelledLayer} onUpdate={onUpdate} />);

        const labelEditor = within(screen.getByTestId("rich-text-editor-Node Label"));
        fireEvent.click(labelEditor.getByLabelText("Enabled"));

        const style = lastNodeStyle(onUpdate);

        /* Absent, not present-and-disabled: graphty-element merges matching layers with
           `defaultsDeep`, where the two are different facts. */
        expect(style).not.toHaveProperty("label");
        expect(style.tooltip).toEqual(ELEMENT_TOOLTIP);
        expect(style.effect).toEqual({ wireframe: true });
    });

    it("writes the edge label branch in ELEMENT shape too", () => {
        const onEdgeUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={labelledLayer} onEdgeUpdate={onEdgeUpdate} />);

        const labelEditor = within(screen.getByTestId("rich-text-editor-Edge Label"));
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
        const colorInputs = screen.getAllByLabelText("Color hex value");
        fireEvent.change(colorInputs[0], { target: { value: hex } });
        fireEvent.blur(colorInputs[0]);
    }

    it("writes texture and DROPS the editor's color key", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        editNodeColor("00FF00");

        const style = writtenStyle(onUpdate);

        expect(style.texture).toEqual({ color: "#00FF00" });
        expect(style).not.toHaveProperty("color");
    });

    it("writes a translucent colour in the element's advanced form, opacity in 0-1", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        const opacityInputs = screen.getAllByLabelText("Opacity");
        fireEvent.change(opacityInputs[0], { target: { value: "50" } });
        fireEvent.blur(opacityInputs[0]);

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
        render(<StyleLayerPropertiesPanel layer={withImage} onUpdate={onUpdate} />);

        editNodeColor("00FF00");

        expect(writtenStyle(onUpdate).texture).toEqual({ color: "#00FF00", icon: "star" });
    });

    it("writes the element's shape name, not the editor's", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        // "torusKnot" is the editor's spelling; the element's enum says "torus-knot".
        fireEvent.change(screen.getByLabelText("Shape Type"), { target: { value: "torusKnot" } });

        expect(writtenStyle(onUpdate).shape).toEqual({ type: "torus-knot", size: 1 });
    });

    it("writes a shape the element cannot build as the fallback it CAN build", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        // "disc" is not in graphty-element's NodeShapes enum at all.
        fireEvent.change(screen.getByLabelText("Shape Type"), { target: { value: "disc" } });

        expect(writtenStyle(onUpdate).shape).toEqual({ type: "geodesic", size: 1 });
    });

    it("writes effect, singular, with no enabled flag inside it", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={onUpdate} />);

        fireEvent.click(screen.getByLabelText("Glow"));

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
        render(<StyleLayerPropertiesPanel layer={wireframed} onUpdate={onUpdate} />);

        fireEvent.click(screen.getByLabelText("Wireframe"));

        const style = writtenStyle(onUpdate);

        /* Absent, never `effect: undefined`: `isEqual` treats a present undefined key as a
           style distinct from one without the key, so writing it would mint an id and a
           mesh for a node that looks exactly like a plain one. */
        expect(style).not.toHaveProperty("effect");
        expect(Object.keys(style)).not.toContain("effect");
        expect(style.texture).toEqual({ color: "#E11D48" });
    });

    it("writes edge line opacity in the element's 0-1 scale", () => {
        const onEdgeUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onEdgeUpdate={onEdgeUpdate} />);

        fireEvent.change(screen.getByLabelText("Line Type"), { target: { value: "dash" } });

        /* The editor carries 100; graphty-element's schema bounds opacity at 1, so an
           unconverted 100 fails the parse and takes the whole edge style with it. */
        expect(writtenStyle(onEdgeUpdate).line).toEqual({
            type: "dash",
            width: 8,
            color: "#A9A9A9",
            opacity: 1,
        });
    });

    it("writes arrow opacity in the element's 0-1 scale", () => {
        const onEdgeUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onEdgeUpdate={onEdgeUpdate} />);

        fireEvent.change(screen.getByLabelText("Arrow Head Type"), { target: { value: "vee" } });

        expect(writtenStyle(onEdgeUpdate).arrowHead).toEqual({
            type: "vee",
            size: 1,
            color: "#A9A9A9",
            opacity: 1,
        });
    });

    it("WRITES an arrow branch set to none, so the reader can turn arrows off", () => {
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
        render(<StyleLayerPropertiesPanel layer={arrowed} onEdgeUpdate={onEdgeUpdate} />);

        fireEvent.change(screen.getByLabelText("Arrow Head Type"), { target: { value: "none" } });

        const style = writtenStyle(onEdgeUpdate);

        /* An absent arrowHead and `{type: "none"}` look identical on a lone layer, and
           omitting the branch does save an interned style -- but graphty-element merges
           matching layers with `defaultsDeep`, so an ABSENT arrow lets a LOWER layer's
           arrow through. A reader who picks "none" over a layer that draws arrows must
           stop seeing arrows (2026-09-13). */
        expect(style).toHaveProperty("arrowHead");
        expect((style as { arrowHead?: { type?: string } }).arrowHead?.type).toBe("none");
    });

    it("makes two different edits that mean the same look write DEEP-EQUAL styles", () => {
        /* This is the assertion the performance work rests on. graphty-element shares a
           NodeStyleId -- and therefore a cached mesh -- only between styles that are deep
           equal. "torus" and "torusKnot" are two rows in the editor's shape menu and ONE
           mesh in the element, so the two edits must be indistinguishable by the time they
           reach the layer. Written unconverted they differ by their `type` string, and the
           graph pays a style id and a mesh for each. */
        const viaTorus = vi.fn();
        const { unmount } = render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={viaTorus} />);
        fireEvent.change(screen.getByLabelText("Shape Type"), { target: { value: "torus" } });
        unmount();

        const viaTorusKnot = vi.fn();
        render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={viaTorusKnot} />);
        fireEvent.change(screen.getByLabelText("Shape Type"), { target: { value: "torusKnot" } });

        expect(writtenStyle(viaTorus)).toEqual(writtenStyle(viaTorusKnot));
    });

    it("makes a colour typed over an editor-shaped layer match one typed over a canonical layer", () => {
        /* The same claim for the colour leak, which is the one the baseline measured: a
           layer the old panel left carrying `color` and a layer written canonically must
           converge on ONE style once both are edited, or the two can never share a mesh
           again however identical they look. */
        const overLeaky = vi.fn();
        const { unmount } = render(<StyleLayerPropertiesPanel layer={leakyLayer} onUpdate={overLeaky} />);
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
        render(<StyleLayerPropertiesPanel layer={canonicalLayer} onUpdate={overCanonical} />);
        editNodeColor("16A34A");

        expect(writtenStyle(overLeaky)).toEqual(writtenStyle(overCanonical));
        expect(writtenStyle(overLeaky)).toEqual({ texture: { color: "#16A34A" } });
    });
});
