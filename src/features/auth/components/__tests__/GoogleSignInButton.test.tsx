import { render, screen, fireEvent } from "@testing-library/react";
import GoogleSignInButton from "../GoogleSignInButton";

// Mock the signIn function from @/auth
jest.mock("@/auth", () => ({
  signIn: jest.fn(),
}));

import { signIn } from "@/auth";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render button with text 'Continuar com Google'", () => {
    render(<GoogleSignInButton />);
    
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeInTheDocument();
  });

  it("should render Google SVG icon", () => {
    render(<GoogleSignInButton />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should call signIn with 'google' and default callbackUrl on click", () => {
    render(<GoogleSignInButton />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    fireEvent.click(button);
    
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard" });
  });

  it("should pass custom callbackUrl to signIn", () => {
    render(<GoogleSignInButton callbackUrl="/conta" />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    fireEvent.click(button);
    
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/conta" });
  });

  it("should set aria-disabled when disabled", () => {
    render(<GoogleSignInButton disabled />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("should not call signIn when disabled and clicked", () => {
    render(<GoogleSignInButton disabled />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    fireEvent.click(button);
    
    expect(signIn).not.toHaveBeenCalled();
  });

  it("should be focusable via keyboard", () => {
    render(<GoogleSignInButton />);
    
    const button = screen.getByRole("button", { name: /continuar com google/i });
    button.focus();
    
    expect(document.activeElement).toBe(button);
  });
});
