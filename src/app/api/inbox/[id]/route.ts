import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const email = await prisma.emailRecord.findUnique({
      where: { id },
      select: {
        id: true,
        sender: true,
        toRecipients: true,
        ccRecipients: true,
        subject: true,
        receivedAt: true,
        folder: true,
        category: true,
        language: true,
        textBody: true,
        hasAttachments: true,
      },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error('Email retrieval failed:', error);

    return NextResponse.json(
      { error: 'Could not retrieve email.' },
      { status: 500 },
    );
  }
}