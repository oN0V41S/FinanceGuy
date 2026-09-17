/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";
import { resetPasswordAction } from "../actions";
import '@testing-library/jest-dom';

jest.mock("../actions", () => ({
  resetPasswordAction: jest.fn(),
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

jest.mock("@/features/auth/components/ui/ValidatedInput", () => ({
  ValidatedInput: (props: any) => <input data-testid={props.id} {...props} />,
}));

jest.mock("@/features/auth/components/ui/FormAlert", () => ({
  FormAlert: ({ type, message }: { type?: string; message: string }) =>
    message ? <div data-testid={`alert-${type}`}>{message}</div> : null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams("token=test-token"),
}));

const mockResetPasswordAction = resetPasswordAction as jest.MockedFunction<typeof resetPasswordAction>;

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("should render password and confirm password fields", () => {
      render(<ResetPasswordPage />);
      expect(screen.getByTestId("reset-password")).toBeInTheDocument();
      expect(screen.getByTestId("reset-confirmPassword")).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<ResetPasswordPage />);
      expect(screen.getByRole("button", { name: /Redefinir senha/i })).toBeInTheDocument();
    });

    it("should render password requirements", () => {
      render(<ResetPasswordPage />);
      expect(screen.getByTestId("password-requirement-length")).toBeInTheDocument();
    });

    it("should render submit button disabled when password is invalid", () => {
      render(<ResetPasswordPage />);
      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Password Validation", () => {
    it("should enable submit button when passwords match and are valid", async () => {
      mockResetPasswordAction.mockResolvedValue({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByTestId("reset-password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      const confirmInput = screen.getByTestId("reset-confirmPassword") as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Token Error", () => {
    it("should display token invalid error when resetPasswordAction returns error", async () => {
      mockResetPasswordAction.mockResolvedValue({ error: "Token inválido ou expirado" });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByTestId("reset-password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      const confirmInput = screen.getByTestId("reset-confirmPassword") as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Token inválido ou expirado")).toBeInTheDocument();
      });
    });
  });

  describe("Success", () => {
    it("should display success message on successful password reset", async () => {
      mockResetPasswordAction.mockResolvedValue({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByTestId("reset-password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      const confirmInput = screen.getByTestId("reset-confirmPassword") as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Senha redefinida com sucesso!")).toBeInTheDocument();
      });
    });

    it("should display success alert when password reset succeeds", async () => {
      mockResetPasswordAction.mockResolvedValue({ success: true });
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByTestId("reset-password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      const confirmInput = screen.getByTestId("reset-confirmPassword") as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("alert-success")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading state on submit", async () => {
      mockResetPasswordAction.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByTestId("reset-password") as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      const confirmInput = screen.getByTestId("reset-confirmPassword") as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
