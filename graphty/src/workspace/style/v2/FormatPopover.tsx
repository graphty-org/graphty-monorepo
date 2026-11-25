/**
 * The Format pop-over (tmp/entries-first/spec.md 2.1): how one entry's value is written -- number, percent, money or
 * date, its decimals and notation, its sign, text before and after -- the sample in that format, and, last, what a
 * missing value does. graphty-element formats (`formatValue`, the facts' text); the panel writes the entry's format.
 */

import { PanelField } from "@graphty/compact-mantine";
import type { DataChannel, DataEntry, DataFormat } from "@graphty/graphty-element/catalog";
import React from "react";

import { pruned } from "./dataEntries";
import { CommitText, PopLine, Segments } from "./dataLines";

/** A format's parts the lines change, each optional so a line can take one off. */
type Format = { -readonly [K in keyof DataFormat]: DataFormat[K] };

/** What a missing value can do, per thing, with its words. */
const MISSING: Readonly<Record<DataChannel, readonly (readonly [string, string])[]>> = {
    "node.pieData": [
        ["skip", "Leave out"],
        ["gray", "Gray"],
    ],
    "node.stripeData": [
        ["skip", "Leave out"],
        ["gray", "Gray"],
    ],
    "node.chartData": [
        ["gap", "Gap"],
        ["zero", "Zero"],
        ["gray", "Gray"],
    ],
    "node.recordData": [
        ["drop", "Drop row"],
        ["text", "Text"],
    ],
};

/** Each thing's missing choice when the entry sets none. */
const MISSING_DEFAULT: Readonly<Record<DataChannel, string>> = {
    "node.pieData": "skip",
    "node.stripeData": "skip",
    "node.chartData": "gap",
    "node.recordData": "drop",
};

/**
 * The tab a format is.
 * @param format - the format.
 * @returns "number", "percent", "money" or "date".
 */
function tabOf(format: DataFormat | undefined): string {
    if (format?.date !== undefined) {
        return "date";
    }
    if (format?.style === "percent") {
        return "percent";
    }
    return format?.style === "currency" ? "money" : "number";
}

/**
 * The Format pop-over's last line: what a missing value does, and its words when a record writes text for it.
 * @param props - Component props
 * @param props.channel - the data channel
 * @param props.entry - the entry
 * @param props.put - writes the entry
 * @returns The line
 */
function MissingLine({
    channel,
    entry,
    put,
}: Readonly<{ channel: DataChannel; entry: DataEntry; put: (next: DataEntry) => void }>): React.JSX.Element {
    const { missing } = entry;
    const missingNow = typeof missing === "object" ? "text" : (missing ?? MISSING_DEFAULT[channel]);
    return (
        <PopLine line="format.missing" name="If missing" wide={missingNow === "text"}>
            <Segments
                label="If missing"
                value={missingNow}
                options={MISSING[channel]}
                onPick={(next) => {
                    if (next === "text") {
                        put({ ...entry, missing: { text: "-" } });
                        return;
                    }
                    put({ ...entry, missing: next === MISSING_DEFAULT[channel] ? undefined : (next as "skip") });
                }}
            />
            {typeof missing === "object" ? (
                <CommitText
                    label="Missing text"
                    value={missing.text}
                    unset="-"
                    onCommit={(words) => {
                        put({ ...entry, missing: { text: words === "" ? "-" : words } });
                    }}
                />
            ) : null}
        </PopLine>
    );
}

/**
 * The Format pop-over's lines: see the file header.
 * @param props - Component props
 * @param props.channel - the data channel
 * @param props.entry - the entry
 * @param props.numeric - whether its value is a number (a text value shows no strip and no number lines)
 * @param props.sample - the sample node's value in the entry's format
 * @param props.put - writes the entry
 * @returns The lines
 */
export function FormatLines({
    channel,
    entry,
    numeric,
    sample,
    put,
}: Readonly<{
    channel: DataChannel;
    entry: DataEntry;
    numeric: boolean;
    sample: string;
    put: (next: DataEntry) => void;
}>): React.JSX.Element {
    const { format } = entry;
    const tab = tabOf(format);
    const setFormat = (patch: Partial<Format>): void => {
        const next = pruned({ ...format, ...patch });
        put({ ...entry, format: Object.keys(next).length === 0 ? undefined : next });
    };
    const decimals = (
        <PanelField
            width="fill"
            label="Decimals"
            kind="select"
            value={format?.maximumFractionDigits === undefined ? "auto" : String(format.maximumFractionDigits)}
            data={[
                { value: "auto", label: "Auto" },
                ...[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) })),
            ]}
            onChange={(next) => {
                const n = next === "auto" ? undefined : Number(next);
                setFormat({ maximumFractionDigits: n, minimumFractionDigits: n });
            }}
        />
    );
    return (
        <>
            {numeric ? (
                <div data-strip="">
                    <PopLine line="format.kind" name={null}>
                        <Segments
                            label="Format kind"
                            value={tab}
                            options={[
                                ["number", "Number"],
                                ["percent", "Percent"],
                                ["money", "Money"],
                                ["date", "Date"],
                            ]}
                            onPick={(next) => {
                                const { prefix, suffix } = format ?? {};
                                const kept: Format = { prefix, suffix };
                                const by: Readonly<Record<string, Format>> = {
                                    number: kept,
                                    percent: { ...kept, style: "percent" },
                                    money: { ...kept, style: "currency", currency: "USD" },
                                    date: { ...kept, date: { style: "absolute" } },
                                };
                                setFormat({
                                    ...Object.fromEntries(Object.keys(format ?? {}).map((key) => [key, undefined])),
                                    ...by[next],
                                });
                            }}
                        />
                    </PopLine>
                </div>
            ) : null}
            {numeric && (tab === "number" || tab === "percent") ? (
                <PopLine line="format.digits" name="Decimals / Notation" wide first={64}>
                    {decimals}
                    <Segments
                        label="Notation"
                        value={format?.notation ?? "standard"}
                        options={[
                            ["standard", "Plain"],
                            ["compact", "Compact"],
                            ["scientific", "Sci"],
                        ]}
                        onPick={(next) => {
                            setFormat({
                                notation: next === "standard" ? undefined : (next as "compact" | "scientific"),
                            });
                        }}
                    />
                </PopLine>
            ) : null}
            {numeric && tab === "money" ? (
                <PopLine line="format.digits" name="Currency / Decimals" wide>
                    <CommitText
                        label="Currency"
                        value={format?.currency}
                        unset="USD"
                        onCommit={(words) => {
                            setFormat({ currency: words === "" ? "USD" : words.toUpperCase() });
                        }}
                    />
                    {decimals}
                </PopLine>
            ) : null}
            {numeric && tab === "date" ? (
                <PopLine line="format.digits" name="Show">
                    <Segments
                        label="Show"
                        value={format?.date?.style ?? "absolute"}
                        options={[
                            ["absolute", "Date"],
                            ["relative", "Relative"],
                        ]}
                        onPick={(next) => {
                            setFormat({ date: next === "relative" ? { style: "relative" } : { style: "absolute" } });
                        }}
                    />
                </PopLine>
            ) : null}
            {numeric && format?.date?.style === "absolute" ? (
                <PopLine line="format.dateStyle" name="Date style">
                    <Segments
                        label="Date style"
                        value={format.date.dateStyle ?? "medium"}
                        options={[
                            ["short", "Short"],
                            ["medium", "Medium"],
                            ["long", "Long"],
                        ]}
                        onPick={(next) => {
                            setFormat({ date: { style: "absolute", dateStyle: next as "short" | "medium" | "long" } });
                        }}
                    />
                </PopLine>
            ) : null}
            {numeric && tab !== "date" ? (
                <PopLine line="format.sign" name="Sign">
                    <Segments
                        label="Sign"
                        value={format?.signDisplay === "exceptZero" ? "always" : (format?.signDisplay ?? "auto")}
                        options={[
                            ["auto", "Auto"],
                            ["always", "Always"],
                            ["never", "Never"],
                        ]}
                        onPick={(next) => {
                            const signs: Readonly<Record<string, Format["signDisplay"]>> = {
                                always: "exceptZero",
                                never: "never",
                            };
                            setFormat({ signDisplay: signs[next] });
                        }}
                    />
                </PopLine>
            ) : null}
            <PopLine line="format.around" name="Before / After" wide>
                <CommitText
                    label="Before"
                    value={format?.prefix}
                    unset="None"
                    onCommit={(words) => {
                        setFormat({ prefix: words === "" ? undefined : words });
                    }}
                />
                <CommitText
                    label="After"
                    value={format?.suffix}
                    unset="None"
                    onCommit={(words) => {
                        setFormat({ suffix: words === "" ? undefined : words });
                    }}
                />
            </PopLine>
            <PopLine line="format.sample" name="Sample">
                <PanelField label="Sample" kind="text" width="fill" value={sample} readOnly />
            </PopLine>
            <MissingLine channel={channel} entry={entry} put={put} />
        </>
    );
}
