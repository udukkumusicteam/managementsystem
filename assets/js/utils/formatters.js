/**
 * Formatting utilities for currency, dates, and text
 */
export const Formatters = {
    currency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },

    // Currencies for the payslip + quotation calculators (expanded 3 Oct 2026:
    // nearly every country's currency).
    // - INR keeps the "Rs." text convention (Hanken Grotesk has no ₹ glyph).
    // - PDF prefix: the symbol when Hanken Grotesk contains it and it is
    //   unambiguous; otherwise the ISO code (e.g. "AED 450").
    // - Web previews use the same prefix, so preview = PDF.
    CURRENCIES: {
        INR: { prefix: 'Rs. ', label: '₹ — Indian Rupee (India)' },
        USD: { prefix: '$', label: '$ — US Dollar (USA)' },
        EUR: { prefix: '€', label: '€ — Euro (Eurozone)' },
        GBP: { prefix: '£', label: '£ — Pound Sterling (UK)' },
        AED: { prefix: 'AED ', label: 'AED — UAE Dirham (UAE)' },
        AFN: { prefix: 'AFN ', label: 'AFN — Afghani (Afghanistan)' },
        ALL: { prefix: 'ALL ', label: 'ALL — Lek (Albania)' },
        AMD: { prefix: 'AMD ', label: 'AMD — Dram (Armenia)' },
        ANG: { prefix: 'ANG ', label: 'ANG — Guilder (Caribbean Netherlands)' },
        AOA: { prefix: 'AOA ', label: 'AOA — Kwanza (Angola)' },
        ARS: { prefix: 'ARS ', label: 'ARS — Peso (Argentina)' },
        AUD: { prefix: 'AUD ', label: 'A$ — Australian Dollar (Australia)' },
        AZN: { prefix: 'AZN ', label: 'AZN — Manat (Azerbaijan)' },
        BAM: { prefix: 'BAM ', label: 'KM — Convertible Mark (Bosnia & Herzegovina)' },
        BBD: { prefix: 'BBD ', label: 'BBD — Barbados Dollar (Barbados)' },
        BDT: { prefix: 'BDT ', label: '৳ — Taka (Bangladesh)' },
        BIF: { prefix: 'BIF ', label: 'BIF — Franc (Burundi)' },
        BMD: { prefix: 'BMD ', label: 'BMD — Bermudian Dollar (Bermuda)' },
        BND: { prefix: 'BND ', label: 'BND — Brunei Dollar (Brunei)' },
        BOB: { prefix: 'BOB ', label: 'Bs — Bolivian Boliviano (Bolivia)' },
        BRL: { prefix: 'R$', label: 'R$ — Brazilian Real (Brazil)' },
        BSD: { prefix: 'BSD ', label: 'BSD — Bahamian Dollar (Bahamas)' },
        BTN: { prefix: 'BTN ', label: 'Nu — Ngultrum (Bhutan)' },
        BWP: { prefix: 'BWP ', label: 'P — Pula (Botswana)' },
        BYN: { prefix: 'BYN ', label: 'BYN — Belarussian Ruble (Belarus)' },
        BZD: { prefix: 'BZD ', label: 'BZD — Belize Dollar (Belize)' },
        CAD: { prefix: 'CAD ', label: 'C$ — Canadian Dollar (Canada)' },
        CHF: { prefix: 'CHF ', label: 'CHF — Swiss Franc (Switzerland)' },
        CLP: { prefix: 'CLP ', label: 'CLP — Chilean Peso (Chile)' },
        CNY: { prefix: '¥', label: '¥ — Chinese Yuan (China)' },
        COP: { prefix: 'COP ', label: 'COP — Colombian Peso (Colombia)' },
        CRC: { prefix: '₡ ', label: '₡ — Costa Rican Colón (Costa Rica)' },
        CUP: { prefix: 'CUP ', label: 'CUP — Cuban Peso (Cuba)' },
        CZK: { prefix: 'CZK ', label: 'Kč — Czech Koruna (Czechia)' },
        DJF: { prefix: 'DJF ', label: 'DJF — Franc (Djibouti)' },
        DKK: { prefix: 'DKK ', label: 'DKK — Danish Krone (Denmark)' },
        DOP: { prefix: 'DOP ', label: 'DOP — Dominican Peso (Dominican Republic)' },
        DZD: { prefix: 'DZD ', label: 'DZD — Algerian Dinar (Algeria)' },
        EGP: { prefix: 'EGP ', label: '£E — Egyptian Pound (Egypt)' },
        ERN: { prefix: 'ERN ', label: 'ERN — Nakfa (Eritrea)' },
        ETB: { prefix: 'ETB ', label: 'ETB — Ethiopian Birr (Ethiopia)' },
        FJD: { prefix: 'FJD ', label: 'FJD — Fiji Dollar (Fiji)' },
        FKP: { prefix: 'FKP ', label: 'FKP — Falkland Pound (Falkland Islands)' },
        FOK: { prefix: 'FOK ', label: 'FOK — Faroese Króna (Faroe Islands)' },
        GEL: { prefix: 'GEL ', label: '₾ — Lari (Georgia)' },
        GHS: { prefix: 'GHS ', label: '₵ — Ghanaian Cedi (Ghana)' },
        GIP: { prefix: 'GIP ', label: 'GIP — Gibraltar Pound (Gibraltar)' },
        GMD: { prefix: 'GMD ', label: 'GMD — Dalasi (Gambia)' },
        GNF: { prefix: 'GNF ', label: 'GNF — Franc (Guinea)' },
        GTQ: { prefix: 'GTQ ', label: 'Q — Quetzal (Guatemala)' },
        GYD: { prefix: 'GYD ', label: 'GYD — Guyana Dollar (Guyana)' },
        HKD: { prefix: 'HK$', label: 'HK$ — Hong Kong Dollar (Hong Kong)' },
        HNL: { prefix: 'HNL ', label: 'L — Lempira (Honduras)' },
        HTG: { prefix: 'HTG ', label: 'G — Gourde (Haiti)' },
        HUF: { prefix: 'HUF ', label: 'Ft — Hungarian Forint (Hungary)' },
        IDR: { prefix: 'IDR ', label: 'Rp — Indonesian Rupiah (Indonesia)' },
        ILS: { prefix: 'ILS ', label: '₪ — Israeli Shekel (Israel)' },
        IQD: { prefix: 'IQD ', label: 'IQD — Iraqi Dinar (Iraq)' },
        ISK: { prefix: 'ISK ', label: 'kr — Icelandic Króna (Iceland)' },
        JMD: { prefix: 'JMD ', label: 'JMD — Jamaican Dollar (Jamaica)' },
        JOD: { prefix: 'JOD ', label: 'JOD — Jordanian Dinar (Jordan)' },
        JPY: { prefix: '¥', label: '¥ — Japanese Yen (Japan)' },
        KES: { prefix: 'KES ', label: 'KSh — Kenyan Shilling (Kenya)' },
        KGS: { prefix: 'KGS ', label: 'KGS — Som (Kyrgyzstan)' },
        KHR: { prefix: 'KHR ', label: '៛ — Riel (Cambodia)' },
        KMF: { prefix: 'KMF ', label: 'KMF — Franc (Comoros)' },
        KRW: { prefix: 'KRW ', label: '₩ — South Korean Won (South Korea)' },
        KWD: { prefix: 'KWD ', label: 'KWD — Kuwaiti Dinar (Kuwait)' },
        KYD: { prefix: 'KYD ', label: 'KYD — Cayman Dollar (Cayman Islands)' },
        KZT: { prefix: 'KZT ', label: '₸ — Tenge (Kazakhstan)' },
        LAK: { prefix: 'LAK ', label: '₭ — Kip (Laos)' },
        LBP: { prefix: 'LBP ', label: '£L — Lebanese Pound (Lebanon)' },
        LKR: { prefix: 'LKR ', label: 'Rs — Sri Lankan Rupee (Sri Lanka)' },
        LRD: { prefix: 'LRD ', label: 'LRD — Liberian Dollar (Liberia)' },
        LSL: { prefix: 'LSL ', label: 'LSL — Loti (Lesotho)' },
        LYD: { prefix: 'LYD ', label: 'LYD — Libyan Dinar (Libya)' },
        MAD: { prefix: 'MAD ', label: 'MAD — Moroccan Dirham (Morocco)' },
        MDL: { prefix: 'MDL ', label: 'MDL — Leu (Moldova)' },
        MGA: { prefix: 'MGA ', label: 'Ar — Ariary (Madagascar)' },
        MKD: { prefix: 'MKD ', label: 'MKD — Denar (North Macedonia)' },
        MMK: { prefix: 'MMK ', label: 'K — Kyat (Myanmar)' },
        MOP: { prefix: 'MOP ', label: 'MOP — Pataca (Macau)' },
        MRU: { prefix: 'MRU ', label: 'MRU — Ouguiya (Mauritania)' },
        MUR: { prefix: 'MUR ', label: 'Rs — Mauritian Rupee (Mauritius)' },
        MVR: { prefix: 'MVR ', label: 'MVR — Rufiyaa (Maldives)' },
        MWK: { prefix: 'MWK ', label: 'MWK — Kwacha (Malawi)' },
        MXN: { prefix: 'MXN ', label: '$ — Mexican Peso (Mexico)' },
        MYR: { prefix: 'MYR ', label: 'RM — Malaysian Ringgit (Malaysia)' },
        MZN: { prefix: 'MZN ', label: 'MZN — Metical (Mozambique)' },
        NAD: { prefix: 'NAD ', label: 'NAD — Namibian Dollar (Namibia)' },
        NGN: { prefix: 'NGN ', label: '₦ — Nigerian Naira (Nigeria)' },
        NIO: { prefix: 'NIO ', label: 'C$ — Nicaraguan Córdoba (Nicaragua)' },
        NOK: { prefix: 'NOK ', label: 'kr — Norwegian Krone (Norway)' },
        NPR: { prefix: 'NPR ', label: 'Rs — Nepalese Rupee (Nepal)' },
        NZD: { prefix: 'NZD ', label: 'NZ$ — New Zealand Dollar (New Zealand)' },
        OMR: { prefix: 'OMR ', label: 'OMR — Rial (Oman)' },
        PAB: { prefix: 'PAB ', label: 'B/. — Balboa (Panama)' },
        PEN: { prefix: 'PEN ', label: 'S/ — Peruvian Sol (Peru)' },
        PGK: { prefix: 'PGK ', label: 'PGK — Kina (Papua New Guinea)' },
        PHP: { prefix: 'PHP ', label: '₱ — Philippine Peso (Philippines)' },
        PKR: { prefix: 'PKR ', label: 'Rs — Pakistani Rupee (Pakistan)' },
        PLN: { prefix: 'PLN ', label: 'zł — Polish Złoty (Poland)' },
        PYG: { prefix: 'PYG ', label: '₲ — Guaraní (Paraguay)' },
        QAR: { prefix: 'QAR ', label: 'QAR — Riyal (Qatar)' },
        RON: { prefix: 'RON ', label: 'RON — Leu (Romania)' },
        RSD: { prefix: 'RSD ', label: 'RSD — Dinar (Serbia)' },
        RUB: { prefix: 'RUB ', label: '₽ — Russian Ruble (Russia)' },
        RWF: { prefix: 'RWF ', label: 'RWF — Franc (Rwanda)' },
        SAR: { prefix: 'SAR ', label: 'SAR — Riyal (Saudi Arabia)' },
        SBD: { prefix: 'SBD ', label: 'SBD — Solomon Dollar (Solomon Islands)' },
        SCR: { prefix: 'SCR ', label: 'SCR — Seychelles Rupee (Seychelles)' },
        SDG: { prefix: 'SDG ', label: 'SDG — Pound (Sudan)' },
        SEK: { prefix: 'SEK ', label: 'kr — Swedish Krona (Sweden)' },
        SGD: { prefix: 'SGD ', label: 'S$ — Singapore Dollar (Singapore)' },
        SHP: { prefix: 'SHP ', label: 'SHP — St Helena Pound (St Helena)' },
        SLE: { prefix: 'SLE ', label: 'SLE — Leone (Sierra Leone)' },
        SOS: { prefix: 'SOS ', label: 'SOS — Shilling (Somalia)' },
        SRD: { prefix: 'SRD ', label: 'SRD — Surinamese Dollar (Suriname)' },
        SSP: { prefix: 'SSP ', label: 'SSP — Pound (South Sudan)' },
        STN: { prefix: 'STN ', label: 'STN — Dobra (São Tomé & Príncipe)' },
        SYP: { prefix: 'SYP ', label: '£S — Pound (Syria)' },
        SZL: { prefix: 'SZL ', label: 'SZL — Lilangeni (Eswatini)' },
        THB: { prefix: 'THB ', label: '฿ — Baht (Thailand)' },
        TJS: { prefix: 'TJS ', label: 'TJS — Somoni (Tajikistan)' },
        TMT: { prefix: 'TMT ', label: 'TMT — Manat (Turkmenistan)' },
        TND: { prefix: 'TND ', label: 'TND — Dinar (Tunisia)' },
        TOP: { prefix: 'TOP ', label: 'T$ — Pa\'anga (Tonga)' },
        TRY: { prefix: 'TRY ', label: '₺ — Lira (Türkiye)' },
        TTD: { prefix: 'TTD ', label: 'TTD — Dollar (Trinidad & Tobago)' },
        TZS: { prefix: 'TZS ', label: 'TSh — Shilling (Tanzania)' },
        UAH: { prefix: 'UAH ', label: '₴ — Hryvnia (Ukraine)' },
        UGX: { prefix: 'UGX ', label: 'USh — Shilling (Uganda)' },
        UYU: { prefix: 'UYU ', label: '$ — Uruguayan Peso (Uruguay)' },
        UZS: { prefix: 'UZS ', label: 'UZS — Sum (Uzbekistan)' },
        VES: { prefix: 'VES ', label: 'Bs.S — Bolívar (Venezuela)' },
        VND: { prefix: 'VND ', label: '₫ — Dong (Vietnam)' },
        VUV: { prefix: 'VUV ', label: 'VUV — Vatu (Vanuatu)' },
        WST: { prefix: 'WST ', label: 'WST — Tala (Samoa)' },
        XAF: { prefix: 'XAF ', label: 'XAF — CFA Franc (Central Africa)' },
        XCD: { prefix: 'XCD ', label: 'EC$ — East Caribbean Dollar (Caribbean)' },
        XOF: { prefix: 'XOF ', label: 'XOF — CFA Franc (West Africa)' },
        XPF: { prefix: 'XPF ', label: 'XPF — CFP Franc (French Pacific)' },
        YER: { prefix: 'YER ', label: 'YER — Rial (Yemen)' },
        ZAR: { prefix: 'ZAR ', label: 'R — Rand (South Africa)' },
        ZMW: { prefix: 'ZMW ', label: 'ZMW — Kwacha (Zambia)' },
        ZWL: { prefix: 'ZWL ', label: 'ZWL — Dollar (Zimbabwe)' }
    },

    /** <option> list for the currency dropdowns (quotation + payslip). */
    currencyOptionsHTML(selected = 'INR') {
        return Object.keys(this.CURRENCIES).map(code => {
            const c = this.CURRENCIES[code];
            return `<option value="${code}"${code === selected ? ' selected' : ''}>${c.label}</option>`;
        }).join('');
    },

    /** "Rs. 3,822" / "$3,822" style money in the given currency (default INR). */
    money(amount, currency = 'INR') {
        const c = this.CURRENCIES[currency] || this.CURRENCIES.INR;
        const v = Number(amount);
        if (amount === undefined || amount === null || isNaN(v)) return c.prefix + '0';
        const locale = currency === 'INR' ? 'en-IN' : 'en-US';
        return c.prefix + v.toLocaleString(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    },

    date(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate()} ${this.monthShort(d.getMonth())} ${d.getFullYear()}`;
    },

    dateLong(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate()} ${this.monthLong(d.getMonth())} ${d.getFullYear()}`;
    },

    monthLong(monthIndex) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthIndex] || '';
    },

    monthShort(monthIndex) {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return months[monthIndex] || '';
    },

    initials(name) {
        const words = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return 'U';
        return words.map(w => w[0].toUpperCase()).join('').slice(0, 2);
    },

    payslipId(id) {
        return id.replace('slip_', '#');
    },

    period(month, year) {
        return `${this.monthLong(month)} ${year}`;
    }
};