import "virtual:uno.css";
import "@tps/ui/styles";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { dbReady } from "./db-bootstrap";

void dbReady
  .then(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] DB init failed:', err);
    // 即使 DB 初始化失败也让 React 挂载，Login 页仍可渲染
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });