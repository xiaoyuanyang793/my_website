const supabaseUrl = "https://bbdwqbjqdxwewsyxxlcz.supabase.co";
const supabaseKey = "sb_publishable_Zws8mlLa6I5sgz0_ocIzrA_CPWxYBxc";
const adminInviteKey = "070619";
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
const adminKeyInput = document.querySelector("#adminKeyInput");
const loginStatus = document.querySelector("#loginStatus");
const registerStatus = document.querySelector("#registerStatus");
const showRegisterButton = document.querySelector("#showRegisterButton");
const showLoginButton = document.querySelector("#showLoginButton");
const logoutButton = document.querySelector("#logoutButton");
const modeBanner = document.querySelector("#modeBanner");
const messageForm = document.querySelector("#messageForm");
const nameInput = document.querySelector("#nameInput");
const messageInput = document.querySelector("#messageInput");
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
  return user?.user_metadata?.role === "admin" ? "admin" : "user";
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

  if (currentRole === "admin") {
    modeBanner.innerHTML = `<strong>管理员模式</strong><span>${escapeHtml(currentUser.email)}，可以发布和删除留言。</span>`;
    messageStatus.textContent = "管理员可以发布留言，也可以删除留言。";
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

  loginStatus.textContent = "正在登录...";

  const { error } = await database.auth.signInWithPassword({ email, password });

  if (error) {
    loginStatus.textContent = "登录失败：" + error.message;
    return;
  }

  loginForm.reset();
  loginStatus.textContent = "登录成功。";
  refreshSession();
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

  if (adminKey !== "" && adminKey !== adminInviteKey) {
    registerStatus.textContent = "管理员密钥不正确。留空可以注册为普通用户。";
    return;
  }

  const role = adminKey === adminInviteKey ? "admin" : "user";
  registerStatus.textContent = "正在注册...";

  const { error } = await database.auth.signUp({
    email,
    password,
    options: {
      data: { role }
    }
  });

  if (error) {
    registerStatus.textContent = "注册失败：" + error.message;
    return;
  }

  registerForm.reset();
  loginStatus.textContent = role === "admin"
    ? "管理员账号已注册。请查看邮箱确认邮件，然后登录。"
    : "普通用户账号已注册。请查看邮箱确认邮件，然后登录。";
  showView("login");
}

async function logoutAccount() {
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

showRegisterButton.addEventListener("click", () => {
  registerStatus.textContent = "输入密钥 070619 会注册为管理员；不填则注册为普通用户。";
  showView("register");
});
showLoginButton.addEventListener("click", () => showView("login"));
loginForm.addEventListener("submit", loginAccount);
registerForm.addEventListener("submit", registerAccount);
logoutButton.addEventListener("click", logoutAccount);
messageForm.addEventListener("submit", submitMessage);
messageList.addEventListener("click", (event) => {
  if (!event.target.matches(".delete-message-button")) {
    return;
  }

  deleteMessage(event.target.dataset.messageId);
});

refreshSession();
