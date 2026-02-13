import { createApp } from './app.ts';
import { registerGetVersionCommand } from './commands/get-version.ts';

const program = createApp();

registerGetVersionCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
