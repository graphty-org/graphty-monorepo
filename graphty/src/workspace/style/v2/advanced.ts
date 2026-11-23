/**
 * Whether a line is drawn in an Advanced dialog, the last pop-out level (design/ui/style-panel-v2/design.md,
 * "Input rules"): it draws no link or settings button, which would open a third. A list's line (R15) keeps its
 * "+", which opens nothing.
 */

import React from "react";

export const InAdvanced = React.createContext(false);
