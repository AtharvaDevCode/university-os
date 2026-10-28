import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const allowedStatuses = ['UNVERIFIED', 'VERIFIED', 'CONFLICTING'] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 },
      );
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: body.status },
      include: { sources: true },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 },
    );
  }
}