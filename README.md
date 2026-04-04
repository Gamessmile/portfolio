# 👨‍💻 Portfolio | Santo Alessandro Sciacca

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)

My personal developer portfolio. It is built with a DB-less, JSON-driven architecture, focusing on security, performance, and internationalization.

## 🎯 Architecture & Approach
The main goal of this project was to build a lightweight and maintainable environment without the overhead of a traditional database or an admin dashboard. This approach naturally reduces the attack surface by eliminating authentication vectors.

All dynamic content (skills, languages, manual projects) is centralized in a single `config.json` file, keeping the data separated from the application logic and making updates straightforward.

## ✨ Core Features

* **⚡ DB-Less & JSON Driven:** No database required. The UI and data are generated dynamically from `config.json`.
* **🌍 Multi-language (i18n):** Native support for 9 languages (IT, EN, ES, FR, DE, AR, RU, JA, ZH) with technical cookie persistence.
* **🛡️ Security Measures:** 
   * **Helmet.js** for strict Content Security Policy (CSP).
    * **Rate Limiting** to prevent basic DoS/Brute Force attacks (proxy-safe).
    * **DOMPurify** integrated on the frontend to sanitize GitHub READMEs and prevent XSS vulnerabilities.
    * **GDPR Compliant Logger** with native IP address anonymization (IPv4 and IPv6).
* **🐙 GitHub API Integration:** Instead of fetching all repositories indiscriminately, a whitelist system in the JSON selects specific repositories. It fetches data (descriptions, languages, READMEs) asynchronously and stores them in `sessionStorage` to optimize API rate limits.
* **🎨 Dynamic Theming:** Native support for three themes (Light, Dark, True Black for OLED screens), saved in browser preferences.

## 🚀 How to run locally

1. **Clone the repository:**
   ```
   git clone https://github.com/Gamessmile/portfolio.git
   cd portfolio
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Start the server:**
   ```
   node app.js
   ```
   *The project will be available at `http://localhost:3000`*

## 📁 Project Structure

* `/app.js` - Entry point, Express server setup, security, and i18next configuration.
* `/public/config.json` - Single Source of Truth for dynamic data (skills, projects, whitelist).
* `/public/js/script.js` - Frontend logic, theme management, GitHub API fetching, DOM sanitization.
* `/views/` - EJS templates (index, projects, lab, 404/500 errors).
* `/locales/` - JSON files for the 9 supported languages.

## 👤 Author
**Santo Alessandro Sciacca**
* Computer Science Student @ [UniCT](https://web.dmi.unict.it/corsi/l-31)
* [LinkedIn](https://www.linkedin.com/in/santo-alessandro-sciacca/)
* [GitHub](https://github.com/Gamessmile)