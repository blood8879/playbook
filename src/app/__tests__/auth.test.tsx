import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import LoginPage from "../login/page";
import SignupPage from "../signup/page";
import supabase from "@/lib/supabase/client";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    getSession: jest.fn(),
  },
}));

describe("인증 테스트", () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("로그인 페이지", () => {
    it("로그인 폼이 정상적으로 렌더링되어야 함", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /로그인/i })
      ).toBeInTheDocument();
    });

    it("유효하지 않은 이메일 입력시 에러 메시지가 표시되어야 함", async () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/이메일/i);
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(
          screen.getByText(/이메일 형식이 올바르지 않습니다/i)
        ).toBeInTheDocument();
      });
    });

    it("로그인 성공시 대시보드로 리다이렉트되어야 함", async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: "test-id" } },
        error: null,
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/이메일/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/비밀번호/i), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /로그인/i }));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("회원가입 페이지", () => {
    it("회원가입 폼이 정상적으로 렌더링되어야 함", () => {
      render(<SignupPage />);

      expect(screen.getByLabelText(/이름/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^비밀번호$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호 확인/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /회원가입/i })
      ).toBeInTheDocument();
    });

    it("비밀번호가 일치하지 않을 경우 에러 메시지가 표시되어야 함", async () => {
      render(<SignupPage />);

      const [passwordInput, confirmPasswordInput] =
        screen.getAllByLabelText(/비밀번호/i);

      fireEvent.change(passwordInput, {
        target: { value: "password123" },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: "password456" },
      });

      fireEvent.click(screen.getByRole("button", { name: /회원가입/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/비밀번호가 일치하지 않습니다/i)
        ).toBeInTheDocument();
      });
    });

    it("회원가입 성공시 로그인 페이지로 리다이렉트되어야 함", async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: "test-id" } },
        error: null,
      });

      render(<SignupPage />);

      fireEvent.change(screen.getByLabelText(/이름/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/이메일/i), {
        target: { value: "test@example.com" },
      });

      const [passwordInput, confirmPasswordInput] =
        screen.getAllByLabelText(/비밀번호/i);

      fireEvent.change(passwordInput, {
        target: { value: "password123" },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /회원가입/i }));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          "/login?message=회원가입이 완료되었습니다. 로그인해주세요."
        );
      });
    });
  });

  describe("세션 유지 테스트", () => {
    it("세션이 유효할 경우 보호된 라우트에 접근 가능해야 함", async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: { user: { id: "test-id" } } },
        error: null,
      });

      // 세션 체크 로직 테스트
      const response = await fetch("/api/auth/session");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user).toBeDefined();
    });

    it("세션이 만료된 경우 로그인 페이지로 리다이렉트되어야 함", async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      // 보호된 라우트 접근 시도
      const response = await fetch("/dashboard");
      expect(response.redirected).toBe(true);
      expect(response.url).toContain("/login");
    });
  });
});
