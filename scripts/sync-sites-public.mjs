import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(projectRoot, "public", "piksel");
const files = ["index.html", "styles.css", "manifest.webmanifest", "sw.js", "assets", "src"];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const file of files) {
  await cp(path.join(projectRoot, file), path.join(target, file), { recursive: true });
}

console.log("Prepared the Piksel static app for the Sites wrapper.");
