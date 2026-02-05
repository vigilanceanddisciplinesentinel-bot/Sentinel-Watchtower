import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * SENTINEL WATCHTOWER - School Disciplinary Tracking System
 * Developed & Engineered by Paul Joaquin Cinco
 * Copyright © 2026 Paul Joaquin Cinco. All Rights Reserved.
 * 
 * NOTICE: This software is proprietary and confidential.
 * Unauthorized copying, modification, distribution, or use
 * of this software, via any medium, is strictly prohibited.
 * 
 * Developer: Paul Joaquin Cinco
 * Project: Sentinel Watchtower
 * Year: 2026
 */

// Copyright protection - Do not remove
const _AUTHOR = "Paul Joaquin Cinco";
const _COPYRIGHT = "© 2026 Paul Joaquin Cinco";
const _PROJECT = "Sentinel Watchtower";

// Console signature
console.log(
  "%c🛡️ SENTINEL WATCHTOWER",
  "color: #2563eb; font-size: 16px; font-weight: bold;"
);
console.log(
  "%cDeveloped & Engineered by Paul Joaquin Cinco",
  "color: #475569; font-size: 12px;"
);
console.log(
  "%c© 2026 All Rights Reserved",
  "color: #94a3b8; font-size: 10px;"
);
console.log(
  "%c⚠️ Unauthorized use is prohibited",
  "color: #ef4444; font-size: 10px; font-weight: bold;"
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
