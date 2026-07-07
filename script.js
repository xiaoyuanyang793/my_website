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
