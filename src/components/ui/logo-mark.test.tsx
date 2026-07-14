/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { LogoMark } from "@/components/ui/logo-mark";

describe("LogoMark Component", () => {
  describe("Rendering", () => {
    it("should render an svg element", () => {
      const { container } = render(<LogoMark />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should expose an accessible name via aria-label", () => {
      render(<LogoMark />);

      const svg = screen.getByRole("img", { name: "FinanceGuy" });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-label", "FinanceGuy");
    });

    it("should use the default 24x24 viewBox", () => {
      const { container } = render(<LogoMark />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });
  });

  describe("Styling", () => {
    it("should forward a custom className to the svg element", () => {
      const { container } = render(<LogoMark className="w-5 h-5" />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5");
      expect(svg).toHaveClass("h-5");
    });

    it("should inherit color via currentColor so text-* utilities control the color", () => {
      const { container } = render(<LogoMark />);

      const svg = container.querySelector("svg");
      // The drawing must rely on currentColor to be theme/tw-color controllable
      const shapes = svg?.querySelectorAll("[fill='currentColor'], [stroke='currentColor']");
      expect(shapes && shapes.length).toBeGreaterThan(0);
    });
  });

  describe("Dependencies", () => {
    it("should not depend on an external icon library (renders its own svg)", () => {
      const { container } = render(<LogoMark />);

      // A self-contained svg: no nested <svg> from a third-party icon wrapper
      const svgs = container.querySelectorAll("svg");
      expect(svgs).toHaveLength(1);
    });
  });
});
