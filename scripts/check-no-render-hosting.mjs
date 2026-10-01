import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SELF = "scripts/check-no-render-hosting.mjs";
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const FORBIDDEN_FILENAMES = new Set(["render.yaml", "render.yml"]);
const FORBIDDEN_MARKERS = [
  "onrender.com",
  "api.render.com",
  "RENDER_EXTERNAL_URL",
  "RENDER_SERVICE_ID",
  "RENDER_SERVICE_NAME",
  "RENDER_INSTANCE_ID",
  "RENDER_GIT_COMMIT",
];

const violations = [];

function visit(path) {
  const entry = statSync(path);
  if (entry.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (SKIP_DIRS.has(name)) continue;
      visit(join(path, name));
    }
    return;
  }

  const rel = relative(ROOT, path).replaceAll("\\", "/");
  if (rel === SELF) return;

  const filename = rel.split("/").at(-1);
  if (FORBIDDEN_FILENAMES.has(filename)) {
    violations.push(`${rel}: forbidden Render deployment file`);
  }

  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const marker of FORBIDDEN_MARKERS) {
    if (text.includes(marker)) {
      violations.push(`${rel}: forbidden Render hosting marker ${marker}`);
    }
  }
}

visit(ROOT);

if (violations.length) {
  console.error("Render hosting is retired from PixelGaps/orchy-ui.");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("NO_RENDER_HOSTING=PASS");
