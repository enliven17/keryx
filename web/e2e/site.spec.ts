import { test, expect, type Page } from "@playwright/test";

/**
 * Every route, on desktop and on a phone. The assertions are deliberately about
 * what a reader can actually see: scroll reveals start at opacity 0, so a page
 * whose JS fails renders blank while still returning 200 and containing every
 * word in its markup. Only a visibility check catches that.
 */

const ROUTES = [
  { path: "/", heading: "Get paid" },
  { path: "/docs", heading: "Keryx, end to end" },
  { path: "/onboarding", heading: "Turn coding time into USDC." },
  { path: "/earn", heading: /Earn|No agent connected/ },
  { path: "/advertise", heading: "Campaigns" },
  { path: "/advertise/new", heading: "Create campaign" },
  { path: "/auction", heading: "Live auction" },
  { path: "/leaderboard", heading: "Leaderboard" },
];

/** Console errors that are noise from wallet SDKs rather than our bugs. */
const IGNORED = [
  /Attempted to load @next\/swc/i,
  /Download the React DevTools/i,
  /favicon/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /WalletConnect|walletconnect|indexedDB|Lit is in dev mode/i,
];

/**
 * The navbar sets --nav-p from an effect, so its presence proves React has
 * hydrated and the click handlers are attached. Clicking before that lands on
 * inert markup and silently does nothing.
 */
async function waitForHydration(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--nav-p").trim(),
        ),
      { message: "navbar should have hydrated", timeout: 30_000 },
    )
    .not.toBe("");
}

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!IGNORED.some((re) => re.test(text))) errors.push(text);
  });
  page.on("pageerror", (err) => {
    if (!IGNORED.some((re) => re.test(err.message))) errors.push(err.message);
  });
  return errors;
}

for (const route of ROUTES) {
  test(`${route.path} renders visible content`, async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto(route.path, { waitUntil: "domcontentloaded" });

    const heading = page.getByRole("heading", { name: route.heading }).first();
    await expect(heading).toBeVisible();

    // A reveal that never fires leaves its text at opacity 0 while the element is
    // still "visible" to the DOM. Anything below the fold is meant to be hidden,
    // so only the reveals currently on screen are evidence either way.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const onScreen = [...document.querySelectorAll<HTMLElement>(".reveal, .split")].filter((n) => {
              const r = n.getBoundingClientRect();
              return r.top < window.innerHeight && r.bottom > 0 && r.height > 0;
            });
            return onScreen.filter((n) => Number(getComputedStyle(n).opacity) < 0.9).length;
          }),
        { message: "reveals on screen should have played", timeout: 10_000 },
      )
      .toBe(0);

    expect(errors, `console errors on ${route.path}`).toEqual([]);
  });

  test(`${route.path} fits its viewport`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // One pixel of slack for sub-pixel layout rounding.
    expect(
      overflow.scrollWidth,
      `${route.path} scrolls sideways (${overflow.scrollWidth} > ${overflow.clientWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("navbar collapses to a menu on a phone and not on a desktop", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  const burger = page.locator(".nav-burger");

  if (isMobile) {
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator("#nav-panel")).toBeVisible();
    await expect(page.locator("#nav-panel").getByRole("link", { name: "Docs" })).toBeVisible();
  } else {
    await expect(burger).toBeHidden();
    await expect(page.locator(".nav-links").first()).toBeVisible();
  }
});

test("navbar morphs into a pill once the page scrolls", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);
  const navP = () =>
    page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--nav-p")));

  expect(await navP()).toBeLessThan(0.2);
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(navP, { timeout: 5_000 }).toBeGreaterThan(0.9);
});

test("navigating between routes keeps the content visible", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);

  if (isMobile) {
    await page.locator(".nav-burger").click();
    await expect(page.locator("#nav-panel")).toBeVisible();
    await page.locator("#nav-panel").getByRole("link", { name: "Docs" }).click();
  } else {
    await page.locator(".nav-links").first().getByRole("link", { name: "Docs" }).click();
  }

  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { name: "Keryx, end to end" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How settlement works" })).toBeVisible();
});

test("docs diagrams and sidebar are present", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);

  await expect(page.getByRole("img", { name: "Keryx settlement flow" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Keryx contract permissions" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Revenue split" })).toBeVisible();

  const side = page.locator(".docs-side");
  await expect(side).toBeVisible();
  await side.getByRole("link", { name: "Server API" }).click();
  await expect(page.getByRole("heading", { name: "Server API" })).toBeInViewport();
});

test("the how-it-works steps resolve as the page scrolls", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);

  const opacity = () =>
    page.evaluate(() => {
      const el = document.querySelectorAll<HTMLElement>(".scrub")[1];
      return el ? Number(getComputedStyle(el).opacity) : -1;
    });

  // Below the fold it has not started; once scrolled past it is fully resolved.
  expect(await opacity()).toBeLessThan(0.2);
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>(".scrub")[1]?.scrollIntoView({ block: "center" });
  });
  await expect.poll(opacity, { timeout: 5_000 }).toBeGreaterThan(0.95);
});

test("the page rails run past the hero", async ({ page, isMobile }) => {
  test.skip(isMobile, "the rails sit at the viewport edge on a phone");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

  // A rail is decorative, so assert it is actually painted rather than merely present.
  const painted = await page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>(".gutter-v .dash-v");
    if (!rail) return null;
    const r = rail.getBoundingClientRect();
    return { height: r.height, visible: getComputedStyle(rail).visibility };
  });
  expect(painted?.visible).toBe("visible");
  expect(painted?.height ?? 0).toBeGreaterThan(600);
});

test("the docs sidebar follows the reader down the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "the sidebar is a chip row on a phone, not a rail");
  await page.goto("/docs", { waitUntil: "domcontentloaded" });
  await waitForHydration(page);

  const side = page.locator(".docs-side");
  const before = (await side.boundingBox())?.y ?? 0;

  await page.evaluate(() => window.scrollTo(0, 1800));
  await expect
    .poll(async () => (await side.boundingBox())?.y ?? -1, { timeout: 5_000 })
    .toBeGreaterThan(0);

  const after = (await side.boundingBox())?.y ?? 0;
  // It stuck rather than scrolling away: still on screen, near the top.
  expect(after).toBeLessThanOrEqual(before);
  expect(after).toBeGreaterThan(0);
  await expect(side.getByRole("link", { name: "Limits and caveats" })).toBeVisible();
});
