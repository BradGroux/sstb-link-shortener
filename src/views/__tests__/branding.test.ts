/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, expect, it } from 'vitest';
import { loginHtml } from '../auth';
import { dashboardHtml } from '../dashboard';
import { LOGO_DATA_URI } from '../../utils/logo';

describe('Digital Meld branding', () => {
  it('uses the Digital Meld logo asset', () => {
    expect(LOGO_DATA_URI).toMatch(/^data:image\/png;base64,/);
  });

  it.each([
    ['dashboard', dashboardHtml('csrf-token', 'nonce')],
    ['login', loginHtml('csrf-token', 'nonce', false)],
  ])('links the %s logo to Digital Meld', (_page, markup) => {
    expect(markup).toContain('href="https://digitalmeld.io/"');
    expect(markup).toContain('alt="Digital Meld"');
    expect(markup).not.toContain('href="https://openshort.link/"');
  });
});
