import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';
import { RadiologyStudyReport } from '../types';

export class RadiologyExportService {
  /**
   * Generates and triggers download of a native Microsoft Word (.docx) document
   */
  static async exportToDocx(report: RadiologyStudyReport, clinicName = 'HR DIAGNOSTICS & IMAGING COMPLEX') {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720, // 0.5 inch
                  bottom: 720,
                  left: 1080, // 0.75 inch
                  right: 1080,
                },
              },
            },
            children: [
              // Header Brand
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: clinicName,
                    bold: true,
                    size: 32, // 16pt
                    color: '0F2942',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'DEPARTMENT OF RADIOLOGY & CLINICAL IMAGING • ULTRASOUND & DIGITAL RADIOGRAPHY',
                    bold: true,
                    size: 18,
                    color: '475569',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Main Boulevard, Gulberg III, Lahore | UAN: +92 (42) 111-473-424 | Web: www.hrdiagnostics.com',
                    size: 16,
                    color: '64748B',
                  }),
                ],
                spacing: { after: 200 },
              }),

              // Horizontal Divider
              new Paragraph({
                text: '_________________________________________________________________________________',
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),

              // Patient Information Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Patient Name: ', bold: true, size: 20 }),
                              new TextRun({ text: report.patientName, size: 20 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'MR Number: ', bold: true, size: 18 }),
                              new TextRun({ text: report.patientMRN, size: 18 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Age / Gender: ', bold: true, size: 18 }),
                              new TextRun({ text: `${report.age} Yrs / ${report.gender}`, size: 18 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Contact: ', bold: true, size: 18 }),
                              new TextRun({ text: report.contactNumber || 'N/A', size: 18 }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Study ID: ', bold: true, size: 20, color: '0F2942' }),
                              new TextRun({ text: report.studyId, bold: true, size: 20, color: '0F2942' }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Exam Date: ', bold: true, size: 18 }),
                              new TextRun({ text: report.examinationDate, size: 18 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Ref. Doctor: ', bold: true, size: 18 }),
                              new TextRun({ text: report.referringDoctor || 'Self / Walk-in', size: 18 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Report Status: ', bold: true, size: 18 }),
                              new TextRun({ text: report.status.toUpperCase(), bold: true, color: report.status === 'Approved' ? '15803D' : 'B45309', size: 18 }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              new Paragraph({ spacing: { before: 200, after: 100 } }),

              // Examination Title Banner
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.examinationType.toUpperCase(),
                    bold: true,
                    size: 26,
                    color: '1E3A8A',
                    underline: {},
                  }),
                ],
                spacing: { before: 150, after: 150 },
              }),

              // Clinical History
              ...(report.clinicalHistory
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'CLINICAL HISTORY / INDICATION: ', bold: true, size: 19 }),
                        new TextRun({ text: report.clinicalHistory, size: 19, italics: true }),
                      ],
                      spacing: { after: 200 },
                    }),
                  ]
                : []),

              // Findings Header
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'IMAGING FINDINGS & OBSERVATIONS:',
                    bold: true,
                    size: 22,
                    color: '0F2942',
                  }),
                ],
                spacing: { before: 150, after: 120 },
              }),

              // Findings Content: Structured or FreeForm
              ...this.buildFindingsParagraphsForDocx(report),

              new Paragraph({ spacing: { before: 200, after: 100 } }),

              // Impression Box / Heading
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'IMPRESSION / CONCLUSION:',
                    bold: true,
                    size: 22,
                    color: '0F2942',
                  }),
                ],
                spacing: { before: 150, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.impression || 'Study within normal limits.',
                    bold: true,
                    size: 20,
                    color: '1E293B',
                  }),
                ],
                spacing: { after: 200 },
              }),

              // Recommendations
              ...(report.recommendations
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'ADVICE / RECOMMENDATIONS: ', bold: true, size: 18 }),
                        new TextRun({ text: report.recommendations, size: 18 }),
                      ],
                      spacing: { after: 250 },
                    }),
                  ]
                : []),

              new Paragraph({ spacing: { before: 300 } }),

              // Signature Table / Footer Sign-off
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Medical Typist / Verified by: ', size: 16, color: '64748B' }),
                              new TextRun({ text: report.typistName || 'Radiology Department', size: 16 }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: `Version: ${report.version || 1} • Report Date: ${report.updatedAt?.split('T')[0] || report.examinationDate}`, size: 16, color: '64748B' }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: report.reportingDoctorName, bold: true, size: 20, color: '0F2942' }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: report.reportingDoctorQualification || 'Consultant Radiologist', size: 17, color: '475569' }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: report.reportingDoctorRegNo ? `Reg No: ${report.reportingDoctorRegNo}` : 'Digital Verified', size: 16, color: '64748B' }),
                            ],
                          }),
                          ...(report.approvedAt
                            ? [
                                new Paragraph({
                                  alignment: AlignmentType.RIGHT,
                                  children: [
                                    new TextRun({ text: `Electronically Signed: ${new Date(report.approvedAt).toLocaleString()}`, size: 15, color: '15803D', italics: true }),
                                  ],
                                }),
                              ]
                            : []),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Disclaimer
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Note: This is a diagnostic medical report to be interpreted by a registered medical practitioner in clinical context.',
                    size: 14,
                    color: '94A3B8',
                    italics: true,
                  }),
                ],
                spacing: { before: 200 },
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.patientName.replace(/\s+/g, '_')}_${report.studyId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Word export failed', e);
      throw e;
    }
  }

  private static buildFindingsParagraphsForDocx(report: RadiologyStudyReport): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // If structured findings exist
    if (report.structuredFindings && Object.keys(report.structuredFindings).length > 0) {
      Object.entries(report.structuredFindings).forEach(([secKey, content]) => {
        if (!content || !content.trim()) return;
        const cleanTitle = secKey.replace(/^sec_/, '').replace(/_/g, ' ').toUpperCase();
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${cleanTitle}: `, bold: true, size: 19, color: '1E3A8A' }),
              new TextRun({ text: content, size: 19 }),
            ],
            spacing: { after: 120 },
          })
        );
      });
      return paragraphs;
    }

    // Otherwise clean HTML free-form content
    if (report.freeFormContent) {
      const cleanText = report.freeFormContent
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<strong>/gi, '**')
        .replace(/<\/strong>/gi, '**')
        .replace(/<[^>]+>/g, '');

      cleanText.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, size: 19 })],
              spacing: { after: 100 },
            })
          );
        }
      });
      return paragraphs;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Detailed study findings within normal limits.', size: 19 })],
      })
    );
    return paragraphs;
  }

  /**
   * Generates and triggers download of a structured multi-worksheet Excel (.xlsx) workbook
   */
  static exportToExcel(report: RadiologyStudyReport) {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Master Summary
      const summaryData = [
        ['HR DIAGNOSTICS & IMAGING COMPLEX - RADIOLOGY STUDY SUMMARY', ''],
        ['Report Generated At', new Date().toLocaleString()],
        ['', ''],
        ['METRIC', 'VALUE'],
        ['Study ID', report.studyId],
        ['Patient MR Number', report.patientMRN],
        ['Patient Name', report.patientName],
        ['Age & Gender', `${report.age} Years / ${report.gender}`],
        ['Contact Mobile', report.contactNumber || 'N/A'],
        ['Examination Date', report.examinationDate],
        ['Modality', report.modality],
        ['Examination Title', report.examinationType],
        ['Referring Doctor', report.referringDoctor || 'Self'],
        ['Reporting Radiologist', report.reportingDoctorName],
        ['Doctor Qualification', report.reportingDoctorQualification || 'Radiologist'],
        ['Doctor PMDC/Reg', report.reportingDoctorRegNo || 'N/A'],
        ['Report Status', report.status],
        ['Current Version', report.version || 1],
        ['Approved At', report.approvedAt ? new Date(report.approvedAt).toLocaleString() : 'Pending'],
        ['Delivered Status', report.isDelivered ? `Delivered to: ${report.deliveredTo || 'Patient'}` : 'Not Delivered'],
        ['Clinical Indication', report.clinicalHistory || 'None specified'],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Report Summary');

      // Sheet 2: Structured Findings
      const findingsRows: any[] = [['SECTION / ORGAN', 'FINDINGS & OBSERVATIONS', 'STATUS']];
      if (report.structuredFindings && Object.keys(report.structuredFindings).length > 0) {
        Object.entries(report.structuredFindings).forEach(([k, v]) => {
          const sectionName = k.replace(/^sec_/, '').replace(/_/g, ' ').toUpperCase();
          findingsRows.push([sectionName, v, 'Documented']);
        });
      } else {
        findingsRows.push(['Free-Form Narrative', report.freeFormContent.replace(/<[^>]+>/g, ''), 'Documented']);
      }
      const wsFindings = XLSX.utils.aoa_to_sheet(findingsRows);
      XLSX.utils.book_append_sheet(wb, wsFindings, 'Organ Findings');

      // Sheet 3: Impression & Recommendations
      const impRows = [
        ['CATEGORY', 'DETAILS'],
        ['Final Impression', report.impression || 'Normal study'],
        ['Recommendations', report.recommendations || 'None'],
        ['Clinical Indication', report.clinicalHistory || 'N/A'],
      ];
      const wsImp = XLSX.utils.aoa_to_sheet(impRows);
      XLSX.utils.book_append_sheet(wb, wsImp, 'Impression');

      // Sheet 4: Version & Audit History
      const versionRows: any[] = [['VERSION', 'DATE & TIME', 'USER', 'ROLE', 'STATUS', 'ACTION SUMMARY']];
      if (report.versionHistory && report.versionHistory.length > 0) {
        report.versionHistory.forEach((v) => {
          versionRows.push([
            v.version,
            new Date(v.timestamp).toLocaleString(),
            v.userName,
            v.userRole,
            v.status,
            v.changeSummary,
          ]);
        });
      } else {
        versionRows.push([1, report.createdAt, report.typistName || 'System', 'Typist', report.status, 'Initial creation']);
      }
      const wsVersions = XLSX.utils.aoa_to_sheet(versionRows);
      XLSX.utils.book_append_sheet(wb, wsVersions, 'Audit History');

      // Trigger download
      XLSX.writeFile(wb, `${report.patientName.replace(/\s+/g, '_')}_${report.studyId}.xlsx`);
      return true;
    } catch (e) {
      console.error('Excel export failed', e);
      throw e;
    }
  }

  /**
   * Helper for Speech-to-Text Voice Dictation with auto punctuation and language selection
   */
  static isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  static createSpeechRecognizer(
    lang: 'en-US' | 'en-GB' | 'ur-PK' = 'en-US',
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void
  ) {
    if (!this.isSpeechRecognitionSupported()) return null;
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognizer = new SpeechClass();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = lang;

    recognizer.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        onResult(final, true);
      } else if (interim) {
        onResult(interim, false);
      }
    };

    recognizer.onerror = (e: any) => onError(e);
    return recognizer;
  }
}
