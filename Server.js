const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const db = require('./database.js');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Server URL for constructing file URLs
const SERVER_URL = `http://${HOST}:${PORT}`;

app.use(cors());
app.use(express.json()); // To parse JSON request bodies

const upload = multer({
  dest: path.join(__dirname, 'music'), // Directory to store uploaded files
});

// Use auth routes
app.use('/api/auth', authRoutes);

// Endpoint to list all music files
app.get('/music', (req, res) => {
  const language = req.query.language || 'en';
  const musicDir = path.join(__dirname, 'music', language);

  fs.readdir(musicDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to scan directory' });
    }

    const musicFiles = files.filter(file => file.endsWith('.mp3') || file.endsWith('.aac')).map(file => ({
      name: file,
      url: `${SERVER_URL}/music/${language}/${file}`,
    }));

    res.json(musicFiles);
  });
});


  app.get('/music/:language/:filename', (req, res) => {
    const { language, filename } = req.params;
    const musicDir = path.join(__dirname, 'music', language);
    const filePath = path.join(musicDir, filename);
    const ext = path.extname(filename).toLowerCase();
    let contentType;
  
    switch (ext) {
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.aac':
        contentType = 'audio/aac';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }
  
    fs.stat(filePath, (err, stat) => {
      if (err) {
        return res.status(404).json({ error: 'File not found' });
      }
  
      const fileSize = stat.size;
      const range = req.headers.range;
  
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  
        if (start >= fileSize || end >= fileSize) {
          res.status(416).json({ error: 'Requested range not satisfiable' });
          return;
        }
  
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
  
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
  
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    });
  });
  




// Endpoint for uploading screenshot
app.post('/music', [authMiddleware, upload.single('paymentScreenshot')], (req, res) => {
  const { email } = req.body;
  const paymentScreenshot = req.file;

  if (!paymentScreenshot) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Move uploaded file to a specific location (e.g., public/uploads)
  const newPath = path.join(__dirname, 'music', paymentScreenshot.filename);
  fs.renameSync(paymentScreenshot.path, newPath);

  // Update user's payment_screenshot field in the database
  db.run(
    `UPDATE users SET payment_screenshot = ? WHERE email = ?`,
    [paymentScreenshot.filename, email],
    (err) => {
      if (err) {
        console.error('Error updating payment screenshot:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Payment screenshot uploaded successfully' });
    }
  );
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
