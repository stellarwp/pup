import { createApp } from './app.js';
import { registerCheckCommand } from './commands/check.js';
import { registerHelpCommand } from './commands/help.js';

const program = createApp();

registerCheckCommand(program);
registerHelpCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
