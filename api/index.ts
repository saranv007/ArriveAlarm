// Load environment variables before importing any modules that read them
import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import from compiled server/dist (pre-compiled JS, not raw TypeScript)
// This avoids @vercel/node needing to resolve TypeScript files outside api/
import { createApp } from '../server/dist/app.js';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
