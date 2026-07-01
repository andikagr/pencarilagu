const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, mode } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter url diperlukan' });
    if (!mode) return res.status(400).json({ error: 'Parameter mode diperlukan (search/stream)' });

    try {
        // --- MODE SEARCH: Cari lagu via iTunes API ---
        if (mode === 'search') {
            const { data } = await axios.get('https://itunes.apple.com/search', {
                params: {
                    term: url,
                    media: 'music',
                    limit: 20,
                    entity: 'song'
                },
                timeout: 10000
            });

            // Format response agar cocok dengan frontend yang sudah ada
            const songs = (data.results || [])
                .filter(item => item.previewUrl && item.kind === 'song')
                .map(item => ({
                    title: item.trackName,
                    artist: item.artistName,
                    thumbnail: item.artworkUrl100.replace('100x100', '300x300'), // gambar lebih besar
                    url: item.previewUrl, // preview URL 30 detik dari Apple
                    duration: item.trackTimeMillis,
                    album: item.collectionName
                }));

            return res.status(200).json({ type: 'list', songs });
        }

        // --- MODE STREAM: Proxy audio preview dari Apple ---
        if (mode === 'stream') {
            // url di sini adalah previewUrl dari iTunes
            const audioUrl = decodeURIComponent(url);

            const response = await axios.get(audioUrl, {
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mp4');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'no-cache');

            response.data.pipe(res);
        }

    } catch (error) {
        console.error('[API Error]', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};
