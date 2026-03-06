import { getChatEndpoint } from './config.js';

const RETRY_MS = 2000;

function parseEventChunk(rawChunk) {
  const normalized = rawChunk.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let event = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(':')) continue;

    const sep = line.indexOf(':');
    const field = sep === -1 ? line : line.slice(0, sep);
    const value = sep === -1 ? '' : line.slice(sep + 1).trimStart();

    if (field === 'event') event = value || 'message';
    if (field === 'data') dataLines.push(value);
  }

  if (!dataLines.length) return { event, data: null };

  const rawData = dataLines.join('\n');
  try {
    return { event, data: JSON.parse(rawData) };
  } catch {
    return { event, data: null };
  }
}

async function consumeSseBody(body, onEvent, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) {
      throw new Error('SSE stream ended');
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf('\n\n');
      if (idx === -1) break;

      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const evt = parseEventChunk(chunk);
      onEvent(evt);
    }
  }
}

export async function subscribeToSorteoInserts({ sorteoId, token, onInsert }) {
  const controller = new AbortController();
  let closed = false;
  const streamUrl = `${getChatEndpoint(sorteoId, { isAdmin: false })}/stream`;

  (async () => {
    while (!closed) {
      try {
        const res = await fetch(streamUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream'
          },
          cache: 'no-store',
          signal: controller.signal
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE status ${res.status}`);
        }

        await consumeSseBody(
          res.body,
          ({ event, data }) => {
            if (event !== 'message') return;
            if (!data?.message) return;
            onInsert(data.message);
          },
          controller.signal
        );
      } catch (err) {
        if (closed || controller.signal.aborted) break;
        await new Promise(resolve => setTimeout(resolve, RETRY_MS));
      }
    }
  })();

  return () => {
    closed = true;
    controller.abort();
  };
}
