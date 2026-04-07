import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { speakers } = await request.json();

    if (!speakers || !Array.isArray(speakers)) {
      return NextResponse.json(
        { error: 'speakers array is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Delete all existing speakers for this event
    await db
      .delete(schema.speakers)
      .where(eq(schema.speakers.eventId, eventId));

    if (speakers.length === 0) {
      return NextResponse.json([]);
    }

    const speakerValues = speakers.map(
      (speaker: { id?: string; name: string; topic: string }, index: number) => ({
        eventId,
        name: speaker.name,
        topic: speaker.topic,
        displayOrder: index,
      })
    );

    const createdSpeakers = await db
      .insert(schema.speakers)
      .values(speakerValues)
      .returning();

    return NextResponse.json(createdSpeakers);
  } catch (error) {
    console.error('PUT /api/events/[eventId]/speakers error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { speakers } = await request.json();

    if (!speakers || !Array.isArray(speakers) || speakers.length === 0) {
      return NextResponse.json(
        { error: 'speakers array is required and must not be empty' },
        { status: 400 }
      );
    }

    const speakerValues = speakers.map(
      (speaker: { name: string; topic: string }, index: number) => ({
        eventId,
        name: speaker.name,
        topic: speaker.topic,
        displayOrder: index,
      })
    );

    const createdSpeakers = await getDb()
      .insert(schema.speakers)
      .values(speakerValues)
      .returning();

    return NextResponse.json(createdSpeakers, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
