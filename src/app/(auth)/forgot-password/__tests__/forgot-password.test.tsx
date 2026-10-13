/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "../page";
import { forgotPasswordAction } from "../actions";
import '@testing-library/jest-dom';

jest.mock("../actions", () => ({
  forgotPasswordAction: jest.fn(),
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
  useSearchParams: () => new URLSearchParams(),
}));

const mockForgotPasswordAction = forgotPasswordAction as jest.MockedFunction<typeof forgotPasswordAction>;

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("should render email field and submit button", () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enviar link de redefinição/i })).toBeInTheDocument();
    });

    it("should render email label", () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByLabelText(/endereço de e-mail/i)).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("should not call forgotPasswordAction when email is invalid on submit", async () => {
      render(<ForgotPasswordPage />);
      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(mockForgotPasswordAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("Submission and Success Message", () => {
    it("should show success message on successful submission", async () => {
      mockForgotPasswordAction.mockResolvedValue({ success: true });
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Enviado! Verifique seu e-mail para redefinir a senha./i)).toBeInTheDocument();
      });
    });
  });
});
