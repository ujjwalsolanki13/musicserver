module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  musicDir: process.env.MUSIC_DIR || '/home/user/projects/music-app/music/langauge',
  port: process.env.PORT || 3000,
};
