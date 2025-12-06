import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { CoreProviders } from "./providers";

// Track app start time for first paint optimizations
(window as any).__appStartTime = Date.now();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <CoreProviders>
      <App />
    </CoreProviders>
  </BrowserRouter>
);