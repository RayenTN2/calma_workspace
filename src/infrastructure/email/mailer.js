
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your Calma Workspace account",

    text: `Your verification code is ${code}. It expires in 10 minutes.`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Welcome to Calma Workspace!</h2>

        <p>Use this code to verify your email address:</p>

        <h1 style="letter-spacing: 8px;">${code}</h1>

        <p>This code expires in 10 minutes.</p>

        <p>If you did not request this code, ignore this email.</p>
      </div>
    `,
  });
}
