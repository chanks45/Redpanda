(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const cockpit = $('#cockpit');
  const panda = $('#panda');
  const menu = $('#settingsMenu');
  const themeSelect = $('#themeSelect');
  const speedValue = $('#speedValue');
  const speedUnit = $('#speedUnit');
  const rpmValue = $('#rpmValue');
  const rpmArc = $('#rpmArc');
  const rpmPupil = $('#rpmPupil');
  const engineStatus = $('#engineStatus');
  const fuelText = $('#fuelValueText');
  const healthText = $('#healthValueText');
  const gearValue = $('#gearValue');
  const odoValue = $('#odoValue');
  const lightValue = $('#lightValue');
  const beltValue = $('#beltValue');
  const speedAlarmAudio = $('#speedAlarmAudio');

  const state = {
    engine: true, speed: 0, rpm: 0, fuel: 100, health: 100, gear: 'N',
    headlights: 0, left: false, right: false, seatbelt: true,
    speedMode: 0, odometer: 0, resizeMode: false, moveMode: false,
    alarmPlaying: false
  };
  const STORAGE_KEY = 'chubbyRedPandaHud_v1';
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Number.isFinite(saved.tx)) cockpit.style.setProperty('--tx', `${saved.tx}px`);
      if (Number.isFinite(saved.ty)) cockpit.style.setProperty('--ty', `${saved.ty}px`);
      if (Number.isFinite(saved.scale)) cockpit.style.setProperty('--scale', String(clamp(saved.scale, .55, 1.6)));
      if (['classic', 'snow', 'midnight'].includes(saved.theme)) setTheme(saved.theme, false);
    } catch (_) {}
  }
  function saveSettings() {
    const parsePx = v => parseFloat(v || '0') || 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tx: parsePx(cockpit.style.getPropertyValue('--tx')),
        ty: parsePx(cockpit.style.getPropertyValue('--ty')),
        scale: num(cockpit.style.getPropertyValue('--scale'), 1),
        theme: [...cockpit.classList].find(c => c.startsWith('theme-'))?.replace('theme-', '') || 'classic'
      }));
    } catch (_) {}
  }
  function setTheme(theme, persist = true) {
    cockpit.classList.remove('theme-classic', 'theme-snow', 'theme-midnight');
    cockpit.classList.add(`theme-${theme}`);
    if (themeSelect) themeSelect.value = theme;
    if (persist) saveSettings();
  }
  function setMode(mode) {
    state.moveMode = mode === 'move';
    state.resizeMode = mode === 'resize';
    cockpit.classList.toggle('mode-move', state.moveMode);
    cockpit.classList.toggle('mode-resize', state.resizeMode);
    document.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('active', b.dataset.act === mode));
  }
  function toggleMenu(force) {
    menu.classList.toggle('open', typeof force === 'boolean' ? force : !menu.classList.contains('open'));
    if (!menu.classList.contains('open')) setMode('');
  }
  function getScale() { return clamp(num(getComputedStyle(cockpit).getPropertyValue('--scale'), 1), .55, 1.6); }
  function setScale(s) { cockpit.style.setProperty('--scale', String(clamp(s, .55, 1.6))); saveSettings(); }
  function setOffset(x, y) {
    const maxX = window.innerWidth * .45, maxY = window.innerHeight * .45;
    cockpit.style.setProperty('--tx', `${clamp(x, -maxX, maxX)}px`);
    cockpit.style.setProperty('--ty', `${clamp(y, -maxY, maxY)}px`);
    saveSettings();
  }
  function getOffset() {
    return {
      x: parseFloat(cockpit.style.getPropertyValue('--tx')) || 0,
      y: parseFloat(cockpit.style.getPropertyValue('--ty')) || 0
    };
  }
  function displaySpeed() {
    const conversion = state.speedMode === 1 ? 2.236936 : state.speedMode === 2 ? 1.943844 : 3.6;
    const value = Math.max(0, state.speed * conversion);
    speedValue.textContent = String(Math.round(value)).padStart(3, '0');
    speedUnit.textContent = state.speedMode === 1 ? 'MPH' : state.speedMode === 2 ? 'KNOTS' : 'KM/H';
    cockpit.classList.toggle('overspeed', value >= 120);
    cockpit.classList.toggle('speed-medium', value >= 25 && value < 80);
    cockpit.classList.toggle('speed-fast', value >= 80);
    if (value >= 60) startAlarm(); else stopAlarm();
  }
  function startAlarm() {
    if (!speedAlarmAudio || state.alarmPlaying) return;
    state.alarmPlaying = true;
    try { speedAlarmAudio.volume = .25; const p = speedAlarmAudio.play(); if (p?.catch) p.catch(() => {}); } catch (_) {}
  }
  function stopAlarm() {
    if (!speedAlarmAudio) return;
    state.alarmPlaying = false;
    speedAlarmAudio.pause();
    try { speedAlarmAudio.currentTime = 0; } catch (_) {}
  }
  function displayRPM() {
    const normalized = clamp(state.rpm, 0, 1);
    rpmValue.textContent = (normalized * 10).toFixed(1);
    rpmArc.style.strokeDasharray = `${Math.PI * 52 * normalized} ${Math.PI * 52}`;
    rpmArc.style.strokeDashoffset = '0';
    rpmPupil.setAttribute('transform', `translate(${(normalized - .5) * 20} ${-normalized * 4})`);
    cockpit.classList.toggle('rpm-redline', normalized >= .88 && state.engine);
  }
  function displayState() {
    cockpit.classList.toggle('engine-off', !state.engine);
    cockpit.classList.toggle('health-damaged', state.health < 60);
    cockpit.classList.toggle('health-critical', state.health < 25);
    cockpit.classList.toggle('fuel-critical', state.fuel < 20);
    cockpit.classList.toggle('headlight-low', state.headlights === 1);
    cockpit.classList.toggle('headlight-high', state.headlights >= 2);
    cockpit.classList.toggle('indicator-left', state.left);
    cockpit.classList.toggle('indicator-right', state.right);
    cockpit.classList.toggle('seatbelt-off', !state.seatbelt);
    engineStatus.textContent = state.engine ? 'ENGINE ON' : 'ENGINE OFF';
    fuelText.textContent = `FUEL ${Math.round(state.fuel)}%`;
    healthText.textContent = `HEALTH ${Math.round(state.health)}%`;
    gearValue.textContent = String(state.gear).toUpperCase().slice(0, 3);
    odoValue.textContent = Math.round(state.odometer).toString().padStart(6, '0');
    lightValue.textContent = state.headlights === 0 ? 'LIGHTS OFF' : state.headlights === 1 ? 'LIGHTS ON' : 'HIGH BEAM';
    beltValue.textContent = state.seatbelt ? 'BELT ON' : 'BELT OFF';
    displaySpeed(); displayRPM();
  }

  // Public hooks: call these from your FiveM client Lua/NUI integration.
  window.setEngine = value => { state.engine = !!value; displayState(); };
  window.setSpeed = value => { state.speed = Math.max(0, num(value)); displaySpeed(); };
  window.setRPM = value => { state.rpm = clamp(num(value), 0, 1); displayRPM(); };
  window.setFuel = value => { state.fuel = clamp(num(value), 0, 100); displayState(); };
  window.setHealth = value => { let n = num(value, 100); if (n > 100) n = n / 10; state.health = clamp(n, 0, 100); displayState(); };
  window.setGear = value => { state.gear = value ?? 'N'; displayState(); };
  window.setHeadlights = value => { state.headlights = clamp(Math.round(num(value)), 0, 2); displayState(); };
  window.setLeftIndicator = value => { state.left = !!value; displayState(); };
  window.setRightIndicator = value => { state.right = !!value; displayState(); };
  window.setSeatbelts = value => { state.seatbelt = !!value; displayState(); };
  window.setSpeedMode = value => { state.speedMode = clamp(Math.round(num(value)), 0, 2); displaySpeed(); };
  window.setOdometer = value => { state.odometer = Math.max(0, num(value)); displayState(); };

  window.addEventListener('message', event => {
    const d = event.data || {};
    const data = d.data && typeof d.data === 'object' ? d.data : d;
    const type = String(d.action || d.type || data.action || '').toLowerCase();
    if (type === 'hud' || type === 'update' || type === 'vehicle' || !type) {
      if ('engine' in data) window.setEngine(data.engine);
      if ('speed' in data) window.setSpeed(data.speed);
      if ('rpm' in data) window.setRPM(data.rpm);
      if ('fuel' in data) window.setFuel(data.fuel);
      if ('health' in data) window.setHealth(data.health);
      if ('gear' in data) window.setGear(data.gear);
      if ('headlights' in data) window.setHeadlights(data.headlights);
      if ('leftIndicator' in data) window.setLeftIndicator(data.leftIndicator);
      if ('rightIndicator' in data) window.setRightIndicator(data.rightIndicator);
      if ('seatbelts' in data) window.setSeatbelts(data.seatbelts);
      if ('speedMode' in data) window.setSpeedMode(data.speedMode);
      if ('odometer' in data) window.setOdometer(data.odometer);
    }
    if (type === 'settings' || type === 'toggle-settings') toggleMenu();
  });

  $('#closeSettings').addEventListener('click', () => toggleMenu(false));
  $('#settingsHint').addEventListener('click', () => toggleMenu());
  themeSelect.addEventListener('change', e => setTheme(e.target.value));
  document.querySelectorAll('[data-act]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.act;
    if (action === 'move' || action === 'resize') setMode(state.moveMode && action === 'move' || state.resizeMode && action === 'resize' ? '' : action);
    if (action === 'reset') {
      cockpit.style.setProperty('--tx', '0px'); cockpit.style.setProperty('--ty', '0px'); cockpit.style.setProperty('--scale', '1');
      setTheme('classic', false); setMode(''); saveSettings();
    }
  }));

  let dragging = false, dragStart = null;
  panda.addEventListener('pointerdown', e => {
    if (!state.moveMode || e.target.closest('button')) return;
    const offset = getOffset();
    dragging = true;
    dragStart = { pointerX: e.clientX, pointerY: e.clientY, offsetX: offset.x, offsetY: offset.y };
    cockpit.classList.add('dragging'); panda.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  window.addEventListener('pointermove', e => {
    if (!dragging || !dragStart) return;
    setOffset(dragStart.offsetX + e.clientX - dragStart.pointerX, dragStart.offsetY + e.clientY - dragStart.pointerY);
  });
  window.addEventListener('pointerup', () => { dragging = false; dragStart = null; cockpit.classList.remove('dragging'); });
  panda.addEventListener('wheel', e => {
    if (!state.resizeMode) return;
    e.preventDefault(); setScale(getScale() + (e.deltaY < 0 ? .04 : -.04));
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.key === 'F2') { e.preventDefault(); toggleMenu(); }
    if (e.key === 'Escape') toggleMenu(false);
  });
  window.addEventListener('resize', () => { const o = getOffset(); setOffset(o.x, o.y); });

  // YouTube IFrame API music player.
  const playlistEl = $('#music-playlist');
  const progress = $('#music-progress');
  const volume = $('#music-volume');
  const musicCover = $('#music-cover');
  const titleEl = $('#music-track-title');
  const subtitleEl = $('#music-track-subtitle');
  const placeholder = $('#music-player-placeholder');
  const playBtn = $('#btn-music-play');
  const repeatBtn = $('#btn-music-repeat');
  const shuffleBtn = $('#btn-music-shuffle');
  let tracks = [];
  let currentIndex = -1;
  let player = null;
  let apiReady = false;
  let repeat = false;
  let shuffle = false;
  let muted = false;
  let progressTimer = null;
  const defaultTracks = [
    { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio', subtitle: 'Lofi Girl' },
    { id: '5qap5aO4i9A', title: 'lofi beats', subtitle: 'Live stream' }
  ];
  function extractVideoId(input) {
    const value = String(input || '').trim();
    if (/^[\w-]{11}$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1, 12);
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const m = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
      return m ? m[1] : null;
    } catch (_) { return null; }
  }
  function fmtTime(seconds) {
    seconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function renderPlaylist() {
    playlistEl.innerHTML = '';
    tracks.forEach((track, i) => {
      const li = document.createElement('li');
      li.classList.toggle('active', i === currentIndex);
      const name = document.createElement('span'); name.className = 'track-name'; name.textContent = `${i + 1}. ${track.title}`;
      name.title = track.title;
      name.addEventListener('click', () => playTrack(i));
      const remove = document.createElement('button'); remove.className = 'remove-track'; remove.textContent = '×'; remove.title = 'Remove';
      remove.addEventListener('click', e => { e.stopPropagation(); tracks.splice(i, 1); if (i === currentIndex) { currentIndex = -1; stopTrack(); } else if (i < currentIndex) currentIndex--; renderPlaylist(); });
      li.append(name, remove); li.addEventListener('dblclick', () => playTrack(i)); playlistEl.append(li);
    });
  }
  function updateTrackUI(track) {
    titleEl.textContent = track?.title || 'Select a track';
    subtitleEl.textContent = track?.subtitle || 'YouTube playlist';
    musicCover.innerHTML = track ? `<img alt="" src="https://img.youtube.com/vi/${track.id}/mqdefault.jpg">` : '<span>♪</span>';
    placeholder.textContent = track ? 'YouTube audio player' : 'Player ready';
    renderPlaylist();
  }
  function playTrack(index) {
    if (!tracks.length) return;
    currentIndex = (index + tracks.length) % tracks.length;
    updateTrackUI(tracks[currentIndex]);
    if (player && apiReady) { player.loadVideoById(tracks[currentIndex].id); player.setVolume(Number(volume.value)); if (muted) player.mute(); else player.unMute(); }
  }
  function stopTrack() {
    if (player && apiReady) player.stopVideo();
    updateTrackUI(null);
  }
  function nextTrack() {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) {
      let n = currentIndex; while (n === currentIndex) n = Math.floor(Math.random() * tracks.length);
      playTrack(n);
    } else playTrack(currentIndex + 1);
  }
  function prevTrack() { playTrack(currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1); }
  function setPlayButton(playing) { playBtn.textContent = playing ? 'Ⅱ' : '▶'; }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
      width: '100%', height: '1', videoId: tracks[0]?.id || '',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: event => { apiReady = true; event.target.setVolume(Number(volume.value)); setPlayButton(false); },
        onStateChange: event => {
          if (event.data === YT.PlayerState.PLAYING) setPlayButton(true);
          else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) setPlayButton(false);
          if (event.data === YT.PlayerState.ENDED) { if (repeat) playTrack(currentIndex); else nextTrack(); }
        },
        onError: () => { placeholder.textContent = 'Video tidak dapat diputar. Coba URL lain.'; }
      }
    });
    if (tracks.length) updateTrackUI(tracks[0]);
  }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  function loadYouTubeApi() {
    if (document.querySelector('script[data-youtube-api]')) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api'; script.dataset.youtubeApi = '1';
    document.head.appendChild(script);
  }
  $('#btn-music-prev').addEventListener('click', prevTrack);
  $('#btn-music-next').addEventListener('click', nextTrack);
  playBtn.addEventListener('click', () => {
    if (!player || !apiReady) { if (currentIndex < 0 && tracks.length) playTrack(0); return; }
    const status = player.getPlayerState();
    if (status === YT.PlayerState.PLAYING) player.pauseVideo();
    else if (currentIndex < 0 && tracks.length) playTrack(0);
    else player.playVideo();
  });
  $('#btn-music-mute').addEventListener('click', () => {
    muted = !muted;
    if (player && apiReady) muted ? player.mute() : player.unMute();
    $('#btn-music-mute').classList.toggle('active', muted);
  });
  repeatBtn.addEventListener('click', () => { repeat = !repeat; repeatBtn.classList.toggle('active', repeat); });
  shuffleBtn.addEventListener('click', () => { shuffle = !shuffle; shuffleBtn.classList.toggle('active', shuffle); });
  $('#btn-music-add-toggle').addEventListener('click', () => $('#music-add-row').classList.toggle('hidden'));
  $('#btn-music-add').addEventListener('click', () => {
    const input = $('#music-url-input');
    const id = extractVideoId(input.value);
    if (!id) { input.setCustomValidity('Masukkan URL YouTube atau ID video yang valid.'); input.reportValidity(); return; }
    input.setCustomValidity('');
    const title = $('#music-title-input').value.trim() || `YouTube track ${tracks.length + 1}`;
    tracks.push({ id, title, subtitle: 'Added by you' });
    input.value = ''; $('#music-title-input').value = '';
    if (currentIndex < 0) playTrack(tracks.length - 1); else renderPlaylist();
  });
  $('#btn-music-clear').addEventListener('click', () => { tracks = []; currentIndex = -1; stopTrack(); });
  volume.addEventListener('input', () => { if (player && apiReady) player.setVolume(Number(volume.value)); });
  progress.addEventListener('input', () => {
    if (player && apiReady) {
      const duration = player.getDuration() || 0;
      if (duration) player.seekTo(duration * Number(progress.value) / 100, true);
    }
  });
  progressTimer = window.setInterval(() => {
    if (!player || !apiReady) return;
    const duration = player.getDuration() || 0, current = player.getCurrentTime() || 0;
    $('#music-current-time').textContent = fmtTime(current);
    $('#music-duration').textContent = fmtTime(duration);
    if (!progress.matches(':active')) progress.value = duration ? String(current / duration * 100) : '0';
  }, 500);

  tracks = defaultTracks.slice();
  updateTrackUI(tracks[0]);
  loadYouTubeApi();
  loadSettings();
  displayState();

  // Friendly boot greeting via browser speech synthesis when supported.
  window.addEventListener('DOMContentLoaded', () => {
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance('Red Panda HUD online. Drive safe.');
      utterance.rate = 1.05; utterance.pitch = 1.15; utterance.volume = .55;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  });
})();