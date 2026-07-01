const ytSearch = require('yt-search');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function getAudioUrl(videoId) {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { stdout, stderr } = await execFileAsync('python', [
        '-m', 'yt_dlp',
        '-f', 'bestaudio',
        '--get-url',
        '--no-playlist',
        '--quiet',
        ytUrl
    ], { timeout: 20000 });

    // stdout bisa berisi WARNING di stderr, URL di stdout
    const url = stdout.trim().split('\n').find(l => l.startsWith('http'));
    if (!url) throw new Error('Gagal mendapatkan URL audio dari YouTube');
    return url;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, mode } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter url diperlukan' });
    if (!mode) return res.status(400).json({ error: 'Parameter mode diperlukan (search/stream)' });

    try {
        // --- MODE SEARCH: Cari via YouTube + iTunes untuk artwork ---
        if (mode === 'search') {
            const ytResults = await ytSearch(url);
            const videos = (ytResults.videos || [])
                .filter(v => v.videoId && v.seconds > 60)
                .slice(0, 15);

            // Ambil artwork dari iTunes (opsional, untuk gambar lebih bagus)
            let itunesMap = {};
            try {
                const { data } = await axios.get('https://itunes.apple.com/search', {
                    params: { term: url, media: 'music', limit: 15, entity: 'song' },
                    timeout: 5000
                });
                (data.results || []).forEach(item => {
                    const key = item.trackName.toLowerCase().trim();
                    if (item.artworkUrl100) {
                        itunesMap[key] = item.artworkUrl100.replace('100x100bb', '600x600bb');
                    }
                });
            } catch (_) { /* iTunes opsional */ }

            const songs = videos.map(v => {
                const titleKey = v.title.toLowerCase().trim();
                const artworkFromItunes = itunesMap[titleKey];
                const thumbnail = artworkFromItunes
                    || (v.thumbnail && v.thumbnail.url ? v.thumbnail.url : 'https://via.placeholder.com/300');

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

            return res.status(200).json({ type: 'list', songs });
        }

        // --- MODE STREAM: Dapatkan URL audio dari YouTube via yt-dlp, lalu redirect ---
        if (mode === 'stream') {
            const videoId = url;
            const audioUrl = await getAudioUrl(videoId);

            // Redirect ke URL audio langsung (agar browser memutar dari server YouTube)
            res.setHeader('Cache-Control', 'no-cache');
            return res.redirect(302, audioUrl);
        }

    } catch (error) {
        console.error('[API Error]', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};
