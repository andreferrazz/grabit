import { SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '$app/env/private';
import nodemailer from 'nodemailer';

const port = Number(SMTP_PORT);

const transport = nodemailer.createTransport({
	host: SMTP_HOST,
	port,
	secure: port === 465,
	auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

export async function sendMail(message: { to: string; subject: string; text: string }) {
	await transport.sendMail({ from: SMTP_FROM, ...message });
}
