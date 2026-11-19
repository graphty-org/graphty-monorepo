/**
 * Whether the data value picker lists names only (Style panel v2, issue #8739: no captions or
 * counts in the panel's lists): its rows drop their facts ("1 to 34"). Today's panel lists them.
 */

import { createContext } from "react";

export const PickerNamesOnly = createContext(false);
