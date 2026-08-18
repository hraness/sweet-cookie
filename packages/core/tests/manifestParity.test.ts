import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type Manifest = {
	name: string;
	version: string;
	private?: unknown;
	publishConfig?: unknown;
};

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function readJsonObject(relativePath: string): Record<string, unknown> {
	const value: unknown = JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TypeError(`${relativePath} must contain a JSON object`);
	}
	return value as Record<string, unknown>;
}

function readManifest(relativePath: string): Manifest {
	const value = readJsonObject(relativePath);
	if (!("name" in value) || typeof value.name !== "string" || value.name.length === 0) {
		throw new TypeError(`${relativePath} must declare a non-empty package name`);
	}
	if (!("version" in value) || typeof value.version !== "string" || value.version.length === 0) {
		throw new TypeError(`${relativePath} must declare a non-empty package version`);
	}
	return value as Manifest;
}

describe("package manifest parity", () => {
	it("keeps the private root shim aligned with the publishable core package", () => {
		const root = readManifest("package.json");
		const core = readManifest("packages/core/package.json");

		expect(root.private).toBe(true);
		expect(core.publishConfig).toEqual({ access: "public" });
		expect({ name: root.name, version: root.version }).toEqual({
			name: core.name,
			version: core.version,
		});
	});

	it("binds the public portfolio component to both package manifests", () => {
		const root = readManifest("package.json");
		const core = readManifest("packages/core/package.json");
		const inventory = readJsonObject("portfolio-inventory.json");

		expect(inventory).toMatchObject({
			contract: "hraness.portfolio-inventory/v1",
			formatVersion: 1,
			repository: "hraness/sweet-cookie",
		});
		expect(inventory.components).toEqual([
			{
				kind: "package",
				name: root.name,
				path: "packages/core",
				visibility: "public",
				version: root.version,
			},
		]);
		expect({ name: root.name, version: root.version }).toEqual({
			name: core.name,
			version: core.version,
		});
		expect(inventory.publications).toEqual([]);
	});
});
