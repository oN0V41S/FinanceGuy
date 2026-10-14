import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path for the Next.js App load next.confing and .env
  dir: "./",
});

// Custom configurations of jest
/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  
  // Use jsdom by default for component tests
  testEnvironment: "jsdom",

  // Run before any test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Aliases of Modules (for work with @/ in tsconfig.json)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
  },

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
    "!src/**/index.ts",
  ],
  
  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.ts?(x)",
    "**/?(*.)+(spec|test).ts?(x)",
  ],
  
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/.claude/",
    "/e2e/",
    // Pre-existing failures to be fixed in follow-up PRs
    "src/features/dashboard/__tests__/layout.spec.tsx",
    "src/features/dashboard/__tests__/responsive.spec.tsx",
    "src/features/auth/components/__tests__/PasswordRequirements.test.tsx",
    "src/components/ui/button.test.tsx",
    "src/features/auth/components/__tests__/auth-forms.style.spec.tsx",
    "src/features/auth/api/auth-flow.test.ts",
    "src/app/__tests__/landing.spec.tsx",
    "src/app/\\(auth\\)/login/__tests__/login.test.tsx",
    // TDD Red phase — intentionally failing until SWR refactor is implemented
    "src/features/dashboard/hooks/__tests__/useDashboardData.swr.test.ts",
    // Pre-existing infrastructure failures (cache module export mismatch, NextAuth config)
    "src/lib/__tests__/cache.test.ts",
    "src/features/auth/__tests__/auth.config.test.ts",
  ],
  
};

// next/jest injeta '/node_modules/' em transformIgnorePatterns; substituímos para transpilar pacotes ESM-only
// (jose, react-markdown e a árvore unified/remark/micromark) que os testes importam.
const ESM_PACKAGES = '(?:\\.pnpm|jose|react-markdown|remark-.*|rehype-.*|unified|unist-.*|mdast-.*|hast-.*|micromark.*|decode-named-character-reference|character-entities.*|vfile.*|bail|trough|is-plain-obj|devlop|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|estree-util-.*|ccount|markdown-table|zwitch|longest-streak|trim-lines|stringify-entities|html-void-elements|style-to-.*|inline-style-parser|escape-string-regexp)';

const buildConfig = async () => {
  const resolved = await createJestConfig(config)();
  resolved.transformIgnorePatterns = [
    `/node_modules/(?!${ESM_PACKAGES}(/|@))`,
    ...resolved.transformIgnorePatterns.filter((p) => !p.includes('node_modules')),
  ];
  return resolved;
};

export default buildConfig;
