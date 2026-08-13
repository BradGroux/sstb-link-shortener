/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { Hono, type Context } from 'hono';
import { baseCss } from '../views/dashboard/styles/base';
import { darkModeCss } from '../views/dashboard/styles/dark-mode';
import { componentsCss } from '../views/dashboard/styles/components';
import { apiClientJs } from '../views/dashboard/utils/api-client';
import { toastJs } from '../views/dashboard/utils/toast';
import { paginationJs } from '../views/dashboard/utils/pagination';
import { LOGO_ON_DARK_DATA_URI, LOGO_ON_LIGHT_DATA_URI } from '../utils/logo';

const app = new Hono();

const svgFromDataUri = (dataUri: string): string => atob(dataUri.slice(dataUri.indexOf(',') + 1));
const logoOnDarkSvg = svgFromDataUri(LOGO_ON_DARK_DATA_URI);
const logoOnLightSvg = svgFromDataUri(LOGO_ON_LIGHT_DATA_URI);

const serveLogo = (c: Context, svg: string) => {
    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(svg);
};

// Static assets are now mounted at /dashboard/static
// So routes here are relative: /base.css -> /dashboard/static/base.css
app.get('/base.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(baseCss);
});

app.get('/dark-mode.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(darkModeCss);
});

app.get('/components.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(componentsCss);
});

app.get('/brand/digital-meld-on-light.svg', (c) => serveLogo(c, logoOnLightSvg));

app.get('/brand/digital-meld-on-dark.svg', (c) => serveLogo(c, logoOnDarkSvg));

app.get('/utils/api-client.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(apiClientJs);
});

app.get('/utils/toast.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(toastJs);
});

app.get('/utils/pagination.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(paginationJs);
});

export const staticRouter = app;
