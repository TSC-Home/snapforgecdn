import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSmtpSettings, isSmtpConfigured, type SmtpSettings } from './settings';

// Email options interface
export interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

// Email result
export interface EmailResult {
	success: boolean;
	error?: string;
	messageId?: string;
}

// Create transporter from settings
async function createTransporter(): Promise<Transporter | null> {
	const settings = await getSmtpSettings();

	if (!settings.enabled || !settings.host) {
		return null;
	}

	return nodemailer.createTransport({
		host: settings.host,
		port: settings.port,
		secure: settings.secure,
		auth: settings.username ? {
			user: settings.username,
			pass: settings.password
		} : undefined
	});
}

// Send an email
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
	const settings = await getSmtpSettings();

	if (!settings.enabled) {
		return { success: false, error: 'Email is not enabled' };
	}

	const transporter = await createTransporter();
	if (!transporter) {
		return { success: false, error: 'Could not create email transporter' };
	}

	try {
		const result = await transporter.sendMail({
			from: `"${settings.fromName}" <${settings.fromEmail}>`,
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text || options.html.replace(/<[^>]*>/g, '')
		});

		return {
			success: true,
			messageId: result.messageId
		};
	} catch (error) {
		console.error('Error sending email:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send email'
		};
	}
}

// Test SMTP connection
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
	const transporter = await createTransporter();

	if (!transporter) {
		return { success: false, error: 'Email is not configured' };
	}

	try {
		await transporter.verify();
		return { success: true };
	} catch (error) {
		console.error('SMTP verification failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Connection failed'
		};
	}
}

// Send gallery invitation email
export async function sendInvitationEmail(
	recipientEmail: string,
	inviterEmail: string,
	galleryName: string,
	inviteUrl: string,
	baseUrl: string
): Promise<EmailResult> {
	const fullUrl = `${baseUrl}${inviteUrl}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: #f8f9fa; border-radius: 8px; padding: 32px; text-align: center;">
		<h1 style="margin: 0 0 24px; color: #1a1a1a; font-size: 24px;">Gallery Invitation</h1>

		<p style="margin: 0 0 16px; color: #666;">
			<strong>${inviterEmail}</strong> has invited you to collaborate on the gallery:
		</p>

		<p style="margin: 0 0 24px; font-size: 20px; font-weight: 600; color: #1a1a1a;">
			${galleryName}
		</p>

		<a href="${fullUrl}" style="display: inline-block; background: #1a1a1a; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500;">
			Accept Invitation
		</a>

		<p style="margin: 24px 0 0; font-size: 12px; color: #999;">
			This invitation expires in 7 days.
		</p>

		<p style="margin: 16px 0 0; font-size: 12px; color: #999;">
			If the button doesn't work, copy and paste this link:<br>
			<a href="${fullUrl}" style="color: #666;">${fullUrl}</a>
		</p>
	</div>

	<p style="margin: 24px 0 0; font-size: 12px; color: #999; text-align: center;">
		Sent from SnapForgeCDN
	</p>
</body>
</html>
`;

	const text = `
Gallery Invitation

${inviterEmail} has invited you to collaborate on the gallery "${galleryName}".

Accept the invitation by visiting:
${fullUrl}

This invitation expires in 7 days.

Sent from SnapForgeCDN
`;

	return sendEmail({
		to: recipientEmail,
		subject: `You've been invited to "${galleryName}"`,
		html,
		text
	});
}

// Send registration invitation email (for users who don't have an account)
export async function sendRegistrationInviteEmail(
	recipientEmail: string,
	inviterEmail: string,
	galleryName: string,
	inviteUrl: string,
	baseUrl: string
): Promise<EmailResult> {
	const fullUrl = `${baseUrl}${inviteUrl}`;
	const registerUrl = `${baseUrl}/register?invite=${encodeURIComponent(inviteUrl.split('/').pop() || '')}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: #f8f9fa; border-radius: 8px; padding: 32px; text-align: center;">
		<h1 style="margin: 0 0 24px; color: #1a1a1a; font-size: 24px;">Gallery Invitation</h1>

		<p style="margin: 0 0 16px; color: #666;">
			<strong>${inviterEmail}</strong> has invited you to collaborate on the gallery:
		</p>

		<p style="margin: 0 0 24px; font-size: 20px; font-weight: 600; color: #1a1a1a;">
			${galleryName}
		</p>

		<p style="margin: 0 0 24px; color: #666;">
			Create an account to accept this invitation:
		</p>

		<a href="${registerUrl}" style="display: inline-block; background: #1a1a1a; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500;">
			Create Account & Join
		</a>

		<p style="margin: 24px 0 0; font-size: 12px; color: #999;">
			This invitation expires in 7 days.
		</p>

		<p style="margin: 16px 0 0; font-size: 12px; color: #999;">
			If you already have an account, <a href="${fullUrl}" style="color: #666;">click here to accept</a>.
		</p>
	</div>

	<p style="margin: 24px 0 0; font-size: 12px; color: #999; text-align: center;">
		Sent from SnapForgeCDN
	</p>
</body>
</html>
`;

	const text = `
Gallery Invitation

${inviterEmail} has invited you to collaborate on the gallery "${galleryName}".

Create an account to accept this invitation:
${registerUrl}

If you already have an account, accept the invitation here:
${fullUrl}

This invitation expires in 7 days.

Sent from SnapForgeCDN
`;

	return sendEmail({
		to: recipientEmail,
		subject: `You've been invited to "${galleryName}"`,
		html,
		text
	});
}

// Send test email
export async function sendTestEmail(recipientEmail: string): Promise<EmailResult> {
	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: #f8f9fa; border-radius: 8px; padding: 32px; text-align: center;">
		<h1 style="margin: 0 0 24px; color: #1a1a1a; font-size: 24px;">Test Email</h1>

		<p style="margin: 0 0 16px; color: #666;">
			Your email configuration is working correctly!
		</p>

		<p style="margin: 0; font-size: 14px; color: #999;">
			This is a test email from SnapForgeCDN.
		</p>
	</div>
</body>
</html>
`;

	return sendEmail({
		to: recipientEmail,
		subject: 'SnapForgeCDN - Test Email',
		html,
		text: 'Your email configuration is working correctly! This is a test email from SnapForgeCDN.'
	});
}
