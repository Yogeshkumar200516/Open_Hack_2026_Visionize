import emailjs from "@emailjs/browser";

export const sendEmailWithAttachment = async (blob, invoice, companyInfo) => {
  const file = new File([blob], `Invoice_${invoice.invoice_number}.pdf`, {
    type: "application/pdf",
  });

  const formData = new FormData();
  formData.append("to_name", invoice.customer_name);
  formData.append("to_email", invoice.customer_email);
  formData.append("from_name", companyInfo.name);
  formData.append("reply_to", companyInfo.mobile); // fallback to admin number
  formData.append("message", `Please find your invoice ${invoice.invoice_number} attached.`);
  formData.append("invoice_file", file);

  try {
    const result = await emailjs.sendForm(
      "YOUR_SERVICE_ID",
      "YOUR_TEMPLATE_ID",
      formData,
      "YOUR_PUBLIC_KEY"
    );
    console.log("Email sent:", result.text);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};
