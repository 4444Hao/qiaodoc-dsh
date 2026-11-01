/** Deterministic transport fixture. Never install in a daily profile. */
import { appendFile } from 'node:fs/promises';
export const inject = ['llm'];
const model = { provider: 'qmr-smoke', id: 'document-test', name: 'QMR deterministic test', inputModalities: ['text'], context: { contextWindow: 128000 } };
export function apply(ctx) {
  const adapter = {
    providerInfo: () => ({ id: 'qmr-smoke', name: 'QMR test fixture' }),
    providerRetryPolicy: () => undefined,
    imageRequestPricing: () => undefined,
    imageRequestTarget: (_provider, _model, image) => image,
    listModels: async () => [model],
    resolveModel: async () => model,
    async prepareCall() { return { model, stream: (options) => adapter.stream(options) }; },
    async *stream(options) {
      const users = options.messages.filter(message => message.role === 'user');
      const userTexts = users.map(message => message.content?.filter(block => block.type === 'text').map(block => block.text).join('\n') || '');
      if (process.env.QMR_SMOKE_LOG) await appendFile(process.env.QMR_SMOKE_LOG, JSON.stringify({ kind: options.tools?.length ? 'turn' : 'auxiliary', userTexts }) + '\n');
      const reply = 'QMR_SMOKE_REPLY: deterministic fixture received the selected passage. This is not a real model interpretation.';
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: reply };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    },
  };
  ctx.effect(() => ctx.llm.registerAdapter(['qmr-smoke'], adapter), 'qmr: deterministic document smoke fixture');
}
