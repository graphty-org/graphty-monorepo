/**
 * What the field around a control takes, as its tooltip ("Character or icon" for a Glyph). A PanelField draws its
 * own tooltip, its name, over any its row sets, so the row hands its hint down; unset, the field keeps its name.
 */

import React from "react";

/** Provided by a Style row whose thing names what its control takes. */
export const FieldHint = React.createContext<string | undefined>(undefined);
