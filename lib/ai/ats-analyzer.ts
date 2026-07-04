import { generateStructuredResponse } from "./llm-provider";

export interface ATSAnalysis {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  keywordMatches: string[];
  missingKeywords: string[];
  suggestions: string[];
  formatting: {
    score: number;
    issues: string[];
  };
  content: {
    score: number;
    issues: string[];
  };
}

async function extractTextFromPDF(resumeUrl: string): Promise<string> {
  try {
    // Using pdf2json - designed for server-side Node.js PDF parsing
    const PDFParser = (await import("pdf2json")).default;
    
    // Fetch the PDF
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create parser and extract text
    return new Promise<string>((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          // Extract text manually from parsed data to avoid getRawTextContent() bug
          let text = "";
          
          if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R) {
                    textItem.R.forEach((run: any) => {
                      if (run.T) {
                        // Try to decode URI component, fallback to raw text if malformed
                        try {
                          text += decodeURIComponent(run.T) + " ";
                        } catch (e) {
                          // If decode fails, use the raw text (replace %20 with space manually)
                          text += run.T.replace(/%20/g, " ") + " ";
                        }
                      }
                    });
                  }
                });
                text += "\n"; // New line after each page
              }
            });
          }
          
          resolve(text.trim());
        } catch (error) {
          reject(error);
        }
      });
      
      // Parse the PDF buffer
      pdfParser.parseBuffer(buffer);
    });
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
}

export async function analyzeResumeATS(
  resumeUrl: string,
  jobDescription?: string
): Promise<ATSAnalysis> {
  try {
    // Extract text from the PDF
    console.log("Extracting text from PDF:", resumeUrl);
    const resumeText = await extractTextFromPDF(resumeUrl);
    console.log("Extracted text length:", resumeText.length);
    
    const prompt = buildATSPrompt(resumeText, jobDescription);
    const schema = buildATSSchema();
    
    const response = await generateStructuredResponse<ATSAnalysis>(prompt, schema);
    
    // Validate the response
    if (typeof response.score !== 'number' || response.score < 0 || response.score > 100) {
      throw new Error("Invalid ATS score received from AI");
    }
    
    return response;
  } catch (error: any) {
    console.error("ATS analysis error:", error);
    throw new Error("Failed to analyze resume: " + error.message);
  }
}

function buildATSPrompt(resumeText: string, jobDescription?: string): string {
  const hasJD = !!jobDescription;
  
  return `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant. 

RESUME CONTENT (EXTRACTED FROM PDF):
"""
${resumeText}
"""

${hasJD ? `JOB DESCRIPTION:
"""
${jobDescription}
"""` : 'No specific job description provided'}

YOUR TASK:
Analyze the ACTUAL resume content above and provide ${hasJD ? 'targeted analysis comparing it against the job description' : 'general ATS optimization feedback'}:

1. **ATS Score (0-100)**: 
   - Analyze the ACTUAL resume structure, formatting, and content quality
   - ${hasJD ? 'Compare keywords in resume against job description requirements' : 'Evaluate based on general best practices'}
   - IMPORTANT: Use the FULL range (0-100) based on actual resume quality
   - Score Guidelines:
     * 0-40: Poor/Horrible - Major formatting issues, missing sections, unprofessional
     * 40-60: Below Average - Basic structure but lacking keywords, weak formatting
     * 60-75: Average - Decent structure, some optimization needed
     * 75-85: Good - Well-structured, good keywords, minor improvements needed
     * 85-95: Excellent - Highly optimized, strong keywords, professional formatting
     * 95-100: Outstanding - Perfect ATS optimization, ideal structure and content

2. **Keyword Analysis**:
   ${hasJD ? `- Compare the resume content against the job description
   - List keywords that ARE PRESENT in both (keywordMatches)
   - List keywords from JD that ARE MISSING from resume (missingKeywords)
   - Be accurate - only list keywords as "missing" if they're truly absent from the resume text` : `- List 5-7 technical skills and keywords found IN the resume
   - DO NOT list missing keywords without a job description
   - Focus on what's present in the resume`}

3. **Formatting Score (0-100)** - Use full range based on quality:
   - Standard best practices: use simple formatting, avoid tables/columns
   - Use standard section headings: Experience, Education, Skills, Projects
   - Avoid: images, graphics, headers/footers, multiple columns
   - Score Guidelines:
     * 0-40: Poor - Multiple columns, graphics, ATS-incompatible format
     * 40-60: Below Average - Some formatting issues, inconsistent structure
     * 60-75: Average - Decent formatting with some issues
     * 75-85: Good - Clean, ATS-friendly with minor issues
     * 85-100: Excellent - Perfect ATS formatting, clean and professional

4. **Content Score (0-100)** - Use full range based on quality:
   - Use action verbs (Developed, Implemented, Led, etc.)
   - Include quantifiable achievements (increased by X%, reduced by Y)
   - Ensure all sections are complete and well-organized
   - Score Guidelines:
     * 0-40: Poor - Vague descriptions, no achievements, missing sections
     * 40-60: Below Average - Basic descriptions, few accomplishments
     * 60-75: Average - Decent content but lacking impact
     * 75-85: Good - Strong action verbs, some quantifiable results
     * 85-100: Excellent - Compelling content, quantified achievements throughout

5. **Strengths**: 3-5 strengths found IN THIS SPECIFIC resume

6. **Weaknesses**: 3-5 weaknesses or areas for improvement found IN THIS SPECIFIC resume

7. **Specific Suggestions**: 5-8 actionable recommendations based on THIS SPECIFIC resume content

${hasJD ? 'IMPORTANT: Base your keyword matching on ACTUAL comparison of the resume text vs job description. Only mark keywords as "missing" if they are truly absent from the resume.' : 'Focus on general best practices based on what you see in the resume. DO NOT list missing keywords without a job description.'}

CRITICAL SCORING RULES:
- Use the ENTIRE 0-100 scale based on actual quality
- Do NOT cluster all scores in 65-80 range
- A truly bad resume should score 30-50
- An average resume should score 60-75
- A good resume should score 75-85
- An excellent resume should score 85-95
- Only near-perfect resumes should score 95+
- Be honest and realistic - vary scores significantly based on quality

Be practical, specific, and encouraging in your feedback.`;

}

function buildATSSchema(): string {
  return `{
  "score": number (0-100),
  "strengths": ["string", "string", ...],
  "weaknesses": ["string", "string", ...],
  "keywordMatches": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "formatting": {
    "score": number (0-100),
    "issues": ["issue1", "issue2", ...]
  },
  "content": {
    "score": number (0-100),
    "issues": ["issue1", "issue2", ...]
  }
}`;
}

/**
 * Helper function to generate a quick ATS score without full analysis
 * Useful for displaying scores in lists/tables
 */
export async function quickATSScore(resumeUrl: string): Promise<number> {
  try {
    const prompt = `Analyze this resume (${resumeUrl}) and provide ONLY an ATS compatibility score from 0-100.
    
Consider:
- Formatting (clean, ATS-friendly structure)
- Keywords (presence of industry-relevant terms)
- Content quality (clear, quantifiable achievements)
- Completeness (all essential sections present)

Return only a JSON object with a score property.`;

    const schema = `{ "score": number }`;
    
    const response = await generateStructuredResponse<{ score: number }>(prompt, schema);
    return response.score || 0;
  } catch (error) {
    console.error("Quick ATS score error:", error);
    return 0;
  }
}

