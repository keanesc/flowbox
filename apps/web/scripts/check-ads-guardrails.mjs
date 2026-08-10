import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = join(process.cwd());
const sourceRoots = ["app", "components", "lib"];
const sourceExtensions = new Set([".css", ".ts", ".tsx", ".js", ".jsx"]);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (sourceExtensions.has(path.slice(path.lastIndexOf(".")))) {
      const text = await readFile(path, "utf8");
      const checks = [
        [/#[0-9a-f]{3,8}\b/i, "hex color"],
        [/\brgba?\s*\(/i, "rgb color"],
        [/fonts\.googleapis\.com/i, "Google Fonts import"],
        [/font-family\s*:/i, "custom font-family"],
        [/box-shadow\s*:/i, "custom box shadow"],
      ];
      for (const [pattern, label] of checks) {
        if (pattern.test(text))
          violations.push(`${relative(root, path)}: ${label}`);
      }
      if (
        /border-radius\s*:/i.test(text) &&
        !/border-radius\s*:\s*var\(--ds-/i.test(text)
      ) {
        violations.push(`${relative(root, path)}: custom border radius`);
      }
      if (path.endsWith(".css")) {
        if (
          /(?:padding|margin|gap|inset|top|right|bottom|left)\s*:\s*\d+(?:px|rem|em)\b/i.test(
            text,
          )
        ) {
          violations.push(`${relative(root, path)}: raw spacing value`);
        }
        const meaningful = text
          .split("\n")
          .map((line) => line.trim())
          .filter(
            (line) => line && !line.startsWith("/*") && !line.startsWith("*"),
          );
        if (
          path.endsWith("globals.css") &&
          meaningful.some((line) => !line.startsWith("@import"))
        ) {
          violations.push(
            `${relative(root, path)}: global CSS outside the ADS reset boundary`,
          );
        }
      }
    }
  }
}

for (const directory of sourceRoots) await walk(join(root, directory));
if (violations.length) {
  console.error("ADS styling guardrails failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log("ADS styling guardrails passed.");
