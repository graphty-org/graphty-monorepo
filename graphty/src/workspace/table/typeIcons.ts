import { Calendar, CaseSensitive, Hash, type LucideIcon, Shapes, Tags, ToggleLeft } from "lucide-react";

/** The type icon for each of graphty-element's attribute types: the table headers and the server preview. */
export const TYPE_ICONS: Readonly<Record<string, LucideIcon>> = {
    string: CaseSensitive,
    number: Hash,
    integer: Hash,
    boolean: ToggleLeft,
    time: Calendar,
    category: Tags,
    mixed: Shapes,
};
