/**
 * Core Application File - Santo Alessandro Sciacca Portfolio
 * Tecnologie: Node.js, Express, EJS, i18next, Helmet, Rate-Limit
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const FsBackend = require('i18next-fs-backend');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

/**
 * CONFIGURAZIONE GLOBALE
 */
// FIX: Fondamentale se fai deploy dietro a Nginx, Heroku, Render o Vercel.
// Permette al Rate Limiter e al Logger di leggere il vero IP dell'utente e non quello del server proxy.
app.set('trust proxy', 1);

const configPath = path.join(__dirname, 'public', 'config.json');
let siteConfig = {};
try {
    siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error("[SISTEMA] Errore critico: Impossibile caricare config.json", e.message);
}

/**
 * 1. SICUREZZA
 */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://github.com", "https://*.githubusercontent.com"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            "connect-src": ["'self'", "https://api.github.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * 2. PROTEZIONE FLOOD
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 200, 
    message: 'Troppe richieste da questo IP, riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

/**
 * 3. INTERNAZIONALIZZAZIONE
 */
const localesPath = path.join(__dirname, 'locales');
const availableLangs = fs.readdirSync(localesPath)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

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

/**
 * 4. CONFIGURAZIONE
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.__ = req.t;
    res.locals.currentLang = req.language;
    res.locals.availableLangs = availableLangs;
    res.locals.config = siteConfig;
    next();
});

/**
 * 5. LOGGER (GDPR COMPLIANT & PROXY SAFE)
 */
app.use((req, res, next) => {
    const start = Date.now();
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

   
    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
    }
    
    if (clientIp !== 'unknown') {
        if (clientIp.includes('.')) {
            // Anonimizza IPv4
            clientIp = clientIp.split('.').slice(0, 3).join('.') + '.xxx';
        } else if (clientIp.includes(':')) {
            // Anonimizza IPv6
            const ipv6Parts = clientIp.split(':');
            clientIp = ipv6Parts.slice(0, 3).join(':') + ':xxxx:xxxx';
        }
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        
        if (!req.url.includes('chrome-extension') && !req.url.endsWith('.json') && !req.url.includes('/css/')) {
            console.log(`[${new Date().toLocaleTimeString()}] [IP: ${clientIp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
    });
    
    next();
});

/**
 * 6. ROTTE
 */
app.get('/', (req, res) => res.render('index', { title: req.t('nav_home') }));
app.get('/progetti', (req, res) => res.render('progetti', { title: req.t('nav_projects') }));
app.get('/lab', (req, res) => res.render('lab', { title: req.t('nav_lab') }));

/**
 * 7. GESTIONE ERRORI
 */
app.use((req, res, next) => {
    const err = new Error(req.t('err_404_title'));
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || req.t('err_500_title');
    
    if (status >= 500) console.error(`[SYSTEM ERROR] ${err.stack}`);

    res.status(status).render('error', { 
        title: `${status} - ${message}`, 
        statusCode: status, 
        message: message 
    });
});

/**
 * 8. AVVIO
 */
app.listen(port, () => {
  console.log(`Portfolio professionale attivo su http://localhost:${port}`);
});