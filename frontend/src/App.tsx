import './App.css'
import { GlazeParameterForm } from './components/GlazeParameterForm'
import { RecipeResultsPanel } from './components/RecipeResultsPanel'
import { useGlazeComposer } from './hooks/useGlazeComposer'

function App() {
  const composer = useGlazeComposer()

  return (
    <main className="page-shell">
      <section className="intro-card">
        <h1>Glaze Lab</h1>
        <p className="subtitle">
          Blend color, firing range, finish, and effects to draft candidate glaze recipes.
          Percentages are generated for exploration and should be test-fired before production use.
        </p>
      </section>

      <section className="content-grid">
        <GlazeParameterForm composer={composer} />
        <RecipeResultsPanel composer={composer} />
      </section>

      <footer className="page-footer">
        Enjoying the Glaze Composer?{' '}
        <a href="https://ko-fi.com/ecoce" target="_blank" rel="noopener noreferrer">
          Support it on Ko-fi
        </a>
      </footer>
    </main>
  )
}

export default App