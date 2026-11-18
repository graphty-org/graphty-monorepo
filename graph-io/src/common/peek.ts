/**
 * Peeking at an input without consuming it: the registry sniffs the head to choose a format, and
 * an importer that reads two layouts (the Neo4j importer: neo4j-admin CSV or APOC JSON) looks at
 * the first character before choosing its reader. A stream is replayed, so nothing is lost.
 */

import { type ImportInput } from "../types.js";
import { abortable, lockReader, throwIfAborted } from "./input.js";

/** A head read from an input, and the input to hand the importer (the same bytes, replayed for a stream). */
export interface PeekedInput {
    /** The first bytes (or, for a text input, characters) of the content. */
    readonly head: Uint8Array | string;
    /** The input to read: the original for in-memory input, a replaying iterable for a stream. */
    readonly input: ImportInput;
    /**
     * Close the source when the importer never iterated the replaying input (it threw first, an
     * abort for instance): a stream's reader is canceled and released, an async generator finalised.
     * @returns when the source is closed
     */
    close(): Promise<void>;
}

/**
 * The first `bytes` of an input without consuming it: in-memory input is sliced; a stream or an
 * async iterable is read until enough is buffered and then replayed (the buffered chunks first,
 * the rest as it arrives) through a new async iterable that cancels the source when the importer
 * stops early.
 * @param input - the input
 * @param bytes - how much to peek
 * @param signal - the cancellation signal, or null
 * @returns the head and the input to read
 * @category Plugin helpers
 */
export async function peekHead(input: ImportInput, bytes: number, signal: AbortSignal | null): Promise<PeekedInput> {
    if (typeof input === "string") {
        return { head: input.slice(0, bytes), input, close: (): Promise<void> => Promise.resolve() };
    }
    if (input instanceof Uint8Array) {
        return { head: input.subarray(0, bytes), input, close: (): Promise<void> => Promise.resolve() };
    }
    throwIfAborted(signal);
    const source: AsyncIterator<string | Uint8Array> =
        typeof (input as { getReader?: unknown }).getReader === "function"
            ? readerIterator(input as ReadableStream<Uint8Array>, signal)
            : (input as AsyncIterable<string | Uint8Array>)[Symbol.asyncIterator]();
    const buffered: (string | Uint8Array)[] = [];
    let size = 0;
    let finished = false;
    while (size < bytes) {
        if (signal?.aborted) {
            await source.return?.();
            throwIfAborted(signal);
        }
        const next = await source.next();
        if (next.done === true) {
            finished = true;
            break;
        }
        buffered.push(next.value);
        size += typeof next.value === "string" ? next.value.length : next.value.byteLength;
    }
    if (!finished && signal?.aborted) {
        // an abort that landed on the read completing the head: close the source before rethrowing
        await source.return?.();
        throwIfAborted(signal);
    }
    const replayed = replay(buffered, source, finished);
    return { head: joinHead(buffered, bytes), input: replayed, close: (): Promise<void> => replayed.close() };
}

/**
 * The head text or bytes of the buffered chunks: bytes when every chunk is bytes, text otherwise
 * (byte chunks decoded leniently; the importer decodes the real input strictly).
 * @param chunks - the buffered chunks
 * @param bytes - the head size
 * @returns the head
 */
function joinHead(chunks: readonly (string | Uint8Array)[], bytes: number): Uint8Array | string {
    if (chunks.every((c) => c instanceof Uint8Array)) {
        const total = Math.min(
            bytes,
            chunks.reduce((sum, c) => sum + c.byteLength, 0),
        );
        const head = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            if (offset >= total) {
                break;
            }
            const part = chunk.subarray(0, Math.min(chunk.byteLength, total - offset));
            head.set(part, offset);
            offset += part.byteLength;
        }
        return head;
    }
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let text = "";
    for (const chunk of chunks) {
        text += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
        if (text.length >= bytes) {
            break;
        }
    }
    return text.slice(0, bytes);
}

/**
 * An async iterable that yields the buffered chunks, then the rest of the source; the source is
 * closed when the consumer stops early.
 * @param buffered - the chunks already read
 * @param source - the iterator positioned after them
 * @param finished - whether the source is already exhausted
 * @returns the replaying iterable
 */
function replay(
    buffered: readonly (string | Uint8Array)[],
    source: AsyncIterator<string | Uint8Array>,
    finished: boolean,
): AsyncIterable<string | Uint8Array> & { close(): Promise<void> } {
    let exhausted = finished;
    const close = async (): Promise<void> => {
        if (!exhausted) {
            exhausted = true;
            await source.return?.();
        }
    };
    return {
        close,
        [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array> {
            let position = 0;
            return {
                async next(): Promise<IteratorResult<string | Uint8Array>> {
                    if (position < buffered.length) {
                        return { done: false, value: buffered[position++] };
                    }
                    if (exhausted) {
                        return { done: true, value: undefined };
                    }
                    const next = await source.next();
                    if (next.done === true) {
                        exhausted = true;
                        return { done: true, value: undefined };
                    }
                    return next;
                },
                async return(): Promise<IteratorResult<string | Uint8Array>> {
                    await close();
                    return { done: true, value: undefined };
                },
            };
        },
    };
}

/**
 * An async iterator over a ReadableStream's chunks that cancels the stream (with the signal's
 * reason) when closed early or when the signal fires during a read, and releases the reader when
 * the stream ends or errors.
 * @param stream - the stream
 * @param signal - the cancellation signal, or null
 * @returns the iterator
 */
function readerIterator(stream: ReadableStream<Uint8Array>, signal: AbortSignal | null): AsyncIterator<Uint8Array> {
    const reader = lockReader(stream);
    let done = false;
    return {
        async next(): Promise<IteratorResult<Uint8Array>> {
            if (done) {
                return { done: true, value: undefined };
            }
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
                result = await abortable(reader.read(), signal);
            } catch (err) {
                done = true;
                await reader.cancel(signal?.reason).catch(() => undefined);
                reader.releaseLock();
                throw err;
            }
            if (result.done) {
                done = true;
                reader.releaseLock();
                return { done: true, value: undefined };
            }
            return { done: false, value: result.value };
        },
        async return(): Promise<IteratorResult<Uint8Array>> {
            if (!done) {
                done = true;
                await reader.cancel(signal?.reason).catch(() => undefined);
                reader.releaseLock();
            }
            return { done: true, value: undefined };
        },
    };
}
