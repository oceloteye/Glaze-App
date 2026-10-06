import { GlazeParameterForm } from '../components/GlazeParameterForm'
import { RecipeResultsPanel } from '../components/RecipeResultsPanel'
import { useGlazeComposer } from '../hooks/useGlazeComposer'

export function RecipeGeneratorPage() {
  const composer = useGlazeComposer()

  return (
    <>
      <section className="intro-card">
        <h1>Recipe Generator</h1>
        <p className="subtitle">
          Blend color, firing range, finish, and effects to draft candidate glaze recipes.
          Percentages are generated for exploration and should be test-fired before production use.
        </p>
      </section>

      <section className="content-grid">
        <GlazeParameterForm composer={composer} />
        <RecipeResultsPanel composer={composer} />
      </section>
    </>
  )
}
