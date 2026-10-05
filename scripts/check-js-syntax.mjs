import { readdirSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { spawnSync } from "node:child_process"

const root = "scripts"
const extensions = new Set([".js", ".mjs", ".cjs"])

function files(directory) {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name)
      return statSync(path).isDirectory() ? files(path) : [path]
    })
    .filter((path) => extensions.has(extname(path)))
    .sort()
}

for (const path of files(root)) {
  const result = spawnSync(process.execPath, ["--check", path], { stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
