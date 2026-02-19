/**
 * Application Entry Point
 *
 * Renders the React app into the DOM.
 * StrictMode is enabled in development — it double-renders components to
 * surface side effects and deprecated API usage early.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

// mapbox-gl requires a CSS import to render correctly.
// This must be imported before the App component renders the map.
import "mapbox-gl/dist/mapbox-gl.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root element #root not found. Check index.html has <div id='root'>"
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
