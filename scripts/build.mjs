import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const files = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  ".nojekyll",
  "assets",
  "src",
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const file of files) {
  await cp(path.join(projectRoot, file), path.join(outputRoot, file), { recursive: true });
}

const index = await readFile(path.join(outputRoot, "index.html"), "utf8");
if (!index.includes("./src/app.js") || !index.includes("./manifest.webmanifest")) {
  throw new Error("The built page is missing a required Piksel entrypoint.");
}

await writeFile(path.join(outputRoot, "build.txt"), "Piksel static build\n", "utf8");
console.log("Built Piksel into dist/");
