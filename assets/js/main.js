const modeSwitch = document.querySelector(".mode-switch");
const portfolio = document.querySelector(".portfolio");
const logo = document.querySelector(".wordmark-icon");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const views = {
  work: document.querySelector("#work-view"),
  life: document.querySelector("#life-view"),
};
let viewTransition;
let logoAnimationFrame;
let viewAnimationFrame;
let activeMode = "work";
let nowPlayingInterval;
let nowPlayingRequest;

const nowPlayingCard = document.querySelector(".listening-card");
const nowPlayingTitle = nowPlayingCard.querySelector(".listening-copy h2");
const nowPlayingArtist = nowPlayingCard.querySelector(".now-playing-artist");
const nowPlayingArt = nowPlayingCard.querySelector(".now-playing-art");
const nowPlayingGlyph = nowPlayingCard.querySelector(".listening-glyph");
const nowPlayingLink = nowPlayingCard.querySelector("#now-playing-link");
const nowPlayingLinkLabel = nowPlayingCard.querySelector("#now-playing-link-label");
const defaultNowPlayingTitle = nowPlayingTitle.textContent;
const defaultNowPlayingLink = nowPlayingLink.href;
const NOW_PLAYING_ENDPOINT = "https://portfolio-now-playing.efeisldr.workers.dev/api/now-playing";

logo.addEventListener("animationend", (event) => {
  if (event.animationName === "logo-color-cycle") {
    logo.classList.remove("is-color-cycling", "is-color-cycling-reverse");
  }
});

function setMode(mode) {
  const previousMode = activeMode;
  const previousView = views[previousMode];
  const previousScrollY = window.scrollY;

  window.clearTimeout(viewTransition);
  window.cancelAnimationFrame(logoAnimationFrame);
  window.cancelAnimationFrame(viewAnimationFrame);
  for (const view of Object.values(views)) {
    view.classList.remove("is-leaving", "is-entering");
    if (view !== previousView) {
      view.hidden = true;
      view.inert = true;
    } else {
      view.inert = false;
    }
  }
  modeSwitch.dataset.active = mode;
  portfolio.dataset.mode = mode;

  logo.classList.remove("is-color-cycling", "is-color-cycling-reverse");
  if (previousMode !== mode && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    logoAnimationFrame = window.requestAnimationFrame(() => {
      logo.classList.add("is-color-cycling");
      if (mode === "work") {
        logo.classList.add("is-color-cycling-reverse");
      }
    });
  }

  for (const button of modeButtons) {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  if (previousMode === mode) {
    previousView.hidden = false;
    return;
  }

  activeMode = mode;
  if (mode === "life") {
    startNowPlayingUpdates();
    loadLastWatched();
  } else {
    stopNowPlayingUpdates();
  }

  const nextView = views[mode];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    previousView.hidden = true;
    previousView.inert = true;
    nextView.hidden = false;
    nextView.inert = false;
    window.scrollTo(0, previousScrollY);
    return;
  }

  previousView.classList.add("is-leaving");
  previousView.inert = true;
  nextView.hidden = false;
  nextView.inert = false;
  nextView.classList.add("is-entering");
  viewAnimationFrame = window.requestAnimationFrame(() => {
    viewAnimationFrame = window.requestAnimationFrame(() => nextView.classList.remove("is-entering"));
  });

  viewTransition = window.setTimeout(() => {
    previousView.hidden = true;
    previousView.classList.remove("is-leaving");
    previousView.inert = true;
    window.scrollTo(0, previousScrollY);
  }, 180);
}

function renderNowPlaying(track) {
  if (!track) {
    nowPlayingCard.classList.remove("is-playing");
    nowPlayingTitle.textContent = defaultNowPlayingTitle;
    nowPlayingArtist.textContent = "";
    nowPlayingArtist.hidden = true;
    nowPlayingArt.removeAttribute("src");
    nowPlayingArt.hidden = true;
    nowPlayingGlyph.hidden = false;
    nowPlayingLink.href = defaultNowPlayingLink;
    nowPlayingLinkLabel.textContent = "Find me on Spotify";
    nowPlayingLink.setAttribute("aria-label", "Find me on Spotify");
    return;
  }

  nowPlayingCard.classList.add("is-playing");
  nowPlayingTitle.textContent = track.title;
  nowPlayingArtist.textContent = track.artist;
  nowPlayingArtist.hidden = false;
  nowPlayingLink.href = track.songUrl;
  nowPlayingLinkLabel.textContent = "Listen on Spotify";
  nowPlayingLink.setAttribute("aria-label", `Listen to ${track.title} on Spotify`);

  if (track.albumArt) {
    nowPlayingArt.src = track.albumArt;
    nowPlayingArt.alt = "";
    nowPlayingArt.hidden = false;
    nowPlayingGlyph.hidden = true;
  } else {
    nowPlayingArt.removeAttribute("src");
    nowPlayingArt.hidden = true;
    nowPlayingGlyph.hidden = false;
  }
}

async function updateNowPlaying() {
  if (activeMode !== "life" || document.visibilityState !== "visible") {
    return;
  }

  nowPlayingRequest?.abort();
  nowPlayingRequest = new AbortController();

  try {
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      cache: "no-store",
      signal: nowPlayingRequest.signal,
    });
    if (!response.ok) {
      throw new Error(`Now Playing endpoint returned ${response.status}`);
    }

    const data = await response.json();
    const songUrl = typeof data.songUrl === "string" ? new URL(data.songUrl) : null;
    const albumArt = typeof data.albumArt === "string" ? new URL(data.albumArt) : null;
    const track = typeof data.title === "string" &&
      typeof data.artist === "string" &&
      songUrl?.protocol === "https:" &&
      songUrl.hostname === "open.spotify.com"
      ? {
          title: data.title,
          artist: data.artist,
          songUrl: songUrl.href,
          albumArt: albumArt?.protocol === "https:" ? albumArt.href : null,
        }
      : null;

    renderNowPlaying(track);
  } catch (error) {
    if (error.name !== "AbortError") {
      renderNowPlaying(null);
      console.error("Could not update the Now Playing card.", error);
    }
  }
}

function startNowPlayingUpdates() {
  window.clearInterval(nowPlayingInterval);
  updateNowPlaying();
  nowPlayingInterval = window.setInterval(updateNowPlaying, 60_000);
}

function stopNowPlayingUpdates() {
  window.clearInterval(nowPlayingInterval);
  nowPlayingRequest?.abort();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && activeMode === "life") {
    updateNowPlaying();
  }
});

for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

setMode("work");

// Your Worker proxies Letterboxd's RSS (browsers can't read it directly: CORS)
// and returns { title, year, rating, url, poster } for the newest diary entry.
const LETTERBOXD_ENDPOINT = "https://portfolio-now-playing.efeisldr.workers.dev/api/last-watched";

const watchingCard = document.querySelector(".watching-card");
const watchingTitle = watchingCard.querySelector(".watching-title");
const watchingMeta = watchingCard.querySelector(".watching-meta");
const watchingArt = watchingCard.querySelector(".watching-art");
const watchingLink = watchingCard.querySelector("#last-watched-link");
let watchingLoaded = false;

async function loadLastWatched() {
  if (watchingLoaded) return;

  try {
    const response = await fetch(LETTERBOXD_ENDPOINT);
    if (!response.ok) throw new Error(`Letterboxd endpoint returned ${response.status}`);
    const data = await response.json();

    const url = new URL(data.url);
    if (url.protocol !== "https:" || url.hostname !== "letterboxd.com" || typeof data.title !== "string") return;

    watchingTitle.textContent = data.title;
    const stars = Number(data.rating) > 0 ? "★".repeat(Math.floor(data.rating)) + (data.rating % 1 ? "½" : "") : "";
    watchingMeta.textContent = [data.year, stars].filter(Boolean).join("  ");
    watchingMeta.hidden = !watchingMeta.textContent;
    watchingLink.href = url.href;

    const poster = typeof data.poster === "string" ? new URL(data.poster) : null;
    if (poster?.protocol === "https:" && poster.hostname.endsWith("ltrbxd.com")) {
      watchingArt.src = poster.href;
      watchingArt.hidden = false;
    }
    watchingLoaded = true;
  } catch (error) {
    console.error("Could not load the last watched film.", error);
  }
}
