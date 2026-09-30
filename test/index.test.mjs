import assert from "node:assert/strict";
import test from "node:test";
import { chatgptUrlForJira, createServer, normalizeJiraKey, VERSION } from "../src/index.mjs";

test("normalizes valid Jira keys", () => {
  assert.equal(normalizeJiraKey(" or-601 "), "OR-601");
});

test("rejects keys outside Orchy Jira", () => {
  assert.throws(() => normalizeJiraKey("ABC-1"), /OR-123/);
  assert.throws(() => normalizeJiraKey("OR-x"), /OR-123/);
});

test("builds canonical ChatGPT prompt URL", () => {
  assert.equal(chatgptUrlForJira("OR-601"), "https://chatgpt.com/?prompt=OR-601");
});

test("HTTP redirect carries only the Jira key", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/jira/or-601`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://chatgpt.com/?prompt=OR-601");
});

test("health endpoint exposes implementation version", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.version, VERSION);
  assert.equal(body.role, "jira-chatgpt-launcher");
});
