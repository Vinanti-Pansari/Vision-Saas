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
    body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; }
    h1 { font-size: 1.6rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; }
    img { max-width: 100%; max-height: 320px; border: 1px solid #ccc; margin: 12px 0; }
    a.btn { display: inline-block; margin-top: 16px; padding: 8px 14px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 4px; }
    .error { color: #b00020; }
  </style>
</head>
<body>
${body}
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
      rows =
        '<table><thead><tr><th>#</th><th>Label</th><th>Confidence</th></tr></thead><tbody>' +
        labels
          .map(
            (l, i) =>
              `<tr><td>${i + 1}</td><td>${escapeHtml(l.description)}</td><td>${(l.score * 100).toFixed(1)}%</td></tr>`
          )
          .join('') +
        '</tbody></table>';
    }

    res.send(
      page(
        'Detected Labels',
        `<h1>Detected Labels</h1>
<p>File: ${escapeHtml(req.file.originalname)}</p>
<img src="${preview}" alt="Uploaded image">
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
