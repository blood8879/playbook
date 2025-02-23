/**
 * @ai_context
 * jest.config.js
 * Jest 테스트 환경 설정
 */

require("dotenv").config({ path: ".env.test" });

module.exports = {
  testEnvironment: "jsdom",
  // 필요 시, setupFilesAfterEnv 에 추가 스크립트를 넣을 수도 있음
  // setupFilesAfterEnv: ["./jest.setup.js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  // watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};