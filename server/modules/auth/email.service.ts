import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private smtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  async sendVerificationCode(args: {
    to: string;
    code: string;
    purpose: 'register' | 'reset_password';
    expiresInMinutes: number;
  }): Promise<'smtp' | 'log'> {
    const subject = args.purpose === 'register' ? 'Extoken 注册验证码' : 'Extoken 重置密码验证码';
    const text = [
      `你的 Extoken 验证码是：${args.code}`,
      '',
      `验证码 ${args.expiresInMinutes} 分钟内有效。`,
      '如果这不是你本人操作，请忽略这封邮件。',
    ].join('\n');

    if (!this.smtpConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('邮件服务未配置，请联系管理员配置 SMTP');
      }
      this.logger.warn(`[email-code:${args.purpose}] ${args.to} -> ${args.code}`);
      return 'log';
    }

    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: args.to,
      subject,
      text,
    });
    return 'smtp';
  }
}
