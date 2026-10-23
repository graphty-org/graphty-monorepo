import { createContext } from "react";

/**
 * Whether the start page's graph starts turning (unless the reader asked for less motion). On by
 * default; Storybook holds it still, so every picture of the start page is the same picture.
 */
export const HeroTurns = createContext(true);
