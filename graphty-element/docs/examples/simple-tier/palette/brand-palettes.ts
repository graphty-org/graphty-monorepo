// #region example
import { definePalette } from "@graphty/graphty-element/extend";

definePalette({
    id: "acme-brand",
    kind: "categorical",
    colors: ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"],
});
definePalette({ id: "acme-brand-ramp", kind: "sequential", colors: ["#E8F1FA", "#1B7F79", "#0B1D51"] });
// #endregion example
