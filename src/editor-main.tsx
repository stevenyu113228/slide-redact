import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DialogEditor } from "./taskpane/DialogEditor";
import "./styles.css";

Office.onReady(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <DialogEditor />
    </StrictMode>
  );
});
