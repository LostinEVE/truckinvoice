// Shared configuration values
export const EMAILJS_CONFIG = {
    publicKey: 'flEWLVoiJ1uMBZgnW',
    serviceId: 'service_bhz3o5d',
    templateId: 'template_c0db69o'
};

export const STORAGE_KEYS = {
    companyName: 'companyName',
    companyAddress: 'companyAddress',
    carrierId: 'carrierId',
    userEmail: 'userEmail',
    invoiceHistory: 'invoiceHistory',
    expenses: 'expenses'
};

// OCR.space API configuration (free tier: 25k requests/month)
export const OCR_CONFIG = {
    apiKey: 'K88317273888957',  // Free API key - replace with your own from ocr.space
    apiUrl: 'https://api.ocr.space/parse/image',
    language: 'eng',
    detectOrientation: true,
    scale: true
};

// Feature flags
export const FEATURES = {
    OCR_ENABLED: true
};
