function showMessage() {
  alert("这是我自己改的按钮提示！");
}

function updateProfile() {
  const nameInput = document.querySelector("#nameInput");
  const jobInput = document.querySelector("#jobInput");
  const bioInput = document.querySelector("#bioInput");
  const greetingText = document.querySelector("#greetingText");
  const previewName = document.querySelector("#previewName");
  const previewJob = document.querySelector("#previewJob");
  const previewBio = document.querySelector("#previewBio");

  const name = nameInput.value.trim();
  const job = jobInput.value.trim();
  const bio = bioInput.value.trim();

  if (name === "") {
    greetingText.textContent = "你还没有输入名字哦。";
    return;
  }

  previewName.textContent = name;
  previewJob.textContent = job;
  previewBio.textContent = bio;
  greetingText.textContent = "介绍卡已经更新。";
}

const supabaseUrl = "https://bbdwqbjqdxwewsyxxlcz.supabase.co";
const supabaseKey = "sb_publishable_Zws8mlLa6I5sgz0_ocIzrA_CPWxYBxc";
const database = window.supabase.createClient(supabaseUrl, supabaseKey);

const publicMessageForm = document.querySelector("#publicMessageForm");
const publicNameInput = document.querySelector("#publicNameInput");
const publicMessageInput = document.querySelector("#publicMessageInput");
const publicMessageStatus = document.querySelector("#publicMessageStatus");
const publicMessageList = document.querySelector("#publicMessageList");
const adminAuthForm = document.querySelector("#adminAuthForm");
const adminEmailInput = document.querySelector("#adminEmailInput");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminSignupButton = document.querySelector("#adminSignupButton");
const adminLogoutButton = document.querySelector("#adminLogoutButton");
const adminStatus = document.querySelector("#adminStatus");
let currentAdminUser = null;

async function loadPublicMessages() {
  if (!publicMessageList) {
    return;
  }

  publicMessageList.innerHTML = "<p>正在加载留言...</p>";

  const { data, error } = await database
    .from("messages")
    .select("id, name, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    publicMessageList.innerHTML = "<p>留言加载失败，请稍后再试。</p>";
    return;
  }

  if (data.length === 0) {
    publicMessageList.innerHTML = "<p>还没有留言，来写第一条吧。</p>";
    return;
  }

  publicMessageList.innerHTML = data.map((item) => {
    const time = new Date(item.created_at).toLocaleString("zh-CN");
    const deleteButton = currentAdminUser
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

async function submitPublicMessage(event) {
  event.preventDefault();

  const name = publicNameInput.value.trim();
  const message = publicMessageInput.value.trim();

  if (name === "" || message === "") {
    publicMessageStatus.textContent = "请把名字和留言都填好。";
    return;
  }

  publicMessageStatus.textContent = "正在发送留言...";

  const { error } = await database
    .from("messages")
    .insert({ name, message });

  if (error) {
    publicMessageStatus.textContent = "留言发送失败，请检查数据库权限。";
    return;
  }

  publicMessageForm.reset();
  publicMessageStatus.textContent = "留言已发送，并保存到数据库。";
  loadPublicMessages();
}

async function deletePublicMessage(messageId) {
  if (!currentAdminUser) {
    publicMessageStatus.textContent = "请先以管理员身份登录。";
    return;
  }

  publicMessageStatus.textContent = "正在删除留言...";

  const { error } = await database
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    publicMessageStatus.textContent = "删除失败，请检查 Supabase 删除权限。";
    return;
  }

  publicMessageStatus.textContent = "留言已删除。";
  loadPublicMessages();
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (publicMessageForm) {
  publicMessageForm.addEventListener("submit", submitPublicMessage);
  publicMessageList.addEventListener("click", (event) => {
    if (!event.target.matches(".delete-message-button")) {
      return;
    }

    deletePublicMessage(event.target.dataset.messageId);
  });
  loadPublicMessages();
}

async function refreshAdminStatus() {
  if (!adminStatus) {
    return;
  }

  const { data } = await database.auth.getUser();
  const user = data.user;
  currentAdminUser = user;

  if (user) {
    adminStatus.textContent = "管理员已登录：" + user.email;
    loadPublicMessages();
    return;
  }

  adminStatus.textContent = "当前未登录。";
  loadPublicMessages();
}

async function signupAdmin() {
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();

  if (email === "" || password === "") {
    adminStatus.textContent = "请填写邮箱和密码。";
    return;
  }

  adminStatus.textContent = "正在注册...";

  const { error } = await database.auth.signUp({ email, password });

  if (error) {
    adminStatus.textContent = "注册失败：" + error.message;
    return;
  }

  adminStatus.textContent = "注册成功。请查看邮箱确认邮件，然后再登录。";
}

async function loginAdmin(event) {
  event.preventDefault();

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();

  if (email === "" || password === "") {
    adminStatus.textContent = "请填写邮箱和密码。";
    return;
  }

  adminStatus.textContent = "正在登录...";

  const { error } = await database.auth.signInWithPassword({ email, password });

  if (error) {
    adminStatus.textContent = "登录失败：" + error.message;
    return;
  }

  adminAuthForm.reset();
  refreshAdminStatus();
}

async function logoutAdmin() {
  adminStatus.textContent = "正在退出...";
  await database.auth.signOut();
  refreshAdminStatus();
}

if (adminAuthForm) {
  adminAuthForm.addEventListener("submit", loginAdmin);
  adminSignupButton.addEventListener("click", signupAdmin);
  adminLogoutButton.addEventListener("click", logoutAdmin);
  refreshAdminStatus();
}
