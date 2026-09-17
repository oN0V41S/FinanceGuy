/**
 * @jest-environment node
 */
import { sendEmail } from "./resend-client";

const mockTo = "recipient@example.com";
const mockSubject = "Confirme seu e-mail";
const mockHtml = "<html><body>Confirme seu e-mail</body></html>";
const mockResendResponse = { id: "msg_abc123", url: "https://resend.com" };

// Save original env
const originalResendKey = process.env.RESEND_API_KEY;
const originalEmailFrom = process.env.EMAIL_FROM;

describe("src/lib/email/resend-client — Wrapper de Envio de E-mail via Resend", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "test-resend-api-key";
    process.env.EMAIL_FROM = "noreply@financeguy.com";
    mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResendResponse,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.RESEND_API_KEY = originalResendKey;
    process.env.EMAIL_FROM = originalEmailFrom;
  });

  describe("sendEmail", () => {
    it("deve enviar e-mail via fetch com RESEND_API_KEY e EMAIL_FROM", async () => {
      const result = await sendEmail(mockTo, mockSubject, mockHtml);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-resend-api-key",
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual(mockResendResponse);
    });

    it("deve incluir from, to, subject e html no body da requisição", async () => {
      await sendEmail(mockTo, mockSubject, mockHtml);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.from).toBe("noreply@financeguy.com");
      expect(body.to).toBe(mockTo);
      expect(body.subject).toBe(mockSubject);
      expect(body.html).toBe(mockHtml);
    });

    it("deve usar EMAIL_FROM como remetente", async () => {
      process.env.EMAIL_FROM = "custom@example.com";
      await sendEmail(mockTo, mockSubject, mockHtml);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.from).toBe("custom@example.com");
    });

    it("nao deve logar a API key ou o conteúdo do e-mail", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendEmail(mockTo, mockSubject, mockHtml);

      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain("test-resend-api-key");
      expect(allLogs).not.toContain("Bearer");
      expect(allLogs).not.toContain(mockHtml);
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe("Validação de configuração", () => {
    it("deve lançar erro quando RESEND_API_KEY não está definido", async () => {
      delete process.env.RESEND_API_KEY;
      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        "Resend configuration missing"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando EMAIL_FROM não está definido", async () => {
      delete process.env.EMAIL_FROM;
      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        "Resend configuration missing"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando ambas as variáveis estão ausentes", async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;
      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        "Resend configuration missing"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Tratamento de erros da API do Resend", () => {
    it("deve lançar erro quando a API retorna 401", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid API key" }),
      });

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        /Resend API error|Invalid API key/i
      );
    });

    it("deve lançar erro quando a API retorna 429 (rate limit)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: "Rate limit exceeded" }),
      });

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        /Resend API error|Rate limit/i
      );
    });

    it("deve lançar erro quando a API retorna 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Internal server error" }),
      });

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        /Resend API error|Internal server error/i
      );
    });

    it("deve lançar erro com HTTP status quando mensagem não disponível", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        /HTTP 400/
      );
    });

    it("deve lançar erro para falha de rede", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure: getaddrinfo ENOTFOUND"));

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        /Network failure|network/i
      );
    });

    it("deve lançar erro genérico para erros não de rede na fetch", async () => {
      mockFetch.mockRejectedValue(new Error("Unexpected error"));

      await expect(sendEmail(mockTo, mockSubject, mockHtml)).rejects.toThrow(
        "Unexpected error"
      );
    });

    it("deve incluir código de erro quando disponível na resposta", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid request", code: "invalid_request" }),
      });

      try {
        await sendEmail(mockTo, mockSubject, mockHtml);
      } catch (error: any) {
        expect(error.message).toContain("Invalid request");
      }
    });
  });

  describe("Segurança — nenhum dado sensível logado", () => {
    it("não deve logar RESEND_API_KEY em nenhuma circunstância", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendEmail(mockTo, mockSubject, mockHtml);

      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain("test-resend-api-key");
      expect(allLogs).not.toContain("Bearer");
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("não deve logar o conteúdo HTML do e-mail", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendEmail(mockTo, mockSubject, mockHtml);

      const allLogs = consoleSpy.mock.calls.join("") + errorSpy.mock.calls.join("");
      expect(allLogs).not.toContain(mockHtml);
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
