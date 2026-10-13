export async function sendEmail(to: string, subject: string, html: string): Promise<{ id: string; url: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!resendApiKey || !emailFrom) {
    throw new Error("Resend configuration missing");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${errorData.message || `HTTP ${response.status}`}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && /network/i.test(error.message)) {
      throw new Error(`Network failure: ${error.message}`);
    }
    throw error;
  }
}
