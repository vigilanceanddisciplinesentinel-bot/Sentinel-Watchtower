<?php
require_once '../config/db.php';

header('Content-Type: application/json');

// 1. Check Auth (Basic Session Check)
session_start();
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['adviser', 'prefect', 'developer'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'stats') {
        // Get basic stats
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM infractions");
        $totalInfractions = $stmt->fetch()['total'];

        $stmt = $pdo->query("SELECT COUNT(*) as pending FROM infractions WHERE resolved = 0");
        $pendingInfractions = $stmt->fetch()['pending'];

        echo json_encode([
            'total_infractions' => $totalInfractions,
            'pending_infractions' => $pendingInfractions
        ]);

    } elseif ($action === 'recent_infractions') {
        // Get recent infractions with names
        $sql = "SELECT 
                    i.id, 
                    i.offense, 
                    i.points, 
                    i.date_issued, 
                    i.resolved,
                    s.full_name as student_name,
                    iss.full_name as issuer_name
                FROM infractions i
                JOIN users s ON i.student_id = s.id
                JOIN users iss ON i.issuer_id = iss.id
                ORDER BY i.date_issued DESC
                LIMIT 50";
        
        $stmt = $pdo->query($sql);
        $infractions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['infractions' => $infractions]);

    } else {
        echo json_encode(['message' => 'Welcome Admin ' . $_SESSION['full_name']]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
