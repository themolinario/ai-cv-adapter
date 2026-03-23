# AI CV Adapter

A Claude Code skill that adapts your CV to a specific job offer, generating a professional Europass-style PDF — while keeping everything truthful.

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Node.js (v18+)
- `pdfimages` (from [poppler-utils](https://poppler.freedesktop.org/)) for extracting profile photos from PDFs

Install dependencies:

```bash
npm install
```

On macOS, install poppler if needed:

```bash
brew install poppler
```

## Usage

1. Open a terminal in this project directory.
2. Launch Claude Code:
   ```bash
   claude
   ```
3. Run the skill:
   ```
   /adapt-cv path/to/your-cv.pdf
   ```
4. When prompted, paste the job offer text.
5. Claude will:
   - Extract text and profile photo from your PDF
   - Rewrite and reorder your CV to match the job offer
   - Generate a professional Europass-style PDF
6. The output PDF path will be displayed when done.

## How It Works

The skill follows a pipeline:

1. **Extract** — Reads text from your CV using `pdf-parse` and extracts the profile photo with `pdfimages`.
2. **Adapt** — Rewrites the CV to highlight experiences and skills most relevant to the job offer. It reorders sections, rephrases descriptions, and adds matching keywords — but **never invents** skills or experiences.
3. **Generate** — Produces a structured JSON and renders it into a Europass-style PDF using Puppeteer.

## Key Rules

- Only truthful information from the original CV is used
- The output language matches the original CV language
- Experiences and skills are reordered by relevance to the job offer
- The professional summary is tailored to the target position

## Project Structure

```
.claude/commands/adapt-cv.md   # Skill definition
scripts/
  extract-pdf.mjs              # PDF text extraction
  generate-europass-pdf.mjs    # Europass PDF generation (Puppeteer)
  generate-pdf.mjs             # Basic PDF generation (pdf-lib)
```

## License

MIT
