const axios = require('axios');

async function test() {
    try {
        // Fetch detail of a song using its ID
        const res = await axios.get('https://jiosaavn.com/api.php', {
            params: {
                __call: 'song.getDetails',
                pids: 'oOZiyzO1', // Song ID from autocomplete or search
                _format: 'json',
                _marker: '0',
                api_version: '4'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        console.log("Song details response keys:", Object.keys(res.data));
        // Typically the response is a dictionary with song IDs as keys
        const songId = Object.keys(res.data)[0];
        if (songId) {
            console.log(`Song ${songId} details keys:`, Object.keys(res.data[songId]));
            console.log("Encrypted media URL:", res.data[songId].more_info?.encrypted_media_url);
        } else {
            console.log("Empty details response");
        }
    } catch (e) {
        console.error(e.message);
    }
}
test();
