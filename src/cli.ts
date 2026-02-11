import { createApp } from './app.js';
import { registerGetVersionCommand } from './commands/get-version.js';
import { registerZipNameCommand } from './commands/zip-name.js';

const program = createApp();

registerGetVersionCommand(program);
registerZipNameCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
