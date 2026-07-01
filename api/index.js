const ytSearch = require('yt-search');
const axios = require('axios');

function extractVideoId(url) {
    if (!url) return null;
    
    // Clean whitespace
    const cleanUrl = url.trim();

    // Check for youtu.be
    if (cleanUrl.includes('youtu.be/')) {
        const parts = cleanUrl.split('youtu.be/');
        if (parts[1]) {
            return parts[1].split('?')[0].split('/')[0];
        }
    }
    
    // Check for watch?v=
    if (cleanUrl.includes('v=')) {
        const parts = cleanUrl.split('v=');
        if (parts[1]) {
            return parts[1].split('&')[0];
        }
    }
    
    // Check for embed/ or v/
    if (cleanUrl.includes('embed/')) {
        return cleanUrl.split('embed/')[1].split('?')[0];
    }
    
    // If it looks like a video ID (11 chars, alphanumeric + underscores/dashes)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
        return cleanUrl;
    }
    
    return null;
}

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
            const videoId = extractVideoId(url);

            if (videoId) {
                try {
                    const v = await ytSearch({ videoId });
                    if (v) {
                        const song = {
                            title: v.title,
                            artist: v.author.name,
                            thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                            url: `https://www.youtube.com/watch?v=${v.videoId}`,
                            videoId: v.videoId,
                            duration: v.seconds * 1000,
                            album: ''
                        };
                        return res.status(200).json({ type: 'list', songs: [song] });
                    }
                } catch (err) {
                    console.error("Direct lookup failed, falling back to search:", err.message);
                }
            }

            const ytResults = await ytSearch(url);
            const videos = (ytResults.videos || [])
                .filter(v => v.videoId && v.seconds > 30 && v.seconds < 900)
                .slice(0, 20);

            // Ambil artwork berkualitas dari iTunes jika judulnya mirip (opsional)
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
