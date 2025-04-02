// content_scripts/main.js

console.log('CyberCoach Pro Content Script Loaded - v3.2');

const CYBERCOACH_UI_ID = 'cybercoach-analysis-container';
const LOADER_ID = 'cybercoach-loading-indicator';
const RESHOW_BTN_ID = 'cybercoach-reshow-button';
const HIGHLIGHT_TOOLTIP_ID = 'cc-highlight-tooltip';
const EXPLANATION_MODAL_ID = 'cc-explanation-modal';
const EXPLANATION_MODAL_BACKDROP_ID = 'cc-explanation-modal-backdrop';
const ARTIFICIAL_DELAY_MS = 500;
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';
const API_KEY_STORAGE_KEY = 'geminiApiKey';

const ACTIONABLE_TIPS = {
  'senderGeneric': "Vérifiez si l'expéditeur (@gmail, @hotmail...) est cohérent avec une communication officielle.",
  'senderMismatch': "Vérifiez que le nom affiché correspond bien à l'adresse email expéditeur.",
  'senderSuspiciousDomain': "Examinez attentivement le domaine de l'expéditeur (@domaine.xyz) pour des signes suspects.",
  'linkRedirect': "Soyez prudent avec les redirections, la destination finale peut être masquée.",
  'linkShortener': "Ne cliquez JAMAIS sur des liens raccourcis (bit.ly, tinyurl...) sans savoir où ils mènent.",
  'linkIP': "Évitez les liens pointant vers une adresse IP numérique au lieu d'un nom de domaine.",
  'linkMismatch': "Assurez-vous que le texte du lien correspond à sa destination réelle.",
  'linkSuspiciousTLD': "Méfiez-vous des liens avec des extensions de domaine inhabituelles (.xyz, .live, .zip...).",
  'linkNonHTTPS': "Ne saisissez JAMAIS d'infos sensibles sur un site non sécurisé (HTTP et non HTTPS).",
  'linkSuspiciousParams': "Attention aux paramètres suspects dans l'URL (?email=..., ?token=...).",
  'linkFileCloud': "N'ouvrez pas de fichiers suspects (.exe, .zip, .docm) hébergés sur des clouds publics.",
  'linkInconsistency': "Méfiez-vous si plusieurs liens différents pointent vers la même cible suspecte.",
  'contentUrgent': "Ne cédez pas à la pression de l'urgence ; prenez le temps de vérifier.",
  'contentSensitive': "Ne fournissez JAMAIS d'informations sensibles (mot de passe, CB...) suite à un email.",
  'contentFormatting': "Des fautes grossières ou une mise en forme étrange sont des signes d'alerte.",
  'structureImageOnly': "Analysez bien les images cliquables ; le texte peut être caché.",
  'structureCopyPasteLink': "Ne copiez/collez ou ne tapez JAMAIS manuellement une URL fournie dans un email suspect.",
  'structureHiddenText': "Soyez conscient que du texte malveillant peut être caché.",
  'defaultDanger': "Ne cliquez sur aucun lien, ne répondez pas et signalez l'email.",
  'defaultModerate': "Examinez attentivement l'expéditeur et les liens avant toute action.",
  'defaultSecure': "Restez vigilant, même si aucun risque majeur n'est détecté."
};

const HIGH_PRIORITY_RISK_KEYS = [
  'senderMismatch', 'senderSuspiciousDomain', 'linkShortener', 'linkIP',
  'linkMismatch', 'linkSuspiciousTLD', 'linkNonHTTPS', 'linkFileCloud',
  'contentSensitive', 'structureImageOnly', 'structureCopyPasteLink'
];

let currentEmailId = null;
let observerControl = null;
let isAnalyzing = false;
let analysisTimeoutId = null;
let initTimeout = null;
let currentPlatform = null;
let lastAnalysisResult = null;
let currentLoaderRef = null;
let currentUIRef = null;
let currentReshowBtnRef = null;
let currentHighlightTooltipRef = null;
let currentExplanationModalRef = null;
let currentExplanationBackdropRef = null;
let currentHighlightedElements = [];
let geminiApiKey = null;

const SCORE_WEIGHTS = { SENDER: 40, LINKS: 25, CONTENT: 25, STRUCTURE: 10 };
const KEYWORDS_SUSPICIOUS = {
  en: ['verify', 'confirm', 'account', 'password', 'login', 'username', 'credentials', 'validate', 'authenticate', 'security', 'suspended', 'locked', 'unusual activity', 'unusual sign-in', 'access', 'security alert', 'problem', 'issue', 'verify your email', 'update your information', 'reactivate', 'disabled', 'compromised', 'policy violation', 'credit card', 'bank', 'payment', 'invoice', 'refund', 'unpaid', 'overdue', 'billing', 'statement', 'charge', 'wire transfer', 'remittance', 'receipt', 'transaction', 'financial', 'funds', 'deposit', 'congratulations', 'winner', 'won', 'prize', 'claim', 'selected', 'reward', 'gift card', 'voucher', 'coupon', 'free', 'gift', 'mystery box', 'giveaway', 'lottery', 'sweepstakes', 'inheritance', 'compensation', 'delivery', 'package', 'shipping', 'tracking', 'order', 'shipment', 'customs fee', 'address confirmation', 'failed delivery', 'urgent action', 'immediate attention', 'account closure', 'service termination', 'opportunity', 'investment', 'high returns', 'guaranteed profit', 'bitcoin', 'crypto', 'get rich', 'work from home', 'job offer', 'interview', 'secret shopper', 'virus detected', 'malware', 'computer infected', 'technical support', 'call microsoft', 'donation', 'charity', 'help needed', 'disaster relief', 'support us', 'confidential', 'ssn', 'social security', 'passport', 'driver\'s license', 'customer survey', 'feedback required'],
  fr: ['vérifier', 'confirmer', 'compte', 'mot de passe', 'connexion', 'identifiant', 'validation', 'authentification', 'sécurité', 'suspendu', 'bloqué', 'activité inhabituelle', 'connexion inhabituelle', 'accès', 'alerte sécurité', 'problème', 'vérifiez votre email', 'mettez à jour', 'réactiver', 'désactivé', 'compromis', 'violation politique', 'carte de crédit', 'bancaire', 'paiement', 'facture', 'remboursement', 'impayé', 'retard', 'facturation', 'relevé', 'frais', 'virement bancaire', 'versement', 'reçu', 'transaction', 'financier', 'fonds', 'dépôt', 'félicitations', 'gagnant', 'remporté', 'prix', 'réclamer', 'sélectionné', 'récompense', 'carte cadeau', 'bon d\'achat', 'coupon', 'gratuit', 'cadeau', 'boîte mystère', 'concours', 'loterie', 'tirage au sort', 'héritage', 'compensation', 'indemnisation', 'livraison', 'colis', 'expédition', 'suivi', 'commande', 'envoi', 'frais de douane', 'confirmation adresse', 'livraison échouée', 'action urgente', 'attention immédiate', 'clôture de compte', 'résiliation service', 'opportunité', 'investissement', 'rendement élevé', 'profit garanti', 'bitcoin', 'crypto', 'devenir riche', 'travail à domicile', 'offre d\'emploi', 'entretien', 'client mystère', 'virus détecté', 'malware', 'ordinateur infecté', 'support technique', 'appelez microsoft', 'donation', 'charité', 'aide requise', 'secours catastrophe', 'soutenez-nous', 'confidentiel', 'numéro sécurité sociale', 'passeport', 'permis conduire', 'enquête client', 'avis requis', 'sondage']
};
const KEYWORDS_URGENT = {
  en: ['urgent', 'immediately', 'now', 'critical', 'important', 'action required', 'final notice', 'today only', 'last chance', 'expires', 'expiring soon', 'warning', 'alert', 'response needed', 'limited time', 'don\'t delay', 'act now', 'final warning', 'immediate action', 'account closure imminent'],
  fr: ['urgent', 'immédiatement', 'maintenant', 'critique', 'important', 'action requise', 'dernier avis', 'aujourd\'hui seulement', 'dernière chance', 'expire', 'expire bientôt', 'avertissement', 'alerte', 'réponse nécessaire', 'temps limité', 'ne tardez pas', 'agissez maintenant', 'dernier avertissement', 'action immédiate', 'clôture compte imminente']
};
const KEYWORDS_SENSITIVE_REQUEST = {
  en: ['password', 'credit card', 'ssn', 'social security', 'bank account', 'login details', 'update billing', 'confirm identity', 'personal information', 'date of birth', 'mother\'s maiden name', 'security questions', 'pin code', 'cvv', 'full card number', 'copy of id', 'photo id', 'driver\'s license number', 'passport number', 'tax id'],
  fr: ['mot de passe', 'carte de crédit', 'numéro de sécurité sociale', 'compte bancaire', 'identifiants', 'facturation', 'confirmer identité', 'informations personnelles', 'date de naissance', 'nom jeune fille mère', 'questions de sécurité', 'code pin', 'cvv', 'numéro carte complet', 'copie pièce identité', 'photo identité', 'numéro permis conduire', 'numéro passeport', 'numéro fiscal']
};
const DOMAIN_KEYWORDS_SUSPICIOUS = ['login', 'signin', 'verify', 'update', 'confirm', 'secure', 'admin', 'account', 'billing', 'payment', 'recovery', 'reset', 'support', 'service', 'mail', 'office', 'live', 'portal', 'client', 'webaccess', 'validation', 'authentication'];
const GENERIC_GREETINGS = ['dear customer', 'dear user', 'dear client', 'dear valued customer', 'hello,', 'greetings,', 'dear sir/madam', 'cher client', 'cher utilisateur', 'bonjour,', 'salutations'];
const SHORTENER_DOMAINS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'bit.do', 'shorturl.at', 'rebrand.ly', 'cutt.ly', 'cutt.us', 't.ly', 'lnkd.in', 'soo.gd', 'tiny.cc', 'rb.gy', 'lc.chat', 'shorte.st', 'cutt.us', 'urlz.fr', 'qr.ae', 'adfoc.us', 'shrtco.de', 'tr.im', 'plu.sh', 'mcaf.ee'];
const SUSPICIOUS_TLDS = ['.zip', '.mov', '.xyz', '.top', '.club', '.site', '.online', '.live', '.icu', '.work', '.click', '.link', '.info', '.biz', '.gdn', '.loan', '.review', '.stream', '.download', '.xin', '.kim', '.men', '.date', '.faith', '.accountant', '.pw', '.tk', '.cf', '.ga', '.gq', '.ml', '.cam', '.lol', '.pics', '.mom', '.uno', '.monster', '.rest', '.bar', '.forsale', '.beauty', '.hair', '.skin', '.makeup', '.quest', '.vodka', '.desi', '.study', '.help', '.game', '.fun'];
const GENERIC_EMAIL_DOMAINS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'aol.com', 'msn.com', 'ymail.com', 'mail.com', 'gmx.com', 'gmx.us', 'gmx.co.uk', 'icloud.com', 'me.com', 'mac.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'zoho.com', 'protonmail.com', 'pm.me', 'tutanota.com', 'laposte.net', 'orange.fr', 'free.fr', 'sfr.fr'];
const KNOWN_SAFE_DOMAINS = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com', 'linkedin.com', 'isep.fr', 'garageisep.com', 'youtube.com', 'wikipedia.org', 'twitter.com', 'instagram.com', 'paypal.com', 'dropbox.com', 'github.com', 'slack.com', 'netflix.com', 'spotify.com', 'airbnb.com', 'uber.com', 'lyft.com', 'discord.com', 'mail.google.com', 'mail.yahoo.com', 'mail.protonmail.com'];
const KNOWN_REDIRECTORS = { 'google.com': 'q', 'google.co.uk': 'q', 'google.fr': 'q', 'googleadservices.com': 'adurl', 'youtube.com': 'q', 'googleusercontent.com': null, 'gstatic.com': null, 'safelinks.protection.outlook.com': 'url', 'clicktracking.': null, 'mandrillapp.com': 'url', 'mailchi.mp': null, 'sendgrid.net': null, '*.hubspot.com': 'url', '*.mktoweb.com': null };
const GENERIC_CLOUD_HOSTING_DOMAINS = ['storage.googleapis.com', '.s3.amazonaws.com', '.blob.core.windows.net', 'dropbox.com', 'drive.google.com', 'sharepoint.com', 'onedrive.live.com', '1drv.ms', 'box.com', 'mega.nz', 'mega.io', 'mediafire.com', 'wetransfer.com', 'transfer.sh', 'ipfs.io', '.web.app', '.firebaseapp.com', 'sites.google.com'];
const ACTIVELY_RISKY_FILE_EXTENSIONS = ['.html', '.htm', '.shtml', '.js', '.hta', '.wsf', '.vbs', '.jse', '.exe', '.scr', '.com', '.pif', '.bat', '.cmd', '.ps1', '.jar', '.lnk', '.iso', '.img', '.dmg', '.apk', '.svg', '.mht'];
const POTENTIALLY_RISKY_FILE_EXTENSIONS = ['.pdf', '.doc', '.xls', '.ppt', '.zip', '.rar', '.7z'];
const MACRO_ENABLED_EXTENSIONS = ['.docm', '.xlsm', '.pptm'];

const ICONS = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`,
  expandMore: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/></svg>`,
  expandLess: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"/></svg>`,
  aiSpark: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#1e8e3e"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  warningTriangle: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#f9ab00"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  dangerHex: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#d93025"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z"/></svg>`,
  tipSecure: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#1e8e3e"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  tipModerate: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#f9ab00"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  tipDanger: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#d93025"><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm-1 13h2v2h-2v-2zm0-6h2v4h-2v-4z"/></svg>`,
  questionMark: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>`
};

const RISK_EXPLANATIONS = {
  'senderGeneric': { title: "Domaine Expéditeur Générique", text: "L'email provient d'un service public comme Gmail ou Outlook (<mark>@gmail.com, @outlook.com</mark>, etc.). Bien que légitime pour des particuliers, les entreprises sérieuses utilisent généralement leur propre domaine (<mark>@nomentreprise.com</mark>). Soyez très prudent si un email d'un domaine générique prétend être une communication officielle (banque, administration...)." },
  'senderMismatch': { title: "Nom et Email Incohérents", text: "Le nom affiché (ex: <mark>\"Service Client Banque\"</mark>) ne correspond pas ou n'a pas de lien logique avec l'adresse email réelle (ex: <mark>xyz123@hotmail.com</mark>). C'est une technique courante d'usurpation (<mark>spoofing</mark>) pour vous tromper sur l'identité de l'expéditeur." },
  'senderSuspiciousDomain': { title: "Domaine Expéditeur Suspect", text: "Le domaine de l'expéditeur (<mark>@partie-apres-le-arobase</mark>) contient des éléments suspects : mots-clés trompeurs (<mark>paypal-secure</mark>, <mark>support-office</mark>), trop de sous-domaines (<mark>login.compte.secu.site.xyz</mark>), des chiffres/tirets inhabituels, ou une extension (<mark>.xyz, .live, .tk</mark>) rarement utilisée par des entités légitimes." },
  'senderNoReplyUrgent': { title: "Adresse 'No-Reply' + Urgence", text: "L'email vient d'une adresse <mark>noreply@...</mark> ou <mark>no-reply@...</mark> (qui ne peut recevoir de réponse) mais demande une action <mark>urgente</mark>. C'est incohérent : une demande urgente devrait permettre une forme de contact." },
  'senderInvalid': { title: "Format Expéditeur Invalide", text: "L'adresse email de l'expéditeur n'a pas pu être correctement lue ou ne respecte pas le format standard. Cela peut être dû à une erreur technique ou une tentative d'obfuscation." },
  'linkRedirect': { title: "Redirection via un Service", text: "Le lien passe par un service intermédiaire (ex: <mark>safelinks.protection.outlook.com</mark>, <mark>google.com/url?</mark>, service de tracking...). Bien que parfois utilisé légitimement pour le suivi, les attaquants l'utilisent aussi pour masquer la destination finale réelle. La destination analysée est celle *après* la redirection." },
  'linkShortener': { title: "Lien Raccourci", text: "Un service de raccourcissement de liens (<mark>bit.ly, tinyurl.com</mark>, etc.) est utilisé. Cela masque complètement la destination finale avant de cliquer. C'est un énorme signal d'alarme car très utilisé pour cacher des sites malveillants." },
  'linkIP': { title: "Lien vers une Adresse IP", text: "Le lien pointe directement vers une adresse numérique (ex: <mark>http://192.168.1.10/login</mark>) au lieu d'un nom de domaine (ex: <mark>monsite.com</mark>). Les sites légitimes utilisent quasiment toujours des noms de domaine. Pointer vers une IP est très suspect." },
  'linkMismatch': { title: "Texte du Lien ≠ Cible", text: "Le texte sur lequel vous cliquez (ex: <mark>\"Cliquez ici pour accéder à votre compte\"</mark>) ne correspond pas au domaine vers lequel le lien pointe réellement (ex: <mark>site-louche.xyz</mark>). C'est un leurre classique pour vous faire cliquer." },
  'linkGenericTextSuspiciousTarget': { title: "Texte Générique + Cible Suspecte", text: "Le texte du lien est très générique (<mark>\"Cliquez ici\", \"Mettre à jour\"</mark>) et la destination semble suspecte (domaine bizarre, non-HTTPS, redirection...). Les attaquants comptent sur l'urgence ou la curiosité pour que vous cliquiez sans vérifier." },
  'linkSuspiciousTLD': { title: "Extension de Domaine (.TLD) Suspecte", text: "Le lien pointe vers un domaine avec une extension finale (<mark>.xyz, .top, .icu, .zip, .mov</mark>, etc.) qui est très bon marché, facile à obtenir anonymement, et fréquemment utilisée pour des activités malveillantes." },
  'linkSuspiciousDomainStructure': { title: "Structure du Domaine Suspecte", text: "Le nom de domaine cible a une structure étrange : trop de sous-domaines (<mark>secure.login.compte.site.xyz</mark>), très long, contient des mots-clés suspects (<mark>paypal-support-verify.com</mark>), ou des chiffres/tirets." },
  'linkNonHTTPS': { title: "Lien Non Sécurisé (Non-HTTPS)", text: "Le lien utilise <mark>http://</mark> au lieu de <mark>https://</mark>. Cela signifie que la connexion au site n'est pas chiffrée. Les sites légitimes, surtout ceux demandant des informations, utilisent quasiment toujours HTTPS. Absence de HTTPS = Danger." },
  'linkSuspiciousPath': { title: "Chemin d'URL Suspect", text: "La partie de l'URL après le nom de domaine (<mark>/chemin/vers/page.html</mark>) contient des mots-clés souvent associés aux pages de phishing (<mark>/login/, /verify/, /account/, /secure/</mark>)." },
  'linkSuspiciousParams': { title: "Paramètres d'URL Suspects", text: "L'URL contient des paramètres (<mark>?param1=valeur&param2=valeur</mark>) qui semblent suspects, comme des <mark>tokens</mark>, des <mark>ids</mark>, votre <mark>email</mark> pré-rempli, ou des termes liés à l'authentification. Cela peut être utilisé pour vous suivre ou pré-remplir des formulaires malveillants." },
  'linkFileCloud': { title: "Fichier Hébergé sur Cloud Générique", text: "Le lien pointe vers un fichier (ex: <mark>.exe, .pdf, .zip, .docm</mark>) stocké sur une plateforme cloud publique (<mark>Google Drive, Dropbox, OneDrive, AWS S3</mark>...). Bien que l'hébergement soit légitime, les attaquants l'utilisent pour distribuer des malwares car c'est facile et souvent moins surveillé." },
  'linkInconsistency': { title: "Liens Multiples vers Cible Identique", text: "Plusieurs liens différents dans l'email pointent tous vers la même destination finale suspecte. C'est une tactique pour augmenter les chances que vous cliquiez sur l'un d'eux." },
  'contentUrgent': { title: "Termes d'Urgence / Pression", text: "L'email utilise des mots ou expressions créant un sentiment d'urgence (<mark>urgent, immédiatement, dernière chance, compte suspendu, expire bientôt</mark>) pour vous pousser à agir vite, sans réfléchir ni vérifier." },
  'contentSensitive': { title: "Demande d'Informations Sensibles", text: "L'email demande directement ou indirectement de fournir des informations personnelles ou confidentielles (<mark>mot de passe, numéro de carte, code PIN, date de naissance, confirmation d'identité</mark>). Ne fournissez JAMAIS ces informations suite à un email non sollicité." },
  'contentSuspiciousKeywords': { title: "Mots-clés Suspects", text: "L'email contient des mots-clés fréquemment utilisés dans les arnaques ou tentatives de phishing (<mark>vérifier compte, problème de livraison, gain/loterie, investissement facile, alerte sécurité</mark>...)." },
  'contentGenericGreeting': { title: "Salutation Générique", text: "L'email commence par une salutation vague comme <mark>\"Cher client\"</mark>, <mark>\"Bonjour\"</mark>, <mark>\"Cher utilisateur\"</mark> au lieu de votre nom. Les communications légitimes et personnalisées utilisent souvent votre nom." },
  'contentDomainMismatch': { title: "Mention de Domaines Incohérents", text: "Le corps de l'email mentionne des noms de domaine (ex: <mark>votresite.com</mark>) qui sont différents du domaine de l'expéditeur (<mark>@autre-site.net</mark>) et qui ne semblent pas liés logiquement." },
  'contentFormatting': { title: "Mise en Forme / Fautes", text: "L'email présente des signes de mauvaise qualité : fautes d'orthographe ou de grammaire grossières, mise en forme étrange (doubles espaces, ponctuation bizarre), usage excessif de majuscules. C'est souvent un signe d'email non professionnel ou traduit automatiquement." },
  'structureImageOnly': { title: "Email Principalement Composé d'Images", text: "L'email contient très peu de texte réel et est constitué d'une ou plusieurs grandes images. Les attaquants font cela pour contourner les filtres anti-spam qui analysent le texte. Les liens sont souvent cachés dans les images." },
  'structureCopyPasteLink': { title: "Suggestion de Copier/Coller un Lien", text: "L'email vous demande de copier une URL affichée en texte brut et de la coller dans votre navigateur, au lieu de fournir un lien cliquable. C'est une technique pour contourner l'analyse des liens et vous envoyer vers des sites dangereux." },
  'structureHiddenText': { title: "Texte Caché / Invisible", text: "L'email pourrait contenir du texte rendu invisible (même couleur que le fond, taille de police minuscule). C'est utilisé pour ajouter des mots-clés afin de tromper les filtres ou cacher du contenu malveillant." },
  'structureObfuscation': { title: "Caracteres Inhabituels / Obfuscation", text: "L'email utilise des caractères non standards, des symboles étranges, ou des caractères qui ressemblent à des lettres latines (homoglyphes) pour tenter de masquer des mots-clés ou des URL aux filtres de sécurité." },
  'unknown': { title: "Information", text: "Aucune explication spécifique disponible pour ce point." }
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        func.apply(context, args);
      } catch (e) {
        console.error("CyberCoach: Error in debounced callback:", e);
      }
    }, wait);
  };
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightReason(reason, reasonKey = null) {
  if (reason.includes('<mark') || reason.includes('cc-explain-risk')) {
    return reason;
  }

  const keywordsToMark = {
    'suspect': 'senderSuspiciousDomain',
    'différent': 'senderMismatch',
    'mismatch': 'senderMismatch',
    'malveillant': 'linkSuspiciousDomainStructure',
    'non-HTTPS': 'linkNonHTTPS',
    'erreur': null,
    'ip:': 'linkIP',
    'raccourci': 'linkShortener',
    'shortener': 'linkShortener',
    'danger': null,
    'invalide': 'senderInvalid',
    'sensible': 'contentSensitive',
    'sensitive': 'contentSensitive',
    'générique': 'senderGeneric',
    'generic': 'senderGeneric',
    'urgent': 'contentUrgent',
    'pression': 'contentUrgent',
    'pressure': 'contentUrgent',
    'obfuscation': 'structureObfuscation',
    'masqué': 'structureHiddenText',
    'hidden': 'structureHiddenText',
    'spoofed': 'senderMismatch',
    'compromis': null,
    'compromised': null,
    'redirection': 'linkRedirect',
    'tracking': 'linkRedirect',
    'cloud': 'linkFileCloud',
    'hébergé': 'linkFileCloud',
    'fragment': 'linkSuspiciousParams',
    'cohérence': 'linkInconsistency',
    'consistency': 'linkInconsistency',
    'structure': 'linkSuspiciousDomainStructure',
    'anomalie': null,
    'image-only': 'structureImageOnly',
    'copier/coller': 'structureCopyPasteLink',
    'copy/paste': 'structureCopyPasteLink',
    'high risk': null,
    'medium risk': null,
    'critical risk': null,
    'likely malicious': null,
    'impersonation': 'senderMismatch',
    'credential theft': 'contentSensitive'
  };
  const highRiskKws = ['danger', 'malveillant', 'critical risk', 'likely malicious', 'credential theft', 'compromised', 'spoofed', 'sensitive', 'sensible', 'invalide', 'non-HTTPS', 'ip:', 'shortener', 'raccourci'];

  let highlighted = reason;
  let identifiedRiskKey = reasonKey;

  Object.entries(keywordsToMark).forEach(([kw, riskKey]) => {
    const regex = new RegExp(`(?<![\\w<])(${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(?![\\w>])`, 'gi');
    highlighted = highlighted.replace(regex, (match, p1) => {
      const markClass = highRiskKws.some(hrk => hrk.toLowerCase() === p1.toLowerCase()) ? 'high-risk' : '';
      if (!identifiedRiskKey && riskKey) {
        identifiedRiskKey = riskKey;
      }
      return `<mark class="${markClass}">${p1}</mark>`;
    });
  });

  const explanationIcon = identifiedRiskKey
    ? `<span class="cc-explain-risk" data-risk-key="${identifiedRiskKey}" title="En savoir plus...">?</span>`
    : '';

  return `<span class="cc-reason-text">${highlighted}</span>${explanationIcon}`;
}

function findKeywords(text, keywordList) {
  const found = [];
  if (!text || !keywordList) return found;
  const lowerText = text.toLowerCase();
  keywordList.forEach(k => {
    if (typeof k === 'string') {
      const regex = new RegExp(`\\b${k.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      if (regex.test(lowerText)) {
        found.push(k);
      }
    }
  });
  return found;
}

function removeUI() {
  if (currentUIRef) {
    currentUIRef.remove();
    currentUIRef = null;
  }
  const existingUI = document.getElementById(CYBERCOACH_UI_ID);
  if (existingUI) {
    existingUI.remove();
  }
  cleanupHighlights();
  removeHighlightTooltip();
  removeExplanationModal();
}

function removeLoading() {
  if (currentLoaderRef) {
    currentLoaderRef.classList.remove('visible');
    currentLoaderRef.addEventListener('transitionend', () => {
      currentLoaderRef?.remove();
      currentLoaderRef = null;
    }, { once: true });
    // Fallback removal
    setTimeout(() => {
      if (currentLoaderRef) {
        currentLoaderRef.remove();
        currentLoaderRef = null;
      }
    }, 300);
  } else {
    const existingLoader = document.getElementById(LOADER_ID);
    if (existingLoader) {
      existingLoader.remove();
    }
    currentLoaderRef = null;
  }
}

function hideLoadingIndicator() {
  removeLoading();
}

function removeReShowButton() {
  if (currentReshowBtnRef) {
    currentReshowBtnRef.classList.remove('visible');
    currentReshowBtnRef.addEventListener('transitionend', () => {
      currentReshowBtnRef?.remove();
      currentReshowBtnRef = null;
    }, { once: true });
    // Fallback removal
    setTimeout(() => {
      if (currentReshowBtnRef) {
        currentReshowBtnRef.remove();
        currentReshowBtnRef = null;
      }
    }, 300);
  } else {
    const existingBtn = document.getElementById(RESHOW_BTN_ID);
    if (existingBtn) {
      existingBtn.remove();
    }
    currentReshowBtnRef = null;
  }
}

function addReShowButton() {
  removeReShowButton();
  const analysisData = lastAnalysisResult;

  if (!analysisData || !analysisData.localResult || typeof analysisData.localResult.finalClampedScore === 'undefined') {
    console.error("addReShowButton: Cannot add button, lastAnalysisResult.localResult is invalid:", analysisData);
    return;
  }

  const reshowBtn = document.createElement('button');
  reshowBtn.id = RESHOW_BTN_ID;
  reshowBtn.setAttribute('aria-label', 'Réafficher l\'analyse CyberCoach');
  reshowBtn.innerHTML = ICONS.shield;
  reshowBtn.title = 'Réafficher l\'analyse';

  reshowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentData = lastAnalysisResult;
    if (currentData && currentData.localResult && typeof currentData.localResult.finalClampedScore !== 'undefined') {
      displayUI(currentData);
      removeReShowButton();
    } else {
      console.error("Reshow button clicked, but stored analysisData was invalid!");
    }
  });

  document.body.appendChild(reshowBtn);
  currentReshowBtnRef = reshowBtn;

  // Slight delay for CSS transition
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (currentReshowBtnRef) {
        currentReshowBtnRef.classList.add('visible');
      }
    }, 10);
  });
}

function showLoadingIndicator() {
  removeLoading();
  removeUI();
  removeReShowButton();
  cleanupHighlights();
  removeHighlightTooltip();
  removeExplanationModal();

  const loader = document.createElement('div');
  loader.id = LOADER_ID;
  loader.innerHTML = `<div class="cc-spinner"></div> Analyse locale en cours...`;
  document.body.appendChild(loader);
  currentLoaderRef = loader;

  // Slight delay for CSS transition
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (currentLoaderRef) {
        currentLoaderRef.classList.add('visible');
      }
    }, 10);
  });
}

async function getApiKey() {
  if (geminiApiKey) {
    return geminiApiKey;
  }
  try {
    const result = await chrome.storage.local.get([API_KEY_STORAGE_KEY]);
    if (result[API_KEY_STORAGE_KEY]) {
      geminiApiKey = result[API_KEY_STORAGE_KEY];
      return geminiApiKey;
    }
  } catch (error) {
    console.error("Error getting API key from storage:", error);
  }
  return null;
}

async function saveApiKey(key) {
  try {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: key });
    geminiApiKey = key;
    return true;
  } catch (error) {
    console.error("Error saving API key:", error);
    return false;
  }
}

function generateGeminiPrompt(localData) {
  const { sender, subject, links } = localData.emailData;
  const { senderScore, linkScore, contentScore, structureScore, senderReasons, linkReasons, contentReasons, structureReasons, foundKeywords } = localData;

  let prompt = `Agis comme un expert en cybersécurité. Analyse les métadonnées d'email suivantes pour détecter un potentiel phishing ou une intention malveillante. Fournis une évaluation de risque concise EN FRANÇAIS. N'oublie pas que, si le sender du mail est légitime, fais baisser le score au maximum. Généralement, c'est une preuve que le mail est safe peu importe l'envoyeur, si ça vient du site officiel, donc flag le en "safe" sauf si il y a vraiment un élément très très suspect !

Métadonnées Fournies:
- Expéditeur: "${sender || 'Non disponible'}"
- Sujet: "${subject || 'Non disponible'}"
`;

  let linkDomains = [];
  if (links && links.length > 0) {
    linkDomains = links.map(link => {
      try {
        const url = new URL(link.url);
        const parts = url.hostname.split('.');
        return parts.length >= 2 ? parts.slice(-2).join('.') : url.hostname;
      } catch {
        return null;
      }
    }).filter(Boolean);
    linkDomains = [...new Set(linkDomains)];
    prompt += `- Domaines des liens trouvés: [${linkDomains.slice(0, 10).join(', ')}] ${linkDomains.length > 10 ? ' (et autres)' : ''}\n`;
  } else {
    prompt += `- Liens trouvés: Aucun\n`;
  }

  prompt += `
Résumé de l'analyse locale:
- Risque Expéditeur: ${senderScore.toFixed(0)}/${SCORE_WEIGHTS.SENDER} ${senderReasons.some(r => r.includes('<mark')) ? '[Indicateurs suspects]' : ''}
- Risque Liens: ${linkScore.toFixed(0)}/${SCORE_WEIGHTS.LINKS} ${linkReasons.some(r => r.includes('<mark')) ? '[Indicateurs suspects]' : ''}
- Risque Contenu: ${contentScore.toFixed(0)}/${SCORE_WEIGHTS.CONTENT} (Mots-clés: ${foundKeywords.suspicious.length} suspects, ${foundKeywords.urgent.length} urgents, ${foundKeywords.sensitive.length} sensibles)
- Risque Structure: ${structureScore.toFixed(0)}/${SCORE_WEIGHTS.STRUCTURE} ${structureReasons.some(r => r.includes('<mark')) ? '[Indicateurs suspects]' : ''}
`;

  prompt += `
Tâche:
Basé sur les métadonnées fournies, et en prenant en compte la personne qui a envoyé le mail (le sender ici, si le sender est quelqu'un de safe, alors tu sais que le mail n'est tout simplement PAS UN DANGER, donc tu peux automatiquement flag le mail comme "faible"):
1.  Donne un niveau de risque global unique: "Faible", "Moyen", "Élevé", ou "Critique".
2.  Donne 2 à 4 points clés (bullet points) expliquant les facteurs *principaux* influençant ton évaluation, en te concentrant sur les risques les plus significatifs. N'invente pas de détails absents des métadonnées.

Format de Réponse Strict (Répondre en FRANÇAIS):
Niveau de Risque: [Ton Niveau Ici]
Facteurs Clés:
- [Point clé 1]
- [Point clé 2]
- [Point clé 3 optionnel]
- [Point clé 4 optionnel]
`;
  return prompt;
}

async function callGeminiApi(promptText, apiKey) {
  const url = GEMINI_API_ENDPOINT + apiKey;
  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: { maxOutputTokens: 250, temperature: 0.6 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error Response:", response.status, errorBody);
      if (response.status === 400 && errorBody.includes("API_KEY_INVALID")) return "Erreur: Clé API invalide.";
      if (response.status === 400) return "Erreur: Requête invalide (vérifiez format ou clé API).";
      if (response.status === 429) return "Erreur: Quota API dépassé ou trop de requêtes.";
      if (response.status === 500) return "Erreur: Problème serveur côté Google Gemini.";
      return `Erreur: La requête API a échoué (statut ${response.status}).`;
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text.trim();
    } else if (data.promptFeedback && data.promptFeedback.blockReason) {
      console.warn("Gemini API blocked prompt:", data.promptFeedback.blockReason, data.promptFeedback.safetyRatings);
      return `Erreur: Contenu bloqué par l'API (${data.promptFeedback.blockReason}).`;
    } else {
      console.error("Unexpected Gemini API response structure:", data);
      return "Erreur: Impossible d'analyser la réponse de l'IA.";
    }

  } catch (error) {
    console.error("Network or fetch error calling Gemini API:", error);
    return "Erreur: Problème réseau lors de la connexion au service IA.";
  }
}

function cleanupHighlights() {
  currentHighlightedElements.forEach(({ element, originalStyle, listenerInfo }) => {
    try {
      if (document.body.contains(element)) {
        element.classList.remove('cc-highlight-red', 'cc-highlight-yellow');
        // Restore style carefully
        if (originalStyle !== undefined) {
          element.style.cssText = originalStyle;
        } else {
          // Clear potentially added styles if original wasn't stored
          element.style.outline = '';
          element.style.border = '';
          element.style.boxShadow = '';
          element.style.animation = '';
          element.style.cursor = '';
        }
        if (listenerInfo) {
          element.removeEventListener(listenerInfo.type, listenerInfo.handler);
          element.removeEventListener('mouseleave', hideHighlightTooltip);
        }
      }
    } catch (e) {
      console.warn("Minor error cleaning up highlight:", element, e);
    }
  });
  // Cleanup urgent marks added directly to text nodes
  const urgentMarks = document.querySelectorAll('mark.cc-urgent-highlight');
  urgentMarks.forEach(mark => {
    try {
      if (mark.parentNode && document.body.contains(mark)) {
        // Replace mark with its content
        mark.outerHTML = mark.innerHTML;
      }
    } catch (e) {
      console.warn("Minor error cleaning up urgent mark:", mark, e);
    }
  });

  currentHighlightedElements = [];
  removeHighlightTooltip();
}

function addHighlight(element, riskLevel, reason) {
  if (!element || !document.body.contains(element)) return;

  const highlightClass = riskLevel === 'danger' ? 'cc-highlight-red' : 'cc-highlight-yellow';
  const originalStyle = element.style.cssText; // Store original inline styles

  element.classList.add(highlightClass);
  element.style.cursor = 'help'; // Add help cursor

  const listenerHandler = (event) => showHighlightTooltip(event, element, reason, riskLevel);
  element.addEventListener('mouseenter', listenerHandler);
  element.addEventListener('mouseleave', hideHighlightTooltip);

  // Store reference for cleanup
  currentHighlightedElements.push({
    element: element,
    originalStyle: originalStyle,
    listenerInfo: { type: 'mouseenter', handler: listenerHandler }
  });
}

function removeHighlight(elementToRemove) {
  if (!elementToRemove) return;

  const index = currentHighlightedElements.findIndex(item => item.element === elementToRemove);
  if (index > -1) {
    const { element, originalStyle, listenerInfo } = currentHighlightedElements[index];
    try {
      if (document.body.contains(element)) {
        element.classList.remove('cc-highlight-red', 'cc-highlight-yellow');
        // Restore original style
        if (originalStyle !== undefined) {
          element.style.cssText = originalStyle;
        } else {
          // Fallback clear if style wasn't stored
          element.style.outline = '';
          element.style.border = '';
          element.style.boxShadow = '';
          element.style.animation = '';
          element.style.cursor = '';
        }
        // Remove listeners
        if (listenerInfo) {
          element.removeEventListener(listenerInfo.type, listenerInfo.handler);
          element.removeEventListener('mouseleave', hideHighlightTooltip);
        }
      }
      // Remove from tracked array
      currentHighlightedElements.splice(index, 1);
      hideHighlightTooltip(); // Hide tooltip if it was showing for this element
    } catch (e) {
      console.warn("Error removing single highlight:", e);
    }
  }
}

function applyHighlights(analysisResult) {
  cleanupHighlights();
  if (!analysisResult || !analysisResult.localResult) return;

  const { localResult } = analysisResult;
  const { senderReasons, linkReasons } = localResult;

  // Highlight Sender
  senderReasons.forEach(reason => {
    if (reason.includes("<mark")) { // Check if reason indicates a notable risk
      let senderElement;
      if (currentPlatform === 'gmail') {
        senderElement = document.querySelector('.gD [email]')?.closest('.gD') || document.querySelector('.go')?.closest('span');
      } else if (currentPlatform === 'outlook') {
        senderElement = document.querySelector('[data-testid="message-header-container"] span[title*="@"]')?.closest('div, span') || document.querySelector('[data-testid="sender-email-address"]')?.closest('div, span');
      }
      if (senderElement) {
        addHighlight(senderElement, 'yellow', `Expéditeur: ${reason.replace(/<span[^>]*>|<\/span>|<mark[^>]*>|<\/mark>/g, "")}`);
      }
    }
  });

  // Highlight Links
  linkReasons.forEach(reason => {
    if (reason.includes("<mark")) { // Check if reason indicates a notable risk
      const cleanedReason = reason.replace(/<span[^>]*>|<\/span>|<mark[^>]*>|<\/mark>/g, "");
      const urlMatch = reason.match(/(https?:\/\/[^\s<>"']+)/) || reason.match(/cible:\s*([^\s<>"')]+)/i) || reason.match(/domain(?:e)?\s*([^\s<>"')]+)/i);
      const target = urlMatch ? urlMatch[1] : null;

      if (target) {
        document.querySelectorAll(`a[href]`).forEach(a => {
          let matchFound = false;
          try {
            // Try exact match first
            if (a.href === target) {
              matchFound = true;
            }
            // Try partial match (e.g., target is a prefix)
            else if (a.href.includes(target)) {
              matchFound = true;
            }
            // Try domain matching (useful for variations like www.)
            else {
              const linkDomain = new URL(a.href).hostname.replace(/^www\./, '');
              if (target.includes(linkDomain) || linkDomain.includes(target)) {
                matchFound = true;
              }
            }
          } catch { /* Ignore invalid URLs */ }

          // Only highlight visible links
          if (matchFound && a.offsetParent !== null) {
            addHighlight(a, 'danger', `Lien (${escapeHtml(target.substring(0, 30))}...): ${cleanedReason}`);
          }
        });
      }
    }
  });

  // Highlight Urgent Keywords in Body (using TreeWalker for text nodes)
  try {
    const urgentKeywords = localResult.foundKeywords?.urgent || [];
    if (urgentKeywords.length > 0) {
      const bodyElement = getEmailBodyElement();
      if (bodyElement) {
        const walker = document.createTreeWalker(bodyElement, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToModify = [];
        // Collect text nodes first to avoid issues modifying DOM during traversal
        while (node = walker.nextNode()) {
          // Ensure nodeValue exists and parent is not SCRIPT/STYLE or already highlighted/UI element
          if (node.nodeValue && node.parentNode && node.parentNode.nodeName !== 'SCRIPT' && node.parentNode.nodeName !== 'STYLE' && !node.parentNode.closest('.cc-highlight-red, .cc-highlight-yellow, #cybercoach-analysis-container')) {
            nodesToModify.push(node);
          }
        }
        // Process collected nodes
        nodesToModify.forEach(textNode => {
          let nodeContent = textNode.nodeValue;
          let matchFound = false;
          urgentKeywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'gi');
            if (regex.test(nodeContent)) {
              nodeContent = nodeContent.replace(regex, `<mark class="cc-urgent-highlight">$1</mark>`);
              matchFound = true;
            }
          });
          // Replace text node with a span containing the highlighted HTML
          if (matchFound && textNode.parentNode) {
            const replacementSpan = document.createElement('span');
            replacementSpan.innerHTML = nodeContent;
            textNode.parentNode.insertBefore(replacementSpan, textNode);
            textNode.parentNode.removeChild(textNode);
            // Note: This modifies the DOM structure. Cleanup requires replacing the span back.
          }
        });
      }
    }
  } catch (error) {
    console.error("Error applying urgent keyword highlights:", error);
  }
}

function createHighlightTooltip() {
  if (document.getElementById(HIGHLIGHT_TOOLTIP_ID)) return;
  const tooltip = document.createElement('div');
  tooltip.id = HIGHLIGHT_TOOLTIP_ID;
  tooltip.style.display = 'none'; // Initially hidden
  document.body.appendChild(tooltip);
  currentHighlightTooltipRef = tooltip;
}

function removeHighlightTooltip() {
  if (currentHighlightTooltipRef) {
    currentHighlightTooltipRef.remove();
    currentHighlightTooltipRef = null;
  }
  const existingTooltip = document.getElementById(HIGHLIGHT_TOOLTIP_ID);
  if (existingTooltip) {
    existingTooltip.remove();
  }
}

function showHighlightTooltip(event, element, message, riskLevel) {
  if (!currentHighlightTooltipRef) {
    createHighlightTooltip();
  }
  const sanitizedMessage = escapeHtml(message).replace(/\n/g, '<br>');
  currentHighlightTooltipRef.innerHTML = `<strong>${riskLevel === 'danger' ? 'Risque Élevé:' : 'Attention:'}</strong> ${sanitizedMessage}<button class="cc-tooltip-dismiss" title="Dismiss this highlight">×</button>`;

  const dismissBtn = currentHighlightTooltipRef.querySelector('.cc-tooltip-dismiss');
  if (dismissBtn) {
    dismissBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent event bubbling
      removeHighlight(element); // Call function to remove the highlight and tooltip
    };
  }

  // Position calculation
  const tooltipWidth = currentHighlightTooltipRef.offsetWidth;
  const tooltipHeight = currentHighlightTooltipRef.offsetHeight;
  let top = event.pageY + 15;
  let left = event.pageX + 10;

  // Adjust if tooltip goes off-screen
  if (left + tooltipWidth > window.innerWidth + window.scrollX) {
    left = event.pageX - tooltipWidth - 10;
  }
  if (top + tooltipHeight > window.innerHeight + window.scrollY) {
    top = event.pageY - tooltipHeight - 15;
  }
  if (left < window.scrollX) left = window.scrollX + 5;
  if (top < window.scrollY) top = window.scrollY + 5;

  currentHighlightTooltipRef.style.top = `${top}px`;
  currentHighlightTooltipRef.style.left = `${left}px`;
  currentHighlightTooltipRef.style.display = 'block';

  // Add visible class for transition
  requestAnimationFrame(() => {
    if (currentHighlightTooltipRef) {
      currentHighlightTooltipRef.classList.add('visible');
    }
  });
}

function hideHighlightTooltip() {
  if (currentHighlightTooltipRef) {
    currentHighlightTooltipRef.classList.remove('visible');
    // Set display to none after transition completes
    setTimeout(() => {
      if (currentHighlightTooltipRef && !currentHighlightTooltipRef.classList.contains('visible')) {
        currentHighlightTooltipRef.style.display = 'none';
      }
    }, 200); // Match transition duration in CSS
  }
}

function createExplanationModal() {
  if (document.getElementById(EXPLANATION_MODAL_ID)) return;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = EXPLANATION_MODAL_BACKDROP_ID;
  backdrop.onclick = hideExplanationModal; // Click backdrop to close
  document.body.appendChild(backdrop);
  currentExplanationBackdropRef = backdrop;

  // Modal
  const modal = document.createElement('div');
  modal.id = EXPLANATION_MODAL_ID;
  modal.innerHTML = `
    <button class="cc-modal-close" aria-label="Fermer l'explication">${ICONS.close}</button>
    <h4></h4>
    <div class="cc-modal-content"></div>
  `;
  modal.querySelector('.cc-modal-close').onclick = hideExplanationModal; // Click close button
  document.body.appendChild(modal);
  currentExplanationModalRef = modal;
}

function removeExplanationModal() {
  if (currentExplanationModalRef) {
    currentExplanationModalRef.remove();
    currentExplanationModalRef = null;
  }
  if (currentExplanationBackdropRef) {
    currentExplanationBackdropRef.remove();
    currentExplanationBackdropRef = null;
  }
  // Ensure removal if references lost
  const existingModal = document.getElementById(EXPLANATION_MODAL_ID);
  if (existingModal) existingModal.remove();
  const existingBackdrop = document.getElementById(EXPLANATION_MODAL_BACKDROP_ID);
  if (existingBackdrop) existingBackdrop.remove();
}

function showExplanationModal(riskKey) {
  if (!currentExplanationModalRef) {
    createExplanationModal();
  }

  const explanation = RISK_EXPLANATIONS[riskKey] || RISK_EXPLANATIONS['unknown'];
  const modalTitle = currentExplanationModalRef.querySelector('h4');
  const modalContent = currentExplanationModalRef.querySelector('.cc-modal-content');

  if (modalTitle) modalTitle.textContent = explanation.title;
  if (modalContent) modalContent.innerHTML = `<p>${highlightReason(explanation.text)}</p>`; // Use highlightReason for consistency

  // Show modal and backdrop
  currentExplanationBackdropRef.classList.add('visible');
  currentExplanationModalRef.classList.add('visible');
}

function hideExplanationModal() {
  if (currentExplanationBackdropRef) currentExplanationBackdropRef.classList.remove('visible');
  if (currentExplanationModalRef) currentExplanationModalRef.classList.remove('visible');
}

function displayUI(analysisResult) {
  removeUI(); // Clean up previous UI
  removeReShowButton();
  hideLoadingIndicator();

  lastAnalysisResult = analysisResult; // Store for re-showing

  const localResults = analysisResult.localResult;
  const aiAnalysisText = analysisResult.aiResult;
  const score = localResults.finalClampedScore;

  let statusText = '', statusClass = '', iconSvg = '', tipIconSvg = '';
  const SCORE_THRESHOLD_MODERATE = 40;
  const SCORE_THRESHOLD_DANGER = 60;

  // Determine status based on score
  if (score < SCORE_THRESHOLD_MODERATE) {
    statusText = 'Faible risque détecté';
    statusClass = 'secure';
    iconSvg = ICONS.checkCircle;
    tipIconSvg = ICONS.tipSecure;
  } else if (score < SCORE_THRESHOLD_DANGER) {
    statusText = 'Prudence Requise';
    statusClass = 'moderate';
    iconSvg = ICONS.warningTriangle;
    tipIconSvg = ICONS.tipModerate;
  } else {
    statusText = 'Danger Potentiel Élevé';
    statusClass = 'danger';
    iconSvg = ICONS.dangerHex;
    tipIconSvg = ICONS.tipDanger;
  }

  // Generate dynamic tips based on high-priority risks found
  let dynamicTips = new Set();
  const allReasons = [
    ...(localResults.senderReasons || []),
    ...(localResults.linkReasons || []),
    ...(localResults.contentReasons || []),
    ...(localResults.structureReasons || [])
  ];

  allReasons.forEach(reason => {
    const riskKey = getRiskKeyForReason(reason, null); // Try to get key without category first
    if (riskKey && HIGH_PRIORITY_RISK_KEYS.includes(riskKey)) {
      if (ACTIONABLE_TIPS[riskKey]) {
        dynamicTips.add(ACTIONABLE_TIPS[riskKey]);
      }
    }
  });

  // Add default tips if not enough specific high-priority ones were found
  if (dynamicTips.size < 2) {
    if (statusClass === 'danger') {
      dynamicTips.add(ACTIONABLE_TIPS['defaultDanger']);
      dynamicTips.add(ACTIONABLE_TIPS['contentSensitive']);
    } else if (statusClass === 'moderate') {
      dynamicTips.add(ACTIONABLE_TIPS['defaultModerate']);
      dynamicTips.add(ACTIONABLE_TIPS['senderMismatch']);
    } else {
      dynamicTips.add(ACTIONABLE_TIPS['defaultSecure']);
      dynamicTips.add(ACTIONABLE_TIPS['senderSuspiciousDomain']);
    }
  }
  const finalTips = Array.from(dynamicTips).slice(0, 3); // Max 3 tips


  const uiContainer = document.createElement('div');
  uiContainer.id = CYBERCOACH_UI_ID;
  uiContainer.classList.add(statusClass);

  // Prepare details HTML
  let detailsHtml = '';
  const { foundKeywords } = localResults;
  const keywordRiskKeys = { suspicious: 'contentSuspiciousKeywords', urgent: 'contentUrgent', sensitive: 'contentSensitive' };

  // Keywords Details
  if (foundKeywords && (foundKeywords.suspicious?.length || foundKeywords.urgent?.length || foundKeywords.sensitive?.length)) {
    detailsHtml += `<div class="cc-detail-item"><strong>Mots-clés détectés :</strong><ul>`;
    if (foundKeywords.suspicious?.length) {
      detailsHtml += `<li>${highlightReason(`<mark>Suspects:</mark> ${foundKeywords.suspicious.map(escapeHtml).join(', ')}`, keywordRiskKeys.suspicious)}</li>`;
    }
    if (foundKeywords.urgent?.length) {
      detailsHtml += `<li>${highlightReason(`<mark>Urgence:</mark> ${foundKeywords.urgent.map(escapeHtml).join(', ')}`, keywordRiskKeys.urgent)}</li>`;
    }
    if (foundKeywords.sensitive?.length) {
      detailsHtml += `<li>${highlightReason(`<mark class="high-risk">Sensibles:</mark> ${foundKeywords.sensitive.map(escapeHtml).join(', ')}`, keywordRiskKeys.sensitive)}</li>`;
    }
    detailsHtml += `</ul></div>`;
  }

  // Category Details
  detailsHtml += `
    <div class="cc-detail-item"><strong>Analyse Expéditeur (${localResults.senderScore.toFixed(0)}/${SCORE_WEIGHTS.SENDER}) :</strong><ul>${localResults.senderReasons.map(r => `<li>${highlightReason(r, getRiskKeyForReason(r, 'sender'))}</li>`).join('')}</ul></div>
    <div class="cc-detail-item"><strong>Analyse Liens (${localResults.linkScore.toFixed(0)}/${SCORE_WEIGHTS.LINKS}) :</strong><ul>${localResults.linkReasons.map(r => `<li>${highlightReason(r, getRiskKeyForReason(r, 'link'))}</li>`).join('')}</ul></div>
    <div class="cc-detail-item"><strong>Analyse Contenu (${localResults.contentScore.toFixed(0)}/${SCORE_WEIGHTS.CONTENT}) :</strong><ul>${localResults.contentReasons.map(r => `<li>${highlightReason(r, getRiskKeyForReason(r, 'content'))}</li>`).join('')}</ul></div>
    <div class="cc-detail-item"><strong>Analyse Structure (${localResults.structureScore.toFixed(0)}/${SCORE_WEIGHTS.STRUCTURE}) :</strong><ul>${localResults.structureReasons.map(r => `<li>${highlightReason(r, getRiskKeyForReason(r, 'structure'))}</li>`).join('')}</ul></div>
  `;

  // Construct main UI HTML
  uiContainer.innerHTML = `
    <div class="cc-header">
      <div class="cc-status-icon">${iconSvg}</div>
      <div class="cc-header-text">
        <div class="cc-status-title">${escapeHtml(statusText)}</div>
        <div class="cc-score-display">${score}<span>/100 (Local)</span></div>
      </div>
      <button class="cc-close-button" aria-label="Fermer">${ICONS.close}</button>
    </div>
    <div class="cc-tips-section">
      <strong>Conseils Rapides :</strong>
      <ul>${finalTips.map(t => `<li>${tipIconSvg}${escapeHtml(t)}</li>`).join('')}</ul>
    </div>
    <div class="cc-scrollable-content">
      <div class="cc-ai-section">
        <button id="cc-ask-ai-btn" aria-label="Demander une analyse IA approfondie">
          ${ICONS.aiSpark} Analyse IA (beta)
        </button>
        <div id="cc-api-key-section">
          <p>Entrez votre clé API Google Gemini :</p>
          <input type="password" id="cc-api-key-input" placeholder="Votre clé API Gemini">
          <button id="cc-save-api-key-btn">Sauvegarder</button>
          <p style="font-size:0.8em; margin-top: 5px;">Obtenez une clé sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. Clé stockée localement.</p>
        </div>
        <div id="cc-ai-results" style="display: none;">
          <div class="cc-ai-results-content"></div>
          <button id="cc-hide-ai-btn" style="display: none;" title="Masquer l'analyse IA">${ICONS.expandLess}</button>
        </div>
      </div>
      <button class="cc-expand-button" aria-expanded="false">Voir l'analyse locale détaillée ${ICONS.expandMore}</button>
      <div class="cc-details-wrapper">
        <div class="cc-details-content">${detailsHtml}</div>
      </div>
    </div>
    `;

  document.body.appendChild(uiContainer);
  currentUIRef = uiContainer; // Store reference

  // Get references to UI elements
  const scrollableContent = uiContainer.querySelector('.cc-scrollable-content');
  const expandButton = uiContainer.querySelector('.cc-expand-button');
  const detailsWrapper = uiContainer.querySelector('.cc-details-wrapper');
  const closeButton = uiContainer.querySelector('.cc-close-button');
  const aiButton = uiContainer.querySelector('#cc-ask-ai-btn');
  const apiKeySection = uiContainer.querySelector('#cc-api-key-section');
  const apiKeyInput = uiContainer.querySelector('#cc-api-key-input');
  const saveApiKeyButton = uiContainer.querySelector('#cc-save-api-key-btn');
  const aiResultsContainer = uiContainer.querySelector('#cc-ai-results');
  const aiResultsContent = uiContainer.querySelector('.cc-ai-results-content');
  const hideAiButton = uiContainer.querySelector('#cc-hide-ai-btn');

  // --- Add Event Listeners ---

  // Expand/Collapse Details
  if (expandButton && detailsWrapper) {
    expandButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = detailsWrapper.classList.toggle('visible');
      expandButton.classList.toggle('expanded');
      expandButton.setAttribute('aria-expanded', String(isVisible));
      expandButton.innerHTML = `${isVisible ? 'Masquer les détails locaux' : 'Voir l\'analyse locale détaillée'} ${isVisible ? ICONS.expandLess : ICONS.expandMore}`;
      if (scrollableContent) scrollableContent.style.overflowY = 'auto'; // Ensure scroll stays enabled
    });
  }

  // Close Button
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      removeUI();
      addReShowButton(); // Show the button to reopen
    });
  } else {
    console.error("Could not find the close button element!");
  }

  // AI Analysis Button & API Key Logic
  if (aiButton && aiResultsContainer && apiKeySection && apiKeyInput && saveApiKeyButton && hideAiButton && aiResultsContent) {
    // Ask AI Button
    aiButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      aiButton.disabled = true;
      aiButton.innerHTML = `<div class="cc-spinner" style="width:16px; height:16px; border-width: 3px; margin-right: 8px;"></div> Chargement IA...`;
      apiKeySection.style.display = 'none'; // Hide key section during request
      aiResultsContainer.style.display = 'block'; // Show results area
      aiResultsContent.innerHTML = `<div class="loading"><div class="cc-spinner"></div> Analyse par IA en cours...</div>`; // Show loading
      hideAiButton.style.display = 'none'; // Hide the hide button

      const key = await getApiKey();
      if (!key) {
        apiKeySection.style.display = 'block'; // Show key section if missing
        aiResultsContent.innerHTML = `<p class="error">Clé API Gemini manquante.</p>`;
        aiButton.innerHTML = `${ICONS.aiSpark} Analyse IA (beta)`;
        aiButton.disabled = false;
        return;
      }

      // Generate prompt and call API
      const prompt = generateGeminiPrompt(localResults);
      const aiResponse = await callGeminiApi(prompt, key);
      lastAnalysisResult.aiResult = aiResponse; // Store AI result

      // Update UI (using selectors that search the whole document in case the original references are stale)
      const currentAiResultsContent = document.getElementById('cc-ai-results')?.querySelector('.cc-ai-results-content');
      const currentHideAiButton = document.getElementById('cc-hide-ai-btn');

      if (currentAiResultsContent) {
        currentAiResultsContent.innerHTML = formatAiResult(aiResponse);
        if (currentHideAiButton && !aiResponse.toLowerCase().startsWith('erreur:')) {
          currentHideAiButton.style.display = 'flex'; // Show hide button if successful
        }
      }

      // Reset AI button state
      const currentAiButton = document.getElementById('cc-ask-ai-btn');
      if (currentAiButton) {
        currentAiButton.innerHTML = `${ICONS.aiSpark} Analyse IA (beta)`;
        currentAiButton.disabled = false;
      }

      // Re-apply highlights potentially using AI insights (though current implementation doesn't directly use AI result for highlighting)
      applyHighlights(lastAnalysisResult);
    });

    // Save API Key Button
    saveApiKeyButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      const keyToSave = apiKeyInput.value.trim();
      if (!keyToSave) {
        apiKeyInput.style.borderColor = 'red';
        return;
      }
      saveApiKeyButton.disabled = true;
      saveApiKeyButton.textContent = "Saving...";
      apiKeyInput.style.borderColor = ''; // Reset border

      const success = await saveApiKey(keyToSave);
      saveApiKeyButton.disabled = false;
      saveApiKeyButton.textContent = "Sauvegarder";

      const currentAiResultsContent = document.getElementById('cc-ai-results')?.querySelector('.cc-ai-results-content');
      if (!currentAiResultsContent) return; // Exit if container not found

      if (success) {
        apiKeySection.style.display = 'none'; // Hide section on success
        currentAiResultsContent.innerHTML = `<p style="color: green;">Clé sauvegardée. Cliquez sur "Analyse IA".</p>`;
        aiButton.disabled = false; // Re-enable AI button
        aiResultsContainer.style.display = 'block'; // Ensure results area is visible
        hideAiButton.style.display = 'none'; // Keep hide button hidden
      } else {
        currentAiResultsContent.innerHTML = `<p class="error">Erreur sauvegarde clé.</p>`;
        aiResultsContainer.style.display = 'block'; // Ensure results area is visible
        hideAiButton.style.display = 'none'; // Keep hide button hidden
      }
    });

    // Hide AI Button
    hideAiButton.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (aiResultsContainer) aiResultsContainer.style.display = 'none'; // Hide results
      if (aiButton) aiButton.style.display = 'flex'; // Show the Ask AI button again (might be redundant)
    });

  } else {
    console.error("Could not find AI UI elements!");
  }

  // Event listener for explanation icons within the scrollable content
  if (scrollableContent) {
    scrollableContent.addEventListener('click', (event) => {
      const target = event.target;
      // Check if the clicked element is an explanation icon
      if (target.classList.contains('cc-explain-risk')) {
        event.preventDefault();
        event.stopPropagation();
        const riskKey = target.getAttribute('data-risk-key');
        showExplanationModal(riskKey || 'unknown'); // Show modal with the corresponding risk key
      }
    });
  }

  // Make UI visible with animation
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (currentUIRef) {
        currentUIRef.classList.add('visible');
        // Apply initial highlights after UI is potentially visible
        applyHighlights({ localResult: localResults, aiResult: null });
      }
    }, 10);
  });
}

function getRiskKeyForReason(reasonText, category) {
  if (!reasonText) return null;
  const lowerReason = reasonText.toLowerCase();

  // More specific checks first
  if (lowerReason.includes('nom affiché') && (lowerReason.includes('différent') || lowerReason.includes('incohérent') || lowerReason.includes('mismatch'))) return 'senderMismatch';
  if (lowerReason.includes('no-reply') && lowerReason.includes('urgent')) return 'senderNoReplyUrgent';
  if (lowerReason.includes('texte lien') && (lowerReason.includes('différent') || lowerReason.includes('mismatch'))) return 'linkMismatch';
  if (lowerReason.includes('texte générique') && lowerReason.includes('cible suspecte')) return 'linkGenericTextSuspiciousTarget';
  if (lowerReason.includes('fichier') && lowerReason.includes('cloud générique')) return 'linkFileCloud';
  if (lowerReason.includes('mention') && lowerReason.includes('domaines différents')) return 'contentDomainMismatch';
  if (lowerReason.includes('copier/coller') || lowerReason.includes('copy/paste') || lowerReason.includes('taper un lien')) return 'structureCopyPasteLink';

  // General keyword checks
  if (lowerReason.includes('domaine générique') || lowerReason.includes('generic domain')) return 'senderGeneric';
  if ((category === 'sender' || category === 'link' || category === null) && (lowerReason.includes('domaine suspect') || lowerReason.includes('structure domaine suspecte') || lowerReason.includes('suspicious domain'))) return 'senderSuspiciousDomain'; // Can apply to sender or link
  if (lowerReason.includes('format expéditeur invalide') || lowerReason.includes('invalid sender format')) return 'senderInvalid';
  if (lowerReason.includes('redirection') || lowerReason.includes('tracking')) return 'linkRedirect';
  if (lowerReason.includes('lien raccourci') || lowerReason.includes('shortener')) return 'linkShortener';
  if (lowerReason.includes('adresse ip') || lowerReason.includes('ip address')) return 'linkIP';
  if (lowerReason.includes('tld suspect') || lowerReason.includes('suspicious tld')) return 'linkSuspiciousTLD';
  if (lowerReason.includes('non-https') || lowerReason.includes('non sécurisé')) return 'linkNonHTTPS';
  if (lowerReason.includes('chemin url suspect') || lowerReason.includes('suspicious path')) return 'linkSuspiciousPath';
  if (lowerReason.includes('paramètres url suspects') || lowerReason.includes('suspicious parameters')) return 'linkSuspiciousParams';
  if (lowerReason.includes('incohérence') || lowerReason.includes('inconsistency')) return 'linkInconsistency';
  if (lowerReason.includes('urgence') || lowerReason.includes('pression') || lowerReason.includes('urgent')) return 'contentUrgent';
  if (lowerReason.includes('sensible') || lowerReason.includes('sensitive') || lowerReason.includes('credentials')) return 'contentSensitive';
  if (lowerReason.includes('mots-clés suspects') || lowerReason.includes('suspicious keywords')) return 'contentSuspiciousKeywords';
  if (lowerReason.includes('salutation générique') || lowerReason.includes('generic greeting')) return 'contentGenericGreeting';
  if (lowerReason.includes('mise en forme') || lowerReason.includes('fautes') || lowerReason.includes('formatting')) return 'contentFormatting';
  if (lowerReason.includes('images') || lowerReason.includes('image-only')) return 'structureImageOnly';
  if (lowerReason.includes('texte caché') || lowerReason.includes('invisible text') || lowerReason.includes('hidden text')) return 'structureHiddenText';
  if (lowerReason.includes('obfuscation') || lowerReason.includes('caractères inhabituels') || lowerReason.includes('homoglyphes')) return 'structureObfuscation';

  return null; // No specific key found
}

function formatAiResult(aiText) {
  if (!aiText) return '';
  // Handle API errors first
  if (aiText.toLowerCase().startsWith('erreur:')) {
    return `<p class="error">${escapeHtml(aiText)}</p>`;
  }

  // Attempt to parse structured response
  const riskMatch = aiText.match(/(?:Niveau de Risque|Risk Level):\s*(Faible|Moyen|Élevé|Critique|Low|Medium|High|Critical)/i);
  const factorsMatch = aiText.match(/(?:Facteurs Clés|Key Factors):\s*([\s\S]*)/i);

  let formattedHtml = '';

  // Format Risk Level
  if (riskMatch) {
    const riskLevel = riskMatch[1];
    let riskColor = 'var(--cc-text-color)'; // Default
    if (/Moyen|Medium/i.test(riskLevel)) riskColor = 'var(--cc-yellow-darker)';
    if (/Élevé|High/i.test(riskLevel)) riskColor = 'var(--cc-red)';
    if (/Critique|Critical/i.test(riskLevel)) riskColor = 'var(--cc-red-darker)';
    formattedHtml += `<strong>Evaluation IA : <span style="color:${riskColor};">${escapeHtml(riskLevel)}</span></strong>`;
  } else {
    formattedHtml += `<strong>Evaluation IA :</strong>`; // Fallback if level not parsed
  }

  // Format Key Factors
  if (factorsMatch) {
    const factors = factorsMatch[1].trim().split(/-\s+/).filter(Boolean); // Split by "- "
    formattedHtml += `<ul>`;
    factors.forEach(factor => {
      const key = getRiskKeyForReason(factor, 'ai'); // Try to identify risk key for explanation icon
      formattedHtml += `<li>${highlightReason(factor.trim(), key)}</li>`;
    });
    formattedHtml += `</ul>`;
  } else {
    // Fallback: Display the raw text if structure not matched, but still try to highlight
    const key = getRiskKeyForReason(aiText, 'ai');
    formattedHtml += `<p>${highlightReason(aiText, key)}</p>`;
  }

  return formattedHtml;
}

function getEmailBodyElement() {
  if (currentPlatform === 'gmail') {
    // Prioritize the main content area, then fallbacks
    return document.querySelector('.ii.gt .a3s.aiL') // Normal view
      || document.querySelector('.ii.gt div[data-message-id]') // Sometimes needed
      || document.querySelector('.nH.hx .editable[aria-label="Message Body"]'); // Compose view? (Less likely needed here)
  } else if (currentPlatform === 'outlook') {
    // Try various selectors for Outlook's dynamic structure
    return document.querySelector('.allowTextSelection') // Common class for readable body
      || document.querySelector('[aria-label="Message body"]') // Accessibility label
      || document.querySelector('#UniqueMessageBody') // Older Outlook ID
      || document.querySelector('.WordSection1'); // Sometimes used for formatting
  }
  return document.body; // Ultimate fallback
}

function extractGmailData(messageContainerElement) {
    let sender = 'Unknown', subject = 'No Subject', bodyText = '', links = [], bodyHtml = '', extractedName = null, extractedEmail = null;
  
    if (!messageContainerElement) {
      console.warn("Gmail extraction: messageContainerElement is null.");
      return { sender, subject, links, bodyText, bodyHtml, emailData: { sender, subject, links } };
    }
  
    try {
      // --- Sender Extraction ---
      // Primary method: Look for container with specific attributes
      const senderContainer = messageContainerElement.querySelector('.gD') || messageContainerElement.querySelector('.sender-info'); // Adjust second selector if needed
      if (senderContainer) {
        const emailEl = senderContainer.querySelector('span[email]');
        const nameEl = senderContainer.querySelector('span[name]');
  
        if (emailEl) {
          extractedEmail = emailEl.getAttribute('email');
          extractedName = nameEl ? nameEl.getAttribute('name') : null;
          // Fallbacks for name if 'name' attribute missing but span exists
          if (!extractedName && nameEl && nameEl !== emailEl) extractedName = nameEl.innerText.trim();
          // Fallback if name is in the email span's text content itself
          if (!extractedName && emailEl.innerText.trim() && emailEl.innerText.trim() !== extractedEmail) extractedName = emailEl.innerText.trim();
  
          // Construct sender string based on what was found
          if (extractedName && extractedEmail && extractedName !== extractedEmail) {
            sender = `${extractedName} <${extractedEmail}>`;
          } else if (extractedEmail) {
            sender = extractedEmail;
          } else if (extractedName) {
            sender = extractedName; // Name only if email not found yet
          }
        } else {
          // Fallback if specific span[email] not found inside senderContainer: Parse innerText
          const potentialSenderText = senderContainer.innerText.trim();
          const emailMatchInText = potentialSenderText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatchInText) {
            extractedEmail = emailMatchInText[0];
            // Try to extract name from the rest of the text
            extractedName = potentialSenderText.replace(extractedEmail, '').replace(/[<>]/g, '').trim();
            if (extractedName && extractedName.length < 2) extractedName = null; // Avoid single characters as names
            sender = (extractedName && extractedName !== extractedEmail) ? `${extractedName} <${extractedEmail}>` : extractedEmail;
          } else if (potentialSenderText) {
            // Use the whole text if no email found, assume it's the name/sender
            sender = potentialSenderText;
            extractedName = sender;
          }
        }
      }
      // --- This complex fallback for nameOnlyEl was removed as it was syntactically incorrect and likely logically flawed ---
      // const nameOnlyEl = messageContainerElement.querySelector('h2.hP') ? . [Symbol.iterator]().next().value ? .querySelector('span[name]'); // Complex selector, might need adjustment
      // if(nameOnlyEl) { ... }
  
  
      // Last attempt to find email address if not found yet (e.g., in the '<...>' element like '.go')
      if (!extractedEmail) {
        const senderBracketEl = messageContainerElement.querySelector('.go');
        if (senderBracketEl) {
          const emailMatchInGo = senderBracketEl.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatchInGo) {
            extractedEmail = emailMatchInGo[0];
            // Reconstruct sender if name was found earlier but email wasn't
            if (extractedName && sender === extractedName && extractedName !== extractedEmail) {
              sender = `${extractedName} <${extractedEmail}>`;
            } else if (sender === 'Unknown' || sender === extractedName) {
              // Use email if sender is still unknown or just the name was found
              sender = extractedEmail;
            }
          }
        }
      }
  
      // --- Subject Extraction ---
      const subjectEl = messageContainerElement.querySelector('h2.hP') || document.querySelector('.hP'); // Check document level too as fallback
      if (subjectEl) {
        subject = subjectEl.innerText.trim();
      }
  
      // --- Body and Links Extraction ---
      const bodyContainerSelectors = [
        '.ii.gt div[data-message-id] .a3s.aiL', // Standard content area
        '.ii.gt', // Broader container if the above fails
        '.nH.hx .editable[aria-label="Message Body"]' // Compose view? (Less likely needed for analysis)
      ];
      let bodyEl = null;
      for (const selector of bodyContainerSelectors) {
        bodyEl = messageContainerElement.querySelector(selector);
        if (bodyEl) break; // Stop at first match
      }
  
      if (bodyEl) {
        // Clone to avoid modifying the live email, remove quotes/signatures
        const bodyClone = bodyEl.cloneNode(true);
        bodyClone.querySelectorAll('.gmail_quote, .gmail_extra, blockquote').forEach(quote => quote.remove()); // Remove common quote elements
  
        bodyText = bodyClone.innerText || '';
        bodyHtml = bodyClone.innerHTML || '';
  
        // Extract visible links from the original body element
        const linkElements = bodyEl.querySelectorAll('a[href]');
        linkElements.forEach(a => {
          // Check for valid, visible links (offsetParent check helps exclude hidden links)
          if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#') && !a.href.startsWith('mailto:') && a.offsetParent !== null) {
            const linkText = a.innerText.trim();
            links.push({ url: a.href, text: linkText });
          }
        });
      } else {
         console.warn("Gmail extraction: Could not find body element using selectors:", bodyContainerSelectors);
      }
  
    } catch (e) {
      console.error("Error during Gmail extraction:", e);
      // Provide best guess on error based on potentially partially extracted data
      sender = (extractedName && extractedEmail && extractedName !== extractedEmail) ? `${extractedName} <${extractedEmail}>` : (extractedEmail || extractedName || 'Error');
      subject = subject || 'Error';
      bodyText = bodyText || 'Error extracting body text.';
      links = links || [];
      bodyHtml = bodyHtml || 'Error extracting body HTML.';
    }
  
    // Final consistency check: If sender is just a name, but we found an email, prefer the email or combined format.
    if (sender === extractedName && extractedEmail && extractedName !== extractedEmail) {
        sender = `${extractedName} <${extractedEmail}>`;
    } else if (sender === 'Unknown' || (!sender.includes('@') && extractedEmail)) {
        // If sender is still 'Unknown' or just a name, but we have an email, use the email.
        sender = extractedEmail;
    }
  
  
    // Limit length to prevent issues with very large emails or potential performance hits
    return {
      sender,
      subject,
      links,
      bodyText: bodyText.substring(0, 8000), // Limit text for analysis
      bodyHtml: bodyHtml.substring(0, 15000), // Limit HTML for analysis
      emailData: { sender, subject, links } // Keep original short data for prompt generation if needed elsewhere
    };
  }

function extractOutlookData(containerElement) {
  let sender = 'Unknown', subject = 'No Subject', bodyText = '', links = [], bodyHtml = '';

  if (!containerElement) {
     console.warn("Outlook extraction: containerElement is null.");
    return { sender, subject, links, bodyText, bodyHtml, emailData: { sender, subject, links } };
  }

  try {
    // --- Sender Extraction --- (Try multiple selectors)
    const senderSelectors = [
      '[data-testid="sender-email-address"]', // Modern test ID
      '[data-testid="message-header-container"] span[title*="@"]', // Container with title attribute
      'button[role="button"] span span[title*="@"]', // Button containing sender
      'span[autoid*="SenderPersona"] span', // Auto ID pattern
      '.QXLj_ .Ljsqx', // Specific class names (might change)
      '#ConversationReadingPaneContainer span[title*="@"]' // Container ID
    ];
    for (const selector of senderSelectors) {
      const el = containerElement.querySelector(selector) || document.querySelector(selector); // Also check document level
      if (el) {
        const titleAttr = el.getAttribute('title');
        const innerText = el.innerText.trim();

        if (titleAttr && titleAttr.includes('@')) {
          sender = titleAttr; // Often contains "Name <email>"
          break;
        }
        if (innerText && innerText.includes('@')) {
          // If title didn't work, use innerText if it's an email
          sender = innerText;
          // Try to find associated name element
          const nameEl = el.closest('button')?.querySelector('span:not([title])') // Look in parent button
            || el.closest('[data-testid="message-header-container"]')?.querySelector('span:not([title])'); // Look in parent container
          if (nameEl && nameEl.innerText.trim() && nameEl.innerText.trim() !== innerText) {
            // If name found and different from email, combine them
            sender = `${nameEl.innerText.trim()} <${innerText}>`;
          }
          break;
        }
      }
    }
    // Fallback: Scan container text for any email if selectors failed
    if (sender === 'Unknown') {
      const emailMatch = containerElement.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        sender = emailMatch[0];
      }
    }

    // --- Subject Extraction ---
    const subjectSelectors = [
      '[data-testid="subject-content"]', // Modern test ID
      '.ZUq1I', // Class name (might change)
      '[data-app-subject]', // Data attribute
      'h1[id^="thread-subject"]', // ID pattern
      '.ConversationSubject', // Older class name
      '[aria-label^="Subject"]' // Accessibility label
    ];
    for (const selector of subjectSelectors) {
      const el = containerElement.querySelector(selector) || document.querySelector(selector);
      if (el && el.innerText.trim()) {
        subject = el.innerText.trim();
        break;
      }
    }

    // --- Body and Links Extraction ---
    const bodyContainerSelectors = [
      '.allowTextSelection', // Common content class
      '[aria-label="Message body"]', // Accessibility label
      '[role="document"] .PlainText', // Plain text view
      '#UniqueMessageBody', // Older ID
      '.rps_content', // Reply/Forward content class
      '.WordSection1' // Word-formatted email content
    ];
    let bodyContainer = null;
    for (const selector of bodyContainerSelectors) {
      bodyContainer = containerElement.querySelector(selector);
      if (bodyContainer) break;
    }
    // Fallback if specific selectors fail
    if (!bodyContainer) {
      bodyContainer = containerElement.querySelector('[role="document"]') || containerElement;
    }

    if (bodyContainer) {
      // Clone, remove headers/quotes
      const bodyClone = bodyContainer.cloneNode(true);
      bodyClone.querySelectorAll('.OutlookMessageHeader, #divRplyFwdMsg, blockquote, .protonmail_quote').forEach(quote => quote.remove()); // Add more quote selectors if needed

      bodyText = bodyClone.innerText || '';
      bodyHtml = bodyClone.innerHTML || '';

      // Extract visible links, resolving SafeLinks
      const linkElements = bodyContainer.querySelectorAll('a[href]');
      linkElements.forEach(a => {
        if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#') && !a.href.startsWith('mailto:') && a.offsetParent !== null) {
          const linkText = a.innerText.trim();
          let resolvedUrl = a.href;

          // Resolve Outlook SafeLinks
          if (a.href.includes("safelinks.protection.outlook.com")) {
            try {
              const urlParams = new URLSearchParams(new URL(a.href).search);
              if (urlParams.has('url')) {
                resolvedUrl = decodeURIComponent(urlParams.get('url'));
              }
            } catch (e) {
              console.warn("Failed to parse SafeLink URL:", a.href, e);
              // Keep original safelink URL if decoding fails
            }
          }
          links.push({ url: resolvedUrl, text: linkText });
        }
      });
    }
  } catch (e) {
    console.error("Error during Outlook extraction:", e);
    sender = sender !== 'Unknown' ? sender : 'Error';
    subject = subject !== 'No Subject' ? subject : 'Error';
    bodyText = 'Error extracting body text.';
    links = [];
    bodyHtml = '';
  }

  // Limit length
  return {
    sender,
    subject,
    links,
    bodyText: bodyText.substring(0, 8000),
    bodyHtml: bodyHtml.substring(0, 15000),
    emailData: { sender, subject, links }
  };
}

function performScoring(emailDataInput) {
  const emailData = emailDataInput; // Use the full extracted data

  let senderScore = 0, linkScore = 0, contentScore = 0, structureScore = 0;
  let senderReasons = [], linkReasons = [], contentReasons = [], structureReasons = [];
  let foundKeywords = { suspicious: [], urgent: [], sensitive: [] };
  let senderEmail = '', senderDomain = '';
  let totalLinksAnalyzed = 0, suspiciousLinkCount = 0;

  const { sender, subject, links, bodyText, bodyHtml } = emailData;
  const lowerBody = bodyText?.toLowerCase() || '';
  const lowerSubject = subject?.toLowerCase() || '';
  const detectedLang = lowerBody.match(/[àéèêâçùîïôû]/) || lowerSubject.match(/[àéèêâçùîïôû]/) ? 'fr' : 'en';

  // --- 1. Sender Scoring ---
  try {
    const emailRegex = /(?:["']?(.*?)["']?\s*)?<*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>*/;
    const senderMatch = sender?.match(emailRegex);
    let senderName = '';
    if (senderMatch && senderMatch[2]) { // Email address found
      senderEmail = senderMatch[2].toLowerCase();
      senderDomain = senderEmail.split('@')[1];
      senderName = senderMatch[1] ? senderMatch[1].trim().replace(/^["']|["']$/g, '') : ''; // Extract name part

      senderReasons.push(`Expéditeur: ${senderName ? `"${senderName}" <${senderEmail}>` : `<${senderEmail}>`}`);

      const isKnownSafe = KNOWN_SAFE_DOMAINS.some(safeDomain => senderDomain === safeDomain || senderDomain.endsWith('.' + safeDomain));
      const isGenericProvider = GENERIC_EMAIL_DOMAINS.includes(senderDomain);
      const domainParts = senderDomain.split('.');
      const tld = domainParts[domainParts.length - 1];
      // Determine main domain (e.g., 'google.com', 'service.co.uk')
      const mainDomainPart = domainParts.length > 2 && ['co', 'com', 'org', 'net', 'gov', 'ac'].includes(domainParts[domainParts.length - 2])
        ? domainParts.slice(-3).join('.')
        : domainParts.slice(-2).join('.');
      const secondLevelDomain = mainDomainPart.split('.')[0]; // e.g., 'google' from 'google.com'
      const commonTLD = ['com', 'org', 'net', 'io', 'app', 'fr', 'uk', 'de', 'ca', 'eu', 'gov', 'edu', 'mil'].includes(tld);

      if (isKnownSafe) {
        senderScore -= 15; // Reduce score for known safe domains
        senderReasons.push("Domaine expéditeur connu et fiable.");
      } else if (isGenericProvider) {
        senderScore += 15;
        senderReasons.push("<mark>Domaine expéditeur générique</mark> (gmail, outlook, etc.).");
        // Increase penalty if generic provider + suspicious content
        const urgentOrSensitiveKeywords = [...(KEYWORDS_URGENT[detectedLang] || []), ...(KEYWORDS_SENSITIVE_REQUEST[detectedLang] || [])];
        if (findKeywords(lowerSubject + lowerBody, urgentOrSensitiveKeywords).length > 0) {
          senderScore += 15;
          senderReasons.push("<mark>Domaine générique + contenu urgent/sensible = Très suspect</mark>");
        } else if (findKeywords(lowerSubject + lowerBody, KEYWORDS_SUSPICIOUS[detectedLang] || []).length > 3) {
          senderScore += 8;
          senderReasons.push("Domaine générique + multiples mots-clés suspects.");
        }
      } else { // Not known safe, not generic -> analyze domain structure
        const subdomainCount = domainParts.length - mainDomainPart.split('.').length;
        if (subdomainCount > 2) { // e.g., login.account.verify.example.com
          senderScore += commonTLD ? 8 : 12; // Higher penalty for non-common TLDs
          senderReasons.push(`<mark>Structure domaine suspecte</mark> (${subdomainCount} sous-domaines détectés avant ${mainDomainPart}).`);
        } else if (subdomainCount > 1) {
          senderScore += commonTLD ? 4 : 6;
          senderReasons.push("Structure domaine avec plusieurs sous-domaines.");
        }
        // Check for suspicious keywords in domain
        if (secondLevelDomain && DOMAIN_KEYWORDS_SUSPICIOUS.some(kw => secondLevelDomain.includes(kw))) {
          // Exception: Allow common service subdomains on standard TLDs (e.g., mail.google.com)
          const likelyServiceDomain = ['mail', 'email', 'support', 'service', 'help', 'secure', 'account', 'accounts', 'info', 'contact', 'noreply', 'client', 'customer'].includes(domainParts[0]);
          if (!(likelyServiceDomain && commonTLD)) { // Penalize if keyword is in non-service part or non-common TLD
            senderScore += 12;
            senderReasons.push(`<mark>Mot-clé suspect ('${escapeHtml(secondLevelDomain)}') dans le nom de domaine principal.</mark>`);
          } else { // Small penalty if service keyword is used strangely
            senderScore += 3;
            senderReasons.push(`Mot-clé type service ('${escapeHtml(domainParts[0])}') utilisé dans domaine non standard.`);
          }
        }
        // Check for numbers or hyphens in domain (can be legitimate, but slightly increases suspicion)
        if (/\d/.test(secondLevelDomain)) {
          senderScore += 6;
          senderReasons.push("Chiffres présents dans le nom de domaine principal.");
        }
        if (secondLevelDomain && secondLevelDomain.includes('-')) {
          senderScore += 4;
          senderReasons.push("Trait d'union présent dans le nom de domaine principal.");
        }
      }

      // Check for Name/Email Mismatch
      if (senderName && senderName.length > 1 && senderEmail) {
        const lowerSenderName = senderName.toLowerCase();
        const lowerEmailUserPart = senderEmail.split('@')[0];
        const lowerEmailDomainPart = senderDomain.split('.')[0];
        let nameMismatch = true;
        const nameWords = lowerSenderName.split(/[\s-_]+/);
        // Check if any part of the name relates to the email user/domain or known safe domains
        for (const word of nameWords) {
          if (word.length > 2 && (lowerEmailUserPart.includes(word) || lowerEmailDomainPart.includes(word) || KNOWN_SAFE_DOMAINS.some(safe => word.includes(safe.split('.')[0])))) {
            nameMismatch = false;
            break;
          }
        }
        // Allow standard terms like "Support" from known safe domains
        if (isKnownSafe && ['support', 'service', 'team', 'équipe', 'info', 'contact', 'noreply', 'no-reply', 'alert', 'security', 'accounts'].some(term => lowerSenderName.includes(term))) {
          nameMismatch = false;
        }
        // Penalize if mismatch detected and not clearly related
        if (nameMismatch && lowerSenderName !== lowerEmailUserPart && !KNOWN_SAFE_DOMAINS.some(safe => lowerSenderName.includes(safe.split('.')[0]))) {
          let mismatchPenalty = 15;
          if (isGenericProvider) mismatchPenalty += 5; // Higher penalty if generic + mismatch
          senderScore += mismatchPenalty;
          senderReasons.push(`<mark>Nom affiché ("${escapeHtml(senderName)}") semble différent/non lié à l'email</mark> (${senderEmail}). Risque d'usurpation.`);
        } else if (senderName === senderEmail) { // Slight penalty if name is just the email
          senderScore += 3;
          senderReasons.push(`Nom affiché est l'adresse email elle-même.`);
        }
      }

      // Check for No-Reply + Urgency
      if ((senderEmail.startsWith('noreply@') || senderEmail.startsWith('no-reply@')) && !isKnownSafe) {
        const urgentKeywords = KEYWORDS_URGENT[detectedLang] || [];
        if (findKeywords(lowerSubject + lowerBody, urgentKeywords).length > 0) {
          senderScore += 8;
          senderReasons.push(`<mark>Adresse "no-reply" (domaine non vérifié) + contenu urgent = suspect.</mark>`);
        } else {
          senderScore += 3; // Slight penalty for non-verified no-reply
          senderReasons.push(`Adresse de type "no-reply" (domaine non vérifié).`);
        }
      }

      // Check for Suspicious TLD
      if (SUSPICIOUS_TLDS.includes(`.${tld}`)) {
        let tldPenalty = 10;
        if (isGenericProvider) tldPenalty = 5; // Lower penalty if on generic domain (less common)
        senderScore += tldPenalty;
        senderReasons.push(`<mark>TLD (extension domaine) suspect sur l'expéditeur:</mark> .${tld}`);
      }

    } else { // No valid email address parsed from sender string
      senderScore += 30;
      senderReasons.push(`<mark>Format expéditeur invalide ou non reconnu.</mark>`);
    }
  } catch (e) {
    console.error("Sender Scoring Error:", e);
    senderScore += 10; // Add penalty on error
    senderReasons.push("Erreur technique analyse expéditeur.");
  }

  // --- 2. Link Scoring ---
  try {
    const analyzedTargets = {}; // Track final target domains to detect inconsistency
    // Define scoring constants
    const SCORE_REDIRECTOR = 8;
    const SCORE_UNKNOWN_REDIRECTOR = 12;
    const SCORE_CLOUD_HOSTED_ACTIVE_RISKY_FILE = 25;
    const SCORE_CLOUD_HOSTED_MACRO_FILE = 18;
    const SCORE_CLOUD_HOSTED_POTENTIAL_RISKY_FILE = 6;
    const SCORE_SUSPICIOUS_FRAGMENT = 8;
    const SCORE_IP_LINK = 20;
    const SCORE_MISMATCH = 15;
    const SCORE_SHORTENER = 10; // Reduced from 20, often used legitimately but still warrants check
    const SCORE_SUSPICIOUS_TLD = 12;
    const SCORE_SUSPICIOUS_PATH_KW = 7;
    const SCORE_SUSPICIOUS_PARAMS = 9;
    const SCORE_NON_HTTPS = 5; // Reduced from 10, HTTPS is standard but HTTP isn't always malicious alone
    const SCORE_EXCESSIVE_LENGTH = 4;
    const SCORE_GENERIC_TEXT_SUSPICIOUS_TARGET = 12;
    const SCORE_DOMAIN_STRUCTURE_ANOMALY = 7;
    const SCORE_LINK_INCONSISTENCY = 10;

    // Regex patterns
    const ipRegex = /^(?:https?:\/\/)?(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:[:\d]*)?(?:\/.*)?$/;
    // Look for common suspicious query params
    const queryParamRegex = /[?&](?:token|key|auth|session|user|usr|login|id|email|data|track|cid|uid|sid|ref|campaign|utm_|sig|hash|code|pwd|pass|pin|card|cvv|ssn)=/i;
    // Look for suspicious keywords in URL path
    const suspiciousPathRegex = /\/(?:login|signin|verify|update|confirm|secure|admin|account|billing|payment|recovery|reset|auth|session|credential|password|clk|track|out|redirect|goto)\b/i;
    // Detect Base64-like fragments (sometimes used for obfuscation)
    const base64FragmentRegex = /#[A-Za-z0-9+\/]{15,}={0,2}$/;
    // Detect generic redirect patterns in query params
    const redirectPattern = /[?&](?:url|redirect|goto|next|target|return|continue|ref)=https?%3A%2F%2F/i;

    links?.forEach(link => {
      totalLinksAnalyzed++;
      const originalUrl = link.url;
      const text = link.text ? link.text.trim() : '';
      let linkRiskScore = 0;
      let isHighlySuspicious = false;
      let urlToAnalyze = originalUrl;
      let redirectionReasonAdded = false;
      let finalTargetDomain = null;
      let intermediateDomains = [];

      try {
        // Basic URL validation
        if (!originalUrl || typeof originalUrl !== 'string' || (!originalUrl.startsWith('http:') && !originalUrl.startsWith('https:'))) {
          linkReasons.push(`Lien ignoré (format invalide ou protocole non http/s): ${escapeHtml(String(originalUrl).substring(0, 60))}...`);
          return; // Skip this link
        }

        // --- Resolve Redirects (limited depth) ---
        let currentUrl = originalUrl;
        let maxRedirects = 3;
        let resolvedTargetUrl = null; // Stores the URL found *after* a known redirector
        for (let i = 0; i < maxRedirects; i++) {
          let currentUrlObj;
          try {
            currentUrlObj = new URL(currentUrl);
          } catch (urlError) {
            linkRiskScore += 5;
            linkReasons.push(`URL invalide rencontrée (${i > 0 ? 'redirection' : 'initiale'}): ${escapeHtml(currentUrl.substring(0, 60))}...`);
            break; // Stop processing this redirect chain
          }
          const currentDomain = currentUrlObj.hostname.toLowerCase().replace(/^www\./, '');
          if (i > 0) intermediateDomains.push(currentDomain); // Track intermediate domains

          let foundRedirector = false;
          // Check against known redirectors/trackers
          for (const redirectorDomain in KNOWN_REDIRECTORS) {
            const isWildcard = redirectorDomain.startsWith('*.');
            const baseRedirectorDomain = isWildcard ? redirectorDomain.substring(1) : redirectorDomain;
            // Check if current domain matches a known redirector pattern
            if ((isWildcard && currentDomain.endsWith(baseRedirectorDomain)) || (!isWildcard && currentDomain === baseRedirectorDomain) || (redirectorDomain.endsWith('.') && currentDomain.startsWith(redirectorDomain))) {
              const paramName = KNOWN_REDIRECTORS[redirectorDomain];
              if (paramName) { // Redirector where target URL is in a parameter
                const params = new URLSearchParams(currentUrlObj.search);
                const target = params.get(paramName);
                if (target && (target.startsWith('http:') || target.startsWith('https:'))) {
                  resolvedTargetUrl = target; // Store the resolved target
                  if (!redirectionReasonAdded) {
                    linkRiskScore += SCORE_REDIRECTOR;
                    linkReasons.push(`<mark>Redirection connue détectée:</mark> via ${escapeHtml(currentDomain)}`);
                    redirectionReasonAdded = true;
                  }
                  currentUrl = resolvedTargetUrl; // Continue analysis with the target URL
                  foundRedirector = true;
                  break; // Exit inner loop, continue outer redirect loop
                } else { // Parameter missing or invalid
                  linkRiskScore += 3;
                  linkReasons.push(`Paramètre de redirection ('${paramName}') attendu mais manquant/invalide sur ${escapeHtml(currentDomain)}.`);
                  foundRedirector = true; // Stop processing this chain here
                  break;
                }
              } else if (paramName === null) { // Known tracker, no parameter expected (e.g., clicktrackers)
                if (!redirectionReasonAdded) {
                  linkRiskScore += 5; // Lower score than full redirector
                  linkReasons.push(`Service de tracking/clic connu utilisé: ${escapeHtml(currentDomain)}`);
                  redirectionReasonAdded = true;
                }
                foundRedirector = true;
                // Don't break the chain here, might be followed by another redirect
              }
            }
          }
          if (foundRedirector) continue; // Go to next iteration of redirect loop if known redirector handled

          // Check for generic redirect patterns if no known redirector matched
          if (redirectPattern.test(currentUrlObj.search)) {
            if (!redirectionReasonAdded) {
              linkRiskScore += SCORE_UNKNOWN_REDIRECTOR; // Higher score for unknown redirectors
              linkReasons.push(`<mark>Paramètre de redirection générique suspect</mark> détecté sur ${escapeHtml(currentDomain)}.`);
              redirectionReasonAdded = true;
            }
            // Try to extract target from generic pattern
            const genericTargetMatch = currentUrlObj.search.match(/[?&](?:url|redirect|goto|next|target|return|continue|ref)=(https?%3A%2F%2F[^&]+)/i);
            if (genericTargetMatch && genericTargetMatch[1]) {
              try {
                const decodedTarget = decodeURIComponent(genericTargetMatch[1]);
                if (decodedTarget.startsWith('http:') || decodedTarget.startsWith('https:')) {
                  currentUrl = decodedTarget; // Continue with decoded target
                  continue; // Go to next iteration of redirect loop
                }
              } catch (decodeError) { /* ignore decode error, stop processing */ }
            }
            break; // Stop processing this chain if generic redirect found but target extraction failed
          }

          break; // If no redirect found in this iteration, stop the redirect loop
        } // End redirect loop

        // --- Analyze Final URL ---
        urlToAnalyze = currentUrl; // This is the final URL after resolving redirects
        let finalUrlObj, domain, path, query, fragment;
        try {
          finalUrlObj = new URL(urlToAnalyze);
          domain = finalUrlObj.hostname.toLowerCase().replace(/^www\./, '');
          path = finalUrlObj.pathname;
          query = finalUrlObj.search;
          fragment = finalUrlObj.hash;
          finalTargetDomain = domain; // Store the final domain

          // Add note about the final target if redirection occurred
          if (resolvedTargetUrl && urlToAnalyze !== originalUrl) {
            linkReasons.push(` -> Cible finale analysée: ${escapeHtml(domain)}`);
          }
        } catch (urlError) { // If final URL is invalid
          linkRiskScore += 8;
          linkReasons.push(`<mark>URL finale invalide:</mark> ${escapeHtml(urlToAnalyze.substring(0, 60))}...`);
          linkScore += Math.max(linkRiskScore, 5); // Add score and skip rest of analysis for this link
          return;
        }

        // --- Perform Checks on the Final URL ---

        // Check for Cloud-Hosted Risky Files
        const lowerPath = path.toLowerCase();
        const fileExtMatch = lowerPath.match(/\.([a-z0-9]{2,5})(?=[?#]|$)/); // Match extension at end or before ? or #
        const fileExt = fileExtMatch ? fileExtMatch[0] : null;
        const matchesCloudDomain = GENERIC_CLOUD_HOSTING_DOMAINS.some(cloudDomain =>
          cloudDomain.startsWith('.') ? domain.endsWith(cloudDomain) : domain === cloudDomain
        );
        if (matchesCloudDomain && fileExt) {
          if (ACTIVELY_RISKY_FILE_EXTENSIONS.includes(fileExt)) {
            linkRiskScore += SCORE_CLOUD_HOSTED_ACTIVE_RISKY_FILE;
            isHighlySuspicious = true;
            linkReasons.push(`<mark>Fichier actif/script (${fileExt}) hébergé sur cloud générique (${escapeHtml(domain)})</mark>`);
          } else if (MACRO_ENABLED_EXTENSIONS.includes(fileExt)) {
            linkRiskScore += SCORE_CLOUD_HOSTED_MACRO_FILE;
            isHighlySuspicious = true;
            linkReasons.push(`<mark>Document Office avec macros (${fileExt}) hébergé sur cloud générique (${escapeHtml(domain)})</mark>`);
          } else if (POTENTIALLY_RISKY_FILE_EXTENSIONS.includes(fileExt)) {
            linkRiskScore += SCORE_CLOUD_HOSTED_POTENTIAL_RISKY_FILE;
            linkReasons.push(`Fichier potentiellement risqué (${fileExt}) hébergé sur cloud générique (${escapeHtml(domain)})`);
          }
        }

        // Check for IP Address Link
        if (ipRegex.test(domain)) {
          linkRiskScore += SCORE_IP_LINK;
          isHighlySuspicious = true;
          linkReasons.push(`<mark>Cible est une adresse IP:</mark> ${escapeHtml(domain)}`);
        }

        // Check for Text/Target Mismatch
        if (text && text.length > 3 && !text.startsWith('http') && !ipRegex.test(text)) {
          const textDomainMatch = text.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/); // Extract domain-like string from text
          if (textDomainMatch) {
            const textDomain = textDomainMatch[0].toLowerCase().replace(/^www\./, '');
            // Compare text domain with actual target domain
            if (domain !== textDomain && !domain.endsWith('.' + textDomain) && !textDomain.endsWith('.' + domain)) {
              const textIsKnownSafe = KNOWN_SAFE_DOMAINS.some(safe => textDomain === safe || textDomain.endsWith('.' + safe));
              const targetIsKnownSafe = KNOWN_SAFE_DOMAINS.some(safe => domain === safe || domain.endsWith('.' + safe));
              // Higher penalty if text looks safe but target isn't
              if (textIsKnownSafe && !targetIsKnownSafe) {
                linkRiskScore += SCORE_MISMATCH + 5;
                isHighlySuspicious = true;
                linkReasons.push(`<mark>Texte lien ("${escapeHtml(text.substring(0, 25))}...") imite domaine connu MAIS cible est différente/suspecte (${escapeHtml(domain)})</mark>`);
              } else { // Standard mismatch penalty
                linkRiskScore += SCORE_MISMATCH;
                isHighlySuspicious = true;
                linkReasons.push(`<mark>Texte lien ("${escapeHtml(text.substring(0, 25))}...") != Domaine cible final (${escapeHtml(domain)})</mark>`);
              }
            }
          } else if (['click here', 'update', 'verify', 'login', 'view details', 'access account', 'get started', 'download now', 'cliquez ici', 'mettre à jour', 'vérifier', 'connexion', 'voir détails', 'accéder', 'télécharger'].some(t => text.toLowerCase().includes(t))) {
            // Check if generic link text points to a suspicious target
            const targetIsSuspicious = SHORTENER_DOMAINS.some(sd => domain.endsWith(sd))
              || SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))
              || ipRegex.test(domain)
              || finalUrlObj.protocol !== 'https:'
              || queryParamRegex.test(query)
              || domain.split('.').length > 4; // More than 4 parts (e.g., a.b.c.d.com) is suspicious
            if (targetIsSuspicious) {
              linkRiskScore += SCORE_GENERIC_TEXT_SUSPICIOUS_TARGET;
              isHighlySuspicious = true;
              linkReasons.push(`<mark>Texte générique ("${escapeHtml(text)}") + Cible suspecte (${escapeHtml(domain)})</mark>`);
            }
          }
        }

        // Check for Link Shortener
        if (SHORTENER_DOMAINS.some(sd => domain.endsWith(sd))) {
          linkRiskScore += SCORE_SHORTENER;
          // Note: Don't mark as highly suspicious just for shortener, as redirect resolution attempts to find the real target.
          linkReasons.push(`Lien raccourci utilisé pour la cible: ${escapeHtml(domain)}`);
        }

        // Check for Suspicious TLD on Final Target
        const tldParts = domain.split('.');
        const tld = tldParts.length > 1 ? `.${tldParts[tldParts.length - 1]}` : '';
        if (tld && SUSPICIOUS_TLDS.includes(tld)) {
          linkRiskScore += SCORE_SUSPICIOUS_TLD;
          isHighlySuspicious = true;
          linkReasons.push(`<mark>TLD (extension domaine) suspect sur la cible:</mark> ${escapeHtml(tld)}`);
        }

        // Check Domain Structure Anomalies
        const domainStructureParts = domain.split('.');
        if (domainStructureParts.length > 4) { // e.g., very.long.sub.domain.example.com
          linkRiskScore += SCORE_DOMAIN_STRUCTURE_ANOMALY;
          isHighlySuspicious = true;
          linkReasons.push(`<mark>Structure domaine cible suspecte</mark> (trop de sous-domaines: ${domainStructureParts.length}).`);
        }
        if (domain.length > 70) { // Unusually long domain name
          linkRiskScore += SCORE_DOMAIN_STRUCTURE_ANOMALY / 2; // Lower penalty
          linkReasons.push(`Nom de domaine cible inhabituellement long (${domain.length} car.).`);
        }
        // Check for suspicious keywords in subdomains (excluding the main domain part)
        if (domainStructureParts.length > 2) {
          const subdomains = domainStructureParts.slice(0, -2).join('.'); // Get subdomains part
          if (DOMAIN_KEYWORDS_SUSPICIOUS.some(kw => subdomains.includes(kw))) {
            linkRiskScore += 5;
            linkReasons.push(`Mot-clé suspect dans les sous-domaines: ${escapeHtml(subdomains)}`);
          }
        }

        // Check for Non-HTTPS
        if (finalUrlObj.protocol !== 'https:') {
          linkRiskScore += SCORE_NON_HTTPS;
          linkReasons.push(`Cible non sécurisée (non-HTTPS): ${escapeHtml(urlToAnalyze.substring(0, 50))}...`);
        }

        // Check for Suspicious Path Keywords
        if (suspiciousPathRegex.test(path)) {
          linkRiskScore += SCORE_SUSPICIOUS_PATH_KW;
          linkReasons.push(`Mot-clé suspect dans chemin URL cible: ...${escapeHtml(path.substring(path.length - 30))}`);
        }

        // Check for Suspicious Query Parameters
        if (queryParamRegex.test(query)) {
          linkRiskScore += SCORE_SUSPICIOUS_PARAMS;
          isHighlySuspicious = true;
          linkReasons.push(`<mark>Paramètres URL suspects sur la cible:</mark> ${escapeHtml(query.substring(0, 40))}...`);
        }

        // Check for Suspicious URL Fragment (#...)
        if (fragment && fragment.length > 1) { // Ignore empty '#'
          // Check if fragment looks like query parameters or base64
          if (fragment.includes('=') || fragment.includes('&') || fragment.startsWith('#?') || base64FragmentRegex.test(fragment)) {
            linkRiskScore += SCORE_SUSPICIOUS_FRAGMENT;
            linkReasons.push(`<mark>Fragment URL (#...) contient structure suspecte (params/encodage):</mark> ${escapeHtml(fragment.substring(0, 40))}...`);
          }
        }

        // Check for Excessive URL Length
        if (urlToAnalyze.length > 250) {
          linkRiskScore += SCORE_EXCESSIVE_LENGTH;
          linkReasons.push(`URL cible très longue (${urlToAnalyze.length} caractères).`);
        }

        // --- Finalize score for this link ---
        linkScore += linkRiskScore;
        if (isHighlySuspicious) {
          suspiciousLinkCount++;
          // Track the target domain if it's highly suspicious
          const targetKey = finalTargetDomain || "invalid_domain";
          analyzedTargets[targetKey] = (analyzedTargets[targetKey] || 0) + 1;
        }

      } catch (e) {
        console.warn("Error analyzing link:", originalUrl, e);
        linkScore += Math.max(linkRiskScore, 5); // Add penalty on error
        linkReasons.push(`Erreur technique majeure durant l'analyse du lien: ${escapeHtml(originalUrl.substring(0, 50))}...`);
      }
    }); // End links.forEach

    // --- Post-Link Analysis ---

    // Check for Link Inconsistency (multiple links pointing to the same suspicious target)
    let inconsistencyPenaltyApplied = false;
    for (const targetDomain in analyzedTargets) {
      if (analyzedTargets[targetDomain] > 1 && !inconsistencyPenaltyApplied) {
        // Apply penalty if the target was already marked suspicious OR if > 2 links point there
        if (linkReasons.some(r => r.includes(targetDomain) && r.includes('<mark')) || analyzedTargets[targetDomain] > 2) {
          linkScore += SCORE_LINK_INCONSISTENCY;
          linkReasons.push(`<mark>Incohérence: ${analyzedTargets[targetDomain]} liens pointent vers la même cible potentiellement suspecte (${escapeHtml(targetDomain)}).</mark>`);
          inconsistencyPenaltyApplied = true; // Apply only once
          break;
        }
      }
    }

    // Add summary reason for links
    if (totalLinksAnalyzed === 0) {
      linkReasons.unshift("Aucun lien cliquable trouvé dans le corps de l'email.");
    } else {
      linkReasons.unshift(`${totalLinksAnalyzed} lien(s) analysé(s). ${suspiciousLinkCount} avec indicateur(s) de risque élevé.`);
      // Increase overall link score if multiple *highly* suspicious links found
      if (suspiciousLinkCount > 1) {
        const multiplier = 1 + (suspiciousLinkCount * 0.10); // Increase score by 10% per suspicious link
        linkScore *= Math.min(1.5, multiplier); // Cap multiplier at 1.5x
        linkReasons.push(`<mark>Multiples liens très suspects détectés - Risque global accru.</mark>`);
      }
    }
  } catch (e) {
    console.error("Link Scoring Error (Outer Block):", e);
    linkScore += 10; // Add penalty on major error
    linkReasons.push("Erreur technique majeure analyse liens.");
  }

  // --- 3. Content Scoring ---
  try {
    const bodyLength = lowerBody.length;
    const subjLength = lowerSubject.length;

    // Find Keywords
    foundKeywords.suspicious = findKeywords(lowerBody + lowerSubject, KEYWORDS_SUSPICIOUS[detectedLang]);
    foundKeywords.urgent = findKeywords(lowerBody + lowerSubject, KEYWORDS_URGENT[detectedLang]);
    foundKeywords.sensitive = findKeywords(lowerBody + lowerSubject, KEYWORDS_SENSITIVE_REQUEST[detectedLang]);

    // Score based on keyword counts (higher weight for sensitive)
    contentScore += foundKeywords.sensitive.length * 10;
    contentScore += foundKeywords.urgent.length * 6;
    contentScore += foundKeywords.suspicious.length * 2; // Lower weight for general suspicious keywords

    // Bonus penalty if multiple types of keywords are found
    let keywordTypesFound = (foundKeywords.sensitive.length > 0 ? 1 : 0) +
      (foundKeywords.urgent.length > 0 ? 1 : 0) +
      (foundKeywords.suspicious.length > 0 ? 1 : 0);
    if (keywordTypesFound >= 2) {
      contentScore += 6;
      contentReasons.push("<mark>Combinaison de types de mots-clés suspects détectée.</mark>");
    }

    // Add reasons based on keywords found
    if (foundKeywords.suspicious.length > 0) contentReasons.push(`${foundKeywords.suspicious.length} mot(s)-clé(s) potentiellement suspects trouvés.`);
    if (foundKeywords.urgent.length > 0) contentReasons.push(`${foundKeywords.urgent.length} terme(s) suggérant l'urgence ou la pression trouvés.`);
    if (foundKeywords.sensitive.length > 0) contentReasons.push(`<mark>${foundKeywords.sensitive.length} demande(s) potentielle(s) d'informations sensibles.</mark>`);

    // Check for Generic Greetings
    let genericGreetingCount = 0;
    if (bodyLength > 10) {
      GENERIC_GREETINGS.forEach(g => {
        if (lowerBody.substring(0, g.length + 5).startsWith(g.toLowerCase())) { // Check start of body
          genericGreetingCount++;
        }
      });
    }
    if (genericGreetingCount > 0) {
      contentScore += 5;
      contentReasons.push(`Salutation générique détectée (ex: "Cher client").`);
    }

    // Check for Domain Mentions inconsistent with Sender
    const bodyDomains = bodyText.match(/([a-zA-Z0-9-]+\.)+(com|org|net|io|co|uk|fr|de|eu|info|biz|us|ca|app|xyz|online|shop|store|tech|support)\b/gi) || [];
    const senderDomainLower = senderDomain?.toLowerCase();
    let domainMentionMismatch = 0;
    if (senderDomainLower && bodyDomains.length > 0) {
      const uniqueBodyDomains = [...new Set(bodyDomains.map(d => d.toLowerCase()))];
      uniqueBodyDomains.forEach(bd => {
        // Check if mentioned domain is different, not known safe, not generic, and not related to sender domain
        if (bd !== senderDomainLower && !KNOWN_SAFE_DOMAINS.includes(bd) && !GENERIC_EMAIL_DOMAINS.includes(bd)) {
          if (!senderDomainLower.endsWith('.' + bd) && !bd.endsWith('.' + senderDomainLower)) { // Basic relation check
            domainMentionMismatch++;
          }
        }
      });
    }
    if (domainMentionMismatch > 0) {
      contentScore += 7;
      contentReasons.push(`<mark>Mention dans le texte de ${domainMentionMismatch} domaine(s) différent(s) de l'expéditeur (${senderDomainLower}).</mark>`);
    }

    // Check for Poor Formatting / Typos
    let poorFormattingSigns = 0;
    // Simple checks for repeated punctuation or double spaces
    if (lowerBody.includes('  ') || lowerBody.includes('..') || lowerBody.includes(',,') || lowerBody.includes('!!') || lowerBody.includes('??')) poorFormattingSigns++;
    // Basic typo check for common phishing keywords (very simplistic)
    const typoWords = ['verify', 'confirm', 'account', 'password', 'login', 'security', 'payment', 'delivery', 'bank', 'credit'];
    let typoCount = 0;
    typoWords.forEach(word => {
      // Look for words that are *almost* the keyword (e.g., slight misspellings)
      const typoRegex = new RegExp(`\\b(${word.slice(0, -2)}[a-z]{1,3})\\b`, 'gi'); // Very basic check
      if (typoRegex.test(lowerBody)) typoCount++;
    });
    if (typoCount > 1) poorFormattingSigns++; // Count multiple potential typos
    if (poorFormattingSigns > 0) {
      contentScore += 4;
      contentReasons.push("Signes de mauvaise mise en forme ou fautes de frappe potentielles.");
    }

    // Check for Excessive Uppercase
    if (bodyLength > 100) {
      const uppercaseChars = bodyText.replace(/[^A-Z]/g, "").length;
      const alphaChars = bodyText.replace(/[^a-zA-Z]/g, "").length;
      if (alphaChars > 0 && (uppercaseChars / alphaChars > 0.5)) { // More than 50% uppercase
        contentScore += 5;
        contentReasons.push("Usage excessif de majuscules dans le texte.");
      }
    }

    // Check Subject Line Content
    if (subjLength > 5) {
      if (findKeywords(lowerSubject, KEYWORDS_URGENT[detectedLang]).length > 0) {
        contentScore += 4;
        contentReasons.push(`Sujet contient des termes d'urgence.`);
      }
      if (findKeywords(lowerSubject, KEYWORDS_SENSITIVE_REQUEST[detectedLang]).length > 0) {
        contentScore += 6;
        contentReasons.push(`<mark>Sujet demande potentiellement une action sensible.</mark>`);
      }
      // Check for fake reply/forward
      if (lowerSubject.includes('re:') || lowerSubject.includes('fw:')) {
        // If body doesn't contain typical forwarded/replied-to headers
        if (!bodyText.includes('From:') && !bodyText.includes('Sent:') && !bodyText.includes('To:') && !bodyText.includes('Subject:')) {
          contentScore += 5;
          contentReasons.push(`Sujet utilise "Re:" ou "Fw:" mais le corps ne ressemble pas à une réponse/transfert standard.`);
        }
      }
    }

    // Default reason if no content risks found
    if (contentScore <= 0 && contentReasons.length === 0) {
      contentReasons.push("Le contenu textuel ne présente pas d'indicateur de risque majeur analysé ici.");
    }

  } catch (e) {
    console.error("Content Scoring Error:", e);
    contentScore += 5; // Add penalty on error
    contentReasons.push("Erreur technique analyse contenu.");
  }

  // --- 4. Structure Scoring ---
  try {
    let obfuscationCount = 0, imageHeavy = 0, copyPasteInstruction = 0, invisibleText = 0;
    let unlinkedUrlCount = 0;
    let firstUnlinkedUrlExample = null;

    const bodyLength = bodyText?.length || 0;
    const htmlLength = bodyHtml?.length || 0;

    // Check for Obfuscation (Unusual Characters / Homoglyphs)
    // Count non-standard characters (very basic check)
    if (bodyLength > 30 && bodyText.replace(/[a-zA-Z0-9\s.,;!?'"()€$£%@#:_\-\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/gu, '').length > (bodyLength * 0.05)) {
      obfuscationCount++;
    }
    // Basic homoglyph check (Cyrillic chars resembling Latin)
    const homoglyphs = /[соаеірх]/g; // Cyrillic c, o, a, e, i, p, x
    const latinChars = /[coaeipx]/g; // Latin equivalents
    const homoglyphMatches = (bodyText.match(homoglyphs) || []).length;
    const latinMatches = (bodyText.match(latinChars) || []).length;
    // If homoglyphs are > 10% of similar Latin chars (and enough chars present)
    if (latinMatches > 10 && homoglyphMatches > (latinMatches * 0.1)) {
      obfuscationCount++;
    }
    if (obfuscationCount > 0) {
      structureScore += obfuscationCount * 5;
      structureReasons.push("Usage suspect de symboles, caractères non standards ou homoglyphes (obfuscation).");
    }

    // Check for Image-Heavy Email
    if (htmlLength > 500 && bodyLength < (htmlLength * 0.05)) { // Lots of HTML, very little text
      imageHeavy++;
      structureScore += 7;
      structureReasons.push("<mark>Structure: Contenu principalement composé d'images</mark> (très peu de texte réel).");
    } else if (htmlLength > 300 && bodyLength === 0) { // HTML exists but no text extracted
      imageHeavy++;
      structureScore += 10;
      structureReasons.push("<mark>Structure: Email semble contenir uniquement des images ou être vide.</mark>");
    }

    // Check for Unlinked URLs / Copy-Paste Instructions
    const urlPattern = /(?:https?:\/\/|www\.)[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|]/g;
    const codeBlockPattern = /<pre[^>]*>.*?<\/pre>|<code[^>]*>.*?<\/code>/gis; // Match code/pre blocks

    // Extract potential URLs from text and HTML (excluding those already in <a> tags)
    let textUrls = bodyText.match(urlPattern) || [];
    let htmlContentUrls = [];
    if (bodyHtml) {
      // Temporarily remove href content to avoid matching linked URLs here
      const tempHtml = bodyHtml.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>/gi, (match, href) => match.replace(href, '#removed_href#'));
      htmlContentUrls = tempHtml.match(urlPattern) || [];
    }
    const allPotentialTextUrls = [...new Set([...textUrls, ...htmlContentUrls])]; // Unique list

    if (allPotentialTextUrls.length > 0) {
      const linkedUrls = links.map(l => l.url); // Get URLs from extracted <a> tags

      for (const textUrl of allPotentialTextUrls) {
        // Check if this text URL is already present in a hyperlink
        const isLinked = linkedUrls.some(linkedUrl => {
          try { // Normalize slightly for comparison
            const normTextUrl = textUrl.replace(/^www\./, '').replace(/\/$/, '');
            const normLinkedUrl = linkedUrl.replace(/^www\./, '').replace(/\/$/, '');
            return normLinkedUrl.includes(normTextUrl) || normTextUrl.includes(normLinkedUrl);
          } catch { return false; } // Ignore comparison errors
        });

        if (!isLinked) {
          // Check if the context suggests copy/pasting
          let isInstruction = false;
          const contextIndex = bodyText.toLowerCase().indexOf(textUrl.toLowerCase());
          if (contextIndex > -1) {
            const contextBefore = bodyText.substring(Math.max(0, contextIndex - 40), contextIndex).toLowerCase();
            const contextAfter = bodyText.substring(contextIndex + textUrl.length, Math.min(bodyText.length, contextIndex + textUrl.length + 40)).toLowerCase();
            if (/\b(copy|paste|copier|coller|enter|entrez|type|tapez)\b/.test(contextBefore) || /\b(in your browser|dans votre navigateur)\b/.test(contextAfter)) {
              isInstruction = true;
            }
          }
          // Also check if URL is inside a code/pre block in HTML
          if (!isInstruction && bodyHtml && codeBlockPattern.test(bodyHtml) && bodyHtml.match(codeBlockPattern)?.some(block => block.includes(textUrl))) {
             isInstruction = true; // Treat URLs in code blocks as instructions
          }

          if (isInstruction) {
            copyPasteInstruction++;
          } else {
            unlinkedUrlCount++; // Just a plain text URL
            if (!firstUnlinkedUrlExample) {
              firstUnlinkedUrlExample = textUrl; // Store first example
            }
          }
        }
      }
    }
    // Add scores/reasons based on findings
    if (copyPasteInstruction > 0) {
      structureScore += 7 * copyPasteInstruction; // Higher penalty for explicit instructions
      structureReasons.push(`<mark>Structure: Suggestion de copier/coller ou taper un lien manuellement (${copyPasteInstruction} instance(s)).</mark>`);
    }
    if (unlinkedUrlCount > 0 && copyPasteInstruction === 0) { // Only add if no explicit instruction found
      structureScore += 3; // Lower penalty for just plain text URLs
      structureReasons.push(`URL présente en texte brut mais non cliquable (${unlinkedUrlCount > 1 ? `${unlinkedUrlCount} instances trouvées` : `ex: ${escapeHtml(firstUnlinkedUrlExample.substring(0, 40))}...`}).`);
    }

    // Check for Hidden Text (basic style check)
    if (bodyHtml) {
      // Look for common invisibility techniques: white text on white bg, zero font size
      if (/<span[^>]+style\s*=\s*["'][^"']*\b(?:color:\s*(?:#ffffff|white|#fefefe)|font-size:\s*(?:0|1)(?:px|pt))\b[^"']*["']/i.test(bodyHtml)) {
        invisibleText++;
        structureScore += 6;
        structureReasons.push("<mark>Structure: Texte potentiellement invisible ou caché détecté (styles suspects).</mark>");
      }
    }

    // Default reason if no structure risks found
    if (structureScore <= 0 && structureReasons.length === 0) {
      structureReasons.push("Structure de l'email semble standard.");
    }

  } catch (e) {
    console.error("Structure Scoring Error:", e);
    structureScore += 3; // Add penalty on error
    structureReasons.push("Erreur technique analyse structure.");
  }

  // --- 5. Final Score Calculation ---
  // Clamp scores to their respective weights (allow negative sender score for safe domains)
  const finalSenderScore = Math.min(SCORE_WEIGHTS.SENDER, Math.max(-15, senderScore));
  const finalLinkScore = Math.min(SCORE_WEIGHTS.LINKS, Math.max(0, linkScore));
  const finalContentScore = Math.min(SCORE_WEIGHTS.CONTENT, Math.max(0, contentScore));
  const finalStructureScore = Math.min(SCORE_WEIGHTS.STRUCTURE, Math.max(0, structureScore));

  // Add concluding remarks to reason lists if they are short
  if (senderReasons.length <= 1) senderReasons.push("Analyse expéditeur terminée.");
  if (linkReasons.length <= 1 && totalLinksAnalyzed > 0 && suspiciousLinkCount === 0) linkReasons.push("Aucun risque majeur détecté sur les liens analysés.");
  else if (linkReasons.length <= 1) linkReasons.push("Analyse liens terminée."); // Handles no links found case too
  if (contentReasons.length === 0) contentReasons.push("Analyse contenu terminée."); // Should have at least one reason due to default
  if (structureReasons.length === 0) structureReasons.push("Analyse structure terminée."); // Should have at least one reason

  // Calculate total score and clamp between 0 and 100
  const totalScore = finalSenderScore + finalLinkScore + finalContentScore + finalStructureScore;
  const finalClampedScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  return {
    senderScore: finalSenderScore, senderReasons,
    linkScore: finalLinkScore, linkReasons,
    contentScore: finalContentScore, contentReasons,
    structureScore: finalStructureScore, structureReasons,
    foundKeywords, // Include found keywords in the result
    finalClampedScore,
    emailData: emailData // Pass the full extracted data through
  };
}

function performAnalysis(platform, containerElement, messageElement) {
  if (isAnalyzing) {
    // console.log("Analysis already in progress, skipping.");
    return;
  }
  isAnalyzing = true;
  showLoadingIndicator();
  removeUI(); // Clean up previous results immediately
  removeReShowButton();
  if (analysisTimeoutId) clearTimeout(analysisTimeoutId);

  analysisTimeoutId = setTimeout(() => {
    try {
      let emailData;
      if (platform === 'gmail') {
        emailData = extractGmailData(messageElement);
      } else if (platform === 'outlook') {
        emailData = extractOutlookData(containerElement);
      } else {
        throw new Error("Unsupported platform for extraction");
      }

      // Basic validation of extracted data
      if (!emailData || !emailData.sender || emailData.bodyText === undefined) {
        console.error("Extraction failed:", emailData);
        throw new Error("Extraction failed to retrieve sender or body.");
      }

      // Perform the scoring
      const localAnalysisResults = performScoring(emailData);

      // Combine results (AI result is null initially)
      const fullAnalysisResult = {
        localResult: localAnalysisResults,
        aiResult: null
      };

      hideLoadingIndicator();
      displayUI(fullAnalysisResult); // Display results

    } catch (error) {
      console.error('CyberCoach: Error during local analysis steps:', error);
      hideLoadingIndicator(); // Hide loader on error
      removeUI(); // Ensure UI is removed on error
      // Optionally display an error message UI here
    } finally {
      isAnalyzing = false; // Reset analysis flag
      analysisTimeoutId = null;
    }
  }, ARTIFICIAL_DELAY_MS); // Artificial delay to allow UI to show loading
}

// --- Platform Detection and Observation ---

function platformDetectionCallback() {
  if (isAnalyzing) return; // Don't detect while analyzing

  let detectedContainer = null;
  let detectedMessageElement = null;
  let detectedId = null;
  let platform = null;
  let shouldAnalyze = false;
  let uniqueElement = null; // Element used to check if content is substantial

  try {
    if (currentPlatform === 'gmail') {
      // Selector for the main email view container in Gmail
      const viewSelector = 'div.adn.ads[data-legacy-message-id]'; // More specific selector
      const emailView = document.querySelector(viewSelector);

      if (emailView) {
        uniqueElement = emailView; // Use the container itself for content check
        const messageId = emailView.getAttribute('data-legacy-message-id');
        // Check if it's a new email and has substantial content
        if (messageId && messageId !== currentEmailId && uniqueElement && uniqueElement.innerText.length > 50) {
          detectedContainer = emailView;
          detectedMessageElement = emailView; // Pass the same element for extraction
          detectedId = messageId;
          platform = 'gmail';
          shouldAnalyze = true;
        }
      } else if (currentEmailId) {
        // Email view disappeared, reset state
        currentEmailId = null;
        removeUI();
        removeReShowButton();
        hideLoadingIndicator();
        cleanupHighlights();
        removeHighlightTooltip();
        removeExplanationModal();
      }
    } else if (currentPlatform === 'outlook') {
      // Try various selectors for the reading pane
      const readingPaneSelectors = [
        '[data-testid="readingPaneContainer"]', // Modern Outlook
        '.wide-content-host', // Another possible container
        '[role="main"] .scrollContainer', // Structure seen in some versions
        '[aria-label="Message body"]', // Check body element directly
        '.ContentPane' // Older class
      ];
      let readingPane = null;
      for (const selector of readingPaneSelectors) {
        readingPane = document.querySelector(selector);
        if (readingPane) break;
      }

      if (readingPane) {
        // Try to get a unique ID (conversation ID, message ID, or fallback to URL)
        const potentialIdAttr = readingPane.querySelector('[data-conversation-id]')?.getAttribute('data-conversation-id')
          || readingPane.querySelector('[data-message-id]')?.getAttribute('data-message-id');
        const potentialIdUrl = window.location.href; // Use URL as fallback ID
        const potentialId = potentialIdAttr || potentialIdUrl;

        // Find an element with substantial text content within the pane
        uniqueElement = readingPane.querySelector('.allowTextSelection') // Preferred body element
          || readingPane.querySelector('[aria-label="Message body"]')
          || readingPane; // Fallback to the pane itself

        // Check if ID is new and content exists
        if (potentialId && potentialId !== currentEmailId && uniqueElement && uniqueElement.innerText.length > 100) { // Increased length check for Outlook
          detectedContainer = readingPane;
          detectedMessageElement = uniqueElement; // Element containing the core message
          detectedId = potentialId;
          platform = 'outlook';
          shouldAnalyze = true;
        }
      } else if (currentEmailId) {
        // Reading pane disappeared, reset state
        currentEmailId = null;
        removeUI();
        removeReShowButton();
        hideLoadingIndicator();
        cleanupHighlights();
        removeHighlightTooltip();
        removeExplanationModal();
      }
    }

    // If a new email is detected, trigger analysis
    if (shouldAnalyze && platform && detectedId && detectedContainer && detectedMessageElement) {
      currentEmailId = detectedId;
      if (analysisTimeoutId) clearTimeout(analysisTimeoutId); // Clear any pending analysis
      performAnalysis(platform, detectedContainer, detectedMessageElement);
    }

  } catch (error) {
    console.error("CyberCoach: Error during platform detection callback:", error);
    isAnalyzing = false; // Ensure flag is reset on error
    if (analysisTimeoutId) clearTimeout(analysisTimeoutId);
  }
}

// Debounce the detection to avoid rapid firing on minor DOM changes
const debouncedPlatformDetection = debounce(platformDetectionCallback, 950); // Slightly longer debounce

function startObserver() {
  if (observerControl) { // Disconnect previous observer if exists
    observerControl.disconnect();
    observerControl = null;
  }

  // Create and configure the observer
  const observerInstance = new MutationObserver((mutationsList, observer) => {
    // Don't need to inspect mutationsList, just trigger the debounced detection
    debouncedPlatformDetection();
  });

  // Observe the body for subtree and child list changes
  try {
    observerInstance.observe(document.body, {
      childList: true, // Watch for added/removed nodes
      subtree: true    // Watch descendants as well
    });
    observerControl = { disconnect: () => observerInstance.disconnect() }; // Store control object
    console.log("CyberCoach MutationObserver started.");
  } catch (error) {
    console.error('Observer: FAILED TO START OBSERVING:', error);
    observerControl = null;
  }
  return observerControl;
}

// --- Initialization ---

function initCyberCoach() {
  console.log("CyberCoach: Initializing...");
  // Clear any pending timeouts
  if (initTimeout) { clearTimeout(initTimeout); initTimeout = null; }

  // Reset state
  removeUI();
  removeReShowButton();
  hideLoadingIndicator();
  cleanupHighlights();
  removeHighlightTooltip();
  removeExplanationModal();
  currentEmailId = null;
  isAnalyzing = false;
  if (analysisTimeoutId) { clearTimeout(analysisTimeoutId); analysisTimeoutId = null; }
  if (observerControl) { observerControl.disconnect(); observerControl = null; }
  lastAnalysisResult = null;

  try {
    // Detect platform based on hostname
    const hostname = window.location.hostname;
    if (hostname.includes('mail.google.com')) {
      currentPlatform = 'gmail';
    } else if (hostname.includes('outlook.')) { // Covers outlook.live.com, outlook.office.com, etc.
      currentPlatform = 'outlook';
    } else {
      currentPlatform = null;
      console.log("CyberCoach: Unsupported platform:", hostname);
    }

    // Start observer if on a supported platform
    if (currentPlatform) {
      console.log("CyberCoach: Detected platform:", currentPlatform);
      observerControl = startObserver();
      // Run initial detection shortly after observer starts
      setTimeout(platformDetectionCallback, 750);
    }
  } catch (error) {
    console.error("CyberCoach Pro: Error during init:", error);
    currentPlatform = null;
    if (observerControl) { // Ensure observer is stopped on error
      observerControl.disconnect();
      observerControl = null;
    }
  }
}

// Function to schedule initialization with a delay
function runInitialization(eventName = "Unknown") {
  // console.log(`CyberCoach: runInitialization triggered by: ${eventName}`);
  if (initTimeout) {
    clearTimeout(initTimeout);
  }
  // Use a longer delay on load/fallback, shorter for navigation events
  const delay = (eventName === 'window.load' || eventName === 'Fallback Timeout') ? 1200 : 600;
  initTimeout = setTimeout(() => {
    initCyberCoach();
  }, delay);
}

// --- Event Listeners for Initialization ---
// Trigger initialization on page load and navigation events

// Standard load event
window.addEventListener('load', () => runInitialization('window.load'));

// History API changes (Single Page Applications)
window.addEventListener('popstate', () => runInitialization('window.popstate'));
window.addEventListener('hashchange', () => runInitialization('window.hashchange'));

// Monkey-patch history.pushState and history.replaceState to detect SPA navigation
(function (history) {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function (state) {
    if (typeof history.onpushstate == "function") {
      history.onpushstate({ state: state });
    }
    runInitialization('history.pushState'); // Trigger re-init
    return pushState.apply(history, arguments);
  };

  history.replaceState = function (state) {
    if (typeof history.onreplacestate == "function") {
      history.onreplacestate({ state: state });
    }
    runInitialization('history.replaceState'); // Trigger re-init
    return replaceState.apply(history, arguments);
  };
})(window.history);

// Fallback initialization after a longer delay if nothing else triggered
setTimeout(() => {
  // Check if observer started, analysis running, or UI showing
  if (!observerControl && !isAnalyzing && !currentUIRef && !currentLoaderRef) {
    console.log("CyberCoach: Triggering fallback initialization.");
    runInitialization('Fallback Timeout');
  } else if (observerControl && !currentEmailId && !currentUIRef && !currentLoaderRef) {
    // If observer is running but no email detected yet, run detection again
    console.log("CyberCoach: Observer running, but no email detected. Triggering detection.");
    platformDetectionCallback();
  }
}, 5000); // 5-second fallback

// Pre-create persistent UI elements (Tooltip, Modal)
createHighlightTooltip();
createExplanationModal();

// Load API key on startup
getApiKey().then(key => {
  // console.log("CyberCoach: API Key loaded on init:", key ? "Found" : "Not Found");
});

console.log('CyberCoach Pro Content Script Execution Finished - v3.2');