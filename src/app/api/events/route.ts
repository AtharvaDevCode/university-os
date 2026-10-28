import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: { sources: true },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json(
        { error: 'Event title is required' },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        category: typeof body.category === 'string' ? body.category : 'Event',
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        venue: body.venue || null,
        roomNumber: body.roomNumber || null,
        language: body.language || null,
        registrationUrl: body.registrationUrl || null,
        status: 'UNVERIFIED',
        sources: {
          create: {
            type: 'MANUAL',
            filename: 'Manually created event',
            sender: 'You',
            evidence: 'Created manually. No external source is attached.',
            url: body.sourceUrl || null,
          },
        },
      },
      include: { sources: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 },
    );
  }
}