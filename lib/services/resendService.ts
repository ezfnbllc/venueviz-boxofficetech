/**
 * Resend Email Service
 *
 * Handles transactional email sending via Resend.
 * Used for order confirmations, password resets, and system notifications.
 *
 * Configuration:
 * - RESEND_API_KEY: Required API key from Resend
 * - RESEND_FROM_EMAIL: Default sender email (e.g., tickets@yourdomain.com)
 * - RESEND_FROM_NAME: Default sender name (e.g., BoxOfficeTech)
 */

import { Resend } from 'resend'

// Initialize Resend client (only on server)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Default sender configuration
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'tickets@boxofficetech.com'
const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME || 'BoxOfficeTech'

export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  html: string
  text?: string
  from?: {
    email: string
    name: string
  }
  replyTo?: string
  tags?: { name: string; value: string }[]
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface OrderEmailData {
  orderId: string
  customerName: string
  customerEmail: string
  eventName: string
  eventDate: string
  eventTime?: string
  venueName?: string
  venueAddress?: string
  tickets: {
    tierName: string
    quantity: number
    price: number
  }[]
  subtotal: number
  serviceFee: number
  total: number
  currency: string
  qrCodeUrl?: string
  orderUrl?: string
  promoter: {
    name: string
    slug: string
    logo?: string
    primaryColor?: string
    supportEmail?: string
  }
}

export interface PasswordResetEmailData {
  customerName: string
  customerEmail: string
  newPassword: string
  loginUrl: string
  promoter: {
    name: string
    slug: string
    logo?: string
    primaryColor?: string
    supportEmail?: string
  }
}

export interface WelcomeEmailData {
  customerName: string
  customerEmail: string
  loginUrl: string
  promoter: {
    name: string
    slug: string
    logo?: string
    primaryColor?: string
    supportEmail?: string
  }
}

class ResendServiceClass {
  /**
   * Send a raw email with custom content
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!resend) {
      console.warn('[ResendService] Resend not configured - RESEND_API_KEY missing')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to]
      const fromAddress = options.from
        ? `${options.from.name} <${options.from.email}>`
        : `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: toAddresses.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags,
      })

      if (error) {
        console.error('[ResendService] Send error:', error)
        return { success: false, error: error.message }
      }

      console.log(`[ResendService] Email sent successfully: ${data?.id}`)
      return { success: true, messageId: data?.id }
    } catch (error: any) {
      console.error('[ResendService] Exception:', error)
      return { success: false, error: error.message || 'Failed to send email' }
    }
  }

  /**
   * Send order confirmation email with tickets
   */
  async sendOrderConfirmation(data: OrderEmailData): Promise<EmailResult> {
    const primaryColor = data.promoter.primaryColor || '#6ac045'
    const ticketRows = data.tickets.map(t => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${t.tierName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${t.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(t.price * t.quantity).toFixed(2)}</td>
      </tr>
    `).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
      ${data.promoter.logo
        ? `<img src="${data.promoter.logo}" alt="${data.promoter.name}" style="max-height: 50px; max-width: 200px;">`
        : `<h1 style="color: #ffffff; margin: 0; font-size: 24px;">${data.promoter.name}</h1>`
      }
    </div>

    <!-- Success Banner -->
    <div style="background-color: #f0fdf4; padding: 24px; text-align: center; border-bottom: 1px solid #bbf7d0;">
      <div style="width: 48px; height: 48px; background-color: ${primaryColor}; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 24px;"></span>
      </div>
      <h2 style="margin: 0 0 8px; color: #166534; font-size: 20px;">Order Confirmed!</h2>
      <p style="margin: 0; color: #15803d;">Order #${data.orderId.slice(-8).toUpperCase()}</p>
    </div>

    <!-- Event Details -->
    <div style="padding: 24px;">
      <h3 style="margin: 0 0 16px; color: #333; font-size: 18px;">${data.eventName}</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #666;">
          <strong>=Å Date:</strong> ${data.eventDate}${data.eventTime ? ` at ${data.eventTime}` : ''}
        </p>
        ${data.venueName ? `
        <p style="margin: 0 0 8px; color: #666;">
          <strong>=Í Venue:</strong> ${data.venueName}
        </p>
        ` : ''}
        ${data.venueAddress ? `
        <p style="margin: 0; color: #666;">
          <strong>=ë Address:</strong> ${data.venueAddress}
        </p>
        ` : ''}
      </div>

      <!-- Tickets Table -->
      <h4 style="margin: 0 0 12px; color: #333; font-size: 16px;">Your Tickets</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Ticket Type</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 8px 12px; text-align: right; color: #666;">Subtotal</td>
            <td style="padding: 8px 12px; text-align: right;">$${data.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px 12px; text-align: right; color: #666;">Service Fee</td>
            <td style="padding: 8px 12px; text-align: right;">$${data.serviceFee.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 16px;">
            <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #333;">Total</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #333;">$${data.total.toFixed(2)} ${data.currency.toUpperCase()}</td>
          </tr>
        </tfoot>
      </table>

      ${data.qrCodeUrl ? `
      <!-- QR Code -->
      <div style="text-align: center; padding: 24px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; color: #666; font-size: 14px;">Show this QR code at the venue</p>
        <img src="${data.qrCodeUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px;">
      </div>
      ` : ''}

      ${data.orderUrl ? `
      <!-- View Tickets Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.orderUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Your Tickets
        </a>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
        Questions? Contact us at ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}
      </p>
      <p style="margin: 0; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} ${data.promoter.name}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
Order Confirmation - ${data.promoter.name}

Order #${data.orderId.slice(-8).toUpperCase()} Confirmed!

Event: ${data.eventName}
Date: ${data.eventDate}${data.eventTime ? ` at ${data.eventTime}` : ''}
${data.venueName ? `Venue: ${data.venueName}` : ''}
${data.venueAddress ? `Address: ${data.venueAddress}` : ''}

Your Tickets:
${data.tickets.map(t => `- ${t.tierName} x${t.quantity}: $${(t.price * t.quantity).toFixed(2)}`).join('\n')}

Subtotal: $${data.subtotal.toFixed(2)}
Service Fee: $${data.serviceFee.toFixed(2)}
Total: $${data.total.toFixed(2)} ${data.currency.toUpperCase()}

${data.orderUrl ? `View your tickets: ${data.orderUrl}` : ''}

Questions? Contact ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}
    `.trim()

    return this.sendEmail({
      to: { email: data.customerEmail, name: data.customerName },
      subject: `Order Confirmed: ${data.eventName}`,
      html,
      text,
      from: {
        email: data.promoter.supportEmail || DEFAULT_FROM_EMAIL,
        name: data.promoter.name,
      },
      tags: [
        { name: 'type', value: 'order_confirmation' },
        { name: 'promoter', value: data.promoter.slug },
        { name: 'order_id', value: data.orderId },
      ],
    })
  }

  /**
   * Send password reset notification email
   */
  async sendPasswordResetNotification(data: PasswordResetEmailData): Promise<EmailResult> {
    const primaryColor = data.promoter.primaryColor || '#6ac045'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
      ${data.promoter.logo
        ? `<img src="${data.promoter.logo}" alt="${data.promoter.name}" style="max-height: 50px; max-width: 200px;">`
        : `<h1 style="color: #ffffff; margin: 0; font-size: 24px;">${data.promoter.name}</h1>`
      }
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px; color: #333; font-size: 22px;">Password Reset</h2>
      <p style="margin: 0 0 16px; color: #666; font-size: 16px; line-height: 1.5;">
        Hi ${data.customerName || 'there'},
      </p>
      <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
        Your password has been reset. Here are your new login credentials:
      </p>

      <!-- Credentials Box -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px; color: #333;">
          <strong>Email:</strong> ${data.customerEmail}
        </p>
        <p style="margin: 0; color: #333;">
          <strong>Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.newPassword}</code>
        </p>
      </div>

      <p style="margin: 0 0 24px; color: #666; font-size: 14px; line-height: 1.5;">
          For security, please change this password after logging in.
      </p>

      <!-- Login Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.loginUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Log In Now
        </a>
      </div>

      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.5;">
        If you didn't request this password reset, please contact us immediately at ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} ${data.promoter.name}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
Password Reset - ${data.promoter.name}

Hi ${data.customerName || 'there'},

Your password has been reset. Here are your new login credentials:

Email: ${data.customerEmail}
Password: ${data.newPassword}

For security, please change this password after logging in.

Log in at: ${data.loginUrl}

If you didn't request this password reset, please contact us immediately at ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}.
    `.trim()

    return this.sendEmail({
      to: { email: data.customerEmail, name: data.customerName },
      subject: `Your Password Has Been Reset - ${data.promoter.name}`,
      html,
      text,
      from: {
        email: data.promoter.supportEmail || DEFAULT_FROM_EMAIL,
        name: data.promoter.name,
      },
      tags: [
        { name: 'type', value: 'password_reset' },
        { name: 'promoter', value: data.promoter.slug },
      ],
    })
  }

  /**
   * Send welcome email for new account
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
    const primaryColor = data.promoter.primaryColor || '#6ac045'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
      ${data.promoter.logo
        ? `<img src="${data.promoter.logo}" alt="${data.promoter.name}" style="max-height: 50px; max-width: 200px;">`
        : `<h1 style="color: #ffffff; margin: 0; font-size: 24px;">${data.promoter.name}</h1>`
      }
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px; color: #333; font-size: 22px;">Welcome to ${data.promoter.name}!</h2>
      <p style="margin: 0 0 16px; color: #666; font-size: 16px; line-height: 1.5;">
        Hi ${data.customerName || 'there'},
      </p>
      <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
        Your account has been created successfully. You can now browse events, purchase tickets, and manage your orders all in one place.
      </p>

      <!-- Get Started Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.loginUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Browse Events
        </a>
      </div>

      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.5;">
        Questions? We're here to help at ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} ${data.promoter.name}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
Welcome to ${data.promoter.name}!

Hi ${data.customerName || 'there'},

Your account has been created successfully. You can now browse events, purchase tickets, and manage your orders all in one place.

Browse events: ${data.loginUrl}

Questions? We're here to help at ${data.promoter.supportEmail || `support@${data.promoter.slug}.com`}.
    `.trim()

    return this.sendEmail({
      to: { email: data.customerEmail, name: data.customerName },
      subject: `Welcome to ${data.promoter.name}!`,
      html,
      text,
      from: {
        email: data.promoter.supportEmail || DEFAULT_FROM_EMAIL,
        name: data.promoter.name,
      },
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'promoter', value: data.promoter.slug },
      ],
    })
  }

  /**
   * Check if Resend is properly configured
   */
  isConfigured(): boolean {
    return !!resend
  }
}

export const ResendService = new ResendServiceClass()
