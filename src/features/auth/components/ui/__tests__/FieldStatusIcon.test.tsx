import { render, screen } from "@testing-library/react";
import { FieldStatusIcon } from "../FieldStatusIcon";

describe("FieldStatusIcon", () => {
  it("renders Check with data-testid='field-status-valid' when state='valid'", () => {
    const { container } = render(<FieldStatusIcon state="valid" />);
    expect(screen.getByTestId("field-status-valid")).toBeInTheDocument();
    expect(screen.queryByTestId("field-status-invalid")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders X with data-testid='field-status-invalid' when state='invalid'", () => {
    render(<FieldStatusIcon state="invalid" />);
    expect(screen.getByTestId("field-status-invalid")).toBeInTheDocument();
    expect(screen.queryByTestId("field-status-valid")).not.toBeInTheDocument();
  });

  it("renders nothing when state is null", () => {
    const { container } = render(<FieldStatusIcon state={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when state is undefined (prop omitted)", () => {
    const { container } = render(<FieldStatusIcon />);
    expect(container).toBeEmptyDOMElement();
  });
});
