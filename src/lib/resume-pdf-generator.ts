'use client';

/**
 * Client-side A4 resume PDF generator
 * Uses html2canvas and jsPDF to create a properly formatted single-page A4 PDF
 */
export const generateA4ResumePDF = async (profile: any, resume: any): Promise<string> => {
  try {
    const { generateATSResumeHTML } = await import('@/lib/resume-template-ats');
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      await import('html2canvas'),
      await import('jspdf')
    ]);

    // Generate resume HTML
    const html = generateATSResumeHTML(profile || {}, resume);

    // Create a container with A4 dimensions (210mm x 297mm)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.minHeight = '297mm';
    container.style.background = '#ffffff';
    container.style.padding = '12mm';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '10pt';
    container.style.lineHeight = '1.4';
    container.innerHTML = html;
    
    document.body.appendChild(container);

    try {
      // Convert to canvas with high quality (scale 2 for better resolution)
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // A4 dimensions in points (1 point = 1/72 inch)
      // A4: 210mm x 297mm = 595pt x 842pt
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 595pt
      const pageHeight = pdf.internal.pageSize.getHeight(); // 842pt
      const margin = 12 * 72 / 25.4; // 12mm in points

      // Calculate scaling to fit on single page
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      
      const canvasAspectRatio = canvas.width / canvas.height;
      const availableAspectRatio = availableWidth / availableHeight;

      let finalWidth: number;
      let finalHeight: number;

      if (canvasAspectRatio > availableAspectRatio) {
        // Canvas is wider, constrain by width
        finalWidth = availableWidth;
        finalHeight = availableWidth / canvasAspectRatio;
      } else {
        // Canvas is taller, constrain by height
        finalHeight = availableHeight;
        finalWidth = availableHeight * canvasAspectRatio;
      }

      // Center the image on the page
      const offsetX = margin + (availableWidth - finalWidth) / 2;
      const offsetY = margin + (availableHeight - finalHeight) / 2;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);

      // Return as base64
      return pdf.output('dataurlstring').split(',')[1];
    } finally {
      document.body.removeChild(container);
    }
  } catch (error) {
    console.error('Failed to generate A4 resume PDF', error);
    throw error;
  }
};
