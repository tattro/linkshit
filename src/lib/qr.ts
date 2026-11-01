/** Page views from scanning the QR code show up under this referrer. */
export const QR_REFERRER = "QR code";

/** The address the QR code points at; ?qr lets the page count it as a scan. */
export const qrTarget = (pageUrl: string) => `${pageUrl}?qr`;
