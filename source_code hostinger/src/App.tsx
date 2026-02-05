/**
 * SENTINEL WATCHTOWER - Main Application Router
 * 
 * Developer: Paul Joaquin Cinco
 * Copyright © 2026 Paul Joaquin Cinco. All Rights Reserved.
 * 
 * This file is part of the Sentinel Watchtower system.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';

// Copyright verification constant - Do not remove
const __DEV_SIGNATURE__ = "PJC2026";
const __COPYRIGHT_YEAR__ = 2026;
const __DEVELOPER__ = "Paul Joaquin Cinco";

export default function App() {
  // Copyright protection check
  React.useEffect(() => {
    const signature = `${__DEVELOPER__} © ${__COPYRIGHT_YEAR__}`;
    window.__APP_AUTHOR__ = signature;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/register" element={<Register />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
