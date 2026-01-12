/**
 * LaTeX to PDF Conversion Service
 * Compiles LaTeX code to PDF using external service or local compiler
 */

import { logger } from './logger';

declare const process: {
  env: {
    LATEX_COMPILER_URL?: string;
  };
};

type Buffer = Uint8Array;

const LATEX_COMPILER_URL = process.env.LATEX_COMPILER_URL;

/**
 * Compile LaTeX code to PDF
 * Uses external LaTeX compiler service
 * 
 * Setup options:
 * 1. Use a LaTeX compilation service (e.g., ShareLaTeX API, custom service)
 * 2. Set LATEX_COMPILER_URL environment variable to your service endpoint
 * 3. Service should accept POST request with JSON body: { latex: string }
 * 4. Service should return PDF as binary data
 */
export async function compileLaTeXToPDF(latexCode: string): Promise<Buffer> {
  const startTime = Date.now();
  const latexLength = latexCode.length;

  try {
    if (!LATEX_COMPILER_URL) {
      logger.error('LATEX_COMPILER_URL not configured', undefined, {
        latexLength,
      });
      throw new Error(
        'LATEX_COMPILER_URL not configured. Please set it to your LaTeX compilation service URL.\n' +
        'Example: LATEX_COMPILER_URL=http://your-latex-service:8080/compile\n\n' +
        'You can set up a LaTeX compilation service using Docker:\n' +
        'docker run -d -p 8080:8080 your-latex-service-image'
      );
    }

    logger.info('Starting LaTeX compilation', {
      serviceUrl: LATEX_COMPILER_URL,
      latexLength,
      latexPreview: latexCode.substring(0, 100) + '...',
    });

    const response = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latex: latexCode,
        format: 'pdf',
      }),
      // Increase timeout for LaTeX compilation
      signal: AbortSignal.timeout(60000), // 60 seconds
    });

    const fetchTime = Date.now() - startTime;
    logger.debug('Fetch response received', {
      status: response.status,
      statusText: response.statusText,
      fetchTime,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('LaTeX compilation failed', undefined, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        fetchTime,
      });
      throw new Error(`LaTeX compilation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfSize = pdfBuffer.byteLength;
    const totalTime = Date.now() - startTime;

    logger.info('LaTeX compilation successful', {
      pdfSize,
      fetchTime,
      totalTime,
    });

    return new Uint8Array(pdfBuffer) as Buffer;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('LaTeX compilation timed out', error, {
        latexLength,
        totalTime,
        serviceUrl: LATEX_COMPILER_URL,
      });
      throw new Error('LaTeX compilation timed out. The service may be slow or unavailable.');
    }

    logger.error('LaTeX compilation error', error instanceof Error ? error : new Error(String(error)), {
      latexLength,
      totalTime,
      serviceUrl: LATEX_COMPILER_URL,
    });
    throw error;
  }
}

