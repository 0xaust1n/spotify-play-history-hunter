# Spotify Streaming History Viewer Wiki

Spotify Streaming History Viewer 是一個在你自己電腦上執行的 Spotify 延伸串流紀錄檢視工具。

Spotify App 可以看到近期播放紀錄，但不方便完整回顧多年累積的播放歷史。這個專案可以把你從 Spotify 下載的 Extended streaming history 檔案匯入本機資料庫，然後用網頁方式搜尋、篩選、整理自己的聽歌紀錄。

## 可以做什麼

- 依照歌手搜尋播放紀錄。
- 查看歌曲層級的播放次數。
- 依日期與播放規則篩選歌曲。
- 用目前篩選結果建立公開 Spotify 播放清單。
- 在連接 Spotify 帳號後，把選到的歌曲送到 Spotify 播放。

## 運作方式

1. 你向 Spotify 申請 Extended streaming history。
2. 你把下載好的歷史檔案放進 `spotify_dump_folder`。
3. 你啟動本機資料庫，並匯入檔案。
4. 你打開 `http://127.0.0.1:3000` 使用網頁介面。
5. 選用：你設定 Spotify Developer app，讓建立播放清單與播放控制可以運作。

## 頁面

- [使用指南](./Guide.md)：給非技術使用者的逐步設定流程。
- [Roadmap](./Roadmap.md)：專案路線圖。
