<?php
// test-mail-fix.php - тестируем разные варианты отправки
error_reporting(E_ALL);
ini_set('display_errors', 1);

$to = 'info@вашимастера.рус';
$subject = 'Тест ' . date('H:i:s');
$message = 'Тестовое сообщение';
$headers = "From: noreply@вашимастера.рус\r\n";

echo "<h1>Тесты отправки почты</h1>";

// Вариант 1: Стандартный mail()
echo "<h2>Вариант 1: Стандартный mail()</h2>";
$result1 = mail($to, $subject . ' (стандартный)', $message, $headers);
echo "Результат: " . ($result1 ? "✅" : "❌") . "<br>";
echo "Sendmail path: " . ini_get('sendmail_path') . "<br><br>";

// Вариант 2: Сброс sendmail_path
echo "<h2>Вариант 2: Сброс sendmail_path</h2>";
ini_set('sendmail_path', '/usr/sbin/sendmail -t -i');
$result2 = mail($to, $subject . ' (сброс path)', $message, $headers);
echo "Результат: " . ($result2 ? "✅" : "❌") . "<br>";
echo "Новый path: " . ini_get('sendmail_path') . "<br><br>";

// Вариант 3: С параметром -f ( envelope-from )
echo "<h2>Вариант 3: С параметром -f</h2>";
$param = '-f noreply@xn--80abn3a7a8a3b.xn--p1acf';
$result3 = mail($to, $subject . ' (с -f)', $message, $headers, $param);
echo "Результат: " . ($result3 ? "✅" : "❌") . "<br>";
echo "Параметр: " . $param . "<br><br>";

// Вариант 4: Альтернативный envelope-from
echo "<h2>Вариант 4: Альтернативный -f</h2>";
$param4 = '-f webmaster@xn--80abn3a7a8a3b.xn--p1acf';
$result4 = mail($to, $subject . ' (alt -f)', $message, $headers, $param4);
echo "Результат: " . ($result4 ? "✅" : "❌") . "<br><br>";

echo "<hr><h2>Итоги:</h2>";
echo "<table border='1' cellpadding='10'>";
echo "<tr><td>Вариант 1 (стандарт)</td><td>" . ($result1 ? "✅ РАБОТАЕТ" : "❌ НЕТ") . "</td></tr>";
echo "<tr><td>Вариант 2 (сброс path)</td><td>" . ($result2 ? "✅ РАБОТАЕТ" : "❌ НЕТ") . "</td></tr>";
echo "<tr><td>Вариант 3 (с -f)</td><td>" . ($result3 ? "✅ РАБОТАЕТ" : "❌ НЕТ") . "</td></tr>";
echo "<tr><td>Вариант 4 (alt -f)</td><td>" . ($result4 ? "✅ РАБОТАЕТ" : "❌ НЕТ") . "</td></tr>";
echo "</table>";

echo "<h2>Ошибки:</h2>";
print_r(error_get_last());