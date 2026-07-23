import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FormAlert, type AlertType } from "../FormAlert";

/**
 * Helper: extract the bg-* and text-* utility classes from a className string
 * and assert that NO text color equals a background color (which would make
 * the message invisible, the original bug).
 */
function assertTextContrastsWithBackground(className: string) {
  const classes = className.split(/\s+/);
  const bgClasses = classes.filter((c) => c.startsWith("bg-"));
  const textClasses = classes.filter((c) => c.startsWith("text-"));

  // For every background there must be at least one text color, and the text
  // color must differ from the background color (no `text-x` === `bg-x`).
  expect(textClasses.length).toBeGreaterThan(0);

  for (const bg of bgClasses) {
    const base = bg.slice("bg-".length);
    // A bg like `bg-error-container` must not be paired with `text-error-container`.
    const matchingText = textClasses.find((t) => t === `text-${base}`);
    expect(matchingText).toBeUndefined();
  }
}

describe("FormAlert", () => {
  it("exposes role='alert' for accessibility", () => {
    render(<FormAlert type="error" message="Algo deu errado" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the message text and a colored icon (svg)", () => {
    render(<FormAlert type="success" message="Conta criada com sucesso" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Conta criada com sucesso");
    expect(alert.querySelector("svg")).toBeInTheDocument();
  });

  it("error alert is readable (text color differs from background)", () => {
    render(<FormAlert type="error" message="Erro de login" />);
    const alert = screen.getByRole("alert");

    // Must no longer use the broken same-color pairing.
    expect(alert).not.toHaveClass("bg-red-500");
    expect(alert).not.toHaveClass("text-red-500");

    // New theme-token classes that guarantee contrast.
    expect(alert).toHaveClass("bg-error-container", "text-error-on-container", "border-error");
    assertTextContrastsWithBackground(alert.className);
  });

  it("success alert is readable (text color differs from background)", () => {
    render(<FormAlert type="success" message="Conta criada" />);
    const alert = screen.getByRole("alert");

    expect(alert).not.toHaveClass("bg-emerald-500");
    expect(alert).not.toHaveClass("text-emerald-500");

    expect(alert).toHaveClass(
      "bg-tertiary-container",
      "text-tertiary-on-container",
      "border-tertiary"
    );
    assertTextContrastsWithBackground(alert.className);
  });

  it("warning alert is readable (text color differs from background)", () => {
    render(<FormAlert type="warning" message="Atenção" />);
    const alert = screen.getByRole("alert");

    expect(alert).not.toHaveClass("bg-amber-500");
    expect(alert).not.toHaveClass("text-amber-500");

    expect(alert).toHaveClass(
      "bg-surface-container-high",
      "text-finance-recurring",
      "border-finance-recurring"
    );
    assertTextContrastsWithBackground(alert.className);
  });

  it("returns nothing when message is empty", () => {
    const { container } = render(<FormAlert type="error" message="" />);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("every alert variant keeps text color distinct from background", () => {
    const types: AlertType[] = ["error", "success", "warning", "info"];
    for (const type of types) {
      const { unmount } = render(<FormAlert type={type} message="mensagem" />);
      const alert = screen.getByRole("alert");
      assertTextContrastsWithBackground(alert.className);
      unmount();
    }
  });
});
