// bundle-project.js
// Usage: node bundle-project.js [outputFile] [folder1 folder2 ...]
// Example: node bundle-project.js project_bundle.txt client server
import fs from "fs/promises";
import path from "path";

const args = process.argv.slice(2);
const outputFile = args[0] || "project_bundle.txt";
const targets = args.slice(1);
if (targets.length === 0) {
  // default to common folders
  targets.push("client", "server");
}

// Exclude patterns (relative names)
const EXCLUDE = [
  "node_modules",
  ".git",
  ".github",
  ".env",
  ".env.local",
  ".env.*",
  "project_bundle.txt" // prevent self-include
];

function isExcluded(relPath) {
  return EXCLUDE.some((p) => {
    if (p.includes("*")) {
      // simple wildcard support
      const base = p.replace("*", "");
      return relPath.startsWith(base);
    }
    return relPath === p || relPath.startsWith(p + "/") || relPath.includes("/" + p + "/");
  });
}

async function walk(dir, root) {
  let entries = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of list) {
    const res = path.resolve(dir, ent.name);
    const rel = path.relative(root, res).replaceAll("\\", "/");
    if (isExcluded(rel)) continue;
    if (ent.isDirectory()) {
      entries = entries.concat(await walk(res, root));
    } else if (ent.isFile()) {
      // include only text-like files (skip large binaries)
      const ext = path.extname(ent.name).toLowerCase();
      const binaryExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".zip", ".tar", ".gz", ".exe", ".dll"];
      if (binaryExts.includes(ext)) continue;
      entries.push({ path: res, rel });
    }
  }
  return entries;
}

async function bundle() {
  let out = `--- Project bundle generated on ${new Date().toISOString()} ---\n\n`;
  for (const t of targets) {
    const full = path.resolve(t);
    try {
      const stat = await fs.stat(full);
      if (!stat.isDirectory()) {
        console.warn(`[skip] ${t} is not a directory`);
        continue;
      }
    } catch (e) {
      console.warn(`[missing] ${t} (skipping)`);
      continue;
    }

    const files = await walk(full, full);
    // sort by relative path
    files.sort((a, b) => a.rel.localeCompare(b.rel));
    out += `### FOLDER: ${t}\n\n`;
    for (const f of files) {
      try {
        const content = await fs.readFile(f.path, "utf8");
        out += `--- FILE: ${f.rel} ---\n\n`;
        out += content + "\n\n";
      } catch (err) {
        out += `--- FILE: ${f.rel} ---\n\n[Error reading file: ${err.message}]\n\n`;
      }
    }
    out += `\n\n`;
  }

  await fs.writeFile(outputFile, out, "utf8");
  console.log(`✅ Bundle written to ${outputFile} (folders: ${targets.join(", ")})`);
}

bundle().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
