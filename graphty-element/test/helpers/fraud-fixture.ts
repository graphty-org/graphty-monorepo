/**
 * @file The fraud fixture of the data management prototype, built in memory: an accounts file and
 * a transfers file whose problems have exact counts, so a test can assert them. The transfers
 * name 18 unknown accounts, repeat 5 earlier pairs, write 3 amounts with a decimal comma and one
 * as "N/A", and line 412 holds one field too many; two account rows repeat an earlier id.
 */

/** How many distinct accounts the accounts file holds. */
const ACCOUNTS = 298;

/**
 * An account id.
 * @param at - Its place, from zero.
 * @returns `A001` and so on.
 */
function account(at: number): string {
    return `A${String((at % ACCOUNTS) + 1).padStart(3, "0")}`;
}

/**
 * The fraud fixture's accounts: 300 rows, two of them repeating an id an earlier row gave.
 * @returns The CSV.
 */
export function accountsCsv(): string {
    const rows = Array.from({ length: ACCOUNTS }, (_, at) => {
        const day = String((at % 28) + 1).padStart(2, "0");
        return `${account(at)},Holder ${String(at + 1)},2024-01-${day},${at % 3 === 0 ? "yes" : "no"}`;
    });
    rows.push(`${account(9)},Holder 10 again,2024-02-01,no`, `${account(19)},Holder 20 again,2024-02-02,yes`);
    return `account,holder,opened,flagged\n${rows.join("\n")}\n`;
}

/**
 * The fraud fixture's transfers: 450 rows, with 18 rows naming an unknown account, 5 rows
 * repeating an earlier pair, 3 amounts with a decimal comma, one "N/A" amount, and the row on
 * line 412 holding one field too many.
 * @returns The CSV.
 */
export function transfersCsv(): string {
    const rows: string[] = [];
    for (let at = 0; rows.length < 450; at++) {
        const line = rows.length + 2;
        const from = account(at);
        // Each pair once: (k, k + 1) for the first lap, (k, k + 2) after.
        let to = account(at + 1 + Math.floor(at / ACCOUNTS));
        if (rows.length < 18) {
            to = `X${String(rows.length + 1).padStart(3, "0")}`;
        }

        let amount = `${String(10 + (at % 90))}.50`;
        if (rows.length >= 100 && rows.length < 103) {
            amount = `"${String(at)},75"`;
        } else if (rows.length === 200) {
            amount = "N/A";
        }

        const time = `2024-09-${String((at % 28) + 1).padStart(2, "0")}T10:00`;
        rows.push(line === 412 ? `${from},${to},${amount},${time},extra` : `${from},${to},${amount},${time}`);
    }

    // The last five rows repeat five earlier pairs.
    for (let back = 0; back < 5; back++) {
        const earlier = rows[300 + back].split(",");
        rows[445 + back] = `${earlier[0]},${earlier[1]},1.00,2024-10-01T10:00`;
    }

    return `from,to,amount,time\n${rows.join("\n")}\n`;
}
