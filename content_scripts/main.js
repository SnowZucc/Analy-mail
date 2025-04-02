// CyberCoach Main Content Script - v2.8
console.log('CyberCoach Main Content Script Loaded - v2.8');

let currentEmailId = null;
let observerControl = null;
const CYBERCOACH_UI_ID = 'cybercoach-analysis-container';
const LOADER_ID = 'cybercoach-loading-indicator';
const RESHOW_BTN_ID = 'cybercoach-reshow-button';
let isAnalyzing = false;
let analysisTimeoutId = null;
let initTimeout = null;
let currentPlatform = null;
let lastAnalysisResult = null; // Will store the full result object from performScoring
let currentLoaderRef = null;
let currentUIRef = null;
let currentReshowBtnRef = null;
const ARTIFICIAL_DELAY_MS = 1500;

const SCORE_WEIGHTS = { SENDER: 40, LINKS: 25, CONTENT: 25, STRUCTURE: 10 }; // New weights + structure

// Replace existing keyword constants with these expanded ones in main.js

const KEYWORDS_SUSPICIOUS = {
    en: [
        // General Phishing & Verification
        'verify', 'confirm', 'account', 'password', 'login', 'username', 'credentials', 'validate', 'authenticate',
        'security', 'suspended', 'locked', 'unusual activity', 'unusual sign-in', 'access', 'security alert', 'problem', 'issue',
        'verify your email', 'update your information', 'reactivate', 'disabled', 'compromised', 'policy violation',
        // Financial & Payment
        'credit card', 'bank', 'payment', 'invoice', 'refund', 'unpaid', 'overdue', 'billing', 'statement', 'charge',
        'wire transfer', 'remittance', 'receipt', 'transaction', 'financial', 'funds', 'deposit',
        // Prize, Gift & Lottery Scams
        'congratulations', 'winner', 'won', 'prize', 'claim', 'selected', 'reward', 'gift card', 'voucher', 'coupon',
        'free', 'gift', 'mystery box', 'giveaway', 'lottery', 'sweepstakes', 'inheritance', 'compensation',
        // Delivery & Shopping Scams
        'delivery', 'package', 'shipping', 'tracking', 'order', 'shipment', 'customs fee', 'address confirmation', 'failed delivery',
        // Urgency (Overlap with URGENT list, but also suspicious in context)
        'urgent action', 'immediate attention', 'account closure', 'service termination',
        // Job & Investment Scams
        'opportunity', 'investment', 'high returns', 'guaranteed profit', 'bitcoin', 'crypto', 'get rich', 'work from home',
        'job offer', 'interview', 'secret shopper',
        // Technical Support Scams
        'virus detected', 'malware', 'computer infected', 'technical support', 'call microsoft', // Often combined with fake numbers
        // Charity & Donation Scams (often follow disasters)
        'donation', 'charity', 'help needed', 'disaster relief', 'support us',
        // Other Common Tactics
        'confidential', 'ssn', 'social security', 'passport', 'driver\'s license', 'customer survey', 'feedback required'
    ],
    fr: [
        // Général & Vérification
        'vérifier', 'confirmer', 'compte', 'mot de passe', 'connexion', 'identifiant', 'validation', 'authentification',
        'sécurité', 'suspendu', 'bloqué', 'activité inhabituelle', 'connexion inhabituelle', 'accès', 'alerte sécurité', 'problème',
        'vérifiez votre email', 'mettez à jour', 'réactiver', 'désactivé', 'compromis', 'violation politique',
        // Financier & Paiement
        'carte de crédit', 'bancaire', 'paiement', 'facture', 'remboursement', 'impayé', 'retard', 'facturation', 'relevé', 'frais',
        'virement bancaire', 'versement', 'reçu', 'transaction', 'financier', 'fonds', 'dépôt',
        // Prix, Cadeaux & Loterie
        'félicitations', 'gagnant', 'remporté', 'prix', 'réclamer', 'sélectionné', 'récompense', 'carte cadeau', 'bon d\'achat', 'coupon',
        'gratuit', 'cadeau', 'boîte mystère', 'concours', 'loterie', 'tirage au sort', 'héritage', 'compensation', 'indemnisation',
        // Livraison & Achats
        'livraison', 'colis', 'expédition', 'suivi', 'commande', 'envoi', 'frais de douane', 'confirmation adresse', 'livraison échouée',
        // Urgence (Chevauchement avec liste URGENT)
        'action urgente', 'attention immédiate', 'clôture de compte', 'résiliation service',
        // Emploi & Investissement
        'opportunité', 'investissement', 'rendement élevé', 'profit garanti', 'bitcoin', 'crypto', 'devenir riche', 'travail à domicile',
        'offre d\'emploi', 'entretien', 'client mystère',
        // Support Technique
        'virus détecté', 'malware', 'ordinateur infecté', 'support technique', 'appelez microsoft',
        // Charité & Dons
        'donation', 'charité', 'aide requise', 'secours catastrophe', 'soutenez-nous',
        // Autres Tactiques
        'confidentiel', 'numéro sécurité sociale', 'passeport', 'permis conduire', 'enquête client', 'avis requis', 'sondage'
    ]
};

const KEYWORDS_URGENT = {
    en: [
        'urgent', 'immediately', 'now', 'critical', 'important', 'action required', 'final notice', 'today only', 'last chance',
        'expires', 'expiring soon', 'warning', 'alert', 'response needed', 'limited time', 'don\'t delay', 'act now',
        'final warning', 'immediate action', 'account closure imminent'
    ],
    fr: [
        'urgent', 'immédiatement', 'maintenant', 'critique', 'important', 'action requise', 'dernier avis', "aujourd'hui seulement", 'dernière chance',
        'expire', 'expire bientôt', 'avertissement', 'alerte', 'réponse nécessaire', 'temps limité', 'ne tardez pas', 'agissez maintenant',
        'dernier avertissement', 'action immédiate', 'clôture compte imminente'
    ]
};

const KEYWORDS_SENSITIVE_REQUEST = {
    en: [
        'password', 'credit card', 'ssn', 'social security', 'bank account', 'login details', 'update billing', 'confirm identity',
        'personal information', 'date of birth', 'mother\'s maiden name', 'security questions', 'pin code', 'cvv', 'full card number',
        'copy of id', 'photo id', 'driver\'s license number', 'passport number', 'tax id'
    ],
    fr: [
        'mot de passe', 'carte de crédit', 'numéro de sécurité sociale', 'compte bancaire', 'identifiants', 'facturation', 'confirmer identité',
        'informations personnelles', 'date de naissance', 'nom jeune fille mère', 'questions de sécurité', 'code pin', 'cvv', 'numéro carte complet',
        'copie pièce identité', 'photo identité', 'numéro permis conduire', 'numéro passeport', 'numéro fiscal'
    ]
};

// Keep other constants (DOMAIN_KEYWORDS_SUSPICIOUS, GENERIC_GREETINGS, etc.) as they were in v2.8
const DOMAIN_KEYWORDS_SUSPICIOUS = ['login', 'signin', 'verify', 'update', 'confirm', 'secure', 'admin', 'account', 'billing', 'payment', 'recovery', 'reset', 'support', 'service', 'mail', 'office', 'live', 'portal', 'client', 'webaccess', 'validation', 'authentication'];

const GENERIC_GREETINGS = ['dear customer', 'dear user', 'dear client', 'dear valued customer', 'hello,', 'greetings,', 'dear sir/madam', 'cher client', 'cher utilisateur', 'bonjour,', 'salutations'];
const SHORTENER_DOMAINS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'bit.do',
    'shorturl.at', 'rebrand.ly', 'cutt.ly', 'cutt.us', 't.ly', 'lnkd.in', 'soo.gd', 'tiny.cc',
    'rb.gy', 'lc.chat', 'shorte.st', 'cutt.us', 'urlz.fr', 'qr.ae', 'adfoc.us', 'shrtco.de', 'tr.im',
    'plu.sh', 'mcaf.ee'
];
const SUSPICIOUS_TLDS = [
    '.zip', '.mov', '.xyz', '.top', '.club', '.site', '.online', '.live', '.icu', '.work', '.click',
    '.link', '.info', '.biz', '.gdn', '.loan', '.review', '.stream', '.download', '.xin', '.kim',
    '.men', '.date', '.faith', '.accountant', '.pw', '.tk', '.cf', '.ga', '.gq', '.ml', '.cam',
    '.lol', '.pics', '.mom', '.uno', '.monster', '.rest', '.bar', '.forsale', '.beauty', '.hair',
    '.skin', '.makeup', '.quest', '.vodka', '.desi', '.study', '.help', '.game', '.fun'
];
const GENERIC_EMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'aol.com', 'msn.com',
    'ymail.com', 'mail.com', 'gmx.com', 'gmx.us', 'gmx.co.uk', 'icloud.com', 'me.com', 'mac.com',
    'mail.ru', 'yandex.ru', 'yandex.com', 'zoho.com', 'protonmail.com', 'pm.me', 'tutanota.com', 'laposte.net', 'orange.fr', 'free.fr', 'sfr.fr'
];

// In main.js, update this constant:
const KNOWN_SAFE_DOMAINS = [
    'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com', 'linkedin.com', 'isep.fr',
    'garageisep.com', 'youtube.com', 'wikipedia.org', 'twitter.com', 'instagram.com', 'paypal.com',
    'dropbox.com', 'github.com', 'slack.com', 'netflix.com', 'spotify.com', 'airbnb.com', 'uber.com',
    'lyft.com', 'discord.com', // Add more globally recognized services as needed
    // Potentially add major banks if targeting specific regions, but be cautious
    'mail.google.com', // Explicitly add common mail subdomains just in case
    'mail.yahoo.com',
    'mail.protonmail.com'
];

const KNOWN_REDIRECTORS = {
    'google.com': 'q', 'google.co.uk': 'q', 'google.fr': 'q',
    'googleadservices.com': 'adurl', 'youtube.com': 'q', 'googleusercontent.com': null,
    'gstatic.com': null, 'safelinks.protection.outlook.com': 'url', 'clicktracking.': null,
    'mandrillapp.com': 'url', 'mailchi.mp': null, 'sendgrid.net': null,
    '*.hubspot.com': 'url', '*.mktoweb.com': null
};
const GENERIC_CLOUD_HOSTING_DOMAINS = [
    'storage.googleapis.com', '.s3.amazonaws.com', '.blob.core.windows.net',
    'dropbox.com', 'drive.google.com', 'sharepoint.com', 'onedrive.live.com',
    '1drv.ms', 'box.com', 'mega.nz', 'mega.io', 'mediafire.com', 'wetransfer.com',
    'transfer.sh', 'ipfs.io', '.web.app', '.firebaseapp.com', 'sites.google.com'
];
const ACTIVELY_RISKY_FILE_EXTENSIONS = [ // Executable or script-like
    '.html', '.htm', '.shtml', '.js', '.hta', '.wsf', '.vbs', '.jse', '.exe', '.scr', '.com', '.pif',
    '.bat', '.cmd', '.ps1', '.jar', '.lnk', '.iso', '.img', '.dmg', '.apk', '.svg', '.mht'
];
const POTENTIALLY_RISKY_FILE_EXTENSIONS = ['.pdf', '.doc', '.xls', '.ppt', '.zip', '.rar', '.7z']; // Can contain malware/links
const MACRO_ENABLED_EXTENSIONS = ['.docm', '.xlsm', '.pptm']; // High risk

const ICONS = {
    check: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`,
    expandMore: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/></svg>`,
    expandLess: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"/></svg>`,
    tipSecure: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#1e8e3e"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z"/></svg>`,
    tipModerate: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#f9ab00"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>`,
    tipDanger: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#d93025"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z"/></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            try { func.apply(context, args); }
            catch (e) { console.error("CyberCoach: Error in debounced callback:", e); }
        }, wait);
    };
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/'/g, "'");
}

function highlightReason(reason) {
    const escaped = escapeHtml(reason);
    if (escaped.includes('<mark>')) { return escaped; }
    const keywordsToMark = [
        'suspect', 'différent', 'mismatch', 'malveillant', 'non-HTTPS', 'erreur', 'ip:', 'raccourci', 'shortener',
        'danger', 'invalide', 'sensible', 'sensitive', 'générique', 'generic', 'urgent', 'pression', 'pressure',
        'obfuscation', 'masqué', 'hidden', 'spoofed', 'compromis', 'compromised', 'redirection', 'tracking', 'cloud', 'hébergé',
        'fragment', 'cohérence', 'consistency', 'structure', 'anomalie', 'image-only', 'copier/coller', 'copy/paste'
    ];
    let highlighted = escaped;
    keywordsToMark.forEach(kw => {
        const regex = new RegExp(`(?<!\\w)(${kw})(?!\\w|[\\-_\\.])`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
}

function removeUI() {
    if (currentUIRef) {
        currentUIRef.remove();
        currentUIRef = null;
    }
    const existingUI = document.getElementById(CYBERCOACH_UI_ID);
    if (existingUI) existingUI.remove();
}

function removeLoading() {
    if (currentLoaderRef) {
        currentLoaderRef.classList.remove('visible');
        currentLoaderRef.addEventListener('transitionend', () => {
            currentLoaderRef?.remove();
            currentLoaderRef = null;
        }, { once: true });
         setTimeout(() => { if (currentLoaderRef) { currentLoaderRef.remove(); currentLoaderRef = null; } }, 300);
    } else {
        const existingLoader = document.getElementById(LOADER_ID);
        if (existingLoader) existingLoader.remove();
        currentLoaderRef = null;
    }
}

function hideLoadingIndicator() { removeLoading(); }

function removeReShowButton() {
    if (currentReshowBtnRef) {
        currentReshowBtnRef.classList.remove('visible');
        currentReshowBtnRef.addEventListener('transitionend', () => {
            currentReshowBtnRef?.remove();
            currentReshowBtnRef = null;
        }, { once: true });
         setTimeout(() => { if (currentReshowBtnRef) { currentReshowBtnRef.remove(); currentReshowBtnRef = null; } }, 300);
    } else {
        const existingBtn = document.getElementById(RESHOW_BTN_ID);
        if (existingBtn) existingBtn.remove();
        currentReshowBtnRef = null;
    }
}

function addReShowButton() {
    removeReShowButton(); // Ensure no duplicates
    const analysisData = lastAnalysisResult; // Capture the current value

    if (!analysisData || typeof analysisData.finalClampedScore === 'undefined') {
        console.error("addReShowButton called but lastAnalysisResult is invalid:", analysisData);
        return; // Cannot re-show if no valid result stored
    }
    console.log("addReShowButton: Storing result with score:", analysisData.finalClampedScore);

    const reshowBtn = document.createElement('button');
    reshowBtn.id = RESHOW_BTN_ID;
    reshowBtn.setAttribute('aria-label', 'Réafficher l\'analyse CyberCoach');
    reshowBtn.innerHTML = ICONS.shield;
    reshowBtn.title = 'Réafficher l\'analyse';

    reshowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Reshow button clicked. Attempting to use stored data:", analysisData);
        if (analysisData && typeof analysisData.finalClampedScore !== 'undefined') {
            // Use the captured analysisData from the outer scope
            displayUI(analysisData.finalClampedScore, analysisData);
            removeReShowButton(); // Remove the button itself after click
        } else {
            console.error("Reshow button clicked, but stored analysisData was invalid!");
        }
    });

    document.body.appendChild(reshowBtn);
    currentReshowBtnRef = reshowBtn;

    requestAnimationFrame(() => {
        setTimeout(() => { if (currentReshowBtnRef) currentReshowBtnRef.classList.add('visible'); }, 10);
    });
}

function showLoadingIndicator() {
    removeLoading(); removeUI(); removeReShowButton();
    const loader = document.createElement('div');
    loader.id = LOADER_ID;
    loader.innerHTML = `<div class="cc-spinner"></div> Analyse en cours...`;
    document.body.appendChild(loader);
    currentLoaderRef = loader;
    requestAnimationFrame(() => { setTimeout(() => { if (currentLoaderRef) currentLoaderRef.classList.add('visible'); }, 10); });
}

function displayUI(score, results) {
    console.log("displayUI called with score:", score, "and results:", results);
    removeUI(); removeReShowButton(); hideLoadingIndicator();

    // *** CRITICAL: Set the global lastAnalysisResult HERE ***
    // Ensure it contains the score and all other details needed by addReShowButton
    lastAnalysisResult = { ...results, finalClampedScore: score };
    console.log("displayUI: Updated lastAnalysisResult:", lastAnalysisResult);


    let statusText = '', statusClass = '', iconSvg = '', tips = [], tipIconSvg = '';
    const SCORE_THRESHOLD_MODERATE = 40;
    const SCORE_THRESHOLD_DANGER = 60;

    if (score < SCORE_THRESHOLD_MODERATE) {
        statusText = 'Faible risque détecté'; statusClass = 'secure'; iconSvg = ICONS.check;
        tips = ["Email semble peu risqué.", "Vérifiez toujours l'expéditeur.", "Attention aux pièces jointes.", ]; tipIconSvg = ICONS.tipSecure;
    } else if (score < SCORE_THRESHOLD_DANGER) {
        statusText = 'Prudence Requise'; statusClass = 'moderate'; iconSvg = ICONS.warning;
        tips = ["Éléments suspects détectés.", "Examinez bien expéditeur et liens.", "Ne cliquez pas en cas de doute.", "Contactez l'expéditeur autrement si nécessaire.",]; tipIconSvg = ICONS.tipModerate;
    } else {
        statusText = 'Danger Potentiel Élevé'; statusClass = 'danger'; iconSvg = ICONS.error;
        tips = ["Risque élevé d'hameçonnage!", "Ne cliquez sur AUCUN lien.", "Ne répondez PAS.", "Signalez comme phishing/spam.", "Supprimez l'email."]; tipIconSvg = ICONS.tipDanger;
    }

    const uiContainer = document.createElement('div');
    uiContainer.id = CYBERCOACH_UI_ID;
    uiContainer.classList.add(statusClass);

    let foundKeywordsHtml = '';
    const { foundKeywords } = results;
    if (foundKeywords && (foundKeywords.suspicious?.length || foundKeywords.urgent?.length || foundKeywords.sensitive?.length)) {
        foundKeywordsHtml += `<div class="cc-detail-item"><strong>Mots-clés détectés :</strong><ul>`;
        if (foundKeywords.suspicious?.length) foundKeywordsHtml += `<li><mark>Suspects:</mark> ${foundKeywords.suspicious.map(escapeHtml).join(', ')}</li>`;
        if (foundKeywords.urgent?.length) foundKeywordsHtml += `<li><mark>Urgence:</mark> ${foundKeywords.urgent.map(escapeHtml).join(', ')}</li>`;
        if (foundKeywords.sensitive?.length) foundKeywordsHtml += `<li><mark>Sensibles:</mark> ${foundKeywords.sensitive.map(escapeHtml).join(', ')}</li>`;
        foundKeywordsHtml += `</ul></div>`;
    }

    uiContainer.innerHTML = `
        <button class="cc-close-button" aria-label="Fermer">${ICONS.close}</button>
        <div class="cc-header">
            <div class="cc-status-icon">${iconSvg}</div>
            <div class="cc-header-text">
                <div class="cc-status-title">${escapeHtml(statusText)}</div>
                <div class="cc-score-display">${score}<span>/100</span></div>
            </div>
        </div>
        <div class="cc-tips-section">
            <strong>Conseils Rapides :</strong>
            <ul>${tips.slice(0, 2).map(t => `<li>${tipIconSvg}${escapeHtml(t)}</li>`).join('')}</ul>
        </div>
        <button class="cc-expand-button" aria-expanded="false">Voir l'analyse détaillée ${ICONS.expandMore}</button>
        <div class="cc-details-wrapper">
          <div class="cc-details-content">
             <div class="cc-detail-item"><strong>Analyse Expéditeur (${results.senderScore.toFixed(0)}/${SCORE_WEIGHTS.SENDER}) :</strong><ul>${results.senderReasons.map(r => `<li>${highlightReason(r)}</li>`).join('')}</ul></div>
             <div class="cc-detail-item"><strong>Analyse Liens (${results.linkScore.toFixed(0)}/${SCORE_WEIGHTS.LINKS}) :</strong><ul>${results.linkReasons.map(r => `<li>${highlightReason(r)}</li>`).join('')}</ul></div>
             <div class="cc-detail-item"><strong>Analyse Contenu (${results.contentScore.toFixed(0)}/${SCORE_WEIGHTS.CONTENT}) :</strong><ul>${results.contentReasons.map(r => `<li>${highlightReason(r)}</li>`).join('')}</ul></div>
             <div class="cc-detail-item"><strong>Analyse Structure (${results.structureScore.toFixed(0)}/${SCORE_WEIGHTS.STRUCTURE}) :</strong><ul>${results.structureReasons.map(r => `<li>${highlightReason(r)}</li>`).join('')}</ul></div>
             ${foundKeywordsHtml}
          </div>
        </div>`;

    currentUIRef = uiContainer;

    const expandButton = uiContainer.querySelector('.cc-expand-button');
    const detailsWrapper = uiContainer.querySelector('.cc-details-wrapper');
    const closeButton = uiContainer.querySelector('.cc-close-button');

    if (expandButton && detailsWrapper) {
        expandButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = detailsWrapper.classList.toggle('visible');
            expandButton.classList.toggle('expanded');
            expandButton.setAttribute('aria-expanded', String(isVisible));
            expandButton.innerHTML = `${isVisible ? 'Masquer les détails' : 'Voir l\'analyse détaillée'} ${isVisible ? ICONS.expandLess : ICONS.expandMore}`;
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Close button listener triggered. Current lastAnalysisResult:", lastAnalysisResult);
            removeUI();
            // Directly call addReShowButton - it will use the globally scoped lastAnalysisResult
            addReShowButton();
        });
    } else {
        console.error("Could not find the close button element in displayUI!");
    }

    document.body.appendChild(uiContainer);

    requestAnimationFrame(() => { setTimeout(() => { if (currentUIRef) currentUIRef.classList.add('visible'); }, 10); });
}

function findKeywords(text, keywordList) {
    const found = [];
    if (!text || !keywordList) return found;
    const lowerText = text.toLowerCase();
    keywordList.forEach(k => {
        const regex = new RegExp(`\\b${k.toLowerCase()}\\b`, 'g');
        if (regex.test(lowerText)) { found.push(k); }
    });
    return found;
}

function performScoring(emailData) {
    console.log("[Debug] Received Sender String:", emailData.sender); // <-- ADD THIS LINE

    let senderScore = 0, linkScore = 0, contentScore = 0, structureScore = 0; // Added structureScore
    let senderReasons = [], linkReasons = [], contentReasons = [], structureReasons = []; // Added structureReasons
    let foundKeywords = { suspicious: [], urgent: [], sensitive: [] };
    let senderEmail = '', senderDomain = '';
    let totalLinksAnalyzed = 0, suspiciousLinkCount = 0;

    const { sender, subject, links, bodyText, bodyHtml } = emailData;
    const lowerBody = bodyText?.toLowerCase() || '';
    const lowerSubject = subject?.toLowerCase() || '';
    const detectedLang = lowerBody.match(/[àéèêâçùîïôû]/) || lowerSubject.match(/[àéèêâçùîïôû]/) ? 'fr' : 'en';

    // --- 1. Sender Analysis (Refined Heuristics) ---
    try {
        const emailRegex = /(?:["']?(.*?)["']?\s*)?<*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>*/;
        const senderMatch = sender?.match(emailRegex);
        let senderName = '';

        if (senderMatch && senderMatch[2]) {
            senderEmail = senderMatch[2].toLowerCase();
            senderDomain = senderEmail.split('@')[1];
            senderName = senderMatch[1] ? senderMatch[1].trim() : '';
            senderReasons.push(`Expéditeur: ${senderName ? `${senderName} <${senderEmail}>` : senderEmail}`);

            const isKnownSafe = KNOWN_SAFE_DOMAINS.some(safeDomain => senderDomain === safeDomain || senderDomain.endsWith('.' + safeDomain));
            const isGenericProvider = GENERIC_EMAIL_DOMAINS.includes(senderDomain);
            const domainParts = senderDomain.split('.');
            const tld = domainParts[domainParts.length - 1];
            const secondLevelDomain = domainParts.length > 1 ? domainParts[domainParts.length - 2] : ''; // e.g., 'github' in 'noreply.github.com'
            const commonTLD = ['com', 'org', 'net', 'co', 'io', 'fr', 'uk', 'de', 'ca', 'app'].includes(tld);

            // Check 1: Known Safe Domain (Highest Trust)
            if (isKnownSafe) {
                senderScore -= 15; // Keep bonus
                senderReasons.push("Domaine expéditeur fiable connu.");
            }
            // Check 2: Generic Provider (Suspicious if content implies official sender)
            else if (isGenericProvider) {
                senderScore += 15; senderReasons.push("<mark>Domaine expéditeur générique</mark> (gmail, outlook, etc.).");
                if (findKeywords(lowerSubject + lowerBody, KEYWORDS_URGENT[detectedLang]).length > 0 || findKeywords(lowerSubject + lowerBody, KEYWORDS_SENSITIVE_REQUEST[detectedLang]).length > 0) {
                    senderScore += 15; senderReasons.push("<mark>Domaine générique + contenu urgent/sensible = Très suspect</mark>");
                }
            }
            // Check 3: Structure & Suspicious Keywords (Only if NOT Known Safe)
            else {
                // Penalize excessive subdomains more harshly if TLD is uncommon
                if (domainParts.length > 4) {
                        senderScore += commonTLD ? 6 : 10; // Higher penalty for uncommon TLD
                        senderReasons.push(`<mark>Structure domaine suspecte</mark> (trop de sous-domaines: ${domainParts.length}).`);
                } else if (domainParts.length > 3) {
                        senderScore += commonTLD ? 3 : 5;
                        senderReasons.push("Structure domaine avec plusieurs sous-domaines.");
                }

                // Check for suspicious keywords in the second-level domain (e.g., 'paypal-secure')
                if (secondLevelDomain && DOMAIN_KEYWORDS_SUSPICIOUS.some(kw => secondLevelDomain.includes(kw))) {
                        // Avoid penalizing legitimate service names like 'service-clients' if it's a common structure
                        const commonServiceSubdomain = ['mail', 'email', 'support', 'service', 'help', 'secure', 'account', 'accounts'].includes(domainParts[0]);
                        if (!(commonServiceSubdomain && commonTLD)) { // Apply penalty unless it looks like common_subdomain.something.common_tld
                            senderScore += 12;
                            senderReasons.push(`<mark>Mot-clé suspect ('${secondLevelDomain}') dans le nom de domaine principal.</mark>`);
                        }
                }
                // Penalize numbers in second-level domain
                    if (/\d/.test(secondLevelDomain)) {
                        senderScore += 6; senderReasons.push("Chiffres présents dans le nom de domaine principal.");
                    }
            }

            // Check 4: Display Name Mismatch (Apply regardless of domain)
            if (senderName && senderName.length > 1 && senderEmail) {
                const nameParts = senderName.toLowerCase().split(' ');
                const emailUserPart = senderEmail.split('@')[0];
                const emailDomainPart = senderDomain.split('.')[0];
                let nameMismatch = false;
                for (const part of nameParts) { if (part.length > 2 && !emailUserPart.includes(part) && !emailDomainPart.includes(part) && !['support', 'service', 'team', 'équipe', 'info', 'contact', 'noreply', 'no-reply', 'service', 'client', 'customer'].includes(part)) { nameMismatch = true; break; } }
                if (nameMismatch) { senderScore += 15; senderReasons.push(`<mark>Nom affiché ("${senderName}") semble différent de l'adresse email</mark> (${senderEmail}). Risque d'usurpation.`); }
                else if (senderName === senderEmail) { senderScore += 3; senderReasons.push(`Nom affiché est l'adresse email elle-même.`); }
            }

                // Check 5: Noreply address (Only penalize if NOT known safe)
                if ((senderEmail.startsWith('noreply@') || senderEmail.startsWith('no-reply@')) && !isKnownSafe ) {
                    if (findKeywords(lowerSubject + lowerBody, KEYWORDS_URGENT[detectedLang]).length > 0) {
                        senderScore += 8; senderReasons.push(`<mark>Adresse "no-reply" (domaine non vérifié) + contenu urgent = suspect.</mark>`);
                    } else {
                        senderScore += 3; // Small penalty for noreply on unknown domain
                        senderReasons.push(`Adresse de type "no-reply" (domaine non vérifié).`);
                    }
                }

        } else {
            // Invalid sender format - keep high penalty
            senderScore += 30; senderReasons.push(`<mark>Format expéditeur invalide ou non reconnu.</mark>`);
        }
    } catch (e) { console.error("Sender Scoring Error:", e); senderScore += 10; senderReasons.push("Erreur technique analyse expéditeur."); }

    // --- 2. Link Analysis ---
    try {
        const analyzedTargets = {};
        const SCORE_REDIRECTOR = 12; // Reduced
        const SCORE_CLOUD_HOSTED_ACTIVE_RISKY_FILE = 25; // High for active files
        const SCORE_CLOUD_HOSTED_MACRO_FILE = 15;      // Medium-High for macro docs
        const SCORE_CLOUD_HOSTED_POTENTIAL_RISKY_FILE = 5; // Low for PDF/ZIP etc.
        const SCORE_SUSPICIOUS_FRAGMENT = 8;
        const SCORE_IP_LINK = 20;
        const SCORE_MISMATCH = 15;
        const SCORE_SHORTENER = 10;
        const SCORE_SUSPICIOUS_TLD = 12;
        const SCORE_SUSPICIOUS_PATH_KW = 6;
        const SCORE_SUSPICIOUS_PARAMS = 8;
        const SCORE_NON_HTTPS = 4;
        const SCORE_EXCESSIVE_LENGTH = 3;
        const SCORE_GENERIC_TEXT_SUSPICIOUS_TARGET = 12;
        const SCORE_DOMAIN_STRUCTURE_ANOMALY = 7;
        const SCORE_LINK_INCONSISTENCY = 15; // Reduced slightly

        const ipRegex = /^(?:https?:\/\/)?(?:[0-9]{1,3}\.){3}[0-9]{1,3}(\/.*)?$/;
        const queryParamRegex = /[?&](?:token|key|auth|session|user|usr|login|id|email|data)=/i;
        const suspiciousPathRegex = /\/(?:login|signin|verify|update|confirm|secure|admin|account|billing|payment|recovery|reset)\b/i;
        const base64FragmentRegex = /#[^?&]{15,}[=]{0,2}$/;

        links?.forEach(link => {
            totalLinksAnalyzed++;
            const originalUrl = link.url;
            const text = link.text ? link.text.trim() : '';
            let linkRiskScore = 0;
            let isHighlySuspicious = false;
            let urlToAnalyze = originalUrl;
            let redirectionReasonAdded = false;
            let finalTargetDomain = null;

            try {
                if (!originalUrl || (!originalUrl.startsWith('http:') && !originalUrl.startsWith('https:'))) return;
                let originalUrlObj = new URL(originalUrl);
                let originalDomain = originalUrlObj.hostname.toLowerCase().replace(/^www\./, '');

                let resolvedTargetUrl = null;
                for (const redirectorDomain in KNOWN_REDIRECTORS) {
                     const isWildcard = redirectorDomain.startsWith('*.');
                     const baseRedirectorDomain = isWildcard ? redirectorDomain.substring(1) : redirectorDomain;
                     if ((isWildcard && originalDomain.endsWith(baseRedirectorDomain)) || (!isWildcard && originalDomain === baseRedirectorDomain) || (redirectorDomain.endsWith('.') && originalDomain.startsWith(redirectorDomain))) {
                        const paramName = KNOWN_REDIRECTORS[redirectorDomain];
                        if (paramName) {
                            const params = new URLSearchParams(originalUrlObj.search);
                            const target = params.get(paramName);
                            if (target && (target.startsWith('http:') || target.startsWith('https:'))) {
                                resolvedTargetUrl = target; linkRiskScore += SCORE_REDIRECTOR; linkReasons.push(`<mark>Redirection détectée:</mark> via ${escapeHtml(originalDomain)}`); redirectionReasonAdded = true; break;
                            }
                        } else if (paramName === null) { linkRiskScore += 5; linkReasons.push(`Utilisation d'un service de tracking/redirection connu: ${escapeHtml(originalDomain)}`); redirectionReasonAdded = true; break; }
                    }
                }
                if (resolvedTargetUrl) { urlToAnalyze = resolvedTargetUrl; linkReasons.push(` -> Cible analysée: ${escapeHtml(urlToAnalyze.substring(0, 60))}...`); }
                else { urlToAnalyze = originalUrl; }

                let urlObj, domain, path, query, fragment;
                 try { urlObj = new URL(urlToAnalyze); domain = urlObj.hostname.toLowerCase().replace(/^www\./, ''); path = urlObj.pathname.toLowerCase(); query = urlObj.search.toLowerCase(); fragment = urlObj.hash; finalTargetDomain = domain; }
                 catch(urlError){ linkRiskScore += 5; linkReasons.push(`URL (ou cible de redirection) invalide: ${escapeHtml(urlToAnalyze.substring(0,60))}...`); linkScore += Math.max(linkRiskScore, 3); return; }

                const lowerPath = path.toLowerCase();
                const matchesCloudDomain = GENERIC_CLOUD_HOSTING_DOMAINS.some(cloudDomain => cloudDomain.startsWith('.') ? domain.endsWith(cloudDomain) : domain === cloudDomain);
                if (matchesCloudDomain) {
                    const fileExt = lowerPath.substring(lowerPath.lastIndexOf('.'));
                    if (ACTIVELY_RISKY_FILE_EXTENSIONS.includes(fileExt)) {
                        linkRiskScore += SCORE_CLOUD_HOSTED_ACTIVE_RISKY_FILE; isHighlySuspicious = true; linkReasons.push(`<mark>Fichier actif/script (${fileExt}) hébergé sur plateforme cloud générique (${escapeHtml(domain)})</mark>`);
                    } else if (MACRO_ENABLED_EXTENSIONS.includes(fileExt)) {
                         linkRiskScore += SCORE_CLOUD_HOSTED_MACRO_FILE; isHighlySuspicious = true; linkReasons.push(`<mark>Document Office avec macros (${fileExt}) hébergé sur plateforme cloud générique (${escapeHtml(domain)})</mark>`);
                    } else if (POTENTIALLY_RISKY_FILE_EXTENSIONS.includes(fileExt)) {
                         linkRiskScore += SCORE_CLOUD_HOSTED_POTENTIAL_RISKY_FILE; linkReasons.push(`Fichier potentiellement risqué (${fileExt}) hébergé sur plateforme cloud générique (${escapeHtml(domain)})`);
                    }
                    if (domain === 'dropbox.com' && (lowerPath.startsWith('/s/') || lowerPath.startsWith('/sh/'))) { linkRiskScore += 3; } // Reduced extra penalty
                }

                 if (ipRegex.test(domain)) { linkRiskScore += SCORE_IP_LINK; isHighlySuspicious = true; linkReasons.push(`<mark>Cible est une adresse IP:</mark> ${escapeHtml(domain)}`); }
                 if (text && text.length > 3 && !text.startsWith('http') && !ipRegex.test(text)) {
                     const textDomainMatch = text.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
                     if (textDomainMatch) {
                         const textDomain = textDomainMatch[0].toLowerCase().replace(/^www\./, '');
                         if (domain !== textDomain && !domain.endsWith('.' + textDomain) && !textDomain.endsWith('.' + domain)) { linkRiskScore += SCORE_MISMATCH; isHighlySuspicious = true; linkReasons.push(`<mark>Texte lien ("${escapeHtml(text.substring(0,25))}...") != Domaine cible final (${escapeHtml(domain)})</mark>`); }
                     } else if (['click here', 'update', 'verify', 'login', 'view details', 'access account', 'cliquez ici', 'mettre à jour', 'vérifier', 'connexion', 'voir détails'].includes(text.toLowerCase())) {
                         if (SHORTENER_DOMAINS.some(sd => domain.endsWith(sd)) || SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld)) || ipRegex.test(domain) || urlObj.protocol !== 'https:') { linkRiskScore += SCORE_GENERIC_TEXT_SUSPICIOUS_TARGET; isHighlySuspicious = true; linkReasons.push(`<mark>Texte générique ("${escapeHtml(text)}") + Cible suspecte (${escapeHtml(domain)})</mark>`); }
                     }
                 }
                 if (SHORTENER_DOMAINS.some(sd => domain.endsWith(sd))) { linkRiskScore += SCORE_SHORTENER; linkReasons.push(`Lien raccourci utilisé pour la cible: ${escapeHtml(domain)}`); }
                 if (SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))) { linkRiskScore += SCORE_SUSPICIOUS_TLD; isHighlySuspicious = true; linkReasons.push(`<mark>TLD (extension domaine) suspect sur la cible:</mark> ${escapeHtml(domain.substring(domain.lastIndexOf('.')))}`); }
                 const domainParts = domain.split('.');
                 if (domainParts.length > 4) { linkRiskScore += SCORE_DOMAIN_STRUCTURE_ANOMALY; isHighlySuspicious = true; linkReasons.push(`<mark>Structure domaine cible suspecte</mark> (trop de sous-domaines: ${domainParts.length}).`); }
                 if (domain.length > 70) { linkRiskScore += SCORE_DOMAIN_STRUCTURE_ANOMALY / 2; linkReasons.push(`Nom de domaine cible inhabituellement long (${domain.length} car.).`); }

                 if (urlObj.protocol !== 'https:') { linkRiskScore += SCORE_NON_HTTPS; linkReasons.push(`Cible non sécurisée (non-HTTPS): ${escapeHtml(urlToAnalyze.substring(0,50))}...`); }
                 if (suspiciousPathRegex.test(path)) { linkRiskScore += SCORE_SUSPICIOUS_PATH_KW; linkReasons.push(`Mot-clé suspect dans chemin URL cible: ...${escapeHtml(path.substring(path.length - 30))}`); }
                 if (queryParamRegex.test(query)) { linkRiskScore += SCORE_SUSPICIOUS_PARAMS; isHighlySuspicious = true; linkReasons.push(`<mark>Paramètres URL suspects sur la cible:</mark> ${escapeHtml(query.substring(0, 40))}...`); }
                 if (fragment && fragment.length > 1) { if (fragment.includes('=') || fragment.includes('&') || fragment.startsWith('#?') || base64FragmentRegex.test(fragment)) { linkRiskScore += SCORE_SUSPICIOUS_FRAGMENT; linkReasons.push(`<mark>Fragment URL (#...) contient structure suspecte (params/encodage):</mark> ${escapeHtml(fragment.substring(0,40))}...`); } }
                 if (urlToAnalyze.length > 250) { linkRiskScore += SCORE_EXCESSIVE_LENGTH; linkReasons.push(`URL cible très longue (${urlToAnalyze.length} caractères).`); }

                linkScore += linkRiskScore;
                if (isHighlySuspicious) {
                   suspiciousLinkCount++;
                   const targetKey = urlToAnalyze.split('#')[0];
                   analyzedTargets[targetKey] = (analyzedTargets[targetKey] || 0) + 1;
                }
            } catch(e) { console.warn("Could not parse or analyze URL:", originalUrl, e); linkScore += Math.max(linkRiskScore, 5); linkReasons.push("Erreur technique majeure durant l'analyse de l'URL: " + escapeHtml(originalUrl.substring(0, 50))+"..."); }
        });

        let inconsistencyPenaltyApplied = false;
        for (const target in analyzedTargets) {
            if (analyzedTargets[target] > 1 && !inconsistencyPenaltyApplied) { linkScore += SCORE_LINK_INCONSISTENCY; linkReasons.push(`<mark>Incohérence: ${analyzedTargets[target]} liens pointent vers la même cible suspecte.</mark>`); inconsistencyPenaltyApplied = true; break; }
        }

        if (totalLinksAnalyzed === 0) { linkReasons.unshift("Aucun lien cliquable trouvé."); }
        else { linkReasons.unshift(`${totalLinksAnalyzed} lien(s) analysé(s). ${suspiciousLinkCount} avec indicateur(s) de risque élevé.`); }
         if (suspiciousLinkCount > 1) { const multiplier = 1 + (suspiciousLinkCount * 0.15); linkScore *= Math.min(2.0, multiplier); linkReasons.push(`<mark>Multiples liens très suspects détectés - Risque global accru!</mark>`); }

    } catch (e) { console.error("Link Scoring Error (Outer Block):", e); linkScore += 10; linkReasons.push("Erreur technique majeure analyse liens."); }

    // --- 3. Content Analysis ---
    try {
        const bodyLength = lowerBody.length;
        foundKeywords.suspicious = findKeywords(lowerBody + lowerSubject, KEYWORDS_SUSPICIOUS[detectedLang]);
        foundKeywords.urgent = findKeywords(lowerBody + lowerSubject, KEYWORDS_URGENT[detectedLang]);
        foundKeywords.sensitive = findKeywords(lowerBody + lowerSubject, KEYWORDS_SENSITIVE_REQUEST[detectedLang]);

        let genericGreetingCount = 0, domainMentionMismatch = 0, pressureTacticCount = 0, poorGrammarSigns = 0;

        // Increased weights for keywords
        contentScore += foundKeywords.sensitive.length * 10; // Increased sensitive weight significantly
        contentScore += foundKeywords.urgent.length * 6;    // Increased urgent weight
        contentScore += foundKeywords.suspicious.length * 2; // Increased suspicious weight

        // Add bonus for combining different types of keywords
        let keywordTypesFound = (foundKeywords.sensitive.length > 0 ? 1 : 0) +
                                (foundKeywords.urgent.length > 0 ? 1 : 0) +
                                (foundKeywords.suspicious.length > 0 ? 1 : 0);
        if (keywordTypesFound >= 2) {
            contentScore += 5; // Add a bonus if 2 or more types of risky keywords found
            // Add reason only once, even if all 3 types found
            if (!contentReasons.some(r => r.includes("Combinaison de types"))) {
                    contentReasons.push("<mark>Combinaison de types de mots-clés suspects détectée.</mark>");
            }
        }

        if (foundKeywords.suspicious.length > 0) contentReasons.push(`${foundKeywords.suspicious.length} mot(s)-clé(s) potentiellement suspects.`);
        if (foundKeywords.urgent.length > 0) contentReasons.push(`${foundKeywords.urgent.length} terme(s) suggérant l'urgence.`);
        if (foundKeywords.sensitive.length > 0) contentReasons.push(`<mark>Demande potentielle d'informations sensibles.</mark>`);

        if (bodyLength > 10 && bodyLength < 150) { GENERIC_GREETINGS.forEach(g => { if (lowerBody.startsWith(g.toLowerCase())) genericGreetingCount++; }); }
        else if (bodyLength >= 150) { GENERIC_GREETINGS.forEach(g => { if (lowerBody.substring(0, 100).startsWith(g.toLowerCase())) genericGreetingCount++; }); }
        if (genericGreetingCount > 0) { contentScore += 5; contentReasons.push(`Salutation générique.`); }

        const bodyDomains = lowerBody.match(/([a-zA-Z0-9-]+\.)+(com|org|net|io|co|fr|uk|de|eu|info|biz|us|ca|app|xyz|online|shop|store)\b/g) || [];
        const senderDomainPart = senderDomain?.toLowerCase();
        if (senderDomainPart) { bodyDomains.forEach(bd => { if (bd !== senderDomainPart && !KNOWN_SAFE_DOMAINS.includes(bd) && !senderDomainPart.includes(bd.split('.')[0]) && !bd.includes(senderDomainPart.split('.')[0])) { domainMentionMismatch++; } }); }
        if (domainMentionMismatch > 0) { contentScore += 7; contentReasons.push(`<mark>Mention dans le texte de domaines différents de l'expéditeur.</mark>`); }

        if (lowerBody.includes('act now') || lowerBody.includes('limited time offer') || lowerBody.includes('do not delay') || lowerBody.includes('agissez maintenant') || lowerBody.includes('offre limitée') || lowerBody.includes('ne tardez pas')) { pressureTacticCount++; contentScore += 6; contentReasons.push(`Tactique de pression / offre limitée détectée.`); }

        if (lowerBody.includes('  ') || lowerBody.includes('..') || lowerBody.includes(',,') || lowerBody.includes('!!') || lowerBody.includes('??')) poorGrammarSigns++;
        if (poorGrammarSigns > 0) { contentScore += 3; contentReasons.push("Signes de mauvaise mise en forme ou fautes de frappe simples."); }

        if (contentScore <= 0 && contentReasons.length === 0 && !genericGreetingCount && !domainMentionMismatch && !pressureTacticCount && !poorGrammarSigns) { contentReasons.push("Le contenu textuel ne présente pas d'indicateur de risque majeur."); }

    } catch (e) { console.error("Content Scoring Error:", e); contentScore += 5; contentReasons.push("Erreur technique analyse contenu."); }


    // --- 4. Structure Analysis ---
    try {
        let obfuscationCount = 0, imageHeavy = 0, copyPasteLink = 0;
        const bodyLength = bodyText?.length || 0;
        const htmlLength = bodyHtml?.length || 0;

        // Obfuscation
        if (/[零一二三四五六七八九①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]/.test(bodyText)) { obfuscationCount++; structureReasons.push("Caractères numériques non standards (potentielle obfuscation)."); }
        if (bodyLength > 50 && bodyText.replace(/[a-zA-Z0-9\s.,;!?'"()€$£%@#:_\-]/gi, '').length / bodyLength > 0.08) { obfuscationCount++; structureReasons.push("Usage excessif de symboles ou caractères non latins."); }
        structureScore += obfuscationCount * 4; // Reduced weight

        // Image-heavy
        if (htmlLength > 500 && bodyLength < (htmlLength * 0.1)) { imageHeavy++; structureScore += 5; structureReasons.push("<mark>Structure: Contenu principalement composé d'images</mark> (peu de texte réel)."); }

        // Copy/Paste Link Suggestion
        const urlPattern = /(?:(?:https?|ftp):\/\/|www\.)[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/ig;
        const codeBlockPattern = /```[\s\S]*?```/g; // Match code blocks
        let nonLinkedUrlFound = false;
        let textWithoutCodeBlocks = bodyText.replace(codeBlockPattern, ''); // Remove code blocks first

        // Find URLs in the remaining text
        const textUrls = textWithoutCodeBlocks.match(urlPattern);

        if (textUrls) {
            const linkedUrls = links.map(l => l.url);
            for (const textUrl of textUrls) {
                // Is this URL *not* present in the actual links extracted?
                if (!linkedUrls.some(linkedUrl => linkedUrl.includes(textUrl) || textUrl.includes(linkedUrl))) {
                     // Check context: is it preceded/followed by "copy", "paste", "copier", "coller"?
                     const contextIndex = textWithoutCodeBlocks.indexOf(textUrl);
                     const contextBefore = textWithoutCodeBlocks.substring(Math.max(0, contextIndex - 30), contextIndex).toLowerCase();
                     const contextAfter = textWithoutCodeBlocks.substring(contextIndex + textUrl.length, Math.min(textWithoutCodeBlocks.length, contextIndex + textUrl.length + 30)).toLowerCase();
                     if (contextBefore.includes('copy') || contextBefore.includes('paste') || contextBefore.includes('copier') || contextBefore.includes('coller') || contextAfter.includes('copy') || contextAfter.includes('paste')) {
                         nonLinkedUrlFound = true;
                         break;
                     }
                     // Also check if it was inside the original code blocks (more likely instruction)
                     if(bodyText.match(codeBlockPattern)?.some(block => block.includes(textUrl))) {
                         nonLinkedUrlFound = true;
                         break;
                     }
                }
            }
        }
        if (nonLinkedUrlFound) {
             copyPasteLink++;
             structureScore += 7; // Significant penalty
             structureReasons.push("<mark>Structure: Suggestion de copier/coller un lien</mark> (URL en texte brut).");
        }

        if (structureScore <= 0 && structureReasons.length === 0) { structureReasons.push("Structure de l'email standard."); }

    } catch (e) { console.error("Structure Scoring Error:", e); structureScore += 3; structureReasons.push("Erreur technique analyse structure."); }


    // --- Final Score Calculation ---
    const finalSenderScore = Math.min(SCORE_WEIGHTS.SENDER, Math.max(-15, senderScore)); // Allow slightly more negative score
    const finalLinkScore = Math.min(SCORE_WEIGHTS.LINKS, Math.max(0, linkScore));
    const finalContentScore = Math.min(SCORE_WEIGHTS.CONTENT, Math.max(0, contentScore));
    const finalStructureScore = Math.min(SCORE_WEIGHTS.STRUCTURE, Math.max(0, structureScore));

    if (senderReasons.length === 0) senderReasons.push("Analyse expéditeur terminée.");
    if (linkReasons.length <= 1 && totalLinksAnalyzed > 0 && suspiciousLinkCount === 0) linkReasons.push("Aucun risque majeur détecté sur les liens.");
    if (linkReasons.length === 0) linkReasons.push("Analyse liens terminée.");
    if (contentReasons.length === 0) contentReasons.push("Analyse contenu terminée.");
    if (structureReasons.length === 0) structureReasons.push("Analyse structure terminée.");

    const totalScore = finalSenderScore + finalLinkScore + finalContentScore + finalStructureScore;
    const finalClampedScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    console.log(`Scores => S:${finalSenderScore.toFixed(1)} L:${finalLinkScore.toFixed(1)} C:${finalContentScore.toFixed(1)} St:${finalStructureScore.toFixed(1)} | Total:${totalScore.toFixed(1)} -> Clamped:${finalClampedScore}`);

    return {
        senderScore: finalSenderScore, senderReasons,
        linkScore: finalLinkScore, linkReasons,
        contentScore: finalContentScore, contentReasons,
        structureScore: finalStructureScore, structureReasons, // Return structure details
        foundKeywords,
        finalClampedScore // Final calculated score
    };
}

function extractGmailData(messageContainerElement) {
    let sender = 'Unknown', subject = 'No Subject', bodyText = '', links = [], bodyHtml = '';
    let extractedName = null; // Variable to hold name if found separately
    let extractedEmail = null; // Variable to hold email if found separately

    if (!messageContainerElement) return { sender, subject, links, bodyText, bodyHtml };

    try {
         // --- Try Primary Selectors First ---
         const senderContainer = messageContainerElement.querySelector('.gD') || messageContainerElement.querySelector('.sender-info');
         if (senderContainer) {
            const emailEl = senderContainer.querySelector('[email]');
            const nameEl = senderContainer.querySelector('[name]');
            if (emailEl) { // Found element with email attribute
                extractedEmail = emailEl.getAttribute('email');
                // Try getting name from 'name' attribute OR the text content of the email element
                extractedName = nameEl ? nameEl.getAttribute('name') : (emailEl.innerText || '').trim();
                // Construct sender string if both found
                if (extractedName && extractedEmail && extractedName !== extractedEmail) { // Ensure name isn't just the email again
                    sender = `${extractedName} <${extractedEmail}>`;
                } else if (extractedEmail) {
                    sender = extractedEmail; // Use email only if name missing or same as email
                } else if (extractedName) {
                    sender = extractedName; // Should be rare if emailEl exists, but possible
                }
                console.log("[Extractor Debug] Found via .gD/.sender-info attributes:", sender);
            } else { // No email attribute found, try parsing the text content of the container
                 const potentialSenderText = senderContainer.innerText.trim();
                 const emailMatchInText = potentialSenderText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                 if (emailMatchInText) { // Found an email within the text
                     extractedEmail = emailMatchInText[0];
                     // Attempt to parse name too, basic removal of email/brackets
                     extractedName = potentialSenderText.replace(extractedEmail, '').replace(/[<>]/g, '').trim();
                     sender = (extractedName && extractedName !== extractedEmail) ? `${extractedName} <${extractedEmail}>` : extractedEmail;
                     console.log("[Extractor Debug] Found via .gD/.sender-info text parsing:", sender);
                 } else if (potentialSenderText) { // No email found in text, assume it's just the name
                     sender = potentialSenderText;
                     extractedName = sender; // Store the name found
                     console.log("[Extractor Debug] Found only name via .gD/.sender-info text:", sender);
                 }
            }
         } else {
              console.log("[Extractor Debug] Primary sender selectors (.gD, .sender-info) not found.");
              // Attempt to find name using other common selectors if primary failed completely
              const nameOnlyEl = messageContainerElement.querySelector('.gD [name]') || messageContainerElement.querySelector('.hP')?.[Symbol.iterator]().next().value?.querySelector('span[name]'); // Look near subject sometimes
              if(nameOnlyEl) extractedName = nameOnlyEl.getAttribute('name') || nameOnlyEl.innerText.trim();
              if(extractedName) console.log("[Extractor Debug] Found potential name via fallback selector:", extractedName);
         }


         // --- Fallback using .go IF email wasn't found previously ---
         if (!extractedEmail) {
             console.log("[Extractor Debug] Email not found yet, trying .go fallback...");
             const senderBracketEl = messageContainerElement.querySelector('.go');
             if (senderBracketEl) {
                  const emailMatchInGo = senderBracketEl.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                 if (emailMatchInGo) {
                      extractedEmail = emailMatchInGo[0];
                      console.log("[Extractor Debug] Found email via .go:", extractedEmail);
                      // *** Combine with previously found name if available ***
                      if (extractedName && extractedName !== 'Unknown' && extractedName !== extractedEmail) {
                          sender = `${extractedName} <${extractedEmail}>`;
                          console.log("[Extractor Debug] Combined stored name and .go email:", sender);
                      } else {
                          // If no name was found previously, or name is same as email, just use the email
                          sender = extractedEmail;
                          console.log("[Extractor Debug] Using only .go email as sender:", sender);
                      }
                 } else {
                      console.log("[Extractor Debug] .go element found, but no email matched inside.");
                 }
             } else {
                 console.log("[Extractor Debug] .go element not found.");
             }
         }

        // --- Subject Extraction ---
         const subjectEl = messageContainerElement.querySelector('h2.hP') || document.querySelector('.hP');
         if (subjectEl) subject = subjectEl.innerText.trim();

        // --- Body Extraction ---
         const bodySelector = '.ii.gt div[data-message-id]';
         let bodyEl = messageContainerElement.querySelector(bodySelector + ' .a3s.aiL') || messageContainerElement.querySelector('.ii.gt');
         if (bodyEl) {
              bodyText = bodyEl.innerText || '';
              bodyHtml = bodyEl.innerHTML || '';
              const linkElements = bodyEl.querySelectorAll('a[href]');
              linkElements.forEach(a => {
                  if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#') && !a.href.startsWith('mailto:') && a.offsetParent !== null) {
                      const linkText = a.innerText.trim(); links.push({ url: a.href, text: linkText });
                  }
              });
         }
     } catch (e) {
         console.error("Error during Gmail extraction:", e);
         // Attempt to construct best possible sender on error
         sender = (extractedName && extractedEmail && extractedName !== extractedEmail) ? `${extractedName} <${extractedEmail}>` : (extractedEmail || extractedName || 'Error');
         subject = subject || 'Error'; bodyText = bodyText || 'Error'; links = links || []; bodyHtml = bodyHtml || '';
     }

     // Final check before returning
     if (sender === 'Unknown' || !sender.includes('@')) {
         console.warn("[Extractor Warning] Final sender string might be incomplete or invalid:", sender);
     } else {
          console.log("[Extractor Success] Final Sender String:", sender);
     }

     return { sender, subject, links, bodyText: bodyText.substring(0, 15000), bodyHtml: bodyHtml.substring(0, 30000) };
}

function extractOutlookData(containerElement) {
     let sender = 'Unknown', subject = 'No Subject', bodyText = '', links = [], bodyHtml = '';
     if (!containerElement) return { sender, subject, links, bodyText, bodyHtml };
     try {
         const senderSelectors = [ '[data-testid="message-header-container"] span[title*="@"]', '[data-testid="sender-email-address"]', 'button[role="button"] span span[title*="@"]', '.QXLj_ .Ljsqx', 'span[autoid*="SenderPersona"] span', '.M_p_F', '#ConversationReadingPaneContainer span[title*="@"]'];
         for (const selector of senderSelectors) { const el = containerElement.querySelector(selector) || document.querySelector(selector); if (el) { const titleAttr = el.getAttribute('title'); if (titleAttr && titleAttr.includes('@')) { sender = titleAttr; break; } const text = el.innerText.trim(); if(text && text.includes('@')) { sender = text; break; } } }
          if (sender === 'Unknown') { const emailMatch = containerElement.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/); if(emailMatch) sender = emailMatch[0]; }
          const subjectSelectors = [ '[data-testid="subject-content"]', '.ZUq1I', 'h1[id^="thread-subject"]', '[data-app-subject]', '.ConversationSubject'];
          for (const selector of subjectSelectors) { const el = containerElement.querySelector(selector) || document.querySelector(selector); if (el && el.innerText.trim()) { subject = el.innerText.trim(); break; } }
          const bodyContainerSelectors = [ '.allowTextSelection', '[role="document"] .PlainText', '[aria-label="Message body"]', '#UniqueMessageBody', '.rps_content', '.WordSection1'];
          let bodyContainer = null; for (const selector of bodyContainerSelectors) { bodyContainer = containerElement.querySelector(selector); if (bodyContainer) break; } if (!bodyContainer) { bodyContainer = containerElement.querySelector('[role="document"]') || containerElement; }
         if (bodyContainer) { bodyText = bodyContainer.innerText || ''; bodyHtml = bodyContainer.innerHTML || ''; const linkElements = bodyContainer.querySelectorAll('a[href]'); linkElements.forEach(a => { if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#') && !a.href.startsWith('mailto:') && a.offsetParent !== null) { const linkText = a.innerText.trim(); links.push({ url: a.href, text: linkText }); } }); }
     } catch (e) { console.error("Error during Outlook extraction:", e); sender = 'Error'; subject = 'Error'; bodyText = 'Error'; links = []; bodyHtml = ''; }
     return { sender, subject, links, bodyText: bodyText.substring(0, 15000), bodyHtml: bodyHtml.substring(0, 30000) };
}

function startObserver(platformDetectionCallback) {
    let observerInstance = null;
    const observerCallback = debounce(() => { if (!isAnalyzing) { if (typeof platformDetectionCallback === 'function') { platformDetectionCallback(); } else { console.error("Observer: platformDetectionCallback is not a function!"); } } }, 850);
    observerInstance = new MutationObserver(observerCallback);
    try { observerInstance.observe(document.body, { childList: true, subtree: true, characterData: false, attributes: false }); console.log("Observer: Observation started."); }
    catch (error) { console.error('Observer: FAILED TO START OBSERVING:', error); }
    const disconnect = () => { if (observerInstance) { console.log("Observer: Disconnecting observer."); observerInstance.disconnect(); observerInstance = null; } };
    return { disconnect };
}

function performAnalysis(platform, containerElement, messageElement) {
    if (isAnalyzing) { console.log(`%cCyberCoach: Analysis already in progress for ID: ${currentEmailId}. Skipping duplicate request.`, 'color: orange;'); return; }
    console.log(`%cCyberCoach: analyzeEmail START for ${platform} / ID: ${currentEmailId}`, 'color: #007BFF; font-size: 1.1em');
    isAnalyzing = true; showLoadingIndicator(); removeUI(); removeReShowButton(); if (analysisTimeoutId) clearTimeout(analysisTimeoutId);

    analysisTimeoutId = setTimeout(() => {
        try {
            console.log(`%cCyberCoach: --- Starting Extraction & Scoring (after ${ARTIFICIAL_DELAY_MS}ms delay) ---`, 'color: #007BFF');
            let emailData;
            if (platform === 'gmail') { emailData = extractGmailData(messageElement); }
            else if (platform === 'outlook') { emailData = extractOutlookData(containerElement); }
            else { throw new Error("Unsupported platform for extraction"); }

            const analysisResults = performScoring(emailData);
            const finalScore = analysisResults.finalClampedScore;
            console.log(`%cCyberCoach: --- Scoring Complete --- Score: ${finalScore}`, 'color: #007BFF');

            hideLoadingIndicator();
            displayUI(finalScore, analysisResults); // Pass score and full results object
        } catch (error) { console.error('CyberCoach: Error during analysis steps:', error); hideLoadingIndicator(); removeUI(); }
        finally { console.log(`%cCyberCoach: analyzeEmail FINALLY - Resetting isAnalyzing`, 'color: #007BFF; font-size: 1.1em'); isAnalyzing = false; analysisTimeoutId = null; }
    }, ARTIFICIAL_DELAY_MS);
}

function platformDetectionCallback() {
    if (isAnalyzing) { return; }
    let detectedContainer = null, detectedMessageElement = null, detectedId = null, platform = null, shouldAnalyze = false;
    try {
        if (currentPlatform === 'gmail') {
            const viewSelector = 'div.adn.ads[data-legacy-message-id]'; const emailView = document.querySelector(viewSelector);
            if (emailView) { const messageId = emailView.getAttribute('data-legacy-message-id'); if (messageId && messageId !== currentEmailId) { detectedContainer = emailView; detectedMessageElement = emailView; detectedId = messageId; platform = 'gmail'; shouldAnalyze = true; } }
            else if (currentEmailId) { currentEmailId = null; removeUI(); removeReShowButton(); hideLoadingIndicator(); }
        } else if (currentPlatform === 'outlook') {
             const readingPaneSelectors = [ '[data-testid="readingPaneContainer"]', '.wide-content-host', '[role="main"] .scrollContainer', '[aria-label="Message body"]', '.ContentPane']; let readingPane = null; for (const selector of readingPaneSelectors) { readingPane = document.querySelector(selector); if (readingPane) break; }
             if (readingPane) { const potentialIdAttr = readingPane.querySelector('[data-message-id]')?.getAttribute('data-message-id'); const potentialIdUrl = window.location.href; const potentialId = potentialIdAttr || potentialIdUrl; if (potentialId && potentialId !== currentEmailId && readingPane.innerText.length > 100) { detectedContainer = readingPane; detectedMessageElement = readingPane; detectedId = potentialId; platform = 'outlook'; shouldAnalyze = true; } }
             else if (currentEmailId) { currentEmailId = null; removeUI(); removeReShowButton(); hideLoadingIndicator(); }
        }
        if (shouldAnalyze && platform && detectedId && detectedContainer && detectedMessageElement) { console.log(`%cCyberCoach: New ${platform} email detected via Observer! ID: ${detectedId}`, 'color: green; font-weight: bold;'); currentEmailId = detectedId; if (analysisTimeoutId) clearTimeout(analysisTimeoutId); performAnalysis(platform, detectedContainer, detectedMessageElement); }
    } catch (error) { console.error("CyberCoach: Error during platform detection callback:", error); isAnalyzing = false; if (analysisTimeoutId) clearTimeout(analysisTimeoutId); }
}

function initCyberCoach() {
    console.log('CyberCoach: ***** INIT START *****');
    if (initTimeout) { clearTimeout(initTimeout); initTimeout = null; }
    removeUI(); removeReShowButton(); hideLoadingIndicator(); currentEmailId = null; isAnalyzing = false; if (analysisTimeoutId) { clearTimeout(analysisTimeoutId); analysisTimeoutId = null; }
    if (observerControl) { console.log("CyberCoach: Disconnecting existing observer before re-init."); observerControl.disconnect(); observerControl = null; }
    try {
        const hostname = window.location.hostname;
        if (hostname.includes('mail.google.com')) { console.log("CyberCoach: Setting up observer for Gmail."); currentPlatform = 'gmail'; observerControl = startObserver(platformDetectionCallback); }
        else if (hostname.includes('outlook.')) { console.log("CyberCoach: Setting up observer for Outlook."); currentPlatform = 'outlook'; observerControl = startObserver(platformDetectionCallback); }
        else { console.log('CyberCoach: Unsupported mail platform:', hostname); currentPlatform = null; }
        if (currentPlatform) { console.log("CyberCoach: Triggering initial check after observer setup."); setTimeout(platformDetectionCallback, 500); }
    } catch (error) { console.error("CyberCoach: Error setting up observer in init:", error); currentPlatform = null; if (observerControl) { observerControl.disconnect(); observerControl = null; } }
    console.log('CyberCoach: ***** INIT END *****');
}

function runInitialization(eventName = "Unknown") {
    console.log(`CyberCoach: runInitialization triggered by: ${eventName}`);
    if (initTimeout) { clearTimeout(initTimeout); } const delay = (eventName === 'window.load' || eventName === 'Fallback Timeout') ? 1000 : 500; initTimeout = setTimeout(() => { initCyberCoach(); }, delay);
}

window.addEventListener('load', () => runInitialization('window.load'));
window.addEventListener('popstate', () => runInitialization('window.popstate'));
window.addEventListener('hashchange', () => runInitialization('window.hashchange'));
(function(history){ var pushState = history.pushState; var replaceState = history.replaceState; history.pushState = function(state) { if (typeof history.onpushstate == "function") { history.onpushstate({state: state}); } runInitialization('history.pushState'); return pushState.apply(history, arguments); }; history.replaceState = function(state) { if (typeof history.onreplacestate == "function") { history.onreplacestate({state: state}); } runInitialization('history.replaceState'); return replaceState.apply(history, arguments); }; })(window.history);
setTimeout(() => { if (!observerControl && !isAnalyzing && !analysisTimeoutId && !currentUIRef && !currentLoaderRef) { console.warn("CyberCoach: Fallback timer triggered - Observer not active & no UI/Analysis detected. Forcing init attempt."); runInitialization('Fallback Timeout'); } }, 4000);

console.log('CyberCoach Main Content Script Execution Finished - v2.8');