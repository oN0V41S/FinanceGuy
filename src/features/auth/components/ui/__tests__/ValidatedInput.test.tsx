import { render, screen, fireEvent } from "@testing-library/react";
import { ValidatedInput } from "../ValidatedInput";

describe("ValidatedInput", () => {
  it("renders the input with the border-outline and bg-background classes", () => {
    render(<ValidatedInput placeholder="E-mail" />);
    const input = screen.getByPlaceholderText("E-mail");
    expect(input).toHaveClass("border");
    expect(input).toHaveClass("border-outline");
    expect(input).toHaveClass("bg-background");
  });

  it("renders a show-password toggle and toggles the input type and label", () => {
    render(<ValidatedInput type="password" showToggle placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("password");

    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();
    expect((screen.getByPlaceholderText("Senha") as HTMLInputElement).getAttribute("type")).toBe("text");
  });

  it("does not render a toggle when showToggle is set but type is not password", () => {
    render(<ValidatedInput type="text" showToggle placeholder="Nome" />);
    expect(screen.queryByRole("button", { name: /Mostrar|Ocultar senha/i })).not.toBeInTheDocument();
  });

  it("renders the invalid status icon when status='invalid'", () => {
    render(<ValidatedInput status="invalid" placeholder="E-mail" />);
    expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
    expect(screen.queryByTestId("field-status-valid")).not.toBeInTheDocument();
  });

  it("renders the valid status icon when status='valid'", () => {
    render(<ValidatedInput status="valid" placeholder="E-mail" />);
    expect(screen.getByTestId("field-status-valid")).toBeInTheDocument();
    expect(screen.queryByTestId("field-status-invalid")).not.toBeInTheDocument();
  });

  it("renders neither status icon when no status is provided", () => {
    render(<ValidatedInput placeholder="E-mail" />);
    expect(screen.queryByTestId("field-status-valid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("field-status-invalid")).not.toBeInTheDocument();
  });

  it("forwards arbitrary props onto the underlying input", () => {
    const handleChange = jest.fn();
    render(
      <ValidatedInput
        data-testid="email"
        name="email"
        placeholder="E-mail"
        onChange={handleChange}
      />
    );
    const input = screen.getByTestId("email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "email");
  });
});
