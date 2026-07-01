// Dynamic Audio Engine Selector (Native Audio vs YouTube Iframe Player)
const nativeAudio = document.getElementById('audio-source');
let activeEngine = 'native'; // 'native' or 'youtube'
let ytPlayer;
let timeUpdateInterval;

// Load YouTube Iframe API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('yt-player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0
        },
        events: {
            'onReady': () => {
                console.log("YouTube Player Ready");
            },
            'onStateChange': onPlayerStateChange
        }
    });
};

function onPlayerStateChange(event) {
    if (activeEngine !== 'youtube') return;
    
    if (event.data === YT.PlayerState.PLAYING) {
        audioMock.dispatchEvent('playing');
        startTrackingTime();
    } else if (event.data === YT.PlayerState.BUFFERING) {
        audioMock.dispatchEvent('waiting');
    } else if (event.data === YT.PlayerState.ENDED) {
        audioMock.dispatchEvent('ended');
        stopTrackingTime();
    } else if (event.data === YT.PlayerState.PAUSED) {
        stopTrackingTime();
    }
}

function startTrackingTime() {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => {
        audioMock.dispatchEvent('timeupdate');
    }, 250);
}

function stopTrackingTime() {
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }
}

// Forward native audio events to audioMock
nativeAudio.addEventListener('waiting', () => {
    if (activeEngine === 'native') audioMock.dispatchEvent('waiting');
});
nativeAudio.addEventListener('playing', () => {
    if (activeEngine === 'native') audioMock.dispatchEvent('playing');
});
nativeAudio.addEventListener('timeupdate', () => {
    if (activeEngine === 'native') audioMock.dispatchEvent('timeupdate');
});
nativeAudio.addEventListener('ended', () => {
    if (activeEngine === 'native') audioMock.dispatchEvent('ended');
});

const audioMock = {
    _src: '',
    _preload: '',
    listeners: {},
    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    dispatchEvent(event) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb());
        }
    },
    get src() { return this._src; },
    set src(val) {
        this._src = val;
        if (val.includes('youtube.com') || val.includes('youtu.be')) {
            activeEngine = 'youtube';
            nativeAudio.pause();
        } else {
            activeEngine = 'native';
            if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
            nativeAudio.src = val;
        }
    },
    get preload() { return this._preload; },
    set preload(val) {
        this._preload = val;
        if (activeEngine === 'native') nativeAudio.preload = val;
    },
    async play() {
        if (!this._src) return;
        
        if (activeEngine === 'youtube') {
            let videoId = '';
            try {
                const urlObj = new URL(this._src);
                videoId = urlObj.searchParams.get('v');
            } catch (_) {
                videoId = this._src;
            }
            
            if (videoId && ytPlayer && ytPlayer.loadVideoById) {
                ytPlayer.loadVideoById(videoId);
                ytPlayer.playVideo();
            }
        } else {
            await nativeAudio.play();
        }
    },
    pause() {
        if (activeEngine === 'youtube') {
            if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        } else {
            nativeAudio.pause();
        }
    },
    get currentTime() {
        if (activeEngine === 'youtube') {
            if (ytPlayer && ytPlayer.getCurrentTime) return ytPlayer.getCurrentTime();
            return 0;
        } else {
            return nativeAudio.currentTime;
        }
    },
    set currentTime(val) {
        if (activeEngine === 'youtube') {
            if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(val, true);
        } else {
            nativeAudio.currentTime = val;
        }
    },
    get duration() {
        if (activeEngine === 'youtube') {
            if (ytPlayer && ytPlayer.getDuration) return ytPlayer.getDuration();
            return 0;
        } else {
            return nativeAudio.duration;
        }
    }
};

const audio = audioMock;

// UI Elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('search-results');
const loadingDiv = document.getElementById('search-loading');
const libraryList = document.getElementById('library-list');

// Player Elements
const miniPlayer = document.getElementById('bottom-player');
const fullPlayer = document.getElementById('full-player');
const miniProgress = document.getElementById('mini-progress');
const mainSlider = document.getElementById('main-slider');

// State
let isPlaying = false;
let currentMeta = null;
let currentPlaylistSongs = [];
let isDraggingSlider = false;

// --- AUTHENTICATION STATE & LOGIC ---
let currentUser = localStorage.getItem('vibe_logged_in_user') || null;
let authMode = 'login'; // 'login' or 'register'

function getActiveUser() {
    if (!currentUser) return null;
    let users = JSON.parse(localStorage.getItem('vibe_users') || '[]');
    return users.find(u => u.username === currentUser) || null;
}

function updateActiveUser(updatedData) {
    if (!currentUser) return;
    let users = JSON.parse(localStorage.getItem('vibe_users') || '[]');
    let index = users.findIndex(u => u.username === currentUser);
    if (index !== -1) {
        users[index] = { ...users[index], ...updatedData };
        localStorage.setItem('vibe_users', JSON.stringify(users));
    }
}

function getLibrary() {
    let user = getActiveUser();
    return user ? user.library : [];
}

function saveLibrary(lib) {
    updateActiveUser({ library: lib });
}

function getPlaylists() {
    let user = getActiveUser();
    return user ? user.playlists : [];
}

function savePlaylists(pls) {
    updateActiveUser({ playlists: pls });
}

function openAuthModal() {
    if (currentUser) {
        if (confirm(`Apakah kamu ingin logout dari akun ${currentUser}?`)) {
            logout();
        }
        return;
    }
    authMode = 'login';
    document.getElementById('auth-title').innerText = 'Masuk ke Vibe Music';
    document.getElementById('auth-submit-btn').innerText = 'Masuk';
    document.getElementById('auth-toggle').innerText = 'Belum punya akun? Daftar disini';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('modal-auth').classList.add('active');
}

function toggleAuthMode() {
    if (authMode === 'login') {
        authMode = 'register';
        document.getElementById('auth-title').innerText = 'Daftar Akun Baru';
        document.getElementById('auth-submit-btn').innerText = 'Daftar';
        document.getElementById('auth-toggle').innerText = 'Sudah punya akun? Masuk disini';
    } else {
        authMode = 'login';
        document.getElementById('auth-title').innerText = 'Masuk ke Vibe Music';
        document.getElementById('auth-submit-btn').innerText = 'Masuk';
        document.getElementById('auth-toggle').innerText = 'Belum punya akun? Daftar disini';
    }
}

function submitAuth() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) {
        alert('Username dan password wajib diisi!');
        return;
    }

    let users = JSON.parse(localStorage.getItem('vibe_users') || '[]');

    if (authMode === 'register') {
        const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
            alert('Username sudah terpakai!');
            return;
        }

        const newUser = {
            username: username,
            password: password,
            library: [],
            playlists: []
        };
        users.push(newUser);
        localStorage.setItem('vibe_users', JSON.stringify(users));
        alert('Pendaftaran berhasil! Silakan masuk.');
        toggleAuthMode();
    } else {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (!user) {
            alert('Username atau password salah!');
            return;
        }

        currentUser = user.username;
        localStorage.setItem('vibe_logged_in_user', currentUser);
        closeModal('modal-auth');
        alert(`Selamat datang kembali, ${currentUser}!`);
        updateUserHeader();
        loadLibrary();
        checkLikeStatus();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('vibe_logged_in_user');
    alert('Berhasil keluar akun.');
    updateUserHeader();
    loadLibrary();
    checkLikeStatus();
}

function updateUserHeader() {
    const userBtn = document.getElementById('user-btn');
    const displayUsername = document.getElementById('display-username');
    if (currentUser) {
        displayUsername.innerText = `Hi, ${currentUser}`;
        if (userBtn) {
            userBtn.className = 'fa-solid fa-right-from-bracket';
            userBtn.style.color = '#ff2a5f';
        }
    } else {
        displayUsername.innerText = 'Music Center';
        if (userBtn) {
            userBtn.className = 'fa-solid fa-user';
            userBtn.style.color = 'white';
        }
    }
}

// --- INITIALIZATION ---
window.onload = () => {
    updateUserHeader();
    loadLibrary();
};

// --- NAVIGATION ---
function switchTab(tabName) {
    const targetId = tabName === 'playlist-detail' ? 'view-playlist-detail' : `view-${tabName}`;
    const targetView = document.getElementById(targetId);

    document.querySelectorAll('.page-view').forEach(el => {
        if (el.id !== targetId) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const navIndex = ['home', 'search', 'library'].indexOf(tabName);
    if (navIndex !== -1 && document.querySelectorAll('.nav-item')[navIndex]) {
        document.querySelectorAll('.nav-item')[navIndex].classList.add('active');
    }
}

// --- SEARCH LOGIC ---
let debounceTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (e.target.value.length > 2) performSearch(e.target.value);
    }, 400);
});

function quickSearch(term) {
    switchTab('search');
    searchInput.value = term;
    performSearch(term);
}

async function performSearch(query) {
    loadingDiv.style.display = 'block';
    searchResults.innerHTML = '';

    try {
        const res = await fetch(`/api/index?url=${encodeURIComponent(query)}&mode=search`);
        const data = await res.json();

        loadingDiv.style.display = 'none';

        if (data.songs && data.songs.length > 0) {
            const mappedSongs = data.songs.map(s => ({
                url: s.url,
                title: s.title,
                artist: s.artist,
                cover: s.thumbnail
            }));

            data.songs.forEach((song, index) => {
                const item = document.createElement('div');
                item.className = 'result-item';

                // Cek if liked
                const lib = getLibrary();
                const isLiked = lib.find(s => s.url === song.url);
                const heartClass = isLiked ? 'fa-solid' : 'fa-regular';
                const heartColor = isLiked ? '#ff2a5f' : 'var(--text-gray)';

                item.innerHTML = `
                    <img src="${song.thumbnail}" alt="art">
                    <div class="result-info">
                        <h4>${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                    <div class="actions" style="display:flex; gap:15px; align-items:center;">
                        <i class="${heartClass} fa-heart like-btn-search" style="color:${heartColor}; cursor:pointer; font-size:18px;"></i>
                        <i class="fa-solid fa-play" style="color:var(--accent)"></i>
                    </div>
                `;

                item.onclick = (e) => {
                    if (e.target.classList.contains('like-btn-search')) {
                        e.stopPropagation();
                        toggleLikeFromSearch(song, e.target);
                        return;
                    }

                    currentPlaylistSongs = mappedSongs;
                    playMusic(mappedSongs[index]);
                };
                searchResults.appendChild(item);
            });
        } else {
            searchResults.innerHTML = '<div style="text-align:center; padding:20px;">Lagu tidak ditemukan.</div>';
        }
    } catch (e) {
        loadingDiv.style.display = 'none';
        searchResults.innerHTML = '<div style="text-align:center; padding:20px;">Error koneksi.</div>';
    }
}

function toggleLikeFromSearch(song, iconEl) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu untuk menyukai lagu!');
        openAuthModal();
        return;
    }

    let lib = getLibrary();
    const index = lib.findIndex(s => s.url === song.url);

    if (index === -1) {
        lib.unshift({
            url: song.url,
            title: song.title,
            artist: song.artist,
            cover: song.thumbnail
        });
        iconEl.classList.remove('fa-regular');
        iconEl.classList.add('fa-solid');
        iconEl.style.color = '#ff2a5f';
        alert("Ditambahkan ke Liked Songs");
    } else {
        lib.splice(index, 1);
        iconEl.classList.remove('fa-solid');
        iconEl.classList.add('fa-regular');
        iconEl.style.color = 'var(--text-gray)';
        alert("Dihapus dari Liked Songs");
    }
    saveLibrary(lib);
    loadLibrary();
}

// --- PLAYER LOGIC ---
async function playMusic(songData) {
    currentMeta = songData;
    updateUI(currentMeta);

    document.getElementById('mini-play-btn').className = 'fa-solid fa-spinner fa-spin';

    try {
        audio.src = songData.url;
        audio.preload = "auto";
        await audio.play();

        isPlaying = true;
        updatePlayIcons();

    } catch (e) {
        console.error(e);
        isPlaying = false;
        updatePlayIcons();
    }
}

function updateUI(meta) {
    document.getElementById('mini-cover').src = meta.cover;
    document.getElementById('mini-title').innerText = meta.title;
    document.getElementById('mini-artist').innerText = meta.artist;

    document.getElementById('full-cover').src = meta.cover;
    document.getElementById('full-title').innerText = meta.title;
    document.getElementById('full-artist').innerText = meta.artist;

    checkLikeStatus();
}

function checkLikeStatus() {
    if (!currentMeta) return;
    const lib = getLibrary();
    const isLiked = lib.find(s => s.url === currentMeta.url);
    const likeBtn = document.getElementById('like-btn');

    if (isLiked) {
        likeBtn.className = 'fa-solid fa-heart';
        likeBtn.style.color = '#ff2a5f';
    } else {
        likeBtn.className = 'fa-regular fa-heart';
        likeBtn.style.color = 'white';
    }
}

// --- CONTROLS ---
miniPlayer.addEventListener('click', (e) => {
    if (!e.target.closest('.mini-controls')) {
        fullPlayer.classList.add('show');
    }
});

function closeFullPlayer() {
    fullPlayer.classList.remove('show');
}

function togglePlay() {
    if (!audio.src) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        audio.play();
        isPlaying = true;
    }
    updatePlayIcons();
}

function updatePlayIcons() {
    const miniIcon = document.getElementById('mini-play-btn');
    const fullIcon = document.getElementById('full-play-icon');
    const equalizer = document.getElementById('mini-equalizer');
    const bottomPlayer = document.getElementById('bottom-player');

    if (isPlaying) {
        miniIcon.className = 'fa-solid fa-pause';
        fullIcon.className = 'fa-solid fa-pause';
        fullPlayer.classList.add('playing');
        if (bottomPlayer) bottomPlayer.classList.add('playing');
        if (equalizer) equalizer.classList.add('playing');
    } else {
        miniIcon.className = 'fa-solid fa-play';
        fullIcon.className = 'fa-solid fa-play';
        fullPlayer.classList.remove('playing');
        if (bottomPlayer) bottomPlayer.classList.remove('playing');
        if (equalizer) equalizer.classList.remove('playing');
    }
}

audio.addEventListener('waiting', () => {
    document.getElementById('mini-play-btn').className = 'fa-solid fa-spinner fa-spin';
});

audio.addEventListener('playing', () => {
    updatePlayIcons();
});

// --- SEEKING & PROGRESS BAR LOGIC ---
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;

    if (!isDraggingSlider) {
        const pct = (audio.currentTime / audio.duration) * 100;
        miniProgress.style.width = pct + '%';
        mainSlider.value = pct;
        document.getElementById('curr-time').innerText = formatTime(audio.currentTime);
    }
    document.getElementById('total-time').innerText = formatTime(audio.duration);
});

mainSlider.addEventListener('input', (e) => {
    isDraggingSlider = true;
    const val = e.target.value;
    const time = (val / 100) * audio.duration;
    document.getElementById('curr-time').innerText = formatTime(time);
});

mainSlider.addEventListener('change', (e) => {
    const val = e.target.value;
    const time = (val / 100) * audio.duration;
    audio.currentTime = time;
    isDraggingSlider = false;
});

audio.addEventListener('ended', async () => {
    playNext(true); // pass true to indicate auto-play next
});

async function playNext(isAuto = false) {
    if (!currentMeta) return;

    const currentIndex = currentPlaylistSongs.findIndex(s => s.url === currentMeta.url);
    if (currentIndex !== -1 && currentIndex < currentPlaylistSongs.length - 1) {
        playMusic(currentPlaylistSongs[currentIndex + 1]);
        return;
    }

    if (isAuto) {
        document.getElementById('mini-title').innerText = "Mencari lagu selanjutnya...";
        try {
            const res = await fetch(`/api/index?url=${encodeURIComponent(currentMeta.artist)}&mode=search`);
            const data = await res.json();
            if (data.songs && data.songs.length > 0) {
                const suggestions = data.songs.filter(s => s.url !== currentMeta.url);
                if (suggestions.length > 0) {
                    const nextSong = suggestions[0];
                    currentPlaylistSongs = [currentMeta, { url: nextSong.url, title: nextSong.title, artist: nextSong.artist, cover: nextSong.thumbnail }];
                    playMusic(currentPlaylistSongs[1]);
                } else {
                    isPlaying = false; updatePlayIcons();
                }
            }
        } catch (e) {
            isPlaying = false; updatePlayIcons();
        }
    }
}

function playPrev() {
    if (!currentMeta) return;
    const currentIndex = currentPlaylistSongs.findIndex(s => s.url === currentMeta.url);
    if (currentIndex > 0) {
        playMusic(currentPlaylistSongs[currentIndex - 1]);
    } else if (audio.currentTime > 3) {
        audio.currentTime = 0;
    }
}

function formatTime(s) {
    if (isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

// --- LIBRARY & PLAYLIST MANAGEMENT ---
function openLikeOptionModal() {
    if (!currentMeta) return;
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        openAuthModal();
        return;
    }

    document.getElementById('modal-like-options').classList.add('active');
    const listDiv = document.getElementById('like-options-list');
    listDiv.innerHTML = '';

    const likedItem = document.createElement('div');
    likedItem.className = 'pl-select-item';
    likedItem.innerHTML = `<div style="width:40px;height:40px;background:var(--accent);display:flex;align-items:center;justify-content:center;border-radius:4px;"><i class="fa-solid fa-heart" style="color:white"></i></div><span>Liked Songs</span>`;
    likedItem.onclick = () => {
        toggleLikedSongs();
        closeModal('modal-like-options');
    };
    listDiv.appendChild(likedItem);

    const playlists = getPlaylists();
    playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'pl-select-item';
        item.innerHTML = `<img src="${pl.image}"><span>${pl.name}</span>`;
        item.onclick = () => {
            addSongToPlaylist(pl.id);
            closeModal('modal-like-options');
        };
        listDiv.appendChild(item);
    });
}

function toggleLikedSongs() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        openAuthModal();
        return;
    }

    let lib = getLibrary();
    const exists = lib.find(s => s.url === currentMeta.url);

    if (!exists) {
        lib.unshift(currentMeta);
        alert("Ditambahkan ke Liked Songs");
    } else {
        lib = lib.filter(s => s.url !== currentMeta.url);
        alert("Dihapus dari Liked Songs");
    }

    saveLibrary(lib);
    checkLikeStatus();
    loadLibrary();
}

function loadLibrary() {
    libraryList.innerHTML = '';

    if (!currentUser) {
        libraryList.innerHTML = `
            <div style="text-align:center; padding: 45px 20px; background: var(--surface-dark-elevated); border-radius: 8px; border: 1px solid var(--glass-border);">
                <i class="fa-solid fa-lock" style="font-size: 40px; color: var(--accent); margin-bottom:15px; filter: drop-shadow(0 0 10px rgba(0,112,209,0.3));"></i>
                <h3 style="font-weight: 300; margin-bottom: 10px;">Library Terkunci</h3>
                <p style="color:var(--text-mute); font-size:13px; margin-bottom:20px; line-height:1.4;">Silakan login terlebih dahulu untuk membuat playlist dan menyimpan lagu favorit.</p>
                <button onclick="openAuthModal()" class="btn-save" style="padding: 10px 24px; border-radius: 9999px; border:none; font-weight:700; cursor:pointer;">Masuk / Daftar</button>
            </div>
        `;
        return;
    }

    // Folder Liked Songs
    const liked = getLibrary();
    const likedDiv = document.createElement('div');
    likedDiv.className = 'result-item liked-songs-card';
    likedDiv.innerHTML = `
        <div style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; font-size:20px; background: rgba(255,255,255,0.1); border-radius:8px;"><i class="fa-solid fa-heart" style="color:#ff2a5f"></i></div>
        <div class="result-info">
            <h4>Liked Songs</h4>
            <p>${liked.length} liked songs</p>
        </div>
    `;
    likedDiv.onclick = () => openPlaylistDetail('liked', 'Liked Songs', 'https://cdn.odzre.my.id/rri.jpg');
    libraryList.appendChild(likedDiv);

    // Custom Playlists
    const playlists = getPlaylists();
    playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <img src="${pl.image}" alt="pl">
            <div class="result-info">
                <h4>${pl.name}</h4>
                <p>${pl.songs.length} songs</p>
            </div>
            <i class="fa-solid fa-trash del-pl-btn" onclick="deletePlaylist(${pl.id}, event)"></i>
        `;
        item.onclick = (e) => {
            if (!e.target.classList.contains('del-pl-btn')) {
                openPlaylistDetail(pl.id, pl.name, pl.image);
            }
        };
        libraryList.appendChild(item);
    });
}

// Modal Helpers
function openCreateModal() { 
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        openAuthModal();
        return;
    }
    document.getElementById('modal-create-playlist').classList.add('active'); 
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.getElementById('new-pl-file').addEventListener('change', function (e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : "Belum ada foto";
    document.getElementById('file-name-display').innerText = fileName;
});

function saveNewPlaylist() {
    const name = document.getElementById('new-pl-name').value;
    const fileInput = document.getElementById('new-pl-file');
    const file = fileInput.files[0];

    if (!name) return alert("Nama playlist wajib diisi!");

    const save = (imgSrc) => {
        const newPl = { id: Date.now(), name: name, image: imgSrc, songs: [] };
        const playlists = getPlaylists();
        playlists.push(newPl);
        savePlaylists(playlists);

        closeModal('modal-create-playlist');
        document.getElementById('new-pl-name').value = '';
        fileInput.value = '';
        document.getElementById('file-name-display').innerText = "Belum ada foto";
        loadLibrary();
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = function () {
            save(reader.result);
        }
        reader.readAsDataURL(file);
    } else {
        save("https://cdn.odzre.my.id/77c.jpg");
    }
}

function deletePlaylist(id, e) {
    e.stopPropagation();
    if (!confirm("Hapus playlist ini?")) return;
    let playlists = getPlaylists();
    playlists = playlists.filter(p => p.id !== id);
    savePlaylists(playlists);
    loadLibrary();
}

function openPlaylistDetail(id, name, img) {
    const detailView = document.getElementById('view-playlist-detail');
    const targetId = 'view-playlist-detail';

    document.querySelectorAll('.page-view').forEach(el => {
        if (el.id !== targetId) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    detailView.style.display = 'block';
    detailView.classList.add('active');

    document.getElementById('pl-detail-name').innerText = name;
    document.getElementById('pl-detail-img').src = img;

    const listContainer = document.getElementById('playlist-songs-list');
    listContainer.innerHTML = '';

    let songs = [];
    if (id === 'liked') {
        songs = getLibrary();
    } else {
        const playlists = getPlaylists();
        const pl = playlists.find(p => p.id === id);
        songs = pl ? pl.songs : [];
    }

    currentPlaylistSongs = songs;
    document.getElementById('pl-detail-count').innerText = `${songs.length} Songs`;

    if (songs.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#777">Playlist kosong.</p>';
    } else {
        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <span style="color:#777; font-size:12px; margin-right:10px;">${index + 1}</span>
                <img src="${song.cover}" alt="art">
                <div class="result-info">
                    <h4>${song.title}</h4>
                    <p>${song.artist}</p>
                </div>
            `;
            item.onclick = () => playMusic(song);
            listContainer.appendChild(item);
        });
    }
}

function playPlaylistAll() {
    if (currentPlaylistSongs.length > 0) {
        playMusic(currentPlaylistSongs[0]);
    } else {
        alert("Playlist kosong!");
    }
}

function openAddToPlaylistModal() {
    if (!currentMeta) return alert("Putar lagu dulu!");
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        openAuthModal();
        return;
    }
    document.getElementById('modal-add-to-pl').classList.add('active');

    const listDiv = document.getElementById('list-pl-for-add');
    listDiv.innerHTML = '';

    const playlists = getPlaylists();
    if (playlists.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center;">Belum ada playlist.</p>';
        return;
    }

    playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'pl-select-item';
        item.innerHTML = `<img src="${pl.image}"><span>${pl.name}</span>`;
        item.onclick = () => addSongToPlaylist(pl.id);
        listDiv.appendChild(item);
    });
}

function addSongToPlaylist(plId) {
    let playlists = getPlaylists();
    const index = playlists.findIndex(p => p.id === plId);

    if (index !== -1) {
        const exists = playlists[index].songs.find(s => s.url === currentMeta.url);
        if (exists) {
            alert("Lagu sudah ada di playlist ini!");
        } else {
            playlists[index].songs.push(currentMeta);
            savePlaylists(playlists);
            alert("Berhasil ditambahkan!");
            closeModal('modal-add-to-pl');
        }
    }
}
