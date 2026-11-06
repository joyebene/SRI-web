

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  const { full_name, email } = req.body || {};

  if (!full_name || !email) {
    return res.status(400).json({
      success: false,
      message: "Full name and email are required."
    });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName =
    process.env.BREVO_SENDER_NAME || "Start Right Initiative";

  if (!apiKey || !senderEmail) {
    console.error("Missing Brevo environment variables.");

    return res.status(500).json({
      success: false,
      message: "Brevo email configuration is incomplete."
    });
  }

  const safeName = String(full_name).replace(/[<>&"']/g, "");

  try {
    // Retrieve the ticket image from the deployed website
    const ticketResponse = await fetch(
      "https://www.startrightafricana.com/images/ticket.png"
    );

    if (!ticketResponse.ok) {
      throw new Error(
        `Ticket image could not be loaded. Status: ${ticketResponse.status}`
      );
    }

    const ticketBuffer = Buffer.from(
      await ticketResponse.arrayBuffer()
    );

    const ticketBase64 = ticketBuffer.toString("base64");


    const brevoResponse = await fetch(
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
          to: [
            {
              email: email,
              name: safeName
            }
          ],
          subject: "Your Scale Up Africa Registration Is Confirmed",
          htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#17231c;line-height:1.7">
              <div style="background:#0d5c3c;padding:30px;text-align:center">
                <h1 style="color:#ffffff;margin:0">Scale Up Africa</h1>
                <p style="color:#f2a900;margin:8px 0 0">Start Right Initiative</p>
              </div>

              <div style="padding:30px;background:#fefbf6">
                <h2 style="color:#0d5c3c">Hello ${safeName},</h2>

                <p>
                  Thank you for registering your interest in
                  <strong>Scale Up Africa</strong> by Start Right Initiative.
                </p>

                <p>
                  Your registration has been received successfully.
                  We appreciate your interest and look forward to
                  connecting with you.
                </p>

                <p>
                  We will share further information and updates with you
                  using the contact details you provided.
                </p>

                <p style="margin-top:30px">
                  Best regards,<br>
                  <strong>Start Right Initiative</strong>
                </p>
              </div>

              <div style="background:#08452d;padding:18px;text-align:center;color:#ffffff;font-size:12px">
                Every strong future needs a right start.
              </div>
            </div>
          `,
          attachment: [
            {
              name: "Scale-Up-Africa-Ticket.png",
              content: ticketBase64
            }
          ]
        })
      }
    );

    const responseText = await brevoResponse.text();

    let brevoData;
    try {
      brevoData = responseText ? JSON.parse(responseText) : {};
    } catch {
      brevoData = { raw: responseText };
    }

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", {
        status: brevoResponse.status,
        response: brevoData
      });

      return res.status(502).json({
        success: false,
        message: "Brevo rejected the email request.",
        details: brevoData,
        brevoStatus: brevoResponse.status
      });
    }

    return res.status(200).json({
      success: true,
      message: "Confirmation email sent.",
      messageId: brevoData.messageId
    });

  } catch (error) {
    console.error("Email function error:", error);

    return res.status(500).json({
      success: false,
      message: "The email service encountered an internal error."
    });
  }
}
