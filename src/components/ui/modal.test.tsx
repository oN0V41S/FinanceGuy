/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "@/components/ui/modal";

describe("Modal Component", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the modal when isOpen is true", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText("Test Modal")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <p data-testid="modal-content">This is the modal content</p>
        </Modal>
      );

      expect(screen.getByTestId("modal-content")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      // The close button should contain an X icon (lucide-react)
      const closeButton = document.querySelector("button");
      expect(closeButton).toBeInTheDocument();
    });

    it("should render with overlay that has no backdrop blur classes", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      // The overlay should be present with fixed positioning and centering
      const overlay = document.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass("flex", "items-center", "justify-center");

      // The overlay should NOT have backdrop dimming classes
      expect(overlay).not.toHaveClass("bg-background/80");
      expect(overlay).not.toHaveClass("backdrop-blur-sm");
    });

    it("should render panel with bg-surface-container", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      // The panel (inner div) should have the surface background color
      const panel = document.querySelector(".bg-surface-container");
      expect(panel).toBeInTheDocument();
    });
  });

  describe("Not Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    });

    it("should not render overlay when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      const overlay = document.querySelector(".fixed.inset-0");
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onClose when close button is clicked", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      const closeButton = document.querySelector("button");
      fireEvent.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dynamic Content", () => {
    it("should render with dynamic title", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Dynamic Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByText("Dynamic Title")).toBeInTheDocument();
    });

    it("should render complex children", () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Complex Modal">
          <div>
            <h4>Section 1</h4>
            <p>Paragraph 1</p>
            <button>Action</button>
          </div>
        </Modal>
      );

      expect(screen.getByText("Section 1")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
  });
});
