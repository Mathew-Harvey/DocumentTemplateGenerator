import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Model configurations
export const MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  HAIKU: 'claude-3-5-haiku-20241022',
};

// Token limits and costs (approximate)
export const TOKEN_LIMITS = {
  SONNET: {
    max_tokens: 200000,
    cost_per_input_token: 0.000003, // $3 per million
    cost_per_output_token: 0.000015, // $15 per million
  },
  HAIKU: {
    max_tokens: 200000,
    cost_per_input_token: 0.0000008, // $0.80 per million
    cost_per_output_token: 0.000004, // $4 per million
  },
};

