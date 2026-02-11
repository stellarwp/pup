import { createApp } from './app.js';
import { registerPackageCommand } from './commands/package.js';

const program = createApp();

registerPackageCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
