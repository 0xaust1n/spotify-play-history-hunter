import { ensureSchema, pool } from "./db";
import {
  addTracksToSpotifyPlaylist,
  buildSpotifyAuthorizeUrl,
  createSpotifyPlaylist,
  exchangeSpotifyCode,
  getSpotifyConfig,
  getSpotifyUser,
  playSpotifyTrack,
} from "./spotify-api";
import { ResponseCache } from "./response-cache";
import { queryTracks } from "./tracks";

await ensureSchema(pool);

const trackCache = new ResponseCache<unknown>(
  Number(Bun.env.TRACK_CACHE_TTL_SECONDS ?? 60) * 1000,
  Number(Bun.env.TRACK_CACHE_MAX_ENTRIES ?? 200),
);

const server = Bun.serve({
  port: Number(Bun.env.API_PORT ?? 8000),
  hostname: "127.0.0.1",
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/tracks") {
      const cacheKey = url.searchParams.toString();
      const cached = trackCache.get(cacheKey);
      if (cached) {
        return json(cached, 200, { "cache-control": "private, max-age=60" });
      }

      const body = await queryTracks(pool, url.searchParams);
      trackCache.set(cacheKey, body);
      return json(body, 200, { "cache-control": "private, max-age=60" });
    }

    if (url.pathname === "/api/spotify/login") {
      const config = getSpotifyConfig();
      if (!config.clientId || !config.clientSecret) {
        return json({ error: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET" }, 500);
      }

      const state = crypto.randomUUID();
      const response = Response.redirect(
        buildSpotifyAuthorizeUrl({
          clientId: config.clientId,
          redirectUri: config.redirectUri,
          state,
        }),
        302,
      );
      response.headers.append(
        "set-cookie",
        `spotify_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
      );
      return response;
    }

    if (url.pathname === "/api/spotify/callback") {
      const config = getSpotifyConfig();
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const expectedState = parseCookie(request.headers.get("cookie")).spotify_oauth_state;

      if (!code || !state || state !== expectedState) {
        return json({ error: "Invalid Spotify callback state" }, 400);
      }

      const token = await exchangeSpotifyCode(code, config);
      const response = Response.redirect("http://127.0.0.1:3000/?spotify=connected", 302);
      response.headers.append(
        "set-cookie",
        `spotify_access_token=${token.access_token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token.expires_in}`,
      );
      response.headers.append(
        "set-cookie",
        "spotify_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      );
      return response;
    }

    if (url.pathname === "/api/spotify/create-playlist" && request.method === "POST") {
      const accessToken = parseCookie(request.headers.get("cookie")).spotify_access_token;
      if (!accessToken) {
        return json({ error: "Spotify login required" }, 401);
      }

      const body = (await request.json()) as {
        name?: string;
        maxTracks?: number;
        query?: Record<string, string>;
      };
      const playlistName = body.name?.trim() || "Spotify history playlist";
      const maxTracks = clamp(Number(body.maxTracks ?? 100), 1, 500);
      const params = new URLSearchParams(body.query ?? {});
      const queryResult = await queryTracks(pool, params, {
        limit: maxTracks,
        offset: 0,
      });
      const uris = queryResult.tracks
        .map((track) => track.spotifyTrackUri)
        .filter((uri): uri is string => Boolean(uri?.startsWith("spotify:track:")));

      if (uris.length === 0) {
        return json({ error: "No Spotify track URIs found for current filters" }, 400);
      }

      const user = await getSpotifyUser(accessToken);
      const playlist = await createSpotifyPlaylist(accessToken, user.id, playlistName);
      await addTracksToSpotifyPlaylist(accessToken, playlist.id, uris);

      return json({
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls?.spotify ?? null,
        requestedTracks: queryResult.tracks.length,
        addedTracks: uris.length,
      });
    }

    if (url.pathname === "/api/spotify/play" && request.method === "POST") {
      const accessToken = parseCookie(request.headers.get("cookie")).spotify_access_token;
      if (!accessToken) {
        return json({ error: "Spotify login required" }, 401);
      }

      const body = (await request.json()) as {
        uri?: string;
      };
      if (!body.uri?.startsWith("spotify:track:")) {
        return json({ error: "A Spotify track URI is required" }, 400);
      }

      try {
        await playSpotifyTrack(accessToken, body.uri);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Spotify playback failed";
        return json({ error: message }, 502);
      }

      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`API server listening on http://${server.hostname}:${server.port}`);

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...valueParts] = cookie.trim().split("=");
      return [key, decodeURIComponent(valueParts.join("="))];
    }),
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
