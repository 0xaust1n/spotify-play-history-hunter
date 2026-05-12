# 使用指南

這份指南會帶你一步一步啟動這個 app。你不需要先理解每個工具背後的技術原理，只要照順序操作即可。

## 1. 安裝需要的輔助工具

請先安裝：

- [Bun](https://bun.com/)：用來啟動這個 app。
- [OrbStack](https://orbstack.dev/) 或 [Docker Desktop](https://www.docker.com/products/docker-desktop/)：用來開啟 app 需要的本機資料庫。

安裝 OrbStack 或 Docker Desktop 後，請先打開一次，並讓它保持執行。

## 2. 取得 Spotify 歷史檔案

1. 打開 Spotify Privacy settings：<https://www.spotify.com/account/privacy/>
2. 找到 **Download your data**。
3. 申請 **Extended streaming history**。
4. 等 Spotify 寄信通知你資料已準備好。
5. 下載並解壓縮檔案。
6. 在這個專案資料夾中建立一個資料夾：

   ```text
   spotify_dump_folder
   ```

7. 把音訊播放歷史 JSON 檔案複製進去。檔名看起來會像這樣：

   ```text
   Streaming_History_Audio_2017.json
   Streaming_History_Audio_2018.json
   Streaming_History_Audio_2026.json
   ```

這個 app 只會匯入檔名符合 `Streaming_History_Audio_*.json` 的檔案。

## 3. 建立設定檔

在這個專案資料夾打開 Terminal，執行：

```bash
cp .env.example .env
```

用文字編輯器打開新的 `.env` 檔案。內容應該會像這樣：

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

資料庫相關設定可以先保持原樣。

## 4. 設定 Spotify 登入

只有在你想用 app 建立播放清單，或控制 Spotify 播放時，才需要設定 Spotify 登入。單純瀏覽歷史紀錄不需要這一步。

這個 app 不會要求你貼上個人的 Spotify token。你需要的是 Spotify 給這個本機 app 使用的兩個值：Client ID 和 Client Secret。

1. 打開 Spotify Developer Dashboard：<https://developer.spotify.com/dashboard>
2. 建立一個 app。
3. 加入這個 Redirect URI，內容必須完全一樣：

   ```text
   http://127.0.0.1:8000/api/spotify/callback
   ```

4. 把 app 的 Client ID 複製到 `.env`：

   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   ```

5. 把 app 的 Client Secret 複製到 `.env`：

   ```env
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

6. 除非你也改了 Spotify Dashboard 裡的 Redirect URI，否則這一行保持不變：

   ```env
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/spotify/callback
   ```

Client Secret 請當成密碼保管，不要公開分享。

## 5. 啟動本機資料庫

確認 OrbStack 或 Docker Desktop 正在執行，然後執行：

```bash
docker compose up -d postgres
```

這會啟動 app 用來存放匯入播放紀錄的本機儲存區。

## 6. 安裝 app 需要的套件

執行：

```bash
bun install
```

這會下載 app 需要的套件。

## 7. 匯入 Spotify 歷史紀錄

執行：

```bash
bun run migrate
```

這會清空目前已匯入的紀錄，然後重新匯入 `spotify_dump_folder` 裡的檔案。

之後如果你更換 `spotify_dump_folder` 裡的檔案，並想重新整理資料，可以再執行一次這個指令。

## 8. 啟動 app

執行：

```bash
bun run dev
```

使用 app 時，請讓這個 Terminal 視窗保持開啟。

## 9. 打開網頁

在瀏覽器打開：

```text
http://127.0.0.1:3000
```

app 的後端服務也會在這裡執行：

```text
http://127.0.0.1:8000
```

一般使用時，只需要打開 `3000` 這個頁面。

## 10. 使用 app

- 搜尋歌手。
- 調整篩選條件，縮小結果範圍。
- 設定 Spotify 登入後，可以建立播放清單。
- 設定 Spotify 登入後，如果你的 Spotify 帳號可用，也可以使用播放控制。

如果建立播放清單或播放控制要求你登入，請依照 Spotify 登入頁面操作，完成後回到 app。
