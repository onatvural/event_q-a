import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { questionId, voterId } = await request.json();

    if (!questionId || !voterId) {
      return NextResponse.json(
        { error: 'questionId and voterId are required' },
        { status: 400 }
      );
    }

    // Check if vote already exists
    const existingVote = await getDb()
      .select()
      .from(schema.votes)
      .where(
        and(
          eq(schema.votes.questionId, questionId),
          eq(schema.votes.voterId, voterId)
        )
      )
      .limit(1);

    let voted: boolean;

    if (existingVote.length > 0) {
      // Remove the vote (unvote)
      await getDb()
        .delete(schema.votes)
        .where(
          and(
            eq(schema.votes.questionId, questionId),
            eq(schema.votes.voterId, voterId)
          )
        );
      voted = false;
    } else {
      // Create the vote
      await getDb().insert(schema.votes).values({
        questionId,
        voterId,
      });
      voted = true;
    }

    // Get updated vote count
    const [result] = await getDb()
      .select({ voteCount: sql<number>`COUNT(*)::int` })
      .from(schema.votes)
      .where(eq(schema.votes.questionId, questionId));

    return NextResponse.json({
      voted,
      voteCount: result.voteCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
