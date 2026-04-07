import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const deleted = await getDb()
      .delete(schema.events)
      .where(eq(schema.events.id, eventId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/events/[eventId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    const updates: Partial<{ title: string; date: string; adminPassword: string }> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.date !== undefined) updates.date = body.date;
    if (body.adminPassword !== undefined) updates.adminPassword = body.adminPassword;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const [updated] = await getDb()
      .update(schema.events)
      .set(updates)
      .where(eq(schema.events.id, eventId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/events/[eventId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const event = await getDb()
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, eventId))
      .limit(1);

    if (event.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const speakers = await getDb()
      .select()
      .from(schema.speakers)
      .where(eq(schema.speakers.eventId, eventId))
      .orderBy(asc(schema.speakers.displayOrder));

    return NextResponse.json({
      ...event[0],
      speakers,
      speakerCount: speakers.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
