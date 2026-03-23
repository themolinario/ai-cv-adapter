import puppeteer from "puppeteer";
import { readFileSync } from "fs";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Usage: node generate-europass-pdf.mjs <output-path.pdf>");
  process.exit(1);
}

const data = JSON.parse(readFileSync("/tmp/adapted-cv.json", "utf-8"));

// Convert images to base64
const photoBase64 = readFileSync(data.photo).toString("base64");

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const experienceHtml = data.experience
  .map(
    (exp) => `
  <div class="experience-item avoid-break">
    <div class="company-line">
      <span class="dot"></span>
      <strong>${escapeHtml(exp.company)}</strong> <span class="location">${escapeHtml(exp.location)}</span>
    </div>
    <div class="exp-content">
      <div class="role-title">${escapeHtml(exp.role)}</div>
      <div class="dates-link">${escapeHtml(exp.dates)}</div>
      <p>${escapeHtml(exp.description)}</p>
      ${
        exp.libraries
          ? `<ul class="lib-list">${exp.libraries.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
          : ""
      }
    </div>
  </div>`
  )
  .join("");

const educationHtml = data.education
  .map(
    (edu) => `
  <div class="education-item avoid-break">
    <div class="edu-dates"><span class="date-bar"></span>${escapeHtml(edu.dates)} <span class="location">${escapeHtml(edu.location)}</span></div>
    <div class="edu-content">
      <span class="dot-sm"></span>
      <strong>${escapeHtml(edu.title)}</strong> <span class="institution">${escapeHtml(edu.institution)}</span>
      ${edu.grade ? `<div class="grade"><strong>Final grade</strong> ${escapeHtml(edu.grade.replace("Final grade ", ""))}</div>` : ""}
      ${edu.credentialId ? `<div class="grade"><strong>Credential ID</strong> ${escapeHtml(edu.credentialId)}</div>` : ""}
      ${edu.website ? `<div class="edu-website"><strong>Website</strong> <a href="${escapeHtml(edu.website)}">${escapeHtml(edu.website)}</a></div>` : ""}
      ${edu.address ? `<div class="edu-address"><strong>Address</strong> ${escapeHtml(edu.address)}</div>` : ""}
    </div>
  </div>`
  )
  .join("");

const langTableRows = data.languages.other
  .map(
    (lang) => `
  <tr class="lang-header"><td colspan="5"><strong>${escapeHtml(lang.name)}</strong></td></tr>
  <tr class="lang-values">
    <td><span class="lang-label">Listening</span> ${lang.listening}</td>
    <td><span class="lang-label">Reading</span> ${lang.reading}</td>
    <td><span class="lang-label">Spoken interaction</span> ${lang.spokenInteraction}</td>
    <td><span class="lang-label">Spoken production</span> ${lang.spokenProduction}</td>
    <td><span class="lang-label">Writing</span> ${lang.writing}</td>
  </tr>`
  )
  .join("");

const technicalExpertiseHtml = data.technicalExpertise
  .map(
    (item) =>
      `<div class="tech-item"><span class="tech-bullet">&#8226;</span> <strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</div>`
  )
  .join("");

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 9pt;
    color: #2d3748;
    line-height: 1.5;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Page break control */
  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* ===== LAYOUT ===== */
  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
  }

  .header-wrapper {
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-bottom: 3px solid #2b6cb0;
    padding: 28px 38px 22px 38px;
    display: flex;
    align-items: flex-start;
    gap: 0;
  }

  .sidebar {
    width: 190px;
    flex-shrink: 0;
    padding-right: 28px;
  }

  .main-header {
    flex: 1;
  }

  /* ===== PHOTO ===== */
  .photo-container {
    width: 130px;
    height: 155px;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    border: 3px solid white;
  }

  .photo-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* ===== NAME & PERSONAL ===== */
  .name {
    font-size: 17pt;
    font-weight: 300;
    color: #1a202c;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }

  .personal-info {
    font-size: 8pt;
    color: #718096;
    margin-bottom: 3px;
  }

  .personal-info strong {
    color: #4a5568;
    font-weight: 600;
  }

  /* ===== CONTACT ===== */
  .contact-section {
    margin-top: 16px;
  }

  .contact-title {
    font-size: 9pt;
    font-weight: 700;
    color: #2b6cb0;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #bee3f8;
  }

  .contact-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 7px;
    font-size: 8pt;
    color: #4a5568;
  }

  .contact-icon {
    width: 18px;
    height: 18px;
    margin-right: 8px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ebf4ff;
    border-radius: 4px;
    padding: 2px;
  }

  .contact-icon svg {
    width: 12px;
    height: 12px;
    fill: #2b6cb0;
  }

  .contact-item a {
    color: #2b6cb0;
    text-decoration: none;
  }

  /* ===== ABOUT ME ===== */
  .section-title-header {
    font-size: 13pt;
    font-weight: 300;
    color: #1a202c;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .about-text {
    font-size: 8.5pt;
    line-height: 1.6;
    color: #4a5568;
    margin-bottom: 12px;
  }

  .tech-expertise-title {
    font-size: 9.5pt;
    font-weight: 700;
    margin-bottom: 6px;
    margin-top: 4px;
    color: #2d3748;
  }

  .tech-item {
    font-size: 8pt;
    line-height: 1.65;
    color: #4a5568;
    display: flex;
    align-items: baseline;
  }

  .tech-bullet {
    color: #2b6cb0;
    font-weight: 700;
    margin-right: 4px;
    font-size: 10pt;
  }

  .tech-item strong {
    color: #2d3748;
  }

  /* ===== MAIN CONTENT SECTIONS ===== */
  .content-body {
    padding: 8px 38px 20px 38px;
  }

  .section-title-main {
    font-size: 13pt;
    font-weight: 300;
    color: #1a202c;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    margin-top: 20px;
    padding-bottom: 6px;
    border-bottom: 2px solid #2b6cb0;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* ===== EXPERIENCE ===== */
  .experience-item {
    margin-bottom: 14px;
    margin-top: 10px;
    position: relative;
  }

  .company-line {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
  }

  .dot {
    width: 10px;
    height: 10px;
    background: #2b6cb0;
    border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .dot-sm {
    width: 8px;
    height: 8px;
    background: #2b6cb0;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
    align-self: center;
  }

  .company-line strong {
    font-size: 9.5pt;
    color: #1a202c;
  }

  .location {
    color: #a0aec0;
    font-size: 8pt;
    margin-left: 8px;
    font-weight: 400;
  }

  .exp-content {
    margin-left: 14px;
    border-left: 2px solid #e2e8f0;
    padding-left: 16px;
    padding-bottom: 2px;
    padding-top: 2px;
  }

  .role-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 1px;
  }

  .dates-link {
    font-size: 8pt;
    color: #2b6cb0;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .exp-content p {
    font-size: 8.5pt;
    color: #4a5568;
    line-height: 1.55;
    margin-bottom: 5px;
  }

  .lib-list {
    list-style: none;
    padding-left: 0;
    font-size: 8pt;
    color: #4a5568;
    columns: 2;
    column-gap: 16px;
    margin-top: 4px;
  }

  .lib-list li {
    margin-bottom: 2px;
    padding-left: 12px;
    position: relative;
  }

  .lib-list li::before {
    content: "›";
    position: absolute;
    left: 0;
    color: #2b6cb0;
    font-weight: 700;
    font-size: 10pt;
    line-height: 1.2;
  }

  /* ===== EDUCATION ===== */
  .education-item {
    margin-bottom: 10px;
    margin-top: 8px;
    position: relative;
  }

  .edu-dates {
    font-size: 8pt;
    color: #2b6cb0;
    font-weight: 500;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
  }

  .date-bar {
    width: 3px;
    height: 14px;
    background: #2b6cb0;
    margin-right: 8px;
    flex-shrink: 0;
    border-radius: 2px;
  }

  .edu-content {
    margin-left: 11px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
  }

  .edu-content strong {
    font-size: 9.5pt;
    color: #1a202c;
  }

  .institution {
    font-size: 8.5pt;
    color: #718096;
  }

  .grade, .edu-website, .edu-address {
    width: 100%;
    margin-left: 25px;
    font-size: 8pt;
    color: #718096;
  }

  .edu-website a {
    color: #2b6cb0;
    text-decoration: none;
  }

  /* ===== LANGUAGES ===== */
  .lang-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .lang-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    margin-top: 6px;
    margin-bottom: 6px;
    border-radius: 6px;
    overflow: hidden;
  }

  .lang-header td {
    background: #f7fafc;
    padding: 6px 10px 4px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 8.5pt;
  }

  .lang-values td {
    padding: 5px 10px;
    border-bottom: 1px solid #edf2f7;
    color: #4a5568;
  }

  .lang-label {
    font-weight: 600;
    color: #2d3748;
  }

  .lang-note {
    font-size: 7pt;
    font-style: italic;
    color: #a0aec0;
    margin-bottom: 8px;
  }

  /* ===== SKILLS ===== */
  .skills-section {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 8px;
  }

  .skills-label {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #2d3748;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    margin-top: 10px;
  }

  .skills-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 4px;
  }

  .skill-tag {
    background: #ebf4ff;
    color: #2b6cb0;
    font-size: 7.5pt;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 12px;
    border: 1px solid #bee3f8;
    white-space: nowrap;
  }

  .skill-tag.soft {
    background: #f0fff4;
    color: #276749;
    border-color: #c6f6d5;
  }

  .skill-tag.org {
    background: #fffff0;
    color: #975a16;
    border-color: #fefcbf;
  }

  /* ===== MOTHER TONGUE ===== */
  .mother-tongue {
    font-size: 8.5pt;
    margin-bottom: 4px;
    color: #4a5568;
  }

  .mother-tongue strong {
    color: #2d3748;
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header with sidebar + about me -->
  <div class="header-wrapper">
    <div class="sidebar">
      <div class="photo-container">
        <img src="data:image/png;base64,${photoBase64}" alt="Photo">
      </div>
      <div class="name">${escapeHtml(data.name)}</div>
      <div class="personal-info"><strong>Date of birth:</strong> ${escapeHtml(data.dob)}</div>
      <div class="personal-info"><strong>Nationality:</strong> ${escapeHtml(data.nationality)}</div>

      <div class="contact-section">
        <div class="contact-title">Contact</div>
        <div class="contact-item">
          <div class="contact-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>
          <div>${escapeHtml(data.address).replace(/\n/g, "<br>")}</div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></div>
          <div>${escapeHtml(data.email)}</div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></div>
          <div>${escapeHtml(data.phone)}</div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg></div>
          <div><a href="${escapeHtml(data.website)}">${escapeHtml(data.website)}</a></div>
        </div>
        ${data.github ? `<div class="contact-item">
          <div class="contact-icon"><svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></div>
          <div><a href="${escapeHtml(data.github)}">${escapeHtml(data.github)}</a></div>
        </div>` : ""}
      </div>
    </div>

    <div class="main-header">
      <div class="section-title-header">About Me</div>
      <div class="about-text">${escapeHtml(data.aboutMe)}</div>

      <div class="tech-expertise-title">Technical Expertise</div>
      ${technicalExpertiseHtml}
    </div>
  </div>

  <!-- Body content -->
  <div class="content-body">
    <!-- Work Experience -->
    <div class="section-title-main">Work Experience</div>
    ${experienceHtml}

    <!-- Education -->
    <div class="section-title-main">Education and Training</div>
    ${educationHtml}

    <!-- Languages -->
    <div class="lang-section">
      <div class="section-title-main">Language Skills</div>
      <div class="mother-tongue"><strong>Mother tongue(s):</strong> ${escapeHtml(data.languages.motherTongue)}</div>
      <div class="mother-tongue" style="margin-bottom: 2px;"><strong>Other language(s):</strong></div>
      <table class="lang-table">
        ${langTableRows}
      </table>
      <div class="lang-note">Levels: A1 and A2: Basic user; B1 and B2: Independent user; C1 and C2: Proficient user</div>
    </div>

    <!-- Skills -->
    <div class="skills-section">
      <div class="section-title-main" style="margin-top: 8px;">Skills</div>
      <div class="skills-tags">
        ${data.skills
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`)
          .join("")}
      </div>

      <div class="skills-label">Communication</div>
      <div class="skills-tags">
        ${data.communication
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<span class="skill-tag soft">${escapeHtml(s)}</span>`)
          .join("")}
      </div>

      <div class="skills-label">Organizational</div>
      <div class="skills-tags">
        ${data.organizational
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<span class="skill-tag org">${escapeHtml(s)}</span>`)
          .join("")}
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle0" });
await page.pdf({
  path: outputPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", bottom: "10mm", left: "0", right: "0" },
});
await browser.close();
console.log(`PDF generated: ${outputPath}`);
