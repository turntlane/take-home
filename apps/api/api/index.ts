import type { IncomingMessage, ServerResponse } from 'node:http';
// Imports the tsc-compiled output (built by `npm run build` during the Vercel
// build step) rather than ../src: Vercel bundles this entry with esbuild, which
// does not emit the decorator metadata Nest's DI needs.
import { createApp } from '../dist/app.factory';

type Listener = (req: IncomingMessage, res: ServerResponse) => void;

// Cache the bootstrap promise, not the app, so concurrent requests during a
// cold start share a single initialization.
let listenerPromise: Promise<Listener> | null = null;

function getListener(): Promise<Listener> {
  listenerPromise ??= createApp().then(async (app) => {
    await app.init();
    return app.getHttpAdapter().getInstance() as Listener;
  });
  return listenerPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const listener = await getListener();
  listener(req, res);
}
