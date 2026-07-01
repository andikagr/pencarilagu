const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, mode } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter url diperlukan' });
    if (!mode) return res.status(400).json({ error: 'Parameter mode diperlukan' });

    try {
        // --- MODE SEARCH: Cari lagu di YouTube ---
        if (mode === 'search') {
            const ytResults = await ytSearch(url);
            // Ambil video yang durasinya > 30 detik dan < 15 menit (untuk menghindari full album/playlist panjang)
            const videos = (ytResults.videos || [])
                .filter(v => v.videoId && v.seconds > 30 && v.seconds < 900)
                .slice(0, 20);

            // Ambil artwork berkualitas dari iTunes jika judulnya mirip (opsional, untuk UI estetik)
            let itunesMap = {};
            try {
                const { data } = await axios.get('https://itunes.apple.com/search', {
                    params: { term: url, media: 'music', limit: 15, entity: 'song' },
                    timeout: 4000
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
                    || v.thumbnail
                    || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

                return {
                    title: v.title,
                    artist: v.author.name,
                    thumbnail: thumbnail,
                    url: `https://www.youtube.com/watch?v=${v.videoId}`,
                    videoId: v.videoId,
                    duration: v.seconds * 1000,
                    album: ''
                };
            });

            return res.status(200).json({ type: 'list', songs });
        }

        return res.status(400).json({ error: 'Mode tidak valid' });

    } catch (error) {
        console.error('[API Error]', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};
