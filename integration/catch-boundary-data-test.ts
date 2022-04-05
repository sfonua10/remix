import { test, expect } from "@playwright/test";

import { createAppFixture, createFixture, js } from "./helpers/create-fixture";
import type { Fixture, AppFixture } from "./helpers/create-fixture";

let fixture: Fixture;
let app: AppFixture;

let ROOT_BOUNDARY_TEXT = "ROOT_TEXT";
let LAYOUT_BOUNDARY_TEXT = "LAYOUT_BOUNDARY_TEXT";
let OWN_BOUNDARY_TEXT = "OWN_BOUNDARY_TEXT";

let NO_BOUNDARY_LOADER = "/no/loader";
let HAS_BOUNDARY_LAYOUT_NESTED_LOADER = "/yes/loader-layout-boundary";
let HAS_BOUNDARY_NESTED_LOADER = "/yes/loader-self-boundary";

let ROOT_DATA = "root data";
let LAYOUT_DATA = "root data";

test.beforeAll(async () => {
  fixture = await createFixture({
    files: {
      "app/root.jsx": js`
        import { json } from "@remix-run/node";
        import {
          Links,
          Meta,
          Outlet,
          Scripts,
          useLoaderData,
          useMatches,
        } from "@remix-run/react";

        export const loader = () => json("${ROOT_DATA}");

        export default function Root() {
          const data = useLoaderData();

          return (
            <html lang="en">
              <head>
                <Meta />
                <Links />
              </head>
              <body>
                <div>{data}</div>
                <Outlet />
                <Scripts />
              </body>
            </html>
          );
        }

        export function CatchBoundary() {
          let matches = useMatches();
          let { data } = matches.find(match => match.id === "root");

          return (
            <html>
              <head />
              <body>
                <div>${ROOT_BOUNDARY_TEXT}</div>
                <div>{data}</div>
                <Scripts />
              </body>
            </html>
          );
        }
      `,

      "app/routes/index.jsx": js`
        import { Link } from "@remix-run/react";
        export default function Index() {
          return (
            <div>
              <Link to="${NO_BOUNDARY_LOADER}">${NO_BOUNDARY_LOADER}</Link>
              <Link to="${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}">${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}</Link>
              <Link to="${HAS_BOUNDARY_NESTED_LOADER}">${HAS_BOUNDARY_NESTED_LOADER}</Link>
            </div>
          );
        }
      `,

      [`app/routes${NO_BOUNDARY_LOADER}.jsx`]: js`
        export function loader() {
          throw new Response("", { status: 401 });
        }
        export default function Index() {
          return <div/>;
        }
      `,

      [`app/routes${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}.jsx`]: js`
        import { useMatches } from "@remix-run/react";
        export function loader() {
          return "${LAYOUT_DATA}";
        }
        export default function Layout() {
          return <div/>;
        }
        export function CatchBoundary() {
          let matches = useMatches();
          let { data } = matches.find(match => match.id === "routes${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}");

          return (
            <div>
              <div>${LAYOUT_BOUNDARY_TEXT}</div>
              <div>{data}</div>
            </div>
          );
        }
      `,

      [`app/routes${HAS_BOUNDARY_LAYOUT_NESTED_LOADER}/index.jsx`]: js`
        export function loader() {
          throw new Response("", { status: 401 });
        }
        export default function Index() {
          return <div/>;
        }
      `,

      [`app/routes${HAS_BOUNDARY_NESTED_LOADER}.jsx`]: js`
        import { Outlet, useLoaderData } from "@remix-run/react";
        export function loader() {
          return "${LAYOUT_DATA}";
        }
        export default function Layout() {
          let data = useLoaderData();
          return (
            <div>
              <div>{data}</div>
              <Outlet/>
            </div>
          );
        }
      `,

      [`app/routes${HAS_BOUNDARY_NESTED_LOADER}/index.jsx`]: js`
        export function loader() {
          throw new Response("", { status: 401 });
        }
        export default function Index() {
          return <div/>;
        }
        export function CatchBoundary() {
          return (
            <div>${OWN_BOUNDARY_TEXT}</div>
          );
        }
      `,
    },
  });

  app = await createAppFixture(fixture);
});

test.afterAll(async () => app.close());

test("renders root boundary with data available", async () => {
  let res = await fixture.requestDocument(NO_BOUNDARY_LOADER);
  expect(res.status).toBe(401);
  let html = await res.text();
  expect(html).toMatch(ROOT_BOUNDARY_TEXT);
  expect(html).toMatch(ROOT_DATA);
});

test("renders root boundary with data available on transition", async ({
  page,
}) => {
  await app.goto(page, "/");
  await app.clickLink(page, NO_BOUNDARY_LOADER);
  let html = await app.getHtml(page);
  expect(html).toMatch(ROOT_BOUNDARY_TEXT);
  expect(html).toMatch(ROOT_DATA);
});

test("renders layout boundary with data available", async () => {
  let res = await fixture.requestDocument(HAS_BOUNDARY_LAYOUT_NESTED_LOADER);
  expect(res.status).toBe(401);
  let html = await res.text();
  expect(html).toMatch(ROOT_DATA);
  expect(html).toMatch(LAYOUT_BOUNDARY_TEXT);
  expect(html).toMatch(LAYOUT_DATA);
});

test("renders layout boundary with data available on transition", async ({
  page,
}) => {
  await app.goto(page, "/");
  await app.clickLink(page, HAS_BOUNDARY_LAYOUT_NESTED_LOADER);
  let html = await app.getHtml(page);
  expect(html).toMatch(ROOT_DATA);
  expect(html).toMatch(LAYOUT_BOUNDARY_TEXT);
  expect(html).toMatch(LAYOUT_DATA);
});

test("renders self boundary with layout data available", async () => {
  let res = await fixture.requestDocument(HAS_BOUNDARY_NESTED_LOADER);
  expect(res.status).toBe(401);
  let html = await res.text();
  expect(html).toMatch(ROOT_DATA);
  expect(html).toMatch(LAYOUT_DATA);
  expect(html).toMatch(OWN_BOUNDARY_TEXT);
});

test("renders self boundary with layout data available on transition", async ({
  page,
}) => {
  await app.goto(page, "/");
  await app.clickLink(page, HAS_BOUNDARY_NESTED_LOADER);
  let html = await app.getHtml(page);
  expect(html).toMatch(ROOT_DATA);
  expect(html).toMatch(LAYOUT_DATA);
  expect(html).toMatch(OWN_BOUNDARY_TEXT);
});
