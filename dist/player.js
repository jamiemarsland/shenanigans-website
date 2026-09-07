const audio = document.querySelector('#audio');
const vinyl = document.querySelector('#vinyl');
const error = document.querySelector('#error');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = ['Sample 01', 'Sample 02', 'Sample 03'];
let selected = 0;
let playRequest = 0;
let angle = 0;
let speed = 0;
let lastFrame = 0;
let frameRequest = 0;
let dragging = null;

const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1 15 8 4 15z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h4v14H3zm6 0h4v14H9z"/></svg>';

const trackList = document.querySelector('#tracks');
trackList.innerHTML = names.map((name, index) => `
  <div class="track" data-index="${index}">
    <span class="track-id">A${index + 1}</span>
    <span class="track-name">${name}</span>
    <span class="now" hidden>NOW PLAYING</span>
    <button class="play" type="button" aria-label="Play ${name}" aria-pressed="false">${playIcon}</button>
    <div class="transport" hidden>
      <input class="seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek ${name}">
      <span class="time">0:00 / 0:24</span>
    </div>
  </div>`).join('');
const rows = [...trackList.querySelectorAll('.track')];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function showError(message = '') {
  error.textContent = message;
  error.hidden = !message;
}
function updateProgress() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 24;
  const progress = duration ? (audio.currentTime / duration) * 100 : 0;
  const row = rows[selected];
  const seek = row.querySelector('.seek');
  seek.value = String(progress);
  seek.style.setProperty('--progress', `${progress}%`);
  seek.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} of ${formatTime(duration)}`);
  row.querySelector('.time').textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
}
function updateControls() {
  rows.forEach((row, index) => {
    const active = index === selected;
    const playing = active && !audio.paused && !audio.ended;
    row.classList.toggle('track--selected', active);
    row.querySelector('.transport').hidden = !active;
    row.querySelector('.now').hidden = !playing;
    const button = row.querySelector('.play');
    button.innerHTML = playing ? pauseIcon : playIcon;
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${names[index]}`);
    button.setAttribute('aria-pressed', String(playing));
  });
}
function changeSource(index) {
  audio.pause();
  selected = index;
  audio.src = `assets/sample-${index + 1}.wav`;
  updateControls();
  updateProgress();
}
async function toggleTrack(index) {
  const request = ++playRequest;
  showError();
  if (index !== selected) changeSource(index);
  if (!audio.paused) {
    audio.pause();
    return;
  }
  try {
    await audio.play();
  } catch (problem) {
    if (request === playRequest && problem.name !== 'AbortError') {
      showError('Could not play this sample. Please try again.');
      updateControls();
    }
  }
}
rows.forEach((row, index) => {
  row.querySelector('.play').addEventListener('click', () => toggleTrack(index));
  row.querySelector('.seek').addEventListener('input', event => {
    if (index === selected && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = audio.duration * Number(event.target.value) / 100;
      updateProgress();
    }
  });
});

function spin(timestamp) {
  frameRequest = 0;
  if (dragging) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
  lastFrame = timestamp;
  const target = !audio.paused && !audio.ended && !reducedMotion.matches ? 200 : 0;
  speed += (target - speed) * (1 - Math.exp(-dt * (target ? 2.8 : 2)));
  if (reducedMotion.matches) speed = 0;
  angle = (angle + speed * dt) % 360;
  vinyl.setAttribute('transform', `rotate(${angle} 500 497)`);
  if (target || speed > 0.2) frameRequest = requestAnimationFrame(spin);
  else { speed = 0; lastFrame = 0; }
}
function animateRecord() {
  if (!frameRequest) frameRequest = requestAnimationFrame(spin);
}
['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, () => {
  updateControls();
  animateRecord();
}));
['timeupdate', 'loadedmetadata', 'durationchange'].forEach(event => audio.addEventListener(event, updateProgress));
audio.addEventListener('error', () => {
  showError('This sample is unavailable. Try another track.');
  updateControls();
});
reducedMotion.addEventListener('change', animateRecord);
const volume = document.querySelector('#volume');
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value);
  volume.style.setProperty('--progress', `${audio.volume * 100}%`);
});
audio.volume = Number(volume.value);
changeSource(0);

const panelControls = [...document.querySelectorAll('[data-panel]')];
function showPanel(panel, open = true, scroll = true) {
  panel.hidden = !open;
  panelControls.filter(control => control.dataset.panel === panel.id).forEach(control => {
    control.setAttribute('aria-expanded', String(open));
  });
  if (open && scroll) panel.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
}
panelControls.forEach(control => {
  const panel = document.getElementById(control.dataset.panel);
  control.setAttribute('aria-expanded', 'false');
  control.setAttribute('aria-controls', panel.id);
  control.addEventListener('click', event => {
    event.preventDefault();
    // Navigation always reveals the section; the section buttons also collapse it.
    showPanel(panel, control.tagName === 'A' || panel.hidden);
  });
});
function revealHash() {
  const id = location.hash.slice(1);
  if (['band', 'gig-details', 'booking-details'].includes(id)) {
    showPanel(document.getElementById(id), true, true);
  }
}
window.addEventListener('hashchange', revealHash);
revealHash();

const bookingForm = document.querySelector('#booking-form');
const bookingSuccess = document.querySelector('#booking-success');
const redirect = bookingForm.querySelector('input[name="_next"]');
// Keep the return address correct if this site is later opened on a custom domain.
if (location.protocol === 'https:' || location.protocol === 'http:') {
  const returnURL = new URL(location.href);
  returnURL.search = '?booking=submitted';
  returnURL.hash = 'booking-details';
  redirect.value = returnURL.href;
}
if (new URLSearchParams(location.search).get('booking') === 'submitted') {
  bookingForm.hidden = true;
  bookingSuccess.hidden = false;
  showPanel(document.querySelector('#booking-details'), true, true);
  const cleanURL = new URL(location.href);
  cleanURL.searchParams.delete('booking');
  history.replaceState(null, '', cleanURL.pathname + cleanURL.search + cleanURL.hash);
}
document.querySelector('#new-enquiry').addEventListener('click', () => {
  bookingForm.reset();
  bookingForm.hidden = false;
  bookingSuccess.hidden = true;
  document.querySelector('#contact-name').focus();
});

// Short overlapping grains let the actual recording scratch in either direction.
const recordControl = document.querySelector('.vinyl-shell');
let scratchContext;
const scratchBuffers = new Map();
const grains = new Set();
async function prepareScratch(index) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  scratchContext ||= new Context();
  await scratchContext.resume();
  if (!scratchBuffers.has(index)) {
    const pending = fetch(`assets/sample-${index + 1}.wav`).then(response => {
      if (!response.ok) throw new Error('Audio unavailable');
      return response.arrayBuffer();
    }).then(bytes => scratchContext.decodeAudioData(bytes)).then(forward => {
      const reverse = scratchContext.createBuffer(forward.numberOfChannels, forward.length, forward.sampleRate);
      for (let ch = 0; ch < forward.numberOfChannels; ch++) reverse.getChannelData(ch).set(forward.getChannelData(ch).slice().reverse());
      return { forward, reverse };
    });
    scratchBuffers.set(index, pending);
    pending.catch(() => scratchBuffers.delete(index));
  }
  return scratchBuffers.get(index);
}
function scratchGrain(buffers, position, delta, elapsed) {
  if (!buffers || !scratchContext || Math.abs(delta) < .001) return;
  const source = scratchContext.createBufferSource();
  const gain = scratchContext.createGain();
  const backwards = delta < 0;
  source.buffer = backwards ? buffers.reverse : buffers.forward;
  source.playbackRate.value = Math.min(4, Math.max(.25, Math.abs(delta) / Math.max(.008, elapsed)));
  const offset = Math.max(0, Math.min(source.buffer.duration - .005, backwards ? source.buffer.duration - position : position));
  const now = scratchContext.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(audio.volume * .6, now + .008);
  gain.gain.linearRampToValueAtTime(0, now + .07);
  source.connect(gain).connect(scratchContext.destination);
  grains.add(source);
  source.onended = () => { grains.delete(source); source.disconnect(); gain.disconnect(); };
  source.start(now, offset);
  source.stop(now + .075);
}
function pointerAngle(event) {
  const rect = recordControl.getBoundingClientRect();
  return Math.atan2((event.clientY - rect.top) / rect.height - .497, (event.clientX - rect.left) / rect.width - .5) * 180 / Math.PI;
}
function syncRecordValue() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  recordControl.setAttribute('aria-valuenow', String(duration ? Math.round(audio.currentTime / duration * 100) : 0));
  recordControl.setAttribute('aria-valuetext', formatTime(audio.currentTime));
}
recordControl.addEventListener('pointerdown', event => {
  if (dragging || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  const state = { id: event.pointerId, angle: pointerAngle(event), time: performance.now(), resume: !audio.paused, index: selected, buffers: null };
  dragging = state;
  playRequest++;
  audio.pause();
  speed = 0;
  recordControl.classList.add('scratching');
  recordControl.setPointerCapture(event.pointerId);
  recordControl.focus({ preventScroll: true });
  prepareScratch(selected).then(buffers => { if (dragging === state) state.buffers = buffers; }).catch(() => {});
});
recordControl.addEventListener('pointermove', event => {
  if (!dragging || dragging.id !== event.pointerId) return;
  const next = pointerAngle(event);
  const degrees = ((next - dragging.angle + 540) % 360) - 180;
  const now = performance.now();
  const delta = degrees / 200;
  angle += degrees;
  vinyl.setAttribute('transform', `rotate(${angle} 500 497)`);
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
    scratchGrain(dragging.buffers, audio.currentTime, delta, (now - dragging.time) / 1000);
    updateProgress();
    syncRecordValue();
  }
  dragging.angle = next;
  dragging.time = now;
});
function releaseRecord(event) {
  if (!dragging || (event && event.pointerId !== undefined && event.pointerId !== dragging.id)) return;
  const state = dragging;
  dragging = null;
  if (recordControl.hasPointerCapture(state.id)) recordControl.releasePointerCapture(state.id);
  recordControl.classList.remove('scratching');
  for (const grain of grains) { try { grain.stop(); } catch {} }
  if (state.resume && state.index === selected) audio.play().catch(() => showError('Press play to continue this sample.'));
  animateRecord();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => recordControl.addEventListener(event, releaseRecord));
window.addEventListener('blur', () => releaseRecord());
recordControl.addEventListener('keydown', event => {
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleTrack(selected); }
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && Number.isFinite(audio.duration)) {
    event.preventDefault();
    audio.currentTime = event.key === 'Home' ? 0 : event.key === 'End' ? audio.duration : Math.max(0, Math.min(audio.duration, audio.currentTime + (event.key === 'ArrowLeft' ? -.5 : .5)));
    updateProgress(); syncRecordValue();
  }
});
audio.addEventListener('timeupdate', syncRecordValue);
