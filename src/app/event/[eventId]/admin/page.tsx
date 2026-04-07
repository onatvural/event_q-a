"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { getVisitorId, timeAgo } from "@/lib/utils";
import { ArrowLeft, Lock, Trash2, MessageCircle, Users, ChevronUp } from 'lucide-react';

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

export default function AdminFeedPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [visitorId, setVisitorId] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    setVisitorId(getVisitorId());
    if (sessionStorage.getItem(`event_admin_${eventId}`) === "true") {
      setAuthenticated(true);
    }
  }, [eventId]);

  // ─── Password verification ────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        sessionStorage.setItem(`event_admin_${eventId}`, "true");
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Data fetching (only when authenticated) ──────────────
  const { data: event } = useSWR(
    authenticated ? `/api/events/${eventId}` : null,
    fetcher
  );

  const questionsUrl = (() => {
    const params = new URLSearchParams();
    if (visitorId) params.set("voterId", visitorId);
    if (activeSpeaker) params.set("speakerId", activeSpeaker);
    return `/api/events/${eventId}/questions?${params.toString()}`;
  })();

  const { data: questions, mutate } = useSWR<QuestionItem[]>(
    authenticated && visitorId ? questionsUrl : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const { data: presence } = useSWR(
    authenticated ? `/api/events/${eventId}/presence` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // ─── Presence heartbeat ───────────────────────────────────
  useEffect(() => {
    if (!authenticated || !eventId || !visitorId) return;

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
  }, [authenticated, eventId, visitorId]);

  // ─── Delete handler ───────────────────────────────────────
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

  // ─── State 1: Password Gate ───────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm border border-border p-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cream border border-border flex items-center justify-center">
              <Lock className="w-5 h-5 text-gold" />
            </div>
            <h1 className="text-xl font-bold font-serif text-primary">Admin Access</h1>
            <p className="text-sm text-secondary text-center">
              Enter the event admin password
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-disabled focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200 outline-none"
              autoFocus
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full py-2.5 rounded-xl bg-btnPrimary text-white text-sm font-medium hover:bg-btnHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Verifying..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── State 2: Admin Feed ──────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/event/${eventId}`)}
          className="inline-flex items-center gap-1.5 text-secondary text-sm hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Live count */}
        {presence && (
          <div className="inline-flex items-center gap-2 bg-btnPrimary text-white rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-medium uppercase tracking-widest">Live</span>
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{presence.activeVisitors}</span>
          </div>
        )}
      </div>

      <h1 className="text-xl font-bold font-serif text-primary">Admin Feed</h1>

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
            <MessageCircle className="w-10 h-10 text-disabled mx-auto" />
            <p className="text-secondary font-medium">No questions yet</p>
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
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg text-disabled hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Vote count (display only) */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-voteResting text-secondary border border-border">
                    <ChevronUp className="w-4 h-4" />
                    {q.voteCount}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
