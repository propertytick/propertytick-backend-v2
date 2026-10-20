const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate PDF from HTML template
 */
const generatePdf = async (html, outputPath) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    await browser.close();
    return outputPath;
  } catch (err) {
    if (browser) await browser.close();
    logger.error('PDF generation failed:', err.message);
    throw err;
  }
};

/**
 * Generate Rent Agreement PDF
 */
const generateRentAgreement = async (deal) => {
  const owner = deal.owner;
  const tenant = deal.tenant;
  const property = deal.property;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 4px; text-decoration: underline; }
  h2 { text-align: center; font-size: 12pt; margin-top: 0; font-weight: normal; }
  .header-info { text-align: right; font-size: 10pt; margin-bottom: 20px; }
  .section { margin: 16px 0; text-align: justify; }
  .section-title { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 6px; vertical-align: top; }
  .label { font-weight: bold; width: 35%; }
  .signature-row { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { text-align: center; width: 45%; }
  .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 4px; font-size: 10pt; }
  .witness-section { margin-top: 40px; }
  ol { padding-left: 20px; }
  li { margin: 6px 0; text-align: justify; }
</style>
</head>
<body>

<div class="header-info">
  Agreement No: <strong>${deal.agreementNumber || 'RA-____-_____'}</strong><br>
  Date: <strong>${formatDate(new Date())}</strong>
</div>

<h1>RENT AGREEMENT</h1>
<h2>(Residential / Commercial Property)</h2>

<div class="section">
  This Rent Agreement is made and executed on this <strong>${formatDate(new Date())}</strong> at <strong>${property?.location?.city || '________'}</strong>.
</div>

<div class="section">
  <span class="section-title">BETWEEN</span>
</div>

<table>
  <tr><td class="label">Owner Name:</td><td>${owner?.fullName || '________'}</td></tr>
  <tr><td class="label">Father's Name:</td><td>${owner?.fatherName || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${owner?.permanentAddress || owner?.location?.address || '________'}</td></tr>
  <tr><td class="label">Mobile:</td><td>${owner?.phone || '________'}</td></tr>
</table>

<div class="section">(Hereinafter referred to as the <strong>"OWNER"</strong> of the one part)</div>

<div class="section">
  <span class="section-title">AND</span>
</div>

<table>
  <tr><td class="label">Tenant Name:</td><td>${tenant?.fullName || '________'}</td></tr>
  <tr><td class="label">Father's Name:</td><td>${tenant?.fatherName || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${tenant?.permanentAddress || tenant?.location?.address || '________'}</td></tr>
  <tr><td class="label">Mobile:</td><td>${tenant?.phone || '________'}</td></tr>
</table>

<div class="section">(Hereinafter referred to as the <strong>"TENANT"</strong> of the other part)</div>

<div class="section">
  <span class="section-title">WHEREAS</span> the Owner is the absolute owner of the property described below and has agreed to let out the same to the Tenant on rent, and the Tenant has agreed to take the same on rent, on the following terms and conditions.
</div>

<div class="section">
  <span class="section-title">PROPERTY DESCRIPTION</span>
</div>

<table>
  <tr><td class="label">Property Title:</td><td>${property?.title || '________'}</td></tr>
  <tr><td class="label">Property Type:</td><td>${property?.propertyType || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${property?.location?.address || '________'}, ${property?.location?.city || ''}, ${property?.location?.district || ''}, ${property?.location?.state || ''} - ${property?.location?.pincode || ''}</td></tr>
  <tr><td class="label">Area:</td><td>${property?.area?.value || '________'} ${property?.area?.unit || ''}</td></tr>
</table>

<div class="section">
  <span class="section-title">TERMS AND CONDITIONS</span>
</div>

<ol>
  <li>This agreement is for a period of <strong>${deal.duration || 11} months</strong>, commencing from <strong>${formatDate(deal.startDate)}</strong>.</li>
  <li>The Tenant shall pay a monthly rent of <strong>₹${(deal.rentAmount || 0).toLocaleString('en-IN')}/-</strong> (Rupees ${numberToWords(deal.rentAmount)} only) on or before the 5th day of each English calendar month.</li>
  <li>The Tenant has paid an interest-free refundable security deposit of <strong>₹${(deal.depositAmount || 0).toLocaleString('en-IN')}/-</strong> to the Owner, which shall be refunded at the time of vacating the premises, subject to deductions for damages, if any.</li>
  <li>${deal.maintenanceCharges > 0 ? `The Tenant shall pay maintenance charges of ₹${deal.maintenanceCharges.toLocaleString('en-IN')}/- per month.` : 'Maintenance charges shall be borne by the Owner.'}</li>
  <li>The Tenant shall use the premises for residential/commercial purposes only and shall not sublet the same without the written consent of the Owner.</li>
  <li>The Tenant shall pay all utility bills including electricity, water, and other charges as per actual consumption.</li>
  <li>Either party may terminate this agreement by giving <strong>${deal.noticePeriod || 1} month(s)</strong> written notice.</li>
  <li>The Tenant shall keep the premises in good condition and shall not make any structural changes without the Owner's written consent.</li>
  <li>In case of any dispute, the matter shall be subject to the jurisdiction of courts at <strong>${property?.location?.city || '________'}</strong>.</li>
</ol>

<div class="section">
  <span class="section-title">WITNESSES</span>
</div>

<table>
  <tr>
    <td style="width: 50%;">
      <strong>Witness 1 (Owner's Side):</strong><br>
      Name: ${deal.ownerWitness?.name || '____________________'}<br>
      Father's Name: ${deal.ownerWitness?.fatherName || '____________________'}<br>
      Address: ${deal.ownerWitness?.address || '____________________'}<br>
      Mobile: ${deal.ownerWitness?.phone || '____________________'}
    </td>
    <td style="width: 50%;">
      <strong>Witness 2 (Tenant's Side):</strong><br>
      Name: ${deal.tenantWitness?.name || '____________________'}<br>
      Father's Name: ${deal.tenantWitness?.fatherName || '____________________'}<br>
      Address: ${deal.tenantWitness?.address || '____________________'}<br>
      Mobile: ${deal.tenantWitness?.phone || '____________________'}
    </td>
  </tr>
</table>

<div class="signature-row">
  <div class="signature-box">
    <div class="signature-line">
      <strong>OWNER</strong><br>
      ${owner?.fullName || '________'}
    </div>
  </div>
  <div class="signature-box">
    <div class="signature-line">
      <strong>TENANT</strong><br>
      ${tenant?.fullName || '________'}
    </div>
  </div>
</div>

</body>
</html>
  `;

  const fileName = `rent-${deal.agreementNumber}.pdf`;
  const outputPath = path.join(__dirname, '..', 'uploads', 'agreements', fileName);
  await generatePdf(html, outputPath);
  return `/uploads/agreements/${fileName}`;
};

/**
 * Generate Sale Agreement PDF
 */
const generateSaleAgreement = async (deal) => {
  const seller = deal.seller;
  const buyer = deal.buyer;
  const property = deal.property;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 4px; text-decoration: underline; }
  h2 { text-align: center; font-size: 12pt; margin-top: 0; font-weight: normal; }
  .header-info { text-align: right; font-size: 10pt; margin-bottom: 20px; }
  .section { margin: 16px 0; text-align: justify; }
  .section-title { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 6px; vertical-align: top; }
  .label { font-weight: bold; width: 35%; }
  .signature-row { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { text-align: center; width: 45%; }
  .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 4px; font-size: 10pt; }
  ol { padding-left: 20px; }
  li { margin: 6px 0; text-align: justify; }
</style>
</head>
<body>

<div class="header-info">
  Agreement No: <strong>${deal.agreementNumber || 'SA-____-_____'}</strong><br>
  Date: <strong>${formatDate(new Date())}</strong>
</div>

<h1>SALE AGREEMENT</h1>
<h2>(Agreement to Sell)</h2>

<div class="section">
  This Sale Agreement is made and executed on this <strong>${formatDate(new Date())}</strong> at <strong>${property?.location?.city || '________'}</strong>.
</div>

<div class="section"><span class="section-title">BETWEEN</span></div>

<table>
  <tr><td class="label">Seller Name:</td><td>${seller?.fullName || '________'}</td></tr>
  <tr><td class="label">Father's Name:</td><td>${seller?.fatherName || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${seller?.permanentAddress || seller?.location?.address || '________'}</td></tr>
  <tr><td class="label">Mobile:</td><td>${seller?.phone || '________'}</td></tr>
</table>

<div class="section">(Hereinafter referred to as the <strong>"SELLER"</strong>)</div>

<div class="section"><span class="section-title">AND</span></div>

<table>
  <tr><td class="label">Buyer Name:</td><td>${buyer?.fullName || '________'}</td></tr>
  <tr><td class="label">Father's Name:</td><td>${buyer?.fatherName || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${buyer?.permanentAddress || buyer?.location?.address || '________'}</td></tr>
  <tr><td class="label">Mobile:</td><td>${buyer?.phone || '________'}</td></tr>
</table>

<div class="section">(Hereinafter referred to as the <strong>"BUYER"</strong>)</div>

<div class="section">
  <span class="section-title">WHEREAS</span> the Seller is the absolute owner of the property described below and has agreed to sell the same to the Buyer, and the Buyer has agreed to purchase the same, on the following terms and conditions.
</div>

<div class="section"><span class="section-title">PROPERTY DESCRIPTION</span></div>

<table>
  <tr><td class="label">Property Title:</td><td>${property?.title || '________'}</td></tr>
  <tr><td class="label">Property Type:</td><td>${property?.propertyType || '________'}</td></tr>
  <tr><td class="label">Address:</td><td>${property?.location?.address || '________'}, ${property?.location?.city || ''}, ${property?.location?.district || ''}, ${property?.location?.state || ''} - ${property?.location?.pincode || ''}</td></tr>
  <tr><td class="label">Area:</td><td>${property?.area?.value || '________'} ${property?.area?.unit || ''}</td></tr>
  <tr><td class="label">Khasra / Plot No:</td><td>${property?.khasraNumber || '________'}</td></tr>
</table>

<div class="section"><span class="section-title">TERMS AND CONDITIONS</span></div>

<ol>
  <li>The total sale consideration of the property is fixed at <strong>₹${(deal.finalAmount || 0).toLocaleString('en-IN')}/-</strong> (Rupees ${numberToWords(deal.finalAmount)} only).</li>
  <li>The Buyer has paid a token/advance amount of <strong>₹${(deal.tokenAmount || 0).toLocaleString('en-IN')}/-</strong> to the Seller on the date of this agreement.</li>
  <li>The balance amount of <strong>₹${((deal.finalAmount || 0) - (deal.tokenAmount || 0)).toLocaleString('en-IN')}/-</strong> shall be paid at the time of registration of the sale deed.</li>
  <li>The Seller shall execute the sale deed in favour of the Buyer or his/her nominee within the agreed time.</li>
  <li>The Seller shall hand over the peaceful and vacant possession of the property to the Buyer at the time of registration.</li>
  <li>The Seller declares that the property is free from all encumbrances, mortgages, liens, and litigation.</li>
  <li>The Seller shall produce all original documents for verification before the Sub-Registrar.</li>
  <li>All expenses for stamp duty and registration shall be borne by the Buyer.</li>
  <li>If the Buyer fails to complete the transaction, the token amount shall be forfeited by the Seller.</li>
  <li>If the Seller fails to complete the transaction, he/she shall refund double the token amount to the Buyer.</li>
  <li>In case of any dispute, the matter shall be subject to the jurisdiction of courts at <strong>${property?.location?.city || '________'}</strong>.</li>
</ol>

<div class="section"><span class="section-title">WITNESSES</span></div>

<table>
  <tr>
    <td style="width: 50%;">
      <strong>Witness 1 (Seller's Side):</strong><br>
      Name: ${deal.sellerWitness?.name || '____________________'}<br>
      Father's Name: ${deal.sellerWitness?.fatherName || '____________________'}<br>
      Address: ${deal.sellerWitness?.address || '____________________'}<br>
      Mobile: ${deal.sellerWitness?.phone || '____________________'}
    </td>
    <td style="width: 50%;">
      <strong>Witness 2 (Buyer's Side):</strong><br>
      Name: ${deal.buyerWitness?.name || '____________________'}<br>
      Father's Name: ${deal.buyerWitness?.fatherName || '____________________'}<br>
      Address: ${deal.buyerWitness?.address || '____________________'}<br>
      Mobile: ${deal.buyerWitness?.phone || '____________________'}
    </td>
  </tr>
</table>

<div class="signature-row">
  <div class="signature-box">
    <div class="signature-line">
      <strong>SELLER</strong><br>
      ${seller?.fullName || '________'}
    </div>
  </div>
  <div class="signature-box">
    <div class="signature-line">
      <strong>BUYER</strong><br>
      ${buyer?.fullName || '________'}
    </div>
  </div>
</div>

</body>
</html>
  `;

  const fileName = `sale-${deal.agreementNumber}.pdf`;
  const outputPath = path.join(__dirname, '..', 'uploads', 'agreements', fileName);
  await generatePdf(html, outputPath);
  return `/uploads/agreements/${fileName}`;
};

/**
 * Helper: Convert number to words (Indian system)
 */
const numberToWords = (num) => {
  if (!num || num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  return inWords(Math.floor(num));
};

module.exports = {
  generateRentAgreement,
  generateSaleAgreement,
};
