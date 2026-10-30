import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('q')?.trim() || '';
    const cursor = params.get('cursor');
    const requestedLimit = Number(params.get('limit')) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);

    const where = query
      ? {
          OR: [
            { subject: { contains: query, mode: 'insensitive' as const } },
            { sender: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [totalCount, emails] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          messageId: true,
          sender: true,
          subject: true,
          receivedAt: true,
          folder: true,
          category: true,
          language: true,
        },
      }),
    ]);

    const hasMore = emails.length > limit;
    const results = hasMore ? emails.slice(0, limit) : emails;

    return NextResponse.json({
      emails: results,
      totalCount,
      nextCursor: hasMore ? results[results.length - 1]?.id : null,
      hasMore,
    });
  } catch (error) {
    console.error('Inbox retrieval failed:', error);
    return NextResponse.json(
      { error: 'Could not retrieve inbox.' },
      { status: 500 },
    );
  }
}