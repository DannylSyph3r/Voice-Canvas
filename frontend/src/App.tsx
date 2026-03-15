import { Routes, Route } from 'react-router-dom'
import GalleryPage from './pages/GalleryPage'
import SessionSetupPage from './pages/SessionSetupPage'
import ConversationPage from './pages/ConversationPage'
import CanvasPage from './pages/CanvasPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/session/new" element={<SessionSetupPage />} />
      <Route path="/session/:id/live" element={<ConversationPage />} />
      <Route path="/session/:id/canvas" element={<CanvasPage />} />
    </Routes>
  )
}
