import { createApp } from './app.ts';
import { registerCheckCommand } from './commands/check.ts';
import { registerHelpCommand } from './commands/help.ts';

const program = createApp();

registerCheckCommand(program);
registerHelpCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
