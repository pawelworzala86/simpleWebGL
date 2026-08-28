import express from 'express'
import path from 'path'

const app = express();
const PORT = process.env.PORT || 3000;

// Serwowanie statycznych plików z folderu "public"
app.use(express.static(path.resolve('./dist')));
app.use('/src',express.static(path.resolve('./src')));
app.use('/shaders',express.static(path.resolve('./shaders')));
app.use('/models',express.static(path.resolve('./models')));

// Fallback dla SPA lub stron bez routera
app.get(/\*/, (req, res) => {
  res.sendFile(path.resolve('./dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server działa na http://localhost:${PORT}`);
});