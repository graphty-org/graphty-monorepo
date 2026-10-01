// The palettes the screens paint with, in one place. OKABE_4 is the four
// Okabe-Ito colours the round-2 screens give a four-group Louvain result
// (orange, sky blue, bluish green, reddish purple; vermillion is kept for
// the override); TOL_MUTED is the element's "Nine Soft Colours"; VIRIDIS the
// ten-stop sequential ramp; TWELVE a twelve-colour categorical palette for
// College football's conferences (no shipped palette has twelve colours, so
// the mock invents one); HIGHLIGHT the disjoint highlight palette's first
// two colours (decision Y3).
export const OKABE_4 = ["#e69f00", "#56b4e9", "#009e73", "#cc79a7"];
export const OKABE_8 = ["#e69f00", "#56b4e9", "#009e73", "#0072b2", "#d55e00", "#cc79a7", "#000000", "#f0e442"];
export const TOL_MUTED = ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"];
export const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];
export const TWELVE = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac", "#1f77b4", "#2ca02c"];
export const HIGHLIGHT = { magenta: "#c51b7d", purple: "#7b3294" };
export const OVERRIDE = "#d55e00";
export const OTHER = "#b3b3b3";
