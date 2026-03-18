const state = {
  user: null,
  clients: [],
  selectedClientId: null,
  activeTab: "calendar",
};

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const clientSelect = document.getElementById("clientSelect");
const adminClientPicker = document.getElementById("adminClientPicker");
const clientHeading = document.getElementById("clientHeading");
const calendarView = document.getElementById("calendarView");
const postsView = document.getElementById("postsView");
const calendarGrid = document.getElementById("calendarGrid");
const postsList = document.getElementById("postsList");
const calendarTab = document.getElementById("calendarTab");
const postsTab = document.getElementById("postsTab");
const logoutButton = document.getElementById("logoutButton");
const postForm = document.getElementById("postForm");
const adminComposer = document.getElementById("adminComposer");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function selectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId) || null;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderCalendar(client) {
  calendarGrid.innerHTML = "";
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstVisible = new Date(monthStart);
  firstVisible.setDate(monthStart.getDate() - monthStart.getDay());

  for (let i = 0; i < 35; i += 1) {
    const current = new Date(firstVisible);
    current.setDate(firstVisible.getDate() + i);
    const isoDate = current.toISOString().slice(0, 10);
    const dayPosts = client.posts.filter((post) => post.publishDate === isoDate);
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    if (current.toDateString() === today.toDateString()) cell.classList.add("today");
    if (current.getMonth() !== today.getMonth()) cell.style.opacity = "0.45";
    cell.innerHTML = `
      <header>
        <strong>${current.getDate()}</strong>
        <small>${current.toLocaleDateString(undefined, { weekday: "short" })}</small>
      </header>
      <div>
        ${dayPosts
          .map((post) => `<div class="calendar-pill pill-${post.status}">${post.title}</div>`)
          .join("")}
      </div>
    `;
    calendarGrid.appendChild(cell);
  }
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  state.user = data.user;
  state.clients = data.clients;
  if (!state.selectedClientId || !state.clients.some((client) => client.id === state.selectedClientId)) {
    state.selectedClientId = state.user.role === "admin" ? state.clients[0]?.id : state.user.clientId;
  }
  render();
}

async function setPostStatus(postId, status) {
  await api(`/api/posts/${postId}`, { method: "PATCH", body: JSON.stringify({ status }) });
  await loadDashboard();
}

async function addComment(postId, body) {
  await api(`/api/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  await loadDashboard();
}

function renderPosts(client) {
  postsList.innerHTML = "";
  client.posts
    .slice()
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
    .forEach((post) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.innerHTML = `
        <div class="post-head">
          <div>
            <h3>${post.title}</h3>
            <div class="post-meta">${formatDate(post.publishDate)} • ${post.status.replace("_", " ")}</div>
          </div>
          <button class="secondary-btn copy-btn">Copy Post</button>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="status-row">
          <button class="status-btn ${post.status === "draft" ? "active" : ""}" data-status="draft">Draft</button>
          <button class="status-btn ${post.status === "in_review" ? "active" : ""}" data-status="in_review">In Review</button>
          <button class="status-btn ${post.status === "approved" ? "active" : ""}" data-status="approved">Approved</button>
        </div>
        <div class="comment-list">
          ${post.comments
            .map(
              (comment) => `
                <div class="comment">
                  <div class="comment-meta">${comment.authorName} • ${new Date(comment.createdAt).toLocaleString()}</div>
                  <div>${comment.body}</div>
                </div>
              `
            )
            .join("")}
        </div>
        <form class="comment-form">
          <textarea rows="3" placeholder="Add a comment or requested edit"></textarea>
          <button type="submit" class="primary-btn">Add Comment</button>
        </form>
      `;

      card.querySelector(".copy-btn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(post.content);
      });

      card.querySelectorAll(".status-btn").forEach((button) => {
        button.addEventListener("click", () => setPostStatus(post.id, button.dataset.status));
      });

      card.querySelector(".comment-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const textarea = event.currentTarget.querySelector("textarea");
        const body = textarea.value.trim();
        if (!body) return;
        await addComment(post.id, body);
      });

      postsList.appendChild(card);
    });
}

function renderClientOptions() {
  clientSelect.innerHTML = state.clients.map((client) => `<option value="${client.id}">${client.name}</option>`).join("");
  clientSelect.value = state.selectedClientId;
}

function render() {
  if (!state.user) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }

  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  userName.textContent = state.user.name;
  userRole.textContent = state.user.role === "admin" ? "Admin" : "Client";
  adminClientPicker.classList.toggle("hidden", state.user.role !== "admin");
  adminComposer.classList.toggle("hidden", state.user.role !== "admin");
  calendarView.classList.toggle("hidden", state.activeTab !== "calendar");
  postsView.classList.toggle("hidden", state.activeTab !== "posts");
  calendarTab.classList.toggle("active", state.activeTab === "calendar");
  postsTab.classList.toggle("active", state.activeTab === "posts");

  const client = selectedClient();
  if (!client) return;
  clientHeading.textContent = client.name;
  renderClientOptions();
  renderCalendar(client);
  renderPosts(client);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  try {
    const formData = new FormData(loginForm);
    await api("/api/login", { method: "POST", body: JSON.stringify(Object.fromEntries(formData.entries())) });
    loginForm.reset();
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  state.user = null;
  state.clients = [];
  state.selectedClientId = null;
  render();
});

clientSelect.addEventListener("change", () => {
  state.selectedClientId = clientSelect.value;
  render();
});

calendarTab.addEventListener("click", () => {
  state.activeTab = "calendar";
  render();
});

postsTab.addEventListener("click", () => {
  state.activeTab = "posts";
  render();
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = selectedClient();
  if (!client) return;
  const formData = new FormData(postForm);
  const payload = Object.fromEntries(formData.entries());
  payload.clientId = client.id;
  await api("/api/posts", { method: "POST", body: JSON.stringify(payload) });
  postForm.reset();
  await loadDashboard();
});

async function boot() {
  try {
    const session = await api("/api/session");
    if (session.user) {
      await loadDashboard();
    } else {
      render();
    }
  } catch {
    render();
  }
}

boot();
