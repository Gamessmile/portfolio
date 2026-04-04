document.addEventListener('DOMContentLoaded', () => {

    // --- 0. TRADUZIONI (Ponte JSON-LD) ---
    const transElement = document.getElementById('translations-data');
    const i18n = transElement ? JSON.parse(transElement.textContent) : {};
    const t = (key) => i18n[key] || key;

    // --- 0.5 NAVIGAZIONE ATTIVA ---
    const currentPath = window.location.pathname;
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // --- 1. UTILITY & CONFIG ---
    const yearSpan = document.getElementById('dynamic-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const hexToRgba = (hex, alpha) => {
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return `rgba(128, 128, 128, ${alpha})`;
        let val = hex.substring(1);
        if (val.length === 3) val = val.split('').map(c => c + c).join('');
        let r = parseInt(val.slice(0, 2), 16), g = parseInt(val.slice(2, 4), 16), b = parseInt(val.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const extensionMap = {
        'sql': 'SQL', 'java': 'Java', 'py': 'Python', 'php': 'PHP',
        'cpp': 'C++', 'cs': 'C#', 'js': 'JavaScript', 'c': 'C'
    };

    // --- 2. UI LOGIC (Tema, Lingua) ---
    const htmlTag = document.documentElement;
    const themeBtns = document.querySelectorAll('.theme-btn');
    const setTheme = (theme) => {
        htmlTag.setAttribute('data-theme', theme);
        localStorage.setItem('site-theme', theme);
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-set-theme') === theme));
    };
    setTheme(localStorage.getItem('site-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    themeBtns.forEach(btn => btn.addEventListener('click', () => setTheme(btn.getAttribute('data-set-theme'))));

    document.querySelectorAll('.lang-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.cookie = `i18next=${e.currentTarget.getAttribute('data-lang')}; path=/; max-age=31536000; SameSite=Lax`;
            window.location.reload();
        });
    });

    // --- 3. CORE LOGIC: API & CONFIG.JSON ---
    fetch('/config.json').then(res => res.json()).then(config => {
        const colorMap = {};
        const exactNameMap = {};

        if (config.skills) {
            Object.values(config.skills).flat().forEach(s => {
                const lowerKey = s.name.toLowerCase();
                colorMap[lowerKey] = s.color;
                exactNameMap[lowerKey] = s.name;
            });
        }

        // --- SKILLS HOME ---
        const skillsContainer = document.getElementById('dynamic-skills');
        if (skillsContainer && config.skills) {
            skillsContainer.innerHTML = '';
            Object.entries(config.skills).forEach(([category, skills], idx) => {
                let shape = idx === 0 ? '4px' : (idx === 1 ? '50px' : (idx === 2 ? '12px 0 12px 0' : '15px 15px 15px 0'));
                let badges = skills.map(s => `
                    <a href="${s.url}" target="_blank" class="badge skill-badge py-2 px-3 m-1 text-decoration-none" 
                       style="background-color: ${hexToRgba(s.color, 0.15)}; border: 1px solid ${s.color}; color: var(--text-main); border-radius: ${shape};"
                    >${s.name}</a>`).join('');

                let catKey = "";
                if (category.includes("Back-End")) catKey = "cat_backend";
                else if (category.includes("Front-End")) catKey = "cat_frontend";
                else if (category.includes("Database")) catKey = "cat_tools";
                else if (category.includes("Lingue")) catKey = "cat_languages"; // Nuova Rotta

                let transCat = catKey ? t(catKey) : category;

                skillsContainer.innerHTML += `<div class="col-md-6 col-lg-3 mb-4"><h5 class="mb-3" style="color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">// ${transCat}</h5><div class="d-flex flex-wrap">${badges}</div></div>`;
            });
        }

        // --- GITHUB PROJECTS CON CACHE ---
        const githubContainer = document.getElementById('github-projects');
        if (githubContainer && config.whitelisted_repos) {
            const cacheKey = 'github_projects_cache_v2';
            const cachedData = sessionStorage.getItem(cacheKey);

            const renderGithubRepos = (repos) => {
                githubContainer.innerHTML = '';
                repos.forEach(repo => {
                    const uniqueTagsMap = new Map();

                    repo.detectedLangs.forEach(lang => {
                        const lowerKey = lang.toLowerCase();
                        if (!uniqueTagsMap.has(lowerKey)) {
                            uniqueTagsMap.set(lowerKey, exactNameMap[lowerKey] || lang);
                        }
                    });

                    const tagsHTML = Array.from(uniqueTagsMap.values()).map(displayName => {
                        const lowerKey = displayName.toLowerCase();
                        const color = colorMap[lowerKey] || '#888888';
                        const textTransform = exactNameMap[lowerKey] ? 'none' : 'capitalize';

                        return `<span class="badge me-1" style="background-color: ${hexToRgba(color, 0.15)}; border: 1px solid ${color}; color: var(--text-main); font-size: 0.7rem; border-radius: 4px; text-transform: ${textTransform};">${displayName}</span>`;
                    }).join('');

                    githubContainer.innerHTML += `
                        <div class="col-md-6 col-lg-4">
                            <div class="card h-100 card-hover-elevate card-clickable" role="button" tabindex="0" data-repo="${repo.full_name}" data-url="${repo.html_url}" data-name="${repo.name}" data-branch="${repo.branch}">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title mb-3" style="color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${repo.name}</h5>
                                    <p class="card-text text-muted small flex-grow-1">${repo.description || ''}</p>
                                    <div class="mt-3 d-flex flex-wrap gap-1">${tagsHTML}</div>
                                </div>
                            </div>
                        </div>`;
                });
                attachModalEvents();
            };

            if (cachedData) {
                renderGithubRepos(JSON.parse(cachedData));
            } else {
                Promise.all(config.whitelisted_repos.map(repoPath => {
                    return fetch(`https://api.github.com/repos/${repoPath}`).then(r => r.json()).then(repo => {
                        if (repo.message && (repo.message === "Not Found" || repo.message.includes("API rate limit"))) return null;

                        const branch = repo.default_branch || 'main';
                        let detectedLangsMap = new Map();

                        if (repo.language) {
                            detectedLangsMap.set(repo.language.toLowerCase(), repo.language);
                        }

                        if (repo.topics) {
                            repo.topics.forEach(t => {
                                let cleanTopic = t.replace(/-/g, ' ');
                                let key = cleanTopic.toLowerCase();
                                if (!detectedLangsMap.has(key)) {
                                    detectedLangsMap.set(key, cleanTopic);
                                }
                            });
                        }

                        return {
                            full_name: repo.full_name,
                            name: repo.name,
                            html_url: repo.html_url,
                            description: repo.description,
                            branch: branch,
                            detectedLangs: Array.from(detectedLangsMap.values())
                        };
                    }).catch(() => null);
                })).then(results => {
                    const validRepos = results.filter(r => r !== null);
                    if (validRepos.length > 0) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(validRepos));
                        renderGithubRepos(validRepos);
                    } else {
                        githubContainer.innerHTML = `<div class="col-12 text-center py-4"><p class="text-danger">⚠️ ${t('err_github_fetch')}</p></div>`;
                    }
                });
            }
        }

        // --- PROGETTI MANUALI ---
        const manualContainer = document.getElementById('manual-projects');
        if (manualContainer) {
            if (!config.manual_projects || config.manual_projects.length === 0) {
                manualContainer.innerHTML = `<div class="col-12"><p class="text-muted text-center">${t('no_manual_projects')}</p></div>`;
            } else {
                manualContainer.innerHTML = config.manual_projects.map(p => {
                    let tags = p.tags.map(tag => `<span class="badge me-1" style="background-color: ${hexToRgba(tag.color, 0.15)}; border: 1px solid ${tag.color}; color: var(--text-main); font-size: 0.7rem; border-radius: 4px;">${tag.name}</span>`).join('');
                    return `<div class="col-md-6 col-lg-4"><div class="card h-100 card-hover-elevate"><div class="card-body d-flex flex-column">
                        <h5 class="card-title" style="color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${p.name}</h5>
                        <p class="card-text text-muted small flex-grow-1">${p.description}</p>
                        <div class="mb-3">${tags}</div>
                        <a href="${p.url}" target="_blank" class="btn btn-sm btn-custom w-100">${t('btn_view_project')}</a>
                    </div></div></div>`;
                }).join('');
            }
        }
    });

    // --- 4. MODALE README & DOMPURIFY ---
    function attachModalEvents() {
        const modalEl = document.getElementById('projectModal');
        if (!modalEl) return;
        const bsModal = new bootstrap.Modal(modalEl);

        const openModal = (card) => {
            const { repo, name, url, branch } = card.dataset;
            document.getElementById('modalTitle').textContent = name;
            document.getElementById('modalLink').href = url;
            const body = document.getElementById('modalBody');
            body.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div></div>';
            bsModal.show();
            fetch(`https://api.github.com/repos/${repo}/readme`, { headers: { 'Accept': 'application/vnd.github.html' } })
                .then(r => r.text()).then(html => {
                    const cleanHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
                    body.innerHTML = cleanHTML.replace(/href="\/(.*?)"/g, `href="https://github.com/${repo}/blob/${branch}/$1"`)
                        .replace(/src="\/(.*?)"/g, `src="https://raw.githubusercontent.com/${repo}/${branch}/$1"`);
                    body.querySelectorAll('a').forEach(l => l.target = "_blank");
                }).catch(() => {
                    body.innerHTML = '<p class="text-muted text-center py-4">README non trovato o errore di caricamento.</p>';
                });
        };

        document.querySelectorAll('.card-clickable').forEach(card => {
            card.onclick = () => openModal(card);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal(card);
                }
            });
        });
    }

    // --- 5. UI: SCROLL & COOKIES ---
    const navbar = document.querySelector('.navbar');
    const scrollMask = document.getElementById('scrollMask');
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        let top = window.scrollY;
        if (navbar) (top > lastScroll && top > 100) ? navbar.classList.add('navbar-hidden') : navbar.classList.remove('navbar-hidden');
        lastScroll = top;
        if (scrollMask) scrollMask.style.opacity = (window.innerHeight + top >= document.body.offsetHeight - 150) ? '0' : '1';
    }, { passive: true });

    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner && !localStorage.getItem('cookie-accepted')) {
        cookieBanner.style.display = 'flex';
        document.getElementById('closeCookie').onclick = () => {
            localStorage.setItem('cookie-accepted', 'true');
            cookieBanner.style.display = 'none';
        };
    }

    document.body.classList.add('loaded');
});