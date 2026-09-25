<?php
date_default_timezone_set("Europe/Bratislava");

$shop = "info@jtpneu.sk";
$base = "https://form.jtpneu.sk/send.php";
$allowed = [
  "https://jtpneu.sk",
  "http://jtpneu.sk",
  "https://www.jtpneu.sk",
  "http://www.jtpneu.sk",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: " . $origin);
  header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$action = isset($_GET["action"]) ? (string) $_GET["action"] : "";

if ($_SERVER["REQUEST_METHOD"] === "GET" && ($action === "cancel" || $action === "admin")) {
  jt_handle_cancel($action === "admin" ? "admin" : "customer");
  exit;
}

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "GET") {
  if ($action === "taken") {
    $data = jt_load();
    echo json_encode(["ok" => true, "taken" => jt_taken_map($data["bookings"])]);
    exit;
  }
  echo json_encode(["ok" => true, "ready" => true]);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false]);
  exit;
}

$raw = file_get_contents("php://input");
$payload = json_decode($raw, true);
if (!is_array($payload)) {
  $payload = $_POST;
}

if (!empty($payload["website"]) || !empty($payload["botcheck"])) {
  echo json_encode(["ok" => true, "taken" => []]);
  exit;
}

$booking = jt_normalize($payload);
$errors = jt_validate($booking);
if ($errors) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "invalid"]);
  exit;
}

$created = jt_update(function (&$data) use ($booking) {
  foreach ($data["bookings"] as $row) {
    if (($row["status"] ?? "") !== "active") {
      continue;
    }
    if (($row["dateKey"] ?? "") === $booking["dateKey"] && ($row["time"] ?? "") === $booking["time"]) {
      return ["ok" => false, "error" => "taken"];
    }
  }
  $data["bookings"][] = $booking;
  return ["ok" => true, "booking" => $booking];
});

if (empty($created["ok"])) {
  http_response_code(!empty($created["error"]) && $created["error"] === "taken" ? 409 : 500);
  $data = jt_load();
  echo json_encode([
    "ok" => false,
    "error" => $created["error"] ?? "save",
    "taken" => jt_taken_map($data["bookings"]),
  ]);
  exit;
}

jt_mail_customer($created["booking"]);
jt_mail_shop($created["booking"]);

$data = jt_load();
echo json_encode(["ok" => true, "taken" => jt_taken_map($data["bookings"])]);
exit;

function jt_len($value)
{
  return function_exists("mb_strlen") ? mb_strlen($value, "UTF-8") : strlen($value);
}

function jt_store_path()
{
  return __DIR__ . "/jt-bookings.php";
}

function jt_load()
{
  $path = jt_store_path();
  if (!is_file($path)) {
    return ["bookings" => []];
  }
  if (!defined("JT_BOOK")) {
    define("JT_BOOK", 1);
  }
  $data = include $path;
  if (!is_array($data) || !isset($data["bookings"]) || !is_array($data["bookings"])) {
    return ["bookings" => []];
  }
  return $data;
}

function jt_save($data)
{
  $cutoff = strtotime("-60 days");
  $kept = [];
  foreach ($data["bookings"] as $row) {
    $created = (int) ($row["created"] ?? 0);
    $dateKey = $row["dateKey"] ?? "";
    if ($created && $created < $cutoff && $dateKey < date("Y-m-d", $cutoff)) {
      continue;
    }
    $kept[] = $row;
  }
  $data["bookings"] = $kept;
  $export = var_export($data, true);
  $php = "<?php\nif (!defined('JT_BOOK')) { http_response_code(403); exit; }\nreturn " . $export . ";\n";
  file_put_contents(jt_store_path(), $php, LOCK_EX);
}

function jt_update($mutator)
{
  $lockPath = jt_store_path() . ".lock";
  $lock = fopen($lockPath, "c");
  if (!$lock) {
    return ["ok" => false, "error" => "save"];
  }
  flock($lock, LOCK_EX);
  $data = jt_load();
  $result = $mutator($data);
  if (!empty($result["ok"])) {
    jt_save($data);
  }
  flock($lock, LOCK_UN);
  fclose($lock);
  return $result;
}

function jt_taken_map($bookings)
{
  $out = [];
  $today = date("Y-m-d");
  foreach ($bookings as $row) {
    if (($row["status"] ?? "") !== "active") {
      continue;
    }
    $dateKey = $row["dateKey"] ?? "";
    $time = $row["time"] ?? "";
    if ($dateKey < $today || $time === "") {
      continue;
    }
    $out[$dateKey][] = $time;
  }
  foreach ($out as $dateKey => $times) {
    $out[$dateKey] = array_values(array_unique($times));
  }
  return $out;
}

function jt_weekday($dateKey)
{
  $dow = (int) date("w", strtotime($dateKey . " 12:00:00"));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][$dow];
}

function jt_allowed_times($service, $dateKey)
{
  $weekday = jt_weekday($dateKey);
  if ($weekday === "Sun") {
    return [];
  }
  $isSat = $weekday === "Sat";
  if ($service === "umyvaren") {
    return $isSat ? ["08:00", "09:30", "11:00"] : ["08:00", "09:30", "11:00", "12:30", "14:00", "15:00"];
  }
  $times = [];
  $end = $isSat ? 12 * 60 : 17 * 60;
  for ($minutes = 8 * 60; $minutes + 30 <= $end; $minutes += 30) {
    if ($minutes === 12 * 60) {
      continue;
    }
    $times[] = sprintf("%02d:%02d", intdiv($minutes, 60), $minutes % 60);
  }
  return $times;
}

function jt_normalize($payload)
{
  $service = trim((string) ($payload["service"] ?? "pneuservis"));
  if ($service !== "umyvaren") {
    $service = "pneuservis";
  }
  return [
    "id" => bin2hex(random_bytes(8)),
    "cancel" => bin2hex(random_bytes(16)),
    "admin" => bin2hex(random_bytes(16)),
    "service" => $service,
    "dateKey" => trim((string) ($payload["dateKey"] ?? "")),
    "time" => trim((string) ($payload["time"] ?? "")),
    "name" => trim((string) ($payload["name"] ?? "")),
    "email" => trim((string) ($payload["email"] ?? "")),
    "phone" => trim((string) ($payload["phone"] ?? "")),
    "brand" => trim((string) ($payload["brand"] ?? "")),
    "carType" => trim((string) ($payload["type"] ?? "")),
    "status" => "active",
    "created" => time(),
  ];
}

function jt_validate($booking)
{
  if (jt_len($booking["name"]) < 2 || jt_len($booking["name"]) > 120) {
    return true;
  }
  if (!filter_var($booking["email"], FILTER_VALIDATE_EMAIL)) {
    return true;
  }
  if (jt_len($booking["phone"]) < 6 || jt_len($booking["phone"]) > 40) {
    return true;
  }
  if (jt_len($booking["brand"]) < 2 || jt_len($booking["brand"]) > 80) {
    return true;
  }
  if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $booking["dateKey"])) {
    return true;
  }
  if ($booking["dateKey"] < date("Y-m-d")) {
    return true;
  }
  if (!in_array($booking["time"], jt_allowed_times($booking["service"], $booking["dateKey"]), true)) {
    return true;
  }
  if ($booking["dateKey"] === date("Y-m-d") && $booking["time"] <= date("H:i")) {
    return true;
  }
  if ($booking["service"] === "umyvaren" && !in_array($booking["carType"], ["osobne", "suv", "dodavka"], true)) {
    return true;
  }
  return false;
}

function jt_service_label($service)
{
  return $service === "umyvaren" ? "Ručná autoumyváreň" : "Pneuservis";
}

function jt_car_label($type)
{
  $map = ["osobne" => "Osobné vozidlo", "suv" => "SUV", "dodavka" => "Dodávka"];
  return $map[$type] ?? "";
}

function jt_when_label($booking)
{
  $days = [
    "Sun" => "Nedeľa",
    "Mon" => "Pondelok",
    "Tue" => "Utorok",
    "Wed" => "Streda",
    "Thu" => "Štvrtok",
    "Fri" => "Piatok",
    "Sat" => "Sobota",
  ];
  $weekday = $days[jt_weekday($booking["dateKey"])] ?? "";
  [$y, $m, $d] = explode("-", $booking["dateKey"]);
  $start = $booking["time"];
  if ($booking["service"] === "umyvaren") {
    return jt_service_label($booking["service"]) . " · " . $weekday . " " . (int) $d . ". " . (int) $m . ". " . $y . " · " . $start;
  }
  [$hour, $minute] = array_map("intval", explode(":", $start));
  $end = $hour * 60 + $minute + 30;
  return jt_service_label($booking["service"]) . " · " . $weekday . " " . (int) $d . ". " . (int) $m . ". " . $y . " · " . $start . " – " . sprintf("%02d:%02d", intdiv($end, 60), $end % 60);
}

function jt_h($value)
{
  return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}

function jt_send_mail($to, $subject, $html)
{
  $encoded = "=?UTF-8?B?" . base64_encode($subject) . "?=";
  $headers = implode("\r\n", [
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "From: JT Pneuservis <info@jtpneu.sk>",
    "Reply-To: info@jtpneu.sk",
    "X-Mailer: JT-Pneuservis",
  ]);
  $ok = @mail($to, $encoded, $html, $headers, "-finfo@jtpneu.sk");
  if (!$ok) {
    $ok = @mail($to, $encoded, $html, $headers);
  }
  return $ok;
}

function jt_mail_customer($booking)
{
  global $base;
  $when = jt_h(jt_when_label($booking));
  $link = jt_h($base . "?action=cancel&id=" . rawurlencode($booking["id"]) . "&token=" . rawurlencode($booking["cancel"]));
  $html = '<p>Dobrý deň,</p><p>váš termín v JT Pneuservis &amp; Autoumyváreň je rezervovaný.</p><p><strong>' . $when . '</strong></p><p>Meno: ' . jt_h($booking["name"]) . '<br>Telefón: ' . jt_h($booking["phone"]) . '<br>Značka auta: ' . jt_h($booking["brand"]) . ( $booking["carType"] ? '<br>Typ: ' . jt_h(jt_car_label($booking["carType"])) : "" ) . '</p><p><a href="' . $link . '">Zrušiť termín</a></p><p>JT Pneuservis &amp; Autoumyváreň<br>Šurianska cesta 21.A, 940 01 Nové Zámky<br>+421 918 762 732 · +421 949 134 507</p>';
  jt_send_mail($booking["email"], "Termín je rezervovaný — JT Pneuservis", $html);
}

function jt_mail_shop($booking)
{
  global $base;
  $when = jt_h(jt_when_label($booking));
  $link = jt_h($base . "?action=admin&id=" . rawurlencode($booking["id"]) . "&token=" . rawurlencode($booking["admin"]));
  $html = '<p>Nový termín:</p><p><strong>' . $when . '</strong></p><p>Meno: ' . jt_h($booking["name"]) . '<br>E-mail: ' . jt_h($booking["email"]) . '<br>Telefón: ' . jt_h($booking["phone"]) . '<br>Značka auta: ' . jt_h($booking["brand"]) . ( $booking["carType"] ? '<br>Typ: ' . jt_h(jt_car_label($booking["carType"])) : "" ) . '</p><p><a href="' . $link . '">Zrušiť termín a uvoľniť čas</a></p>';
  jt_send_mail("info@jtpneu.sk", "Nový termín — JT Pneuservis", $html);
}

function jt_page($title, $text)
{
  header("Content-Type: text/html; charset=utf-8");
  echo '<!DOCTYPE html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . jt_h($title) . '</title><style>body{margin:0;font-family:Manrope,system-ui,sans-serif;background:#f4f0e6;color:#161513;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}main{max-width:32rem;background:#fffcf6;border:1px solid rgba(22,21,19,.1);border-radius:24px;padding:2rem}h1{font-family:"Barlow Condensed",Arial Narrow,sans-serif;margin:0 0 .8rem;font-size:2rem}p{margin:0;line-height:1.5;color:#5f5a50}a{color:#c49212}</style></head><body><main><h1>' . jt_h($title) . '</h1><p>' . jt_h($text) . '</p></main></body></html>';
}

function jt_handle_cancel($who)
{
  $id = isset($_GET["id"]) ? (string) $_GET["id"] : "";
  $token = isset($_GET["token"]) ? (string) $_GET["token"] : "";
  if ($id === "" || $token === "") {
    jt_page("Odkaz nie je platný", "Tento odkaz na zrušenie termínu nie je správny.");
    return;
  }
  $result = jt_update(function (&$data) use ($id, $token, $who) {
    foreach ($data["bookings"] as &$row) {
      if (($row["id"] ?? "") !== $id) {
        continue;
      }
      $expected = $who === "admin" ? ($row["admin"] ?? "") : ($row["cancel"] ?? "");
      if ($expected === "" || !hash_equals($expected, $token)) {
        return ["ok" => false, "error" => "token"];
      }
      if (($row["status"] ?? "") !== "active") {
        return ["ok" => true, "already" => true, "booking" => $row, "who" => $who];
      }
      $row["status"] = "cancelled";
      $row["cancelledBy"] = $who;
      $row["cancelledAt"] = time();
      return ["ok" => true, "booking" => $row, "who" => $who];
    }
    unset($row);
    return ["ok" => false, "error" => "missing"];
  });

  if (empty($result["ok"])) {
    jt_page("Odkaz nie je platný", "Tento odkaz na zrušenie termínu nie je správny.");
    return;
  }
  if (!empty($result["already"])) {
    jt_page("Termín je zrušený", "Tento termín už je zrušený. Čas je voľný.");
    return;
  }

  $booking = $result["booking"];
  $when = jt_when_label($booking);
  if ($who === "admin") {
    $html = '<p>Dobrý deň,</p><p>váš termín bol zrušený.</p><p><strong>' . jt_h($when) . '</strong></p><p>Ak chcete iný čas, objednajte sa znova na jtpneu.sk.</p>';
    jt_send_mail($booking["email"], "Termín zrušený — JT Pneuservis", $html);
    jt_page("Termín zrušený", "Termín sme zrušili. Čas je znova voľný.");
    return;
  }
  $html = '<p>Zákazník zrušil termín:</p><p><strong>' . jt_h($when) . '</strong></p><p>Meno: ' . jt_h($booking["name"]) . '<br>E-mail: ' . jt_h($booking["email"]) . '<br>Telefón: ' . jt_h($booking["phone"]) . '</p>';
  jt_send_mail("info@jtpneu.sk", "Termín zrušený zákazníkom — JT Pneuservis", $html);
  jt_page("Termín zrušený", "Váš termín sme zrušili. Čas je znova voľný.");
}
