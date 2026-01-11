
import jsPDF from 'jspdf';

export class PDFReportService {
  static generateReport(data: any): Blob {
    const doc = new jsPDF();
    doc.text('Video Analysis Report', 20, 20);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    if (data.videoTitle) {
      doc.text(`Video: ${data.videoTitle}`, 20, 50);
    }
    
    if (data.analysis) {
      doc.text('Analysis Results:', 20, 70);
      doc.text(JSON.stringify(data.analysis, null, 2), 20, 80);
    }
    
    return doc.output('blob');
  }

  static generateComprehensiveReport(videoData: any, analysisData: any): Blob {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Comprehensive Video Analysis Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    
    // Video Information
    doc.setFontSize(16);
    doc.text('Video Information', 20, 55);
    
    doc.setFontSize(12);
    if (videoData.title) {
      doc.text(`Title: ${videoData.title}`, 20, 70);
    }
    if (videoData.video_type) {
      doc.text(`Type: ${videoData.video_type}`, 20, 80);
    }
    if (videoData.duration) {
      doc.text(`Duration: ${Math.floor(videoData.duration / 60)}:${(videoData.duration % 60).toString().padStart(2, '0')}`, 20, 90);
    }
    
    // Analysis Results
    doc.setFontSize(16);
    doc.text('Analysis Results', 20, 115);
    
    doc.setFontSize(12);
    if (analysisData) {
      let yPosition = 130;
      
      if (analysisData.playerActions && analysisData.playerActions.length > 0) {
        doc.text(`Player Actions Detected: ${analysisData.playerActions.length}`, 20, yPosition);
        yPosition += 15;
      }
      
      if (analysisData.keyMoments && analysisData.keyMoments.length > 0) {
        doc.text(`Key Moments: ${analysisData.keyMoments.length}`, 20, yPosition);
        yPosition += 15;
      }
      
      if (analysisData.summary) {
        doc.text('Summary:', 20, yPosition);
        yPosition += 10;
        
        const summaryLines = doc.splitTextToSize(analysisData.summary, 170);
        doc.text(summaryLines, 20, yPosition);
      }
    }
    
    return doc.output('blob');
  }
}

export default PDFReportService;
