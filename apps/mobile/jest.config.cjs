module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@inout/(.*)$": "<rootDir>/../../packages/$1/src/index.ts",
  },
};
