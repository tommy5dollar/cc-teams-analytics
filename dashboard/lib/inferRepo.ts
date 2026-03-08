// Bump this when extraction logic changes — triggers backfill of stale rows
export const LOGIC_VERSION = 1;

export interface RepoGuess {
  repo: string;
  confidence: "high" | "medium";
}

type Candidate = { repo: string; confidence: "high" | "medium" };

// Names that are clearly not repo names
const BLOCKLIST = new Set([
  "home", "code", "workspace", "dev", "src", "projects", "personal", "repos",
  "node_modules", "dist", "build", "test", "tests", "lib", "bin", "tmp",
  "var", "etc", "usr", "opt", "local", "data", "logs", "config", "scripts", "utils",
]);

const DEV_DIRS = ["code", "workspace", "dev", "src", "projects", "personal", "repos"];
const DEV_DIRS_PAT = DEV_DIRS.join("|");

// ── Extractors ────────────────────────────────────────────────────────────────
// Each returns zero or more candidates found in a single command string.

function extractGhRepo(cmd: string): Candidate[] {
  const re = /--repo\s+[^/\s]+\/([^\s)'"]+)/g;
  const results: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    results.push({ repo: m[1], confidence: "high" });
  }
  return results;
}

function extractAbsolutePath(cmd: string): Candidate[] {
  // /home/user/<dev-dir>/[org/]repo-name/
  const re = new RegExp(
    `\\/(?:home|Users)\\/[^/]+\\/(?:${DEV_DIRS_PAT})\\/(?:[^/]+\\/)?([a-z][a-z0-9_-]+)\\/`,
    "gi",
  );
  const results: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    results.push({ repo: m[1], confidence: "high" });
  }
  return results;
}

function extractDockerExec(cmd: string): Candidate[] {
  const re = /docker\s+exec\s+([a-z][a-z0-9-]+-(?:db|api|server|app|postgres|mysql|mongo))\b/g;
  const results: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    results.push({ repo: m[1], confidence: "medium" });
  }
  return results;
}

function extractRepoRootMarkers(cmd: string): Candidate[] {
  // Any path segment immediately before a well-known repo root file/dir
  const markers = [
    // VCS
    "\\.git", "\\.hg", "\\.svn", "\\.gitignore", "\\.gitattributes",
    // Node / JS / TS
    "package\\.json", "package-lock\\.json", "yarn\\.lock", "pnpm-lock\\.yaml",
    "bun\\.lockb", "tsconfig\\.json", "turbo\\.json", "nx\\.json", "lerna\\.json",
    "\\.nvmrc", "\\.node-version",
    // Bundlers / frameworks
    "vite\\.config\\.[tj]s", "next\\.config\\.[tj]s", "nuxt\\.config\\.[tj]s",
    "webpack\\.config\\.[tj]s", "rollup\\.config\\.[tj]s", "remix\\.config\\.[tj]s",
    "angular\\.json",
    // Go
    "go\\.mod", "go\\.sum",
    // Rust
    "Cargo\\.toml", "Cargo\\.lock",
    // Python
    "pyproject\\.toml", "setup\\.py", "setup\\.cfg", "Pipfile", "poetry\\.lock",
    "uv\\.lock", "\\.python-version", "tox\\.ini", "pytest\\.ini",
    // Java / Kotlin / Scala
    "pom\\.xml", "build\\.gradle", "build\\.gradle\\.kts", "gradlew",
    "settings\\.gradle", "settings\\.gradle\\.kts", "build\\.sbt",
    // C# / .NET
    "global\\.json", "nuget\\.config", "NuGet\\.Config", "Directory\\.Build\\.props",
    // C / C++
    "CMakeLists\\.txt", "meson\\.build", "conanfile\\.txt", "vcpkg\\.json",
    "compile_commands\\.json", "configure\\.ac",
    // Ruby
    "Gemfile", "Rakefile", "\\.ruby-version",
    // PHP
    "composer\\.json", "artisan",
    // Swift / mobile
    "Package\\.swift", "Podfile", "pubspec\\.yaml",
    // Elixir
    "mix\\.exs",
    // Haskell
    "stack\\.yaml",
    // Nix
    "flake\\.nix", "shell\\.nix", "default\\.nix",
    // Terraform
    "main\\.tf",
    // CI / generic
    "Makefile", "Dockerfile", "docker-compose\\.yml", "Jenkinsfile",
    "\\.travis\\.yml", "\\.gitlab-ci\\.yml",
    // Docs
    "README\\.md", "README\\.rst", "CHANGELOG\\.md",
  ].join("|");
  const re = new RegExp(`\\/([a-z][a-z0-9_-]+)\\/(?:${markers})(?:\\/|\\b)`, "gi");
  const results: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    results.push({ repo: m[1], confidence: "high" });
  }
  return results;
}

function extractToolPaths(cmd: string): Candidate[] {
  // grep/find/cat/ls … /<dev-dir>/[org/]repo-name/
  const re = new RegExp(
    `(?:grep|find|cat|ls)\\s+.*?\\/(?:${DEV_DIRS_PAT})\\/(?:[^/]+\\/)?([a-z][a-z0-9_-]+)\\/`,
    "gi",
  );
  const results: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    results.push({ repo: m[1], confidence: "medium" });
  }
  return results;
}

const EXTRACTORS: ((cmd: string) => Candidate[])[] = [
  extractGhRepo,
  extractRepoRootMarkers,
  extractAbsolutePath,
  extractDockerExec,
  extractToolPaths,
];

// ── Scoring ───────────────────────────────────────────────────────────────────

export function inferRepo(commands: string[]): RepoGuess | null {
  const scores = new Map<string, { score: number; confidence: "high" | "medium" }>();

  for (const cmd of commands) {
    for (const extractor of EXTRACTORS) {
      for (const { repo, confidence } of extractor(cmd)) {
        const candidate = repo.toLowerCase().replace(/\/$/, "").trim();
        if (!candidate || BLOCKLIST.has(candidate) || candidate.length < 3) continue;

        const weight = confidence === "high" ? 2 : 1;
        const existing = scores.get(candidate);
        if (existing) {
          existing.score += weight;
          if (confidence === "high") existing.confidence = "high";
        } else {
          scores.set(candidate, { score: weight, confidence });
        }
      }
    }
  }

  if (scores.size === 0) return null;

  // Pick highest score; break ties by preferring high confidence
  const [repo, { confidence }] = [...scores.entries()].sort(([, a], [, b]) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.confidence === "high" ? -1 : 1;
  })[0];

  return { repo, confidence };
}
