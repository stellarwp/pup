import { createApp } from './app.ts';
import { registerPackageCommand } from './commands/package.ts';
import { registerReplaceVersionCommand } from './commands/replace-version.ts';

const program = createApp();

registerPackageCommand(program);
registerReplaceVersionCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
