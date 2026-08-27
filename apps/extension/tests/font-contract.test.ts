import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const popupCssUrl = new URL("../src/popup.css", import.meta.url);
const copyScriptUrl = new URL("../scripts/copy-static.mjs", import.meta.url);

describe("extension font contract", () => {
	it("uses Nebula Sans for ordinary text and keeps data fields monospace", async () => {
		const css = await readFile(popupCssUrl, "utf8");

		expect(css).toContain('font-family: "Nebula Sans"');
		expect(css).toContain('--font: "Nebula Sans"');
		expect(css).not.toContain("Avenir");
		expect(css).toMatch(/input,[\s\S]*?font-family: var\(--mono\);/u);
		expect(css).toMatch(/\.previewBody\s*\{[\s\S]*?font-family: var\(--mono\);/u);
	});

	it("copies the exact font payload and license into the extension bundle", async () => {
		const script = await readFile(copyScriptUrl, "utf8");

		for (const filename of [
			"LICENSE.txt",
			"NebulaSans-Bold.woff2",
			"NebulaSans-Book.woff2",
			"PROVENANCE.md",
		]) {
			expect(script).toContain(filename);
		}
	});
});
