import { createApp } from './app.js';
import { registerBuildCommand } from './commands/build.js';

const program = createApp();

registerBuildCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
