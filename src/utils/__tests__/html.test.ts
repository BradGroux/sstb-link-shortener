/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, expect, it } from "vitest";
import { html, raw } from "../html";

describe("html template escaping", () => {
  it("escapes ordinary interpolated content", () => {
    expect(html`<div>${"<script>alert(1)</script>"}</div>`).toBe(
      "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>",
    );
  });

  it("renders explicitly trusted static markup", () => {
    expect(html`<div>${raw("<strong>Setup</strong>")}</div>`).toBe(
      "<div><strong>Setup</strong></div>",
    );
  });
});
