#!/usr/bin/env node
// Convenience wrapper to validate careers ordering for Sébastien Lecornu
// Usage: node scripts/validate_lecornu.js

const { spawn } = require('child_process');
const path = require('path');

const PERSON_ID = '1c71e08c-eabe-490c-82b2-262ae5df270a';
const validator = path.resolve(__dirname, 'validate_careers_order.js');

const child = spawn(process.execPath, [validator, PERSON_ID], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code));

