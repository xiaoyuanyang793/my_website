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

  const authorization = event.headers.authorization || event.headers.Authorization || "";
  const token = authorization.replace("Bearer ", "");

  if (!token) {
    return response(401, { message: "请先登录。" });
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { message: "请求内容格式不正确。" });
  }

  const submittedAdminKey = String(body.adminKey || "").trim();

  if (submittedAdminKey !== adminInviteKey) {
    return response(403, { message: "管理员密钥不正确。" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: userData, error: getUserError } = await supabase.auth.getUser(token);

  if (getUserError || !userData.user) {
    return response(401, { message: "登录状态无效。" });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userData.user.id,
    { app_metadata: { role: "admin" } }
  );

  if (updateError) {
    return response(400, { message: updateError.message });
  }

  return response(200, { role: "admin" });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
