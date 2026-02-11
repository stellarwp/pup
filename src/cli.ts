import { createApp } from './app.js';
import { registerPackageCommand } from './commands/package.js';
import { registerZipCommand } from './commands/zip.js';
import { registerZipNameCommand } from './commands/zip-name.js';

const program = createApp();

registerPackageCommand(program);
registerZipCommand(program);
registerZipNameCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
