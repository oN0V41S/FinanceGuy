/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MagicLinkLogin } from "@/features/auth/components/MagicLinkLogin";
import { signIn } from "next-auth/react";
import '@testing-library/jest-dom';

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type={type}
      disabled={disabled}
      data-testid={type === "submit" ? "submit-button" : "secondary-button"}
      {...props}
    >
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

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe("MagicLinkLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("should render the Fazer Login por E-mail button initially", () => {
      render(<MagicLinkLogin />);
      expect(screen.getByRole("button", { name: /Fazer Login por E-mail/i })).toBeInTheDocument();
    });

    it("should not show email input initially", () => {
      render(<MagicLinkLogin />);
      expect(screen.queryByLabelText(/endereço de e-mail/i)).not.toBeInTheDocument();
    });
  });

  describe("Email Field Display", () => {
    it("should show email field and Enviar link de acesso button after clicking Fazer Login por E-mail", async () => {
      render(<MagicLinkLogin />);
      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/endereço de e-mail/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Enviar link de acesso/i })).toBeInTheDocument();
    });
  });

  describe("signIn Call", () => {
    it("should call signIn with 'resend' provider and email when submitting", async () => {
      mockSignIn.mockResolvedValue(undefined as any);
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("resend", { email: "test@example.com", redirect: false });
      });
    });
  });

  describe("Confirmation Message", () => {
    it("should show confirmation message after successful send", async () => {
      mockSignIn.mockResolvedValue(undefined as any);
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Verifique seu e-mail para continuar")).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("should display error message when signIn throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Sign in failed"));
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Não foi possível enviar o link. Tente novamente.")).toBeInTheDocument();
      });
    });

    it("should show error alert when signIn fails", async () => {
      mockSignIn.mockRejectedValue(new Error("Sign in failed"));
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("alert-error")).toBeInTheDocument();
      });
    });
  });

  describe("Disabled State", () => {
    it("should have submit button disabled when email is invalid", () => {
      render(<MagicLinkLogin />);
      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when email is valid", async () => {
      mockSignIn.mockResolvedValue(undefined as any);
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "valid@example.com" } });

      await waitFor(() => {
        const submitButton = screen.getByTestId("submit-button");
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Loading State", () => {
    it("should show Enviando text when submitting", async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, error: undefined, status: 200, url: null, code: undefined }), 100)));
      render(<MagicLinkLogin />);

      const toggleButton = screen.getByRole("button", { name: /Fazer Login por E-mail/i });
      fireEvent.click(toggleButton);

      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Enviando...")).toBeInTheDocument();
      });
    });
  });
});
