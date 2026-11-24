/**
 * Whether a line is drawn in a pop-over's Advanced view (design/ui/style-panel-v2/design.md, "Input rules"), which
 * drills into the pop-over in place: its rare lines draw no link or settings button, so binding one to data starts
 * from a line the reader meets first. A list's line (R15) keeps its "+".
 */

import React from "react";

export const InAdvanced = React.createContext(false);
