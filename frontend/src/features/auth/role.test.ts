import { describe, expect, it } from 'vitest';

import { toCanonicalRole, toFrontendRole } from './role';

describe('role mapping', () => {
  it('maps client to customer canonical role', () => {
    expect(toCanonicalRole('client')).toBe('customer');
  });

  it('maps customer canonical role back to client', () => {
    expect(toFrontendRole('customer')).toBe('client');
  });
});
