import type { ExtensionSettings } from '../types/models';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/** OpenAI-compatible API client for Portkey → GPT-5.2 */
export async function chatCompletion(
  messages: ChatMessage[],
  settings: ExtensionSettings
): Promise<string> {
  if (!settings.portkeyApiKey || !settings.portkeyBaseUrl) {
    throw new Error('Portkey API key and base URL must be configured in settings.');
  }

  const baseUrl = settings.portkeyBaseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.portkeyApiKey}`,
    },
    body: JSON.stringify({
      model: settings.llmModel || 'gpt-5.2',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response');
  }
  return content;
}
