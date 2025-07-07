import { Request } from 'express';

export const getRealClientIp = (req: Request): string => {
  let ip: string | undefined;

  // Check Cloudflare's header
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string') {
    ip = cfConnectingIp;
  }

  // Check X-Forwarded-For header
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (!ip && typeof xForwardedFor === 'string') {
    ip = xForwardedFor.split(',')[0]?.trim();
  }

  // Use socket's remote address
  if (!ip && req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // Normalize the IP
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (ip === '::1') ip = '127.0.0.1';

  return ip;
};
