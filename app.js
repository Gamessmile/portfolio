const express = require('express');
const path = require('path');
const fs = require('fs');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const FsBackend = require('i18next-fs-backend');

const app = express();
const port = 3000;

// Lettura dinamica delle lingue disponibili nella cartella locales
const availableLangs = fs.readdirSync(path.join(__dirname, 'locales'))
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

// 1. Inizializzazione i18next
i18next
  .use(FsBackend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'it',
    supportedLngs: availableLangs,
    backend: { loadPath: './locales/{{lng}}.json' },
    detection: {
        order: ['cookie', 'header'],
        caches: ['cookie'],
        lookupCookie: 'i18next',
        cookieMinutes: 43200 
    }
  });

app.use(middleware.handle(i18next));  

// 2. Middleware per rendere variabili e funzioni disponibili in tutti i template EJS
app.use((req, res, next) => {
    res.locals.__ = req.t; // Alias per le traduzioni
    res.locals.currentLang = req.language;
    res.locals.availableLangs = availableLangs;
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 3. File statici
app.use(express.static(path.join(__dirname, 'public')));

// 4. Logger personalizzato per le richieste
app.use((req, res, next) => {
    const start = Date.now();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (!req.url.includes('chrome-extension') && !req.url.includes('.json')) {
            console.log(`[${new Date().toLocaleTimeString()}] [IP: ${clientIp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
    });
    
    next();
});

// 5. Rotte principali
app.get('/', (req, res) => {
  res.render('index', { title: req.t('nav_home') });
});

app.get('/progetti', (req, res) => {
  res.render('progetti', { title: req.t('nav_projects') });
});

app.get('/lab', (req, res) => {
  res.render('lab', { title: req.t('nav_lab') });
});

// 6. Gestione Errori (Middlewares finali)

// Catch 404 e traduzione dinamica del titolo errore
app.use((req, res, next) => {
    const err = new Error(req.t('err_404_title'));
    err.status = 404;
    next(err);
});

// Error Handler Universale
app.use((err, req, res, next) => {
    const status = err.status || 500;
    // Se l'errore non ha un messaggio (500), usa la traduzione di default
    const message = err.message || req.t('err_500_title');
    
    if (status >= 500) {
        console.error(`[ERRORE DI SISTEMA] ${err.stack}`);
    }

    res.status(status);
    res.render('error', { 
        title: `${status} - ${message}`, 
        statusCode: status, 
        message: message 
    });
});

// Avvio Server
app.listen(port, () => {
  console.log(`Portfolio attivo su http://localhost:${port}`);
});