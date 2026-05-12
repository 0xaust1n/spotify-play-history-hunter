# Spotify Streaming History Viewer

A local Bun + React app for exploring Spotify Extended Streaming History exports.

## WIKi
- WIKI維基百科 → [點我/Click-Me](https://github.com/0xaust1n/spotify-play-history-hunter/wiki)

## Get Your Spotify Play History

Spotify Web API cannot provide your full lifetime streaming history. For full history analysis, download your Spotify data export:

1. Go to Spotify Privacy settings:
   <https://www.spotify.com/account/privacy/>
2. Find **Download your data**.
3. Request **Extended streaming history**.
4. Wait for Spotify to email you when the export is ready.
5. Download and unzip the export.
6. Copy the history files into this project folder(create if it's not exsit):

   ```text
   ./spotify_dump_folder/
   ```

The importer reads files like:

```text
spotify_dump_folder/Streaming_History_Audio_2017.json
spotify_dump_folder/Streaming_History_Audio_2018.json
spotify_dump_folder/Streaming_History_Audio_2026.json
```

Only `Streaming_History_Audio_*.json` files are imported.

## Environment

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Default database settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=to_be_or_no_to_be
DB_DATABASE=spotify
SPOTIFY_DUMP_DIR=./spotify_dump_folder
```

Spotify OAuth is optional unless you want playlist creation or playback control:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/spotify/callback
```

Use the same redirect URI in the Spotify Developer Dashboard.

## Required environment

- [Bun](https://bun.com/) for website
- [Orbstack](https://orbstack.dev/) or [Docker](https://www.docker.com/products/docker-desktop/) for DB

## Start With Docker Compose

The current Docker Compose file starts PostgreSQL.

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
bun install
```

Import or re-import the Spotify dump:

```bash
bun run migrate
```

Start the app:

```bash
bun run dev
```

Open:

```text
Frontend: http://127.0.0.1:3000
Backend:  http://127.0.0.1:8000
```

## Useful Commands

```bash
bun run import     # import without clearing existing rows
bun run migrate    # truncate and re-import streaming_events
bun test
bunx tsc --noEmit
bun run build
```
