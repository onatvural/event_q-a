import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';

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
