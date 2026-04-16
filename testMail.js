require("dotenv").config();
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviar() {
  const msg = {
    to: "benjamincasanovauc@gmail.com",
    from: "skillswapoficiall@gmail.com", // 👈 DEBE estar verificado en SendGrid
    subject: "Prueba",
    text: "Si ves esto, ya funciona",
    html: "<strong>Si ves esto, ya funciona</strong>"
  };

  try {
    await sgMail.send(msg);
    console.log("ENVIADO 🚀");
  } catch (error) {
    console.log("ERROR:", error.response?.body || error);
  }
}

enviar();