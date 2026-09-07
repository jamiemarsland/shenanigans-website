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
