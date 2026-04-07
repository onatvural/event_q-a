"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { getVisitorId, timeAgo } from "@/lib/utils";
import { ArrowLeft, ChevronUp, MessageCircle, Users, Trash2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface QuestionItem {
  id: string;
  text: string;
  speakerId: string;
  speakerName: string | null;
  authorId: string;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
}

export default function QuestionFeed() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [visitorId, setVisitorId] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setVisitorId(getVisitorId());
    setIsAdmin(sessionStorage.getItem("admin_authenticated") === "true");
  }, []);

  // Fetch event data for speaker tabs
  const { data: event } = useSWR(`/api/events/${eventId}`, fetcher);

  // Build questions URL with filters
  const questionsUrl = (() => {
    const params = new URLSearchParams();
    if (visitorId) params.set("voterId", visitorId);
    if (activeSpeaker) params.set("speakerId", activeSpeaker);
    return `/api/events/${eventId}/questions?${params.toString()}`;
  })();

  // Poll questions every 2s (only after visitorId is ready)
  const { data: questions, mutate } = useSWR<QuestionItem[]>(
    visitorId ? questionsUrl : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  // Poll live attendee count
  const { data: presence } = useSWR(
    `/api/events/${eventId}/presence`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Heartbeat every 10s
  useEffect(() => {
    if (!eventId || !visitorId) return;

    const sendHeartbeat = () => {
      fetch(`/api/events/${eventId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [eventId, visitorId]);

  const handleVote = useCallback(
    async (questionId: string) => {
      if (!visitorId) return;

      // Optimistic update
      mutate(
        (current) =>
          current?.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  hasVoted: !q.hasVoted,
                  voteCount: q.hasVoted ? q.voteCount - 1 : q.voteCount + 1,
                }
              : q
          ),
        false
      );

      try {
        await fetch(`/api/events/${eventId}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            voterId: visitorId,
          }),
        });
        // Revalidate after server confirms
        mutate();
      } catch {
        // Revert on error
        mutate();
      }
    },
    [eventId, visitorId, mutate]
  );

  const handleDelete = useCallback(
    async (questionId: string) => {
      if (!window.confirm("Delete this question?")) return;

      mutate(
        (current) => current?.filter((q) => q.id !== questionId),
        false
      );

      try {
        await fetch(`/api/events/${eventId}/questions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        });
        mutate();
      } catch {
        mutate();
      }
    },
    [eventId, mutate]
  );

  const speakers: { id: string; name: string }[] = event?.speakers ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/event/${eventId}`)}
          className="inline-flex items-center gap-1.5 text-secondary text-sm hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          Speakers
        </button>

        {/* Live count */}
        {presence && (
          <div className="inline-flex items-center gap-2 bg-btnPrimary text-white rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-widest">Live</span>
            <Users className="w-5 h-5" />
            <span className="text-[11px] font-medium">{presence.activeVisitors}</span>
          </div>
        )}
      </div>

      <h1 className="text-xl font-bold font-serif text-primary">Questions</h1>

      {/* Speaker filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setActiveSpeaker(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
            activeSpeaker === null
              ? "bg-btnPrimary text-white shadow-sm"
              : "bg-surface text-secondary border border-border hover:border-goldBorder hover:text-primary"
          }`}
        >
          All
        </button>
        {speakers.map((speaker) => (
          <button
            key={speaker.id}
            onClick={() =>
              setActiveSpeaker(
                activeSpeaker === speaker.id ? null : speaker.id
              )
            }
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
              activeSpeaker === speaker.id
                ? "bg-btnPrimary text-white shadow-sm"
                : "bg-surface text-secondary border border-border hover:border-goldBorder hover:text-primary"
            }`}
          >
            {speaker.name}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {!questions ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <MessageCircle className="w-14 h-14 text-disabled mx-auto" />
            <p className="text-secondary font-medium">No questions yet</p>
            <p className="text-tertiary text-sm">Be the first to ask!</p>
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="bg-surface rounded-2xl shadow-sm p-4 border border-border hover:translate-y-[-1px] hover:shadow-md transition-all duration-200"
            >
              {/* Question text */}
              <p className="text-primary text-[15px] leading-relaxed">
                {q.text}
              </p>

              {/* Meta row */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Speaker badge */}
                  {q.speakerName && (
                    <span className="text-xs bg-cream text-secondary border border-border px-2 py-0.5 rounded-full">
                      {q.speakerName}
                    </span>
                  )}
                  {/* Time */}
                  <span className="text-xs text-tertiary">
                    {timeAgo(q.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Admin delete */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 rounded-lg text-disabled hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}

                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(q.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 ${
                      q.hasVoted
                        ? "bg-activeBg text-gold border border-goldBorder"
                        : "bg-voteResting text-secondary border border-border hover:border-goldBorder"
                    }`}
                  >
                    <ChevronUp className="w-6 h-6" />
                    {q.voteCount}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
