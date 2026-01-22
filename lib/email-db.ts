/**
 * Email Service using Database Configuration
 * This replaces the old .env-based email system
 */

import nodemailer from "nodemailer"
import { prisma } from "./prisma"
import { logger } from "./logger"

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Get SMTP configuration from database
 */
async function getSMTPConfig() {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "smtp_config" },
  })

  if (!setting) {
    return null
  }

  const config = setting.value as any
  return {
    enabled: config.enabled === true,
    host: config.host || "localhost",
    port: parseInt(config.port) || 587,
    secure: config.secure === true,
    user: config.user || "",
    password: config.password || "",
    from: config.from || "noreply@example.com",
  }
}

/**
 * Create email transporter using database config
 */
async function createTransporter() {
  const config = await getSMTPConfig()

  if (!config || !config.enabled) {
    // Return console logger if SMTP not configured
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    })
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password
      ? {
          user: config.user,
          pass: config.password,
        }
      : undefined,
  })
}

/**
 * Send an email using database configuration
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const config = await getSMTPConfig()
    const transporter = await createTransporter()

    const mailOptions = {
      from: config?.from || "noreply@example.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }

    const info = await transporter.sendMail(mailOptions)

    // Log email sending to database
    await logger.info("Email sent", {
      category: "email",
      metadata: {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
        devMode: !config || !config.enabled,
      },
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    await logger.error("Error sending email", {
      category: "email",
      metadata: {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error)
      },
    })
    return { success: false, error }
  }
}

/**
 * Test SMTP connection
 */
export async function testSMTPConnection(): Promise<{
  success: boolean
  message: string
  error?: any
}> {
  try {
    const config = await getSMTPConfig()

    if (!config || !config.enabled) {
      return {
        success: false,
        message: "SMTP is not configured or disabled",
      }
    }

    const transporter = await createTransporter()

    // Verify connection
    await transporter.verify()

    // Send test email
    await transporter.sendMail({
      from: config.from,
      to: config.from, // Send to same address
      subject: "SMTP Test - Connection Successful",
      html: `
        <h2>✅ SMTP Connection Test Successful</h2>
        <p>Your SMTP configuration is working correctly!</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Host: ${config.host}</li>
          <li>Port: ${config.port}</li>
          <li>Secure: ${config.secure ? "Yes (TLS/SSL)" : "No"}</li>
          <li>From: ${config.from}</li>
        </ul>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `
SMTP Connection Test Successful

Your SMTP configuration is working correctly!

Configuration Details:
- Host: ${config.host}
- Port: ${config.port}
- Secure: ${config.secure ? "Yes (TLS/SSL)" : "No"}
- From: ${config.from}

Timestamp: ${new Date().toISOString()}
      `,
    })

    return {
      success: true,
      message: `Test email sent successfully to ${config.from}`,
    }
  } catch (error: any) {
    await logger.error("SMTP test failed", {
      category: "email",
      metadata: {
        error: error.message || String(error)
      },
    })
    return {
      success: false,
      message: error.message || "Failed to connect to SMTP server",
      error,
    }
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`

  return sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #1890ff; margin-top: 0;">Verify Your Email Address</h1>
            <p style="font-size: 16px;">Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} AUTH APP. All rights reserved.
          </p>
        </body>
      </html>
    `,
    text: `
      Verify Your Email Address

      Thank you for signing up! Please verify your email address by clicking the link below:

      ${verificationUrl}

      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

      © ${new Date().getFullYear()} AUTH APP. All rights reserved.
    `,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  return sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #1890ff; margin-top: 0;">Reset Your Password</h1>
            <p style="font-size: 16px;">You requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} AUTH APP. All rights reserved.
          </p>
        </body>
      </html>
    `,
    text: `
      Reset Your Password

      You requested to reset your password. Click the link below to proceed:

      ${resetUrl}

      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

      © ${new Date().getFullYear()} AUTH APP. All rights reserved.
    `,
  })
}

/**
 * Send email change verification to NEW email address
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  token: string
) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email-change?token=${token}`

  return sendEmail({
    to: newEmail,
    subject: "Verify Your New Email Address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #1890ff; margin-top: 0;">Verify Your New Email Address</h1>
            <p style="font-size: 16px;">You requested to change your email address to this address.</p>
            <p style="font-size: 16px;"><strong>Click the button below to verify and complete the change:</strong></p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}"
                 style="background-color: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Change
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
              ${verifyUrl}
            </p>

            <div style="background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px;"><strong>Important:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px;">
                <li>This link expires in 24 hours</li>
                <li>You can still login with your old email until you verify this one</li>
                <li>Your email will be updated once you click the verification link</li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you didn't request this email change, you can safely ignore this email. A security notification has been sent to your current email address.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} AUTH APP. All rights reserved.
          </p>
        </body>
      </html>
    `,
    text: `
Verify Your New Email Address

You requested to change your email address to this address.

Click the link below to verify and complete the change:

${verifyUrl}

Important:
- This link expires in 24 hours
- You can still login with your old email until you verify this one
- Your email will be updated once you click the verification link

If you didn't request this email change, you can safely ignore this email. A security notification has been sent to your current email address.

© ${new Date().getFullYear()} AUTH APP. All rights reserved.
    `,
  })
}

/**
 * Send email change security notification to OLD email address with cancel/revert capability
 */
export async function sendEmailChangeNotification(
  oldEmail: string,
  newEmail: string,
  cancelToken: string,
  userName?: string
) {
  const cancelUrl = `${process.env.NEXTAUTH_URL}/cancel-email-change?token=${cancelToken}`
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/profile/settings`
  const timestamp = new Date().toLocaleString()

  return sendEmail({
    to: oldEmail,
    subject: "⚠️ Email Address Change Request",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fff7e6; border-radius: 10px; padding: 30px; margin-bottom: 20px; border-left: 5px solid #faad14;">
            <h1 style="color: #faad14; margin-top: 0;">⚠️ Email Address Change Request</h1>
            <p style="font-size: 16px;">Hi${userName ? ` ${userName}` : ""},</p>
            <p style="font-size: 16px;">A request was made to change your account email address:</p>

            <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>From:</strong> ${oldEmail}</p>
              <p style="margin: 10px 0 0 0;"><strong>To:</strong> ${newEmail}</p>
              <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
            </div>

            <div style="background-color: #fff1f0; border-left: 4px solid #ff4d4f; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ff4d4f;">⚠️ If this wasn't you:</p>
              <p style="margin: 10px 0 0 0; font-size: 15px;"><strong>Click the button below IMMEDIATELY to cancel this change:</strong></p>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${cancelUrl}"
                   style="background-color: #ff4d4f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Cancel Email Change
                </a>
              </div>

              <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">This cancellation link expires in 24 hours.</p>
            </div>

            <div style="background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px;"><strong>What happens if you don't act:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px;">
                <li>✅ You can still login with THIS email for the next 24 hours</li>
                <li>⚠️ The new email will become active once verified</li>
                <li>❌ After 24 hours, only the new email will work</li>
              </ul>
            </div>

            <p style="font-size: 16px;"><strong>If this was you</strong>, no action is needed. Just verify the new email address.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}"
                 style="background-color: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Account Settings
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is an automated security notification. You're receiving this because your email address was requested to be changed.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} AUTH APP. All rights reserved.
          </p>
        </body>
      </html>
    `,
    text: `
⚠️ Email Address Change Request

Hi${userName ? ` ${userName}` : ""},

A request was made to change your account email address:

From: ${oldEmail}
To: ${newEmail}
Time: ${timestamp}

⚠️ If this wasn't you:
Click the link below IMMEDIATELY to cancel this change:

${cancelUrl}

This cancellation link expires in 24 hours.

What happens if you don't act:
- ✅ You can still login with THIS email for the next 24 hours
- ⚠️ The new email will become active once verified
- ❌ After 24 hours, only the new email will work

If this was you, no action is needed. Just verify the new email address.

View account settings: ${dashboardUrl}

This is an automated security notification. You're receiving this because your email address was requested to be changed.

© ${new Date().getFullYear()} AUTH APP. All rights reserved.
    `,
  })
}

/**
 * Send alert notification email
 */
export async function sendAlertEmail(
  recipientEmail: string,
  alertName: string,
  alertType: string,
  message: string,
  details?: Record<string, any>
) {
  const timestamp = new Date().toISOString()

  // Format details for display
  const detailsHtml = details
    ? Object.entries(details)
        .map(([key, value]) => `<li><strong>${key}:</strong> ${JSON.stringify(value)}</li>`)
        .join("")
    : ""

  const detailsText = details
    ? Object.entries(details)
        .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
        .join("\n")
    : ""

  // Choose color based on alert type
  const alertColors: Record<string, string> = {
    ERROR_SPIKE: "#ff4d4f",
    FAILED_LOGIN: "#faad14",
    CUSTOM: "#1890ff",
  }
  const color = alertColors[alertType] || "#1890ff"

  return sendEmail({
    to: recipientEmail,
    subject: `🚨 Alert: ${alertName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px; border-left: 5px solid ${color};">
            <h1 style="color: ${color}; margin-top: 0;">🚨 Alert Triggered</h1>
            <h2 style="margin-bottom: 10px;">${alertName}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>

            <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0;"><strong>Type:</strong> ${alertType}</p>
              <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
            </div>

            ${detailsHtml ? `
              <div style="background-color: #fff; padding: 15px; border-radius: 5px;">
                <p style="margin-top: 0;"><strong>Details:</strong></p>
                <ul style="margin: 10px 0;">
                  ${detailsHtml}
                </ul>
              </div>
            ` : ""}

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is an automated alert from your monitoring system. Please review and take appropriate action if needed.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} AUTH APP. All rights reserved.
          </p>
        </body>
      </html>
    `,
    text: `
🚨 Alert Triggered

${alertName}
${message}

Type: ${alertType}
Time: ${new Date(timestamp).toLocaleString()}

${detailsText ? `Details:\n${detailsText}\n` : ""}

This is an automated alert from your monitoring system. Please review and take appropriate action if needed.

© ${new Date().getFullYear()} AUTH APP. All rights reserved.
    `,
  })
}
