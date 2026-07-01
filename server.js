const express = require('express');
const app = express();
const path = require('path');
const ytSearch = require('yt-search');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Dapatkan direct audio URL dari YouTube via yt-dlp (Python)
async function getAudioUrl(videoId) {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Coba python -m yt_dlp dulu
    const cmds = [
        ['python', ['-m', 'yt_dlp', '-f', 'bestaudio', '--get-url', '--no-playlist', '--quiet', ytUrl]],
        ['python3', ['-m', 'yt_dlp', '-f', 'bestaudio', '--get-url', '--no-playlist', '--quiet', ytUrl]],
        ['yt-dlp', ['-f', 'bestaudio', '--get-url', '--no-playlist', '--quiet', ytUrl]],
    ];

    for (const [cmd, args] of cmds) {
        try {
            const { stdout } = await execFileAsync(cmd, args, { timeout: 20000 });
            const url = stdout.trim().split('\n').find(l => l.startsWith('http'));
            if (url) return url;
        } catch (_) { /* coba berikutnya */ }
    }

    throw new Error('yt-dlp tidak ditemukan atau gagal mendapatkan URL');
}

// --- ROUTE: Search ---
app.get('/api/index', async (req, res) => {
    const { url, mode } = req.query;
    if (!url || !mode) return res.status(400).json({ error: 'Parameter url dan mode diperlukan' });

    try {
        if (mode === 'search') {
            const ytResults = await ytSearch(url);
            const videos = (ytResults.videos || [])
                .filter(v => v.videoId && v.seconds > 60)
                .slice(0, 15);

            let itunesMap = {};
            try {
                const { data } = await axios.get('https://itunes.apple.com/search', {
                    params: { term: url, media: 'music', limit: 15, entity: 'song' },
                    timeout: 5000
                });
                (data.results || []).forEach(item => {
                    if (item.artworkUrl100) {
                        itunesMap[item.trackName.toLowerCase().trim()] =
                            item.artworkUrl100.replace('100x100bb', '600x600bb');
                    }
                });
            } catch (_) {}

            const songs = videos.map(v => {
                const titleKey = v.title.toLowerCase().trim();
                const artworkFromItunes = itunesMap[titleKey];
                const thumbnail = artworkFromItunes
                    || (v.thumbnail && v.thumbnail.url ? v.thumbnail.url : null)
                    || 'https://via.placeholder.com/300';

                return {
                    title: v.title,
                    artist: v.author.name,
                    thumbnail,
                    url: `/api/index?mode=stream&url=${encodeURIComponent(v.videoId)}`,
                    videoId: v.videoId,
                    duration: v.seconds * 1000,
                    album: ''
                };
            });

            return res.json({ type: 'list', songs });
        }

        if (mode === 'stream') {
            const videoId = url;
            const audioUrl = await getAudioUrl(videoId);
            // Redirect ke URL audio langsung dari YouTube
            return res.redirect(302, audioUrl);
        }

        res.status(400).json({ error: 'Mode tidak valid' });

    } catch (error) {
        console.error('[API Error]', error.message);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
