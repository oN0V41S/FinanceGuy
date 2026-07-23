import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LoginForm } from "../LoginForm";
import { RegisterForm } from "../RegisterForm";

describe("AuthForms Design System Styling Tests", () => {
  describe("LoginForm", () => {
    it("verifies email input uses design tokens (h-12, px-4, rounded-xl)", () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/endereço de e-mail/i);
      expect(emailInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies password input uses design tokens", () => {
      render(<LoginForm />);
      const passwordInput = screen.getByLabelText(/senha/i);
      expect(passwordInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies labels use text-foreground font-medium", () => {
      render(<LoginForm />);
      const emailLabel = screen.getByLabelText(/endereço de e-mail/i);
      expect(emailLabel.closest("label")).toHaveClass("text-foreground", "font-medium");
    });

    it("verifies submit button uses bg-primary text-primary-foreground", () => {
      render(<LoginForm />);
      const submitButton = screen.getByRole("button", { name: /entrar na conta/i });
      expect(submitButton).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("verifies button uses w-full h-12 rounded-xl", () => {
      render(<LoginForm />);
      const submitButton = screen.getByRole("button", { name: /entrar na conta/i });
      expect(submitButton).toHaveClass("w-full", "h-12", "rounded-xl");
    });

    it("verifies inputs use surface and outline tokens (no hardcoded colors)", () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/endereço de e-mail/i);
      expect(emailInput).toHaveClass("border", "border-outline", "bg-background");
    });
  });

  describe("RegisterForm", () => {
    it("verifies all inputs use design tokens (h-12, px-4, rounded-xl)", () => {
      render(<RegisterForm />);
      const nameInput = screen.getByLabelText(/nome completo/i);
      expect(nameInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies nickname input uses design tokens", () => {
      render(<RegisterForm />);
      const nicknameInput = screen.getByLabelText(/apelido/i);
      expect(nicknameInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies email input uses design tokens", () => {
      render(<RegisterForm />);
      const emailInput = screen.getByLabelText(/endereço de e-mail/i);
      expect(emailInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies password input uses design tokens", () => {
      render(<RegisterForm />);
      const passwordInput = screen.getByLabelText(/senha/i);
      expect(passwordInput).toHaveClass("h-12", "px-4", "rounded-xl");
    });

    it("verifies labels use text-foreground font-medium", () => {
      render(<RegisterForm />);
      const nameLabel = screen.getByLabelText(/nome completo/i);
      expect(nameLabel.closest("label")).toHaveClass("text-foreground", "font-medium");
    });

    it("verifies submit button uses bg-primary text-primary-foreground", () => {
      render(<RegisterForm />);
      const submitButton = screen.getByRole("button", { name: /criar conta/i });
      expect(submitButton).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("verifies button uses w-full h-12 rounded-xl", () => {
      render(<RegisterForm />);
      const submitButton = screen.getByRole("button", { name: /criar conta/i });
      expect(submitButton).toHaveClass("w-full", "h-12", "rounded-xl");
    });

    it("verifies inputs use surface and outline tokens (no hardcoded colors)", () => {
      render(<RegisterForm />);
      const nameInput = screen.getByLabelText(/nome completo/i);
      expect(nameInput).toHaveClass("border", "border-outline", "bg-background");
    });
  });
});