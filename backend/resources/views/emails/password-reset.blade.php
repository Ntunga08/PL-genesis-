<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .logo { font-size: 22px; font-weight: bold; color: #1a56db; margin-bottom: 24px; }
        h2 { color: #111; margin-top: 0; }
        p { color: #444; line-height: 1.6; }
        .btn { display: inline-block; background: #1a56db; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; margin: 20px 0; }
        .note { font-size: 13px; color: #888; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏥 {{ config('app.name') }}</div>
        <h2>Reset Your Password</h2>
        <p>Hi {{ $user->name }},</p>
        <p>We received a request to reset your password. Click the button below to set a new one:</p>
        <a href="{{ $reset_url }}" class="btn">Reset Password</a>
        <p>This link expires at <strong>{{ $expires_at->format('H:i, d M Y') }}</strong>.</p>
        <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <div class="note">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <code>{{ $reset_url }}</code>
        </div>
    </div>
</body>
</html>
