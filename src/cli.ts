import { createApp } from './app.ts';
import { registerWorkflowCommand } from './commands/workflow.ts';

const program = createApp();

registerWorkflowCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
