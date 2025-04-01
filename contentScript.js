// console.log('Analy\'mail est chargé');

// ====== VARIABLES GLOBALES ======
// Variable pour suivre l'email actuel par ID
let currentEmailId = null;

// ====== FONCTION D'INITIALISATION PRINCIPALE ======
function init() {
//   console.log('Initialisation du détecteur d\'emails...');
  
  // Détection selon le domaine
  if (window.location.hostname.includes('mail.google.com')) {
    setupGmailObserver();
  } else if (window.location.hostname.includes('outlook')) {
    setupOutlookObserver();
  }
}

// ====== CONFIGURATION POUR GMAIL ======
function setupGmailObserver() {
  console.log('Observation de Gmail activée');
  
  // Définition des sélecteurs de contenu pour Gmail
  const contentSelectors = [
    '.a3s.aiL',                    // Contenu principal du mail dans Gmail
    '.adn.ads',                    // Conteneur alternatif pour le contenu
    '.gs',                         // Pour certains types de messages
    'div[role="presentation"]',    // Conteneur général qui peut contenir le contenu
    'iframe.editable'              // Iframe qui peut contenir le contenu
  ];
  
  const observer = new MutationObserver(() => {
    // ====== DÉTECTION D'EMAIL OUVERT GMAIL ======
    // Vérifions d'abord si nous sommes dans la vue d'un email ouvert
    // Ces sélecteurs ne sont présents que lorsqu'un email est réellement ouvert
    const isEmailView = document.querySelector('.adn.ads, .a3s.aiL');
    if (!isEmailView) return;
    
    // Récupérer l'ID de message dans le corps du message ou dans l'URL
    let messageId = null;
    
    // Essayer de trouver un ID dans l'URL
    const urlMatch = window.location.hash.match(/#inbox\/([^\/]+)/);
    if (urlMatch && urlMatch[1]) {
      messageId = '#msg-' + urlMatch[1];
    }
    
    // Si aucun ID dans l'URL, chercher un attribut data-message-id
    if (!messageId) {
      const container = document.querySelector('[data-message-id]');
      if (container) {
        messageId = container.getAttribute('data-message-id');
      }
    }
    
    // Ne pas utiliser les timestamps comme IDs pour éviter les faux positifs
    if (messageId && !messageId.includes('timestamp:') && messageId !== currentEmailId) {
      currentEmailId = messageId;
    //   console.log('Email ouvert sur Gmail détecté! ID:', messageId);
      
      // ====== EXTRACTION DE L'EXPÉDITEUR GMAIL ======
      const senderElements = document.querySelectorAll('.gD, [email], .bA4 span');
      let sender = 'Inconnu';
      
      for (const element of senderElements) {
        if (element.getAttribute('email')) {
          sender = element.getAttribute('email');
          break;
        } else if (element.textContent && element.textContent.trim() !== '') {
          sender = element.textContent.trim();
          break;
        }
      }
      
      // ====== EXTRACTION DU SUJET GMAIL ======
      const subjectElement = document.querySelector('.hP');
      const subject = subjectElement ? subjectElement.textContent.trim() : 'Sans objet';
      
      // ====== EXTRACTION DU CONTENU GMAIL ======
      const contentElement = document.querySelector('.a3s.aiL, .adn.ads');
      const content = contentElement ? contentElement.innerText.substring(0, 300) + '...' : 'Contenu non disponible';
      
      // ====== EXTRACTION DES LIENS GMAIL ======
    //   console.log('Recherche des liens...');
      const links = [];
      
      // Chercher les liens dans tous les conteneurs potentiels
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Si c'est une iframe, il faut accéder à son contenu
          if (element.tagName === 'IFRAME') {
            try {
              const iframeDocument = element.contentDocument || element.contentWindow.document;
              const iframeLinks = iframeDocument.querySelectorAll('a[href]');
              iframeLinks.forEach(link => {
                if (link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                  links.push(link.href);
                }
              });
            //   console.log('Liens trouvés dans une iframe');
            } catch (e) {
            //   console.log('Impossible d\'accéder aux liens de l\'iframe:', e);
            }
          } else {
            const linkElements = element.querySelectorAll('a[href]');
            linkElements.forEach(link => {
              if (link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                links.push(link.href);
              }
            });
            if (linkElements.length > 0) {
            //   console.log('Liens trouvés avec sélecteur:', selector);
            }
          }
        }
      }
      
      // ====== AFFICHAGE DES INFORMATIONS GMAIL ======
      try {
        console.log('Expéditeur:', sender);
        console.log('Sujet:', subject);
        console.log('Contenu (extrait):', content);
        console.log('Liste des liens:', links);
      } catch (e) {
        // Ne rien faire si le contexte est invalidé
      }
    }
  });
  
  // Observer les changements dans le document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ====== CONFIGURATION POUR OUTLOOK ======
function setupOutlookObserver() {
//   console.log('Observation d\'Outlook activée');
  
  const observer = new MutationObserver(() => {
    // ====== DÉTECTION D'EMAIL OUVERT OUTLOOK ======
    // Vérifions d'abord si nous sommes dans la vue d'un email ouvert
    const emailView = document.querySelector(
      '.readingPaneContentContainer, .ConversationReadingPaneContainer, [role="main"] [role="region"]'
    );
    
    if (emailView) {
      // Pour Outlook, on utilise l'URL comme identifiant, mais on filtre les URLs sans ID spécifique
      const currentUrl = window.location.href;
      
      // Vérifier que nous avons une URL qui contient un ID de message
      // Si l'URL est juste la racine d'Outlook, on ne la traite pas comme un email ouvert
      if (currentUrl !== currentEmailId && 
          !currentUrl.endsWith('/mail/') && 
          !currentUrl.endsWith('/inbox/')) {
        
        currentEmailId = currentUrl;
        
        // Ajouter un délai pour s'assurer que le contenu est chargé
        setTimeout(() => {
          try {
            // ====== EXTRACTION DE L'EXPÉDITEUR OUTLOOK ======
            let sender = 'Inconnu';
            
            // Amélioration: d'abord chercher dans le panneau de lecture spécifiquement
            const readingPane = document.querySelector('.readingPaneContentContainer, .ConversationReadingPaneContainer, [role="main"] [role="region"]');
            
            if (readingPane) {
              // Recherche plus ciblée des expéditeurs dans le panneau de lecture
              const senderElements = readingPane.querySelectorAll('*[title*="@"], [aria-label*="@"], [data-testid="fromEmail"], span[data-log-name="sender_email"]');
              
              for (const element of senderElements) {
                // Vérifier l'attribut title qui contient souvent l'email
                if (element.getAttribute('title') && element.getAttribute('title').includes('@')) {
                  const email = extractEmail(element.getAttribute('title'));
                  if (email) {
                    sender = email;
                    break;
                  }
                }
                
                // Vérifier le contenu textuel
                if (element.textContent && element.textContent.includes('@')) {
                  const email = extractEmail(element.textContent);
                  if (email) {
                    sender = email;
                    break;
                  }
                }
              }
              
              // Si on n'a toujours pas trouvé l'email, chercher dans toute la zone du panneau de lecture
              if (sender === 'Inconnu') {
                const readingPaneText = readingPane.innerText;
                const emailMatches = readingPaneText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
                if (emailMatches && emailMatches.length > 0) {
                  // Prendre la première adresse email trouvée dans le panneau de lecture
                  sender = emailMatches[0];
                }
              }
            }
            
            // ====== EXTRACTION DU SUJET OUTLOOK ======
            let subject = 'Sans objet';
            
            // Nouveaux sélecteurs plus larges pour le sujet, ciblés dans le panneau de lecture
            if (readingPane) {
              // Essayer d'abord les en-têtes, qui sont souvent utilisés pour les sujets
              const headings = readingPane.querySelectorAll('[role="heading"], h1, h2, h3, .lvHighlightSubjectClass, [data-testid="subjectField"], [data-app-subject]');
              
              for (const heading of headings) {
                if (heading.textContent && heading.textContent.trim() !== '' && 
                    // Exclure les en-têtes qui sont des boutons ou contrôles
                    !heading.querySelector('button, input') && 
                    // Exclure les en-têtes qui sont des expéditeurs
                    !heading.textContent.includes('@') &&
                    // Exclure les éléments trop petits ou trop grands
                    heading.textContent.trim().length > 3 && 
                    heading.textContent.trim().length < 150) {
                  
                  subject = heading.textContent.trim();
                  break;
                }
              }
              
              // Si toujours rien, essayer de chercher le sujet dans les attributs
              if (subject === 'Sans objet') {
                const elementsWithSubject = readingPane.querySelectorAll('[aria-label*="Objet"], [aria-label*="Subject"], [title*="Objet"], [title*="Subject"]');
                
                for (const element of elementsWithSubject) {
                  let potentialSubject = '';
                  
                  if (element.getAttribute('aria-label')) {
                    // Extraire uniquement la partie sujet de l'aria-label
                    const ariaLabel = element.getAttribute('aria-label');
                    const subjectMatch = ariaLabel.match(/(?:Subject|Objet):\s*([^,;]+)/i);
                    if (subjectMatch && subjectMatch[1]) {
                      potentialSubject = subjectMatch[1].trim();
                    } else {
                      potentialSubject = ariaLabel;
                    }
                  } else if (element.getAttribute('title')) {
                    potentialSubject = element.getAttribute('title');
                  }
                  
                  if (potentialSubject && 
                      potentialSubject.trim() !== '' && 
                      potentialSubject.length > 3 && 
                      potentialSubject.length < 150 &&
                      !potentialSubject.includes('@')) {
                    
                    subject = potentialSubject.trim();
                    break;
                  }
                }
              }
            }
            
            // ====== EXTRACTION DU CONTENU OUTLOOK ======
            //   console.log('Recherche du contenu...');
            const contentSelectors = [
              // Contenu principal
              '.message-body',
              '.eVwPT',
              '[role="document"]',
              '[data-testid="messageBody"]',
              // Conteneurs de contenu génériques
              '.readingPaneContent',
              '.allowTextSelection:not([data-app-subject])',
              // Contenu Iframe
              'iframe[aria-label*="Message"]',
              'iframe[aria-label*="message"]'
            ];
            
            let content = 'Contenu non disponible';
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                // Si c'est une iframe, il faut accéder à son contenu
                if (element.tagName === 'IFRAME') {
                  try {
                    const iframeContent = element.contentDocument || element.contentWindow.document;
                    content = iframeContent.body.innerText.substring(0, 300) + '...';
                //   console.log('Contenu trouvé dans une iframe');
                    break;
                  } catch (e) {
                //   console.log('Impossible d\'accéder au contenu de l\'iframe:', e);
                  }
                } else {
                  content = element.innerText.substring(0, 300) + '...';
                  // console.log('Contenu trouvé avec sélecteur:', selector);
                  break;
                }
              }
            }
            
            // ====== EXTRACTION DES LIENS OUTLOOK ======
            const links = [];
            
            // Chercher les liens dans tous les conteneurs potentiels
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                // Si c'est une iframe, il faut accéder à son contenu
                if (element.tagName === 'IFRAME') {
                  try {
                    const iframeDocument = element.contentDocument || element.contentWindow.document;
                    const iframeLinks = iframeDocument.querySelectorAll('a[href]');
                    iframeLinks.forEach(link => {
                      if (link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                        links.push(link.href);
                      }
                    });
                  } catch (e) {
                    // Ignorer les erreurs d'accès à l'iframe
                  }
                } else {
                  const linkElements = element.querySelectorAll('a[href]');
                  linkElements.forEach(link => {
                    if (link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                      links.push(link.href);
                    }
                  });
                }
              }
            }
            
            // ====== AFFICHAGE DES INFORMATIONS OUTLOOK ======
            // Envelopper tous les logs dans un try-catch pour éviter l'erreur de contexte invalidé
            try {
              console.log('Expéditeur:', sender);
              console.log('Sujet:', subject);
              console.log('Contenu (extrait):', content);
              console.log('Liste des liens:', links);
            } catch (e) {
              // Ne rien faire si le contexte est invalidé
            }
          } catch (e) {
            console.log('Erreur lors de l\'analyse de l\'email:', e);
          }
        }, 1000);
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true, // Observer aussi les changements d'attributs
    attributeFilter: ['class', 'aria-label', 'role'] // Limiter aux attributs importants
  });
}

// ====== INITIALISATION ET GESTION DES ÉVÉNEMENTS ======
// Initialisation avec différentes stratégies pour s'assurer que ça fonctionne
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', init);
// Démarrage différé pour laisser Gmail charger complètement
setTimeout(init, 1500);

// ====== SURVEILLANCE DES CHANGEMENTS D'URL ======
// Réinitialisation quand l'URL change
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    lastUrl = window.location.href;
    currentEmailId = null;
    setTimeout(init, 500);
  }
}).observe(document, {subtree: true, childList: true});

// Fonction d'extraction d'email que vous utilisez mais qui n'était pas définie
function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}