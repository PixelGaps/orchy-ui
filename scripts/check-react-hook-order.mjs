#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const HOOK_NAME = /^use[A-Z0-9]/;

function callHookName(expression) {
  if (ts.isIdentifier(expression) && HOOK_NAME.test(expression.text)) {
    return expression.text;
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "React" &&
    HOOK_NAME.test(expression.name.text)
  ) {
    return `React.${expression.name.text}`;
  }
  return null;
}

function isFunctionBoundary(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function nearestFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunctionBoundary(current)) return current;
  }
  return null;
}

function isConditionalExecutionAncestor(node) {
  if (
    ts.isIfStatement(node) ||
    ts.isConditionalExpression(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isCaseClause(node) ||
    ts.isDefaultClause(node) ||
    ts.isTryStatement(node) ||
    ts.isCatchClause(node)
  ) {
    return true;
  }
  return (
    ts.isBinaryExpression(node) &&
    (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    )
  );
}

function isAncestorOf(ancestor, node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

function earlierReturns(sourceFile, fn, hookNode) {
  const hookStart = hookNode.getStart(sourceFile);
  const found = [];
  function visit(node) {
    if (node !== fn && isFunctionBoundary(node)) return;
    if (
      ts.isReturnStatement(node) &&
      node.getStart(sourceFile) < hookStart &&
      !isAncestorOf(node, hookNode)
    ) {
      found.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  }
  if (fn.body) visit(fn.body);
  return found;
}

function location(sourceFile, node) {
  const point = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: point.line + 1, column: point.character + 1 };
}

export function analyzeSource(source, fileName = "inline.tsx") {
  const scriptKind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const violations = [];

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const hook = callHookName(node.expression);
      if (hook) {
        const fn = nearestFunction(node);
        const at = location(sourceFile, node);

        if (!fn) {
          violations.push({
            ...at,
            hook,
            code: "hook-outside-function",
            message: `${hook} is called outside a function boundary`,
          });
        } else {
          for (let current = node.parent; current && current !== fn; current = current.parent) {
            if (isConditionalExecutionAncestor(current)) {
              violations.push({
                ...at,
                hook,
                code: "conditional-hook",
                message: `${hook} is conditionally executed inside ${ts.SyntaxKind[current.kind]}`,
              });
              break;
            }
          }

          const returns = earlierReturns(sourceFile, fn, node);
          if (returns.length > 0) {
            const first = location(sourceFile, returns[0]);
            violations.push({
              ...at,
              hook,
              code: "hook-after-return",
              message: `${hook} can execute after an earlier return at ${first.line}:${first.column}`,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function sourceFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !entry.name.endsWith(".d.ts")
      ) {
        files.push(full);
      }
    }
  }
  walk(root);
  return files.sort();
}

export function checkTree(root) {
  const failures = [];
  const files = sourceFiles(root);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const violation of analyzeSource(source, file)) {
      failures.push({ file, ...violation });
    }
  }
  return { files, failures };
}

function main() {
  const root = path.resolve(process.cwd(), "src");
  const { files, failures } = checkTree(root);
  if (failures.length > 0) {
    for (const item of failures) {
      console.error(
        `${path.relative(process.cwd(), item.file)}:${item.line}:${item.column} ${item.code} ${item.message}`,
      );
    }
    console.error(`REACT_HOOK_ORDER=FAIL violations=${failures.length} files=${files.length}`);
    process.exitCode = 1;
    return;
  }
  console.log(`REACT_HOOK_ORDER=PASS files=${files.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
