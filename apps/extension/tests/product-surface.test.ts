import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const popupHtmlUrl = new URL("../src/popup.html", import.meta.url);
const popupCssUrl = new URL("../src/popup.css", import.meta.url);
const manifestUrl = new URL("../manifest.json", import.meta.url);
const rootReadmeUrl = new URL("../../../README.md", import.meta.url);
const rootPackageUrl = new URL("../../../package.json", import.meta.url);
const corePackageUrl = new URL("../../../packages/core/package.json", import.meta.url);
const inventoryUrl = new URL("../../../portfolio-inventory.json", import.meta.url);

describe("Sweet Cookie public product surfaces", () => {
	it("presents the extension as a scoped, local, credential-bearing handoff", async () => {
		const html = await readFile(popupHtmlUrl, "utf8");

		expect(html.match(/<h1\b/gu)).toHaveLength(1);
		expect(html).toContain("Export scoped cookies for a local tool.");
		expect(html).toContain("No network requests");
		expect(html).toContain("Current Chrome profile");
		expect(html).toContain("Values fully masked");
		expect(html).toMatch(/complete\s+cookie/u);
		expect(html).toContain('role="status" aria-live="polite"');
		for (const id of ["targetUrl", "extraOrigins", "allowlist"]) {
			expect(html).toContain(`for="${id}"`);
			expect(html).toContain(`id="${id}"`);
		}
		expect(html).not.toMatch(/Oracle|SweetLink/u);
	});

	it("preserves the bundled type, accessibility, and motion contracts", async () => {
		const css = await readFile(popupCssUrl, "utf8");

		expect(css).toContain('font-family: "Nebula Sans"');
		expect(css).toMatch(/\.btn\s*\{[^}]*min-height: 48px;/u);
		expect(css).toContain(":focus-visible");
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
	});

	it("keeps the README outcome, proof, and custody boundaries inspectable", async () => {
		const readme = await readFile(rootReadmeUrl, "utf8");

		for (const heading of [
			"## Smallest useful action",
			"## Choose the handoff that matches the source",
			"## Source and custody boundaries",
			"## Questions",
		]) {
			expect(readme).toContain(heading);
		}
		expect(readme).toContain("npm install github:hraness/sweet-cookie#v0.4.4");
		expect(readme).toContain("--inline-json");
		expect(readme).toContain("complete cookie values");
		expect(readme).toContain("does not publish the Hraness fork to npm");
	});

	it("keeps package, extension, and portfolio metadata aligned", async () => {
		const rootPackage = JSON.parse(await readFile(rootPackageUrl, "utf8")) as {
			description: string;
			version: string;
		};
		const corePackage = JSON.parse(await readFile(corePackageUrl, "utf8")) as {
			description: string;
			version: string;
		};
		const manifest = JSON.parse(await readFile(manifestUrl, "utf8")) as {
			description: string;
		};
		const inventory = await readFile(inventoryUrl, "utf8");
		const packageDescription =
			"Read scoped cookies from inline payloads or local browsers for Node.js and Bun tools.";

		expect(rootPackage.description).toBe(packageDescription);
		expect(corePackage.description).toBe(packageDescription);
		expect(rootPackage.version).toBe("0.4.4");
		expect(corePackage.version).toBe(rootPackage.version);
		expect(manifest.description).toBe(
			"Export scoped cookies from the current Chrome profile to a private local output.",
		);
		expect(inventory).toContain('"version": "0.4.4"');
	});
});
