import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0.0";
const JIRA_KEY = /^OR-\d+$/;

export function normalizeJiraKey(value) {
  const key = String(value ?? "").trim().toUpperCase();
  if (!JIRA_KEY.test(key)) {
    throw new TypeError("Expected Jira key in the form OR-123");
  }
  return key;
}

export function chatgptUrlForJira(value) {
  const url = new URL("https://chatgpt.com/");
  url.searchParams.set("prompt", normalizeJiraKey(value));
  return url.toString();
}

export function handleRequest(req, res) {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");

  if (requestUrl.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ service: "orchy-ui", version: VERSION, role: "jira-chatgpt-launcher" }));
    return;
  }

  let key = requestUrl.searchParams.get("key");
  const pathMatch = requestUrl.pathname.match(/^\/jira\/(OR-\d+)$/i);
  if (pathMatch) key = pathMatch[1];

  if (key) {
    try {
      const location = chatgptUrlForJira(key);
      res.writeHead(302, { location, "cache-control": "no-store" });
      res.end();
    } catch {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Invalid Jira key. Expected OR-123.\n");
    }
    return;
  }

  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({
    service: "orchy-ui",
    version: VERSION,
    purpose: "Redirect a Jira OR key to ChatGPT with the key populated",
    usage: ["/jira/OR-601", "/?key=OR-601"]
  }));
}

export function createServer() {
  return http.createServer(handleRequest);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.PORT || "10000");
  createServer().listen(port, "0.0.0.0", () => {
    process.stdout.write(`orchy-ui ${VERSION} listening on ${port}\n`);
  });
}
