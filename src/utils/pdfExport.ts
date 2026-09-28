/**
 * Safe PDF & Printable Report Exporter for DEZIGLO SOFT
 * Handles both regular browser and sandboxed iframe environments seamlessly.
 */

export function triggerPrintOrDownload(
  elementId: string,
  title: string,
  fallbackFilename: string = 'deziglo_report.html'
) {
  const contentEl = document.getElementById(elementId);
  if (!contentEl) {
    window.print();
    return;
  }

  // Construct self-contained, beautifully styled printable document
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Teko:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #ffffff;
      color: #0f172a;
      padding: 24px;
      line-height: 1.4;
    }
    .print-btn-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .print-btn {
      background: #f59e0b;
      color: #000;
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 700;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      text-transform: uppercase;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #f1f5f9; color: #475569; font-family: 'Chakra Petch', sans-serif; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .font-tech { font-family: 'Chakra Petch', sans-serif; }
    .font-display { font-family: 'Teko', sans-serif; }
    .text-amber { color: #d97706; }
    .text-sky { color: #0284c7; }
    .text-red { color: #dc2626; }
    .border-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
    @media print {
      .print-btn-bar { display: none !important; }
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <div style="font-family: 'Chakra Petch'; font-weight: bold; font-size: 14px;">
      DEZIGLO SOFT • OFFICIAL PRINTABLE REPORT
    </div>
    <button class="print-btn" onclick="window.print()">PRINT / SAVE AS PDF</button>
  </div>
  <div class="report-body">
    ${contentEl.innerHTML}
  </div>
  <script>
    window.onload = function() {
      try {
        setTimeout(function() { window.print(); }, 400);
      } catch(e) {}
    };
  </script>
</body>
</html>
  `;

  // Try opening in new window first
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('Window open failed, falling back to download', err);
  }

  // Fallback: Direct download as printable HTML file (opens in Chrome/Safari with Print dialog)
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (e) {
    // Ultimate fallback: window.print directly
    try {
      window.print();
    } catch (printErr) {
      console.error('Print failed', printErr);
    }
  }
}
