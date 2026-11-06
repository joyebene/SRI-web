
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    const { full_name, email } = req.body || {};

    if (
        typeof full_name !== "string" ||
        typeof email !== "string" ||
        !full_name.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid name and email."
        });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName =
        process.env.BREVO_SENDER_NAME || "Start Right Initiative";

    if (!apiKey || !senderEmail) {
        console.error("Brevo environment variables are missing.");

        return res.status(500).json({
            success: false,
            message: "Email service is not configured."
        });
    }

    // Escape user-provided name before inserting it into HTML.
    const safeName = full_name.trim().replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:30px;background:#fefbf6;font-family:Arial,sans-serif;color:#17231c;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;">
        <div style="background:#0d5c3c;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Scale Up Africa</h1>
          <p style="color:#f2a900;">Start Right Initiative</p>
        </div>

        <div style="padding:35px;line-height:1.7;">
          <h2 style="color:#0d5c3c;">Hello ${safeName},</h2>

          <p>Thank you for registering for <strong>Scale Up Africa</strong>,
          an initiative by Start Right Initiative.</p>

          <p>We are pleased to receive your registration and appreciate
          your interest in being part of this experience.</p>

          <p>Your registration has been received successfully.
          Please keep an eye on your email for further programme updates
          and participation details.</p>

          <p>We look forward to welcoming you!</p>

          <p>
            Warm regards,<br>
            <strong style="color:#0d5c3c;">The Start Right Initiative Team</strong><br>
            Scale Up Africa
          </p>
        </div>

        <div style="background:#08452d;padding:18px;text-align:center;color:#fff;font-size:12px;">
          Every strong future needs a right start.
        </div>
      </div>
    </body>
    </html>`;

    try {
        const response = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": apiKey,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        name: senderName,
                        email: senderEmail
                    },
                    to: [{
                        email: email.trim(),
                        name: full_name.trim()
                    }],
                    subject:
                        "Your Scale Up Africa Registration Has Been Received!",
                    htmlContent
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error("Brevo API error:", error);

            return res.status(502).json({
                success: false,
                message: "Could not send confirmation email."
            });
        }

        const result = await response.json();

        return res.status(200).json({
            success: true,
            messageId: result.messageId
        });

    } catch (error) {
        console.error("Email sending error:", error);

        return res.status(500).json({
            success: false,
            message: "Email service temporarily unavailable."
        });
    }
}
