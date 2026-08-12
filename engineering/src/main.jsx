import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EngineeringApp } from "./EngineeringApp.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EngineeringApp />
  </StrictMode>,
);
