import QRCode from "qrcode";
import { SETTING_KEYS } from "@dbpcms/shared";
import { prisma } from "../../core/db/prisma.js";
import { settingsService } from "../settings/settings.service.js";
import { verificationService } from "../verification/verification.service.js";
import { transcriptsService } from "./transcripts.service.js";
import { storage } from "../../core/file-storage/index.js";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "&mdash;";
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function studentPhotoDataUrl(studentId: string): Promise<string | null> {
  const s = await prisma.student.findFirst({ where: { id: studentId }, select: { photoStorageKey: true } });
  if (!s?.photoStorageKey) return null;
  try {
    const data = await storage.read(s.photoStorageKey);
    return `data:image/jpeg;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Builds a self-contained A4 HTML transcript with per-semester grades, semester
 * + cumulative GPA, a QR verification code, and a photo box (uses the student's
 * photo if set, otherwise leaves a labelled square for a physical photo).
 */
export async function buildTranscriptHtml(
  studentId: string,
  publicBaseUrl: string,
  issuedBy?: string | null,
): Promise<string> {
  const t = await transcriptsService.build(studentId);
  const institution = await settingsService.get(SETTING_KEYS.INSTITUTION_NAME);

  const verification = await verificationService.issue({
    documentKind: "transcript",
    subjectType: "student",
    subjectId: studentId,
    subjectLabel: `${t.student.name} (${t.student.studentNumber})`,
    issuedBy,
  });
  const verifyUrl = `${publicBaseUrl}/verify?code=${encodeURIComponent(verification.code)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const photoDataUrl = await studentPhotoDataUrl(studentId);

  const semesterBlocks = t.semesters
    .map((sem) => {
      const rows = sem.rows
        .map(
          (r) => `<tr>
            <td>${esc(r.code)}</td><td>${esc(r.title)}</td>
            <td class="c">${esc(r.creditHours)}</td>
            <td class="c">${esc(r.letter)}</td>
            <td class="c">${r.gradePoint ?? "&mdash;"}</td>
            <td class="c">${r.isPass === null ? "&mdash;" : r.isPass ? "Pass" : "Fail"}</td>
          </tr>`,
        )
        .join("");
      return `<div class="sem">
        <div class="sem-head">${esc(sem.semesterName)} &middot; ${esc(sem.academicYear)}</div>
        <table><thead><tr><th>Code</th><th>Course</th><th class="c">Cr</th><th class="c">Grade</th><th class="c">Pt</th><th class="c">Result</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="sem-gpa">Semester GPA: <strong>${sem.semesterGpa.toFixed(2)}</strong> &middot; Credits: ${sem.semesterCredits}</div>
      </div>`;
    })
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>Transcript — ${esc(t.student.name)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 12px; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 12px; }
  .header h1 { font-size: 18px; margin: 0 0 2px; color: #1d4ed8; }
  .header .sub { color: #475569; font-size: 12px; }
  .photo-box { width: 90px; height: 110px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 9px; color: #94a3b8; overflow: hidden; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 14px; }
  .meta .f span { font-size: 9px; text-transform: uppercase; color: #94a3b8; display: block; }
  .sem { margin-bottom: 12px; page-break-inside: avoid; }
  .sem-head { background: #f1f5f9; padding: 5px 8px; font-weight: bold; font-size: 12px; border-left: 3px solid #1d4ed8; }
  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  th { background: #f8fafc; color: #475569; }
  td.c, th.c { text-align: center; }
  .sem-gpa { text-align: right; font-size: 11px; color: #334155; padding: 4px 6px; }
  .summary { margin-top: 10px; padding: 10px; background: #eff6ff; border-radius: 6px; display: flex; justify-content: space-around; page-break-inside: avoid; }
  .summary div { text-align: center; }
  .summary .n { font-size: 18px; font-weight: bold; color: #1d4ed8; }
  .summary .l { font-size: 9px; text-transform: uppercase; color: #64748b; }
  .verify { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; align-items: center; gap: 12px; page-break-inside: avoid; }
  .verify img { width: 84px; height: 84px; }
  .verify .code { font-family: monospace; font-size: 13px; letter-spacing: .05em; }
  .footer { margin-top: 8px; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print { .noprint { display: none; } }
</style></head><body>
  <div class="noprint" style="padding:10px;background:#eef2ff;text-align:center;"><button onclick="window.print()" style="padding:8px 16px;font-size:13px;cursor:pointer;">Print / Save as PDF</button></div>

  <div class="header">
    <div><h1>${esc(institution)}</h1><div class="sub">Official Academic Transcript</div></div>
    <div class="photo-box">${photoDataUrl ? `<img src="${photoDataUrl}" alt="Student photo" />` : "Affix<br/>photo"}</div>
  </div>

  <div class="meta">
    <div class="f"><span>Student name</span>${esc(t.student.name)}</div>
    <div class="f"><span>Student number</span>${esc(t.student.studentNumber)}</div>
    <div class="f"><span>Program</span>${esc(t.student.program)} (${esc(t.student.degreeLevel)})</div>
    <div class="f"><span>Department</span>${esc(t.student.department)}</div>
    <div class="f"><span>Status</span>${esc(t.student.status)}</div>
  </div>

  ${t.hasResults ? semesterBlocks : `<p style="color:#64748b;font-style:italic;">No published results yet.</p>`}

  <div class="summary">
    <div><div class="n">${t.cumulativeGpa.toFixed(2)}</div><div class="l">Cumulative GPA</div></div>
    <div><div class="n">${t.creditsAttempted}</div><div class="l">Credits attempted</div></div>
    <div><div class="n">${t.creditsEarned}</div><div class="l">Credits earned</div></div>
  </div>

  <div class="verify">
    <img src="${qrDataUrl}" alt="Verification QR" />
    <div><div>Scan to verify authenticity, or enter this code on the verification page:</div><div class="code">${esc(verification.code)}</div></div>
  </div>
  <div class="footer">Generated ${new Date().toLocaleString()} &middot; ${esc(institution)} &middot; System-generated document.</div>
</body></html>`;
}
