import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, filename = 'export') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data, filename = 'export') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToPDF = (data, columns, title, filename = 'export') => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
  
  // Prepare table data
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object' && value !== null) {
        if (col.format) return col.format(value);
        return JSON.stringify(value);
      }
      if (col.format) return col.format(value);
      return String(value);
    })
  );
  
  // Add table using autoTable
  autoTable(doc, {
    head: [columns.map(col => col.label)],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportPaymentsToPDF = (payments, filename = 'payments-report') => {
  const columns = [
    { key: 'paymentDate', label: 'Date', format: (val) => val ? new Date(val).toLocaleDateString() : '' },
    { key: 'tenant', label: 'Tenant', format: (val) => val ? `${val.firstName} ${val.lastName}` : 'N/A' },
    { key: 'house', label: 'House', format: (val) => val ? val.houseNumber : 'N/A' },
    { key: 'amount', label: 'Amount', format: (val) => `KSh ${(val || 0).toLocaleString()}` },
    { key: 'status', label: 'Status' },
    { key: 'paymentMethod', label: 'Method' }
  ];
  
  exportToPDF(payments, columns, 'Payments Report', filename);
};

export const exportTenantsToPDF = (tenants, filename = 'tenants-report') => {
  const columns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'house', label: 'House', format: (val) => val ? val.houseNumber : 'Not Assigned' },
    { key: 'status', label: 'Status' }
  ];
  
  exportToPDF(tenants, columns, 'Tenants Report', filename);
};

