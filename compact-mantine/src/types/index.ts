import type { ReactNode } from "react";

/**
 * Props for the ControlSection component.
 */
export interface ControlSectionProps {
    /** Section label displayed in header */
    label: string;
    /** Whether section is expanded by default */
    defaultOpen?: boolean;
    /** Visual indicator that child values differ from defaults */
    hasConfiguredValues?: boolean;
    /** Section content */
    children: ReactNode;
}

/**
 * Props for the ControlSubGroup component.
 */
export interface ControlSubGroupProps {
    /** Group label */
    label: string;
    /** Whether group is expanded by default */
    defaultOpen?: boolean;
    /** Group content */
    children: ReactNode;
}

/**
 * Props for the ControlGroup component.
 */
export interface ControlGroupProps {
    /** Group label */
    label: string;
    /** Optional action buttons to display in the header */
    actions?: ReactNode;
    /** Group content */
    children: ReactNode;
    /**
     * When true, the separator line extends beyond the component boundaries
     * to reach the edges of the parent container (useful inside Popouts with padding).
     * Uses negative margins to counteract the parent's padding.
     */
    bleed?: boolean;
}

/**
 * Props for StyleNumberInput component.
 * Supports both controlled and uncontrolled modes via useUncontrolled pattern.
 */
export interface StyleNumberInputProps {
    /** Label for the input (also used for aria-label) */
    label: string;
    /** Current value - undefined means using default (controlled mode) */
    value?: number | undefined;
    /** Default value to show when value is undefined */
    defaultValue: number;
    /** Called when value changes (optional for uncontrolled mode) */
    onChange?: (value: number | undefined) => void;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Number of decimal places */
    decimalScale?: number;
    /** Suffix to display (e.g., "%") */
    suffix?: string;
    /** Whether to hide the spinner controls */
    hideControls?: boolean;
}


/**
 * Option type for StyleSelect component.
 */
export interface StyleSelectOption {
    value: string;
    label: string;
}

/**
 * Props for StyleSelect component.
 * Supports both controlled and uncontrolled modes via useUncontrolled pattern.
 */
export interface StyleSelectProps {
    /** Label for the select (also used for aria-label) */
    label: string;
    /** Current value - undefined means using default (controlled mode) */
    value?: string | undefined;
    /** Default value to show when value is undefined */
    defaultValue: string;
    /** Available options */
    options: StyleSelectOption[];
    /** Called when value changes (optional for uncontrolled mode) */
    onChange?: (value: string | undefined) => void;
}

/**
 * Props for compact color input with optional opacity support.
 * Supports both controlled and uncontrolled modes via useUncontrolled pattern.
 * When color/opacity is undefined, shows the default value with muted styling and a reset button.
 */
export interface CompactColorInputProps {
    /** Hex color value - undefined means using defaultColor (controlled mode) */
    color?: string | undefined;
    /** Default color shown when color is undefined */
    defaultColor: string;
    /** Opacity value 0-100 - undefined means using defaultOpacity (controlled mode) */
    opacity?: number | undefined;
    /** Default opacity shown when opacity is undefined */
    defaultOpacity?: number;
    /** Called when color changes - receives undefined when reset (optional for uncontrolled mode) */
    onColorChange?: (color: string | undefined) => void;
    /** Called when opacity changes - receives undefined when reset (optional for uncontrolled mode) */
    onOpacityChange?: (opacity: number | undefined) => void;
    /** Optional label displayed above the input */
    label?: string;
    /** Control visibility of opacity input (defaults to true) */
    showOpacity?: boolean;
}

/**
 * Props for ToggleWithContent component.
 * Supports both controlled and uncontrolled modes via useUncontrolled pattern.
 */
export interface ToggleWithContentProps {
    /** Checkbox label */
    label: string;
    /** Whether toggle is enabled (controlled mode) */
    checked?: boolean;
    /** Default checked state for uncontrolled mode */
    defaultChecked?: boolean;
    /** Called when checked state changes (optional for uncontrolled mode) */
    onChange?: (checked: boolean) => void;
    /** Content shown when checked */
    children: ReactNode;
}

/**
 * Gradient color stop.
 */
export interface ColorStop {
    /** Unique identifier for stable React keys */
    id: string;
    /** Stop position (0-1) */
    offset: number;
    /** Stop color in hex format */
    color: string;
}

/**
 * Props for GradientEditor component.
 * Supports both controlled and uncontrolled modes via useUncontrolled pattern.
 */
export interface GradientEditorProps {
    /** Gradient color stops (controlled mode) */
    stops?: ColorStop[];
    /** Default stops for uncontrolled mode */
    defaultStops?: ColorStop[];
    /** Gradient direction in degrees (controlled mode) */
    direction?: number;
    /** Default direction for uncontrolled mode */
    defaultDirection?: number;
    /** Whether to show direction control */
    showDirection?: boolean;
    /** Called when stops or direction change (optional for uncontrolled mode) */
    onChange?: (stops: ColorStop[], direction?: number) => void;
}

/**
 * Props for StatRow component.
 */
export interface StatRowProps {
    /** Label text */
    label: string;
    /** Value to display */
    value: string | number;
}

// Re-export popout types
export type {
    PopoutContentProps,
    PopoutContextValue,
    PopoutHeaderConfig,
    PopoutHeaderProps,
    PopoutManagerContextValue,
    PopoutPanelProps,
    PopoutPosition,
    PopoutTriggerProps,
} from "./popout";
