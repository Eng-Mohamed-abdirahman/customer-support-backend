/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  setupFiles: ["<rootDir>/test/setup/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/setup/db.ts"],
  testTimeout: 30000,
  collectCoverageFrom: ["src/**/*.ts", "!src/scripts/**", "!src/**/*.d.ts"],
};
