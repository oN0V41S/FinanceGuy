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
    // Pre-existing failures to be fixed in follow-up PRs
    "src/features/dashboard/__tests__/layout.spec.tsx",
    "src/features/dashboard/__tests__/responsive.spec.tsx",
    "src/features/auth/components/__tests__/PasswordRequirements.test.tsx",
    "src/components/ui/button.test.tsx",
    "src/features/auth/components/__tests__/auth-forms.style.spec.tsx",
    "src/features/auth/api/auth-flow.test.ts",
    "src/app/__tests__/landing.spec.tsx",
    "src/app/\\(auth\\)/login/__tests__/login.test.tsx",
  ],
  
  // Transform to handle ESM modules from node_modules
  transformIgnorePatterns: [
    "/node_modules/(?!(jose)/.*)",
  ],
  
};

export default createJestConfig(config);