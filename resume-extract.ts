import * as pdfjsLib from 'pdfjs-dist';
import axios from 'axios';
import { extractResume } from './src/agent/prompts/summary_resume_prompt';

async function downloadPdfFromGoogleDrive(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data, 'binary');
}

export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;

  let extractedText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    extractedText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }

  return extractedText.trim();
}

async function extractDataFromPdf(url: string): Promise<any> {
    try {
      // Step 1: Download the PDF
      const pdfBuffer = await downloadPdfFromGoogleDrive(url);
      // Step 2: Extract text from the PDF
      const text = await extractTextFromPdf(pdfBuffer);
      // Step 3: Format the extracted text into a JSON structure
      const jsonText = `{ "content": "${text.replace(/\n/g, '\\n').replace(/"/g, '\\"')}" }`;
      // Step 4: Use extractResume to process the text
      const result = await extractResume(text, 'pdf-extraction-user');
      return result;
    } catch (error) {
      console.error('Error extracting data from PDF:', error);
      throw error;
    }
  }
  
(async () => {
  try {
    const pdfUrl = 'https://drive.google.com/uc?export=download&id=1QaYpPhuckLODIVq7pOuq3CQ2h8fZGYhd';
    const jsonData = await extractDataFromPdf(pdfUrl);
    console.log('Extracted Resume Data:', jsonData);
  } catch (error) {
    console.error('Failed to extract data:', error);
  }
})();
