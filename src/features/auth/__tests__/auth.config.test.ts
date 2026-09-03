describe("NextAuth Configuration", () => {
  it("should have Google provider in src/auth.ts", async () => {
    // Read the auth.ts file and verify Google provider is configured
    const fs = require("fs");
    const path = require("path");
    const authPath = path.join(process.cwd(), "src/auth.ts");
    const authContent = fs.readFileSync(authPath, "utf-8");

    // Verify Google provider import
    expect(authContent).toContain('import Google from "next-auth/providers/google"');

    // Verify Google provider in providers array
    expect(authContent).toContain("Google({");
    expect(authContent).toContain("GOOGLE_CLIENT_ID");
    expect(authContent).toContain("GOOGLE_CLIENT_SECRET");
  });

  it("should preserve Credentials provider", async () => {
    const fs = require("fs");
    const path = require("path");
    const authPath = path.join(process.cwd(), "src/auth.ts");
    const authContent = fs.readFileSync(authPath, "utf-8");

    // Verify Credentials provider still exists
    expect(authContent).toContain('import Credentials from "next-auth/providers/credentials"');
    expect(authContent).toContain("Credentials({");
  });

  it("should have picture in JWT callback", async () => {
    const fs = require("fs");
    const path = require("path");
    const authPath = path.join(process.cwd(), "src/auth.ts");
    const authContent = fs.readFileSync(authPath, "utf-8");

    // Verify JWT callback handles picture
    expect(authContent).toContain("token.picture = user.image");
  });

  it("should have picture in session callback", async () => {
    const fs = require("fs");
    const path = require("path");
    const authPath = path.join(process.cwd(), "src/auth.ts");
    const authContent = fs.readFileSync(authPath, "utf-8");

    // Verify session callback handles picture
    expect(authContent).toContain("session.user.image = token.picture");
  });
});
