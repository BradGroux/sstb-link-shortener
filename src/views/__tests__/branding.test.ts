/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, expect, it } from 'vitest';
import { loginHtml } from '../auth';
import { dashboardHtml } from '../dashboard';
import { LOGO_ON_DARK_DATA_URI, LOGO_ON_LIGHT_DATA_URI } from '../../utils/logo';
import { baseCss } from '../dashboard/styles/base';
import { darkModeCss } from '../dashboard/styles/dark-mode';
import { staticRouter } from '../../api/static';

describe('Digital Meld branding', () => {
  it('uses both supplied Digital Meld SVG variants', () => {
    expect(LOGO_ON_DARK_DATA_URI).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(LOGO_ON_LIGHT_DATA_URI).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it.each([
    ['dashboard', dashboardHtml('csrf-token', 'nonce')],
    ['login', loginHtml('csrf-token', 'nonce', false)],
  ])('links the %s logo to Digital Meld', (_page, markup) => {
    expect(markup).toContain('href="https://digitalmeld.io/"');
    expect(markup).toContain('alt="Digital Meld"');
    expect(markup).not.toContain('href="https://openshort.link/"');
  });

  it('renders theme-specific dashboard logos', () => {
    const markup = dashboardHtml('csrf-token', 'nonce');
    expect(markup).toContain('class="brand-logo brand-logo--on-light"');
    expect(markup).toContain('class="brand-logo brand-logo--on-dark"');
    expect(markup).toContain('/dashboard/static/brand/digital-meld-on-light.svg?v=v4');
    expect(markup).toContain('/dashboard/static/brand/digital-meld-on-dark.svg?v=v4');
    expect(loginHtml('csrf-token', 'nonce', false)).toContain(
      '/dashboard/static/brand/digital-meld-on-dark.svg?v=v4',
    );
    expect(baseCss).toContain('--navbar-bg: #ffffff');
    expect(baseCss).toContain('.brand-logo--on-dark { display: none; }');
    expect(darkModeCss).toContain('.dark-mode .brand-logo--on-light { display: none; }');
    expect(darkModeCss).toContain('.dark-mode .brand-logo--on-dark { display: block; }');
  });

  it('serves both logo variants as immutable SVG assets', async () => {
    const lightResponse = await staticRouter.request('/brand/digital-meld-on-light.svg');
    const darkResponse = await staticRouter.request('/brand/digital-meld-on-dark.svg');

    expect(lightResponse.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(darkResponse.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(lightResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(darkResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await lightResponse.text()).toContain('fill: #12151a;');
    expect(await darkResponse.text()).toContain('fill: #fff;');
  });

  it('uses the smaller dashboard logo size', () => {
    expect(baseCss).toContain('height: 40px;');
    expect(baseCss).toContain('height: calc(100vh - 61px);');
  });

  it('uses a fresh stylesheet cache key for the branded header', () => {
    expect(dashboardHtml('csrf-token', 'nonce')).toContain('/dashboard/static/base.css?v=v4');
  });
});
