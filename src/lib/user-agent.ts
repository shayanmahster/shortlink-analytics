import crypto from 'node:crypto';

export interface ParsedUserAgent {
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot';
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const value = (ua ?? '').trim();
  if (!value) {
    return { device: 'Desktop', browser: 'Unknown', os: 'Unknown' };
  }

  // Device detection
  let device: ParsedUserAgent['device'] = 'Desktop';
  if (/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|curl|wget/i.test(value)) {
    device = 'Bot';
  } else if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(value)) {
    device = 'Tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(value)) {
    device = 'Mobile';
  }

  // Browser detection
  let browser = 'Other';
  if (/edg\//i.test(value)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(value)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(value) && !/edg\//i.test(value)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(value)) {
    browser = 'Firefox';
  } else if (/safari/i.test(value) && !/chrome|crios/i.test(value)) {
    browser = 'Safari';
  } else if (/curl/i.test(value)) {
    browser = 'cURL';
  }

  // OS detection
  let os = 'Other';
  if (/windows/i.test(value)) {
    os = 'Windows';
  } else if (/iphone|ipad|ipod/i.test(value)) {
    os = 'iOS';
  } else if (/mac os x|macintosh/i.test(value)) {
    os = 'macOS';
  } else if (/android/i.test(value)) {
    os = 'Android';
  } else if (/linux/i.test(value)) {
    os = 'Linux';
  }

  return { device, browser, os };
}

export function extractReferrerHost(referrer: string | null | undefined): string {
  if (!referrer) return 'Direct';
  try {
    const parsed = new URL(referrer);
    return parsed.hostname.replace(/^www\./, '') || 'Direct';
  } catch {
    return 'Direct';
  }
}

export function hashIp(ip: string | null | undefined): string {
  const salt = process.env.IP_HASH_SALT || 'shortlink-default-salt';
  const raw = (ip || 'unknown').split(',')[0].trim();
  return crypto.createHash('sha256').update(`${salt}:${raw}`).digest('hex').slice(0, 16);
}
