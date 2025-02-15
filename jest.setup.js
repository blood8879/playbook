// 글로벌 fetch 모킹
global.fetch = jest.fn((url) => {
  if (url === "/api/auth/session") {
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ user: { id: "test-id" } }),
    });
  }
  if (url === "/dashboard") {
    return Promise.resolve({
      redirected: true,
      url: "/login",
    });
  }
  return Promise.resolve({
    status: 200,
    json: () => Promise.resolve({}),
  });
});

import "@testing-library/jest-dom";
