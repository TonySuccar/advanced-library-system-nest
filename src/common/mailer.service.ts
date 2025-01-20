// src/mailer/mailer.service.ts
import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Nodemailer configuration using Mailtrap
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // Mailtrap host
      port: parseInt(process.env.EMAIL_PORT, 10), // Mailtrap port
      auth: {
        user: process.env.EMAIL_USER, // Mailtrap username
        pass: process.env.EMAIL_PASS, // Mailtrap password
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Library Service" <${process.env.EMAIL_USER}>`, // Sender address
        to, // Recipient email
        subject, // Subject line
        text, // Plain text body
        html, // Optional HTML body
      });
      console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}`, error.message);
      throw new Error('Email sending failed.');
    }
  }
}
