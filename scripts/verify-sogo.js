const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const sogoEmails = await prisma.emailRecord.findMany({
    where: {
      messageId: { startsWith: 'sogo:INBOX:' },
    },
    select: {
      messageId: true,
      subject: true,
      textBody: true,
      receivedAt: true,
      hasAttachments: true,
    },
    orderBy: { sogoUid: 'asc' },
  });

  const attachments = await prisma.emailAttachment.findMany({
    where: {
      email: {
        messageId: { startsWith: 'sogo:INBOX:' },
      },
    },
    select: {
      filename: true,
      contentType: true,
      size: true,
    },
  });

  console.log('SOGo email count:', sogoEmails.length);
  console.log(
    'Missing subjects:',
    sogoEmails.filter((e) => !e.subject).length
  );
  console.log(
    'Missing dates:',
    sogoEmails.filter((e) => !e.receivedAt).length
  );
  console.log(
    'Missing text bodies:',
    sogoEmails.filter((e) => !e.textBody).length
  );
  console.log('SOGo attachments:', attachments);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());