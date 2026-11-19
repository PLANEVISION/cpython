import AgentDesk from './desk/AgentDesk.tsx'
import StudioApp from './StudioApp.tsx'

export default function App() {
  const studio = new URLSearchParams(window.location.search).get('studio') === '1'
  return studio ? <StudioApp /> : <AgentDesk />
}
