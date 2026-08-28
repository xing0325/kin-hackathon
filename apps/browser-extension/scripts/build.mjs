import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const firefox = path.join(root, "dist-firefox");

for (const target of [dist, firefox]) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const item of ["popup.html", "popup.css", "src"]) await cp(path.join(root, item), path.join(target, item), { recursive: true });
}

const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const chromeManifest = structuredClone(manifest);
delete chromeManifest.background.scripts;
delete chromeManifest.browser_specific_settings;
await writeFile(path.join(dist, "manifest.json"), JSON.stringify(chromeManifest, null, 2) + "\n");

const firefoxManifest = structuredClone(manifest);
delete firefoxManifest.background.service_worker;
await writeFile(path.join(firefox, "manifest.json"), JSON.stringify(firefoxManifest, null, 2) + "\n");

const xpi = path.join(root, "kin-conversation-collector-firefox.xpi");
await rm(xpi, { force: true });
execFileSync("zip", ["-qr", xpi, "."], { cwd: firefox });

console.log("BUILD_RESULT chrome=dist firefox=dist-firefox xpi=kin-conversation-collector-firefox.xpi");
