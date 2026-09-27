// Configuration constants for the Udukku Payslip System
export const Config = {
    // App metadata
    appName: 'Udukku Tutor Payslip System',
    version: '1.0.0',

    // Brand colors — Udukku Source of Truth palette (v1.0, Aug 2026)
    colors: {
        primary: '#C13100',       // Vivid Brown — Header & Footer, Main Headings
        secondary: '#C44002',     // Vivid Brown 2 — Header 2, Tagline, Tutor Badges
        background: '#FFF1C5',    // Light Yellow — Page Background
        cream: '#EDE9C5',         // Cream — Background Option
        lightOrange: '#FADFB5',   // Light Orange — Background Option
        text: '#082032',          // Dark Azure — Sub-headings / Text
        success: '#27AE60',       // functional (not part of brand palette)
        warning: '#F39C12',
        danger: '#C0392B'
    },

    // Default admin info
    admin: {
        name: 'Ishita Parakh',
        title: 'CEO',
        company: 'Udukku Music',
        email: 'udukkumusic@gmail.com'
    },

    // The email that gets the approver powers (sign & approve payslips).
    // Separate from admin.email so the contact printed on payslip PDFs
    // (Source of Truth) never changes.
    approverEmail: 'ishitakparakh@gmail.com',

    // LocalStorage key
    storageKey: 'udukku_payslip_data',

    // Signature image (approval workflow) — stored per browser
    signatureKey: 'udukku_signature',

    // Team default cloud connection — baked in so NO device needs setup.
    // Every browser opens in cloud mode (sign-in gate) straight away.
    // Settings can still override or disconnect per device.
    cloudDefault: {
        url: 'https://xhxdnmvwbakwlttuvtjz.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeGRubXZ3YmFrd2x0dHV2dGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzE3MjcsImV4cCI6MjEwNDQ0NzcyN30.ch3YxgQbgcCYub6DKcIhT8kAzPWXKUFYHim9xIKdCyo'
    },

    // PDF settings
    pdf: {
        pageSize: 'a4',
        unit: 'mm',
        margin: 20,
        font: 'helvetica'
    }
};