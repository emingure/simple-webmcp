import { describe, it, expect } from 'vitest';
import { normalizeResult, normalizeError, wrapExecute } from '../src/internal/normalize.js';

describe('normalize', () => {
  it('normalizeResult string', () => {
    expect(normalizeResult('hello')).toEqual({ content: [{ type: 'text', text: 'hello' }] });
  });
  it('normalizeResult object', () => {
    const r = normalizeResult({ a: 1 });
    expect(r.content[0].text).toContain('"a": 1');
  });
  it('normalizeResult already normalized passthrough', () => {
    const input = { content: [{ type: 'text', text: 'x' }] };
    expect(normalizeResult(input)).toBe(input);
  });
  it('normalizeError', () => {
    const r = normalizeError(new Error('boom'));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain('boom');
  });
  it('wrapExecute object mode', async () => {
    const fn = ({ x, y }: { x: number; y: number }) => x + y;
    const wrapped = wrapExecute(fn as any);
    const res = await wrapped({ x: 2, y: 3 });
    expect(res).toEqual({ content: [{ type: 'text', text: '5' }] });
  });
  it('wrapExecute catches throw', async () => {
    const fn = () => {
      throw new Error('fail');
    };
    const wrapped = wrapExecute(fn as any);
    const res = await wrapped({});
    expect(res.isError).toBe(true);
  });
});
