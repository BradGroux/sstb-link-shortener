#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const objectSchema = (properties, required = []) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {}),
});

export const tools = [
  {
    name: 'create_tracked_link',
    title: 'Create tracked link',
    description: 'Create an HTTP(S) short link. Requires links:write.',
    inputSchema: objectSchema({
      domain_id: { type: 'string' }, destination_url: { type: 'string', pattern: '^https?://' },
      slug: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 10 }, category_id: { type: 'string' },
    }, ['domain_id', 'destination_url']),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'get_link', title: 'Get link', description: 'Get one link by ID. Requires links:read.',
    inputSchema: objectSchema({ id: { type: 'string' } }, ['id']),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'list_links', title: 'List links', description: 'List links visible to the API key. Requires links:read.',
    inputSchema: objectSchema({
      domain_id: { type: 'string' }, status: { type: 'string' }, search: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 10000 }, offset: { type: 'integer', minimum: 0 },
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'update_link', title: 'Update link', description: 'Update mutable link fields. Requires links:write.',
    inputSchema: objectSchema({
      id: { type: 'string' }, destination_url: { type: 'string', pattern: '^https?://' },
      slug: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
      status: { enum: ['active', 'expired', 'archived'] },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 10 }, category_id: { type: 'string' },
    }, ['id']),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'archive_link', title: 'Archive link',
    description: 'Reversibly disable a link. Requires links:write and confirm=true. This server intentionally exposes no delete tool.',
    inputSchema: objectSchema({ id: { type: 'string' }, confirm: { type: 'boolean', const: true } }, ['id', 'confirm']),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'get_link_analytics', title: 'Get link analytics', description: 'Get analytics for one link. Requires analytics:read.',
    inputSchema: objectSchema({
      id: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' },
    }, ['id']),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'get_aggregate_analytics', title: 'Get aggregate analytics', description: 'Get aggregate analytics visible to the API key. Requires analytics:read.',
    inputSchema: objectSchema({
      domain_id: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' },
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
];

function requiredString(args, name) {
  const value = args?.[name];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function validateArguments(toolName, args) {
  const tool = tools.find((candidate) => candidate.name === toolName);
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('arguments must be an object');
  const schema = tool.inputSchema;
  for (const required of schema.required || []) {
    if (!(required in args)) throw new Error(`${required} is required`);
  }
  for (const [name, value] of Object.entries(args)) {
    const rule = schema.properties[name];
    if (!rule) throw new Error(`Unknown argument: ${name}`);
    if (rule.type === 'string' && typeof value !== 'string') throw new Error(`${name} must be a string`);
    if (rule.type === 'boolean' && typeof value !== 'boolean') throw new Error(`${name} must be a boolean`);
    if (rule.type === 'integer' && !Number.isInteger(value)) throw new Error(`${name} must be an integer`);
    if (rule.type === 'array' && !Array.isArray(value)) throw new Error(`${name} must be an array`);
    if (rule.pattern && typeof value === 'string' && !(new RegExp(rule.pattern)).test(value)) throw new Error(`${name} has an invalid format`);
    if (rule.format === 'date' && typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must be YYYY-MM-DD`);
    if (rule.enum && !rule.enum.includes(value)) throw new Error(`${name} must be one of: ${rule.enum.join(', ')}`);
    if ('const' in rule && value !== rule.const) throw new Error(`${name} must be ${String(rule.const)}`);
    if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) throw new Error(`${name} is below the minimum`);
    if (typeof value === 'number' && rule.maximum !== undefined && value > rule.maximum) throw new Error(`${name} exceeds the maximum`);
    if (Array.isArray(value) && rule.maxItems !== undefined && value.length > rule.maxItems) throw new Error(`${name} has too many items`);
  }
}

function queryString(args, names) {
  const query = new URLSearchParams();
  for (const name of names) {
    const value = args?.[name];
    if (value !== undefined && value !== null && value !== '') query.set(name, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export async function executeTool(name, args = {}, options = {}) {
  validateArguments(name, args);
  const baseUrl = (options.baseUrl || process.env.SSTB_LINK_API_URL || 'https://go.sstb.ai/api/v1').replace(/\/$/, '');
  const apiKey = options.apiKey || process.env.SSTB_LINK_API_KEY;
  const fetchImpl = options.fetchImpl || fetch;
  if (!apiKey) throw new Error('SSTB_LINK_API_KEY is required');

  let method = 'GET';
  let path;
  let body;
  switch (name) {
    case 'create_tracked_link':
      requiredString(args, 'domain_id'); requiredString(args, 'destination_url');
      method = 'POST'; path = '/links'; body = args; break;
    case 'get_link': path = `/links/${encodeURIComponent(requiredString(args, 'id'))}`; break;
    case 'list_links': path = `/links${queryString(args, ['domain_id', 'status', 'search', 'limit', 'offset'])}`; break;
    case 'update_link': {
      const id = requiredString(args, 'id');
      method = 'PUT'; path = `/links/${encodeURIComponent(id)}`; body = { ...args }; delete body.id; break;
    }
    case 'archive_link':
      if (args.confirm !== true) throw new Error('confirm=true is required to archive a link');
      method = 'PUT'; path = `/links/${encodeURIComponent(requiredString(args, 'id'))}`; body = { status: 'archived' }; break;
    case 'get_link_analytics':
      path = `/analytics/links/${encodeURIComponent(requiredString(args, 'id'))}${queryString(args, ['start_date', 'end_date'])}`; break;
    case 'get_aggregate_analytics':
      path = `/analytics/dashboard${queryString(args, ['domain_id', 'start_date', 'end_date'])}`; break;
    default: throw new Error(`Unknown tool: ${name}`);
  }

  const response = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `REST request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function toolResult(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
}

export async function handleMessage(message, options = {}) {
  if (!message || message.jsonrpc !== '2.0') return null;
  if (message.method === 'notifications/initialized') return null;
  if (message.id === undefined) return null;

  try {
    let result;
    if (message.method === 'initialize') {
      result = {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'sstb-link-mcp', version: '1.0.0' },
        instructions: 'Use scoped API keys. Archive requires explicit confirmation; permanent deletion is not exposed.',
      };
    } else if (message.method === 'ping') {
      result = {};
    } else if (message.method === 'tools/list') {
      result = { tools };
    } else if (message.method === 'tools/call') {
      const payload = await executeTool(message.params?.name, message.params?.arguments || {}, options);
      result = toolResult(payload);
    } else {
      return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } };
    }
    return { jsonrpc: '2.0', id: message.id, result };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Tool call failed';
    if (message.method === 'tools/call') {
      return { jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: messageText }], isError: true } };
    }
    return { jsonrpc: '2.0', id: message.id, error: { code: -32603, message: messageText } };
  }
}

export function runStdio() {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on('line', async (line) => {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`);
      return;
    }
    const response = await handleMessage(message);
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runStdio();
