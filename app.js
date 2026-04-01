const express = require('express');
const path = require('path');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const FsBackend = require('i18next-fs-backend');

const app = express();
const port = 3000;

// 1. Configurazione i18next (Multilingua)
i18next
  .use(FsBackend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'it',
    backend: { loadPath: './locales/{{lng}}.json' }
  });

app.use(middleware.handle(i18next));

// 2. Configurazione View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 3. File Statici
app.use(express.static(path.join(__dirname, 'public')));

// 4. Rotte 
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

app.get('/progetti', (req, res) => {
  res.render('progetti', { title: 'I miei Progetti' });
});

app.get('/lab', (req, res) => {
  res.render('lab', { title: 'Il mio Homelab' });
});

// Avvio Server
app.listen(port, () => {
  console.log(`Portfolio attivo su http://localhost:${port}`);
});