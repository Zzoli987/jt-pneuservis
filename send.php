<?php
header("Content-Type: application/json; charset=utf-8");

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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false]);
  exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) {
  $data = $_POST;
}

if (!empty($data["website"]) || !empty($data["botcheck"])) {
  echo json_encode(["ok" => true]);
  exit;
}

$name = trim((string) ($data["name"] ?? ""));
$email = trim((string) ($data["email"] ?? ""));
$phone = trim((string) ($data["phone"] ?? ""));
$message = trim((string) ($data["message"] ?? ""));

if (
  mb_strlen($name) < 2 ||
  mb_strlen($name) > 120 ||
  !filter_var($email, FILTER_VALIDATE_EMAIL) ||
  mb_strlen($phone) < 6 ||
  mb_strlen($phone) > 40 ||
  mb_strlen($message) < 10 ||
  mb_strlen($message) > 4000
) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "invalid"]);
  exit;
}

$shop = "info@jtpneu.sk";
$subject = "=?UTF-8?B?" . base64_encode("Potvrdenie dopytu — JT Pneuservis") . "?=";
$body = implode("\n", [
  "Dobrý deň,",
  "",
  "ďakujeme za dopyt na termín v JT Pneuservis & Autoumyváreň.",
  "Vašu žiadosť sme prijali. Termín ešte potvrdíme telefonicky alebo na WhatsApp.",
  "",
  "---",
  $message,
  "---",
  "",
  "JT Pneuservis & Autoumyváreň",
  "Šurianska cesta 21.A, 940 01 Nové Zámky",
  "+421 918 762 732 · +421 949 134 507",
  $shop,
  "Po–Pia 08:00–17:00, So 08:00–12:00",
]);

$headers = implode("\r\n", [
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8",
  "From: JT Pneuservis <" . $shop . ">",
  "Reply-To: " . $shop,
  "X-Mailer: JT-Pneuservis",
]);

$sent = @mail($email, $subject, $body, $headers, "-f" . $shop);
if (!$sent) {
  $sent = @mail($email, $subject, $body, $headers);
}

echo json_encode(["ok" => (bool) $sent]);
