import QRCode from "qrcode";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  SETTING_KEYS,
} from "@dbpcms/shared";
import { NotFoundError } from "../../core/errors/app-error.js";
import { prisma } from "../../core/db/prisma.js";
import { settingsService } from "../settings/settings.service.js";
import { verificationService } from "../verification/verification.service.js";
import { photoService } from "./photo.service.js";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "&mdash;";
  return String(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
function fmtDate(d?: Date | null): string {
  return d ? new Date(d).toLocaleDateString() : "";
}

/**
 * Builds a self-contained A4 HTML document for an employee profile, with a QR
 * verification code. All CSS is inline (@page + print rules) so it prints and
 * saves-to-PDF cleanly, fits A4, and breaks between sections without cutting
 * content. The browser's print dialog handles PDF export.
 */
export async function buildEmployeeProfileHtml(
  employeeId: string,
  publicBaseUrl: string,
  issuedBy?: string | null,
): Promise<string> {
  const e = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    include: {
      department: { select: { name: true } },
      supervisor: { select: { firstName: true, lastName: true } },
      education: true,
      qualifications: true,
      employmentHistory: true,
      emergencyContacts: true,
    },
  });
  if (!e) throw new NotFoundError("Employee not found.");

  const institution = await settingsService.get(SETTING_KEYS.INSTITUTION_NAME);
  const name = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");

  const verification = await verificationService.issue({
    documentKind: "employee_profile",
    subjectType: "employee",
    subjectId: e.id,
    subjectLabel: `${name} (${e.employeeNumber})`,
    issuedBy,
  });
  const verifyUrl = `${publicBaseUrl}/verify?code=${encodeURIComponent(verification.code)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const photoDataUrl = await photoService.getPhotoDataUrl(e.id);

  const field = (label: string, value: unknown): string =>
    `<div class="field"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></div>`;

  const rows = (
    items: unknown[],
    headers: string[],
    render: (item: never) => string[],
  ): string => {
    if (items.length === 0) return `<p class="empty">None recorded.</p>`;
    const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const body = items
      .map((it) => `<tr>${render(it as never).map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("");
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Employee Profile — ${esc(name)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 12px; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { font-size: 18px; margin: 0 0 2px; color: #1d4ed8; }
  .header .sub { color: #475569; font-size: 12px; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .photo { width: 84px; height: 84px; border-radius: 6px; object-fit: cover;
           border: 1px solid #cbd5e1; }
  .person { text-align: right; }
  .person .n { font-size: 15px; font-weight: bold; }
  .person .no { font-family: monospace; color: #64748b; }
  .section { margin: 14px 0; page-break-inside: avoid; }
  .section h2 { font-size: 13px; color: #1d4ed8; border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px; margin: 0 0 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
  .field { display: flex; flex-direction: column; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; }
  .value { font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  th { background: #f8fafc; color: #475569; }
  .empty { color: #94a3b8; font-style: italic; }
  .verify { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #cbd5e1;
            display: flex; align-items: center; gap: 12px; page-break-inside: avoid; }
  .verify img { width: 90px; height: 90px; }
  .verify .txt { font-size: 10px; color: #475569; }
  .verify .code { font-family: monospace; font-size: 13px; color: #1e293b; letter-spacing: .05em; }
  .footer { margin-top: 8px; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print { .noprint { display: none; } }
</style></head>
<body>
  <div class="noprint" style="padding:10px;background:#eef2ff;text-align:center;">
    <button onclick="window.print()" style="padding:8px 16px;font-size:13px;cursor:pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div class="header-left">
      ${photoDataUrl ? `<img class="photo" src="${photoDataUrl}" alt="Employee photo" />` : ""}
      <div><h1>${esc(institution)}</h1><div class="sub">Official Employee Profile</div></div>
    </div>
    <div class="person"><div class="n">${esc(name)}</div>
      <div class="no">${esc(e.employeeNumber)}</div>
      <div class="sub">${esc(e.position)} &middot; ${esc(e.department?.name)}</div></div>
  </div>

  <div class="section"><h2>Personal Information</h2><div class="grid">
    ${field("Gender", e.gender)}${field("Date of birth", fmtDate(e.dateOfBirth))}
    ${field("Marital status", e.maritalStatus)}${field("Nationality", e.nationality)}
    ${field("National ID", e.nationalId)}${field("Tax ID", e.taxId)}
    ${field("Phone", e.phoneNumber)}${field("Email", e.email)}${field("Address", e.address)}
  </div></div>

  <div class="section"><h2>Employment Information</h2><div class="grid">
    ${field("Department", e.department?.name)}${field("Position", e.position)}
    ${field("Employment type", EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? e.employmentType)}
    ${field("Status", EMPLOYMENT_STATUS_LABELS[e.employmentStatus] ?? e.employmentStatus)}
    ${field("Date of employment", fmtDate(e.dateOfEmployment))}
    ${field("Contract type", e.contractType)}${field("Contract end", fmtDate(e.contractEndDate))}
    ${field("Salary grade", e.salaryGrade)}${field("Office", e.officeLocation)}
    ${field("Supervisor", e.supervisor ? `${e.supervisor.firstName} ${e.supervisor.lastName}` : null)}
  </div></div>

  <div class="section"><h2>Education</h2>
    ${rows(e.education, ["Institution", "Qualification", "Field", "Year", "GPA"],
      (x: { institution: string; qualification: string; fieldOfStudy: string | null; graduationYear: number | null; gpa: string | null }) =>
        [esc(x.institution), esc(x.qualification), esc(x.fieldOfStudy), esc(x.graduationYear), esc(x.gpa)])}
  </div>

  <div class="section"><h2>Professional Qualifications</h2>
    ${rows(e.qualifications, ["Type", "Title", "Issuer", "Expiry"],
      (x: { type: string; title: string; issuer: string | null; expiryDate: Date | null }) =>
        [esc(x.type), esc(x.title), esc(x.issuer), esc(fmtDate(x.expiryDate))])}
  </div>

  <div class="section"><h2>Employment History</h2>
    ${rows(e.employmentHistory, ["Employer", "Position", "From", "To"],
      (x: { employer: string; position: string; startDate: Date | null; endDate: Date | null }) =>
        [esc(x.employer), esc(x.position), esc(fmtDate(x.startDate)), esc(fmtDate(x.endDate))])}
  </div>

  <div class="section"><h2>Emergency Contacts</h2>
    ${rows(e.emergencyContacts, ["Name", "Relationship", "Phone"],
      (x: { name: string; relationship: string | null; phoneNumber: string }) =>
        [esc(x.name), esc(x.relationship), esc(x.phoneNumber)])}
  </div>

  <div class="verify">
    <img src="${qrDataUrl}" alt="Verification QR" />
    <div class="txt">
      <div>Scan to verify this document's authenticity, or visit the verification page and enter:</div>
      <div class="code">${esc(verification.code)}</div>
    </div>
  </div>
  <div class="footer">Generated ${new Date().toLocaleString()} &middot; ${esc(institution)} &middot; This is a system-generated document.</div>
</body></html>`;
}
