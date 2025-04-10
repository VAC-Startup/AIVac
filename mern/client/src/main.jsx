import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import App from "./App";
import "./index.css";
import { ScheduleProvider } from "./context/ScheduleContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: 
      <ScheduleProvider>
        <App />
      </ScheduleProvider>,
    children: [],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
