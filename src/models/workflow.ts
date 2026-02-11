import type { BuildStep, Workflow } from '../types.js';

/**
 * Creates a Workflow object from a slug and list of commands.
 *
 * @since TBD
 *
 * @param {string} slug - The unique identifier for the workflow.
 * @param {BuildStep[]} commands - The list of build steps to execute in the workflow.
 *
 * @returns {Workflow} A Workflow object with the provided slug and commands.
 */
export function createWorkflow(slug: string, commands: BuildStep[]): Workflow {
  return { slug, commands };
}

/**
 * Manages a collection of named workflows.
 *
 * @since TBD
 */
export class WorkflowCollection {
  private workflows: Map<string, Workflow> = new Map();

  /**
   * Adds a workflow to the collection.
   *
   * @since TBD
   *
   * @param {Workflow} workflow - The workflow to add.
   *
   * @returns {void}
   */
  add(workflow: Workflow): void {
    this.workflows.set(workflow.slug, workflow);
  }

  /**
   * Retrieves a workflow by its slug.
   *
   * @since TBD
   *
   * @param {string} slug - The slug of the workflow to retrieve.
   *
   * @returns {Workflow | undefined} The workflow if found, otherwise undefined.
   */
  get(slug: string): Workflow | undefined {
    return this.workflows.get(slug);
  }

  /**
   * Checks whether a workflow with the given slug exists.
   *
   * @since TBD
   *
   * @param {string} slug - The slug to check.
   *
   * @returns {boolean} True if the workflow exists, false otherwise.
   */
  has(slug: string): boolean {
    return this.workflows.has(slug);
  }

  /**
   * Returns all workflows as an array.
   *
   * @since TBD
   *
   * @returns {Workflow[]} An array containing all workflows in the collection.
   */
  getAll(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Returns the number of workflows in the collection.
   *
   * @since TBD
   *
   * @returns {number} The count of workflows.
   */
  get size(): number {
    return this.workflows.size;
  }

  /**
   * Allows iterating over all workflows in the collection.
   *
   * @since TBD
   *
   * @returns {Iterator<Workflow>} An iterator over the workflows.
   */
  [Symbol.iterator](): Iterator<Workflow> {
    return this.workflows.values();
  }
}
