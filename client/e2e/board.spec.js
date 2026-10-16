import { test, expect } from "@playwright/test";
test("team board: create, assign, edit, comment, filter, realtime and mobile", async ({
  page,
  browser,
  request,
}) => {
  const stamp = Date.now();
  async function register(name) {
    const response = await request.post("http://127.0.0.1:5000/api/users", {
      data: {
        name,
        email: `${name}-${stamp}@example.test`,
        password: "Test-password-123!",
      },
    });
    expect(response.status()).toBe(201);
    return response.json();
  }
  const owner = await register("owner");
  const member = await register("member");
  const headers = { Authorization: `Bearer ${owner.token}` };
  const projectResponse = await request.post(
    "http://127.0.0.1:5000/api/projects",
    {
      headers,
      data: {
        name: "Website launch",
        description: "Plan the release together.",
      },
    },
  );
  const project = await projectResponse.json();
  const invited = await request.put(
    `http://127.0.0.1:5000/api/projects/${project._id}/add-member`,
    { headers, data: { email: member.email } },
  );
  expect(invited.status()).toBe(200);
  await page.addInitScript(
    (user) => localStorage.setItem("userInfo", JSON.stringify(user)),
    owner,
  );
  await page.goto(`/project/${project._id}`);
  await expect(page.getByText("Live updates connected")).toBeVisible();
  await page.getByRole("button", { name: "+ Add task", exact: true }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Title", { exact: true }).fill("Review checkout");
  await form.getByLabel("Description").fill("Check mobile and keyboard flows.");
  await form.getByLabel("Assignee").selectOption(member._id);
  await form.getByLabel("Due date").fill("2020-01-01");
  await form.getByLabel("Priority").selectOption("High");
  await form.getByRole("button", { name: "Save task" }).click();
  await expect(form).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review checkout", exact: true }),
  ).toBeVisible();
  const colleague = await browser.newContext();
  const second = await colleague.newPage();
  await second.addInitScript(
    (user) => localStorage.setItem("userInfo", JSON.stringify(user)),
    member,
  );
  await second.goto(`/project/${project._id}`);
  await expect(second.getByText("Live updates connected")).toBeVisible();
  await expect(
    second.getByRole("button", { name: "Add member", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review checkout", exact: true })
    .click();
  await form.getByLabel("Add a comment").fill("Ready for your review.");
  await form.getByRole("button", { name: "Post comment" }).click();
  await expect(form.getByText("Ready for your review.")).toBeVisible();
  await form.getByRole("button", { name: "Edit task", exact: true }).click();
  await form.getByLabel("Status").selectOption("In Progress");
  await form.getByRole("button", { name: "Save task" }).click();
  await expect(form).toHaveCount(0);
  await expect(
    second
      .locator(".column-1")
      .getByRole("button", { name: "Review checkout", exact: true }),
  ).toBeVisible();
  // Keyboard drag and drop is supported in addition to the status form.
  const handle = page.getByRole("button", {
    name: "Move Review checkout",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(
    page.locator(".column-2").getByRole("button", { name: "Review checkout", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search tasks").fill("missing");
  await expect(
    page.getByText("0 of 1 tasks shown", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("project-tasks.csv");
  await page.screenshot({
    path: "test-results/board-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/board-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Review checkout", exact: true })
    .click();
  await expect(form.getByText("Ready for your review.")).toBeVisible();
  await colleague.close();
});

test("live rooms reject anonymous connections and outsiders", async ({
  request,
}) => {
  const { io } = await import("socket.io-client");
  const users = [];
  for (const name of ["room-owner", "room-outsider"]) {
    const response = await request.post("http://127.0.0.1:5000/api/users", {
      data: {
        name,
        email: `${name}-${Date.now()}@example.test`,
        password: "Test-password-123!",
      },
    });
    users.push(await response.json());
  }
  const created = await request.post("http://127.0.0.1:5000/api/projects", {
    headers: { Authorization: `Bearer ${users[0].token}` },
    data: { name: "Private" },
  });
  const project = await created.json();
  const anonymous = io("http://127.0.0.1:5000", { reconnection: false });
  try {
    await new Promise((resolve, reject) => {
      anonymous.on("connect_error", resolve);
      anonymous.on("connect", () =>
        reject(new Error("Anonymous socket connected")),
      );
    });
  } finally {
    anonymous.disconnect();
  }
  const outsider = io("http://127.0.0.1:5000", {
    auth: { token: users[1].token },
    reconnection: false,
  });
  try {
    await new Promise((resolve, reject) => {
      outsider.on("connect", resolve);
      outsider.on("connect_error", reject);
    });
    const reply = await new Promise((resolve) =>
      outsider.emit("joinProject", project._id, resolve),
    );
    expect(reply.ok).toBe(false);
  } finally {
    outsider.disconnect();
  }
});
