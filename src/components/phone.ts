/** Colombian numbers as stored by ingest (HU-32): 10 digits, mobile 3XX or landline 60X. */
const NATIONAL = /^(\d{3})(\d{3})(\d{4})$/;

/** "3001234567" → "300 123 4567"; other formats stay as they are. */
export function formatPhone(phone: string): string {
  const match = NATIONAL.exec(phone);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : phone;
}

/** A tel: link that works from abroad too: "3001234567" → "tel:+573001234567". */
export function phoneHref(phone: string): string {
  return `tel:${NATIONAL.test(phone) ? `+57${phone}` : phone}`;
}
