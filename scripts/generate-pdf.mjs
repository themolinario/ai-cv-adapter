import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Usage: node generate-pdf.mjs <output-path.pdf>");
  process.exit(1);
}

const text = readFileSync("/tmp/adapted-cv.txt", "utf-8");
const sections = text.split("---").map((s) => s.trim());

const pdfDoc = await PDFDocument.create();
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const fontSize = 10;
const titleFontSize = 14;
const sectionFontSize = 12;
const margin = 50;
const pageWidth = 595.28;
const pageHeight = 841.89;
const maxWidth = pageWidth - margin * 2;

let page = pdfDoc.addPage([pageWidth, pageHeight]);
let y = pageHeight - margin;

const defaultColor = rgb(0.1, 0.1, 0.1);
const accentColor = rgb(0.15, 0.3, 0.55);

function addNewPage() {
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
}

function wrapText(text, maxW, f, size) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = f.widthOfTextAtSize(testLine, size);
    if (width > maxW && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawText(text, options) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.trim() === "") {
      y -= fontSize * 0.7;
      continue;
    }
    const wrapped = wrapText(line, maxWidth, options.font, options.size);
    for (const wl of wrapped) {
      if (y < margin + 20) addNewPage();
      page.drawText(wl, {
        x: margin,
        y,
        size: options.size,
        font: options.font,
        color: options.color ?? defaultColor,
      });
      y -= options.size * 1.4;
    }
  }
}

for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  if (!section) continue;

  const lines = section.split("\n");
  const title = lines[0];
  const body = lines.slice(1).join("\n").trim();

  if (i === 0) {
    drawText(title, { font: boldFont, size: titleFontSize });
    y -= 5;
    if (body) drawText(body, { font, size: fontSize });
  } else {
    y -= 10;
    drawText(title, { font: boldFont, size: sectionFontSize, color: accentColor });
    if (y > margin + 20) {
      page.drawLine({
        start: { x: margin, y: y + 2 },
        end: { x: pageWidth - margin, y: y + 2 },
        thickness: 0.5,
        color: accentColor,
      });
      y -= 8;
    }
    if (body) drawText(body, { font, size: fontSize });
  }
}

const pdfBytes = await pdfDoc.save();
writeFileSync(outputPath, pdfBytes);
console.log(`PDF generated: ${outputPath}`);
