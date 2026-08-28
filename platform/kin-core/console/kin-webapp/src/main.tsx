import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./style.css";

const router = import.meta.env.VITE_KIN_HASH_ROUTER === "1"
  ? <HashRouter><App /></HashRouter>
  : <BrowserRouter basename={import.meta.env.BASE_URL}><App /></BrowserRouter>;

createRoot(document.getElementById("root")!).render(<StrictMode>{router}</StrictMode>);
