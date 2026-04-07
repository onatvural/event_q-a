'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Plus, Trash2 } from 'lucide-react';

interface Speaker {
  name: string;
  topic: string;
}

const STEPS = ['Event', 'Speakers', 'Review', 'Publishing', 'Published'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                i < currentStep
                  ? 'bg-btnPrimary text-white'
                  : i === currentStep
                  ? 'bg-btnPrimary text-white ring-4 ring-btnPrimary/20'
                  : 'bg-border text-secondary'
              }`}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                i <= currentStep ? 'text-primary' : 'text-tertiary'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-1 mb-4 transition-colors duration-300 ${
                i < currentStep ? 'bg-btnPrimary' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1: Event details
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 2: Speakers
  const [speakers, setSpeakers] = useState<Speaker[]>([{ name: '', topic: '' }]);

  // Step 4-5: Results
  const [createdEventId, setCreatedEventId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [copied, setCopied] = useState(false);

  // Auth check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authed = sessionStorage.getItem('admin_authenticated');
      if (!authed) {
        router.push('/admin');
      }
    }
  }, [router]);

  // Speakers helpers
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

  const validSpeakers = speakers.filter((s) => s.name.trim() && s.topic.trim());

  // Publishing
  async function publish() {
    setStep(3);
    setPublishError('');

    try {
      // Create event
      const eventRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, adminPassword }),
      });

      if (!eventRes.ok) {
        throw new Error('Failed to create event');
      }

      const event = await eventRes.json();

      // Add speakers
      const speakersRes = await fetch(`/api/events/${event.id}/speakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakers: validSpeakers }),
      });

      if (!speakersRes.ok) {
        throw new Error('Failed to add speakers');
      }

      // Generate QR code
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const eventUrl = `${baseUrl}/event/${event.id}`;

      const qrUrl = await QRCode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FDF8F4' },
      });

      setCreatedEventId(event.id);
      setQrDataUrl(qrUrl);
      setStep(4);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publishing failed');
      setStep(2); // Go back to review
    }
  }

  function getEventUrl() {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return `${baseUrl}/event/${createdEventId}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getEventUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  function resetWizard() {
    setStep(0);
    setTitle('');
    setDate('');
    setAdminPassword('');
    setSpeakers([{ name: '', topic: '' }]);
    setCreatedEventId('');
    setQrDataUrl('');
    setPublishError('');
    setCopied(false);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-[80vh] py-4">
      <h1 className="text-xl font-semibold font-serif text-primary text-center mb-2">
        Create Event
      </h1>

      <StepIndicator currentStep={step} />

      <div className="transition-all duration-300">
        {/* Step 1: Event Details */}
        {step === 0 && (
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
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-colors"
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
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Event Admin Password
              </label>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password for managing this event"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-colors"
              />
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!title.trim() || !date || !adminPassword.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-btnPrimary text-white font-medium hover:bg-btnHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Speakers */}
        {step === 1 && (
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-serif text-primary">Speakers</h2>
              <span className="text-xs font-medium text-secondary bg-cream px-2.5 py-1 rounded-full">
                {validSpeakers.length} speaker{validSpeakers.length !== 1 ? 's' : ''}
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
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-colors"
                  />
                  <input
                    type="text"
                    value={speaker.topic}
                    onChange={(e) => updateSpeaker(index, 'topic', e.target.value)}
                    placeholder="Talk topic"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-goldBorder/30 focus:border-goldBorder transition-colors"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addSpeaker}
              className="w-full py-2 px-4 rounded-xl border border-dashed border-border text-secondary hover:border-goldBorder hover:text-gold transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Speaker
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-primary font-medium hover:bg-cream transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={validSpeakers.length === 0}
                className="flex-1 py-2.5 px-4 rounded-xl bg-btnPrimary text-white font-medium hover:bg-btnHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold font-serif text-primary">Review</h2>

            {publishError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {publishError}
              </p>
            )}

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">
                    Event
                  </p>
                  <p className="text-base font-semibold text-primary mt-0.5">
                    {title}
                  </p>
                  <p className="text-sm text-secondary mt-0.5">
                    {formatDate(date)}
                  </p>
                </div>
                <button
                  onClick={() => setStep(0)}
                  className="text-xs text-gold hover:text-goldBorder font-medium transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-secondary uppercase tracking-wide">
                  Speakers ({validSpeakers.length})
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-gold hover:text-goldBorder font-medium transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                {validSpeakers.map((speaker, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-cream text-gold text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {speaker.name}
                      </p>
                      <p className="text-xs text-secondary">{speaker.topic}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-primary font-medium hover:bg-cream transition-colors"
              >
                Back
              </button>
              <button
                onClick={publish}
                className="flex-1 py-2.5 px-4 rounded-xl bg-btnPrimary text-white font-medium hover:bg-btnHover transition-colors"
              >
                Publish Event
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Publishing */}
        {step === 3 && (
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
            <svg
              className="animate-spin h-10 w-10 text-primary mb-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-primary font-medium">Publishing your event...</p>
            <p className="text-sm text-secondary mt-1">Setting up speakers and generating QR code</p>
          </div>
        )}

        {/* Step 5: Published */}
        {step === 4 && (
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold font-serif text-primary">
                Event Published!
              </h2>
              <p className="text-sm text-secondary mt-1">
                Share the QR code or link with your attendees
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center">
                <div className="p-4 bg-cream rounded-2xl border border-border">
                  <img
                    src={qrDataUrl}
                    alt="Event QR Code"
                    width={250}
                    height={250}
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 uppercase tracking-wide">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getEventUrl()}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-cream text-primary text-sm focus:outline-none"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    copied
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-btnPrimary text-white hover:bg-btnHover'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={resetWizard}
              className="w-full py-2.5 px-4 rounded-xl border border-border text-primary font-medium hover:bg-cream transition-colors"
            >
              Create Another Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
