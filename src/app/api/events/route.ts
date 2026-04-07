import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    const events = await db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt));

    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const [speakerResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.speakers)
          .where(eq(schema.speakers.eventId, event.id));

        const [questionResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.questions)
          .where(eq(schema.questions.eventId, event.id));

        return {
          ...event,
          speakerCount: Number(speakerResult.count),
          questionCount: Number(questionResult.count),
        };
      })
    );

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, date, adminPassword } = await request.json();

    if (!title || !date || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, adminPassword' },
        { status: 400 }
      );
    }

    const [event] = await getDb()
      .insert(schema.events)
      .values({
        title,
        date,
        adminPassword,
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
