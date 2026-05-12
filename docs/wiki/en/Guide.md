# Guide

This guide walks through starting the app on your computer. You do not need to understand how the tools work internally. Follow the steps in order.

## 1. Install the Helper Apps

Install these first:

- [Bun](https://bun.com/): runs the app.
- [OrbStack](https://orbstack.dev/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/): turns on the local database used by the app.

After installing OrbStack or Docker Desktop, open it once and leave it running.

## 2. Get Your Spotify History Files

1. Open Spotify Privacy settings: <https://www.spotify.com/account/privacy/>
2. Find **Download your data**.
3. Request **Extended streaming history**.
4. Wait for Spotify to email you when the export is ready.
5. Download and unzip the export.
6. In this project folder, create a folder named:

   ```text
   spotify_dump_folder
   ```

7. Copy only the audio history JSON files into that folder. The file names should look like:

   ```text
   Streaming_History_Audio_2017.json
   Streaming_History_Audio_2018.json
   Streaming_History_Audio_2026.json
   ```

The app only imports files named `Streaming_History_Audio_*.json`.

## 3. Create the Settings File

Open Terminal in this project folder and run:

```bash
cp .env.example .env
```

Open the new `.env` file in a text editor. It should contain:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=to_be_or_no_to_be
DB_DATABASE=spotify
SPOTIFY_DUMP_DIR=./spotify_dump_folder
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/spotify/callback
```

You can keep the database lines as they are.

## 4. Set Up Spotify Login

Spotify login is only needed if you want the app to create playlists or control playback in Spotify. Basic history browsing works without it.

The app does not ask you to paste a personal Spotify token. Instead, Spotify gives your local app two values: a Client ID and a Client Secret.

1. Open the Spotify Developer Dashboard: <https://developer.spotify.com/dashboard>
2. Create an app.
3. Add this Redirect URI exactly:

   ```text
   http://127.0.0.1:8000/api/spotify/callback
   ```

4. Copy the app's Client ID into `.env`:

   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   ```

5. Copy the app's Client Secret into `.env`:

   ```env
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

6. Keep this line unchanged unless you also changed the Redirect URI in Spotify:

   ```env
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/spotify/callback
   ```

Treat the Client Secret like a password. Do not share it publicly.

## 5. Start the Local Database

Make sure OrbStack or Docker Desktop is running. Then run:

```bash
docker compose up -d postgres
```

This starts the local storage area where the app keeps the imported listening history.

## 6. Install the App Files

Run:

```bash
bun install
```

This downloads the app's required packages.

## 7. Import Your Spotify History

Run:

```bash
bun run migrate
```

This clears the existing imported history and imports the files from `spotify_dump_folder`.

Run this command again whenever you replace the files in `spotify_dump_folder` and want a fresh import.

## 8. Start the App

Run:

```bash
bun run dev
```

Leave that Terminal window open while you use the app.

## 9. Open the App

Open this page in your browser:

```text
http://127.0.0.1:3000
```

The app server also runs here:

```text
http://127.0.0.1:8000
```

You usually only need to open the `3000` page.

## 10. Use the App

- Search for an artist.
- Adjust filters to narrow the result list.
- Use playlist creation after Spotify login is set up.
- Use playback controls after Spotify login is set up and Spotify is available on your account.

If playlist creation or playback asks you to log in, follow the Spotify login page and return to the app afterward.
