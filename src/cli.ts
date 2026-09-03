import { createApp } from './app.ts';
import { registerZipCommand } from './commands/zip.ts';

const program = createApp();

registerZipCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
