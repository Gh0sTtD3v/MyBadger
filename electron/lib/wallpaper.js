function generateWallpaperHtml(items, title) {
  const paths = JSON.stringify(items)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
.slide {
  position: fixed;
  inset: 0;
  opacity: 0;
  transition: opacity 1.5s ease-in-out;
}
.slide.active { opacity: 1; }
.slide img, .slide video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
</head>
<body>
<script>
const DURATION = 8000;

const items = ${paths};

for (let i = items.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [items[i], items[j]] = [items[j], items[i]];
}

const slides = items.map(item => {
  const div = document.createElement('div');
  div.className = 'slide';
  let el;
  if (item.type === 'video') {
    el = document.createElement('video');
    el.src = item.src;
    el.muted = true;
    el.loop = false;
    el.playsInline = true;
  } else {
    el = document.createElement('img');
    el.src = item.src;
  }
  div.appendChild(el);
  document.body.appendChild(div);
  return { div, el, type: item.type };
});

let current = 0;
let timer = null;

function show(index) {
  if (timer) clearTimeout(timer);
  slides.forEach(s => s.div.classList.remove('active'));
  const s = slides[index];
  s.div.classList.add('active');
  if (s.type === 'video') {
    s.el.currentTime = 0;
    s.el.play().catch(() => {});
    s.el.onended = advance;
  } else {
    timer = setTimeout(advance, DURATION);
  }
}

function advance() {
  current = (current + 1) % slides.length;
  show(current);
}

if (slides.length) show(0);
</script>
</body>
</html>`
}

function generateProjectJson(title) {
  return JSON.stringify({
    file: 'index.html',
    general: { properties: {}, supportsaudioprocessing: false },
    title,
    type: 'web',
    version: 2,
  }, null, 2)
}

module.exports = { generateWallpaperHtml, generateProjectJson }
