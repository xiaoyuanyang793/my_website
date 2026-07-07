const supabaseUrl = "https://bbdwqbjqdxwewsyxxlcz.supabase.co";
const supabaseKey = "sb_publishable_Zws8mlLa6I5sgz0_ocIzrA_CPWxYBxc";
const adminInviteKey = "070619";
const database = window.supabase.createClient(supabaseUrl, supabaseKey);

const loginTabButton = document.querySelector("#loginTabButton");
const registerTabButton = document.querySelector("#registerTabButton");
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const adminKeyLabel = document.querySelector("#adminKeyLabel");
const adminKeyInput = document.querySelector("#adminKeyInput");
const authSubmitButton = document.querySelector("#authSubmitButton");
const logoutButton = document.querySelector("#logoutButton");
const authStatus = document.querySelector("#authStatus");
const modeBanner = document.querySelector("#modeBanner");
const messageForm = document.querySelector("#messageForm");
const nameInput = document.querySelector("#nameInput");
const messageInput = document.querySelector("#messageInput");
const messageStatus = document.querySelector("#messageStatus");
const messageList = document.querySelector("#messageList");

let authMode = "login";
let currentUser = null;
let currentRole = "guest";

function setAuthMode(mode) {
  authMode = mode;
  const isRegisterMode = mode === "register";

  loginTabButton.classList.toggle("active", !isRegisterMode);
  registerTabButton.classList.toggle("active", isRegisterMode);
  adminKeyLabel.classList.toggle("hidden", !isRegisterMode);
  authSubmitButton.textContent = isRegisterMode ? "注册" : "登录";
  authStatus.textContent = isRegisterMode
    ? "输入管理员密钥 070619 会注册为管理员；不填则注册为普通用户。"
    : "输入邮箱和密码登录。";
}

function getUserRole(user) {
  return user?.user_metadata?.role === "admin" ? "admin" : "user";
}

async function refreshSession() {
  const { data } = await database.auth.getUser();
  currentUser = data.user;
  currentRole = currentUser ? getUserRole(currentUser) : "guest";
  renderMode();
  loadMessages();
}

function renderMode() {
  modeBanner.classList.toggle("admin", currentRole === "admin");

  if (currentRole === "admin") {
    authStatus.textContent = "管理员已登录：" + currentUser.email;
    modeBanner.innerHTML = "<strong>管理员模式</strong><span>可以发布和删除留言。</span>";
    messageStatus.textContent = "管理员可以发布留言，也可以删除留言。";
    return;
  }

  if (currentRole === "user") {
    authStatus.textContent = "用户已登录：" + currentUser.email;
    modeBanner.innerHTML = "<strong>用户模式</strong><span>可以发布留言，不能删除留言。</span>";
    messageStatus.textContent = "你可以发布留言。";
    return;
  }

  authStatus.textContent = "当前未登录。";
  modeBanner.innerHTML = "<strong>游客模式</strong><span>可以浏览留言。登录后可以发布留言。</span>";
  messageStatus.textContent = "登录后可以发布留言。";
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (email === "" || password === "") {
    authStatus.textContent = "请填写邮箱和密码。";
    return;
  }

  if (authMode === "register") {
    await registerAccount(email, password);
    return;
  }

  await loginAccount(email, password);
}

async function registerAccount(email, password) {
  const adminKey = adminKeyInput.value.trim();
  const role = adminKey === adminInviteKey ? "admin" : "user";

  if (adminKey !== "" && adminKey !== adminInviteKey) {
    authStatus.textContent = "管理员密钥不正确。留空可以注册为普通用户。";
    return;
  }

  authStatus.textContent = "正在注册...";

  const { error } = await database.auth.signUp({
    email,
    password,
    options: {
      data: { role }
    }
  });

  if (error) {
    authStatus.textContent = "注册失败：" + error.message;
    return;
  }

  authForm.reset();
  authStatus.textContent = role === "admin"
    ? "管理员账号已注册。请查看邮箱确认邮件，然后登录。"
    : "普通用户账号已注册。请查看邮箱确认邮件，然后登录。";
  setAuthMode("login");
}

async function loginAccount(email, password) {
  authStatus.textContent = "正在登录...";

  const { error } = await database.auth.signInWithPassword({ email, password });

  if (error) {
    authStatus.textContent = "登录失败：" + error.message;
    return;
  }

  authForm.reset();
  refreshSession();
}

async function logoutAccount() {
  authStatus.textContent = "正在退出...";
  await database.auth.signOut();
  currentUser = null;
  currentRole = "guest";
  renderMode();
  loadMessages();
}

async function loadMessages() {
  messageList.innerHTML = "<p>正在加载留言...</p>";

  const { data, error } = await database
    .from("messages")
    .select("id, name, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    messageList.innerHTML = "<p>留言加载失败，请稍后再试。</p>";
    return;
  }

  if (data.length === 0) {
    messageList.innerHTML = "<p>还没有留言，来写第一条吧。</p>";
    return;
  }

  messageList.innerHTML = data.map((item) => {
    const time = new Date(item.created_at).toLocaleString("zh-CN");
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

  messageStatus.textContent = "正在发布留言...";

  const { error } = await database
    .from("messages")
    .insert({ name, message });

  if (error) {
    messageStatus.textContent = "发布失败，请检查数据库权限。";
    return;
  }

  messageForm.reset();
  messageStatus.textContent = "留言已发布。";
  loadMessages();
}

async function deleteMessage(messageId) {
  if (currentRole !== "admin") {
    messageStatus.textContent = "只有管理员可以删除留言。";
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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loginTabButton.addEventListener("click", () => setAuthMode("login"));
registerTabButton.addEventListener("click", () => setAuthMode("register"));
authForm.addEventListener("submit", handleAuthSubmit);
logoutButton.addEventListener("click", logoutAccount);
messageForm.addEventListener("submit", submitMessage);
messageList.addEventListener("click", (event) => {
  if (!event.target.matches(".delete-message-button")) {
    return;
  }

  deleteMessage(event.target.dataset.messageId);
});

setAuthMode("login");
refreshSession();
