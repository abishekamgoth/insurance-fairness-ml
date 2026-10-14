import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import Evaluation from './pages/Evaluation';
import Explainability from './pages/Explainability';
import Fairness from './pages/Fairness';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ paddingTop: '64px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/explain" element={<Explainability />} />
          <Route path="/fairness" element={<Fairness />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
