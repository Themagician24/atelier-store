import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

/*
 * A static check on the admin area's security boundary: every Server Action
 * under src/app/admin must call requireAdmin() before anything else, and
 * every page and layout must call it. An action added later without the
 * guard fails here, before it can ship as an open POST endpoint.
 */

const ADMIN_DIR = join(process.cwd(), "src", "app", "admin");

const files = (readdirSync(ADMIN_DIR, { recursive: true }) as string[])
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => /\.(ts|tsx)$/.test(f));

const read = (f: string) => readFileSync(join(ADMIN_DIR, f), "utf8");

describe("admin Server Actions", () => {
  const actionFiles = files.filter((f) => read(f).includes('"use server"'));

  test("exist", () => {
    assert.ok(actionFiles.length > 0, "expected at least one actions file");
  });

  for (const file of actionFiles) {
    const source = read(file);

    test(`${file} starts with "use server"`, () => {
      assert.match(source.trimStart(), /^"use server";/);
    });

    // In a "use server" file every non-type export is an action.
    const exports = [...source.matchAll(/^export (?!type\b)(.*)$/gm)].map((m) => m[1]);

    for (const declaration of exports) {
      const name = /^async function (\w+)/.exec(declaration)?.[1];

      test(`${file}: ${declaration.slice(0, 40)}… is an async function`, () => {
        assert.ok(name, "only `export async function` is allowed here");
      });
      if (!name) continue;

      test(`${file}: ${name}() calls requireAdmin() first`, () => {
        const start = source.indexOf(`export async function ${name}`);
        // The body opens at the first brace that ends a line of the signature.
        const open = /\{\r?\n/.exec(source.slice(start));
        assert.ok(open, "function body not found");
        const body = source
          .slice(start + open.index + open[0].length)
          .replace(/^\s*(\/\/.*\r?\n\s*)*/, "");
        // Its result may be kept (for the audit log), but nothing runs before it.
        assert.match(body, /^(const \w+ = )?await requireAdmin\(/);
      });
    }
  }
});

describe("admin pages and layouts", () => {
  const routeFiles = files.filter((f) => /(^|\/)(page|layout)\.tsx$/.test(f));

  test("exist", () => {
    assert.ok(routeFiles.length > 0);
  });

  for (const file of routeFiles) {
    test(`${file} calls requireAdmin()`, () => {
      const source = read(file);
      assert.match(source, /import \{[^}]*\brequireAdmin\b[^}]*\} from "@\/lib\/session"/);
      assert.match(source, /await requireAdmin\(/);
    });
  }
});

/*
 * The header's /api/me answers anyone with a cookie: it must stay limited to
 * a first name, the admin flag and the bag count — never an email or an id.
 * The events beacon never echoes anything back.
 */
describe("public API routes", () => {
  // Code only: comments may name what the route deliberately leaves out.
  const api = (p: string) =>
    readFileSync(join(process.cwd(), "src", "app", "api", p), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  test("/api/me exposes no email or user id", () => {
    const source = api("me/route.ts");
    assert.doesNotMatch(source, /email/);
    assert.doesNotMatch(source, /\bid:/);
    assert.match(source, /no-store/);
  });

  test("/api/events always answers 204 with no body", () => {
    const source = api("events/route.ts");
    assert.doesNotMatch(source, /Response\.json/);
    assert.match(source, /status: 204/);
  });

  test("the Stripe webhook verifies the signature before anything else", () => {
    const source = api("stripe/webhook/route.ts");
    const verify = source.indexOf("constructEvent(");
    assert.ok(verify > 0);
    for (const apply of ["applyCheckoutEvent(event)", "applyRefundEvent(event)"]) {
      assert.ok(source.indexOf(apply) > verify, apply);
    }
  });
});

describe("payment status", () => {
  test("no admin action can write an order's payment status", () => {
    for (const file of files.filter((f) => read(f).includes('"use server"'))) {
      assert.doesNotMatch(read(file), /status:\s*"paid"|set\(\{\s*status/, file);
    }
  });
});
