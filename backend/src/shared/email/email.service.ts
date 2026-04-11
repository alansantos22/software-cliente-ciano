import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });
  }

  async sendPasswordResetEmail(toEmail: string, toName: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('email.frontendUrl');
    const from = this.configService.get<string>('email.from');
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    const html = this.buildResetEmailHtml(toName, resetLink);

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Redefinição de senha – Ciano Cotas',
        html,
      });

      this.logger.log(`E-mail de redefinição de senha enviado para ${toEmail}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail para ${toEmail}: ${(error as Error).message}`);
      // Não lançar exceção: não revelar ao cliente se o envio falhou
    }
  }

  private buildResetEmailHtml(name: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 40px 40px 32px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; }
    .header-tagline { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .text { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
           color: #ffffff !important; text-decoration: none; padding: 16px 40px;
           border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.01em; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .link-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                padding: 12px 16px; word-break: break-all; font-size: 13px; color: #64748b; }
    .expiry { font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Cabeçalho -->
      <div class="header">
        <div class="header-logo">Ciano</div>
        <div class="header-tagline">Sistema de Cotas</div>
      </div>

      <!-- Corpo -->
      <div class="body">
        <p class="greeting">Olá, ${name}!</p>

        <p class="text">
          Recebemos uma solicitação para redefinir a senha da sua conta na plataforma
          <strong>Ciano Cotas</strong>. Se foi você, clique no botão abaixo para criar uma nova senha.
        </p>

        <div class="btn-wrap">
          <a href="${resetLink}" class="btn">Redefinir minha senha</a>
        </div>

        <p class="text">
          Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <div class="link-box">${resetLink}</div>

        <p class="expiry">⏱ Este link é válido por <strong>1 hora</strong>.</p>

        <hr class="divider" />

        <p class="text" style="font-size: 13px; color: #94a3b8;">
          Se você não solicitou a redefinição de senha, ignore este e-mail.
          Sua senha permanecerá a mesma e nenhuma ação é necessária.
        </p>
      </div>

      <!-- Rodapé -->
      <div class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Ciano Cotas. Todos os direitos reservados.<br />
          Este é um e-mail automático, por favor não responda.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
