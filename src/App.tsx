import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Placeholder from './pages/Placeholder'
import Sensitivity from './pages/Sensitivity'

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Placeholder title="Home" />} />
        <Route path="/drills" element={<Placeholder title="Drills" />} />
        <Route path="/routine" element={<Placeholder title="Daily Routine" />} />
        <Route path="/history" element={<Placeholder title="History" />} />
        <Route path="/sensitivity" element={<Sensitivity />} />
      </Routes>
    </>
  )
}