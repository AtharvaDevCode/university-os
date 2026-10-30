const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const prisma = new PrismaClient();

const EXPORT_DIR = path.join(process.cwd(), 'sogo_export');
const FOLDER = 'INBOX';

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    );
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(div|p|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collectParts(node, result = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectParts(item, result);
    return result;
  }

  if (!node || typeof node !== 'object') return result;

  const contentType = String(node.contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (
    contentType.startsWith('text/plain') ||
    contentType.startsWith('text/html')
  ) {
    if (typeof node.content === 'string') {
      result.push({
        contentType,
        content: node.content,
      });
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      collectParts(value, result);
    }
  }

  return result;
}

function collectAttachments(node, result = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectAttachments(item, result);
    return result;
  }

  if (!node || typeof node !== 'object') return result;

  const contentType = String(node.contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  // Text parts are message bodies, not attachments.
  if (
    node.filename &&
    node.downloadURL &&
    contentType &&
    !contentType.startsWith('text/')
  ) {
    result.push({
      filename: String(node.filename),
      contentType,
      size: node.size != null ? String(node.size) : null,
      downloadUrl: node.downloadURL,
      viewUrl: node.viewURL || null,
      rawPart: node,
    });
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      collectAttachments(value, result);
    }
  }

  return result;
}

function normalizeAddresses(value) {
  if (!value) return [];

  const entries = Array.isArray(value) ? value : [value];

  return entries.map((entry) => {
    if (typeof entry === 'string') return entry;

    if (!entry || typeof entry !== 'object') {
      return String(entry);
    }

    const name =
      entry.name ||
      entry.displayName ||
      entry.personal ||
      '';

    const address =
      entry.email ||
      entry.address ||
      entry.mail ||
      '';

    if (name && address) return `${name} <${address}>`;
    return name || address || JSON.stringify(entry);
  });
}

function parseDate(value) {
  if (!value) return null;

  // Convert common German timezone abbreviations to explicit offsets.
  const normalized = String(value)
    .replace(/\bCEST\b/g, '+0200')
    .replace(/\bCET\b/g, '+0100');

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractBody(parts) {
  const collected = collectParts(parts);

  const plainParts = collected
    .filter((part) => part.contentType === 'text/plain')
    .map((part) => htmlToText(part.content));

  const htmlParts = collected
    .filter((part) => part.contentType === 'text/html')
    .map((part) => part.content);

  return {
    textBody: plainParts.filter(Boolean).join('\n\n') || null,
    bodyHtml: htmlParts.join('\n') || null,
  };
}

async function importMessage(file) {
  const match = file.match(/^message_(\d+)\.json$/);
  if (!match) return false;

  const uid = Number(match[1]);
  const filePath = path.join(EXPORT_DIR, file);

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const senderList = normalizeAddresses(data.from);
  const toRecipients = normalizeAddresses(data.to);
  const ccRecipients = normalizeAddresses(data.cc);

  const sender = senderList.join(', ') || 'Unknown sender';

  const subject = data.subject || '(No subject)';
  const receivedAt = parseDate(data.date);

  const { textBody, bodyHtml } = extractBody(data.parts);
  const attachments = collectAttachments(data.parts);

  const contentHash = createHash('sha256')
    .update(raw)
    .digest('hex');

  const messageId = `sogo:${FOLDER}:${uid}`;

  const emailData = {
    sogoUid: uid,
    folder: FOLDER,
    sender,
    toRecipients,
    ccRecipients,
    subject,
    receivedAt,
    isRead: Boolean(data.isRead),
    hasAttachments: attachments.length > 0,
    textBody,
    bodyHtml,
    rawJson: data,
    contentHash,
  };

  const email = await prisma.emailRecord.upsert({
    where: { messageId },
    create: {
      messageId,
      ...emailData,
    },
    update: emailData,
  });

  // Replace attachment metadata for this message on every import.
  await prisma.emailAttachment.deleteMany({
    where: { emailRecordId: email.id },
  });

  if (attachments.length > 0) {
    await prisma.emailAttachment.createMany({
      data: attachments.map((attachment) => ({
        emailRecordId: email.id,
        ...attachment,
      })),
    });
  }

  return true;
}

async function main() {
  if (!fs.existsSync(EXPORT_DIR)) {
    throw new Error(`Export directory not found: ${EXPORT_DIR}`);
  }

  const files = fs.readdirSync(EXPORT_DIR)
    .filter((file) => /^message_\d+\.json$/.test(file))
    .sort((a, b) => {
      const uidA = Number(a.match(/\d+/)[0]);
      const uidB = Number(b.match(/\d+/)[0]);
      return uidA - uidB;
    });

  console.log(`Found ${files.length} exported messages.`);
  console.log('Importing into Neon PostgreSQL...\n');

  let imported = 0;
  let failed = 0;

  for (const file of files) {
    try {
      await importMessage(file);
      imported++;
      console.log(`[OK] ${file}`);
    } catch (error) {
      failed++;
      console.error(`[FAILED] ${file}: ${error.message}`);
    }
  }

  // Record successful import time and folder state.
  if (failed === 0) {
    await prisma.emailSyncState.upsert({
      where: { folder: FOLDER },
      create: {
        folder: FOLDER,
        lastSyncedAt: new Date(),
      },
      update: {
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
  }

  console.log('\nImport complete.');
  console.log(`Imported/updated: ${imported}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });