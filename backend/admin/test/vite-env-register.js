// Polyfill Vite's import.meta.env for Node.js test runner.
// Used via: node --import ./test/vite-env-register.js ...
import { register } from 'node:module';

register('./vite-env-hook.js', import.meta.url);
