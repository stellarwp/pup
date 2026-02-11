import { createApp } from './app.js';
import { registerCloneCommand } from './commands/clone.js';

const program = createApp();

registerCloneCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
