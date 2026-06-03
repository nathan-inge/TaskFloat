import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import QuickCapture from './pages/QuickCapture';
import TaskEdit from './pages/TaskEdit';
import ContextsPage from './pages/Contexts';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<QuickCapture />} />
        <Route path="/task/:id/edit" element={<TaskEdit />} />
        <Route path="/contexts" element={<ContextsPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
