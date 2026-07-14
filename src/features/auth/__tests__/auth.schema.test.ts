import { RegisterSchema } from "../schemas/auth.schema";

describe("RegisterSchema - confirmPassword", () => {
  const baseValid = {
    name: "John Doe",
    nickname: "john",
    email: "john@test.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("passes validation when password and confirmPassword match", () => {
    const result = RegisterSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("fails validation when password and confirmPassword differ", () => {
    const result = RegisterSchema.safeParse({
      ...baseValid,
      confirmPassword: "Different123!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join(".") === "confirmPassword"
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("As senhas não coincidem");
    }
  });

  it("fails validation when confirmPassword is empty", () => {
    const result = RegisterSchema.safeParse({
      ...baseValid,
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
  });
});
