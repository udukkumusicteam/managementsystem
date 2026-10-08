import { Config } from '../config.js';
import { Formatters } from '../utils/formatters.js';

/**
 * Quotation PDF Service
 * Client-facing quotation template — Udukku aesthetic strictly from the
 * Source of Truth (Visual Identity §14 + Design Language §15):
 *   Light Yellow page, Vivid Brown header + footer bands, Dark Azure text,
 *   Cream / Light Orange surfaces, rounded shapes, Hanken Grotesk type.
 *
 * NOTE: Hanken Grotesk has no rupee glyph (U+20B9), so amounts use "Rs."
 * — the same convention as the (unchanged) payslip PDF.
 */
export const QuotationPdfService = {
    VB: [193, 49, 0],         // Vivid Brown #C13100
    VB2: [196, 64, 2],        // Vivid Brown 2 #C44002
    LY: [255, 241, 197],      // Light Yellow #FFF1C5
    CREAM: [237, 233, 197],   // Cream #EDE9C5
    LO: [250, 223, 181],      // Light Orange #FADFB5
    DA: [8, 32, 50],          // Dark Azure #082032
    DA_SOFT: [95, 109, 122],  // Dark Azure ~65%
    LINE: [224, 228, 230],    // Dark Azure ~12% tint (hairlines)
    // Green for the pre-GST amounts only (27 Sep 2026: the whole-column
    // highlight was removed — just the amounts are green):
    GREEN_TX: [21, 128, 61],  // pre-GST price text

    _fontData: null,

    // Canonical light logo (transparent PNG, 401 x 95 tight crop), embedded
    // so the double-click desktop file also gets the logo without any assets
    // folder. Stored as short lines so a copy-paste cannot silently mangle it
    // (27 Sep 2026: a mangled single line broke jsPDF's PNG decoder —
    // "Invalid filter algorithm: 126").
    _quoteLogoB64: [

        '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',
    ].join(''),
    _quoteLogoB64Len: 5152,  // exact length — copy-paste corruption guard
    _quoteLogoChecked: false,
    _quoteLogoB64Cache: null,

    // Project-file logo (27 Sep 2026): in the dev project the logo can also
    // be read from assets/images/udukkulogo.png — drawn onto the brand brown
    // and shipped as a JPEG so jsPDF's PNG decoder is never touched.
    // FALLBACK only — used when the embedded data is missing or corrupted.
    _quoteLogoPath: 'assets/images/udukkulogo.png',
    _quoteLogoRatio: 4.2211,   // 401 x 95 px tight crop
    _logoResolved: null,

    // Contact channels for the quotation footer (provided 27 Sep 2026).
    // The email comes from Config.admin.email (SoT).
    CONTACT: {
        phoneDisplay: '+91 96803 78292',
        phoneTel: '+919680378292',
        instagramHandle: 'udukkumusic',
        website: 'udukkumusic.com',
        websiteUrl: 'https://udukkumusic.com'
    },

    // Synchronous: embedded logo only. Used by the live preview <img> and as
    // the PRIMARY logo source for the PDF (identical logo everywhere).
    quoteLogoDataUrl() {
        if (this._quoteLogoB64Cache) return this._quoteLogoB64Cache;
        if (this._quoteLogoChecked) return null;
        this._quoteLogoChecked = true;
        const b64 = Array.isArray(this._quoteLogoB64) ? this._quoteLogoB64.join('') : (this._quoteLogoB64 || '');
        if (!/^iVBO/i.test(b64) || b64.length !== this._quoteLogoB64Len) {
            console.warn('[Udukku] Quotation logo data looks corrupted (got ' + b64.length +
                ' chars, expected ' + this._quoteLogoB64Len + ') — falling back to the project logo file.');
            return null;
        }
        this._quoteLogoB64Cache = 'data:image/png;base64,' + b64;
        return this._quoteLogoB64Cache;
    },

    // The project-file logo: Image → canvas on Vivid Brown → JPEG, with the
    // image's own aspect ratio. Only reached when the embedded data fails.
    async loadLogoFromProjectFile() {
        return new Promise((resolve) => {
            let img;
            try {
                img = new Image();
            } catch (e) {
                resolve(null);
                return;
            }
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ratio = (img.naturalWidth / img.naturalHeight) || this._quoteLogoRatio;
                    canvas.width = 600;
                    canvas.height = Math.round(600 / ratio);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = 'rgb(193, 49, 0)';   // same Vivid Brown as the band
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.95), format: 'JPEG', ratio });
                } catch (e) {
                    console.warn('[Udukku] Project logo conversion failed:', e);
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = this._quoteLogoPath;
        });
    },

    // Logo for the PDF: embedded data first, project file as fallback.
    // Returns { dataUrl, format, ratio } or null (never throws).
    async resolveLogo() {
        if (this._logoResolved) return this._logoResolved;
        const b64url = this.quoteLogoDataUrl();
        if (b64url) {
            const r = { dataUrl: b64url, format: 'PNG', ratio: this._quoteLogoRatio };
            this._logoResolved = r;
            return r;
        }
        const fromFile = await this.loadLogoFromProjectFile();
        if (fromFile) {
            this._logoResolved = fromFile;
            return fromFile;
        }
        console.warn('[Udukku] Quotation logo unavailable — the PDF will be built without a logo.');
        return null;
    },

    async loadFonts(doc) {
        if (this._fontData) {
            this.registerFonts(doc);
            return true;
        }
        try {
            const fetchB64 = async (path) => {
                const r = await fetch(path);
                if (!r.ok) throw new Error(`Font fetch failed: ${path}`);
                const buf = await r.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let bin = '';
                for (let i = 0; i < bytes.length; i += 8192) {
                    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
                }
                return btoa(bin);
            };
            this._fontData = {
                reg: await fetchB64('assets/fonts/hanken-ttf-400.ttf'),
                bold: await fetchB64('assets/fonts/hanken-ttf-700.ttf'),
                heavy: await fetchB64('assets/fonts/hanken-ttf-800.ttf')
            };
            this.registerFonts(doc);
            return true;
        } catch (e) {
            console.error('Brand font load failed, falling back to helvetica:', e);
            return false;
        }
    },

    registerFonts(doc) {
        doc.addFileToVFS('HankenGrotesk-Regular.ttf', this._fontData.reg);
        doc.addFont('HankenGrotesk-Regular.ttf', 'HK', 'normal');
        doc.addFileToVFS('HankenGrotesk-Bold.ttf', this._fontData.bold);
        doc.addFont('HankenGrotesk-Bold.ttf', 'HK', 'bold');
        doc.addFileToVFS('HankenGrotesk-Heavy.ttf', this._fontData.heavy);
        doc.addFont('HankenGrotesk-Heavy.ttf', 'HKHeavy', 'normal');
    },

    // Currency-aware money (default INR keeps the "Rs." convention).
    // Symbol/locales come from Formatters.CURRENCIES (3 Oct 2026).
    money(n, currency) {
        return Formatters.money(n, currency);
    },

    drawCardLabel(doc, F, label, x, y) {
        doc.setFont(F, 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...this.VB2);
        doc.text(label, x, y, { charSpace: 0.8 });
    },

    // ——— Small footer icons (vector line art in Light Yellow — no font
    //     glyph dependency, so they render identically everywhere) ———
    drawPhoneIcon(doc, x, y) {
        // x,y = top-left of a 2.9 x 4.5 mm box (mobile phone)
        doc.setDrawColor(...this.LY);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, 2.9, 4.5, 0.6, 0.6, 'S');
        doc.line(x + 0.75, y + 0.95, x + 2.15, y + 0.95);           // speaker
        doc.setFillColor(...this.LY);
        doc.circle(x + 1.45, y + 3.55, 0.32, 'F');                   // home dot
    },

    drawGlobeIcon(doc, cx, cy) {
        // globe: circle + meridian + equator (4.2 mm across)
        doc.setDrawColor(...this.LY);
        doc.setLineWidth(0.35);
        doc.circle(cx, cy, 2.1, 'S');
        doc.ellipse(cx, cy, 0.95, 2.1, 'S');
        doc.line(cx - 2.1, cy, cx + 2.1, cy);
    },

    drawCameraIcon(doc, x, y) {
        // x,y = top-left of a 4.2 x 4.2 mm box (instagram-style camera)
        doc.setDrawColor(...this.LY);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, 4.2, 4.2, 1.1, 1.1, 'S');
        doc.circle(x + 2.1, y + 2.1, 1.25, 'S');
        doc.setFillColor(...this.LY);
        doc.circle(x + 3.1, y + 1.1, 0.3, 'F');                      // flash dot
    },

    drawMailIcon(doc, x, y) {
        // x,y = top-left of a 4.4 x 3.2 mm box (envelope)
        doc.setDrawColor(...this.LY);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, 4.4, 3.2, 0.5, 0.5, 'S');
        doc.line(x + 0.45, y + 0.55, x + 2.2, y + 2.0);              // flap
        doc.line(x + 4.4 - 0.45, y + 0.55, x + 2.2, y + 2.0);
    },

    async generate(quote) {
        const { jsPDF } = window.jspdf;
        // A4 landscape (requested 27 Sep 2026)
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

        const fontsOk = await this.loadFonts(doc);
        const F = fontsOk ? 'HK' : 'helvetica';

        const W = doc.internal.pageSize.getWidth();   // 297
        const H = doc.internal.pageSize.getHeight();  // 210
        const M = 12;
        const CW = W - M * 2;          // 273
        const rightEdge = W - M;       // 285
        const metaX = rightEdge - 6;   // 279

        // ——— Page background (Light Yellow) ———
        doc.setFillColor(...this.LY);
        doc.rect(0, 0, W, H, 'F');

        const logo = await this.resolveLogo();

        // Currency for all amounts (3 Oct 2026; defaults to INR for older records)
        const cur = quote.currency || 'INR';

        // ——— Pre-compute the note lines (needed for the layout height) ———
        const noteRaw = (quote.note && quote.note.trim()) ? quote.note.trim() : '';
        const hasNote = !!noteRaw;
        const noteSplit = (maxLines) => {
            if (!hasNote) return [];
            let l = doc.splitTextToSize(noteRaw, CW - 16);
            if (l.length > maxLines) {
                l = l.slice(0, maxLines);
                l[maxLines - 1] = l[maxLines - 1].slice(0, -2) + '\u2026';
            }
            return l;
        };

        // ═══════════════════════════════════════════════════
        // LAYOUT — 27 Sep 2026 redesign: header anchored at the top,
        // footer anchored at the bottom, and the content vertically
        // centred in between — so the page feels balanced and
        // premium instead of top-heavy with an empty band. Gaps
        // tighten automatically when there are many packages or a
        // long note, so it always fits on the page.
        // ═══════════════════════════════════════════════════
        const headerY = 12, headerH = 30;                // header 12..42
        const footerH = 24, footerY = H - 12 - footerH;  // footer bottom-anchored
        const cardH = 38;
        const headH = 10, baseRowH = 12;
        const stmtH = 7;
        const midTop = headerY + headerH;
        const midBottom = footerY;
        const midAvail = midBottom - midTop;
        const nPkg = quote.packages.length;

        const nbHFor = (lines) => 7 + 4 + lines * 5 + 4.5;
        doc.setFont(F, 'normal');
        doc.setFontSize(9);
        const solve = () => {
            let gCT = 12, gTS = 12, gTN = 11, gNS = 10;
            let maxNoteLines = 3, rowH = baseRowH;
            let noteLines = noteSplit(maxNoteLines);
            const stackH = () => cardH + gCT + (headH + nPkg * rowH)
                + (hasNote ? gTN + nbHFor(noteLines.length) + gNS : gTS) + stmtH;
            let tries = 0;
            while (stackH() > midAvail && tries < 14) {
                tries++;
                if (gCT > 8) gCT -= 2;
                else if (hasNote && gNS > 7) gNS -= 2;
                else if (!hasNote && gTS > 8) gTS -= 2;
                else if (hasNote && maxNoteLines > 2) {
                    maxNoteLines = 2;
                    noteLines = noteSplit(maxNoteLines);
                } else if (rowH > 9) rowH -= 1;
            }
            const tH = headH + nPkg * rowH;
            const sH = cardH + gCT + tH
                + (hasNote ? gTN + nbHFor(noteLines.length) + gNS : gTS) + stmtH;
            const offset = Math.max(0, (midAvail - sH) / 2);
            const cardY = midTop + offset;
            const tableY = cardY + cardH + gCT;
            const tableEnd = tableY + tH;
            let noteY = 0, stmtTop;
            if (hasNote) { noteY = tableEnd + gTN; stmtTop = noteY + nbHFor(noteLines.length) + gNS; }
            else { stmtTop = tableEnd + gTS; }
            return { noteLines, rowH, cardY, tableY, tableEnd, noteY, stmtTop };
        };
        const L = solve();

        // ═══════════════════════════════════════════════════
        // HEADER BAND (Vivid Brown) — anchored at the top
        // No "QUOTATION" title, no quotation number. The light logo
        // sits on the band; course + tutor + date identify it.
        // ═══════════════════════════════════════════════════
        doc.setFillColor(...this.VB);
        doc.roundedRect(M, headerY, CW, headerH, 6, 6, 'F');
        if (logo) {
            const lh = 15;
            const lw = Math.min(lh * logo.ratio, 120);
            try {
                doc.addImage(logo.dataUrl, logo.format, 18, headerY + (headerH - lh) / 2, lw, lh);
            } catch (e) {
                console.warn('[Udukku] Logo could not be embedded in the PDF:', e.message);
            }
        }
        const hero = `${quote.subject || 'Music Lessons'} with ${quote.tutorName || ''}`.replace(/\s+$/, '');
        doc.setFont(F, 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(255, 255, 255);
        const heroLines = doc.splitTextToSize(hero, 150);
        const heroY = heroLines.length > 1 ? headerY + 8.5 : headerY + headerH / 2 + 1;
        heroLines.forEach((ln, i) => {
            doc.text(ln, metaX, heroY + i * 5.5, { align: 'right' });
        });
        doc.setFont(F, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...this.LY);
        doc.text(`Date: ${Formatters.dateLong(quote.createdAt || Date.now())}`, metaX, heroY + (heroLines.length - 1) * 5.5 + 7.5, { align: 'right' });

        // ═══════════════════════════════════════════════════
        // CLIENT / COURSE — one white card, two halves, no labels
        // ═══════════════════════════════════════════════════
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(M, L.cardY, CW, cardH, 6, 6, 'F');
        doc.setDrawColor(...this.LINE);
        doc.setLineWidth(0.3);
        doc.line(150, L.cardY + 6, 150, L.cardY + cardH - 6);

        // Left half: the client
        let cy = L.cardY + 11;
        doc.setFont(F, 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...this.DA);
        const nameLines = doc.splitTextToSize(quote.client.name || 'Client name', 128);
        doc.text(nameLines, M + 8, cy);
        cy += 6.2 * nameLines.length;
        doc.setFont(F, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...this.DA_SOFT);
        const loc = [quote.client.city, quote.client.state].filter(Boolean).join(', ');
        if (loc) { doc.text(loc, M + 8, cy); cy += 5.6; }
        if (quote.client.phone) { doc.text(quote.client.phone, M + 8, cy); cy += 5.6; }
        if (quote.client.email) { doc.text(doc.splitTextToSize(quote.client.email, 128)[0], M + 8, cy); }

        // Right half: the course
        cy = L.cardY + 11;
        doc.setFont(F, 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...this.DA);
        const tutorLines = doc.splitTextToSize(`Tutor: ${quote.tutorName || '\u2014'}`, 118);
        doc.text(tutorLines, 158, cy);
        cy += 5.8 * tutorLines.length;
        const courseLines = doc.splitTextToSize(`Course: ${quote.subject || '\u2014'}`, 118);
        doc.text(courseLines, 158, cy);
        cy += 5.8 * courseLines.length;
        doc.setFont(F, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...this.DA_SOFT);
        doc.text(`Base rate: ${this.money(quote.baseRate, cur)}/hr (excl. GST)`, 158, cy);
        cy += 5.6;
        const gstDesc = quote.gstMode === 'intra'
            ? `GST: ${quote.gstRates.cgst}% CGST + ${quote.gstRates.sgst}% SGST`
            : `GST: ${quote.gstRates.igst}% IGST`;
        doc.text(gstDesc, 158, cy);

        // ═══════════════════════════════════════════════════
        // PACKAGES TABLE — plain header row, gentle hairlines only
        // (the heavy black rule under the table is removed).
        // Pre-GST amounts are green text; the total is the hero
        // number — bold, no colour highlight.
        // ═══════════════════════════════════════════════════
        const cols = [
            { x: 12, w: 62, align: 'left' },    // Package
            { x: 74, w: 34, align: 'center' },  // Discount
            { x: 108, w: 44, align: 'center' }, // Rate/hr
            { x: 152, w: 50, align: 'center' }, // Subtotal (excl. GST) — green
            { x: 202, w: 40, align: 'center' }, // GST
            { x: 242, w: 43, align: 'right' }   // Total (incl. GST) — hero
        ];
        const rowH = L.rowH;
        doc.setFillColor(...this.LO);
        doc.rect(M, L.tableY, CW, headH, 'F');
        doc.setFont(F, 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...this.DA);
        const heads = ['PACKAGE', 'DISCOUNT', 'RATE/HR', 'SUBTOTAL (EXCL. GST)', 'GST', 'TOTAL (INCL. GST)'];
        heads.forEach((h, i) => {
            const c = cols[i];
            let tx = c.x + c.w / 2;
            if (c.align === 'left') tx = c.x + 3;
            if (c.align === 'right') tx = c.x + c.w - 3;
            doc.text(h, tx, L.tableY + headH / 2 + 2.4, {
                align: c.align === 'left' ? 'left' : c.align === 'right' ? 'right' : 'center',
                charSpace: 0.2
            });
        });

        let ry = L.tableY + headH;
        quote.packages.forEach((p, i) => {
            doc.setFillColor(...(i % 2 === 0 ? [255, 255, 255] : this.CREAM));
            doc.rect(M, ry, CW, rowH, 'F');
            if (i < quote.packages.length - 1) {
                doc.setDrawColor(...this.LINE);
                doc.setLineWidth(0.2);
                doc.line(M, ry + rowH, rightEdge, ry + rowH);
            }
            const midY = ry + rowH / 2 + 1.5;

            doc.setFont(F, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...this.DA);
            doc.text(`${p.hours} hours`, cols[0].x + 3, midY, { align: 'left' });

            doc.setFont(F, 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(...this.DA);
            doc.text(`${p.discountPct}%`, cols[1].x + cols[1].w / 2, midY, { align: 'center' });
            doc.text(`${this.money(p.discountedRate, cur)}/hr`, cols[2].x + cols[2].w / 2, midY, { align: 'center' });

            // Pre-GST amount: green text only
            doc.setFont(F, 'bold');
            doc.setTextColor(...this.GREEN_TX);
            doc.text(this.money(p.subtotal, cur), cols[3].x + cols[3].w / 2, midY, { align: 'center' });

            doc.setFont(F, 'normal');
            doc.setTextColor(...this.DA);
            doc.text(this.money(p.gstTotal, cur), cols[4].x + cols[4].w / 2, midY, { align: 'center' });

            // Total: the hero number — bold, no colour highlight
            doc.setFont(F, 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...this.DA);
            doc.text(this.money(p.total, cur), cols[5].x + cols[5].w - 3, midY, { align: 'right' });

            ry += rowH;
        });

        // ═══════════════════════════════════════════════════
        // NOTE — only when the sender wrote one
        // ═══════════════════════════════════════════════════
        if (hasNote) {
            const nbH = nbHFor(L.noteLines.length);
            doc.setFillColor(...this.CREAM);
            doc.roundedRect(M, L.noteY, CW, nbH, 5, 5, 'F');
            doc.setFont(F, 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...this.VB2);
            doc.text('A NOTE FROM US', M + 8, L.noteY + 7, { charSpace: 0.5 });
            doc.setFont(F, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...this.DA);
            doc.text(L.noteLines, M + 8, L.noteY + 12.5);
        }

        // ═══════════════════════════════════════════════════
        // CLOSING LINE — warm and prominent, right under the
        // table (or the note), in the brand brown
        // ═══════════════════════════════════════════════════
        doc.setFont(F, 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...this.VB);
        doc.text('We look forward to helping you begin your musical journey.', W / 2, L.stmtTop + 5, { align: 'center' });

        // ═══════════════════════════════════════════════════
        // FOOTER BAND (Vivid Brown) — anchored at the bottom.
        // No logo here. Left: name / title. Right: phone · website
        // · instagram · email in one horizontal row, each clickable.
        // ═══════════════════════════════════════════════════
        const fy = footerY, fh = footerH;
        doc.setFillColor(...this.VB);
        doc.roundedRect(M, fy, CW, fh, 6, 6, 'F');

        doc.setFont(F, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(Config.admin.name, 20, fy + 10);
        doc.setFont(F, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...this.LY);
        doc.text(`${Config.admin.title}, ${Config.admin.company}`, 20, fy + 17);

        const rowY = fy + 13.5;   // text baseline of the contact row
        this.drawPhoneIcon(doc, 100, rowY - 3.75);
        doc.setFont(F, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(this.CONTACT.phoneDisplay, 105.5, rowY);
        doc.link(105.5, rowY - 3.4, 30, 4.5, `tel:${this.CONTACT.phoneTel}`);

        this.drawGlobeIcon(doc, 139.5, rowY - 1.5);
        doc.setFont(F, 'normal');
        doc.setTextColor(...this.LY);
        doc.text(this.CONTACT.website, 145, rowY);
        doc.link(145, rowY - 3.4, 26, 4.5, this.CONTACT.websiteUrl);

        this.drawCameraIcon(doc, 177, rowY - 3.6);
        doc.text('@' + this.CONTACT.instagramHandle, 182.5, rowY);
        doc.link(182.5, rowY - 3.4, 24, 4.5, `https://www.instagram.com/${this.CONTACT.instagramHandle}`);

        this.drawMailIcon(doc, 210, rowY - 3.1);
        doc.text(Config.admin.email, 216, rowY);
        doc.link(216, rowY - 3.4, 36, 4.5, `mailto:${Config.admin.email}`);

        // ——— Save ———
        const safeName = (quote.client.name || 'client').replace(/\s+/g, '_');
        doc.save(`Udukku_Pricing_Estimate_${quote.number}_${safeName}.pdf`);
    }
};
