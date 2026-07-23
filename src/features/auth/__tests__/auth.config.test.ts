describe("NextAuth Configuration", () => {
  const readAuth = () => {
    const fs = require("fs");
    const path = require("path");
    return fs.readFileSync(path.join(process.cwd(), "src/auth.ts"), "utf-8");
  };

  it("should configure the Credentials provider", () => {
    const authContent = readAuth();
    expect(authContent).toContain(
      'import Credentials from "next-auth/providers/credentials"'
    );
    expect(authContent).toContain("Credentials({");
  });

  it("should use the JWT session strategy", () => {
    const authContent = readAuth();
    expect(authContent).toContain('session: { strategy: "jwt" }');
  });

  it("should map user.id into the JWT token in the jwt callback", () => {
    const authContent = readAuth();
    expect(authContent).toContain("token.id = user.id");
  });

  it("should expose user.id on the session via the session callback", () => {
    const authContent = readAuth();
    expect(authContent).toContain("session.user.id = token.id as string");
  });
});
