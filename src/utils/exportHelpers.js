// Export JSON array to CSV format
export function exportToCSV(data, filename, headers) {
  if (!data || !data.length) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel in Windows
  csvContent += headerLabels.map(label => `"${label.replace(/"/g, '""')}"`).join(',') + '\r\n';

  data.forEach(row => {
    const line = headerKeys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) val = '';
      val = String(val);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
    csvContent += line + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Print specific element by creating a printable view
export function triggerPrint() {
  window.print();
}
