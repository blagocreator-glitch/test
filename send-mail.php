<?php
/**
 * send-mail.php - Secure mail handler with SMTP support
 * 
 * SECURITY NOTES:
 * - Move SMTP credentials to environment variables in production
 * - Implement rate limiting (Redis/database) for production use
 * - Add reCAPTCHA verification before processing
 */

declare(strict_types=1);

// Compatibility shims for PHP < 8: provide missing helpers if not available
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return strpos($haystack, $needle) === 0;
    }
}
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return strpos($haystack, $needle) !== false;
    }
}

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// ==========================================
// ЗАГРУЗКА .env ФАЙЛА (критически важно!)
// ==========================================

function loadEnv(string $path): void {
    if (!file_exists($path)) {
        error_log("ENV file not found: $path");
        return;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Пропускаем комментарии
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Парсим KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Убираем кавычки если есть
            if (strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) {
                $value = substr($value, 1, -1);
            }
            
            // Устанавливаем в $_ENV и $_SERVER
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Загружаем .env файл
loadEnv(__DIR__ . '/.env');

// ==========================================
// ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ...
// ==========================================

// Create logs directory if not exists
if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

$logFile = __DIR__ . '/logs/mail_debug.log';

/**
 * Debug logging function
 */
function debugLog(string $message, $data = null): void {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= "\n" . print_r($data, true);
    }
    $logMessage .= "\n" . str_repeat('-', 50) . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

debugLog("=== NEW REQUEST ===");

function getClientIp(): string {
    $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded) {
        $candidates = array_map('trim', explode(',', $forwarded));
        foreach ($candidates as $candidate) {
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
    }
    return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : 'unknown';
}

$clientIp = getClientIp();
debugLog("IP: " . $clientIp);

// Проверяем что переменные загружены
debugLog("ENV check", [
    'SMTP_HOST' => $_ENV['SMTP_HOST'] ?? 'NOT SET',
    'SMTP_USERNAME' => !empty($_ENV['SMTP_USERNAME']) ? 'SET (hidden)' : 'NOT SET',
    'TELEGRAM_BOT_TOKEN' => !empty($_ENV['TELEGRAM_BOT_TOKEN']) ? 'SET (hidden)' : 'NOT SET'
]);

// CORS headers
header('Content-Type: application/json; charset=utf-8');
$allowedOrigins = array_filter(array_map('trim', explode(',', $_ENV['ALLOWED_ORIGINS'] ?? 'https://вашимастера.рус,https://xn--80abn3a7a8a3b.xn--p1acf')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} elseif (!$origin) {
    header('Access-Control-Allow-Origin: https://вашимастера.рус');
} else {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Origin not allowed']);
    exit;
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get and validate JSON input
$rawInput = file_get_contents('php://input');
debugLog("RAW INPUT length", strlen((string)$rawInput));

$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Validation
$errors = [];
if (empty($data['name']) || strlen(trim($data['name'])) < 2) {
    $errors[] = 'Name is required (min 2 chars)';
}
if (empty($data['phone']) || !preg_match('/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/', $data['phone'])) {
    $errors[] = 'Valid phone is required';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Validation failed', 'details' => $errors]);
    exit;
}

// Sanitize inputs
$name = htmlspecialchars(trim($data['name']), ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars(trim($data['phone']), ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars(trim($data['service'] ?? 'Not specified'), ENT_QUOTES, 'UTF-8');
$comment = htmlspecialchars(trim($data['comment'] ?? 'None'), ENT_QUOTES, 'UTF-8');
$date = htmlspecialchars(trim($data['date'] ?? date('d.m.Y H:i')), ENT_QUOTES, 'UTF-8');
$ip = $clientIp;
$userAgent = htmlspecialchars(substr($data['userAgent'] ?? 'Unknown', 0, 200), ENT_QUOTES, 'UTF-8');

// Rate limiting check - improved implementation
$rateLimitFile = __DIR__ . '/logs/rate_limit_' . md5($ip) . '.txt';
$rateLimitWindow = 60; // seconds
$maxRequests = 3;

$rateLimitPassed = true;
$rateLimitMessage = '';

if (file_exists($rateLimitFile)) {
    $fileContent = file_get_contents($rateLimitFile);
    if ($fileContent !== false) {
        $requests = array_filter(
            explode("\n", trim($fileContent)),
            function($timestamp) use ($rateLimitWindow) {
                return !empty($timestamp) && (time() - (int)$timestamp) < $rateLimitWindow;
            }
        );
        
        if (count($requests) >= $maxRequests) {
            $rateLimitPassed = false;
            $oldestRequest = min(array_map('intval', $requests));
            $waitTime = $rateLimitWindow - (time() - $oldestRequest);
            $rateLimitMessage = "Too many requests. Please wait " . ceil($waitTime) . " seconds.";
        } else {
            $requests[] = time();
            file_put_contents($rateLimitFile, implode("\n", $requests), LOCK_EX);
        }
    }
} else {
    @file_put_contents($rateLimitFile, (string)time(), LOCK_EX);
}

if (!$rateLimitPassed) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => $rateLimitMessage]);
    exit;
}

// ==================== SMTP CONFIGURATION ====================
// Теперь берём из $_ENV которые загружены из .env

$smtpConfig = [
    'host' => $_ENV['SMTP_HOST'] ?? 'smtp.yandex.ru',
    'port' => (int)($_ENV['SMTP_PORT'] ?? 465),
    'username' => $_ENV['SMTP_USERNAME'] ?? '',
    'password' => $_ENV['SMTP_PASSWORD'] ?? '',
    'from' => $_ENV['SMTP_FROM'] ?? $_ENV['SMTP_USERNAME'] ?? '',
    'to' => $_ENV['SMTP_TO'] ?? '',
    'encryption' => 'ssl'
];

// Validate config - проверяем что данные реальные, не заглушки
if (empty($smtpConfig['password']) || 
    empty($smtpConfig['username']) || 
    strpos($smtpConfig['password'], 'YOUR_') !== false) {
    
    debugLog("SMTP: Credentials not configured properly", [
        'username_empty' => empty($smtpConfig['username']),
        'password_empty' => empty($smtpConfig['password'])
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server configuration error',
        'message' => 'SMTP not configured. Check .env file exists and readable.'
    ]);
    exit;
}

debugLog("SMTP Config loaded", [
    'host' => $smtpConfig['host'],
    'port' => $smtpConfig['port'],
    'username' => !empty($smtpConfig['username']) ? 'SET (hidden)' : 'NOT SET',
    'to' => !empty($smtpConfig['to']) ? 'SET (hidden)' : 'NOT SET'
]);

// Send via SMTP
$result = sendViaSMTP($smtpConfig, $name, $phone, $service, $comment, $date, $ip, $userAgent);
debugLog("SMTP RESULT", $result);

// Also send to Telegram as backup (optional)
$telegramToken = $_ENV['TELEGRAM_BOT_TOKEN'] ?? '';
$telegramChatId = $_ENV['TELEGRAM_CHAT_ID'] ?? '';

if (!empty($telegramToken) && !empty($telegramChatId) && strpos($telegramToken, 'YOUR_') === false) {
    debugLog("Sending to Telegram...");
    $tgResult = sendToTelegram($telegramToken, $telegramChatId, $name, $phone, $service, $comment, $date);
    debugLog("Telegram result", $tgResult);
    $result['telegram'] = $tgResult;
} else {
    debugLog("Telegram skipped - not configured");
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// ==================== SMTP FUNCTIONS ====================

/**
 * Send email via SMTP with authentication and retry logic
 */
function sendViaSMTP(array $config, string $name, string $phone, string $service, string $comment, string $date, string $ip, string $userAgent): array {
    $host = $config['host'];
    $port = $config['port'];
    $username = $config['username'];
    $password = $config['password'];
    $from = $config['from'];
    $to = $config['to'];
    
    $maxRetries = 2;
    $retryDelay = 1;
    
    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        debugLog("SMTP connection attempt $attempt/$maxRetries to $host:$port");
        
        // Create SSL connection
        $socket = @fsockopen("ssl://$host", $port, $errno, $errstr, 15);
        
        if (!$socket) {
            $errorMsg = "Connection failed: $errstr ($errno)";
            debugLog("Attempt $attempt failed", $errorMsg);
            
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2; // exponential backoff
                continue;
            }
            
            return ['success' => false, 'error' => 'Could not connect to mail server. Please try again later.'];
        }
        
        stream_set_timeout($socket, 10);
        
        // Read greeting
        $response = readSMTPResponse($socket);
        debugLog("SMTP greeting", $response);
        
        if (!str_starts_with($response, '220')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Server error: ' . $response];
        }
        
        // EHLO
        $response = sendSMTPCommand($socket, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        debugLog("EHLO response", $response);
        
        if (!str_contains($response, '250 ')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Handshake failed'];
        }
        
        // AUTH LOGIN
        $response = sendSMTPCommand($socket, "AUTH LOGIN");
        debugLog("AUTH LOGIN", $response);
        
        if (!str_starts_with($response, '334')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Auth not supported'];
        }
        
        // Send credentials
        $response = sendSMTPCommand($socket, base64_encode($username));
        debugLog("Username response", substr($response, 0, 50));
        
        if (!str_starts_with($response, '334')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Invalid username'];
        }
        
        $response = sendSMTPCommand($socket, base64_encode($password));
        debugLog("Password response", substr($response, 0, 50));
        
        if (!str_starts_with($response, '235')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Authentication failed. Check SMTP credentials in .env file.'];
        }
        
        // Send envelope
        $response = sendSMTPCommand($socket, "MAIL FROM: <$from>");
        if (!str_starts_with($response, '250')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Sender rejected'];
        }
        
        $response = sendSMTPCommand($socket, "RCPT TO: <$to>");
        if (!str_starts_with($response, '250')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Recipient rejected'];
        }
        
        // Send data
        $response = sendSMTPCommand($socket, "DATA");
        if (!str_starts_with($response, '354')) {
            fclose($socket);
            if ($attempt < $maxRetries) {
                sleep($retryDelay);
                $retryDelay *= 2;
                continue;
            }
            return ['success' => false, 'error' => 'Data not accepted'];
        }
        
        // Build message
        $subject = '=?UTF-8?B?' . base64_encode('🔔 Новая заявка с сайта вашимастера.рус') . '?=';
        $boundary = uniqid('boundary_', true);
        
        $headers = "Subject: $subject\r\n";
        $headers .= "From: =?UTF-8?B?" . base64_encode('Ваши Мастера') . "?= <$from>\r\n";
        $headers .= "To: <$to>\r\n";
        $headers .= "Reply-To: <$from>\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "X-Originating-IP: $ip\r\n";
        
        $textBody = "Новая заявка с сайта\n\nИмя: $name\nТелефон: $phone\nУслуга: $service\nКомментарий: $comment\nДата: $date\nIP: $ip";
        $htmlBody = buildHTML($name, $phone, $service, $comment, $date, $ip, $userAgent);
        
        $message = "--$boundary\r\n";
        $message .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
        $message .= $textBody . "\r\n\r\n";
        $message .= "--$boundary\r\n";
        $message .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        $message .= $htmlBody . "\r\n\r\n";
        $message .= "--$boundary--\r\n";
        
        $email = $headers . "\r\n" . $message . "\r\n.\r\n";
        
        fputs($socket, $email);
        $response = readSMTPResponse($socket);
        debugLog("DATA sent", substr($response, 0, 100));
        
        // Quit
        sendSMTPCommand($socket, "QUIT");
        fclose($socket);
        
        if (str_starts_with($response, '250')) {
            debugLog("Email sent successfully on attempt $attempt");
            return ['success' => true, 'message' => 'Email sent successfully'];
        }
        
        // Message rejected, retry if attempts left
        debugLog("Message rejected on attempt $attempt", $response);
        if ($attempt < $maxRetries) {
            sleep($retryDelay);
            $retryDelay *= 2;
            continue;
        }
        
        return ['success' => false, 'error' => 'Message rejected. Please try again later.'];
    }
    
    return ['success' => false, 'error' => 'Email delivery failed after multiple attempts.'];
}

/**
 * Send SMTP command and read response
 */
function sendSMTPCommand($socket, string $command): string {
    fputs($socket, $command . "\r\n");
    return readSMTPResponse($socket);
}

/**
 * Read multi-line SMTP response
 */
function readSMTPResponse($socket): string {
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 515);
        $response .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }
    return trim($response);
}

/**
 * Build HTML email template
 */
function buildHTML(string $name, string $phone, string $service, string $comment, string $date, string $ip, string $userAgent): string {
    return "<!DOCTYPE html>
<html lang='ru'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Новая заявка</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; color: #000; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .field { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .field:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px; }
        .value { font-size: 16px; color: #333; line-height: 1.5; }
        .phone { font-size: 20px; color: #B8860B; font-weight: 700; }
        .comment-box { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #FFD700; font-style: italic; }
        .meta { background: #f0f0f0; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #666; }
        .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🔔 Новая заявка с сайта</h1>
            <p style='margin: 10px 0 0; opacity: 0.8;'>вашимастера.рус</p>
        </div>
        <div class='content'>
            <div class='field'>
                <div class='label'>👤 Имя клиента</div>
                <div class='value'>{$name}</div>
            </div>
            <div class='field'>
                <div class='label'>📞 Телефон для связи</div>
                <div class='value phone'>{$phone}</div>
                <a href='tel:" . preg_replace('/\D/', '', $phone) . "' class='button'>Позвонить</a>
            </div>
            <div class='field'>
                <div class='label'>🔧 Тип услуги</div>
                <div class='value'>{$service}</div>
            </div>
            <div class='field'>
                <div class='label'>💬 Комментарий</div>
                <div class='comment-box'>" . nl2br($comment) . "</div>
            </div>
            <div class='field'>
                <div class='label'>📅 Дата и время заявки</div>
                <div class='value'>{$date}</div>
            </div>
            <div class='meta'>
                <strong>Техническая информация:</strong><br>
                IP: {$ip}<br>
                User-Agent: " . htmlspecialchars(substr($userAgent, 0, 100)) . "
            </div>
        </div>
        <div class='footer'>
            <p>ООО «Система софт 360» | вашимастера.рус</p>
            <p style='margin-top: 10px; opacity: 0.7;'>Это письмо отправлено автоматически</p>
        </div>
    </div>
</body>
</html>";
}

/**
 * Send notification to Telegram as backup
 */
function sendToTelegram(string $botToken, string $chatId, string $name, string $phone, string $service, string $comment, string $date): array {
    $message = "🔔 <b>НОВАЯ ЗАЯВКА</b>\n\n";
    $message .= "👤 <b>Имя:</b> {$name}\n";
    $message .= "📞 <b>Телефон:</b> {$phone}\n";
    $message .= "🔧 <b>Услуга:</b> {$service}\n";
    $message .= "💬 <b>Комментарий:</b> {$comment}\n";
    $message .= "📅 <b>Дата:</b> {$date}\n\n";
    $message .= "🌐 вашимастера.рус";
    
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'HTML'
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return ['success' => false, 'error' => $error];
    }
    
    $result = json_decode($response, true);
    
    if ($httpCode === 200 && ($result['ok'] ?? false)) {
        return ['success' => true];
    }
    
    return ['success' => false, 'error' => $result['description'] ?? 'Unknown error'];
}
