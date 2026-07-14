/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { loginAction } from "@/features/auth/actions/loginAction";
import type { LoginInput } from "@/features/auth/schemas/auth.schema";

// Mock dependencies
jest.mock("@/features/auth/actions/loginAction", () => ({
  loginAction: jest.fn(),
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

describe("LoginForm", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLoginAction = loginAction as jest.MockedFunction<typeof loginAction>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("should render email and password input fields", () => {
      render(<LoginForm />);

      expect(screen.getByTestId("email")).toBeInTheDocument();
      expect(screen.getByTestId("password")).toBeInTheDocument();
    });

    it("should render submit button with correct text", () => {
      render(<LoginForm />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveTextContent("Entrar");
    });

    it("should render labels for email and password fields", () => {
      render(<LoginForm />);

      expect(screen.getByTestId("label-email")).toBeInTheDocument();
      expect(screen.getByTestId("label-password")).toBeInTheDocument();
    });

    it("should have correct input types", () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(passwordInput).toHaveAttribute("type", "password");

      // Native HTML5 validation contract: both fields are required.
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("required");
    });
  });

  describe("Native HTML5 Validation (setCustomValidity bubble)", () => {
    it("should show native validation for an invalid email after blur", async () => {
      render(<LoginForm />);

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

    it("should show native validation for an empty password after blur", async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "x" } });
      fireEvent.change(passwordInput, { target: { value: "" } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        // The field is required (native contract).
        expect(passwordInput).toHaveAttribute("required");
        // The native bubble carries OUR Portuguese required message.
        expect(passwordInput.validationMessage).toBe("Senha é obrigatória");
        expect(passwordInput.checkValidity()).toBe(false);
      });
    });
  });

  describe("Server Error Display", () => {
    it("should display server error when loginAction returns error", async () => {
      mockLoginAction.mockResolvedValue({ error: "Credenciais inválidas!" } as any);

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Credenciais inválidas!")).toBeInTheDocument();
      });
    });

    it("should display generic server error", async () => {
      mockLoginAction.mockResolvedValue({ error: "Algo deu errado!" } as any);

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Algo deu errado!")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading text while submitting", async () => {
      // Create a promise that we can control to keep the form in loading state
      let resolveLoginAction: (value: { error?: string } | undefined) => void;
      const loginPromise = new Promise<{ error?: string } | undefined>((resolve) => {
        resolveLoginAction = resolve;
      });
      mockLoginAction.mockReturnValue(loginPromise as any);

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      
      // Click submit and don't wait for it to resolve
      const submitPromise = Promise.resolve(fireEvent.click(submitButton));
      
      // Check loading state immediately after click
      await waitFor(() => {
        expect(screen.getByTestId("submit-button")).toHaveTextContent("Entrando...");
      });
      
      // Resolve the login action
      resolveLoginAction!({ error: "" });
      await submitPromise;
    });

    it("should disable submit button while loading", async () => {
      let resolveLoginAction: (value: { error?: string } | undefined) => void;
      const loginPromise = new Promise<{ error?: string } | undefined>((resolve) => {
        resolveLoginAction = resolve;
      });
      mockLoginAction.mockReturnValue(loginPromise as any);

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      
      const submitPromise = Promise.resolve(fireEvent.click(submitButton));
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      resolveLoginAction!({ error: "" });
      await submitPromise;
    });
  });

  describe("Form Submission", () => {
    it("should call loginAction with correct data on submit", async () => {
      mockLoginAction.mockResolvedValue(undefined as any);

      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      const passwordInput = screen.getByTestId("password");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoginAction).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "Password123!",
        });
      });
    });

    it("should not call loginAction when form has validation errors", async () => {
      mockLoginAction.mockResolvedValue(undefined as any);

      render(<LoginForm />);

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLoginAction).not.toHaveBeenCalled();
      });
    });

  // Note: The LoginForm component does not automatically clear server errors on successful submission.
  // The error state persists until a new error is returned.
  });

  describe("ValidatedInput integration", () => {
    it("should show an invalid status icon for an invalid email", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      fireEvent.change(emailInput, { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
      });
    });

    it("should show a valid status icon and remove the invalid one for a valid email", async () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("email");
      fireEvent.change(emailInput, { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: "a@b.com" } });

      await waitFor(() => {
        expect(screen.getByTestId("field-status-valid")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("field-status-invalid")).not.toBeInTheDocument();
    });

    it("should toggle password visibility via the show/hide button", async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("password");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggle = screen.getByRole("button", { name: "Mostrar senha" });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(screen.getByTestId("password")).toHaveAttribute("type", "text");
      });
      expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();
    });
  });
});
