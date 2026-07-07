const { createClient } = require("@supabase/supabase-js");

const headers = {
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "只支持 POST 请求。" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminInviteKey = process.env.ADMIN_INVITE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !adminInviteKey) {
    return response(500, { message: "后端环境变量还没有配置完整。" });
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { message: "请求内容格式不正确。" });
  }

  const email = String(body.email || "").trim();
  const password = String(body.password || "").trim();
  const submittedAdminKey = String(body.adminKey || "").trim();

  if (!email || !password) {
    return response(400, { message: "请填写邮箱和密码。" });
  }

  if (password.length < 6) {
    return response(400, { message: "密码至少需要 6 位。" });
  }

  if (submittedAdminKey && submittedAdminKey !== adminInviteKey) {
    return response(403, { message: "管理员密钥不正确。留空可以注册为普通用户。" });
  }

  const role = submittedAdminKey === adminInviteKey ? "admin" : "user";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role }
  });

  if (error) {
    return response(400, { message: error.message });
  }

  return response(200, { role });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
