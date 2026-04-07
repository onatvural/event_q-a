import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const voterId = searchParams.get('voterId');
    const speakerId = searchParams.get('speakerId');

    const voteCountExpr = sql<number>`(
      SELECT COUNT(*)::int FROM votes
      WHERE votes.question_id = ${schema.questions.id}
    )`;

    const hasVotedExpr = voterId
      ? sql<boolean>`EXISTS(
          SELECT 1 FROM votes
          WHERE votes.question_id = ${schema.questions.id}
          AND votes.voter_id = ${voterId}
        )`
      : sql<boolean>`false`;

    const conditions = [eq(schema.questions.eventId, eventId)];
    if (speakerId) {
      conditions.push(eq(schema.questions.speakerId, speakerId));
    }

    const questions = await getDb()
      .select({
        id: schema.questions.id,
        eventId: schema.questions.eventId,
        speakerId: schema.questions.speakerId,
        text: schema.questions.text,
        authorId: schema.questions.authorId,
        createdAt: schema.questions.createdAt,
        speakerName: schema.speakers.name,
        voteCount: voteCountExpr.as('voteCount'),
        hasVoted: hasVotedExpr.as('hasVoted'),
      })
      .from(schema.questions)
      .leftJoin(
        schema.speakers,
        eq(schema.questions.speakerId, schema.speakers.id)
      )
      .where(and(...conditions))
      .orderBy(
        sql`(SELECT COUNT(*) FROM votes WHERE votes.question_id = ${schema.questions.id}) DESC`,
        desc(schema.questions.createdAt)
      );

    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const { speakerId, text, authorId } = await request.json();

    if (!text || !speakerId || !authorId) {
      return NextResponse.json(
        { error: 'speakerId, text, and authorId are required' },
        { status: 400 }
      );
    }

    const [question] = await getDb()
      .insert(schema.questions)
      .values({
        eventId,
        speakerId,
        text,
        authorId,
      })
      .returning();

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
