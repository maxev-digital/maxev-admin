import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('./node_modules/bcryptjs/index.js');

const hash = await bcrypt.hash('MaxEV2026!', 12);

// Write just the hash so we can read it in shell
process.stdout.write(hash + '\n');
