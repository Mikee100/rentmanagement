import { jsPDF } from 'jspdf';

/**
 * Generate a PDF receipt for a payment
 */
export const generatePaymentReceipt = (payment) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Colors
  const primaryColor = [37, 99, 235];
  const textColor = [51, 51, 51];
  const lightGray = [245, 247, 250];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RENT MANAGEMENT SYSTEM', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 28, { align: 'center' });

  yPos = 50;

  // Receipt Number
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt Number:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.receiptNumber || `REC-${payment._id.slice(-8).toUpperCase()}`, 70, yPos);
  
  yPos += 10;
  
  // Date
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';
  doc.text(paymentDate, 70, yPos);

  yPos += 15;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Payment Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 20, yPos);
  yPos += 10;

  // Tenant Information
  const tenantName = payment.tenant 
    ? `${payment.tenant.firstName || ''} ${payment.tenant.lastName || ''}`.trim()
    : 'N/A';
  const tenantEmail = payment.tenant?.email || 'N/A';
  const tenantPhone = payment.tenant?.phone || 'N/A';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Tenant Name:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(tenantName, 70, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.text('Email:', 20, yPos);
  doc.text(tenantEmail, 70, yPos);
  yPos += 7;

  doc.text('Phone:', 20, yPos);
  doc.text(tenantPhone, 70, yPos);
  yPos += 10;

  // House/Apartment Information
  const houseNumber = payment.house?.houseNumber || 'N/A';
  const apartmentName = payment.house?.apartment?.name || payment.apartment?.name || 'N/A';
  const apartmentAddress = payment.house?.apartment?.address || payment.apartment?.address || 'N/A';

  doc.text('House Number:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(houseNumber, 70, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.text('Apartment:', 20, yPos);
  doc.text(apartmentName, 70, yPos);
  yPos += 7;

  doc.text('Address:', 20, yPos);
  doc.text(apartmentAddress, 70, yPos);
  yPos += 15;

  // Divider
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Payment Information Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT INFORMATION', 20, yPos);
  yPos += 10;

  // Table background
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos - 5, pageWidth - 40, 60, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Expected Amount
  doc.text('Expected Amount:', 25, yPos);
  doc.setFont('helvetica', 'bold');
  const expectedAmount = payment.expectedAmount || payment.amount || 0;
  doc.text(`KSh ${expectedAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 8;

  // Paid Amount
  doc.setFont('helvetica', 'normal');
  doc.text('Paid Amount:', 25, yPos);
  doc.setFont('helvetica', 'bold');
  const paidAmount = payment.paidAmount || payment.amount || 0;
  doc.text(`KSh ${paidAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 8;

  // Deficit (if any)
  if (payment.deficit && payment.deficit > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(239, 68, 68);
    doc.text('Deficit:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`KSh ${payment.deficit.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });
    doc.setTextColor(...textColor);
    yPos += 8;
  }

  // Late Fee (if any)
  if (payment.lateFee && payment.lateFee > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Late Fee:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`KSh ${payment.lateFee.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 8;
  }

  // Total Paid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Total Paid:', 25, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const totalPaid = paidAmount + (payment.lateFee || 0);
  doc.text(`KSh ${totalPaid.toLocaleString()}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 15;

  // Payment Method & Status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment Method:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  const paymentMethod = payment.paymentMethod || payment.paymentSource || 'N/A';
  doc.text(paymentMethod.toUpperCase().replace('_', ' '), 70, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.text('Status:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  const status = payment.status || 'N/A';
  const statusColor = status === 'paid' ? [34, 197, 94] : status === 'partial' ? [251, 146, 60] : [239, 68, 68];
  doc.setTextColor(...statusColor);
  doc.text(status.toUpperCase(), 70, yPos);
  doc.setTextColor(...textColor);
  yPos += 7;

  // Transaction ID (if available)
  if (payment.transactionId) {
    doc.setFont('helvetica', 'normal');
    doc.text('Transaction ID:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(payment.transactionId, 70, yPos);
    yPos += 7;
  }

  // Reference Number (if available)
  if (payment.referenceNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Reference:', 20, yPos);
    doc.text(payment.referenceNumber, 70, yPos);
    yPos += 7;
  }

  yPos += 10;

  // Divider
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated receipt. No signature required.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('Thank you for your payment!', pageWidth / 2, yPos, { align: 'center' });

  // Save PDF
  const filename = `Receipt-${payment.receiptNumber || payment._id.slice(-8)}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

