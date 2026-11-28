import { createContext } from "react";

/**
 * Whether the menus inside draw no key on their rows and name it in a tooltip instead (shown on hover and on
 * keyboard focus). The join and Filters workspaces set it at the owner's request (#10394); every other menu
 * draws its keys (design/ui/framework/principles.md, "Every shortcut is on a visible control").
 */
export const KeysInTooltips = createContext(false);
