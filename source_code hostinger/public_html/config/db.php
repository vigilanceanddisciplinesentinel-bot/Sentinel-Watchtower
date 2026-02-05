<?php
// Database Configuration
// Update these values with your Hostinger database details

$host = 'localhost';
$dbname = 'u123456789_sentinel'; // Example Hostinger DB name
$username = 'u123456789_admin';  // Example Hostinger User
$password = 'YourStrongPassword123!';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // In production, don't echo the error directly to avoid leaking credentials
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
}
?>
