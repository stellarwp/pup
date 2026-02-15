import { createApp } from './app.ts';
import { registerPackageCommand } from './commands/package.ts';

const program = createApp();

registerPackageCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
