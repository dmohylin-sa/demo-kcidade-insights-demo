import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import Overview from './pages/Overview';
import Courses from './pages/Courses';
import Quizzes from './pages/Quizzes';
import Materials from './pages/Materials';
import Gaps from './pages/Gaps';
import Learners from './pages/Learners';
import Recommendations from './pages/Recommendations';
import Feedback from './pages/Feedback';
import Impact from './pages/Impact';
import Communities from './pages/Communities';
import Readiness from './pages/Readiness';

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/gaps" element={<Gaps />} />
          <Route path="/learners" element={<Learners />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/readiness" element={<Readiness />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
