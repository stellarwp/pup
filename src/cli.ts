import { createApp } from './app.ts';
import { registerI18nCommand } from './commands/i18n.ts';

const program = createApp();

registerI18nCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
