/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

describe("Card Component Styling (parallel change: font-display -> font-sans)", () => {
  it("renders CardTitle with font-sans and not font-display per VISUAL_IDENTITY.md §3", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
      </Card>
    );

    const title = screen.getByText("Card Title");
    expect(title.tagName).toBe("H3");
    expect(title).toHaveClass("font-sans");
    expect(title).not.toHaveClass("font-display");
  });

  it("renders the Card root with the surface container token", () => {
    const { container } = render(<Card>child</Card>);
    expect(container.firstChild).toHaveClass("bg-surface-container");
  });
});
