import { Routes, Route } from 'react-router-dom'
import ConversationPage from './pages/ConversationPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ConversationPage />} />
    </Routes>
  )
}
