#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { execa } from "execa";
import chalk from "chalk";

//#region src/utils/directory.ts
/**
* Ensures a directory path ends with a trailing separator.
*
* @since TBD
*
* @param {string} p - The path to ensure has a trailing separator.
*
* @returns {string} The path with a trailing separator.
*
* @throws {Error} If the path appears to be a file (has an extension).
*/
function trailingSlashIt(p) {
	const { dir, base, ext } = path.parse(p);
	if (ext.length > 0) throw new Error("Could not add trailing slash to file path.");
	return path.join(dir, base, path.sep);
}

//#endregion
//#region src/models/workflow.ts
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
function createWorkflow(slug, commands) {
	return {
		slug,
		commands
	};
}
/**
* Manages a collection of named workflows.
*
* @since TBD
*/
var WorkflowCollection = class {
	workflows = /* @__PURE__ */ new Map();
	/**
	* Adds a workflow to the collection.
	*
	* @since TBD
	*
	* @param {Workflow} workflow - The workflow to add.
	*
	* @returns {void}
	*/
	add(workflow) {
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
	get(slug) {
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
	has(slug) {
		return this.workflows.has(slug);
	}
	/**
	* Returns all workflows as an array.
	*
	* @since TBD
	*
	* @returns {Workflow[]} An array containing all workflows in the collection.
	*/
	getAll() {
		return Array.from(this.workflows.values());
	}
	/**
	* Returns the number of workflows in the collection.
	*
	* @since TBD
	*
	* @returns {number} The count of workflows.
	*/
	get size() {
		return this.workflows.size;
	}
	/**
	* Allows iterating over all workflows in the collection.
	*
	* @since TBD
	*
	* @returns {Iterator<Workflow>} An iterator over the workflows.
	*/
	[Symbol.iterator]() {
		return this.workflows.values();
	}
};

//#endregion
//#region src/schemas.ts
/**
* A build step is either a single command string (run sequentially) or an
* array of command strings (run in parallel).
*
* @since TBD
*/
const BuildStepSchema = z.union([z.string(), z.array(z.string())]);
/**
* Schema for a version file entry in .puprc paths.versions.
*
* @since TBD
*/
const VersionFileInputSchema = z.object({
	file: z.string(),
	regex: z.string()
});
/**
* Parsed version file (same shape as input).
*
* @since TBD
*/
const VersionFileSchema = z.object({
	file: z.string(),
	regex: z.string()
});
/**
* Schema for the i18n filter configuration.
*
* @since TBD
*/
const I18nFilterSchema = z.object({ minimum_percentage: z.number() });
/**
* Schema for an i18n configuration entry from .puprc (all fields optional).
*
* @since TBD
*/
const I18nConfigInputSchema = z.object({
	path: z.string().optional(),
	url: z.string().optional(),
	slug: z.string().optional(),
	textdomain: z.string().optional(),
	file_format: z.string().optional(),
	formats: z.array(z.string()).optional(),
	filter: z.object({ minimum_percentage: z.number().optional() }).optional()
}).passthrough();
/**
* Schema for the i18n defaults section of configuration.
*
* @since TBD
*/
const I18nDefaultsSchema = z.object({
	path: z.string(),
	url: z.string(),
	slug: z.string(),
	textdomain: z.string(),
	file_format: z.string(),
	formats: z.array(z.string()),
	filter: I18nFilterSchema
});
/**
* Schema for a fully resolved i18n configuration entry (all fields required).
*
* @since TBD
*/
const I18nResolvedConfigSchema = z.object({
	path: z.string(),
	url: z.string(),
	slug: z.string(),
	textdomain: z.string(),
	file_format: z.string(),
	formats: z.array(z.string()),
	filter: I18nFilterSchema
});
/**
* Schema for a check configuration entry from .puprc (optional fields with defaults).
*
* @since TBD
*/
const CheckConfigInputSchema = z.object({
	fail_method: z.enum(["error", "warn"]).optional(),
	fail_method_dev: z.enum(["error", "warn"]).optional(),
	type: z.enum([
		"simple",
		"class",
		"pup",
		"command"
	]).optional(),
	file: z.string().optional(),
	command: z.string().optional(),
	configure: z.string().optional(),
	args: z.record(z.string(), z.string()).optional(),
	dirs: z.array(z.string()).optional(),
	skip_directories: z.string().optional(),
	skip_files: z.string().optional()
}).passthrough();
/**
* Schema for a fully resolved check configuration with defaults applied.
*
* @since TBD
*/
const CheckConfigSchema = z.object({
	slug: z.string(),
	fail_method: z.enum(["error", "warn"]).default("error"),
	fail_method_dev: z.enum(["error", "warn"]).default("warn"),
	type: z.enum([
		"simple",
		"class",
		"pup",
		"command"
	]).default("pup"),
	file: z.string().optional(),
	command: z.string().optional(),
	configure: z.string().optional(),
	args: z.record(z.string(), z.string()).default({}),
	dirs: z.array(z.string()).optional(),
	skip_directories: z.string().optional(),
	skip_files: z.string().optional()
});
/**
* Schema for the paths section of configuration.
*
* @since TBD
*/
const PathsConfigSchema = z.object({
	build_dir: z.string(),
	changelog: z.string().nullable(),
	css: z.array(z.string()),
	js: z.array(z.string()),
	sync_files: z.array(z.string()),
	versions: z.array(VersionFileInputSchema),
	views: z.array(z.string()),
	zip_dir: z.string()
});
/**
* Schema for the full merged pup configuration (after defaults are applied).
*
* @since TBD
*/
const PupConfigSchema = z.object({
	build: z.array(BuildStepSchema),
	build_dev: z.array(BuildStepSchema),
	workflows: z.record(z.string(), z.array(z.string())),
	checks: z.record(z.string(), CheckConfigInputSchema),
	clean: z.array(z.string()),
	i18n: z.union([z.array(I18nConfigInputSchema), I18nConfigInputSchema]),
	i18n_defaults: I18nDefaultsSchema,
	paths: PathsConfigSchema,
	env: z.array(z.string()),
	repo: z.string().nullable(),
	zip_use_default_ignore: z.boolean(),
	zip_name: z.string().nullable()
}).passthrough();
/**
* Schema for validating raw .puprc input (all fields optional + passthrough for custom keys).
*
* @since TBD
*/
const PuprcInputSchema = z.object({
	build: z.array(BuildStepSchema).optional(),
	build_dev: z.array(BuildStepSchema).optional(),
	workflows: z.record(z.string(), z.array(z.string())).optional(),
	checks: z.record(z.string(), CheckConfigInputSchema.or(z.object({}).passthrough())).optional(),
	clean: z.array(z.string()).optional(),
	i18n: z.union([z.array(I18nConfigInputSchema), I18nConfigInputSchema]).optional(),
	i18n_defaults: I18nDefaultsSchema.partial().optional(),
	paths: PathsConfigSchema.partial().optional(),
	env: z.array(z.string()).optional(),
	repo: z.string().nullable().optional(),
	zip_use_default_ignore: z.boolean().optional(),
	zip_name: z.string().nullable().optional()
}).passthrough();
/**
* Schema for a workflow.
*
* @since TBD
*/
const WorkflowSchema = z.object({
	slug: z.string(),
	commands: z.array(BuildStepSchema)
});

//#endregion
//#region defaults/.puprc-defaults.json
var _puprc_defaults_default = {
	build: [],
	build_dev: [],
	workflows: {},
	checks: {
		"tbd": {
			"fail_method": "error",
			"fail_method_dev": "warn",
			"skip_directories": "bin|build|vendor|node_modules|.git|.github|tests",
			"skip_files": ".min.css|.min.js|.map.js|.css|.png|.jpg|.jpeg|.svg|.gif|.ico",
			"dirs": ["src"]
		},
		"version-conflict": {
			"fail_method": "error",
			"fail_method_dev": "warn"
		}
	},
	clean: [],
	i18n: [],
	i18n_defaults: {
		"path": "lang",
		"url": "",
		"slug": "",
		"textdomain": "",
		"file_format": "%textdomain%-%wp_locale%.%format%",
		"formats": ["po", "mo"],
		"filter": { "minimum_percentage": 30 }
	},
	paths: {
		"build_dir": ".pup-build",
		"changelog": null,
		"css": [],
		"js": [],
		"sync_files": [],
		"versions": [],
		"views": [],
		"zip_dir": ".pup-zip"
	},
	env: ["NODE_AUTH_TOKEN"],
	repo: null,
	zip_use_default_ignore: true,
	zip_name: null
};

//#endregion
//#region src/config.ts
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
/**
* Loads, merges, and provides access to the project's pup configuration.
*
* @since TBD
*/
var Config = class {
	#workingDir;
	#puprcFilePath;
	#config;
	#workflows;
	#checks;
	#versionFiles;
	#i18n = null;
	/**
	* Initializes configuration by loading and merging .puprc with defaults.
	*
	* @since TBD
	*
	* @param {string} workingDir - The project working directory. Defaults to process.cwd().
	*
	* @throws {Error} If the .puprc file is present but contains invalid JSON or fails validation.
	*/
	constructor(workingDir) {
		const cwd = workingDir ?? process.cwd();
		this.#workingDir = trailingSlashIt(path.normalize(cwd));
		this.#puprcFilePath = path.join(this.#workingDir, ".puprc");
		this.#config = this.getDefaultConfig();
		this.mergeConfigWithDefaults();
		this.#workflows = this.buildWorkflows();
		this.#checks = this.parseCheckConfig();
		this.#versionFiles = this.parseVersionFiles();
	}
	/**
	* Returns the default configuration from the bundled .puprc-defaults.
	*
	* @since TBD
	*
	* @returns {PupConfig} The parsed default configuration object.
	*/
	getDefaultConfig() {
		return structuredClone(_puprc_defaults_default);
	}
	/**
	* Merges the project's .puprc file into the default configuration.
	*
	* @since TBD
	*
	* @throws {Error} If the .puprc file contains invalid JSON or fails schema validation.
	*/
	mergeConfigWithDefaults() {
		if (!fs.existsSync(this.#puprcFilePath)) return;
		const puprcContents = fs.readFileSync(this.#puprcFilePath, "utf-8");
		let rawPuprc;
		try {
			rawPuprc = JSON.parse(puprcContents);
		} catch {
			throw new Error("There is a .puprc file in this directory, but it could not be parsed. Invalid JSON in .puprc.");
		}
		if (!rawPuprc || typeof rawPuprc !== "object") throw new Error("There is a .puprc file in this directory, but it could not be parsed. Invalid .puprc format.");
		const parseResult = PuprcInputSchema.safeParse(rawPuprc);
		if (!parseResult.success) {
			const issues = parseResult.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
			throw new Error(`There is a .puprc file in this directory, but it contains invalid configuration:\n${issues}`);
		}
		const puprc = parseResult.data;
		const configRecord = this.#config;
		for (const [key, value] of Object.entries(puprc)) {
			const current = configRecord[key];
			if (current === void 0 || current === null) {
				configRecord[key] = value;
				continue;
			}
			if (typeof current !== "object") {
				configRecord[key] = value;
				continue;
			}
			if (key === "checks" && typeof value === "object" && value !== null) {
				const defaultChecks = current;
				const newChecks = value;
				configRecord[key] = newChecks;
				for (const [checkSlug, checkConfig] of Object.entries(newChecks)) if (defaultChecks[checkSlug] !== void 0) configRecord[key][checkSlug] = this.mergeConfigValue(defaultChecks[checkSlug], checkConfig);
				continue;
			}
			configRecord[key] = this.mergeConfigValue(current, value);
		}
	}
	/**
	* Deep-merges two configuration values. Scalars and arrays replace; objects merge recursively.
	*
	* @since TBD
	*
	* @param {unknown} original - The original configuration value.
	* @param {unknown} newVal - The new configuration value to merge in.
	*
	* @returns {unknown} The merged configuration value.
	*/
	mergeConfigValue(original, newVal) {
		if (typeof newVal !== "object" || newVal === null) return newVal;
		if (typeof original !== "object" || original === null) return newVal;
		if (Array.isArray(original)) return newVal;
		if (Array.isArray(newVal)) return newVal;
		const orig = original;
		const nv = newVal;
		const result = { ...orig };
		for (const [key, item] of Object.entries(orig)) {
			if (nv[key] === void 0) continue;
			if (typeof item === "object" && item !== null && !Array.isArray(item)) result[key] = this.mergeConfigValue(item, nv[key]);
			else result[key] = nv[key];
		}
		for (const [key, item] of Object.entries(nv)) if (result[key] === void 0) result[key] = item;
		return result;
	}
	/**
	* Builds the workflow collection from configuration, including auto-generated build workflows.
	*
	* @since TBD
	*
	* @returns {WorkflowCollection} The built workflow collection.
	*/
	buildWorkflows() {
		const collection = new WorkflowCollection();
		const rawWorkflows = this.#config.workflows;
		if (this.#config.build?.length > 0 && !rawWorkflows?.["build"]) collection.add(createWorkflow("build", this.#config.build));
		if (this.#config.build_dev?.length > 0 && !rawWorkflows?.["build_dev"]) collection.add(createWorkflow("build_dev", this.#config.build_dev));
		if (rawWorkflows && typeof rawWorkflows === "object") for (const [slug, commands] of Object.entries(rawWorkflows)) collection.add(createWorkflow(slug, Array.isArray(commands) ? commands : []));
		return collection;
	}
	/**
	* Parses the checks section of the configuration into CheckConfig objects.
	* Uses Zod schema defaults for per-field values.
	*
	* @since TBD
	*
	* @returns {Map<string, CheckConfig>} A map of check slug to CheckConfig.
	*/
	parseCheckConfig() {
		const checks = this.#config.checks;
		const result = /* @__PURE__ */ new Map();
		if (!checks) return result;
		for (const [slug, checkInput] of Object.entries(checks)) {
			const input = typeof checkInput === "object" && checkInput !== null ? checkInput : {};
			const parsed = CheckConfigSchema.parse({
				slug,
				...input
			});
			result.set(slug, parsed);
		}
		return result;
	}
	/**
	* Parses and validates the version files section of the configuration.
	*
	* @since TBD
	*
	* @returns {VersionFile[]} The parsed list of version file objects.
	*
	* @throws {Error} If a version file entry is missing required properties or the file does not exist.
	*/
	parseVersionFiles() {
		const versions = this.#config.paths?.versions;
		const result = [];
		if (!versions || !Array.isArray(versions)) return result;
		for (const vf of versions) {
			if (!vf.file || !vf.regex) throw new Error("Versions specified in .puprc .paths.versions must have the \"file\" and \"regex\" property.");
			const filePath = path.join(this.#workingDir, vf.file);
			if (!fs.existsSync(filePath)) throw new Error(`Version file does not exist: ${vf.file}`);
			const contents = fs.readFileSync(filePath, "utf-8");
			const regex = new RegExp(vf.regex);
			const matches = contents.match(regex);
			if (!matches || !matches[1] || !matches[2]) throw new Error(`Could not find version in file ${vf.file} using regex "/${vf.regex}/"`);
			result.push({
				file: vf.file,
				regex: vf.regex
			});
		}
		return result;
	}
	/**
	* Returns the raw merged configuration object.
	*
	* @since TBD
	*
	* @returns {PupConfig} The configuration object.
	*/
	get raw() {
		return this.#config;
	}
	/**
	* Returns the build commands, preferring dev commands when isDev is true.
	*
	* @since TBD
	*
	* @param {boolean} isDev - Whether to return dev build commands.
	*
	* @returns {BuildStep[]} The list of build steps (strings run sequentially, sub-arrays run in parallel).
	*/
	getBuildCommands(isDev = false) {
		if (isDev && this.#config.build_dev?.length > 0) return this.#config.build_dev;
		return this.#config.build ?? [];
	}
	/**
	* Returns the build directory path, optionally as a full absolute path.
	*
	* @since TBD
	*
	* @param {boolean} fullPath - Whether to return the full absolute path.
	*
	* @returns {string} The build directory path.
	*/
	getBuildDir(fullPath = true) {
		const buildDir = this.#config.paths?.build_dir ?? ".pup-build";
		if (!fullPath) return buildDir;
		return path.resolve(this.#workingDir, buildDir);
	}
	/**
	* Returns the clean commands from the configuration.
	*
	* @since TBD
	*
	* @returns {string[]} The list of clean command strings.
	*/
	getCleanCommands() {
		return this.#config.clean ?? [];
	}
	/**
	* Returns the map of parsed check configurations.
	*
	* @since TBD
	*
	* @returns {Map<string, CheckConfig>} A map of check slug to CheckConfig.
	*/
	getChecks() {
		return this.#checks;
	}
	/**
	* Returns resolved i18n configurations, merging with defaults.
	*
	* @since TBD
	*
	* @returns {I18nResolvedConfig[]} The list of resolved i18n configuration objects.
	*/
	getI18n() {
		if (this.#i18n !== null) return this.#i18n;
		const defaults = this.#config.i18n_defaults;
		const i18nRaw = this.#config.i18n;
		if (!i18nRaw || Array.isArray(i18nRaw) && i18nRaw.length === 0) {
			this.#i18n = [];
			return this.#i18n;
		}
		let i18nArr;
		if (!Array.isArray(i18nRaw)) i18nArr = [i18nRaw];
		else i18nArr = i18nRaw;
		i18nArr = i18nArr.filter((item) => item.url && item.textdomain && item.slug);
		if (i18nArr.length === 0) {
			this.#i18n = [];
			return this.#i18n;
		}
		this.#i18n = i18nArr.map((item) => ({
			path: item.path ?? defaults.path,
			url: item.url ?? defaults.url,
			slug: item.slug ?? defaults.slug,
			textdomain: item.textdomain ?? defaults.textdomain,
			file_format: item.file_format ?? defaults.file_format,
			formats: item.formats?.length ? item.formats : defaults.formats,
			filter: { minimum_percentage: item.filter?.minimum_percentage ?? defaults.filter.minimum_percentage }
		}));
		return this.#i18n;
	}
	/**
	* Returns the list of environment variable names from configuration.
	*
	* @since TBD
	*
	* @returns {string[]} The list of environment variable name strings.
	*/
	getEnvVarNames() {
		return this.#config.env ?? [];
	}
	/**
	* Returns the git repository URL, inferring from package.json or composer.json if not set.
	*
	* @since TBD
	*
	* @returns {string} The git repository URL string.
	*
	* @throws {Error} If no repository can be determined.
	*/
	getRepo() {
		if (!this.#config.repo) {
			const pkgPath = path.join(this.#workingDir, "package.json");
			if (fs.existsSync(pkgPath)) {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
				if (typeof pkg.repository === "string") return `git@github.com:${pkg.repository}.git`;
				if (pkg.repository?.url) return pkg.repository.url;
			}
			const composerPath = path.join(this.#workingDir, "composer.json");
			if (fs.existsSync(composerPath)) {
				const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));
				if (composer.name) return `git@github.com:${composer.name}.git`;
			}
			throw new Error("Could not find a repo in the .puprc file or the \"name\" property in package.json/composer.json.");
		}
		const repo = this.#config.repo;
		if (!repo.includes("https://") && !repo.includes("file://") && !repo.includes("git://") && !repo.includes("git@github.com") && !fs.existsSync(repo)) return `git@github.com:${repo}.git`;
		return repo;
	}
	/**
	* Returns the list of sync file names (.distfiles, .distinclude, etc.).
	*
	* @since TBD
	*
	* @returns {string[]} The list of sync file name strings.
	*/
	getSyncFiles() {
		const defaults = [
			".distfiles",
			".distinclude",
			".distignore",
			".gitattributes"
		];
		const configFiles = this.#config.paths?.sync_files;
		if (!configFiles || !Array.isArray(configFiles) || configFiles.length === 0) return defaults;
		return [...new Set([...defaults, ...configFiles])];
	}
	/**
	* Returns the parsed version file configurations.
	*
	* @since TBD
	*
	* @returns {VersionFile[]} The list of version file objects.
	*/
	getVersionFiles() {
		return this.#versionFiles;
	}
	/**
	* Returns the workflow collection.
	*
	* @since TBD
	*
	* @returns {WorkflowCollection} The WorkflowCollection instance.
	*/
	getWorkflows() {
		return this.#workflows;
	}
	/**
	* Returns the working directory path.
	*
	* @since TBD
	*
	* @returns {string} The absolute working directory path with trailing slash.
	*/
	getWorkingDir() {
		return this.#workingDir;
	}
	/**
	* Returns the zip staging directory path, optionally as a full absolute path.
	*
	* @since TBD
	*
	* @param {boolean} fullPath - Whether to return the full absolute path.
	*
	* @returns {string} The zip staging directory path.
	*/
	getZipDir(fullPath = true) {
		const zipDir = this.#config.paths?.zip_dir ?? ".pup-zip";
		if (!fullPath) return zipDir;
		return path.resolve(this.#workingDir, zipDir);
	}
	/**
	* Returns the zip archive base name, inferring from package.json if not set.
	*
	* @since TBD
	*
	* @returns {string} The zip archive base name string.
	*
	* @throws {Error} If no zip name can be determined.
	*/
	getZipName() {
		if (this.#config.zip_name) return this.#config.zip_name;
		const pkgPath = path.join(this.#workingDir, "package.json");
		if (fs.existsSync(pkgPath)) {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
			if (pkg.name) return pkg.name.replace(/^@[^/]+\//, "");
		}
		const composerPath = path.join(this.#workingDir, "composer.json");
		if (fs.existsSync(composerPath)) {
			const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));
			if (composer.name) return composer.name.replace(/^[^/]+\//, "");
		}
		throw new Error("Could not find a \"zip_name\" in .puprc");
	}
	/**
	* Returns whether to use the default .distignore-defaults patterns.
	*
	* @since TBD
	*
	* @returns {boolean} True if default ignore patterns should be used.
	*/
	getZipUseDefaultIgnore() {
		return this.#config.zip_use_default_ignore ?? true;
	}
	/**
	* Serializes the configuration to a plain object.
	*
	* @since TBD
	*
	* @returns {PupConfig} The configuration as a PupConfig object.
	*/
	toJSON() {
		return this.#config;
	}
};
let globalConfig = null;
/**
* Returns the singleton Config instance, creating it if needed.
*
* @since TBD
*
* @param {string} workingDir - Optional working directory to pass to the Config constructor.
*
* @returns {Config} The singleton Config instance.
*/
function getConfig(workingDir) {
	if (!globalConfig) globalConfig = new Config(workingDir);
	return globalConfig;
}
/**
* Resets the singleton Config instance, forcing a fresh load on next access.
*
* @since TBD
*
* @returns {void}
*/
function resetConfig() {
	globalConfig = null;
}

//#endregion
//#region src/app.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
* Reads the pup version from the nearest package.json.
*
* @since TBD
*
* @returns {string} The version string from package.json, or '2.0.0' as a fallback.
*/
function getVersion() {
	const candidates = [path.resolve(__dirname, "..", "package.json"), path.resolve(__dirname, "..", "..", "package.json")];
	for (const candidate of candidates) if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, "utf-8")).version;
	return "2.0.0";
}
const PUP_VERSION = getVersion();
/**
* Creates and configures the Commander program instance.
*
* @since TBD
*
* @returns {Command} The configured Commander program.
*/
function createApp() {
	resetConfig();
	getConfig();
	const program = new Command();
	program.name("pup").version(PUP_VERSION).description("StellarWP's Project Utilities & Packager");
	return program;
}

//#endregion
//#region src/utils/process.ts
/**
* Runs a shell command, streaming output to console.
* Commands prefixed with `@` are treated as soft-fail (errors are ignored).
*
* @since TBD
*
* @param {string} command - The shell command to execute.
* @param {RunOptions} options - Optional configuration for the command execution.
*
* @returns {Promise<RunCommandResult>} The command result with stdout, stderr, and exit code.
*/
async function runCommand(command, options = {}) {
	let cmd = command;
	let softFail = options.softFail ?? false;
	if (cmd.startsWith("@")) {
		cmd = cmd.slice(1);
		softFail = true;
	}
	try {
		const result = await execa(cmd, {
			cwd: options.cwd,
			shell: true,
			stdout: options.silent ? "pipe" : "inherit",
			stderr: options.silent ? "pipe" : "inherit",
			reject: false
		});
		if (result.exitCode !== 0 && !softFail) return {
			stdout: String(result.stdout ?? ""),
			stderr: String(result.stderr ?? ""),
			exitCode: result.exitCode ?? 1
		};
		return {
			stdout: String(result.stdout ?? ""),
			stderr: String(result.stderr ?? ""),
			exitCode: softFail ? 0 : result.exitCode ?? 0
		};
	} catch (err) {
		if (softFail) return {
			stdout: "",
			stderr: String(err),
			exitCode: 0
		};
		throw err;
	}
}

//#endregion
//#region src/utils/output.ts
let prefix = "";
/**
* Formats a message with the current prefix, if one is set.
*
* @since TBD
*
* @param {string} message - The message to format.
*
* @returns {string} The formatted message with prefix prepended if set.
*/
function formatMessage(message) {
	if (prefix) return `[${prefix}] ${message}`;
	return message;
}
/**
* Prints a green success message to stdout.
*
* @since TBD
*
* @param {string} message - The success message to display.
*
* @returns {void}
*/
function success(message) {
	console.log(formatMessage(chalk.green(message)));
}
/**
* Prints a red error message to stderr.
*
* @since TBD
*
* @param {string} message - The error message to display.
*
* @returns {void}
*/
function error(message) {
	console.error(formatMessage(chalk.red(message)));
}
/**
* Prints a bold yellow section header.
*
* @since TBD
*
* @param {string} message - The section header text to display.
*
* @returns {void}
*/
function section(message) {
	console.log("");
	console.log(formatMessage(chalk.bold.yellow(message)));
}
/**
* Prints a plain message to stdout with the current prefix.
*
* @since TBD
*
* @param {string} message - The message to print.
*
* @returns {void}
*/
function log(message) {
	console.log(formatMessage(message));
}

//#endregion
//#region src/commands/build.ts
/**
* Runs a single build command, handling the `@` soft-fail prefix.
*
* @since TBD
*
* @param {string} step - The command string to execute.
* @param {string} cwd - The working directory for the command.
*
* @returns {Promise<{ cmd: string; bailOnFailure: boolean; result: RunCommandResult }>} The command, bail flag, and result.
*/
async function runBuildStep(step, cwd) {
	let cmd = step;
	let bailOnFailure = true;
	if (cmd.startsWith("@")) {
		bailOnFailure = false;
		cmd = cmd.slice(1);
	}
	section(`> ${cmd}`);
	const result = await runCommand(cmd, { cwd });
	return {
		cmd,
		bailOnFailure,
		result
	};
}
/**
* Registers the `build` command with the CLI program.
*
* @since TBD
*
* @param {Command} program - The Commander.js program instance.
*
* @returns {void}
*/
function registerBuildCommand(program) {
	program.command("build").description("Run the build commands.").option("--dev", "Run the dev build commands.").option("--root <dir>", "Set the root directory for running commands.").action(async (options) => {
		const config = getConfig(options.root);
		const buildSteps = config.getBuildCommands(options.dev);
		const cwd = options.root ?? config.getWorkingDir();
		log("Running build steps...");
		for (const step of buildSteps) if (Array.isArray(step)) {
			const results = await Promise.all(step.map((cmd) => runBuildStep(cmd, cwd)));
			for (const { cmd, bailOnFailure, result } of results) if (result.exitCode !== 0) {
				error(`[FAIL] Build step failed: ${cmd}`);
				if (bailOnFailure) {
					error("Exiting...");
					process.exit(result.exitCode);
				}
			}
		} else {
			const { cmd, bailOnFailure, result } = await runBuildStep(step, cwd);
			if (result.exitCode !== 0) {
				error(`[FAIL] Build step failed: ${cmd}`);
				if (bailOnFailure) {
					error("Exiting...");
					process.exit(result.exitCode);
				}
			}
		}
		success("Build complete.");
	});
}

//#endregion
//#region src/cli.ts
const program = createApp();
registerBuildCommand(program);
program.parseAsync(process.argv).catch((err) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});

//#endregion
export {  };
//# sourceMappingURL=cli.js.map