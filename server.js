const express = require('express');
const multer = require('multer');
const path = require('path');
const vision = require('@google-cloud/vision');

const app = express();
const client = new vision.ImageAnnotatorClient();

// Keep the uploaded image in memory (no disk writes needed on App Engine)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #ecfeff 100%);
      color: #1e293b; padding: 32px 24px;
    }
    .card { width: 100%; max-width: 760px; background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 10px 40px rgba(30,41,59,.10); }
    .badge { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .04em; color: #4f46e5; background: #eef2ff; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
    h1 { margin: 0 0 6px; font-size: 1.6rem; }
    .file { color: #64748b; font-size: 14px; margin: 0 0 16px; word-break: break-all; }
    img.preview { display: block; width: 100%; max-height: 320px; object-fit: contain; background: #f1f5f9; border-radius: 12px; margin-bottom: 20px; }
    .labels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { display: grid; grid-template-columns: 28px 1fr 52px; align-items: center; gap: 10px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
    @media (max-width: 560px) { .labels { grid-template-columns: 1fr; } }
    .rank { width: 24px; height: 24px; border-radius: 50%; background: #eef2ff; color: #4f46e5; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .name { font-weight: 600; margin-bottom: 6px; }
    .bar { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .bar > span { display: block; height: 100%; background: linear-gradient(90deg, #6366f1, #22d3ee); border-radius: 999px; }
    .pct { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #475569; }
    a.btn { display: block; margin-top: 24px; padding: 14px; text-align: center; font-weight: 600; color: #fff; text-decoration: none; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 12px; }
    .error { color: #b91c1c; }
  </style>
</head>
<body>
  <main class="card">
${body}
  </main>
</body>
</html>`;
}

// Serves the client HTML form
app.use(express.static(path.join(__dirname, 'public')));

// Receives the image, calls Cloud Vision label detection, returns an HTML list
app.post('/upload', upload.single('pic'), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .send(page('Error', '<h1 class="error">No image uploaded</h1><a class="btn" href="/">Back</a>'));
  }

  try {
    const [result] = await client.labelDetection({
      image: { content: req.file.buffer },
      maxResults: 15,
    });
    const labels = result.labelAnnotations || [];

    const preview = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    let rows;
    if (labels.length === 0) {
      rows = '<p>No labels detected.</p>';
    } else {
      rows = '<div class="labels">' + labels
        .map((l, i) => {
          const pct = (l.score * 100).toFixed(1);
          return `<div class="label">
  <div class="rank">${i + 1}</div>
  <div><div class="name">${escapeHtml(l.description)}</div><div class="bar"><span style="width:${pct}%"></span></div></div>
  <div class="pct">${pct}%</div>
</div>`;
        })
        .join('\n') + '</div>';
    }

    res.send(
      page(
        'Detected Labels',
        `<span class="badge">GOOGLE CLOUD VISION</span>
<h1>Detected Labels</h1>
<p class="file">${escapeHtml(req.file.originalname)}</p>
<img class="preview" src="${preview}" alt="Uploaded image">
${rows}
<a class="btn" href="/">Upload another image</a>`
      )
    );
  } catch (err) {
    console.error('Vision API error:', err);
    res
      .status(500)
      .send(
        page(
          'Error',
          `<h1 class="error">Vision API error</h1><p>${escapeHtml(err.message)}</p><a class="btn" href="/">Back</a>`
        )
      );
  }
});

// Upload / multer errors (wrong file type, too large)
app.use((err, req, res, next) => {
  res
    .status(400)
    .send(page('Error', `<h1 class="error">${escapeHtml(err.message)}</h1><a class="btn" href="/">Back</a>`));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
