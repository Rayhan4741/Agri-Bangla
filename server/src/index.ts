import { config, aiConfigured } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { startTcbScheduler } from './lib/market/tcbFetcher.js';

async function main() {
  await connectDb(config.MONGODB_URI);
  const app = createApp();
  app.listen(config.PORT, () => {
    console.log(`AgriBangla API on http://localhost:${config.PORT}`);
    console.log(`AI: ${aiConfigured() ? `on (${config.GEMINI_API_KEY ? config.GEMINI_MODEL : config.FALLBACK_AI_MODEL})` : 'off — set GEMINI_API_KEY to enable কৃষকবন্ধু AI'}`);
  });
  startTcbScheduler((m) => console.log(m));
}

main().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
