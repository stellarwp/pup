import type { Command } from 'commander';
import { getConfig } from '../config.js';
import { runCommand } from '../utils/process.js';
import * as output from '../utils/output.js';

/**
 * Registers the `workflow` (and `do` alias) command with the CLI program.
 *
 * @since TBD
 *
 * @param {Command} program - The Commander.js program instance.
 *
 * @returns {void}
 */
export function registerWorkflowCommand(program: Command): void {
  program
    .command('workflow <workflow>')
    .alias('do')
    .description('Run a command workflow.')
    .option('--root <dir>', 'Set the root directory for running commands.')
    .allowUnknownOption(true)
    .action(
      async (
        workflowName: string,
        options: { root?: string },
        command: Command
      ) => {
        await executeWorkflow(workflowName, options, command);
      }
    );
}

/**
 * Executes a named workflow's commands sequentially, passing through extra arguments.
 *
 * @since TBD
 *
 * @param {string} workflowName - The name of the workflow to execute.
 * @param {object} options - The options object.
 * @param {string} [options.root] - The root directory for running commands.
 * @param {Command} command - The Commander.js command instance (used to extract extra arguments).
 *
 * @returns {Promise<void>}
 */
async function executeWorkflow(
  workflowName: string,
  options: { root?: string },
  command: Command
): Promise<void> {
  const config = getConfig(options.root);
  const workflows = config.getWorkflows();
  const cwd = options.root ?? config.getWorkingDir();

  const workflow = workflows.get(workflowName);
  if (!workflow) {
    output.error(`The workflow '${workflowName}' does not exist.`);
    process.exit(1);
  }

  // Extract extra args passed after --
  const extraArgs = command.args.slice(1); // First arg is the workflow name

  output.log(`Running workflow: ${workflowName}`);

  for (const step of workflow.commands) {
    let cmd = step;
    let bailOnFailure = true;

    if (cmd.startsWith('@')) {
      bailOnFailure = false;
      cmd = cmd.slice(1);
    }

    // Append extra args
    if (extraArgs.length > 0) {
      cmd += ' ' + extraArgs.join(' ');
    }

    output.section(`> ${cmd}`);

    const result = await runCommand(cmd, {
      cwd,
      envVarNames: config.getEnvVarNames(),
    });

    if (result.exitCode !== 0) {
      output.error(`[FAIL] Workflow step failed: ${cmd}`);
      if (bailOnFailure) {
        output.error('Exiting...');
        process.exit(result.exitCode);
      }
    }
  }

  output.success('Workflow complete.');
}
