const sendMail = jest.fn().mockResolvedValue(undefined);
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

const makeConfig = (overrides: Record<string, any> = {}) => {
  const base: Record<string, any> = {
    'email.user': 'user',
    'email.password': 'pass',
    'email.host': 'smtp.test',
    'email.port': 587,
    'email.secure': false,
    'email.from': 'no-reply@ciano.com',
    'email.frontendUrl': 'https://app.ciano.com',
    ...overrides,
  };
  return { get: jest.fn((k: string) => base[k]) } as any;
};

describe('EmailService', () => {
  afterEach(() => jest.clearAllMocks());

  it('configures an authenticated transport when credentials are present', () => {
    new EmailService(makeConfig());
    const opts = (nodemailer.createTransport as jest.Mock).mock.calls[0][0];
    expect(opts.auth).toEqual({ user: 'user', pass: 'pass' });
  });

  it('omits auth when credentials are missing (local relay)', () => {
    new EmailService(makeConfig({ 'email.user': undefined, 'email.password': undefined }));
    const opts = (nodemailer.createTransport as jest.Mock).mock.calls[0][0];
    expect(opts.auth).toBeUndefined();
  });

  it('sends a reset email with the token link', async () => {
    const service = new EmailService(makeConfig());
    await service.sendPasswordResetEmail('to@test.com', 'Alice', 'tok-123');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('to@test.com');
    expect(mail.from).toBe('no-reply@ciano.com');
    expect(mail.html).toContain('https://app.ciano.com/reset-password/tok-123');
    expect(mail.html).toContain('Alice');
  });

  it('swallows transport errors without throwing (does not reveal failure)', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const service = new EmailService(makeConfig());

    await expect(
      service.sendPasswordResetEmail('to@test.com', 'Alice', 'tok'),
    ).resolves.toBeUndefined();
  });
});
