const axios = require('axios');
const forge = require('node-forge');

// Decrypt JioSaavn media URL
function decryptMediaUrl(encryptedMediaUrl) {
    if (!encryptedMediaUrl) return '';
    try {
        const key = "38346591";
        const iv = "00000000";
        const encrypted = forge.util.decode64(encryptedMediaUrl);
        const decipher = forge.cipher.createDecipher("DES-ECB", forge.util.createBuffer(key));
        decipher.start({ iv: forge.util.createBuffer(iv) });
        decipher.update(forge.util.createBuffer(encrypted));
        decipher.finish();
        const decrypted = decipher.output.getBytes();
        return decrypted.replace(/\0/g, '').trim();
    } catch (e) {
        console.error("Decryption error:", e.message);
        return '';
    }
}

// Decode HTML entities
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'");
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, mode } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter url diperlukan' });
    if (!mode) return res.status(400).json({ error: 'Parameter mode diperlukan' });

    try {
        // --- MODE SEARCH ---
        if (mode === 'search') {
            const response = await axios.get('https://jiosaavn.com/api.php', {
                params: {
                    __call: 'search.getResults',
                    q: url,
                    _format: 'json',
                    _marker: '0',
                    api_version: '4',
                    p: '1',
                    n: '20'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });

            const results = response.data.results || [];
            
            const songs = results
                .filter(song => song.more_info && song.more_info.encrypted_media_url)
                .map(song => {
                    const decrypted = decryptMediaUrl(song.more_info.encrypted_media_url);
                    // Use 320kbps high quality if available, otherwise fallback to decrypted link
                    const playableUrl = decrypted ? decrypted.replace('_96.', '_320.') : '';
                    
                    // Make image high quality (500x500)
                    const hdImage = song.image ? song.image.replace('150x150', '500x500') : 'https://via.placeholder.com/500';

                    return {
                        title: decodeHtml(song.title),
                        artist: decodeHtml(song.subtitle),
                        thumbnail: hdImage,
                        url: playableUrl,
                        duration: song.more_info.duration ? Number(song.more_info.duration) * 1000 : 0,
                        album: decodeHtml(song.more_info.album || '')
                    };
                })
                .filter(song => song.url !== ''); // Only keep songs that decrypted successfully

            return res.status(200).json({ type: 'list', songs });
        }

        // --- MODE STREAM (Legacy fallback, direct redirect if needed) ---
        if (mode === 'stream') {
            // Direct redirect since we already have the decrypted URL on client
            return res.redirect(302, decodeURIComponent(url));
        }

        return res.status(400).json({ error: 'Mode tidak valid' });

    } catch (error) {
        console.error('[API Error]', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};
