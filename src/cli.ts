import { createApp } from './app.ts';
import { registerHelpCommand } from './commands/help.ts';
import { registerInfoCommand } from './commands/info.ts';

const program = createApp();

registerHelpCommand(program);
registerInfoCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
