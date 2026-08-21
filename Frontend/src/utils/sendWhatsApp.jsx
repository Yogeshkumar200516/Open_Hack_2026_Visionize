export const sendWhatsAppMessage = (blob, invoice, customerMobile) => {
  const blobUrl = URL.createObjectURL(blob);

  const message = encodeURIComponent(
    `Dear ${invoice.customer_name},\n\nHere is your invoice (${invoice.invoice_number}).\n\nDownload: ${blobUrl}\n\nRegards,\n${invoice.company_name}`
  );

  const waLink = `https://wa.me/91${customerMobile}?text=${message}`;
  window.open(waLink, "_blank"); // Open WhatsApp
};
