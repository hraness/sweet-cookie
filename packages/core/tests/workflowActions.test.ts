import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const workflowsDirectory = path.join(repositoryRoot, ".github", "workflows");
const remoteActionPattern = /^[^/@\s]+\/[^/@\s]+(?:\/[^/@\s]+)*@[0-9a-fA-F]{40}$/u;

type ReferencePosition = "job" | "step";

type ActionReference = Readonly<{
	file: string;
	path: string;
	position: ReferencePosition;
	target: string;
}>;

type WorkflowSource = Readonly<{
	file: string;
	source: string;
}>;

type LocalActionSource = Readonly<{
	file: string;
	id: string;
	source: string;
}>;

type LocalReferencePolicy = Readonly<{
	resolveAction: (target: string) => LocalActionSource;
	validateWorkflow: (target: string) => void;
}>;

function requireMapping(value: unknown, file: string, valuePath: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TypeError(`${file}:${valuePath} must contain a mapping`);
	}
	return value as Record<string, unknown>;
}

function collectReference(
	value: unknown,
	file: string,
	valuePath: string,
	position: ReferencePosition,
	references: ActionReference[],
): void {
	if (typeof value !== "string") {
		throw new TypeError(`${file}:${valuePath} must contain a string uses target`);
	}
	references.push({ file, path: valuePath, position, target: value });
}

function collectStepReferences(
	value: unknown,
	file: string,
	valuePath: string,
	references: ActionReference[],
): void {
	if (!Array.isArray(value)) {
		throw new TypeError(`${file}:${valuePath} must contain a sequence`);
	}
	for (const [index, stepValue] of value.entries()) {
		const stepPath = `${valuePath}[${String(index)}]`;
		const step = requireMapping(stepValue, file, stepPath);
		if (Object.hasOwn(step, "uses")) {
			collectReference(step.uses, file, `${stepPath}.uses`, "step", references);
		}
	}
}

function collectWorkflowReferences(
	value: unknown,
	file: string,
	references: ActionReference[],
): void {
	const workflow = requireMapping(value, file, "$");
	const jobs = requireMapping(workflow.jobs, file, "$.jobs");

	for (const [jobId, jobValue] of Object.entries(jobs)) {
		const jobPath = `$.jobs.${jobId}`;
		const job = requireMapping(jobValue, file, jobPath);
		if (Object.hasOwn(job, "uses")) {
			collectReference(job.uses, file, `${jobPath}.uses`, "job", references);
		}
		if (Object.hasOwn(job, "steps")) {
			collectStepReferences(job.steps, file, `${jobPath}.steps`, references);
		}
	}
}

function collectCompositeActionReferences(
	value: unknown,
	file: string,
	references: ActionReference[],
): void {
	const action = requireMapping(value, file, "$");
	const runs = requireMapping(action.runs, file, "$.runs");
	if (typeof runs.using !== "string") {
		throw new TypeError(`${file}:$.runs.using must contain a string`);
	}
	if (runs.using !== "composite") {
		if (Object.hasOwn(runs, "steps")) {
			throw new TypeError(`${file}:$.runs.steps requires runs.using to equal composite`);
		}
		return;
	}
	collectStepReferences(runs.steps, file, "$.runs.steps", references);
}

function parseYaml(source: string): unknown {
	return parse(source, { version: "1.2" }) as unknown;
}

const rejectLocalReferences: LocalReferencePolicy = {
	resolveAction(target) {
		throw new Error(`unexpected local action reference: ${target}`);
	},
	validateWorkflow(target) {
		throw new Error(`unexpected local workflow reference: ${target}`);
	},
};

function requirePinnedActionReferences(
	sources: readonly WorkflowSource[],
	localReferences: LocalReferencePolicy = rejectLocalReferences,
): readonly ActionReference[] {
	const references: ActionReference[] = [];
	for (const { file, source } of sources) {
		collectWorkflowReferences(parseYaml(source), file, references);
	}
	if (references.length === 0) {
		throw new Error("workflow set must contain at least one semantic uses target");
	}

	const validatedActions = new Set<string>();
	const activeActions: string[] = [];

	function validateReference(reference: ActionReference): void {
		if (!reference.target.startsWith("./")) {
			if (!remoteActionPattern.test(reference.target)) {
				throw new Error(
					`${reference.file}:${reference.path} must pin ${reference.target} to a full commit`,
				);
			}
			return;
		}

		if (reference.position === "job") {
			localReferences.validateWorkflow(reference.target);
			return;
		}

		const action = localReferences.resolveAction(reference.target);
		if (activeActions.includes(action.id)) {
			throw new Error(`local action cycle: ${[...activeActions, action.id].join(" -> ")}`);
		}
		if (validatedActions.has(action.id)) {
			return;
		}

		activeActions.push(action.id);
		const nestedReferences: ActionReference[] = [];
		collectCompositeActionReferences(parseYaml(action.source), action.file, nestedReferences);
		references.push(...nestedReferences);
		for (const nestedReference of nestedReferences) {
			validateReference(nestedReference);
		}
		activeActions.pop();
		validatedActions.add(action.id);
	}

	const workflowReferences = references.slice();
	for (const reference of workflowReferences) {
		validateReference(reference);
	}
	return references;
}

function repositoryWorkflowPaths(): readonly string[] {
	return readdirSync(workflowsDirectory)
		.filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
		.sort()
		.map((file) => path.join(workflowsDirectory, file));
}

function repositoryWorkflowSources(): readonly WorkflowSource[] {
	return repositoryWorkflowPaths().map((file) => ({
		file: path.relative(repositoryRoot, file),
		source: readFileSync(file, "utf8"),
	}));
}

function requireInsideRepository(resolvedPath: string, target: string): void {
	const relative = path.relative(repositoryRoot, resolvedPath);
	if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
		throw new Error(`local reference escapes repository root: ${target}`);
	}
}

function resolveRepositoryTarget(target: string): string {
	const resolved = path.resolve(repositoryRoot, target);
	requireInsideRepository(resolved, target);
	return resolved;
}

function requireSingleActionManifest(target: string, candidates: readonly string[]): string {
	if (candidates.length !== 1) {
		throw new Error(`local action ${target} must resolve to exactly one action.yml or action.yaml`);
	}
	return candidates[0];
}

function repositoryReferencePolicy(): LocalReferencePolicy {
	const knownWorkflows = new Set(
		repositoryWorkflowPaths().map((file) => {
			const resolved = realpathSync(file);
			requireInsideRepository(resolved, file);
			return resolved;
		}),
	);

	return {
		resolveAction(target) {
			const actionDirectory = resolveRepositoryTarget(target);
			const candidates = ["action.yml", "action.yaml"]
				.map((name) => path.join(actionDirectory, name))
				.filter((candidate) => existsSync(candidate));
			const manifest = realpathSync(requireSingleActionManifest(target, candidates));
			requireInsideRepository(manifest, target);
			return {
				file: path.relative(repositoryRoot, manifest),
				id: manifest,
				source: readFileSync(manifest, "utf8"),
			};
		},
		validateWorkflow(target) {
			const workflow = resolveRepositoryTarget(target);
			if (path.dirname(workflow) !== workflowsDirectory || !/\.ya?ml$/u.test(workflow)) {
				throw new Error(
					`local reusable workflow must be a .github/workflows/*.yml or *.yaml file: ${target}`,
				);
			}
			if (!existsSync(workflow)) {
				throw new Error(`local reusable workflow does not exist: ${target}`);
			}
			const resolved = realpathSync(workflow);
			requireInsideRepository(resolved, target);
			if (!knownWorkflows.has(resolved)) {
				throw new Error(`local reusable workflow is not in the scanned workflow set: ${target}`);
			}
		},
	};
}

function fixtureReferencePolicy(
	actions: Readonly<Record<string, string>>,
	workflows: readonly string[] = [],
): LocalReferencePolicy {
	return {
		resolveAction(target) {
			const source = actions[target];
			if (source === undefined) {
				throw new Error(`missing fixture action: ${target}`);
			}
			return { file: `${target}/action.yml`, id: target, source };
		},
		validateWorkflow(target) {
			if (!workflows.includes(target)) {
				throw new Error(`unexpected fixture workflow: ${target}`);
			}
		},
	};
}

describe("workflow action references", () => {
	it("pins repository workflows and recursively resolved local actions", () => {
		expect(
			requirePinnedActionReferences(repositoryWorkflowSources(), repositoryReferencePolicy())
				.length,
		).toBeGreaterThan(0);
	});

	it("rejects unpinned flow and quoted semantic keys", () => {
		expect(() =>
			requirePinnedActionReferences([
				{
					file: "flow.yml",
					source:
						"jobs: { check: { runs-on: ubuntu-latest, steps: [ { uses: actions/checkout@main } ] } }",
				},
			]),
		).toThrow(/full commit/u);
		expect(() =>
			requirePinnedActionReferences([
				{ file: "quoted.yml", source: 'jobs:\n  check:\n    "uses": actions/checkout@main' },
			]),
		).toThrow(/full commit/u);
	});

	it("rejects invalid shapes, values, syntax, duplicates, and vacuous targets", () => {
		expect(() =>
			requirePinnedActionReferences([{ file: "jobs-shape.yml", source: "jobs: []" }]),
		).toThrow(/\.jobs must contain a mapping/u);
		expect(() =>
			requirePinnedActionReferences([
				{ file: "steps-shape.yml", source: "jobs: { check: { steps: {} } }" },
			]),
		).toThrow(/steps must contain a sequence/u);
		expect(() =>
			requirePinnedActionReferences([
				{
					file: "non-string.yml",
					source: "jobs: { check: { runs-on: ubuntu-latest, steps: [ { uses: 42 } ] } }",
				},
			]),
		).toThrow(/string uses target/u);
		expect(() =>
			requirePinnedActionReferences([
				{
					file: "dynamic.yml",
					source:
						'jobs: { check: { runs-on: ubuntu-latest, steps: [ { uses: "${{ inputs.action }}" } ] } }',
				},
			]),
		).toThrow(/full commit/u);
		expect(() =>
			requirePinnedActionReferences([
				{ file: "malformed.yml", source: "jobs: { check: { uses: [ } }" },
			]),
		).toThrow();
		expect(() =>
			requirePinnedActionReferences([
				{
					file: "duplicate.yml",
					source: "jobs:\n  check:\n    uses: ./first\n    uses: ./second",
				},
			]),
		).toThrow(/Map keys must be unique/u);
		expect(() =>
			requirePinnedActionReferences([
				{
					file: "unrelated.yml",
					source: [
						"on: { workflow_call: { inputs: { uses: { type: string } } } }",
						"jobs: { check: { runs-on: ubuntu-latest, steps: [ { run: pwd, env: { uses: metadata } } ] } }",
					].join("\n"),
				},
			]),
		).toThrow(/at least one semantic uses target/u);
	});

	it("accepts pinned flow, quoted, reusable-workflow, and local targets", () => {
		const sha = "0123456789abcdef0123456789abcdef01234567";
		const references = requirePinnedActionReferences(
			[
				{
					file: "valid.yml",
					source: [
						"jobs:",
						`  flow: { runs-on: ubuntu-latest, steps: [ { uses: owner/action@${sha} } ] }`,
						"  quoted:",
						`    'uses': owner/workflows/.github/workflows/check.yml@${sha}`,
						"  local:",
						"    runs-on: ubuntu-latest",
						"    steps:",
						"      - uses: ./local/action",
					].join("\n"),
				},
			],
			fixtureReferencePolicy({
				"./local/action": "name: local\nruns:\n  using: composite\n  steps:\n    - run: pwd",
			}),
		);
		expect(references.map(({ target }) => target)).toEqual([
			`owner/action@${sha}`,
			`owner/workflows/.github/workflows/check.yml@${sha}`,
			"./local/action",
		]);
	});

	it("recursively rejects and accepts nested composite action references", () => {
		const workflow: WorkflowSource = {
			file: "nested.yml",
			source: [
				"jobs:",
				"  check:",
				"    runs-on: ubuntu-latest",
				"    steps:",
				"      - uses: ./outer",
			].join("\n"),
		};
		expect(() =>
			requirePinnedActionReferences(
				[workflow],
				fixtureReferencePolicy({
					"./outer":
						"name: outer\nruns:\n  using: composite\n  steps:\n    - uses: owner/action@main",
				}),
			),
		).toThrow(/full commit/u);

		const sha = "0123456789abcdef0123456789abcdef01234567";
		const references = requirePinnedActionReferences(
			[workflow],
			fixtureReferencePolicy({
				"./outer": "name: outer\nruns:\n  using: composite\n  steps:\n    - uses: ./inner",
				"./inner": `name: inner\nruns:\n  using: composite\n  steps:\n    - uses: owner/action@${sha}`,
			}),
		);
		expect(references.map(({ target }) => target)).toEqual([
			"./outer",
			"./inner",
			`owner/action@${sha}`,
		]);
	});

	it("scans local reusable workflow sources", () => {
		expect(() =>
			requirePinnedActionReferences(
				[
					{
						file: ".github/workflows/caller.yml",
						source: "jobs: { call: { uses: ./.github/workflows/callee.yml } }",
					},
					{
						file: ".github/workflows/callee.yml",
						source:
							"jobs: { check: { runs-on: ubuntu-latest, steps: [ { uses: owner/action@main } ] } }",
					},
				],
				fixtureReferencePolicy({}, ["./.github/workflows/callee.yml"]),
			),
		).toThrow(/full commit/u);
	});

	it("rejects local action cycles, escapes, and missing manifests", () => {
		const workflow = (target: string): WorkflowSource => ({
			file: "local.yml",
			source: `jobs: { check: { runs-on: ubuntu-latest, steps: [ { uses: ${target} } ] } }`,
		});
		expect(() =>
			requirePinnedActionReferences(
				[workflow("./outer")],
				fixtureReferencePolicy({
					"./outer": "name: outer\nruns:\n  using: composite\n  steps:\n    - uses: ./inner",
					"./inner": "name: inner\nruns:\n  using: composite\n  steps:\n    - uses: ./outer",
				}),
			),
		).toThrow(/local action cycle/u);
		expect(() =>
			requirePinnedActionReferences([workflow("./../outside")], repositoryReferencePolicy()),
		).toThrow(/escapes repository root/u);
		expect(() =>
			requirePinnedActionReferences([workflow("./missing-action")], repositoryReferencePolicy()),
		).toThrow(/exactly one action\.yml or action\.yaml/u);
		expect(() => requireSingleActionManifest("./ambiguous", ["action.yml", "action.yaml"])).toThrow(
			/exactly one action\.yml or action\.yaml/u,
		);
	});
});
