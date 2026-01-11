
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface TimelineEventForExport {
  id: string;
  event_type: string;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
  is_pinned: boolean;
  players?: {
    full_name: string;
  };
}

export const exportTimelineToPDF = (
  events: TimelineEventForExport[],
  teamName: string,
  season?: string
) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;
  
  // Title
  doc.setFontSize(20);
  doc.text(`${teamName} - Team Timeline`, 20, yPosition);
  
  if (season) {
    yPosition += 10;
    doc.setFontSize(14);
    doc.text(`Season: ${season}`, 20, yPosition);
  }
  
  yPosition += 20;
  doc.setFontSize(12);
  
  // Group events by season
  const eventsByYear = events.reduce((acc, event) => {
    const year = new Date(event.event_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, TimelineEventForExport[]>);
  
  Object.entries(eventsByYear)
    .sort(([a], [b]) => Number(b) - Number(a))
    .forEach(([year, yearEvents]) => {
      // Season header
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`${year}/${Number(year) + 1} Season`, 20, yPosition);
      yPosition += 15;
      
      yearEvents
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
        .forEach((event) => {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Event header
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          const eventTitle = event.is_pinned ? `📌 ${event.title}` : event.title;
          doc.text(eventTitle, 25, yPosition);
          yPosition += 8;
          
          // Event details
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);
          
          const eventDate = format(new Date(event.event_date), 'MMM dd, yyyy');
          const eventType = event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1);
          
          doc.text(`Date: ${eventDate} | Type: ${eventType}`, 30, yPosition);
          yPosition += 6;
          
          if (event.players) {
            doc.text(`Player: ${event.players.full_name}`, 30, yPosition);
            yPosition += 6;
          }
          
          // Description
          const splitDescription = doc.splitTextToSize(event.description, 160);
          doc.text(splitDescription, 30, yPosition);
          yPosition += splitDescription.length * 4 + 8;
        });
      
      yPosition += 10;
    });
  
  // Save the PDF
  const filename = season 
    ? `${teamName}_Timeline_${season}.pdf`
    : `${teamName}_Timeline_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  doc.save(filename);
};
