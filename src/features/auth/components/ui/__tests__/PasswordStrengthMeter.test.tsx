import { render, screen } from "@testing-library/react";
import { PasswordStrengthMeter, getPasswordStrengthLevel } from "../PasswordStrengthMeter";

describe("getPasswordStrengthLevel", () => {
  it("returns 0 for an empty password", () => {
    expect(getPasswordStrengthLevel("")).toBe(0);
  });

  it("returns 1 for a short/weak password", () => {
    expect(getPasswordStrengthLevel("abc")).toBe(1);
  });

  it("returns 2 for a medium password (length + 2 char classes)", () => {
    expect(getPasswordStrengthLevel("abcdefgh12")).toBe(2);
  });

  it("returns 3 for a strong password (lower+upper+num, length>=8)", () => {
    expect(getPasswordStrengthLevel("Abcdef12")).toBe(3);
  });

  it("returns 4 for a very strong password (all classes, length>=10)", () => {
    expect(getPasswordStrengthLevel("Abcdef1234@")).toBe(4);
  });
});

describe("PasswordStrengthMeter", () => {
  it("renders nothing when the password is empty", () => {
    render(<PasswordStrengthMeter password="" />);
    expect(screen.queryByTestId("password-strength-meter")).not.toBeInTheDocument();
  });

  it("renders level 1 (Fraca) with an expense-colored first segment", () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument();
    expect(screen.getByText("Fraca")).toBeInTheDocument();
    expect(screen.getByTestId("strength-segment-1")).toHaveClass("bg-finance-expense");
    expect(screen.getByTestId("strength-segment-2")).toHaveClass("bg-outline");
  });

  it("renders level 2 (Média) with a recurring-colored bar", () => {
    render(<PasswordStrengthMeter password="abcdefgh12" />);
    expect(screen.getByText("Média")).toBeInTheDocument();
    expect(screen.getByTestId("strength-segment-2")).toHaveClass("bg-finance-recurring");
  });

  it("renders level 3 (Forte) with brand-primary colors", () => {
    render(<PasswordStrengthMeter password="Abcdef12" />);
    expect(screen.getByText("Forte")).toBeInTheDocument();
    expect(screen.getByTestId("strength-segment-3")).toHaveClass("bg-brand-primary");
    expect(screen.getByText("Forte")).toHaveClass("text-primary");
  });

  it("renders level 4 (Muito Forte) with income colors", () => {
    render(<PasswordStrengthMeter password="Abcdef1234@" />);
    expect(screen.getByText("Muito Forte")).toBeInTheDocument();
    expect(screen.getByTestId("strength-segment-4")).toHaveClass("bg-finance-income");
    expect(screen.getByText("Muito Forte")).toHaveClass("text-finance-income");
  });
});
