const axios = require('axios');

async function tryClient(clientName, clientVersion, extra = {}) {
    const body = {
        videoId: '60ItHLz5WEA',
        context: {
            client: {
                clientName,
                clientVersion,
                ...extra
            }
        }
    };

    try {
        const { data } = await axios.post(
            'https://www.youtube.com/youtubei/v1/player',
            body,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 8000
            }
        );

        const status = data.playabilityStatus?.status;
        const allFormats = [
            ...(data.streamingData?.formats || []),
            ...(data.streamingData?.adaptiveFormats || [])
        ];
        const audioWithUrl = allFormats.filter(f => f.mimeType?.startsWith('audio/') && f.url);
        console.log(`[${clientName}] Status: ${status}, Formats: ${allFormats.length}, Audio with URL: ${audioWithUrl.length}`);
        if (audioWithUrl.length > 0) {
            console.log(`  --> URL: ${audioWithUrl[0].url.slice(0,60)}...`);
        }
    } catch (e) {
        console.log(`[${clientName}] Error: ${e.message}`);
    }
}

async function main() {
    await tryClient('IOS', '19.29.1', { deviceModel: 'iPhone16,2' });
    await tryClient('TVHTML5_SIMPLY_EMBEDDED_PLAYER', '2.0');
    await tryClient('MWEB', '2.20240726.01.00');
}

main();
