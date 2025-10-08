"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealClientIp = void 0;
const getRealClientIp = (req) => {
    let ip;
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (typeof cfConnectingIp === 'string') {
        ip = cfConnectingIp;
    }
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (!ip && typeof xForwardedFor === 'string') {
        ip = xForwardedFor.split(',')[0]?.trim();
    }
    if (!ip && req.socket?.remoteAddress) {
        ip = req.socket.remoteAddress;
    }
    if (!ip)
        return '';
    if (ip.startsWith('::ffff:'))
        ip = ip.replace('::ffff:', '');
    if (ip === '::1')
        ip = '127.0.0.1';
    return ip;
};
exports.getRealClientIp = getRealClientIp;
//# sourceMappingURL=GetIp.js.map