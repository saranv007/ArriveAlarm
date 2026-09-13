// Load environment variables before importing any modules that read them
import 'dotenv/config';

import { createApp } from '../server/src/app.js';

const app = createApp();

export default app;
