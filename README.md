# CyberCoach Pro - Email Security Assistant  

## Overview  

CyberCoach Pro is a browser extension that performs real-time email analysis to detect phishing attempts and security risks. It combines advanced local scanning with AI-powered evaluation via Google Gemini to deliver actionable security insights.  

**Key Features**:  
- 🛡️ Real-time email analysis (Gmail/Outlook)  
- 🔍 Detection of 20+ risk indicators  
- 📊 Personalized risk scoring with detailed breakdown  
- 🤖 Gemini AI integration for contextual analysis  
- 🔦 Suspicious element highlighting  
- 🚨 Critical threat alerts  

## Evaluation Criteria  

### 1. Sender Analysis (40%)  
- Generic domains (@gmail, @outlook)  
- Name/email mismatch  
- Suspicious TLDs (.xyz, .top)  
- Invalid email format  

### 2. Link Analysis (25%)  
- URL shorteners (bit.ly)  
- Direct IP addresses  
- Text/target mismatch  
- Non-HTTPS protocol  
- Cloud-hosted risky files  

### 3. Content Analysis (25%)  
- Urgent/sensitive keywords  
- Spelling/grammar errors  
- Generic greetings  
- Alarmist language  

### 4. Structural Analysis (10%)  
- Image-only emails  
- Plaintext URLs  
- Hidden/invisible text  
- Copy-paste instructions  

## Risk Scoring  

Final Score = (Sender × 0.4) + (Links × 0.25) + (Content × 0.25) + (Structure × 0.1)  

**Risk Levels**:  
- 🔵 **Low** (<40): No major risks detected  
- 🟠 **Moderate** (40-60): Caution advised  
- 🔴 **High** (>60): Critical potential threat  

## Technical Workflow  

### 1. Initialization  
- Auto-detects Gmail/Outlock interfaces  
- Monitors DOM changes via MutationObserver  
- Loads analysis patterns  

### 2. Email Detection  
- Watches message containers  
- Verifies unique message IDs  
- Triggers analysis on content changes  

### 3. Data Extraction  
**Gmail**:  
- Sender: `<span email>`  
- Subject: `h2.hP`  
- Body: `.a3s.aiL`  

**Outlook**:  
- Sender: `[data-testid="sender-email-address"]`  
- Subject: `[data-testid="subject-content"]`  
- Body: `.allowTextSelection`  

### 4. Local Analysis  
- **Sender**: DNS validation, name/email consistency  
- **Links**: Redirect resolution, TLD analysis  
- **Content**: 150+ suspicious keyword patterns  
- **Structure**: HTML/CSS hidden element detection  

### 5. Results Display  
- Interactive dashboard with color-coded score  
- Expandable category details  
- Contextual element highlighting  
- Inline explanation tooltips  

### 6. AI Analysis (Optional)  
- Structured prompt generation  
- Gemini API calls  
- Natural language interpretation  
- Seamless UI integration  

### 7. Interaction Handling  
- Highlighted element clicks  
- Risk explanation modals  
- UI show/hide toggles  
- API key management  

## Gemini AI Integration  

1. Obtain API key from [Google AI Studio](https://aistudio.google.com/app/apikey)  
2. Paste into "AI Analysis" section  
3. Results appear within 2-15s  

**AI Capabilities**:  
- Contextual risk assessment  
- Natural language explanations  
- Complex pattern recognition  

## Privacy & Security  

- Zero data leaves your browser (Except for optional AI analysis)
- API keys stored locally  
- 100% client-side analysis (except optional AI)  

## License Summary

### ✅ Permissions
- Private use
- Modification
- Distribution (under the same license and conditions)

### ❌ Limitations
- No commercial use
- No liability
- No warranty

### ⚠️ Conditions
- All modifications must be made **publicly available within 30 days**, even if used privately.
- All modified versions must **credit the original author** and include a **link to the original repository**.
- This license file must be included with **all copies and modified versions**.

---

This project is provided under a **Custom Non-Commercial Open Share-Alike License**.  
This is not an OSI-approved open-source license.

For full terms, see the [LICENSE](./LICENSE) file.
