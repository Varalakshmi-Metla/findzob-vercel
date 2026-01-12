'use server';

import { logger } from './logger';
import { compileTemplate } from './resume-templates';
import { GoogleGenerativeAI } from "@google/generative-ai";

declare const process: {
  env: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
  };
};

type Buffer = Uint8Array;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ResumeInput {
    profile: any;
    role: string;
}

interface EnhancedContent {
    summary: string;
    skills: string;
    experience: Array<{
        company: string;
        role: string;
        duration: string;
        bullets: string[];
    }>;
    projects?: Array<{
        title: string;
        technologies: string;
        bullets: string[];
    }>;
}

/**
 * Generate a high-quality, text-based PDF resume using Puppeteer and Handlebars
 * Uses Gemini to enhance content while preserving user-provided data
 * Falls back to unenhanced content if Gemini is unavailable
 */
export async function generateResumePDF(input: ResumeInput): Promise<Buffer> {
    logger.info("Starting Resume Generation Pipeline with Puppeteer...", {
        role: input.role,
        hasProfile: !!input.profile,
    });

    try {
        let aiContent: EnhancedContent | null = null;
        let useAIEnhancement = true;

        // Try to use Gemini for content enhancement
        try {
            // 1. Construct Prompt for Content Enhancement ONLY
            const prompt = `You are an expert Resume Writer specializing in ATS-optimized resumes.
TARGET ROLE: ${input.role}

CRITICAL RULES:
- DO NOT invent or modify personal data (Name, Email, Phone, Education details)
- DO NOT add companies, roles, or dates not provided by the user
- ONLY enhance the SUMMARY and bullet points for EXPERIENCE and PROJECTS
- Use Action->Context->Result format for bullets
- Keep bullets concise (1 line each, max 2 lines)
- Use strong action verbs and quantifiable metrics when possible

TASK: Optimize the provided profile data for the target role.
1. SUMMARY: Write a strong 3-sentence professional summary tailored to ${input.role}
2. EXPERIENCE: Rewrite bullets to be Action->Context->Result oriented (2-4 bullets per role)
3. PROJECTS: Enhance project descriptions with impact-focused bullets (2-3 bullets per project)
4. SKILLS: List relevant technical skills as a comma-separated string, prioritizing skills relevant to ${input.role}

INPUT DATA:
${JSON.stringify(input.profile, null, 2)}

OUTPUT JSON FORMAT (STRICT - must be valid JSON):
{
    "summary": "3-sentence professional summary tailored to the target role",
    "skills": "Comma-separated list of technical skills",
    "experience": [
        {
            "company": "exact company name from input",
            "role": "exact role title from input",
            "duration": "exact duration from input",
            "bullets": ["enhanced bullet 1", "enhanced bullet 2", "enhanced bullet 3"]
        }
    ],
    "projects": [
        {
            "title": "exact project title from input",
            "technologies": "technologies from input",
            "bullets": ["enhanced bullet 1", "enhanced bullet 2"]
        }
    ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.`;

            // 2. Call Gemini
            logger.info("Calling Gemini API for content enhancement...", {
                model: GEMINI_MODEL,
            });

            if (!GEMINI_API_KEY) {
                throw new Error("GEMINI_API_KEY is not configured");
            }

            const model = genAI.getGenerativeModel({ 
                model: GEMINI_MODEL,
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json",
                },
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse JSON response
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found in response");
                aiContent = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                logger.error("Failed to parse Gemini JSON response", parseError instanceof Error ? parseError : new Error(String(parseError)), {
                    response: text.substring(0, 500),
                });
                throw new Error("Failed to parse AI response as JSON");
            }

            logger.info("AI content enhancement completed", {
                hasSummary: !!aiContent?.summary,
                experienceCount: aiContent?.experience?.length || 0,
                projectsCount: aiContent?.projects?.length || 0,
            });
        } catch (geminiError) {
            // Gemini is not available or failed - continue without AI enhancement
            logger.warn("Gemini not available, proceeding without AI enhancement", {
                error: geminiError instanceof Error ? geminiError.message : String(geminiError),
            });
            useAIEnhancement = false;
        }

        // 3. Prepare final data - use AI content if available, otherwise use raw profile data
        const finalData = {
            header: {
                name: input.profile.name || '',
                email: input.profile.email || '',
                phone: input.profile.phone || '',
                linkedin: input.profile.linkedin || '',
                github: input.profile.github || '',
                portfolioURL: input.profile.portfolioURL || '',
            },
            education: (input.profile.education || []).map((edu: any) => ({
                degree: edu.degree || '',
                university: edu.university || '',
                year: edu.year || edu.duration || '',
            })),
            awards: (input.profile.awards || []).map((award: any) => ({
                title: award.title || award.name || '',
                organization: award.organization || award.issuer || '',
                year: award.year || award.date || '',
                description: award.description || '',
            })),
            publications: (input.profile.publications || []).map((pub: any) => ({
                title: pub.title || pub.name || '',
                venue: pub.publication || pub.venue || pub.conference || '',
                year: pub.year || pub.date || '',
                description: pub.description || '',
            })),
            summary: useAIEnhancement && aiContent?.summary 
                ? aiContent.summary 
                : (input.profile.summary || input.profile.professionalSummary || `Experienced professional seeking ${input.role} position.`),
            skills: useAIEnhancement && aiContent?.skills 
                ? aiContent.skills 
                : (Array.isArray(input.profile.skills) ? input.profile.skills.join(', ') : (input.profile.skills || '')),
            experience: useAIEnhancement && aiContent?.experience 
                ? aiContent.experience 
                : (input.profile.experience || []).map((exp: any) => ({
                    company: exp.company || '',
                    role: exp.role || exp.title || exp.position || '',
                    duration: exp.duration || exp.dates || '',
                    bullets: Array.isArray(exp.bullets) ? exp.bullets : (exp.description ? [exp.description] : []),
                })),
            projects: useAIEnhancement && aiContent?.projects 
                ? aiContent.projects 
                : (input.profile.projects || []).map((proj: any) => ({
                    title: proj.title || proj.name || '',
                    technologies: proj.technologies || proj.tech || '',
                    bullets: Array.isArray(proj.bullets) ? proj.bullets : (proj.description ? [proj.description] : []),
                })),
        };

        // 4. Compile HTML using Handlebars template
        logger.info("Compiling HTML template...");
        const htmlContent = compileTemplate(finalData);

        // 5. Generate Vector PDF via Puppeteer
        logger.info("Launching Puppeteer for PDF generation...");
        
        // Dynamic import to avoid issues if puppeteer is not installed
        const puppeteer = await import('puppeteer');
        
        const browser = await puppeteer.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ]
        });

        try {
            const page = await browser.newPage();
            
            // Set viewport to A4 dimensions (at 96 DPI: 794 x 1123 pixels)
            await page.setViewport({ width: 794, height: 1123 });
            
            // Set content and wait for fonts to load
            await page.setContent(htmlContent, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Wait a bit for fonts to render
            await page.waitForTimeout(1000);

            // Get content height to calculate scale for fitting on single page
            const contentHeight = await page.evaluate(() => {
                const body = document.body;
                const html = document.documentElement;
                return Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );
            });

            // A4 page height in pixels at 96 DPI (minus margins)
            const a4HeightPx = 1123; // ~297mm at 96 DPI
            const marginTopBottom = 96; // 0.5in * 2 = 1in total = 96px at 96 DPI
            const availableHeight = a4HeightPx - marginTopBottom;

            // Calculate scale to fit content on single page (with minimum scale of 0.5 to keep readable)
            let scale = 1;
            if (contentHeight > availableHeight) {
                scale = Math.max(0.5, availableHeight / contentHeight);
            }

            logger.info("PDF scaling calculated", {
                contentHeight,
                availableHeight,
                scale,
            });

            // Apply scale via CSS if needed
            if (scale < 1) {
                await page.evaluate((s) => {
                    document.body.style.transform = `scale(${s})`;
                    document.body.style.transformOrigin = 'top left';
                    document.body.style.width = `${100 / s}%`;
                }, scale);
                
                // Wait for transform to apply
                await page.waitForTimeout(500);
            }

            // Generate PDF - single page with auto-fit
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { 
                    top: '0.4in', 
                    right: '0.4in', 
                    bottom: '0.4in', 
                    left: '0.4in' 
                },
                preferCSSPageSize: false,
                scale: 1, // Scale is already applied via CSS transform
            });

            logger.info("PDF Generated successfully", {
                pdfSize: pdfBuffer.length,
                aiEnhanced: useAIEnhancement,
                scaleFactor: scale,
            });

            // Return as Uint8Array (which we type as Buffer)
            return new Uint8Array(pdfBuffer) as Buffer;
        } finally {
            await browser.close();
        }

    } catch (error) {
        logger.error("Resume Generation Failed", error instanceof Error ? error : new Error(String(error)), {
            role: input.role,
        });
        throw error;
    }
}

/**
 * Generate PDF from HTML content directly
 * This preserves the exact formatting of the already generated resume without AI re-processing
 */
export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    logger.info("Starting PDF generation from raw HTML...");
    
    // Dynamic import to avoid issues if puppeteer is not installed
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Set viewport to A4 dimensions
        await page.setViewport({ width: 794, height: 1123 });
        
        // Set content and wait for network/fonts
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Wait specifically for potential fonts to load if not covered by networkidle
        // We can add a small style injection to force fonts if needed, but standard should be fine
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { 
                top: '0.5in', 
                right: '0.5in', 
                bottom: '0.5in', 
                left: '0.5in' 
            },
        });

        logger.info("PDF Generated successfully from HTML", {
            pdfSize: pdfBuffer.length,
        });

        return new Uint8Array(pdfBuffer) as Buffer;
    } catch (error) {
        logger.error("Failed to generate PDF from HTML", error instanceof Error ? error : new Error(String(error)));
        throw error;
    } finally {
        await browser.close();
    }
}

