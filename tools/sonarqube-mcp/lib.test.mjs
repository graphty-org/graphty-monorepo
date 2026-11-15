import assert from "node:assert/strict";
import { test } from "node:test";

import { sseMessages } from "./lib.mjs";

test("sseMessages returns each event's data, joined across data lines", () => {
    const body = 'id: 1\nevent: message\ndata: {"id":1}\n\n: comment\n\ndata: {"a":\ndata: 2}\r\n\r\n';
    assert.deepEqual(sseMessages(body), ['{"id":1}', '{"a":\n2}']);
});

test("sseMessages returns nothing for an empty stream", () => {
    assert.deepEqual(sseMessages(""), []);
});
