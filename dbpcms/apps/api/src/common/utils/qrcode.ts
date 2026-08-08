/**
 * QR code generator.
 * Used for student ID cards, exam papers, etc.
 *
 * We use the `qrcode` library to generate base64 PNG data URLs.
 * No external API calls, no network, fully self-contained.
 */

import QRCode from 'qrcode';

export interface QrOptions {
  /** Data to encode (usually an ID) */
  data: string;
  /** Size in pixels (default 300) */
  size?: number;
  /** Error correction level */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQrCodeDataUrl(options: QrOptions): Promise<string> {
  return QRCode.toDataURL(options.data, {
    width: options.size ?? 300,
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

export async function generateQrCodeBuffer(options: QrOptions): Promise<Buffer> {
  return QRCode.toBuffer(options.data, {
    width: options.size ?? 300,
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: 1,
  });
}
