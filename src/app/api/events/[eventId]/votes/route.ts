import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

// In-memory rate limit store (resets on cold start, good enough for event duration)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_FINGERPRINT = 10;
const MAX_PER_IP = 30;

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { questionId, voterId, fingerprint } = await request.json();
    const ip = getClientIp(request);

    if (!questionId || !voterId) {
      return NextResponse.json(
        { error: 'questionId and voterId are required' },
        { status: 400 }
      );
    }

    // Rate limit by fingerprint
    if (fingerprint && !checkRateLimit(`fp:${fingerprint}`, MAX_PER_FINGERPRINT)) {
      return NextResponse.json(
        { error: 'Too many vote actions. Please slow down.' },
        { status: 429 }
      );
    }

    // Rate limit by IP
    if (!checkRateLimit(`ip:${ip}`, MAX_PER_IP)) {
      return NextResponse.json(
        { error: 'Too many vote actions from this network.' },
        { status: 429 }
      );
    }

    const db = getDb();

    // Check if vote exists by voterId OR fingerprint
    const existingByVoter = await db
      .select()
      .from(schema.votes)
      .where(
        and(
          eq(schema.votes.questionId, questionId),
          eq(schema.votes.voterId, voterId)
        )
      )
      .limit(1);

    const existingByFingerprint = fingerprint
      ? await db
          .select()
          .from(schema.votes)
          .where(
            and(
              eq(schema.votes.questionId, questionId),
              eq(schema.votes.fingerprint, fingerprint)
            )
          )
          .limit(1)
      : [];

    let voted: boolean;

    if (existingByVoter.length > 0) {
      // User is toggling off their own vote
      await db
        .delete(schema.votes)
        .where(
          and(
            eq(schema.votes.questionId, questionId),
            eq(schema.votes.voterId, voterId)
          )
        );
      voted = false;
    } else if (existingByFingerprint.length > 0) {
      // Same device already voted (new session / cleared storage)
      // Block the vote
      return NextResponse.json(
        { error: 'You have already voted on this question.', voted: true, blocked: true },
        { status: 409 }
      );
    } else {
      // New vote
      await db.insert(schema.votes).values({
        questionId,
        voterId,
        fingerprint: fingerprint || null,
        ip,
      });
      voted = true;
    }

    // Get updated vote count
    const [result] = await db
      .select({ voteCount: sql<number>`COUNT(*)::int` })
      .from(schema.votes)
      .where(eq(schema.votes.questionId, questionId));

    return NextResponse.json({
      voted,
      voteCount: result.voteCount,
    });
  } catch (error) {
    console.error('POST /api/events/[eventId]/votes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
