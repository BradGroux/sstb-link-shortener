/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, expect, it } from "vitest";
import worker from "../index";
import type { Env } from "../types";

function envWithUserCount(count: number): Env {
  return {
    ENVIRONMENT: "test",
    LOG_LEVEL: "error",
    DB: {
      prepare: () => ({
        first: async () => ({ count }),
      }),
    },
  } as unknown as Env;
}

const executionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
} as unknown as ExecutionContext;

describe("dashboard setup link", () => {
  it("hides setup after the first account exists", async () => {
    const response = await worker.fetch(
      new Request("https://go.sstb.ai/dashboard/login"),
      envWithUserCount(1),
      executionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('href="/dashboard/setup"');
  });

  it("offers setup when the installation has no accounts", async () => {
    const response = await worker.fetch(
      new Request("https://go.sstb.ai/dashboard/login"),
      envWithUserCount(0),
      executionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('href="/dashboard/setup"');
  });

  it("keeps the setup route closed after the first account exists", async () => {
    const response = await worker.fetch(
      new Request("https://go.sstb.ai/dashboard/setup"),
      envWithUserCount(1),
      executionContext,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/dashboard/login");
  });
});
