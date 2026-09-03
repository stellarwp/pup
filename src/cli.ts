import { createApp } from './app.ts';
import { registerGetVersionCommand } from './commands/get-version.ts';
import { registerZipNameCommand } from './commands/zip-name.ts';

const program = createApp();

registerGetVersionCommand(program);
registerZipNameCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
