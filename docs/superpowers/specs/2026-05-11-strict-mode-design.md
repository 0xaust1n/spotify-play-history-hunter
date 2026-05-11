# Strict Mode Design

## Goal

Add a right-sidebar `Strict mode` filter for Spotify streaming history. When enabled, track statistics should only count playback events where `ms_played >= 30000`.

## Scope

- Keep all imported streaming events in the database.
- Apply strict mode at query time, before track rows are grouped.
- Add a right-sidebar control for toggling strict mode.
- Include strict mode in playlist creation filters.
- Reset strict mode when clearing filters.

## Behavior

Strict mode off:

- Existing behavior remains unchanged.
- All valid track events contribute to `streamCount`, `totalMsPlayed`, `firstStreamedAt`, and `lastStreamedAt`.

Strict mode on:

- Only events with `ms_played >= 30000` contribute to grouped track statistics.
- `streamCount` means count of playback events at or above 30 seconds.
- `totalMsPlayed`, `firstStreamedAt`, and `lastStreamedAt` are calculated only from those qualifying events.
- Tracks with no qualifying events are not returned.

## User Interface

Add a `Strict mode` checkbox or toggle in the existing Filters sidebar near the other search filters. The control should:

- Update results immediately.
- Reset pagination to page 1 when changed.
- Be cleared by `Clear filters`.

## API

Add a `strictMode=true` query parameter to `/api/tracks`.

When present, the SQL query should add `ms_played >= 30000` in the `streaming_events` filtering step before grouping.

The playlist creation endpoint already receives the current frontend query. It should continue to pass those parameters through `queryTracks`, so strict mode applies to playlist creation without a separate playlist-specific implementation.

## Testing

Add focused coverage for:

- Query normalization accepting `strictMode=true`.
- Track queries excluding under-30-second events when strict mode is enabled.
- Existing behavior staying unchanged when strict mode is absent.
- Frontend query serialization including strict mode in the current query used by playlist creation, if practical in existing tests.

## Out Of Scope

- Deleting or skipping short events during import.
- Adding separate `strictStreamCount` columns.
- Filtering by `reason_end`.
- Changing Spotify import file parsing.
