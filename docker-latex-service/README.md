# LaTeX Compilation Service

This service compiles LaTeX code to PDF for resume generation.

## Setup

### Option 1: Using Docker (Recommended)

1. Build the Docker image:
```bash
cd docker-latex-service
docker build -t latex-compiler .
```

2. Run the service:
```bash
docker run -d -p 8080:8080 --name latex-compiler latex-compiler
```

3. Set environment variable in your CRM:
```bash
LATEX_COMPILER_URL=http://localhost:8080/compile
```

### Option 2: Using External Service

If you have a LaTeX compilation service elsewhere, set:
```bash
LATEX_COMPILER_URL=http://your-service-url/compile
```

The service should accept POST requests with JSON body:
```json
{
  "latex": "\\documentclass{article}...",
  "format": "pdf"
}
```

And return PDF as binary data.

## Testing

Test the service:
```bash
curl -X POST http://localhost:8080/compile \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output test.pdf
```

## Notes

- The service uses `pdflatex` to compile LaTeX
- Compilation timeout is 30 seconds
- Temporary files are cleaned up after compilation
- The service runs on port 8080 by default

