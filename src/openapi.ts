import { API_KEY_SCOPES } from './utils/apiScopes';

const jsonResponse = (schema: Record<string, unknown>, description = 'Successful response') => ({
  description,
  content: { 'application/json': { schema } },
});

const envelope = (data: Record<string, unknown>) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: { success: { type: 'boolean', const: true }, data },
});

const bearer = () => [{ bearerAuth: [] }];

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'SSTB Link API',
    version: '1.0.0',
    description: 'Stable REST contract for human and agent-managed links on go.sstb.ai.',
  },
  servers: [{ url: 'https://go.sstb.ai/api/v1' }],
  tags: [
    { name: 'Domains' },
    { name: 'Links' },
    { name: 'Analytics' },
    { name: 'Taxonomy' },
  ],
  paths: {
    '/domains': {
      get: {
        operationId: 'listDomains', tags: ['Domains'], security: bearer(), 'x-required-scopes': ['domains:read'],
        responses: { '200': jsonResponse(envelope({ type: 'array', items: { $ref: '#/components/schemas/Domain' } })) },
      },
    },
    '/domains/{id}': {
      get: {
        operationId: 'getDomain', tags: ['Domains'], security: bearer(), 'x-required-scopes': ['domains:read'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { '200': jsonResponse(envelope({ $ref: '#/components/schemas/Domain' })) },
      },
    },
    '/links': {
      get: {
        operationId: 'listLinks', tags: ['Links'], security: bearer(), 'x-required-scopes': ['links:read'],
        parameters: [
          { name: 'domain_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 25 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: { '200': jsonResponse(envelope({ type: 'array', items: { $ref: '#/components/schemas/Link' } })) },
      },
      post: {
        operationId: 'createLink', tags: ['Links'], security: bearer(), 'x-required-scopes': ['links:write'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateLink' } } } },
        responses: { '201': jsonResponse(envelope({ $ref: '#/components/schemas/Link' }), 'Link created') },
      },
    },
    '/links/{id}': {
      get: {
        operationId: 'getLink', tags: ['Links'], security: bearer(), 'x-required-scopes': ['links:read'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { '200': jsonResponse(envelope({ $ref: '#/components/schemas/Link' })) },
      },
      put: {
        operationId: 'updateLink', tags: ['Links'], security: bearer(), 'x-required-scopes': ['links:write'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateLink' } } } },
        responses: { '200': jsonResponse(envelope({ $ref: '#/components/schemas/Link' })) },
      },
      delete: {
        operationId: 'deleteLink', tags: ['Links'], security: bearer(), 'x-required-scopes': ['links:delete'],
        description: 'Destructive. The default agent scope set intentionally excludes links:delete.',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { '200': jsonResponse({ $ref: '#/components/schemas/SuccessMessage' }) },
      },
    },
    '/analytics/links/{id}': {
      get: {
        operationId: 'getLinkAnalytics', tags: ['Analytics'], security: bearer(), 'x-required-scopes': ['analytics:read'],
        parameters: [
          { $ref: '#/components/parameters/Id' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
        ],
        responses: { '200': jsonResponse(envelope({ type: 'object', additionalProperties: true })) },
      },
    },
    '/analytics/dashboard': {
      get: {
        operationId: 'getAggregateAnalytics', tags: ['Analytics'], security: bearer(), 'x-required-scopes': ['analytics:read'],
        parameters: [
          { name: 'domain_id', in: 'query', schema: { type: 'string' } },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
        ],
        responses: { '200': jsonResponse(envelope({ type: 'object', additionalProperties: true })) },
      },
    },
    '/tags': {
      get: {
        operationId: 'listTags', tags: ['Taxonomy'], security: bearer(), 'x-required-scopes': ['taxonomy:read'],
        responses: { '200': jsonResponse(envelope({ type: 'array', items: { $ref: '#/components/schemas/Tag' } })) },
      },
    },
    '/categories': {
      get: {
        operationId: 'listCategories', tags: ['Taxonomy'], security: bearer(), 'x-required-scopes': ['taxonomy:read'],
        responses: { '200': jsonResponse(envelope({ type: 'array', items: { $ref: '#/components/schemas/Category' } })) },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http', scheme: 'bearer', bearerFormat: 'SSTB API key',
        description: `Operation scopes: ${API_KEY_SCOPES.join(', ')}.`,
      },
    },
    parameters: {
      Id: { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      StartDate: { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
      EndDate: { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
    },
    schemas: {
      Domain: {
        type: 'object', required: ['id', 'domain_name', 'status'],
        properties: { id: { type: 'string' }, domain_name: { type: 'string' }, status: { enum: ['active', 'inactive', 'pending'] }, routes: { type: 'array', items: { type: 'string' } } },
      },
      Link: {
        type: 'object', required: ['id', 'domain_id', 'slug', 'destination_url', 'status'],
        properties: {
          id: { type: 'string' }, domain_id: { type: 'string' }, slug: { type: 'string' },
          destination_url: { type: 'string', format: 'uri', pattern: '^https?://' },
          title: { type: 'string' }, description: { type: 'string' },
          status: { enum: ['active', 'expired', 'archived', 'deleted'] },
          click_count: { type: 'integer' }, unique_visitors: { type: 'integer' },
        },
      },
      CreateLink: {
        type: 'object', required: ['domain_id', 'destination_url'], additionalProperties: false,
        properties: {
          domain_id: { type: 'string' }, slug: { type: 'string' },
          destination_url: { type: 'string', format: 'uri', pattern: '^https?://' },
          title: { type: 'string', maxLength: 255 }, description: { type: 'string', maxLength: 5000 },
          redirect_code: { type: 'integer', minimum: 301, maximum: 308, default: 301 },
          tags: { type: 'array', maxItems: 10, items: { type: 'string' } },
          category_id: { type: 'string' }, expires_at: { type: 'number' }, route: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
          geo_redirects: { type: 'array', maxItems: 10, items: { $ref: '#/components/schemas/GeoRedirect' } },
          device_redirects: { type: 'array', items: { $ref: '#/components/schemas/DeviceRedirect' } },
          city_redirects: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/CityRedirect' } },
          os_redirects: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/OsRedirect' } },
          og_meta: { $ref: '#/components/schemas/OgMeta' },
        },
      },
      UpdateLink: {
        type: 'object', additionalProperties: false,
        properties: {
          destination_url: { type: 'string', format: 'uri', pattern: '^https?://' },
          title: { type: 'string', maxLength: 255 }, description: { type: 'string', maxLength: 5000 },
          redirect_code: { type: 'integer', minimum: 301, maximum: 308 },
          tags: { type: 'array', maxItems: 10, items: { type: 'string' } },
          category_id: { type: 'string' }, expires_at: { type: 'number' }, route: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
          geo_redirects: { type: 'array', maxItems: 10, items: { $ref: '#/components/schemas/GeoRedirect' } },
          device_redirects: { type: 'array', items: { $ref: '#/components/schemas/DeviceRedirect' } },
          city_redirects: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/CityRedirect' } },
          os_redirects: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/OsRedirect' } },
          og_meta: { $ref: '#/components/schemas/OgMeta' },
          status: { enum: ['active', 'expired', 'archived', 'deleted'] },
        },
      },
      GeoRedirect: { type: 'object', required: ['country_code', 'destination_url'], properties: { country_code: { type: 'string', minLength: 2, maxLength: 2 }, destination_url: { type: 'string', format: 'uri', pattern: '^https?://' } } },
      DeviceRedirect: { type: 'object', required: ['device_type', 'destination_url'], properties: { device_type: { enum: ['desktop', 'mobile', 'tablet'] }, destination_url: { type: 'string', format: 'uri', pattern: '^https?://' } } },
      CityRedirect: { type: 'object', required: ['city_name', 'destination_url'], properties: { city_name: { type: 'string' }, destination_url: { type: 'string', format: 'uri', pattern: '^https?://' } } },
      OsRedirect: { type: 'object', required: ['os', 'destination_url'], properties: { os: { enum: ['android', 'ios'] }, destination_url: { type: 'string', format: 'uri', pattern: '^https?://' } } },
      OgMeta: { type: 'object', properties: { og_title: { type: 'string', maxLength: 255 }, og_description: { type: 'string', maxLength: 500 }, og_image: { type: 'string', format: 'uri', pattern: '^https?://' }, og_type: { enum: ['website', 'article', 'product', 'video.other'] }, twitter_card: { enum: ['summary', 'summary_large_image'] } } },
      Tag: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' }, domain_id: { type: 'string' }, color: { type: 'string' } } },
      Category: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' }, domain_id: { type: 'string' }, icon: { type: 'string' } } },
      SuccessMessage: { type: 'object', required: ['success', 'message'], properties: { success: { type: 'boolean', const: true }, message: { type: 'string' } } },
    },
  },
} as const;
