export type SpotifyConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type SpotifyAuthorizeOptions = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export type SpotifyUser = {
  id: string;
};

export type SpotifyPlaylist = {
  id: string;
  external_urls?: {
    spotify?: string;
  };
};

const spotifyScope = "playlist-modify-public user-modify-playback-state user-read-playback-state";

export function getSpotifyConfig(): SpotifyConfig {
  return {
    clientId: Bun.env.SPOTIFY_CLIENT_ID ?? "",
    clientSecret: Bun.env.SPOTIFY_CLIENT_SECRET ?? "",
    redirectUri: Bun.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:8000/api/spotify/callback",
  };
}

export function buildSpotifyAuthorizeUrl(options: SpotifyAuthorizeOptions): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    response_type: "code",
    redirect_uri: options.redirectUri,
    scope: spotifyScope,
    state: options.state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function spotifyPlaylistPayload(name: string): {
  name: string;
  public: true;
  description: string;
} {
  return {
    name,
    public: true,
    description: "Created from Spotify Extended Streaming History filters.",
  };
}

export function spotifyPlayPayload(uri: string): {
  uris: string[];
  position_ms: 0;
} {
  return {
    uris: [uri],
    position_ms: 0,
  };
}

export function chunkSpotifyUris(uris: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < uris.length; index += 100) {
    chunks.push(uris.slice(index, index + 100));
  }

  return chunks;
}

export function spotifyCredentialsHeader(config: SpotifyConfig): string {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

export async function exchangeSpotifyCode(
  code: string,
  config: SpotifyConfig,
): Promise<SpotifyTokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: spotifyCredentialsHeader(config),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  return parseSpotifyResponse<SpotifyTokenResponse>(response);
}

export async function getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  return parseSpotifyResponse<SpotifyUser>(response);
}

export async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  name: string,
): Promise<SpotifyPlaylist> {
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(spotifyPlaylistPayload(name)),
  });

  return parseSpotifyResponse<SpotifyPlaylist>(response);
}

export async function addTracksToSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  for (const chunk of chunkSpotifyUris(uris)) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });

    await parseSpotifyResponse(response);
  }
}

export async function playSpotifyTrack(accessToken: string, uri: string): Promise<void> {
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(spotifyPlayPayload(uri)),
  });

  await parseSpotifyResponse(response);
}

async function parseSpotifyResponse<T = unknown>(response: Response): Promise<T> {
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Spotify API returned ${response.status}: ${details}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
