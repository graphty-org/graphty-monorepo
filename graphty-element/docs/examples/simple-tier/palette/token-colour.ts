/**
 * The design-token recipe from the palette guide: read the token's value first, then define the
 * palette with it. `definePalette` refuses `var(--brand-navy)` itself.
 */
// #region example
import { definePalette } from "@graphty/graphty-element/extend";

const token = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

definePalette({ id: "acme-token-brand", kind: "categorical", colors: [token("--brand-navy"), token("--brand-teal")] });
// #endregion example
