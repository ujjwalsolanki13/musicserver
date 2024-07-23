const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database.js');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = (req, res) => {
  const { email, name, contact, password } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Bcrypt error' });
    }

    db.run('INSERT INTO users (email, name, contact, password) VALUES (?, ?, ?, ?)', [email, name, contact, hash], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Sign-up successful', token });
    });
  });
};

exports.signin = (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    bcrypt.compare(password, row.password, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Bcrypt error' });
      }

      if (result) {
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
        
        db.run('UPDATE users SET token = ? WHERE email = ?', [token, email], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({ message: 'Sign-in successful', token });
        });
        
      } else {
        res.status(401).json({ message: 'Invalid email or password' });
      }
    });
  });
};
