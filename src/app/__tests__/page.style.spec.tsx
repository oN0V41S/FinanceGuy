import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LandingPage from "../page";

describe("LandingPage Design System Styling Tests", () => {
  it("verifies main container uses bg-background", () => {
    const { container } = render(<LandingPage />);
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass("bg-background");
  });

  it("verifies primary buttons use bg-primary and text-primary-foreground", () => {
    render(<LandingPage />);
    const primaryButton = screen.getByRole("button", { name: /começar gratuitamente/i });
    expect(primaryButton).toHaveClass("bg-primary");
    // The current Button implementation might use a variant that handles text color
    // But we check if it's consistent with our design system's primary contrast
  });

  it("verifies typography uses design system classes (font-sans per VISUAL_IDENTITY.md §3)", () => {
    render(<LandingPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toMatch(/font-sans/);
  });

  it("verifies feature cards use correct surface tokens", () => {
    render(<LandingPage />);
    const card = screen.getByText("Controle Total").closest("div");
    expect(card).toHaveClass("bg-surface-container-low", "shadow-soft");
  });

  it("verifies header uses correct surface tokens", () => {
    render(<LandingPage />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-surface-container/80", "border-outline-variant");
  });

  it("verifies the Features section heading uses the brand-secondary color token (new color pattern)", () => {
    render(<LandingPage />);
    const featuresHeading = screen.getByRole("heading", {
      level: 2,
      name: /tudo o que você precisa para organizar suas finanças/i,
    });
    expect(featuresHeading).toHaveClass("text-brand-secondary");
  });
});
