#!/usr/bin/env node
/**
 * Static-export + GitHub Pages packager.
 *
 *   npm run deploy:gh                 # Turbopack (default, fastest)
 *   LOW_MEMORY=1 npm run deploy:gh    # webpack (lower peak RAM, slower)
 *
 * 1. works out the base path GitHub Pages will serve the site from
 *    (env PAGES_BASE_PATH wins, otherwise the repo name from `git remote origin`,
 *    otherwise a project-site fallback),
 * 2. runs `next build` with `output: "export"`,
 * 3. moves the generated `out/` folder to `docs/` and drops a `.nojekyll` file,
 *    so GitHub Pages can serve it straight from the branch with no build step.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const FALLBACK_REPO = "itfizz-scroll-hero";

function repoNameFromGit() {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const match = remote.match(/[/:]([^/]+?)(?:\.git)?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const repo = process.env.GITHUB_REPO ?? repoNameFromGit() ?? FALLBACK_REPO;
// A user/org site (<user>.github.io) is served from the root → no base path.
const isUserSite = /\.github\.io$/i.test(repo);
const basePath = process.env.PAGES_BASE_PATH ?? (isUserSite ? "" : `/${repo}`);

console.log(`\n▸ repo        : ${repo}`);
console.log(`▸ base path   : ${basePath || "(root)"}`);

// Turbopack is the fast default; webpack needs noticeably less peak memory,
// which matters on small VMs and low-RAM laptops.
const bundler = process.env.LOW_MEMORY ? ["--webpack"] : [];
console.log(`\n▸ building static export${bundler.length ? " (webpack, low memory)" : ""}…\n`);
execFileSync("npx", ["next", "build", ...bundler], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PAGES_BASE_PATH: basePath },
});

const out = resolve(root, "out");
const docs = resolve(root, "docs");
if (!existsSync(out)) {
  console.error("\n✗ build produced no `out/` folder — is `output: 'export'` still set?");
  process.exit(1);
}

rmSync(docs, { recursive: true, force: true });
renameSync(out, docs);
// GitHub Pages runs Jekyll by default, which would swallow the `_next` folder.
writeFileSync(resolve(docs, ".nojekyll"), "");

console.log(`\n✓ static site written to docs/`);
console.log(`  1. git add docs && git commit -m "build: static export" && git push`);
console.log(`  2. GitHub → Settings → Pages → Source: "Deploy from a branch" → main + /docs\n`);
