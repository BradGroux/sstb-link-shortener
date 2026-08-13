import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { executeTool, handleMessage, tools } from '../src/server.mjs';

test('server module imports when argv[1] is absent', () => {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', 'await import("./src/server.mjs")'],
    { cwd: new URL('../', import.meta.url), encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
});

test('tool list has no permanent delete and archive requires confirmation', async () => {
  assert.equal(tools.some((tool) => tool.name === 'delete_link'), false);
  await assert.rejects(
    executeTool('archive_link', { id: 'link_1' }, { apiKey: 'test', fetchImpl: () => { throw new Error('should not fetch'); } }),
    /confirm(?:=true| is required)/
  );
});

test('REST calls use bearer auth and the canonical API route', async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ success: true, data: { id: 'link_1' } }), { status: 200 });
  };
  const payload = await executeTool('get_link', { id: 'link_1' }, { baseUrl: 'https://go.sstb.ai/api/v1/', apiKey: 'secret-key', fetchImpl });
  assert.equal(request.url, 'https://go.sstb.ai/api/v1/links/link_1');
  assert.equal(request.init.headers.Authorization, 'Bearer secret-key');
  assert.equal(payload.data.id, 'link_1');
});

test('initialize and tools/list implement MCP JSON-RPC', async () => {
  const initialized = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(initialized.result.protocolVersion, '2025-06-18');
  const listed = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  assert.equal(listed.result.tools.length, 7);
});

test('rejects unknown, mistyped, and unsafe arguments before calling REST', async () => {
  const options = { apiKey: 'test', fetchImpl: () => { throw new Error('should not fetch'); } };
  await assert.rejects(executeTool('create_tracked_link', { domain_id: 'd1', destination_url: 'javascript:alert(1)' }, options), /invalid format/);
  await assert.rejects(executeTool('list_links', { limit: '100' }, options), /integer/);
  await assert.rejects(executeTool('get_link', { id: 'l1', surprise: true }, options), /Unknown argument/);
});

test('REST failures become MCP tool errors without leaking the key', async () => {
  const response = await handleMessage(
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_link', arguments: { id: 'missing' } } },
    { apiKey: 'secret-key', fetchImpl: async () => new Response(JSON.stringify({ message: 'Link not found' }), { status: 404 }) }
  );
  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /Link not found/);
  assert.doesNotMatch(JSON.stringify(response), /secret-key/);
});
