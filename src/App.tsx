import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import FidgetClickerEditor from "./pages/FidgetClickerEditor";
import KeycapEditor from "./pages/KeycapEditor";
import AdminDashboard from "./pages/AdminDashboard";
import AuthGuard from "./components/AuthGuard";
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />

                <Route
                    path="/editor/fidget-clicker"
                    element={<FidgetClickerEditor />}
                />
                <Route path="/editor/keycap-maker" element={<KeycapEditor />} />
                <Route path="/editor/:id" element={<Editor />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
