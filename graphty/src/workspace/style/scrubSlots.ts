/**
 * Whether number fields draw Figma's scrub slot (their name's initial at the left): on inside Style panel v2,
 * off everywhere else, so the panel it replaces looks as it did.
 */

import React from "react";

/** Provided true by Style panel v2. */
export const ScrubSlots = React.createContext(false);
