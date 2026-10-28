import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createImapClient } from '@/lib/imap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Allow unauthenticated requests only during local development.
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.UNIVERSITY_OS_CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!secret || authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }
  }

  let client: ImapFlow | undefined;
  let lock: Awaited<ReturnType<ImapFlow['getMailboxLock']>> | undefined;

  try {
    client = createImapClient();

    await client.connect();
    lock = await client.getMailboxLock('INBOX', { readOnly: true });

    const total = client.mailbox ? client.mailbox.exists : 0;
    const start = 1;
    let processed = 0;

    if (total > 0) {
      for await (const message of client.fetch(`${start}:${total}`, {
        uid: true,
        internalDate: true,
        source: true,
      })) {
        if (!message.source) continue;

        const parsed = await simpleParser(message.source);
        const messageId =
          parsed.messageId?.trim() ||
          `inbox-uid-${message.uid}@university-os.local`;

        const sender =
          parsed.from?.value
            .map((address) =>
              address.name
                ? `${address.name} <${address.address ?? ''}>`
                : address.address ?? '',
            )
            .filter(Boolean)
            .join(', ') || 'Unknown sender';

        const contentHash = createHash('sha256')
          .update(message.source)
          .digest('hex');

        const emailData = {
          folder: 'INBOX',
          sender,
          subject: parsed.subject || '(No subject)',
          textBody: parsed.text || null,
          receivedAt: message.internalDate ?? new Date(),
          contentHash,
        };

        await prisma.emailRecord.upsert({
          where: { messageId },
          create: {
            messageId,
            ...emailData,
          },
          update: emailData,
        });

        processed++;
      }
    }

    return NextResponse.json({
      success: true,
      mailboxTotal: total,
      processed,
      message:
        'Inbox messages synced, including plain-text bodies. No emails were moved or modified.',
    });
  } catch (error) {
    console.error('Inbox sync failed:', error);

    return NextResponse.json(
      {
        error:
          'Inbox sync failed. Check the server logs for details.',
      },
      { status: 500 },
    );
  } finally {
    lock?.release();

    if (client?.usable) {
      await client.logout().catch(() => {});
    }
  }
}
