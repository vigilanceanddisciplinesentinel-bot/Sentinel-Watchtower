<?php
header('Content-Type: application/json');
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// Basic validation
if (empty($data['student_id']) || empty($data['issuer_id']) || empty($data['offense'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO infractions (student_id, issuer_id, type, offense, points, description, date_issued) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $stmt->execute([
        $data['student_id'],
        $data['issuer_id'],
        $data['type'] ?? 'minor',
        $data['offense'],
        $data['points'] ?? 1,
        $data['description'] ?? ''
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to issue infraction: ' . $e->getMessage()]);
}
?>
