import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveAnalysis from './pages/LiveAnalysis';
import MultiTimeframe from './pages/MultiTimeframe';
import Scanner from './pages/Scanner';
import Journal from './pages/Journal';
import Analytics from './pages/Analytics';
import Backtest from './pages/Backtest';
import Assistant from './pages/Assistant';
import About from './pages/About';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import HoloAssistant from './components/holo/HoloAssistant';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analysis" element={<LiveAnalysis />} />
          <Route path="mtf" element={<MultiTimeframe />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="journal" element={<Journal />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="backtest" element={<Backtest />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="about" element={<About />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <HoloAssistant />
    </>
  );
}
