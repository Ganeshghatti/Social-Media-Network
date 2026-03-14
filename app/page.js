"use client";

import { useState, useEffect, useCallback } from "react";

export default function Home() {
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    privacy: "private",
    video: null,
  });

  useEffect(() => {
    fetchChannels();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) setMessage({ type: "success", text: "Channel connected." });
    if (error) setMessage({ type: "error", text: decodeURIComponent(error) });
    if (connected || error) window.history.replaceState({}, "", "/");
  }, []);

  async function fetchChannels() {
    setLoading(true);
    try {
      const res = await fetch("/api/youtube/channels");
      const data = await res.json();
      setChannels(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load channels" });
    } finally {
      setLoading(false);
    }
  }

  const toggleChannel = (channelId) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedChannels(
      selectedChannels.size === channels.length
        ? new Set()
        : new Set(channels.map((c) => c.channelId))
    );
  };

  const handleVideoDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("video/")) setForm((prev) => ({ ...prev, video: f }));
  }, []);

  const handleVideoDrag = useCallback((e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.video) {
      setMessage({ type: "error", text: "Select a video" });
      return;
    }
    if (selectedChannels.size === 0) {
      setMessage({ type: "error", text: "Select at least one channel" });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("video", form.video);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("privacy", form.privacy);
      fd.append("channelIds", JSON.stringify([...selectedChannels]));

      const res = await fetch("/api/youtube/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const failed = data.results?.filter((r) => !r.success) || [];
      const ok = data.results?.filter((r) => r.success) || [];
      if (failed.length === 0) {
        setMessage({ type: "success", text: `Uploaded to ${ok.length} channel(s).` });
        setForm((prev) => ({ ...prev, video: null }));
      } else {
        setMessage({ type: "error", text: `${ok.length} done, ${failed.length} failed.` });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploading(false);
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
        <header className="flex items-center justify-between mb-10">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            YouTube Manager
          </h1>
          <a
            href="/api/youtube/auth"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Connect
          </a>
        </header>

        {message && (
          <div
            role="alert"
            className={`mb-6 px-4 py-3 rounded-xl text-sm ${
              message.type === "success"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
            Channels
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
              Loading…
            </div>
          ) : channels.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No channels. Use <strong className="text-zinc-400">Connect</strong> to add one.
            </p>
          ) : (
            <div className="space-y-1">
              <label className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.length > 0 && selectedChannels.size === channels.length}
                  onChange={selectAll}
                  className="rounded border-zinc-600 bg-zinc-900 text-red-500 focus:ring-red-500/50"
                />
                <span className="text-sm text-zinc-500">Select all</span>
              </label>
              {channels.map((ch) => (
                <label
                  key={ch.channelId}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannels.has(ch.channelId)
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChannels.has(ch.channelId)}
                    onChange={() => toggleChannel(ch.channelId)}
                    className="rounded border-zinc-600 bg-zinc-900 text-red-500 focus:ring-red-500/50"
                  />
                  {ch.thumbnailUrl && (
                    <img
                      src={ch.thumbnailUrl}
                      alt=""
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  )}
                  <span className="text-sm truncate">{ch.title}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
            Upload
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label
                onDragEnter={handleVideoDrag}
                onDragOver={handleVideoDrag}
                onDragLeave={handleVideoDrag}
                onDrop={handleVideoDrop}
                className={`block rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                  dragActive
                    ? "border-red-500/60 bg-red-500/10"
                    : form.video
                    ? "border-zinc-600 bg-zinc-800/30"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
                }`}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, video: e.target.files?.[0] || null }))
                  }
                  className="sr-only"
                />
                <div className="p-6 sm:p-8 text-center">
                  {form.video ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-200 truncate px-4">
                        {form.video.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatSize(form.video.size)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setForm((f) => ({ ...f, video: null }));
                        }}
                        className="text-xs text-red-400 hover:text-red-300 mt-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto w-10 h-10 text-zinc-600 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-zinc-400">
                        Drop video or <span className="text-zinc-300">browse</span>
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                  placeholder="Video title"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Privacy</label>
                <select
                  value={form.privacy}
                  onChange={(e) => setForm((f) => ({ ...f, privacy: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-zinc-500"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 resize-none"
                placeholder="Optional"
              />
            </div>

            <button
              type="submit"
              disabled={
                uploading || channels.length === 0 || selectedChannels.size === 0 || !form.video
              }
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                  </svg>
                  Upload to {selectedChannels.size} channel
                  {selectedChannels.size !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
