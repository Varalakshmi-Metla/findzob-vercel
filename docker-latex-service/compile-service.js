/**
 * Simple LaTeX Compilation Service
 * Compiles LaTeX code to PDF using pdflatex
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = process.env.PORT || 8080;

// Logging utility
const logger = {
  formatTimestamp: () => new Date().toISOString(),
  info: (msg, ctx) => console.log(`[${logger.formatTimestamp()}] [INFO] ${msg}${ctx ? ' | ' + JSON.stringify(ctx) : ''}`),
  warn: (msg, ctx) => console.warn(`[${logger.formatTimestamp()}] [WARN] ${msg}${ctx ? ' | ' + JSON.stringify(ctx) : ''}`),
  error: (msg, err, ctx) => {
    const errInfo = err ? ` | Error: ${err.name}: ${err.message}` : '';
    const ctxInfo = ctx ? ' | ' + JSON.stringify(ctx) : '';
    console.error(`[${logger.formatTimestamp()}] [ERROR] ${msg}${errInfo}${ctxInfo}`);
    if (err && err.stack) {
      console.error(`[${logger.formatTimestamp()}] [ERROR] Stack: ${err.stack}`);
    }
  },
  debug: (msg, ctx) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${logger.formatTimestamp()}] [DEBUG] ${msg}${ctx ? ' | ' + JSON.stringify(ctx) : ''}`);
    }
  }
};

const server = http.createServer(async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  logger.info(`Incoming request`, { 
    requestId, 
    method: req.method, 
    url: req.url,
    headers: req.headers 
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    logger.debug('Handling OPTIONS request', { requestId });
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    logger.warn('Method not allowed', { requestId, method: req.method });
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const bodySize = Buffer.byteLength(body, 'utf8');
      logger.debug('Request body received', { requestId, bodySize });

      const { latex } = JSON.parse(body);
      if (!latex) {
        logger.warn('Missing latex field in request', { requestId });
        res.writeHead(400);
        res.end('Missing latex field');
        return;
      }

      const latexLength = latex.length;
      logger.info('Starting LaTeX compilation', { 
        requestId, 
        latexLength,
        latexPreview: latex.substring(0, 100) + '...' 
      });

      // Create temporary directory
      const tempDir = fs.mkdtempSync(path.join('/tmp', 'latex-'));
      const texFile = path.join(tempDir, 'resume.tex');
      const pdfFile = path.join(tempDir, 'resume.pdf');

      logger.debug('Created temporary directory', { requestId, tempDir });

      // Write LaTeX code to file
      fs.writeFileSync(texFile, latex);
      logger.debug('LaTeX file written', { requestId, texFile });

      // Compile LaTeX to PDF
      try {
        const compileStartTime = Date.now();
        logger.info('Executing pdflatex', { requestId, tempDir });

        const { stdout, stderr } = await execAsync(
          `pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFile}`, 
          {
            cwd: tempDir,
            timeout: 30000,
          }
        );

        const compileTime = Date.now() - compileStartTime;
        logger.debug('pdflatex execution completed', { 
          requestId, 
          compileTime,
          stdout: stdout.substring(0, 200),
          stderr: stderr ? stderr.substring(0, 200) : null
        });

        // Read PDF file
        if (fs.existsSync(pdfFile)) {
          const pdfBuffer = fs.readFileSync(pdfFile);
          const pdfSize = pdfBuffer.length;
          const totalTime = Date.now() - startTime;

          logger.info('LaTeX compilation successful', { 
            requestId, 
            pdfSize,
            compileTime,
            totalTime
          });

          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
          });
          res.end(pdfBuffer);
        } else {
          logger.error('PDF file was not generated', null, { requestId, tempDir });
          throw new Error('PDF file was not generated');
        }
      } catch (compileError) {
        const compileTime = Date.now() - startTime;
        logger.error('LaTeX compilation failed', compileError, { 
          requestId, 
          compileTime,
          tempDir 
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'LaTeX compilation failed', 
          message: compileError.message,
          requestId 
        }));
      } finally {
        // Clean up temporary files
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.debug('Temporary files cleaned up', { requestId, tempDir });
        } catch (cleanupError) {
          logger.error('Failed to clean up temporary files', cleanupError, { requestId, tempDir });
        }
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('Request processing error', error, { requestId, totalTime });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Request processing failed', 
        message: error.message,
        requestId 
      }));
    }
  });
});

server.listen(PORT, () => {
  logger.info(`LaTeX compilation service started`, { port: PORT, nodeEnv: process.env.NODE_ENV });
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error', error, { port: PORT });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)), { promise });
});

