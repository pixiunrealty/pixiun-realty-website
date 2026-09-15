export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        error: "Supabase environment variables are missing."
      });
    }

    const {
      name,
      email,
      phone,
      message,
      property_id,
      property_title,
      property_location
    } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim();
    const cleanPhone = String(phone || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({
        error: "Name, email and message are required."
      });
    }

    if (cleanName.length > 120) {
      return res.status(400).json({
        error: "Name is too long."
      });
    }

    if (cleanEmail.length > 200) {
      return res.status(400).json({
        error: "Email address is too long."
      });
    }

    if (cleanPhone.length > 50) {
      return res.status(400).json({
        error: "Phone number is too long."
      });
    }

    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        error: "Message is too long."
      });
    }

    const inquiry = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      message: cleanMessage,
      property_id: property_id || null,
      property_title:
        String(property_title || "").trim() || null,
      property_location:
        String(property_location || "").trim() || null,
      status: "New"
    };

    const response = await fetch(
      `${url}/rest/v1/Inquiries`,
      {
        method: "POST",

        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },

        body: JSON.stringify(inquiry)
      }
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "Supabase inquiry error:",
        responseText
      );

      return res.status(500).json({
        error: "Unable to save inquiry."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inquiry submitted successfully."
    });

  } catch (error) {
    console.error(
      "Inquiry API error:",
      error
    );

    return res.status(500).json({
      error: "Unable to submit inquiry."
    });
  }
}
