import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { visitorId } = await request.json();

    if (!visitorId) {
      return NextResponse.json(
        { error: 'visitorId is required' },
        { status: 400 }
      );
    }

    // Use visitorId as the presence record id.
    // Upsert: ON CONFLICT on the primary key (id), update lastSeen.
    await getDb()
      .insert(schema.presence)
      .values({
        id: visitorId,
        eventId,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.presence.id,
        set: {
          lastSeen: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    // Clean up stale records (lastSeen > 60 seconds ago)
    await getDb()
      .delete(schema.presence)
      .where(
        sql`${schema.presence.eventId} = ${eventId} AND ${schema.presence.lastSeen} < ${sixtySecondsAgo}`
      );

    // Count active visitors (lastSeen within last 30 seconds)
    const [result] = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.presence)
      .where(
        sql`${schema.presence.eventId} = ${eventId} AND ${schema.presence.lastSeen} >= ${thirtySecondsAgo}`
      );

    return NextResponse.json({ activeVisitors: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
