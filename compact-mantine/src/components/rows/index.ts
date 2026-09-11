/**
 * The ten row types a dense property panel is assembled from, plus the two
 * atoms they are built out of.
 *
 * The set is deliberately closed. Every row of a 280px panel is one of these
 * shapes, so that a reader learns ten layouts once and then recognises every
 * panel in the application; a row that fits none of them is either part of the
 * panel's own furniture -- a header, a footer, a search box -- or a shape that
 * should have been one of these.
 */

// Traceability: these are RT-1 through RT-10 of VOCAB section 11, and a row
// that fits none of them is a floor item or a design error. That numbering
// means nothing outside this repository, so it stays out of the doc comment
// above, which is compiled into dist/index.d.ts and the Storybook prop tables.

export { ActionRow } from "./ActionRow";
export { HistogramRow, MetricRow, SparklineRow } from "./ChartRow";
export { CompoundRow } from "./CompoundRow";
export { DataRow, DataRowHeader, RankChip } from "./DataRow";
export { FieldRow } from "./FieldRow";
export { IconGroupRow } from "./IconGroupRow";
export { PanelField } from "./PanelField";
export { ProseBlock } from "./ProseBlock";
export { RampRow } from "./RampRow";
export { ToggleRow, ToggleRowGroup } from "./ToggleRow";
export { AdvancedButton, TrailingSlot } from "./TrailingSlot";

// Prop and shape types
export type { ActionRowProps } from "./ActionRow";
export type { HistogramBin, HistogramRowProps, MetricRowProps, SparklineRowProps } from "./ChartRow";
export type { CompoundRowProps, CompoundSegment } from "./CompoundRow";
export type { DataRowHeaderProps, DataRowProps, RankChipProps } from "./DataRow";
export type { FieldRowProps } from "./FieldRow";
export type { IconGroupOption, IconGroupRowProps } from "./IconGroupRow";
export type { PanelFieldProps } from "./PanelField";
export type { ProseBlockProps } from "./ProseBlock";
export type { RampRowProps } from "./RampRow";
export type { ToggleRowGroupProps, ToggleRowProps } from "./ToggleRow";
export type { AdvancedButtonProps, TrailingSlotProps } from "./TrailingSlot";
