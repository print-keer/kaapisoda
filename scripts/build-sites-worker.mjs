import { mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });

await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    const fallback = new Request(new URL("/", url.origin), request);
    return env.ASSETS.fetch(fallback);
  }
};
`,
  "utf8"
);
