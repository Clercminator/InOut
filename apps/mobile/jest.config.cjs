module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@inout/(.*)$": "<rootDir>/../../packages/$1/src/index.ts",
  },
};
