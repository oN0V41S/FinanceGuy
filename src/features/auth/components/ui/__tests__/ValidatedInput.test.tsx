import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ValidatedInput } from "../ValidatedInput";

describe("ValidatedInput", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  // ---------------------------------------------------------------------------
  // Native HTML5 validation contract (TDD red phase — implementation pending)
  // The component will gain an optional `invalidMessage` prop and call
  // `input.setCustomValidity(invalidMessage ?? "")` plus `reportValidity()` on
  // blur so the BROWSER'S native bubble shows OUR Portuguese text.
  // ---------------------------------------------------------------------------

  it("forwards the native required attribute onto the underlying input", () => {
    render(<ValidatedInput required placeholder="E-mail" />);
    const input = screen.getByPlaceholderText("E-mail");
    expect(input).toHaveAttribute("required");
  });

  it("forwards the native minLength attribute onto the underlying input", () => {
    render(<ValidatedInput minLength={8} placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha");
    expect(input).toHaveAttribute("minlength", "8");
  });

  it("sets the input validationMessage to invalidMessage and marks it invalid", async () => {
    render(<ValidatedInput invalidMessage="Email inválido" placeholder="E-mail" />);
    const input = screen.getByPlaceholderText("E-mail") as HTMLInputElement;

    await waitFor(() => {
      expect(input.validationMessage).toBe("Email inválido");
    });
    expect(input.checkValidity()).toBe(false);
  });

  it("keeps validationMessage empty and valid when invalidMessage is omitted", () => {
    render(<ValidatedInput placeholder="E-mail" />);
    const input = screen.getByPlaceholderText("E-mail") as HTMLInputElement;
    expect(input.validationMessage).toBe("");
    expect(input.checkValidity()).toBe(true);
  });

  it("keeps validationMessage empty and valid when invalidMessage is an empty string", () => {
    render(<ValidatedInput invalidMessage="" placeholder="E-mail" />);
    const input = screen.getByPlaceholderText("E-mail") as HTMLInputElement;
    expect(input.validationMessage).toBe("");
    expect(input.checkValidity()).toBe(true);
  });

  it("calls reportValidity on the underlying input when it is blurred", () => {
    const reportValiditySpy = jest.spyOn(HTMLInputElement.prototype, "reportValidity");
    const onBlurSpy = jest.fn();

    render(<ValidatedInput placeholder="E-mail" onBlur={onBlurSpy} />);
    const input = screen.getByPlaceholderText("E-mail") as HTMLInputElement;

    fireEvent.blur(input);

    // The merged onBlur from props should still fire...
    expect(onBlurSpy).toHaveBeenCalled();
    // ...but the native reportValidity bubble must also be triggered.
    expect(reportValiditySpy).toHaveBeenCalled();
  });
});
