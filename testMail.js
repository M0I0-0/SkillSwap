require("dotenv").config();
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviar() {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER;
  const msg = {
    to: "benjamincasanovauc@gmail.com",
    from: {
      email: fromEmail,
      name: "SkillSwap"
    },
    replyTo: fromEmail,
    subject: "Prueba",
    text: "Si ves esto, ya funciona",
    html: "<strong>Si ves esto, ya funciona</strong>",
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false
      },
      openTracking: {
        enable: false
      }
    }
  };

  try {
    await sgMail.send(msg);
    console.log("ENVIADO 🚀");
  } catch (error) {
    console.log("ERROR:", error.response?.body || error);
  }
}

enviar();
