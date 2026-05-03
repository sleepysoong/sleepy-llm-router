import { describe, expect, it } from 'vitest';
import { anthropicToOpenAI, extractTextContent, openAIToAnthropic } from '../src/server/translate.js';

describe('Anthropic/OpenAI translation fallback', () => {
  it('converts text messages and system prompt to OpenAI chat', () => {
    expect(anthropicToOpenAI({ system: 'sys', max_tokens: 10, messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }] }, 'm')).toMatchObject({
      model: 'm',
      max_tokens: 10,
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
    });
  });

  it('rejects unsupported non-text blocks', () => {
    expect(() => extractTextContent([{ type: 'image', source: {} }])).toThrow(/Unsupported/);
  });

  it('maps OpenAI completion into Anthropic message shape', () => {
    const out = openAIToAnthropic({ id: 'chatcmpl_1', model: 'm', choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 2, completion_tokens: 3 } }, 'm');
    expect(out).toMatchObject({ type: 'message', role: 'assistant', content: [{ type: 'text', text: 'hello' }], usage: { input_tokens: 2, output_tokens: 3 } });
  });
});
