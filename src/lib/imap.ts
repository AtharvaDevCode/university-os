import { ImapFlow } from 'imapflow';

export function createImapClient() {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;
  const port = Number(process.env.IMAP_PORT || 993);

  if (!host || !user || !password) {
    throw new Error(
      'Missing IMAP configuration. Check IMAP_HOST, IMAP_USER, and IMAP_PASSWORD in .env.',
    );
  }

  return new ImapFlow({
    host,
    port,
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user, pass: password },
    logger: false,
  });
}