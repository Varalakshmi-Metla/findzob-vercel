# LaTeX Compilation Service Dockerfile
# This service compiles LaTeX code to PDF

FROM texlive/texlive:latest

# Install Node.js for the service
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a simple HTTP service to compile LaTeX
COPY compile-service.js .

EXPOSE 8080

CMD ["node", "compile-service.js"]

