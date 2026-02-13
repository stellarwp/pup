import { createApp } from './app.ts';
import { registerBuildCommand } from './commands/build.ts';

const program = createApp();

registerBuildCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
