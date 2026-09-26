import { Anchor, Burger, NavLink, Pagination, Stepper, Tabs } from "@mantine/core";

import { activateTabOnMouseDown, forgetActivation, swallowActivatedClick } from "../../components/selection/pointer-down";
import { renderTabRoot } from "../../components/selection/tab-root";
import {
    ANCHOR_CLASSES,
    BURGER_CLASSES,
    compactBurgerScale,
    compactPaginationScale,
    compactStepperScale,
    NAVLINK_CLASSES,
    PAGINATION_CLASSES,
    STEPPER_CLASSES,
    TABS_CLASSES,
} from "../styles/navigation";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Tabs.Tab's default props: mouse-down activation (../../components/selection/pointer-down.ts)
 * and the bold-width label reserve (../../components/selection/tab-root.tsx). Tabs.Tab hands
 * unknown props to its button's Box, which renders through `renderRoot`; Mantine types
 * `renderRoot` on polymorphic components only, so this object is declared apart from the
 * extension instead of being cast.
 */
const TAB_DEFAULT_PROPS = {
    onMouseDown: activateTabOnMouseDown,
    onClickCapture: swallowActivatedClick,
    onMouseLeave: forgetActivation,
    onKeyDown: forgetActivation,
    renderRoot: renderTabRoot,
};

/**
 * Theme extensions for the navigation components (design/figma-spec.md 4.2, 5.1, 5.9).
 *
 * - Anchor: Figma's link, 11/16 brand text with no underline; `variant="secondary"` is the gray
 *   "Drafts" link. The pressed pill and the focus ring are the stylesheet's.
 * - Tabs: Figma's pill tabs are the DEFAULT (`variant="pills"`); `variant="default"` still draws
 *   Mantine's underline tabs. A tab activates on mouse-down as well as on click and on the arrow
 *   keys (Mantine's automatic activation, which the theme keeps on), and its label reserves the
 *   width of its bold form so selecting never shifts the row. Those two live on `TabsTab`, the
 *   theme name Mantine reads `Tabs.Tab`'s default props from.
 * - NavLink, Pagination, Stepper, Burger: re-skinned on the tokens at their existing sizes.
 *
 * Sizes travel through `vars` resolvers that read `props.size` (see ../styles/size-scale.ts);
 * colors, states and focus rings through the `cm-*` classNames and ../css/selection.css.ts.
 */
export const navigationComponentExtensions = {
    Anchor: Anchor.extend({
        defaultProps: {
            size: "sm",
            underline: "never",
        },
        classNames: ANCHOR_CLASSES,
    }),

    Burger: Burger.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactBurgerScale, props?.size),
        }),
        classNames: BURGER_CLASSES,
    }),

    NavLink: NavLink.extend({
        classNames: NAVLINK_CLASSES,
    }),

    Pagination: Pagination.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactPaginationScale, props?.size),
        }),
        classNames: PAGINATION_CLASSES,
    }),

    Stepper: Stepper.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactStepperScale, props?.size),
        }),
        classNames: STEPPER_CLASSES,
    }),

    Tabs: Tabs.extend({
        defaultProps: {
            variant: "pills",
            // Figma's model: one Tab stop, the arrows move focus AND select, and wrap.
            activateTabWithKeyboard: true,
            loop: true,
        },
        classNames: TABS_CLASSES,
    }),

    TabsTab: Tabs.Tab.extend({
        defaultProps: TAB_DEFAULT_PROPS,
    }),
};
