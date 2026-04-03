document.addEventListener('DOMContentLoaded', () => {
    
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

    // Mappatura estensioni -> Linguaggi (per scovare SQL e altro)
    const extensionMap = {
        'sql': 'SQL',
        'java': 'Java',
        'py': 'Python',
        'php': 'PHP',
        'cpp': 'C++',
        'cs': 'C#',
        'js': 'JavaScript',
        'c': 'C'
    };

    // --- 2. UI LOGIC (Tema, Lingua, Scroll) ---
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

    // --- 3. CORE LOGIC: PROGETTI & SKILLS ---
    fetch('/config.json').then(res => res.json()).then(config => {
        const colorMap = {};
        Object.values(config.skills).flat().forEach(s => colorMap[s.name.toLowerCase()] = s.color);

        // Skills Home
        const skillsContainer = document.getElementById('dynamic-skills');
        if (skillsContainer) {
            skillsContainer.innerHTML = '';
            Object.entries(config.skills).forEach(([category, skills], idx) => {
                let shape = idx === 0 ? '4px' : (idx === 1 ? '50px' : '12px 0 12px 0');
                let badges = skills.map(s => `
                    <a href="${s.url}" target="_blank" class="badge py-2 px-3 m-1 text-decoration-none" 
                       style="background-color: ${hexToRgba(s.color, 0.15)}; border: 1px solid ${s.color}; color: var(--text-main); border-radius: ${shape}; transition: 0.2s;"
                       onmouseover="this.style.backgroundColor='${hexToRgba(s.color, 0.3)}'; this.style.transform='translateY(-3px)';" 
                       onmouseout="this.style.backgroundColor='${hexToRgba(s.color, 0.15)}'; this.style.transform='translateY(0)';"
                    >${s.name}</a>`).join('');
                let transCat = window.categoryTranslations?.[category] || category;
                skillsContainer.innerHTML += `<div class="col-md-4 mb-4"><h5 class="mb-3" style="color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">// ${transCat}</h5><div class="d-flex flex-wrap">${badges}</div></div>`;
            });
        }

        // Progetti GitHub con Logic Scan
        const githubContainer = document.getElementById('github-projects');
        if (githubContainer && config.whitelisted_repos) {
            githubContainer.innerHTML = '';
            config.whitelisted_repos.forEach(repoPath => {
                // 1. Fetch Repo Info (inclusi Topics)
                fetch(`https://api.github.com/repos/${repoPath}`).then(r => r.json()).then(repo => {
                    if (repo.message === "Not Found") return;

                    // 2. Fetch File Tree (per scovare estensioni come .sql)
                    const branch = repo.default_branch || 'main';
                    fetch(`https://api.github.com/repos/${repoPath}/git/trees/${branch}?recursive=1`).then(r => r.json()).then(treeData => {
                        
                        let detectedLangs = new Set();
                        
                        // Analisi Topics di GitHub (Figma, UX, ecc)
                        if (repo.topics) repo.topics.forEach(t => detectedLangs.add(t.replace(/-/g, ' ')));

                        // Analisi Estensioni (SQL, Java, ecc)
                        if (treeData.tree) {
                            treeData.tree.forEach(file => {
                                const ext = file.path.split('.').pop().toLowerCase();
                                if (extensionMap[ext]) detectedLangs.add(extensionMap[ext]);
                            });
                        }

                        // Pulizia e Generazione Badge
                        const tagsHTML = Array.from(detectedLangs).map(langName => {
                            const color = colorMap[langName.toLowerCase()] || '#888888';
                            return `<span class="badge me-1" style="background-color: ${hexToRgba(color, 0.15)}; border: 1px solid ${color}; color: var(--text-main); font-size: 0.7rem; border-radius: 4px; text-transform: capitalize;">${langName}</span>`;
                        }).join('');

                        githubContainer.innerHTML += `
                            <div class="col-md-6 col-lg-4">
                                <div class="card h-100 card-hover-elevate card-clickable" data-repo="${repo.full_name}" data-url="${repo.html_url}" data-name="${repo.name}" data-branch="${branch}">
                                    <div class="card-body d-flex flex-column">
                                        <h5 class="card-title mb-3" style="color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${repo.name}</h5>
                                        <p class="card-text text-muted small flex-grow-1">${repo.description || ''}</p>
                                        <div class="mt-3 d-flex flex-wrap gap-1">${tagsHTML}</div>
                                    </div>
                                </div>
                            </div>`;
                        attachModalEvents();
                    });
                });
            });
        }

        // Progetti Manuali
        const manualContainer = document.getElementById('manual-projects');
        if (manualContainer && config.manual_projects) {
            manualContainer.innerHTML = config.manual_projects.map(p => {
                let tags = p.tags.map(t => `<span class="badge me-1" style="background-color: ${hexToRgba(t.color, 0.15)}; border: 1px solid ${t.color}; color: var(--text-main); font-size: 0.7rem; border-radius: 4px;">${t.name}</span>`).join('');
                return `<div class="col-md-6 col-lg-4"><div class="card h-100 card-hover-elevate"><div class="card-body d-flex flex-column">
                    <h5 class="card-title" style="color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${p.name}</h5>
                    <p class="card-text text-muted small flex-grow-1">${p.description}</p>
                    <div class="mb-3">${tags}</div>
                    <a href="${p.url}" target="_blank" class="btn btn-sm btn-custom w-100">${window.categoryTranslations?.btn_view_project || 'Vedi Progetto'}</a>
                </div></div></div>`;
            }).join('');
        }
    });

    // --- 4. MODALE, SCROLL & COOKIE ---
    function attachModalEvents() {
        const modalEl = document.getElementById('projectModal');
        if (!modalEl) return;
        const bsModal = new bootstrap.Modal(modalEl);
        document.querySelectorAll('.card-clickable').forEach(card => {
            card.onclick = () => {
                const { repo, name, url, branch } = card.dataset;
                document.getElementById('modalTitle').textContent = name;
                document.getElementById('modalLink').href = url;
                const body = document.getElementById('modalBody');
                body.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div></div>';
                bsModal.show();
                fetch(`https://api.github.com/repos/${repo}/readme`, { headers: { 'Accept': 'application/vnd.github.html' } })
                    .then(r => r.text()).then(html => {
                        body.innerHTML = html.replace(/href="\/(.*?)"/g, `href="https://github.com/${repo}/blob/${branch}/$1"`)
                                             .replace(/src="\/(.*?)"/g, `src="https://raw.githubusercontent.com/${repo}/${branch}/$1"`);
                        body.querySelectorAll('a').forEach(l => l.target = "_blank");
                    });
            };
        });
    }

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
});