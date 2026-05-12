# Spotify Streaming History Viewer Wiki

Spotify Streaming History Viewer is a local app for exploring your Spotify Extended Streaming History export.

Spotify's regular app can show recent listening activity, but it does not give you an easy way to review your full listening history over many years. This project lets you place your Spotify history files in one folder, import them into a local database, and browse the results in a web page on your own computer.

## What You Can Do

- Search your listening history by artist.
- Review song-level play counts.
- Filter tracks by date and playback rules.
- Create a public Spotify playlist from the filtered results.
- Send a selected track to Spotify playback when your Spotify account is connected.

## How It Works

1. You request your Extended streaming history from Spotify.
2. You place the downloaded history files in `spotify_dump_folder`.
3. You start the local database and import the files.
4. You open the app at `http://127.0.0.1:3000`.
5. Optional: you connect a Spotify Developer app so playlist creation and playback control can work.

## Pages

- [Guide](./Guide.md): step-by-step setup for non-technical users.
- [Roadmap](./Roadmap.md): project roadmap.
