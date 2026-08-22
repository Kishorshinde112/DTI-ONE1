import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.port === 465,
  auth: {
    user: config.mail.user,
    pass: config.mail.password,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!config.mail.user) {
    console.log(`[MAIL] Skipping email to ${to} (no SMTP configured)`);
    console.log(`[MAIL] Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"DTI Pulse" <${config.mail.from}>`,
    to,
    subject,
    html,
  });
}

export async function sendOtpEmail(email: string, otp: string, purpose: string) {
  const purposeText = purpose === 'registration'
    ? 'verify your registration'
    : purpose === 'forgot_password'
    ? 'reset your password'
    : 'verify your account';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a2e;">DTI Pulse - Verification Code</h2>
      <p>Your OTP to ${purposeText} is:</p>
      <div style="background: #f0f4ff; padding: 20px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
      </div>
      <p>This code expires in ${config.otp.expiryMinutes} minutes.</p>
      <p style="color: #666; font-size: 13px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail(email, `DTI Pulse - Verification Code: ${otp}`, html);
}
