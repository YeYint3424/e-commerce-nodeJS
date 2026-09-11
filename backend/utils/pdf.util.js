const PDFDocument = require('pdfkit');

const STATUS_COLORS = {
  PENDING: '#d97706',
  CONFIRMED: '#2563eb',
  PROCESSING: '#2563eb',
  SHIPPED: '#2563eb',
  DELIVERED: '#059669',
  COMPLETED: '#059669',
  CANCELLED: '#dc2626',
  PAYMENT_FAILED: '#dc2626',
};

const PAGE_LEFT = 50;
const PAGE_RIGHT = 545;
const PAGE_BOTTOM = 760;

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function fullDate(date) {
  if (!date) {
    return '-';
  }
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 50;
  }
  return y;
}

function writeVoucherPdf(voucher, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  doc.rect(PAGE_LEFT, 45, 36, 36).fill('#4f46e5');
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('S', PAGE_LEFT, 56, { width: 36, align: 'center' });

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(22).text('Shoply', 96, 50);
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Order Voucher', 96, 76);

  doc.moveTo(PAGE_LEFT, 95).lineTo(PAGE_RIGHT, 95).strokeColor('#e5e7eb').stroke();

  let y = 115;
  doc.fillColor('#111827').fontSize(10);

  doc.font('Helvetica-Bold').text('Voucher ID: ', PAGE_LEFT, y, { continued: true }).font('Helvetica').text(voucher.voucherId);
  y += 15;
  doc.font('Helvetica-Bold').text('Order ID: ', PAGE_LEFT, y, { continued: true }).font('Helvetica').text(String(voucher.orderId));
  y += 15;
  doc
    .font('Helvetica-Bold')
    .text('Order Date: ', PAGE_LEFT, y, { continued: true })
    .font('Helvetica')
    .text(fullDate(voucher.createdAt));
  y += 30;

  doc.font('Helvetica-Bold').fontSize(12).text('Customer', PAGE_LEFT, y);
  y += 18;
  doc.font('Helvetica').fontSize(10);
  doc.text(`Name: ${voucher.customer.name || '-'}`, PAGE_LEFT, y);
  y += 14;
  doc.text(`Email: ${voucher.customer.email || '-'}`, PAGE_LEFT, y);
  y += 14;
  doc.text(`Phone: ${voucher.customer.phone || '-'}`, PAGE_LEFT, y);
  y += 14;
  doc.text(`Address: ${voucher.customer.address || '-'}`, PAGE_LEFT, y, { width: PAGE_RIGHT - PAGE_LEFT });
  y += 30;

  doc.font('Helvetica-Bold').fontSize(12).text('Items', PAGE_LEFT, y);
  y += 20;

  const col = { product: PAGE_LEFT, qty: 300, unit: 360, subtotal: 450 };
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Product', col.product, y);
  doc.text('Qty', col.qty, y);
  doc.text('Unit Price', col.unit, y);
  doc.text('Subtotal', col.subtotal, y);
  y += 15;
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#e5e7eb').stroke();
  y += 8;

  doc.font('Helvetica').fontSize(10);
  voucher.items.forEach((item) => {
    y = ensureSpace(doc, y, 20);
    doc.text(item.productName, col.product, y, { width: col.qty - col.product - 10 });
    doc.text(String(item.quantity), col.qty, y);
    doc.text(money(item.unitPrice), col.unit, y);
    doc.text(money(item.subtotal), col.subtotal, y);
    y += 20;
  });

  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#e5e7eb').stroke();
  y += 12;

  y = ensureSpace(doc, y, 40);
  doc.font('Helvetica').fontSize(10).text(`Subtotal: ${money(voucher.subtotal)}`, 350, y, { width: 195, align: 'right' });
  y += 16;
  doc.font('Helvetica-Bold').fontSize(12).text(`Total: ${money(voucher.total)}`, 350, y, { width: 195, align: 'right' });
  y += 34;

  y = ensureSpace(doc, y, 60);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Payment Method', PAGE_LEFT, y);
  y += 18;
  doc.font('Helvetica').fontSize(10);
  if (voucher.paymentMethod) {
    doc.text(`${voucher.paymentMethod.name} (${voucher.paymentMethod.type})`, PAGE_LEFT, y);
    y += 14;
    doc.text(`Status: ${voucher.paymentMethod.status}`, PAGE_LEFT, y);
  } else {
    doc.text('Not yet selected', PAGE_LEFT, y);
  }
  y += 34;

  y = ensureSpace(doc, y, 50);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Order Status', PAGE_LEFT, y);
  y += 18;
  const statusColor = STATUS_COLORS[voucher.orderStatus] || '#374151';
  doc.roundedRect(PAGE_LEFT, y, 130, 22, 4).fill(statusColor);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(voucher.orderStatus, PAGE_LEFT, y + 6, { width: 130, align: 'center' });
  doc.fillColor('#111827');
  y += 42;

  if (Array.isArray(voucher.changeNotes) && voucher.changeNotes.length) {
    y = ensureSpace(doc, y, 40);
    doc.font('Helvetica-Bold').fontSize(12).text('Change Notes', PAGE_LEFT, y);
    y += 18;
    doc.font('Helvetica').fontSize(10);
    voucher.changeNotes.forEach((note) => {
      y = ensureSpace(doc, y, 20);
      doc.text(`- ${note.reason || 'No reason provided'} (${fullDate(note.createdAt)})`, PAGE_LEFT, y, {
        width: PAGE_RIGHT - PAGE_LEFT,
      });
      y += 18;
    });
  }

  doc.end();
}

module.exports = { writeVoucherPdf };
