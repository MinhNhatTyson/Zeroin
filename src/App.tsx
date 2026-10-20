import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Placeholder from './pages/Placeholder'
import Sensitivity from './pages/Sensitivity'
import Drills from './pages/Drills'
import FlickDrill from './pages/FlickDrill'
import History from './pages/History'
import TrackingDrill from './pages/TrackingDrill'

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Placeholder title="Home" />} />
        <Route path="/drills" element={<Drills />} />
        <Route path="/drills/flick" element={<FlickDrill />} />
        <Route path="/drills/tracking" element={<TrackingDrill />} />
        <Route path="/routine" element={<Placeholder title="Daily Routine" />} />
        <Route path="/history" element={<History />} />
        <Route path="/sensitivity" element={<Sensitivity />} />
      </Routes>
    </>
  )
}