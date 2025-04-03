# Don't Click! - Email Security Assistant  

## Overview  

Don't Click! is a browser extension that performs real-time email analysis to detect phishing attempts and security risks. It combines advanced local scanning with AI-powered evaluation via Google Gemini to deliver actionable security insights.  

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

### 3. Data Extraction Process  

Automatically extracts and analyzes email metadata using platform-specific DOM selectors. The extracted data includes:  

#### **1. Sender Information**  
- **Email Address**: Parses the sender's full email (e.g., `"John Doe" <john.doe@gmail.com>`)  
- **Name/Email Mismatch Check**: Compares the displayed name with the actual email domain  
- **Domain Analysis**: Identifies generic (Gmail/Outlook) vs. custom domains  

#### **2. Subject Line**  
- Extracts the full subject text  
- Flags urgency/sensitivity keywords (e.g., "Urgent Action Required")  

#### **3. Email Body**  
- **Text Content**: Extracts visible plaintext (ignoring signatures/quoted text)  
- **HTML Structure**: Analyzes formatting anomalies (e.g., hidden divs, excessive images)  

#### **4. Links & Attachments**  
- **Hyperlinks**:  
  - Resolves redirects (e.g., Outlook SafeLinks → final URL)  
  - Checks for:  
    - Shorteners (bit.ly)  
    - IP addresses (192.168.1.1)  
    - HTTPS vs. HTTP  
    - Mismatched link text (e.g., "Bank Login" → phishing.site)  
- **Attachments**:  
  - Flags executable files (.exe, .js)  
  - Detects cloud-hosted documents (Google Drive, Dropbox)  

---  

### AI-Powered Analysis (Gemini Integration)  
  

1. Obtain API key from [Google AI Studio](https://aistudio.google.com/app/apikey)  
2. Paste into "AI Analysis" section  
3. Results appear within 2-15s  

**AI Capabilities**:  
- Contextual risk assessment  
- Natural language explanations  
- Complex pattern recognition  

### Risk Calculation Algorithm  

#### **1. Scoring Weights**  
| Category       | Weight | Max Sub-Score |  
|----------------|--------|--------------|  
| **Sender**     | 40%    | 40           |  
| **Links**      | 25%    | 25           |  
| **Content**    | 25%    | 25           |  
| **Structure**  | 10%    | 10           |  

#### **2. Dynamic Adjustments**  
- **Multiplier Effects**:  
  - `Sender (Generic) + Urgent Keywords` → +15% penalty  
  - `3+ Suspicious Links` → +10% per link  
- **Thresholds**:  
  - **High Risk**: Triggered if any critical flaw (e.g., IP link + sensitive data request)  

#### **3. Final Score**  
```  
score = min(100, max(0,  
  (sender_score * 0.4) +  
  (link_score * 0.25) +  
  (content_score * 0.25) +  
  (structure_score * 0.1)  
))  
```  

---  

### UI Rendering Logic  

#### **1. Highlight Engine**  
- **Elements Flagged**:  
  - Suspicious senders (yellow/red border)  
  - Risky links (pulsing red underline)  
  - Urgent keywords (orange background)  
- **Tooltips**: On hover, shows:  
  ```  
  [!] High Risk: Link points to .xyz domain (expected: paypal.com)  
  ```  

#### **2. Modal Explanations**  
- **Risk Details**: Clicking "?" icons reveals:  
  ```  
  Why .xyz domains are risky:  
  - Frequently used for phishing (low cost, no verification)  
  - 78% of phishing sites use non-standard TLDs (2023 Data)  
  ```  

#### **3. Performance Optimizations**  
- **Debounced Analysis**: Delays scan until 500ms after email open  
- **Selective Rescan**: Only rechecks modified elements  

---  

### Error Handling  

| Scenario                | Fallback Action                     |  
|-------------------------|-------------------------------------|  
| DOM changes mid-scan    | Restarts analysis                   |  
| Gemini API failure      | Shows local-only results            |  
| Corrupted email HTML    | Uses text fallback with warnings    |  

---  

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
