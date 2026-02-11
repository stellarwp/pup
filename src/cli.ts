import { createApp } from './app.js';
import { registerCleanCommand } from './commands/clean.js';

const program = createApp();

registerCleanCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
