import { createApp } from './app.js';
import { registerHelpCommand } from './commands/help.js';
import { registerInfoCommand } from './commands/info.js';

const program = createApp();

registerHelpCommand(program);
registerInfoCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
