import { Config } from '../config.js';
import { Formatters } from '../utils/formatters.js';

export const PDFService = {
    _logoDataUrl: null,
    _logoRatio: null, // native width/height of logo.png (so it is never stretched)

    async loadLogo() {
        if (this._logoDataUrl) return this._logoDataUrl;
        try {
            const response = await fetch('assets/images/logo.png');
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            this._logoDataUrl = dataUrl;
            // Grab the native aspect ratio (best-effort; falls back to 349/92)
            try {
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        if (img.naturalWidth && img.naturalHeight) {
                            this._logoRatio = img.naturalWidth / img.naturalHeight;
                        }
                        resolve();
                    };
                    img.onerror = resolve;
                    img.src = dataUrl;
                });
            } catch { /* keep fallback ratio */ }
            return dataUrl;
        } catch (e) {
            console.error('Failed to load logo:', e);
            return null;
        }
    },

    async generate(payslip) {
        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'landscape'
        });

        const W = doc.internal.pageSize.getWidth();   // 297
        const H = doc.internal.pageSize.getHeight();  // 210

        // Udukku Source of Truth palette
        const orange = [193, 49, 0];   // Vivid Brown #C13100 (SoT: Header & Footer / Main Headings)
        const black = [8, 32, 50];     // Dark Azure #082032 (SoT: Sub-headings / Text)
        const lightYellow = [255, 241, 197]; // Light Yellow #FFF1C5 (SoT: Page Background)
        const FONT = 'helvetica';

        const marginL = 20;
        const marginR = 20;
        const contentW = W - marginL - marginR;
        const rightEdge = W - marginR;

        // ═══════════════════════════════════════════════════
        // HEADER — EXACT FIXED POSITIONS
        // ═══════════════════════════════════════════════════

        // Logo: fixed left, fixed top, width fixed; height derived from the
        // image's real aspect ratio so the mark is never stretched/squeezed.
        const logoX = marginL;      // 20mm from left
        const logoY = 15;           // 15mm from top
        const logoW = 70;           // fixed width
        const logoRatio = this._logoRatio || 349 / 92; // logo.png native 349x92
        const logoH = logoW / logoRatio;               // ≈ 18.5mm

        // Draw logo
        const logoDataUrl = await this.loadLogo();
        if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
        } else {
            // Fallback text if image missing
            doc.setFont(FONT, 'bold');
            doc.setFontSize(26);
            doc.setTextColor(...black);
            doc.text('udukku', logoX, logoY + 9);
            doc.setFont(FONT, 'normal');
            doc.setFontSize(12);
            doc.text('Music Education', logoX, logoY + 16.5);
        }

        // Period: vertically centered with the logo (15 + logoH/2)
        const periodY = 15 + logoH / 2;

        // Calculate period text
        const periodStart = this.getMonthStart(payslip.month, payslip.year);
        const periodEnd = this.getMonthEnd(payslip.month, payslip.year);
        const periodText = `${periodStart} - ${periodEnd}`;

        // Draw "Period:" label (bold, left of date)
        doc.setFont(FONT, 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...black);
        
        // Measure label width to position correctly
        const labelText = 'Period:';
        const labelW = doc.getTextWidth(labelText);
        
        // Date width
        doc.setFont(FONT, 'normal');
        const dateW = doc.getTextWidth(periodText);
        
        // Gap between label and date
        const gap = 4;
        
        // Right-align the whole block: date touches rightEdge, label sits to its left
        const dateX = rightEdge - dateW;
        const labelX = dateX - gap - labelW;

        // Draw label
        doc.setFont(FONT, 'bold');
        doc.text(labelText, labelX, periodY);

        // Draw date (normal weight, right-aligned)
        doc.setFont(FONT, 'normal');
        doc.text(periodText, dateX, periodY);

        // Horizontal line: starts at left margin, ends at right margin
        // Positioned below the logo (logo bottom = 15 + logoH ≈ 33.5)
        const lineY = 40;
        doc.setDrawColor(...black);
        doc.setLineWidth(0.8);
        doc.line(marginL, lineY, rightEdge, lineY);

        // ═══════════════════════════════════════════════════
        // EMPLOYEE / POSITION
        // ═══════════════════════════════════════════════════

        let y = 52;

        doc.setFont(FONT, 'normal');
        doc.setFontSize(13);
        doc.setTextColor(...black);

        doc.text('Employee:', marginL, y);
        doc.text(payslip.tutorName, marginL + 28, y);

        y += 7;
        doc.text('Position:', marginL, y);
        doc.text(`${payslip.subject} Tutor`, marginL + 28, y);

        // ═══════════════════════════════════════════════════
        // TABLE
        // ═══════════════════════════════════════════════════

        y += 12;

        const colCount = 5;
        const colW = contentW / colCount;

        const headerHeight = 13;
        const rowHeight = 18;

        const cols = [
            marginL,
            marginL + colW,
            marginL + colW * 2,
            marginL + colW * 3,
            marginL + colW * 4,
            marginL + colW * 5
        ];

        const tableStartY = y;

        // Orange header row
        doc.setFillColor(...orange);
        doc.rect(marginL, y, contentW, headerHeight, 'F');

        // Black vertical divider lines in header
        doc.setDrawColor(...black);
        doc.setLineWidth(0.8);
        for (let i = 1; i < colCount; i++) {
            doc.line(cols[i], y, cols[i], y + headerHeight);
        }

        // White header text (on the orange header row — requested 27 Sep 2026)
        doc.setFont(FONT, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);

        const headers = ['DESCRIPTION', 'SESSIONS', 'RATE/SESSION', 'AMOUNT', 'TOTAL'];
        headers.forEach((h, i) => {
            const centerX = cols[i] + colW / 2;
            doc.text(h, centerX, y + 8.5, { align: 'center' });
        });

        y += headerHeight;

        // Outer border for all rows (3 data rows)
        const tableTotalHeight = headerHeight + rowHeight * 3;
        doc.setDrawColor(...black);
        doc.setLineWidth(0.8);
        doc.rect(marginL, tableStartY, contentW, tableTotalHeight, 'S');

        // ─── ROW 1: Teaching Sessions ───
        this.drawTableRow(doc, {
            y,
            cols,
            colW,
            rowHeight,
            description: 'Teaching Sessions',
            hours: payslip.teachingHours,
            rate: payslip.rate,
            amount: payslip.teachingAmount,
            total: payslip.teachingAmount,
            black,
            font: FONT
        });
                y += rowHeight;

        // ─── ROW 2: Student Strike Compensation ───
        this.drawTableRow(doc, {
            y,
            cols,
            colW,
            rowHeight,
            description: 'Student Strike\nCompensation',
            hours: payslip.strikeHours,
            rate: payslip.rate,
            amount: payslip.strikeAmount,
            total: payslip.strikeAmount,
            black,
            font: FONT,
            multiLine: true
        });
        y += rowHeight;

        // ─── ROW 3: Grand Total ───
        this.drawTableRow(doc, {
            y,
            cols,
            colW,
            rowHeight,
            description: '',
            hours: '',
            rate: '',
            amount: '',
            total: payslip.grandTotal,
            black,
            font: FONT,
            isTotal: true
        });
        y += rowHeight;

        // ═══════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════

        y = H - 35;

        // Sign (left)
        doc.setFont(FONT, 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...black);
        doc.text('Sign:', marginL, y);

        y += 8;
        doc.setFont(FONT, 'normal');
        doc.setFontSize(12);
        doc.text(`${Config.admin.name}, ${Config.admin.title} ${Config.admin.company}`, marginL, y);

        y += 7;
        doc.text(`Email: ${Config.admin.email}`, marginL, y);

        // Validated on (right-aligned)
        const rightY = H - 35;
        doc.setFont(FONT, 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...black);
        doc.text('Validated on:', rightEdge, rightY, { align: 'right' });

        doc.setFont(FONT, 'normal');
        doc.setFontSize(12);
        doc.text(Formatters.dateLong(Date.now()), rightEdge, rightY + 8, { align: 'right' });

        // ─── DIGITAL SIGNATURE (approval workflow) ───
        // Only approved payslips carry a signature: the signature image + a
        // thin rule, placed in the existing empty space above the "Sign:"
        // block. No other part of the template is touched.
        if (payslip.status === 'approved' && payslip.signature) {
            try {
                const { ratio, dataUrl } = await this.imageRatioFromDataUrl(payslip.signature);
                let imgH = 20;
                let imgW = imgH * ratio;
                const maxW = 80;
                if (imgW > maxW) {
                    imgW = maxW;
                    imgH = maxW / ratio;
                }
                const ruleY = H - 41;                 // thin line under the signature
                const imgY = ruleY - imgH - 1;        // image sits just above the line
                doc.addImage(dataUrl, 'PNG', marginL, imgY, imgW, imgH);
                doc.setDrawColor(...black);
                doc.setLineWidth(0.3);
                doc.line(marginL, ruleY, marginL + imgW, ruleY);
            } catch (e) {
                console.error('Could not render signature on PDF:', e);
            }
        }

        // ═══════════════════════════════════════════════════
        // SAVE
        // ═══════════════════════════════════════════════════

        const fileName = `Udukku_Payment_Receipt_${payslip.tutorName.replace(/\s+/g, '_')}_${payslip.subject.replace(/\s+/g, '_')}_${Formatters.monthLong(payslip.month)}_${payslip.year}.pdf`;
        doc.save(fileName);
    },

    drawTableRow(doc, opts) {
        const { y, cols, colW, rowHeight, description, hours, rate, amount, total, black, font, multiLine, isTotal } = opts;

        // Top horizontal line for this row
        doc.setDrawColor(...black);
        doc.setLineWidth(0.8);
        doc.line(cols[0], y, cols[5], y);

        // Vertical lines between cells
        for (let i = 1; i < 5; i++) {
            doc.line(cols[i], y, cols[i], y + rowHeight);
        }

        doc.setFont(font, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...black);

        const midY = y + rowHeight / 2 + 1.5;

        // Column 1: Description
        if (description) {
            const cx = cols[0] + colW / 2;
            if (multiLine) {
                const lines = description.split('\n');
                doc.text(lines[0], cx, midY - 3, { align: 'center' });
                doc.text(lines[1], cx, midY + 4, { align: 'center' });
            } else {
                doc.text(description, cx, midY, { align: 'center' });
            }
        }

        // Column 2: Hours
        if (hours !== '' && hours !== undefined) {
            doc.text(String(hours), cols[1] + colW / 2, midY, { align: 'center' });
        }

        // Column 3: Rate
        if (rate !== '' && rate !== undefined && !isTotal) {
            doc.text(`Rs. ${rate}`, cols[2] + colW / 2, midY, { align: 'center' });
        }

        // Column 4: Amount
        if (amount !== '' && amount !== undefined && !isTotal) {
            doc.text(`Rs. ${amount.toLocaleString('en-IN')}`, cols[3] + colW / 2, midY, { align: 'center' });
        }

        // Column 5: Total
        if (isTotal) {
            doc.setFont(font, 'bold');
            doc.setFontSize(12);
            doc.text(`Rs. ${total.toLocaleString('en-IN')}`, cols[4] + colW / 2, midY, { align: 'center' });
        } else if (total !== '' && total !== undefined) {
            doc.text(`Rs. ${total.toLocaleString('en-IN')}`, cols[4] + colW / 2, midY, { align: 'center' });
        }
    },

    /**
     * Signature image prep — used to place the signature on the PDF.
     * Returns { ratio, dataUrl } where dataUrl is the original image with any
     * transparent margin cropped off, so the ink fills the drawn box and the
     * signature looks big and clearly visible. Falls back to the original
     * image if no transparent area is found (e.g. an opaque scan).
     */
    imageRatioFromDataUrl(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
                let out = dataUrl;
                try {
                    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, 1));
                    const w = Math.max(1, Math.round(img.naturalWidth * scale));
                    const h = Math.max(1, Math.round(img.naturalHeight * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const data = ctx.getImageData(0, 0, w, h).data;
                    let minX = w, minY = h, maxX = -1, maxY = -1;
                    for (let py = 0; py < h; py++) {
                        for (let px = 0; px < w; px++) {
                            if (data[(py * w + px) * 4 + 3] > 8) {
                                if (px < minX) minX = px;
                                if (px > maxX) maxX = px;
                                if (py < minY) minY = py;
                                if (py > maxY) maxY = py;
                            }
                        }
                    }
                    if (maxX > minX && maxY > minY) {
                        const crop = document.createElement('canvas');
                        crop.width = maxX - minX + 1;
                        crop.height = maxY - minY + 1;
                        crop.getContext('2d').drawImage(
                            img, minX / scale, minY / scale, crop.width / scale, crop.height / scale,
                            0, 0, crop.width, crop.height
                        );
                        out = crop.toDataURL('image/png');
                        ratio = crop.width / crop.height;
                    }
                } catch (e) { /* keep the original image */ }
                resolve({ ratio, dataUrl: out });
            };
            img.onerror = () => resolve({ ratio: 3, dataUrl }); // assume a wide signature if we can't measure
            img.src = dataUrl;
        });
    },

    getMonthStart(month, year) {
        return `01 ${Formatters.monthLong(month)} ${year}`;
    },

    getMonthEnd(month, year) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return `${lastDay} ${Formatters.monthLong(month)} ${year}`;
    }
};