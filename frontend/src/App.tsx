import './App.css'
import { GlazeParameterForm } from './components/GlazeParameterForm'
import { PreviewModal } from './components/PreviewModal'
import { RecipeResultsPanel } from './components/RecipeResultsPanel'
import { useGlazeComposer } from './hooks/useGlazeComposer'

function App() {
  const composer = useGlazeComposer()

  return (
    <main className="page-shell">
      <section className="intro-card">
        <p className="badge">Studio Lab</p>
        <h1>Ceramic Glaze Composer</h1>
        <p className="subtitle">
          Blend color, firing range, finish, and effects to draft candidate glaze recipes.
          Percentages are generated for exploration and should be test-fired before production use.
        </p>
      </section>

      <section className="content-grid">
        <GlazeParameterForm composer={composer} />
        <RecipeResultsPanel composer={composer} />
      </section>

      <PreviewModal composer={composer} />
    </main>
  )
}

export default App