 🛡️ TRUSTGUARD AI
### AI-Powered Digital Threat Detection and Scam Awareness Platform

**TRUSTGUARD AI** is a web-based digital safety platform designed to help users identify potentially suspicious URLs, QR codes, messages, documents, and audio-based content. It analyzes submitted content for indicators of scams, phishing, impersonation, and other digital threats, then presents a risk assessment to support safer online decisions.

The project combines a modern web interface, a TypeScript-based API server, rule-based threat analysis, and external intelligence services where configured.

> **Important:** TRUSTGUARD AI is a decision-support tool, not a guarantee that content is safe or malicious. Always verify sensitive requests independently.

---

## 📌 Table of Contents

1. Project Overview
2. Problem Statement
3. Project Objectives
4. Key Features
5. Supported Analysis Categories
6. How the System Works
7. Technology Stack
8. System Architecture
9. Project Directory Structure
10. Prerequisites
11. Download the Project from GitHub
12. Install Dependencies
13. Configure Environment Variables
14. Database Configuration
15. Run the Application
16. Test the Application
17. API Overview
18. Risk Assessment and Results
19. Security and Privacy
20. Troubleshooting
21. Current Limitations
22. Future Enhancements
23. Contributing
24. License

---

## 1. Project Overview

Online scams and digital fraud increasingly use phishing links, fake websites, malicious QR codes, impersonation messages, suspicious documents, and fraudulent phone or audio conversations.

TRUSTGUARD AI aims to provide a centralized platform where users can submit supported content and receive an analysis of potential warning signs.

The system evaluates available evidence, identifies suspicious patterns, and returns a structured result. Depending on the analysis type and service configuration, results may include a risk score, risk classification, indicators, evidence, technical details, and external threat-intelligence information.

### Project Information

| Item | Details |
|---|---|
| Project name | TRUSTGUARD AI |
| Project category | AI-assisted digital security and scam detection |
| Application type | Web application with an API backend |
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, TypeScript |
| API framework | Express-based server |
| Package manager | pnpm |
| Database | PostgreSQL, configured through a connection URL |
| External URL intelligence | Google Safe Browsing, when configured |
| Audio transcription | OpenAI API, when configured |
| Repository | [CharithPulaganti/TRUSTGAURD](https://github.com/CharithPulaganti/TRUSTGAURD) |

---

## 2. Problem Statement

People regularly encounter digital content that may lead to financial loss, identity theft, credential theft, or social engineering attacks. Many users struggle to distinguish legitimate communication from convincing fraudulent content.

Common warning signs may be hidden in suspicious URLs, misleading domain names, unusual requests for money, threats of legal action, requests for one-time passwords, or documents containing deceptive instructions.

A unified, accessible tool can help users examine these warning signs before acting on potentially dangerous content.

**TRUSTGUARD AI addresses this problem by providing a centralized interface for analyzing supported digital content and explaining potential risk indicators.**

---

## 3. Project Objectives

- Identify potential warning signs in supported digital content.
- Analyze URLs for suspicious characteristics and available threat-intelligence matches.
- Extract and evaluate information from supported QR codes, documents, messages, and audio inputs.
- Present risk assessments and evidence in an understandable format.
- Help users recognize common scam and social-engineering patterns.
- Provide a modular application structure that can be tested and extended.
- Support safer digital decision-making without requiring users to interpret raw technical data themselves.

---

## 4. Key Features

### 🔗 URL Threat Analysis

Analyze a submitted URL for suspicious characteristics and potential threats.

Possible analysis inputs include:

- Unfamiliar or suspicious domains.
- Lookalike domain names and misleading URL patterns.
- Suspicious URL structures.
- Matches returned by an available external threat-intelligence service.

Google Safe Browsing integration can provide additional information about URLs when the service is configured correctly and the relevant API is available.

### 📱 QR Code Analysis

Submit an image containing a QR code for analysis.

The intended workflow is to extract the QR content, determine whether it contains a URL or other text, and evaluate the extracted content where supported.

A QR code should not be considered safe merely because it can be scanned successfully.

### 📝 Message and Scam Pattern Analysis

Analyze text for suspicious wording and potential social-engineering indicators.

Examples of warning signs include:

- Urgent demands for immediate action.
- Threats involving arrest or legal consequences.
- Requests for money or sensitive information.
- Attempts to impersonate trusted organizations.
- Unusual requests to disclose passwords or one-time passwords.

The analysis depends on the evidence present in the submitted text.

### 📄 Document Analysis

Submit supported documents, such as PDF or DOCX files, for analysis.

The system can examine available document content for suspicious wording and other supported indicators. Actual results depend on the file's readability, extraction support, and the implemented analysis pipeline.

A document that produces no suspicious indicators is not automatically guaranteed to be safe.

### 🎙️ Audio Analysis

The project includes an audio transcription workflow that uses the OpenAI API when configured.

The general process is to submit supported audio, obtain a transcription through the configured service, and analyze the resulting text for suspicious patterns.

Successful transcription depends on API access, available credits, supported file formats, and service limits.

### 📊 Risk Assessment

The API provides structured analysis results that can include a numerical score, risk level, indicators, and supporting evidence.

The score is an assessment generated by the application's analysis logic; it is not a verified probability that fraud will occur.

### 🌐 External Threat Intelligence

The backend can connect to Google Safe Browsing for supported URL checks.

External intelligence is an additional source of evidence. It may be unavailable, incomplete, delayed, or unable to recognize a newly created malicious resource.

### 🧾 Analysis History and Reports

The project contains API types and database structures for analysis history and report-related functionality. The availability of each history or report action depends on its implementation and configuration in the current version.

---

## 5. Supported Analysis Categories

| Category | Input | Purpose |
|---|---|---|
| URL analysis | Web address | Examine suspicious URL patterns and available external threat information |
| QR analysis | QR-containing image | Extract and evaluate encoded content |
| Text analysis | Message or text | Detect potential scam and social-engineering indicators |
| Document analysis | Supported PDF/DOCX | Examine extractable content for suspicious patterns |
| Audio analysis | Supported audio file | Transcribe audio and analyze its text, when API access is available |

Support for specific file formats, file sizes, and processing options depends on the implementation and server configuration.

---

## 6. How the System Works

The typical analysis workflow is:

1. **Input:** The user submits a URL, text, image, document, or supported audio file.
2. **Validation:** The application checks the submitted input and relevant request constraints.
3. **Extraction:** If required, the system extracts QR content, document text, or an audio transcription.
4. **Analysis:** The backend evaluates the available content using its implemented analysis logic.
5. **Threat intelligence:** Supported URL checks may query Google Safe Browsing.
6. **Risk assessment:** The system produces a structured result based on detected indicators and available evidence.
7. **Result display:** The frontend presents the analysis response to the user.

Not every input type follows every step. For example, audio transcription is only relevant to audio analysis.

---

## 7. Technology Stack

### Frontend

- **React** — component-based user interface.
- **TypeScript** — static typing and improved maintainability.
- **Vite** — frontend development and build tooling.
- **CSS** — application styling.
- **React UI components** — reusable interface elements.

### Backend

- **Node.js** — JavaScript runtime.
- **TypeScript** — backend application code.
- **Express** — HTTP API framework.
- **Zod-related API schemas** — structured validation and type definitions where used.
- **File upload utilities** — support for relevant uploaded inputs.
- **Threat-intelligence integration** — external URL checking where configured.

### Database and Shared Libraries

- **PostgreSQL** — configured database service.
- **Drizzle ORM tooling** — database schema and configuration support.
- **Shared API specifications** — OpenAPI and generated client/schema libraries.
- **pnpm workspaces** — management of packages across the repository.

### External Services

- **Google Safe Browsing API** — supported URL threat-intelligence checks.
- **OpenAI API** — audio transcription workflow, when configured.

---

## 8. System Architecture

The project uses a frontend/backend architecture.

```text
                 USER
                  |
                  v
       React + TypeScript Frontend
                  |
                  v
           Backend HTTP API
                  |
          +-------+--------+
          |                |
          v                v
   Input Processing   Threat Analysis
          |                |
          +-------+--------+
                  |
          +-------+--------+
          |                |
          v                v
   PostgreSQL DB     External Services
                     - Google Safe Browsing
                     - OpenAI API
                  |
                  v
         Structured API Response
                  |
                  v
        Results in the Frontend
```

The diagram represents the high-level design. Not every request necessarily uses the database or an external service.

---

## 9. Project Directory Structure

The repository is organized as a pnpm workspace.

```text
TRUSTGAURD/
├── artifacts/
│   ├── api-server/
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── lib/
│   │       │   ├── analysis.ts
│   │       │   ├── logger.ts
│   │       │   ├── threat-intelligence.ts
│   │       │   └── uploads.ts
│   │       ├── middlewares/
│   │       └── routes/
│   │           ├── health.ts
│   │           ├── index.ts
│   │           └── trustguard.ts
│   ├── mockup-sandbox/
│   └── trustguard-ai/
│       └── src/
│           ├── App.tsx
│           ├── components/
│           ├── hooks/
│           ├── lib/
│           └── pages/
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
├── scripts/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
├── replit.md
└── README.md
```

### Important Directories

- `artifacts/api-server/` — API server implementation, routes, analysis logic, upload handling, and threat-intelligence integration.
- `artifacts/trustguard-ai/` — primary TRUSTGUARD AI frontend application.
- `artifacts/mockup-sandbox/` — separate mockup/sandbox frontend.
- `lib/api-client-react/` — shared React API client.
- `lib/api-spec/` — API specification and related tooling.
- `lib/api-zod/` — generated API schemas and types.
- `lib/db/` — database connection and schema-related code.
- `scripts/` — utility scripts.

---

## 10. Prerequisites

Install the following before running the project:

1. **Git** — to clone the repository.
2. **Node.js** — use a compatible Node.js 22 release as the initial setup target.
3. **pnpm** — package manager used by the repository.
4. **PostgreSQL** — if the features you are running require the configured database.
5. **API credentials** — only for integrations that you intend to use.

Verify the installations in PowerShell:

```powershell
git --version
node --version
npm --version
```

Check whether pnpm is installed:

```powershell
pnpm --version
```

If pnpm is not installed, enable Corepack if your Node.js installation supports it:

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

Then verify:

```powershell
pnpm --version
```

If Corepack is unavailable, install a compatible pnpm version using the official pnpm installation instructions.

---

## 11. Download the Project from GitHub

### Option A: Clone using Git (recommended)

Open PowerShell and move to the directory where you want to store the project:

```powershell
cd D:\real_time_projects
```

Clone the repository:

```powershell
git clone https://github.com/CharithPulaganti/TRUSTGAURD.git
```

Move into the project folder:

```powershell
cd TRUSTGAURD
```

Confirm that you are in the correct folder:

```powershell
Get-Location
```

Check the downloaded files:

```powershell
Get-ChildItem
```

### Option B: Download the ZIP file

1. Open [the TRUSTGAURD GitHub repository](https://github.com/CharithPulaganti/TRUSTGAURD).
2. Click the **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file to a convenient directory.
5. Open PowerShell in the extracted `TRUSTGAURD` folder.

ZIP downloads do not include Git history and are less convenient when you want to pull updates later.

---

## 12. Install Dependencies

Make sure your terminal is in the repository root — the directory containing `package.json` and `pnpm-lock.yaml`.

Install the workspace dependencies:

```powershell
pnpm install
```

Use the lockfile to maintain consistent dependency versions. If installation fails, read the first error carefully and verify your Node.js and pnpm versions.

### Inspect Available Commands

Before starting the application, inspect the scripts defined in the root package:

```powershell
Get-Content package.json
```

You can also list available root scripts with:

```powershell
pnpm run
```

Inspect the frontend and backend package scripts:

```powershell
Get-Content artifacts\trustguard-ai\package.json
Get-Content artifacts\api-server\package.json
```

These files are the source of truth for the exact development, build, and test commands.

---

## 13. Configure Environment Variables

The backend uses environment variables for settings such as the server port, database connection, and external API credentials.

### Create Your Local Environment File

If the project includes an `.env.example` file, copy it to `.env` and fill in the required values:

```powershell
Copy-Item .env.example .env
```

If the repository does not include `.env.example`, create a local `.env` file using the variable names expected by the actual backend code.

Never copy private API keys, passwords, or database credentials into `README.md`.

### Environment Variable Reference

| Variable | Purpose |
|---|---|
| `PORT` | Port used by the API server; the local configuration has used `5000` |
| `DATABASE_URL` | PostgreSQL connection URL |
| Google Safe Browsing API key | Enables supported external URL threat checks |
| OpenAI API key | Enables the configured audio transcription workflow |

The exact variable names for the external API keys must match the names read by the backend source code. Confirm those names in the relevant integration files before setting them.

### Example `.env` Structure

Use this only as a structural example; substitute the actual variable names and your own credentials.

```dotenv
PORT=5000
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/trustguard

# Add the exact Google Safe Browsing variable name expected by the backend.
# GOOGLE_SAFE_BROWSING_API_KEY=YOUR_OWN_KEY

# Add the exact OpenAI variable name expected by the backend.
# OPENAI_API_KEY=YOUR_OWN_KEY
```

Do not commit the populated `.env` file.

The repository's `.gitignore` is intended to exclude environment files and private agent memory. Before pushing changes, verify that secrets remain untracked:

```powershell
git check-ignore -v .env
git status --short
```

If an actual secret has ever been committed or pushed, removing the file in a later commit is not sufficient. Revoke or rotate the exposed credential.

---

## 14. Database Configuration

The project contains PostgreSQL connection and schema-related code under `lib/db/`.

If the application requires PostgreSQL:

1. Install and start PostgreSQL.
2. Create a database for the project.
3. Configure `DATABASE_URL` in `.env`.
4. Inspect the database package and its Drizzle configuration.
5. Use the migration or schema commands defined in the actual package scripts.
6. Start the backend and verify that it can connect to the database.

Do not assume that creating the database alone creates all required tables.

Inspect the available database scripts:

```powershell
Get-Content lib\db\package.json
Get-Content lib\db\drizzle.config.ts
```

The exact migration or schema-push command depends on the scripts and configuration in the checked-out version. Run only the command documented by those files.

---

## 15. Run the Application

TRUSTGUARD AI contains a frontend and an API server. They may need to run as separate processes during local development.

### Step 1: Open the Project Root

```powershell
cd D:\real_time_projects\TRUSTGAURD
```

### Step 2: Install Dependencies

```powershell
pnpm install
```

### Step 3: Configure the Environment

Create and populate `.env` as described in Section 13.

### Step 4: Start the API Server

Inspect the scripts in:

```powershell
Get-Content artifacts\api-server\package.json
```

Use the development command defined in that package. For example, if its script is named `dev`, the command would be:

```powershell
pnpm --dir artifacts/api-server run dev
```

The `dev` script must exist for that command to work. If it does not, use the actual script name shown in the package file.

### Step 5: Start the Frontend

Open a second PowerShell terminal and navigate to the project root:

```powershell
cd D:\real_time_projects\TRUSTGAURD
```

Inspect the frontend scripts:

```powershell
Get-Content artifacts\trustguard-ai\package.json
```

If the frontend defines a `dev` script, start it with:

```powershell
pnpm --dir artifacts/trustguard-ai run dev
```

Vite normally prints a local URL in the terminal. Open the URL that Vite actually displays.

### Step 6: Verify the API

Inspect the health route in `artifacts/api-server/src/routes/health.ts` to confirm the exact health endpoint.

If the route is `/health` and the server is listening on port `5000`, you can test it with:

```powershell
Invoke-RestMethod http://localhost:5000/health
```

Use the real endpoint and port if they differ from this example.

### Step 7: Use the Application

Once the frontend and API are running:

1. Open the local frontend URL printed by Vite.
2. Select a supported analysis category.
3. Submit a test URL, message, QR image, document, or supported audio file.
4. Review the risk assessment and indicators.
5. Check the API terminal if an error occurs.

Keep both development terminals open while using the application.

---

## 16. Test the Application

The repository includes an analysis test file at:

`artifacts/api-server/src/lib/analysis.test.mjs`

Inspect the backend package scripts to determine the configured test command:

```powershell
Get-Content artifacts\api-server\package.json
```

If a test script is defined, run the corresponding command from the repository root. For example, if the package script is `test`:

```powershell
pnpm --dir artifacts/api-server run test
```

Do not assume this command exists until you confirm the package script.

### Suggested Manual Test Cases

| Test case | Example | Expected testing goal |
|---|---|---|
| Ordinary text | A normal, non-urgent message | Check for appropriate handling of low-evidence content |
| Suspicious URL | A synthetic lookalike domain | Check URL indicators and scoring |
| QR code | A QR image encoding a URL | Verify extraction and downstream analysis |
| Plain-text QR | A QR image encoding ordinary text | Check how non-URL QR content is handled |
| Invalid image | An unsupported or malformed image | Verify validation and error handling |
| Suspicious document | A synthetic document containing scam indicators | Check text extraction and analysis |
| Digital-arrest-style scam | A synthetic threat message | Check recognition of relevant social-engineering indicators |
| Audio input | A supported test recording | Verify transcription and text analysis when API access is available |

Use synthetic test data and safe example content. Do not test by opening suspicious links or sharing real credentials.

A test result is evidence about that test case, not proof that the system detects every threat.

---

## 17. API Overview

The API implementation is primarily under:

`artifacts/api-server/src/routes/`

The repository contains route modules for health checks and TRUSTGUARD functionality.

The following table describes the route modules; exact HTTP paths, methods, request schemas, and response bodies should be confirmed from the current source code.

| Route module | Purpose |
|---|---|
| `health.ts` | Health-check functionality |
| `trustguard.ts` | TRUSTGUARD analysis functionality |
| `index.ts` | Route organization and registration |

The shared API specification is available under `lib/api-spec/`, with generated API types under `lib/api-zod/` and the React client under `lib/api-client-react/`.

For the exact endpoints and payloads, consult the route implementation and OpenAPI specification rather than relying on guessed URLs.

---

## 18. Understanding Risk Assessment Results

The application uses an analysis pipeline to evaluate available evidence and return structured results.

Depending on the input type and implemented checks, results may include:

- Risk score.
- Risk classification.
- Detected indicators.
- Evidence supporting an indicator.
- Technical analysis information.
- External intelligence status.
- Error or validation details.

### How to Interpret Results

**Higher-risk results:** Review the identified warning signs carefully. Avoid interacting with the content until it has been independently verified.

**Lower-risk results:** A low score means the current analysis found limited evidence of risk. It does not prove that the content is legitimate.

**Insufficient evidence:** The system may be unable to establish a reliable conclusion from the supplied input.

**External service unavailable:** A missing external result does not mean that a URL is safe. It means that the relevant external check did not provide usable information.

Risk scores are generated by the implemented analysis logic and should not be interpreted as calibrated fraud probabilities unless the model has been explicitly validated for that purpose.

---

## 19. Security and Privacy

Security is especially important for a platform that accepts URLs, documents, images, messages, and audio.

### Protect Credentials

- Keep `.env` private.
- Never publish API keys or database passwords.
- Use separate development credentials where possible.
- Rotate credentials if they are accidentally exposed.
- Provide an `.env.example` containing placeholders, not working secrets.

### Handle Uploaded Files Carefully

- Validate file types and sizes on the server.
- Reject malformed or unsupported files safely.
- Avoid trusting file extensions alone.
- Avoid executing uploaded content.
- Apply suitable file-processing timeouts and resource limits.
- Keep dependencies and file-processing libraries updated.

### Handle User Data Responsibly

- Avoid collecting unnecessary personal information.
- Do not send sensitive documents or recordings to external services without an appropriate reason and user awareness.
- Understand the privacy policies and retention practices of any external service used.
- Restrict access to logs and stored analysis data.
- Ensure that error messages do not expose credentials or internal configuration.

### Verify URLs Safely

Do not automatically open, navigate to, or execute content from an untrusted URL as part of analysis. External checks should be designed to reduce the risk of server-side request forgery and unintended network access.

---

## 20. Troubleshooting

### `pnpm` is not recognized

Verify Node.js and pnpm installations:

```powershell
node --version
pnpm --version
```

If pnpm is missing, install or enable it using the official instructions.

### Dependency installation fails

Run the command from the repository root:

```powershell
pnpm install
```

Check the first error for Node.js version incompatibility, network issues, or missing dependencies.

### The frontend cannot connect to the backend

- Confirm that the backend is running.
- Check the backend port.
- Inspect the frontend's API base URL configuration.
- Check browser developer tools for network errors.
- Verify that the backend allows requests from the frontend origin.

### PostgreSQL connection fails

- Confirm that PostgreSQL is running.
- Verify the database name and credentials.
- Check the `DATABASE_URL` format.
- Confirm that the database and required schema exist.
- Inspect backend logs for connection errors.

### Google Safe Browsing returns an error

- Confirm that the API key is configured under the variable name expected by the code.
- Verify that the service is enabled for the relevant Google Cloud project.
- Check quotas, restrictions, and network connectivity.

### Audio transcription fails

- Confirm that the OpenAI API key is configured correctly.
- Check the account's API access and available credits.
- Verify supported audio formats and upload limits.
- Review the backend error message without printing secret values.

### Port already in use

If the configured port is occupied, stop the other process or change the port to an available value supported by the application.

### Git reports a secret in a commit

Stop before pushing. Remove the secret from the tracked history as appropriate, rotate the exposed credential, and verify that the secret is not included in the next commit.

---

## 21. Current Limitations

- Threat detection can produce false positives and false negatives.
- Newly created malicious resources may not appear in external threat databases.
- Analysis quality depends on the submitted content and the available evidence.
- Document analysis depends on text extraction and file compatibility.
- Audio analysis depends on transcription quality, API availability, and account limits.
- External services may have rate limits, usage charges, or outages.
- A low-risk result cannot guarantee that content is safe.
- Database-dependent functionality requires correct database configuration.
- Features described in the documentation should be verified against the currently deployed build.

---

## 22. Future Enhancements

Potential future improvements include:

- Additional threat-intelligence providers.
- Improved multilingual scam detection.
- Stronger domain and URL reputation analysis.
- Enhanced document and QR extraction.
- More robust audio transcription and scam-pattern analysis.
- Better explanations of individual risk indicators.
- Expanded automated tests and evaluation datasets.
- Improved observability and safe error reporting.
- Privacy-conscious analysis history and reporting.
- Deployment automation and monitoring.

These are possible improvements, not a claim that every feature is already implemented.

---

## 23. Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Run the relevant tests.
5. Review the changes for accidental secrets and generated files.
6. Submit a pull request describing the change and its testing.

Example:

```powershell
git checkout -b feature/your-feature
git add .
git diff --cached
git commit -m "Describe your change"
git push -u origin feature/your-feature
```

Before staging all files, verify `.gitignore` and review the changes to ensure `.env`, private credentials, and private memory files are not included.

---

## 24. License

A license has not been specified in this README. Check the repository for an existing license before reusing or redistributing the project.

If you intend to publish the project for public reuse, choose an appropriate license and add a `LICENSE` file.

---

## 👨‍💻 Author and Repository

**Project:** TRUSTGUARD AI  
**GitHub:** [CharithPulaganti/TRUSTGAURD](https://github.com/CharithPulaganti/TRUSTGAURD)

Built to help users identify potential digital threats and make more informed online decisions.

**Stay alert. Verify before you trust.**
