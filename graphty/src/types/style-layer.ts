/**
 * Color stop for gradient configurations.
 */
export interface ColorStop {
    offset: number;
    color: string;
}

/**
 * Solid color configuration.
 */
export interface SolidColorConfig {
    mode: "solid";
    color: string;
    opacity: number;
}

/**
 * Linear gradient color configuration.
 */
export interface GradientColorConfig {
    mode: "gradient";
    stops: ColorStop[];
    direction: number;
    opacity: number;
}

/**
 * Radial gradient color configuration.
 */
export interface RadialColorConfig {
    mode: "radial";
    stops: ColorStop[];
    opacity: number;
}

/**
 * Union type for all color configurations.
 */
export type ColorConfig = SolidColorConfig | GradientColorConfig | RadialColorConfig;

/**
 * Node shape configuration.
 */
export interface ShapeConfig {
    type: string;
    size: number;
}

/**
 * Node style configuration with shape and color options.
 */
export interface NodeStyle {
    shape?: ShapeConfig;
    color?: ColorConfig;
    // Legacy support for simple color string
    texture?: {color?: string};
}

/**
 * Edge style configuration (placeholder for future phases).
 */
export type EdgeStyle = Record<string, unknown>;

/**
 * Represents the state of a style layer with node and edge styling configurations.
 */
export interface StyleLayerState {
    id: string;
    name: string;
    node: {
        selector: string;
        style: NodeStyle;
    };
    edge: {
        selector: string;
        style: EdgeStyle;
    };
}
