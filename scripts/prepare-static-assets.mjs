import { copyFile, mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });

await Promise.all([
  copyFile("index.html", "public/kaapisoda.html"),
  copyFile("style.css", "public/style.css"),
  copyFile("app.js", "public/app.js"),
  copyFile("config.js", "public/config.js"),
]);
