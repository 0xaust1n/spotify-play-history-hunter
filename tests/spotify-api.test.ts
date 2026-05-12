import { describe, expect, test } from "bun:test";
import {
  buildSpotifyAuthorizeUrl,
  chunkSpotifyUris,
  spotifyPlayPayload,
  spotifyPlaylistPayload,
} from "../server/spotify-api";

describe("spotify api helpers", () => {
  test("builds an authorize url for public playlist modification", () => {
    const url = new URL(
      buildSpotifyAuthorizeUrl({
        clientId: "client-id",
        redirectUri: "http://127.0.0.1:8000/api/spotify/callback",
        state: "state-token",
        codeChallenge: "challenge-hash",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.spotify.com/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:8000/api/spotify/callback");
    expect(url.searchParams.get("scope")).toBe(
      "playlist-modify-public user-modify-playback-state user-read-playback-state",
    );
    expect(url.searchParams.get("state")).toBe("state-token");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-hash");
  });

  test("creates a play payload for a track uri", () => {
    expect(spotifyPlayPayload("spotify:track:abc")).toEqual({
      uris: ["spotify:track:abc"],
      position_ms: 0,
    });
  });

  test("chunks spotify uris into batches of 100", () => {
    const uris = Array.from({ length: 205 }, (_, index) => `spotify:track:${index}`);
    const chunks = chunkSpotifyUris(uris);

    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 5]);
  });

  test("creates a public playlist payload", () => {
    expect(spotifyPlaylistPayload("Forgotten favorites")).toEqual({
      name: "Forgotten favorites",
      public: true,
      description: "Created from Spotify Extended Streaming History filters.",
    });
  });
});
