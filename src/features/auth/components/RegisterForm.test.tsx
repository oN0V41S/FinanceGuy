/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { registerAction } from "@/features/auth/actions/registerAction";
import type { RegisterInput } from "@/features/auth/schemas/auth.schema";

// Mock dependencies
jest.mock("@/features/auth/actions/registerAction", () => ({
  registerAction: jest.fn(),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type={type} disabled={disabled} data-testid="submit-button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid={props.id} {...props} />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: React.LabelHTMLAttributes<HTMLLabelElement> & { children: React.ReactNode }) => (
    <label htmlFor={htmlFor} data-testid={htmlFor ? `label-${htmlFor}` : undefined}>
      {children}
    </label>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe("RegisterForm", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRegisterAction = registerAction as jest.MockedFunction<typeof registerAction>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default router mock
    const mockUseRouter = require("next/navigation").useRouter;
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Form Rendering", () => {
    it("should render all input fields (name, nickname, email, password)", () => {
      render(<RegisterForm />);

      expect(screen.getByTestId("name")).toBeInTheDocument();
      expect(screen.getByTestId("nickname")).toBeInTheDocument();
      expect(screen.getByTestId("email")).toBeInTheDocument();
      expect(screen.getByTestId("password")).toBeInTheDocument();
    });

    it("should render submit button with correct text", () => {
      render(<RegisterForm />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveTextContent("Criar conta");
    });

    it("should render labels for all fields", () => {
      render(<RegisterForm />);

      expect(screen.getByTestId("label-name")).toBeInTheDocument();
      expect(screen.getByTestId("label-nickname")).toBeInTheDocument();
      expect(screen.getByTestId("label-email")).toBeInTheDocument();
      expect(screen.getByTestId("label-password")).toBeInTheDocument();
    });

    it("should have correct input types for each field", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");

      // Email and password have explicit types set in the component
      expect(emailInput).toHaveAttribute("type", "email");
      expect(passwordInput).toHaveAttribute("type", "password");

      // Native HTML5 validation contract: email, password and confirm are required,
      // and password enforces a minimum length.
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("required");
      expect(confirmInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("minlength", "8");

      // Name and nickname don't have explicit type attributes in the component
      // They default to text type in the browser
      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      expect(nameInput).toBeInTheDocument();
      expect(nicknameInput).toBeInTheDocument();
    });

    it("should have empty initial state (no error or success messages)", () => {
      render(<RegisterForm />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/sucesso/i)).not.toBeInTheDocument();
    });
  });

  describe("Validation Errors - Name Field", () => {
    it("should show validation error for empty name on submit", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      // Fill valid data to enable submit button (password must be valid)
      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.submit(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nome deve ter pelo menos 2 caracteres")).toBeInTheDocument();
      });
    });

    it("should show validation error for name with less than 2 characters", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.submit(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nome deve ter pelo menos 2 caracteres")).toBeInTheDocument();
      });
    });
  });

  describe("Validation Errors - Nickname Field", () => {
    it("should show validation error for empty nickname on submit", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.submit(submitButton);

      await waitFor(() => {
        expect(screen.getByText("O apelido é obrigatório")).toBeInTheDocument();
      });
    });

    it("should show validation error for nickname with less than 2 characters", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "B" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.submit(submitButton);

      await waitFor(() => {
        expect(screen.getByText("O apelido é obrigatório")).toBeInTheDocument();
      });
    });
  });

  describe("Native HTML5 Validation - Email Field (setCustomValidity bubble)", () => {
    it("should show native validation for an invalid email after blur", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("email") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "gmail" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        // The status icon still reflects the Zod error...
        expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
        // ...and the BROWSER native bubble must carry OUR Portuguese text.
        expect(emailInput.validationMessage).toBe("Email inválido");
        expect(emailInput.checkValidity()).toBe(false);
      });
    });
  });

  describe("Validation Errors - Password Field", () => {
    const expectPasswordInvalid = async (value: string) => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      fireEvent.change(passwordInput, { target: { value } });
      await waitFor(() => {
        expect(
          within(passwordInput.parentElement as HTMLElement).getByTestId("field-status-invalid")
        ).toBeInTheDocument();
      });
    };

    it("should show validation error for empty password", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      // An empty string isn't a "change" from the initial empty value, so RHF
      // won't validate. A single space is an effectively-empty password that
      // still triggers the min(8) validation error.
      await expectPasswordInvalid(" ");
    });

    it("should show validation error for password with less than 8 characters", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      await expectPasswordInvalid("Pass1!");
    });

    it("should show validation error for password without uppercase", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      await expectPasswordInvalid("password1!");
    });

    it("should show validation error for password without lowercase", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      await expectPasswordInvalid("PASSWORD1!");
    });

    it("should show validation error for password without numbers", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      await expectPasswordInvalid("Password!");
    });

    it("should show validation error for password without special character", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);
      await expectPasswordInvalid("Password123");
    });
  });

  describe("Multiple Validation Errors", () => {
    it("should show multiple validation errors when submitting invalid form", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");

      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(nicknameInput, { target: { value: "B" } });
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.change(passwordInput, { target: { value: "weak" } });
      fireEvent.change(confirmInput, { target: { value: "different" } });

      await waitFor(() => {
        expect(screen.getByText("Nome deve ter pelo menos 2 caracteres")).toBeInTheDocument();
        expect(screen.getByText("O apelido é obrigatório")).toBeInTheDocument();
        // NOTE: email no longer renders a below-field FormError paragraph; the
        // native HTML5 bubble carries the "Email inválido" message instead.
        expect(
          within(passwordInput.parentElement as HTMLElement).getByTestId("field-status-invalid")
        ).toBeInTheDocument();
        expect(
          within(confirmInput.parentElement as HTMLElement).getByTestId("field-status-invalid")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Server Error Display", () => {
    it("should display server error when registerAction returns error", async () => {
      mockRegisterAction.mockResolvedValue({ error: "Este email já está cadastrado!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Este email já está cadastrado!")).toBeInTheDocument();
      });
    });

    it("should display generic server error", async () => {
      mockRegisterAction.mockResolvedValue({ error: "Algo deu errado ao criar a conta!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Algo deu errado ao criar a conta!")).toBeInTheDocument();
      });
    });

    it("should not display success message when server returns error", async () => {
      mockRegisterAction.mockResolvedValue({ error: "Erro!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/conta criada/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Success Message Display", () => {
    it("should display success message when registerAction returns success", async () => {
      mockRegisterAction.mockResolvedValue({ success: "Conta criada com sucesso! Redirecionando..." } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Conta criada com sucesso! Redirecionando...")).toBeInTheDocument();
      });
    });

    it("should not display error message when server returns success", async () => {
      mockRegisterAction.mockResolvedValue({ success: "Sucesso!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading text while submitting", async () => {
      let resolveRegisterAction: (value: { error?: string; success?: string } | undefined) => void;
      const registerPromise = new Promise<{ error?: string; success?: string } | undefined>((resolve) => {
        resolveRegisterAction = resolve;
      });
      mockRegisterAction.mockReturnValue(registerPromise as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });

      const submitPromise = Promise.resolve(fireEvent.click(submitButton));

      await waitFor(() => {
        expect(screen.getByTestId("submit-button")).toHaveTextContent("Criando conta...");
      });

      resolveRegisterAction!({ success: "Sucesso!" });
      await submitPromise;
    });

    it("should disable submit button while loading", async () => {
      let resolveRegisterAction: (value: { error?: string; success?: string } | undefined) => void;
      const registerPromise = new Promise<{ error?: string; success?: string } | undefined>((resolve) => {
        resolveRegisterAction = resolve;
      });
      mockRegisterAction.mockReturnValue(registerPromise as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });

      const submitPromise = Promise.resolve(fireEvent.click(submitButton));

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      resolveRegisterAction!({ success: "Sucesso!" });
      await submitPromise;
    });

    it("should re-enable submit button after submission completes", async () => {
      mockRegisterAction.mockResolvedValue({ success: "Sucesso!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("submit-button")).not.toBeDisabled();
      });
      expect(screen.getByTestId("submit-button")).toHaveTextContent("Criar conta");
    });
  });

  describe("Form Submission", () => {
    it("should call registerAction with correct data on submit", async () => {
      mockRegisterAction.mockResolvedValue({ success: "Sucesso!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).toHaveBeenCalledWith({
          name: "John Doe",
          nickname: "johnd",
          email: "test@example.com",
          password: "Password123!",
          confirmPassword: "Password123!",
        });
      });
    });

    it("should not call registerAction when form has validation errors", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).not.toHaveBeenCalled();
      });
    });

    it("should not call registerAction with invalid email", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("Router Redirect on Success", () => {
    it("should redirect to /login after 2 seconds on success", async () => {
      mockRegisterAction.mockResolvedValue({ success: "Conta criada!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).toHaveBeenCalled();
      });

      // Router push should not have been called yet (not enough time passed)
      expect(mockRouterPush).not.toHaveBeenCalled();

      // Fast-forward time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Now router.push should have been called with /login
      expect(mockRouterPush).toHaveBeenCalledWith("/login");
    });

    it("should not redirect to /login on error", async () => {
      mockRegisterAction.mockResolvedValue({ error: "Erro!" } as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).toHaveBeenCalled();
      });

      // Fast-forward time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Router.push should not have been called
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it("should not redirect to /login when registerAction returns undefined", async () => {
      mockRegisterAction.mockResolvedValue(undefined as any);

      render(<RegisterForm />);

      const nameInput = screen.getByTestId("name");
      const nicknameInput = screen.getByTestId("nickname");
      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(nicknameInput, { target: { value: "johnd" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterAction).toHaveBeenCalled();
      });

      // Fast-forward time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Router.push should not have been called
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe("Field Status & Visual Feedback", () => {
    it("should show field-status-invalid for an invalid email", async () => {
      render(<RegisterForm />);
      const emailInput = screen.getByTestId("email");
      fireEvent.change(emailInput, { target: { value: "not-an-email" } });
      await waitFor(() => {
        expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
      });
    });

    it("should show field-status-valid for a valid email", async () => {
      render(<RegisterForm />);
      const emailInput = screen.getByTestId("email");
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      await waitFor(() => {
        expect(screen.getByTestId("field-status-valid")).toBeInTheDocument();
      });
    });

    it("should show field-status-invalid for a weak password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      fireEvent.change(passwordInput, { target: { value: "weak" } });
      await waitFor(() => {
        expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
      });
    });

    it("should show field-status-valid for a strong password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      await waitFor(() => {
        expect(screen.getByTestId("field-status-valid")).toBeInTheDocument();
      });
    });

    it("should render a password toggle that switches the input type to text", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      const toggle = screen.getByRole("button", { name: "Mostrar senha" });
      expect(toggle).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");

      fireEvent.click(toggle);
      expect(screen.getByTestId("password")).toHaveAttribute("type", "text");
    });

    it("should reveal a password strength meter with 4 segments when typing a password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });

      const meter = await screen.findByTestId("password-strength-meter");
      expect(meter).toBeInTheDocument();
      expect(screen.getByTestId("strength-segment-1")).toBeInTheDocument();
      expect(screen.getByTestId("strength-segment-2")).toBeInTheDocument();
      expect(screen.getByTestId("strength-segment-3")).toBeInTheDocument();
      expect(screen.getByTestId("strength-segment-4")).toBeInTheDocument();
      expect(meter).toHaveTextContent("Muito Forte");
    });

    it("should show field-status-invalid for a mismatching confirm password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Different123!" } });

      const wrapper = confirmInput.parentElement as HTMLElement;
      await waitFor(() => {
        expect(within(wrapper).getByTestId("field-status-invalid")).toBeInTheDocument();
      });
    });

    it("should set native invalid validity on a mismatching confirm password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password") as HTMLInputElement;
      const confirmInput = screen.getByTestId("confirmPassword") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Different123!" } });

      const wrapper = confirmInput.parentElement as HTMLElement;
      await waitFor(() => {
        // The status icon reflects the mismatch...
        expect(within(wrapper).getByTestId("field-status-invalid")).toBeInTheDocument();
        // ...and the native bubble must carry OUR Portuguese mismatch message.
        expect(confirmInput.checkValidity()).toBe(false);
        expect(confirmInput.validationMessage).toBe("As senhas não coincidem");
      });
    });

    it("should show field-status-valid for a matching confirm password", async () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByTestId("password");
      const confirmInput = screen.getByTestId("confirmPassword");
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const wrapper = confirmInput.parentElement as HTMLElement;
      await waitFor(() => {
        expect(within(wrapper).getByTestId("field-status-valid")).toBeInTheDocument();
      });
    });
  });
});
