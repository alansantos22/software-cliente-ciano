import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.MAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.MAIL_PORT || '465', 10),
  secure: process.env.MAIL_SECURE !== 'false', // true por padrão (porta 465)
  user: process.env.MAIL_USER || 'adm@gshark.com.br',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'Ciano Cotas <adm@gshark.com.br>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
