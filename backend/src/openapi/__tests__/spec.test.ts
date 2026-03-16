import { describe, expect, it } from 'vitest';
import { openApiSpec } from '../spec.js';

describe('openapi spec', () => {
  it('includes versioned and unversioned servers', () => {
    const serverUrls = openApiSpec.servers.map((server) => server.url);
    expect(serverUrls).toContain('/api');
    expect(serverUrls).toContain('/api/v1');
  });

  it('documents readiness and ml forecast paths', () => {
    expect(openApiSpec.paths['/ready']).toBeDefined();
    expect(openApiSpec.paths['/ml/forecast']).toBeDefined();
    expect(openApiSpec.paths['/users']).toBeDefined();
  });
});
