const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

interface TransactionalEmailPayload {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
  MessageStream: "outbound";
}

export async function sendTransactionalEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> {
  /**
   * Core engine for sending asynchronous emails via Postmark REST API.
   */
  const senderEmail = process.env.SENDER_EMAIL;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;

  if (!senderEmail || !postmarkToken) {
    throw new Error("Sender email or Postmark Token env var not set");
  }
  
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Postmark-Server-Token": postmarkToken,
  };

  const payload: TransactionalEmailPayload = {
    From: senderEmail,
    To: toEmail,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: "outbound",
  };

  try {
    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.error(
        `Failed to send email to ${toEmail}. Provider responded with: ${responseText}`
      );
      throw new Error(
        `Postmark returned HTTP ${response.status}: ${responseText}`
      );
    }

    console.info(`Password recovery email sent to ${toEmail}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      `Unexpected error sending email to ${toEmail}: ${message} \n`
    );
    throw error;
  }
}

export async function sendPasswordRecoveryEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  /**
   * Constructs the specific payload for the password reset flow.
   */
  const resetUrl = new URL("/reset-password", process.env.FRONTEND_URL);
  resetUrl.searchParams.set("resetToken", resetToken);

  const resetLink = resetUrl.toString();
  const subject = "Sports Reels: Password Reset Request";

  const htmlBody = `
    <h2>Password Reset Request</h2>
    <p>You recently requested to reset your password for your Sports Reels account.</p>
    <p>Click the link below to reset it. This link is valid for 15 minutes.</p>
    <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background-color:#007BFF; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
  `;

  const textBody = `Please reset your password by visiting this link (valid for 15 minutes): ${resetLink}`;

  await sendTransactionalEmail(toEmail, subject, htmlBody, textBody);
}
