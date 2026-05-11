import React, { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { createRoot } from "react-dom/client";
import { formatDateInput, formatDateTime, parseDateInput } from "./lib/date";
import { getPaginationItems } from "./lib/pagination";
import {
  serializeSortRules,
  toggleSortRule,
  type SortColumn,
  type SortDirection,
  type SortRule,
} from "./lib/sort-state";
import "./styles.css";

type TrackRow = {
  trackKey: string;
  trackName: string;
  albumName: string | null;
  artistName: string;
  spotifyTrackUri: string | null;
  streamCount: number;
  totalMsPlayed: number;
  firstStreamedAt: string;
  lastStreamedAt: string;
};

type TracksResponse = {
  tracks: TrackRow[];
  page: number;
  limit: number;
  offset: number;
  total: number;
  minStreams: number | null;
  notPlayedSince: string | null;
  sortRules: Array<{
    column: SortColumn;
    order: SortDirection;
  }>;
  strictMode: boolean;
};

const columnLabels: Record<SortColumn, string> = {
  track_name: "Song",
  album_name: "Album",
  artist_name: "Artist",
  first_streamed: "First streamed",
  last_streamed: "Last streamed",
  stream_count: "Streams",
};

const pageSize = 20;

function App() {
  const [artist, setArtist] = useState("");
  const [minStreams, setMinStreams] = useState("");
  const [notPlayedSince, setNotPlayedSince] = useState("");
  const [strictMode, setStrictMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [playlistName, setPlaylistName] = useState("Spotify history playlist");
  const [playlistMaxTracks, setPlaylistMaxTracks] = useState("100");
  const [playlistStatus, setPlaylistStatus] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string | null>(null);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [page, setPage] = useState(1);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({
      artist,
      page: String(page),
      offset: String(offset),
      limit: String(pageSize),
    });
    if (minStreams.trim() !== "") {
      params.set("minStreams", minStreams.trim());
    }
    if (notPlayedSince !== "") {
      params.set("notPlayedSince", notPlayedSince);
    }
    if (sortRules.length > 0) {
      params.set("sort", serializeSortRules(sortRules));
    }
    if (strictMode) {
      params.set("strictMode", "true");
    }

    setLoading(true);
    setError(null);

    fetch(`/api/tracks?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return response.json() as Promise<TracksResponse>;
      })
      .then((body) => {
        setTracks(body.tracks);
        setTotal(body.total);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [artist, minStreams, notPlayedSince, page, sortRules, strictMode]);

  const summary = useMemo(() => {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pageCount = Math.max(Math.ceil(total / pageSize), 1);
    const paginationItems = getPaginationItems(page, pageCount);
    return {
      pageCount,
      paginationItems,
      from,
      to,
      visibleTracks: tracks.length,
    };
  }, [page, total, tracks.length]);

  const currentQuery = useMemo(() => {
    const query: Record<string, string> = {};
    if (artist.trim() !== "") {
      query.artist = artist.trim();
    }
    if (minStreams.trim() !== "") {
      query.minStreams = minStreams.trim();
    }
    if (notPlayedSince !== "") {
      query.notPlayedSince = notPlayedSince;
    }
    if (sortRules.length > 0) {
      query.sort = serializeSortRules(sortRules);
    }
    if (strictMode) {
      query.strictMode = "true";
    }

    return query;
  }, [artist, minStreams, notPlayedSince, sortRules, strictMode]);

  async function createPlaylistFromResults() {
    const confirmed = confirm(
      `Create a public Spotify playlist from the current filtered results?\n\nMax tracks: ${playlistMaxTracks || "100"}`,
    );
    if (!confirmed) {
      return;
    }

    setPlaylistStatus("Creating playlist...");
    const response = await fetch("/api/spotify/create-playlist", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName,
        maxTracks: Number(playlistMaxTracks || 100),
        query: currentQuery,
      }),
    });

    const body = (await response.json()) as {
      error?: string;
      playlistUrl?: string | null;
      addedTracks?: number;
    };

    if (response.status === 401) {
      setPlaylistStatus("Spotify login required. Redirecting...");
      window.location.href = "/api/spotify/login";
      return;
    }

    if (!response.ok) {
      setPlaylistStatus(body.error ?? `Playlist request failed (${response.status})`);
      return;
    }

    setPlaylistStatus(`Created playlist with ${body.addedTracks ?? 0} tracks.`);
    if (body.playlistUrl) {
      window.open(body.playlistUrl, "_blank", "noreferrer");
    }
  }

  async function playTrack(track: TrackRow) {
    if (!track.spotifyTrackUri) {
      setPlaybackStatus("This track has no Spotify URI.");
      return;
    }

    setPlaybackStatus(`Playing ${track.trackName}...`);
    const response = await fetch("/api/spotify/play", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ uri: track.spotifyTrackUri }),
    });

    const body = (await response.json()) as {
      error?: string;
    };

    if (response.status === 401) {
      setPlaybackStatus("Spotify login required. Redirecting...");
      window.location.href = "/api/spotify/login";
      return;
    }

    if (!response.ok) {
      setPlaybackStatus(
        body.error ?? "Playback failed. Open Spotify on a device, start any song, then try again.",
      );
      return;
    }

    setPlaybackStatus(`Sent ${track.trackName} to Spotify.`);
  }

  return (
    <main className="min-h-screen bg-[#121212] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-5 rounded-[8px] bg-[#181818] p-5 shadow-[rgba(0,0,0,0.5)_0px_8px_24px] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[1.6px] text-[#1ed760]">
              Streaming archive
            </p>
            <h1 className="text-[24px] font-bold leading-tight text-white md:text-[32px]">
              Spotify Streaming History
            </h1>
            <p className="mt-2 text-[14px] text-[#b3b3b3]">
              Search by artist and review song-level play counts.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-2 md:justify-end"
            aria-label="Visible result summary"
          >
            <SummaryStat value={summary.visibleTracks.toLocaleString()} label="Pages" />
            <SummaryStat value={total.toLocaleString()} label="Total tracks" />
          </div>
        </header>

        {error ? (
          <div className="mb-3 rounded-[8px] bg-[#2a171a] px-4 py-3 text-[14px] font-bold text-[#f3727f]">
            API error: {error}
          </div>
        ) : null}
        {loading ? (
          <div className="mb-3 rounded-[8px] bg-[#1f1f1f] px-4 py-3 text-[14px] text-[#b3b3b3]">
            Loading tracks...
          </div>
        ) : null}
        {playbackStatus ? (
          <div className="mb-3 rounded-[8px] bg-[#1f1f1f] px-4 py-3 text-[14px] text-[#b3b3b3]">
            {playbackStatus}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <section
            className="overflow-auto rounded-[8px] bg-[#181818] shadow-[rgba(0,0,0,0.3)_0px_8px_8px]"
            aria-label="Track statistics"
          >
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <SortableHeader column="track_name" sortRules={sortRules} onSort={setSortRules} />
                  <SortableHeader column="album_name" sortRules={sortRules} onSort={setSortRules} />
                  <SortableHeader
                    column="artist_name"
                    sortRules={sortRules}
                    onSort={setSortRules}
                  />
                  <SortableHeader
                    column="first_streamed"
                    sortRules={sortRules}
                    onSort={setSortRules}
                  />
                  <SortableHeader
                    column="last_streamed"
                    sortRules={sortRules}
                    onSort={setSortRules}
                  />
                  <SortableHeader
                    column="stream_count"
                    sortRules={sortRules}
                    onSort={setSortRules}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {!loading && tracks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-36 px-4 text-center align-middle text-[#b3b3b3]">
                      No tracks found.
                    </td>
                  </tr>
                ) : (
                  tracks.map((track) => (
                    <tr
                      key={track.trackKey}
                      className="border-b border-[#242424] transition-colors hover:bg-[#1f1f1f]"
                    >
                      <td className="px-4 py-3 text-[14px] font-bold text-white">
                        <button
                          type="button"
                          className="text-left transition hover:text-[#1ed760] hover:underline disabled:cursor-not-allowed disabled:text-[#7c7c7c]"
                          disabled={!track.spotifyTrackUri}
                          onClick={() => {
                            void playTrack(track);
                          }}
                        >
                          {track.trackName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[14px] text-[#b3b3b3]">
                        {track.albumName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[14px] text-[#fdfdfd]">{track.artistName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[14px] text-[#b3b3b3]">
                        {formatDateTime(track.firstStreamedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[14px] text-[#b3b3b3]">
                        {formatDateTime(track.lastStreamedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[14px] font-bold text-white">
                        {track.streamCount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <aside
            className={`rounded-[8px] bg-[#181818] shadow-[rgba(0,0,0,0.5)_0px_8px_24px] transition-all lg:sticky lg:top-5 ${
              filtersOpen ? "lg:w-[320px]" : "lg:w-[56px]"
            }`}
            aria-label="Search filters"
          >
            <button
              type="button"
              className="flex h-14 w-full items-center justify-between rounded-t-[8px] px-3 text-[12px] font-bold uppercase tracking-[1.6px] text-white transition hover:bg-[#1f1f1f]"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
            >
              <span className={filtersOpen ? "" : "sr-only"}>Filters</span>
              <span
                className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#121212] text-[24px] font-bold leading-none text-[#1ed760] shadow-[rgb(42,42,42)_0px_0px_0px_1px_inset]"
                aria-hidden="true"
              >
                {filtersOpen ? "›" : "‹"}
              </span>
            </button>

            {filtersOpen ? (
              <div className="grid gap-4 px-4 pb-4">
                <FilterInput
                  label="Artist"
                  value={artist}
                  placeholder="Laufey"
                  onChange={(value) => {
                    setArtist(value);
                    setPage(1);
                  }}
                />
                <FilterInput
                  label="Min streams"
                  value={minStreams}
                  placeholder="10"
                  type="number"
                  min="1"
                  onChange={(value) => {
                    setMinStreams(value);
                    setPage(1);
                  }}
                />
                <DateFilterInput
                  label="Not played since"
                  value={notPlayedSince}
                  onChange={(value) => {
                    setNotPlayedSince(value);
                    setPage(1);
                  }}
                />
                <label className="flex h-11 items-center justify-between rounded-[8px] bg-[#121212] px-3 text-[13px] font-bold text-white">
                  <span>Strict mode</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#1ed760]"
                    checked={strictMode}
                    onChange={(event) => {
                      setStrictMode(event.currentTarget.checked);
                      setPage(1);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="h-10 rounded-full bg-[#1f1f1f] px-5 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3] transition hover:text-white"
                  onClick={() => {
                    setArtist("");
                    setMinStreams("");
                    setNotPlayedSince("");
                    setStrictMode(false);
                    setSortRules([]);
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
                <div className="h-px bg-[#2a2a2a]" />
                <FilterInput
                  label="Playlist name"
                  value={playlistName}
                  onChange={setPlaylistName}
                />
                <FilterInput
                  label="Max tracks"
                  value={playlistMaxTracks}
                  type="number"
                  min="1"
                  onChange={setPlaylistMaxTracks}
                />
                <button
                  type="button"
                  className="h-11 rounded-full bg-[#1ed760] px-5 text-[12px] font-bold uppercase tracking-[1.6px] text-black transition hover:scale-[1.02]"
                  onClick={() => {
                    void createPlaylistFromResults();
                  }}
                >
                  Create public playlist
                </button>
                {playlistStatus ? (
                  <p className="text-[12px] leading-normal text-[#b3b3b3]">{playlistStatus}</p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>

        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-1 text-[14px]"
          aria-label="Pagination"
        >
          <button
            type="button"
            className="h-9 min-w-9 rounded-full text-[22px] leading-none text-[#b3b3b3] transition hover:bg-[#1f1f1f] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
            disabled={page <= 1 || loading}
            onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
          >
            ‹
          </button>
          {summary.paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="min-w-7 text-center text-[#7c7c7c]"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`h-9 min-w-9 rounded-full px-3 font-bold transition ${
                  item === page
                    ? "bg-[#1ed760] text-black"
                    : "text-[#b3b3b3] hover:bg-[#1f1f1f] hover:text-white"
                }`}
                aria-current={item === page ? "page" : undefined}
                disabled={loading}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="h-9 min-w-9 rounded-full text-[22px] leading-none text-[#b3b3b3] transition hover:bg-[#1f1f1f] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
            disabled={page >= summary.pageCount || loading}
            onClick={() => setPage((currentPage) => Math.min(currentPage + 1, summary.pageCount))}
          >
            ›
          </button>
        </nav>
      </div>
    </main>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <span className="min-w-[94px] rounded-[8px] bg-[#1f1f1f] px-3 py-2 text-[12px] text-[#b3b3b3] shadow-[rgb(18,18,18)_0px_1px_0px,rgb(77,77,77)_0px_0px_0px_1px_inset]">
      <strong className="block text-[20px] font-bold leading-tight text-white">{value}</strong>
      {label}
    </span>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "number" | "text";
  min?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-full bg-[#1f1f1f] px-4 text-[14px] font-bold text-white shadow-[rgb(18,18,18)_0px_1px_0px,rgb(124,124,124)_0px_0px_0px_1px_inset] outline-none placeholder:text-[#7c7c7c] focus:shadow-[rgb(18,18,18)_0px_1px_0px,#1ed760_0px_0px_0px_2px_inset]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        min={min}
      />
    </label>
  );
}

function DateFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInput(value);

  return (
    <label className="relative block">
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
        {label}
      </span>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-full bg-[#1f1f1f] px-4 text-left text-[14px] font-bold text-white shadow-[rgb(18,18,18)_0px_1px_0px,rgb(124,124,124)_0px_0px_0px_1px_inset] outline-none transition hover:bg-[#242424] focus:shadow-[rgb(18,18,18)_0px_1px_0px,#1ed760_0px_0px_0px_2px_inset]"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "text-white" : "text-[#7c7c7c]"}>{value || "YYYY-MM-DD"}</span>
        <span className="text-[#1ed760]" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="spotify-date-popover" role="dialog" aria-label={`${label} calendar`}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            captionLayout="dropdown"
            navLayout="after"
            startMonth={new Date(2008, 0, 1)}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              onChange(formatDateInput(date));
              setOpen(false);
            }}
          />
          {value ? (
            <button
              type="button"
              className="mt-2 h-9 w-full rounded-full bg-[#1f1f1f] text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3] transition hover:text-white"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </button>
          ) : null}
        </div>
      ) : null}
    </label>
  );
}

function SortableHeader({
  column,
  sortRules,
  onSort,
  align,
}: {
  column: SortColumn;
  sortRules: SortRule[];
  onSort: (sortRules: SortRule[]) => void;
  align?: "right";
}) {
  const activeIndex = sortRules.findIndex((rule) => rule.column === column);
  const activeRule = activeIndex === -1 ? null : sortRules[activeIndex];
  const marker = activeRule ? (activeRule.direction === "desc" ? "↓" : "↑") : "";
  const sortPosition = activeIndex === -1 ? null : activeIndex + 1;

  return (
    <th className="sticky top-0 overflow-visible bg-[#181818] px-4 py-3 text-left align-middle text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
      <button
        type="button"
        className={`inline-flex min-h-7 w-full items-center gap-2 border-0 bg-transparent p-0 text-left uppercase tracking-[1.4px] text-inherit transition hover:text-[#1ed760] ${
          align === "right" ? "justify-end text-right" : "justify-start"
        }`}
        aria-sort={
          activeRule ? (activeRule.direction === "desc" ? "descending" : "ascending") : "none"
        }
        onClick={() => onSort(toggleSortRule(sortRules, column))}
      >
        <span className="min-w-0">{columnLabels[column]}</span>
        <span
          className="inline-flex w-4 shrink-0 justify-center text-[14px] leading-none text-[#1ed760]"
          aria-hidden="true"
        >
          {marker}
        </span>
        {sortPosition ? (
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-[11px] leading-none text-black"
            aria-label={`Sort priority ${sortPosition}`}
          >
            {sortPosition}
          </span>
        ) : null}
      </button>
    </th>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
