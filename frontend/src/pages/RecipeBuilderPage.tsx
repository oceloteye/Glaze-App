import { GlazeAnalysisPanel } from '../components/GlazeAnalysisPanel'
import { GlazeWarningsPanel } from '../components/GlazeWarningsPanel'
import { RecipeBuilderForm } from '../components/RecipeBuilderForm'
import { useRecipeBuilder } from '../hooks/useRecipeBuilder'

export function RecipeBuilderPage() {
  const builder = useRecipeBuilder()

  return (
    <>
      <section className="intro-card">
        <h1>Recipe Builder</h1>
        <p className="subtitle">
          Add materials, drag the sliders and watch the chemistry respond. Amounts are in parts and are
          normalised to 100% for you; the preview, unity formula and notes update as you go.
        </p>
      </section>

      <section className="content-grid builder-grid">
        <GlazeAnalysisPanel builder={builder} />
        <RecipeBuilderForm builder={builder} />
      </section>

      <GlazeWarningsPanel warnings={builder.analysis?.warnings ?? []} stale={builder.analyzing} />
    </>
  )
}
