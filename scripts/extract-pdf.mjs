import { PDFParse } from "pdf-parse";
import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node extract-pdf.mjs <path-to-pdf>");
  process.exit(1);
}

const data = new Uint8Array(readFileSync(filePath));
const parser = new PDFParse({ data });
const result = await parser.getText();
console.log(result.text);
await parser.destroy();
