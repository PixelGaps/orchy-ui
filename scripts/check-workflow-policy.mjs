import { readdir, readFile } from "node:fs/promises"

const workflowDir = new URL("../.github/workflows/", import.meta.url)
const files = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/.test(name))
const violations = []

for (const name of files.sort()) {
  const content = await readFile(new URL(name, workflowDir), "utf8")
  content.split(/\r?\n/).forEach((line, index) => {
    if (/^  pull_request(?:_target)?:/.test(line)) {
      violations.push(`${name}:${index + 1}:${line.trim()}`)
    }
  })
}

if (violations.length) {
  console.error("WORKFLOW_PR_TRIGGER_POLICY=FAIL")
  for (const violation of violations) console.error(violation)
  process.exit(1)
}

console.log(`WORKFLOW_PR_TRIGGER_POLICY=PASS workflows=${files.length}`)
