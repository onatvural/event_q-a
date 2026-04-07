'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Speaker {
  name: string;
  topic: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EditEventPage() {
  const router = useRouter();
  const { eventId } = useParams<{ eventId: string }>();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([{ name: '', topic: '' }]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auth check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authed = sessionStorage.getItem('admin_authenticated');
      if (!authed) {
        router.push('/admin');
      }
    }
  }, [router]);

  // Fetch event data
  const { data, isLoading } = useSWR(eventId ? `/api/events/${eventId}` : null, fetcher);

  // Pre-populate form when data arrives
  useEffect(() => {
    if (data && !data.error) {
      setTitle(data.title ?? '');
      setDate(data.date ?? '');
      setAdminPassword(data.adminPassword ?? '');
      if (data.speakers && data.speakers.length > 0) {
        setSpeakers(
          data.speakers.map((s: { name: string; topic: string }) => ({
            name: s.name,
            topic: s.topic,
          }))
        );
      }
    }
  }, [data]);

  // Speaker helpers
  function addSpeaker() {
    setSpeakers([...speakers, { name: '', topic: '' }]);
  }

  function removeSpeaker(index: number) {
    setSpeakers(speakers.filter((_, i) => i !== index));
  }

  function updateSpeaker(index: number, field: keyof Speaker, value: string) {
    const updated = [...speakers];
    updated[index] = { ...updated[index], [field]: value };
    setSpeakers(updated);
  }

  // Save handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      // Update event details
      const eventRes = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, adminPassword }),
      });

      if (!eventRes.ok) {
        const err = await eventRes.json();
        throw new Error(err.error || 'Failed to update event');
      }

      // Update speakers
      const speakersRes = await fetch(`/api/events/${eventId}/speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakers: speakers.filter((s) => s.name.trim() || s.topic.trim()),
        }),
      });

      if (!speakersRes.ok) {
        const err = await speakersRes.json();
        throw new Error(err.error || 'Failed to update speakers');
      }

      setFeedback({ type: 'success', message: 'Event updated successfully!' });
      setTimeout(() => {
        router.push('/admin/events');
      }, 1000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-secondary text-sm mt-3">Loading event...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-4 space-y-6">
      {/* Back navigation */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Header */}
      <h1 className="text-xl font-semibold font-serif text-primary">Edit Event</h1>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Event Details Section */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <h2 className="text-lg font-semibold font-serif text-primary">Event Details</h2>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tech Conference 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Event Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Admin Password
            </label>
            <input
              type="text"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Password for managing this event"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200"
            />
          </div>
        </div>

        {/* Speakers Section */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-serif text-primary">Speakers</h2>
            <span className="text-xs font-medium text-secondary bg-cream px-2.5 py-1 rounded-full">
              {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-4">
            {speakers.map((speaker, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border bg-cream/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Speaker {index + 1}
                  </span>
                  {speakers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSpeaker(index)}
                      className="p-1 text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove speaker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={speaker.name}
                  onChange={(e) => updateSpeaker(index, 'name', e.target.value)}
                  placeholder="Speaker name"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200"
                />
                <input
                  type="text"
                  value={speaker.topic}
                  onChange={(e) => updateSpeaker(index, 'topic', e.target.value)}
                  placeholder="Talk topic"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-all duration-200"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSpeaker}
            className="w-full py-2 px-4 rounded-xl border border-dashed border-border text-secondary hover:border-goldBorder hover:text-gold transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Speaker
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/events')}
            className="flex-1 py-2.5 px-4 rounded-xl border border-border text-primary font-medium hover:bg-cream transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-btnPrimary text-white font-medium hover:bg-btnHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
