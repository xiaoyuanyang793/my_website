const supabaseUrl = "https://bbdwqbjqdxwewsyxxlcz.supabase.co";
const supabaseKey = "sb_publishable_Zws8mlLa6I5sgz0_ocIzrA_CPWxYBxc";
const database = window.supabase.createClient(supabaseUrl, supabaseKey);

const loginView = document.querySelector("#loginView");
const registerView = document.querySelector("#registerView");
const boardView = document.querySelector("#boardView");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginEmailInput = document.querySelector("#loginEmailInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");
const registerEmailInput = document.querySelector("#registerEmailInput");
const registerPasswordInput = document.querySelector("#registerPasswordInput");
const adminKeyLabel = document.querySelector("#adminKeyLabel");
const adminKeyInput = document.querySelector("#adminKeyInput");
const loginStatus = document.querySelector("#loginStatus");
const registerStatus = document.querySelector("#registerStatus");
const loginSubmitButton = document.querySelector("#loginSubmitButton");
const registerSubmitButton = document.querySelector("#registerSubmitButton");
const showRegisterButton = document.querySelector("#showRegisterButton");
const showAdminKeyButton = document.querySelector("#showAdminKeyButton");
const showLoginButton = document.querySelector("#showLoginButton");
const guestBrowseButton = document.querySelector("#guestBrowseButton");
const logoutButton = document.querySelector("#logoutButton");
const modeBanner = document.querySelector("#modeBanner");
const boardSummary = document.querySelector("#boardSummary");
const messageForm = document.querySelector("#messageForm");
const messageSubmitButton = document.querySelector("#messageSubmitButton");
const nameInput = document.querySelector("#nameInput");
const messageInput = document.querySelector("#messageInput");
const messageCounter = document.querySelector("#messageCounter");
const messageStatus = document.querySelector("#messageStatus");
const messageList = document.querySelector("#messageList");

let currentUser = null;
let currentRole = "guest";

function showView(viewName) {
  loginView.classList.toggle("hidden", viewName !== "login");
  registerView.classList.toggle("hidden", viewName !== "register");
  boardView.classList.toggle("hidden", viewName !== "board");
}

function getUserRole(user) {
  return user?.app_metadata?.role === "admin" ? "admin" : "user";
}

async function refreshSession() {
  const { data } = await database.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    currentRole = "guest";
    showView("login");
    return;
  }

  currentRole = getUserRole(currentUser);
  showView("board");
  renderBoardMode();
  loadMessages();
}

function renderBoardMode() {
  modeBanner.classList.toggle("admin", currentRole === "admin");
  messageForm.classList.toggle("hidden", currentRole === "guest");
  logoutButton.textContent = currentRole === "guest" ? "返回登录" : "退出";

  if (currentRole === "admin") {
    modeBanner.innerHTML = `<strong>管理员模式</strong><span>${escapeHtml(currentUser.email)}，可以发布和删除留言。</span>`;
    messageStatus.textContent = "管理员可以发布留言，也可以删除留言。";
    return;
  }

  if (currentRole === "guest") {
    modeBanner.innerHTML = "<strong>游客预览</strong><span>可以浏览留言。登录后可以发布。</span>";
    messageStatus.textContent = "登录后可以发布留言。";
    return;
  }

  modeBanner.innerHTML = `<strong>用户模式</strong><span>${escapeHtml(currentUser.email)}，可以发布留言。</span>`;
  messageStatus.textContent = "你可以发布留言。";
}

async function loginAccount(event) {
  event.preventDefault();

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();

  if (email === "" || password === "") {
    loginStatus.textContent = "请填写邮箱和密码。";
    return;
  }

  setButtonLoading(loginSubmitButton, true, "登录中...");
  loginStatus.textContent = "正在登录...";

  const { error } = await database.auth.signInWithPassword({ email, password });

  if (error) {
    loginStatus.textContent = translateAuthError(error.message);
    setButtonLoading(loginSubmitButton, false, "登录");
    return;
  }

  loginForm.reset();
  loginStatus.textContent = "登录成功。";
  await claimAdminRoleIfNeeded(email);
  setButtonLoading(loginSubmitButton, false, "登录");
  refreshSession();
}

async function claimAdminRoleIfNeeded(email) {
  const pendingAdminKey = localStorage.getItem("pendingAdminKey:" + email);

  if (!pendingAdminKey) {
    return;
  }

  const { data: sessionData } = await database.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return;
  }

  const response = await fetch("/.netlify/functions/claim-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken
    },
    body: JSON.stringify({ adminKey: pendingAdminKey })
  });

  const result = await response.json();

  if (!response.ok) {
    loginStatus.textContent = "登录成功，但管理员授权失败：" + result.message;
    return;
  }

  localStorage.removeItem("pendingAdminKey:" + email);
  await database.auth.refreshSession();
  loginStatus.textContent = "管理员授权成功。";
}

async function registerAccount(event) {
  event.preventDefault();

  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value.trim();
  const adminKey = adminKeyInput.value.trim();

  if (email === "" || password === "") {
    registerStatus.textContent = "请填写邮箱和密码。";
    return;
  }

  setButtonLoading(registerSubmitButton, true, "注册中...");
  registerStatus.textContent = "正在注册...";

  const { error } = await database.auth.signUp({
    email,
    password
  });

  if (error) {
    registerStatus.textContent = translateAuthError(error.message);
    setButtonLoading(registerSubmitButton, false, "注册");
    return;
  }

  if (adminKey !== "") {
    localStorage.setItem("pendingAdminKey:" + email, adminKey);
  }

  registerForm.reset();
  setButtonLoading(registerSubmitButton, false, "注册");
  loginStatus.textContent = "账号已注册。请先点击邮箱里的确认链接，然后回来登录。";
  showView("login");
}

async function logoutAccount() {
  if (currentRole === "guest") {
    showView("login");
    return;
  }

  await database.auth.signOut();
  currentUser = null;
  currentRole = "guest";
  messageList.innerHTML = "";
  loginStatus.textContent = "已退出，请重新登录。";
  showView("login");
}

async function loadMessages() {
  messageList.innerHTML = "<p>正在加载留言...</p>";

  const { data, error } = await database
    .from("messages")
    .select("id, name, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    boardSummary.textContent = "留言读取失败";
    messageList.innerHTML = "<p>留言加载失败，请稍后再试。</p>";
    return;
  }

  boardSummary.textContent = `当前共有 ${data.length} 条留言`;

  if (data.length === 0) {
    messageList.innerHTML = `<div class="empty-state">还没有留言。登录后写下第一句吧。</div>`;
    return;
  }

  messageList.innerHTML = data.map((item) => {
    const time = formatRelativeTime(item.created_at);
    const deleteButton = currentRole === "admin"
      ? `<button class="delete-message-button" type="button" data-message-id="${item.id}">删除</button>`
      : "";

    return `
      <article class="message-card">
        <div class="message-card-header">
          <h3>${escapeHtml(item.name)}</h3>
          ${deleteButton}
        </div>
        <p>${escapeHtml(item.message)}</p>
        <span class="message-time">${time}</span>
      </article>
    `;
  }).join("");
}

async function submitMessage(event) {
  event.preventDefault();

  if (!currentUser) {
    messageStatus.textContent = "请先登录再发布留言。";
    return;
  }

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (name === "" || message === "") {
    messageStatus.textContent = "请把名称和留言都填好。";
    return;
  }

  setButtonLoading(messageSubmitButton, true, "发布中...");
  messageStatus.textContent = "正在发布留言...";

  const { error } = await database
    .from("messages")
    .insert({ name, message });

  if (error) {
    messageStatus.textContent = "发布失败，请检查数据库权限。";
    setButtonLoading(messageSubmitButton, false, "发布留言");
    return;
  }

  messageForm.reset();
  updateMessageCounter();
  setButtonLoading(messageSubmitButton, false, "发布留言");
  messageStatus.textContent = "留言已发布。";
  loadMessages();
}

async function deleteMessage(messageId) {
  if (currentRole !== "admin") {
    messageStatus.textContent = "只有管理员可以删除留言。";
    return;
  }

  if (!confirm("确定删除这条留言吗？")) {
    return;
  }

  messageStatus.textContent = "正在删除留言...";

  const { error } = await database
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    messageStatus.textContent = "删除失败，请检查 Supabase 删除权限。";
    return;
  }

  messageStatus.textContent = "留言已删除。";
  loadMessages();
}

function showGuestBoard() {
  currentUser = null;
  currentRole = "guest";
  showView("board");
  renderBoardMode();
  loadMessages();
}

function updateMessageCounter() {
  messageCounter.textContent = `${messageInput.value.length} / 240`;
}

function setButtonLoading(button, isLoading, text) {
  button.disabled = isLoading;
  button.textContent = text;
}

function translateAuthError(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确。";
  }

  if (lowerMessage.includes("email not confirmed")) {
    return "请先点击邮箱里的确认链接。";
  }

  if (lowerMessage.includes("password")) {
    return "密码至少需要 6 位。";
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    return "这个邮箱已经注册过。";
  }

  return "操作失败：" + message;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 60) {
    return "刚刚";
  }

  const diffMinutes = Math.round(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  return date.toLocaleString("zh-CN");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

showRegisterButton.addEventListener("click", () => {
  adminKeyLabel.classList.add("hidden");
  adminKeyInput.value = "";
  registerStatus.textContent = "注册后请先完成邮箱确认。";
  showView("register");
});
showAdminKeyButton.addEventListener("click", () => {
  adminKeyLabel.classList.remove("hidden");
  registerStatus.textContent = "管理员请填写授权密钥。普通用户无需填写。";
  adminKeyInput.focus();
});
showLoginButton.addEventListener("click", () => showView("login"));
guestBrowseButton.addEventListener("click", showGuestBoard);
loginForm.addEventListener("submit", loginAccount);
registerForm.addEventListener("submit", registerAccount);
logoutButton.addEventListener("click", logoutAccount);
messageForm.addEventListener("submit", submitMessage);
messageInput.addEventListener("input", updateMessageCounter);
messageList.addEventListener("click", (event) => {
  if (!event.target.matches(".delete-message-button")) {
    return;
  }

  deleteMessage(event.target.dataset.messageId);
});

updateMessageCounter();
refreshSession();
