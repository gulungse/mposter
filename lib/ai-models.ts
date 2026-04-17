import { AIModel } from '@prisma/client'

// --- 2026 AI Model Pricing (USD per 1M tokens) ---
export const MODEL_PRICING: Record<string, { input: number, output: number }> = {
    'gpt-5.4': { input: 10.0, output: 30.0 },
    'gpt-5.4-mini': { input: 0.10, output: 0.40 },
    'gpt-5.4-thinking': { input: 20.0, output: 80.0 },
    'gemini-3.1-pro-preview': { input: 4.0, output: 12.0 },
    'gemini-2.5-pro': { input: 2.0, output: 6.0 },
    'gemini-2.5-flash': { input: 0.05, output: 0.20 },
    'claude-4-opus': { input: 15.0, output: 75.0 },
    'claude-4-sonnet': { input: 3.0, output: 15.0 },
    'claude-4-haiku': { input: 0.25, output: 1.25 },
    // Legacy mapping
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 3.5, output: 10.5 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
};

export const MODEL_ID_MAP: Record<AIModel, string> = {
    [AIModel.GPT_5_4]: 'gpt-5.4',
    [AIModel.GPT_5_4_MINI]: 'gpt-5.4-mini',
    [AIModel.GPT_5_4_THINKING]: 'gpt-5.4-thinking',
    [AIModel.GEMINI_3_1_PRO_PREVIEW]: 'gemini-3.1-pro-preview',
    [AIModel.GEMINI_2_5_PRO]: 'gemini-2.5-pro',
    [AIModel.GEMINI_2_5_FLASH]: 'gemini-2.5-flash',
    [AIModel.CLAUDE_4_OPUS]: 'claude-4-opus',
    [AIModel.CLAUDE_4_SONNET]: 'claude-4-sonnet',
    [AIModel.CLAUDE_4_HAIKU]: 'claude-4-haiku',
    // Legacy
    [AIModel.GPT4O]: 'gpt-4o',
    [AIModel.GEMINI]: 'gemini-2.5-flash',
    [AIModel.CLAUDE]: 'claude-4-sonnet',
    [AIModel.GPT5]: 'gpt-5.4-mini',
};
