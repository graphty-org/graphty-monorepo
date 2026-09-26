import { ColorPicker, ColorSwatch, type MantineThemeComponent } from "@mantine/core";

/**
 * The colour package's Mantine theme extensions (design/figma-spec.md section 7). The CSS the
 * class names below point at is src/theme/css/color.css.ts.
 *
 * Mantine resolves HueSlider's and AlphaSlider's styles under the ColorPicker name, so the
 * ColorPicker extension's classNames style every colour slider, standalone or inside a picker.
 * The two slider extensions carry the same class names as default props so that a consumer who
 * replaces the ColorPicker extension still gets themed sliders.
 */
const SLIDER_CLASS_NAMES = {
    slider: "cm-color-slider",
    sliderOverlay: "cm-color-slider-track",
    thumb: "cm-color-thumb",
};

/**
 * ColorSwatch sizes: the picker chit (16px, radius 20%) by default and the in-field chit
 * (`variant="field"`, 14px, radius 2). An explicit `size` or `radius` prop still wins.
 * @param props - the swatch's props
 * @param props.variant - `field` for the in-field chit
 * @param props.size - an explicit size
 * @param props.radius - an explicit radius
 * @returns the root CSS variables
 */
function swatchVars(props: { variant?: string; size?: unknown; radius?: unknown }): Record<string, string> {
    const field = props.variant === "field";
    const vars: Record<string, string> = {};
    if (field || props.size === undefined) {
        vars["--cs-size"] = field ? "14px" : "16px";
    }
    if (field || props.radius === undefined) {
        vars["--cs-radius"] = field ? "2px" : "20%";
    }
    return vars;
}

/** Theme extensions for the colour components. */
export const colorComponentExtensions = {
    ColorSwatch: ColorSwatch.extend({
        classNames: {
            root: "cm-chit",
            alphaOverlay: "cm-chit-alpha",
            shadowOverlay: "cm-chit-shadow",
        },
        vars: (_theme, props) => ({ root: swatchVars(props) }),
    }),

    ColorPicker: ColorPicker.extend({
        classNames: {
            ...SLIDER_CLASS_NAMES,
            saturation: "cm-color-mantine-saturation",
            saturationOverlay: "cm-color-saturation-overlay",
        },
    }),

    // HueSlider and AlphaSlider are plain forwardRef components (no `.extend`); useProps still
    // reads their defaultProps from the theme by name.
    HueSlider: { defaultProps: { classNames: SLIDER_CLASS_NAMES } } satisfies MantineThemeComponent,

    AlphaSlider: { defaultProps: { classNames: SLIDER_CLASS_NAMES } } satisfies MantineThemeComponent,
};
